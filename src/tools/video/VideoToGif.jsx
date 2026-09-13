import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  convertVideoToGif,
  getVideoToGifInfo,
  GIF_FPS_OPTIONS,
  GIF_SIZE_OPTIONS,
} from "../../services/video/videoToGif.js";

function formatBytes(bytes) {
  if (
    !Number.isFinite(bytes) ||
    bytes < 0
  ) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  if (
    bytes <
    1024 * 1024 * 1024
  ) {
    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }

  return `${(
    bytes /
    (1024 * 1024 * 1024)
  ).toFixed(2)} GB`;
}

function formatDuration(seconds) {
  if (
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return "0:00";
  }

  const total =
    Math.round(seconds);

  const hours =
    Math.floor(
      total / 3600
    );

  const minutes =
    Math.floor(
      (total % 3600) / 60
    );

  const remaining =
    total % 60;

  if (hours > 0) {
    return `${hours}:${String(
      minutes
    ).padStart(2, "0")}:${String(
      remaining
    ).padStart(2, "0")}`;
  }

  return `${minutes}:${String(
    remaining
  ).padStart(2, "0")}`;
}

function VideoToGif() {
  const [file, setFile] =
    useState(null);

  const [info, setInfo] =
    useState(null);

  const [previewUrl, setPreviewUrl] =
    useState("");

  const [fps, setFps] =
    useState(12);

  const [width, setWidth] =
    useState(640);

  const [startTime, setStartTime] =
    useState(0);

  const [endTime, setEndTime] =
    useState(null);

  const [status, setStatus] =
    useState("idle");

  const [progress, setProgress] =
    useState(0);

  const [phase, setPhase] =
    useState("");

  const [error, setError] =
    useState("");

  const [result, setResult] =
    useState(null);

  const [isDragging, setIsDragging] =
    useState(false);

  const inputRef =
    useRef(null);

  const videoRef =
    useRef(null);

  const resultUrlRef =
    useRef("");

  const isProcessing =
    status === "processing";

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }

    const url =
      URL.createObjectURL(file);

    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    return () => {
      if (
        resultUrlRef.current
      ) {
        URL.revokeObjectURL(
          resultUrlRef.current
        );
      }
    };
  }, []);

  useEffect(() => {
    if (!info?.duration) {
      return;
    }

    if (
      endTime === null ||
      endTime > info.duration
    ) {
      setEndTime(
        Math.min(
          info.duration,
          10
        )
      );
    }
  }, [info, endTime]);

  const selectedDuration =
    useMemo(() => {
      if (!info?.duration) {
        return 0;
      }

      const end =
        endTime === null
          ? info.duration
          : endTime;

      return Math.max(
        0,
        end - startTime
      );
    }, [
      info,
      startTime,
      endTime,
    ]);

  const selectedSize =
    GIF_SIZE_OPTIONS.find(
      (option) =>
        option.width === width
    );

  async function processSelectedFile(
    selected
  ) {
    if (!selected) {
      return;
    }

    setError("");
    setResult(null);
    setProgress(0);
    setPhase("");
    setStatus("validating");

    if (
      resultUrlRef.current
    ) {
      URL.revokeObjectURL(
        resultUrlRef.current
      );

      resultUrlRef.current =
        "";
    }

    try {
      const videoInfo =
        await getVideoToGifInfo(
          selected
        );

      setFile(selected);
      setInfo(videoInfo);

      setStartTime(0);

      setEndTime(
        Math.min(
          videoInfo.duration,
          10
        )
      );

      setStatus("ready");
    } catch (caughtError) {
      setFile(null);
      setInfo(null);
      setStatus("error");

      setError(
        caughtError?.message ||
          "Unable to read this video."
      );
    }
  }

  async function handleFileInput(
    event
  ) {
    const selected =
      event.target.files?.[0];

    if (selected) {
      await processSelectedFile(
        selected
      );
    }

    event.target.value = "";
  }

  function handleBrowseClick() {
    if (!isProcessing) {
      inputRef.current?.click();
    }
  }

  function handleDragOver(
    event
  ) {
    event.preventDefault();

    if (!isProcessing) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(
    event
  ) {
    event.preventDefault();
    setIsDragging(false);
  }

  async function handleDrop(
    event
  ) {
    event.preventDefault();
    setIsDragging(false);

    if (isProcessing) {
      return;
    }

    const droppedFile =
      event.dataTransfer.files?.[0];

    if (droppedFile) {
      await processSelectedFile(
        droppedFile
      );
    }
  }

  function clearFile() {
    if (isProcessing) {
      return;
    }

    if (
      resultUrlRef.current
    ) {
      URL.revokeObjectURL(
        resultUrlRef.current
      );

      resultUrlRef.current =
        "";
    }

    setFile(null);
    setInfo(null);
    setResult(null);
    setPreviewUrl("");
    setError("");
    setProgress(0);
    setPhase("");
    setStartTime(0);
    setEndTime(null);
    setStatus("idle");
  }

  function handleLoadedMetadata() {
    const video =
      videoRef.current;

    if (!video) {
      return;
    }

    if (
      endTime === null ||
      endTime >
        video.duration
    ) {
      setEndTime(
        Math.min(
          video.duration,
          10
        )
      );
    }
  }

  function handleStartChange(
    value
  ) {
    const numeric =
      Number(value);

    const safeEnd =
      endTime ??
      info?.duration ??
      0;

    setStartTime(
      Math.max(
        0,
        Math.min(
          numeric,
          Math.max(
            0,
            safeEnd -
              0.1
          )
        )
      )
    );

    setResult(null);
    setStatus("ready");
  }

  function handleEndChange(
    value
  ) {
    const numeric =
      Number(value);

    const duration =
      info?.duration || 0;

    setEndTime(
      Math.max(
        startTime + 0.1,
        Math.min(
          numeric,
          duration
        )
      )
    );

    setResult(null);
    setStatus("ready");
  }

  function playPreviewFromStart() {
    const video =
      videoRef.current;

    if (!video) {
      return;
    }

    video.currentTime =
      startTime;

    video.play().catch(
      () => {}
    );
  }

  async function handleConvert() {
    if (!file) {
      return;
    }

    const effectiveEnd =
      endTime ??
      info?.duration ??
      0;

    if (
      effectiveEnd <=
      startTime
    ) {
      setError(
        "The selected start and end times are invalid."
      );

      return;
    }

    if (
      effectiveEnd -
        startTime >
      120
    ) {
      setError(
        "Please select a section shorter than 120 seconds."
      );

      return;
    }

    setError("");
    setResult(null);
    setProgress(0);
    setPhase("loading");
    setStatus("processing");

    if (
      resultUrlRef.current
    ) {
      URL.revokeObjectURL(
        resultUrlRef.current
      );

      resultUrlRef.current =
        "";
    }

    try {
      const gifResult =
        await convertVideoToGif(
          file,
          {
            fps,
            width,
            startTime,
            endTime:
              effectiveEnd,

            onProgress: ({
              phase:
                currentPhase,
              progress:
                currentProgress,
            }) => {
              setPhase(
                currentPhase
              );

              setProgress(
                Math.round(
                  currentProgress *
                    100
                )
              );
            },
          }
        );

      const url =
        URL.createObjectURL(
          gifResult.file
        );

      resultUrlRef.current =
        url;

      setResult({
        ...gifResult,
        downloadUrl:
          url,
      });

      setProgress(100);
      setPhase("complete");
      setStatus("success");
    } catch (caughtError) {
      setStatus("error");

      setError(
        caughtError?.message ||
          "The video could not be converted to GIF."
      );
    }
  }

  function downloadResult() {
    if (
      !result?.downloadUrl ||
      !result?.file
    ) {
      return;
    }

    const anchor =
      document.createElement(
        "a"
      );

    anchor.href =
      result.downloadUrl;

    anchor.download =
      result.file.name;

    document.body.appendChild(
      anchor
    );

    anchor.click();

    anchor.remove();
  }

  return (
    <section className="video-to-gif-tool">
      <style>{`
        .video-to-gif-tool {
          width: 100%;
          box-sizing: border-box;
          padding: 26px 30px 38px;
          color: rgba(255,255,255,.94);
        }

        .video-to-gif-tool * {
          box-sizing: border-box;
        }

        .vtg-input {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0,0,0,0);
          white-space: nowrap;
          border: 0;
        }

        .vtg-dropzone {
          min-height: 390px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px dashed rgba(255,255,255,.16);
          border-radius: 20px;
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(255,115,35,.09),
              transparent 48%
            ),
            rgba(0,0,0,.20);
          cursor: pointer;
          transition:
            border-color .2s ease,
            background .2s ease;
        }

        .vtg-dropzone:hover,
        .vtg-dropzone.dragging {
          border-color: rgba(255,135,65,.50);
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(255,115,35,.14),
              transparent 52%
            ),
            rgba(255,255,255,.018);
        }

        .vtg-upload {
          max-width: 560px;
          padding: 35px;
          text-align: center;
        }

        .vtg-icon {
          width: 54px;
          height: 54px;
          margin: 0 auto 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,125,50,.22);
          border-radius: 16px;
          background: rgba(255,90,20,.07);
          color: rgba(255,176,125,.92);
          font-size: 22px;
        }

        .vtg-eyebrow {
          color: rgba(255,255,255,.42);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .22em;
        }

        .vtg-title {
          margin-top: 12px;
          font-size: 23px;
          font-weight: 700;
          letter-spacing: -.7px;
        }

        .vtg-description {
          margin-top: 8px;
          color: rgba(255,255,255,.38);
          font-size: 12px;
          line-height: 1.6;
        }

        .vtg-browse {
          display: inline-flex;
          margin-top: 20px;
          padding: 12px 18px;
          border: 1px solid rgba(255,125,50,.22);
          border-radius: 11px;
          background: rgba(255,95,20,.08);
          font-size: 11px;
          font-weight: 800;
        }

        .vtg-layout {
          display: grid;
          grid-template-columns: minmax(0,1.08fr) minmax(350px,.92fr);
          gap: 28px;
          align-items: start;
        }

        .vtg-preview {
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 20px;
          background: rgba(0,0,0,.28);
        }

        .vtg-preview video {
          display: block;
          width: 100%;
          height: 390px;
          object-fit: contain;
          background: #050505;
        }

        .vtg-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .vtg-card {
          padding: 18px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 18px;
          background: rgba(255,255,255,.025);
        }

        .vtg-label {
          display: block;
          margin-bottom: 13px;
          color: rgba(255,255,255,.38);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .2em;
          text-transform: uppercase;
        }

        .vtg-file {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .vtg-file-name {
          min-width: 0;
          font-size: 14px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .vtg-file-meta {
          margin-top: 5px;
          color: rgba(255,255,255,.40);
          font-size: 11px;
        }

        .vtg-remove {
          width: 34px;
          height: 34px;
          flex: 0 0 auto;
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 10px;
          background: rgba(255,255,255,.035);
          color: rgba(255,255,255,.65);
          cursor: pointer;
          font-size: 18px;
        }

        .vtg-section-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .vtg-field label {
          display: block;
          margin-bottom: 7px;
          color: rgba(255,255,255,.37);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        .vtg-field input[type="number"] {
          width: 100%;
          min-height: 44px;
          padding: 0 12px;
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 10px;
          outline: none;
          background: rgba(255,255,255,.035);
          color: white;
          font: inherit;
          font-size: 12px;
          font-weight: 700;
        }

        .vtg-range {
          width: 100%;
          margin-top: 7px;
          accent-color: #ff7b2f;
        }

        .vtg-range-labels {
          display: flex;
          justify-content: space-between;
          color: rgba(255,255,255,.24);
          font-size: 8px;
        }

        .vtg-options {
          display: grid;
          grid-template-columns: repeat(5,minmax(0,1fr));
          gap: 7px;
        }

        .vtg-option {
          min-height: 56px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 11px;
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.62);
          font: inherit;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .vtg-option.active {
          border-color: rgba(255,125,50,.54);
          background: rgba(255,95,20,.09);
          color: white;
        }

        .vtg-size-options {
          display: grid;
          grid-template-columns: repeat(3,1fr);
          gap: 8px;
        }

        .vtg-size {
          min-height: 62px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 11px;
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.62);
          cursor: pointer;
        }

        .vtg-size.active {
          border-color: rgba(255,125,50,.54);
          background: rgba(255,95,20,.09);
          color: white;
        }

        .vtg-size strong {
          display: block;
          font-size: 12px;
        }

        .vtg-size span {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,.34);
          font-size: 9px;
        }

        .vtg-summary {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 8px;
        }

        .vtg-stat {
          padding: 11px;
          border-radius: 10px;
          background: rgba(255,255,255,.035);
        }

        .vtg-stat span {
          display: block;
          color: rgba(255,255,255,.32);
          font-size: 8px;
          letter-spacing: .1em;
          text-transform: uppercase;
        }

        .vtg-stat strong {
          display: block;
          margin-top: 4px;
          font-size: 11px;
        }

        .vtg-primary {
          width: 100%;
          min-height: 48px;
          border: 0;
          border-radius: 13px;
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(255,195,125,.96),
              rgba(255,119,26,.97) 43%,
              rgba(212,62,8,.98)
            );
          color: white;
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          box-shadow:
            0 14px 34px rgba(255,86,15,.16);
        }

        .vtg-secondary {
          width: 100%;
          min-height: 44px;
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 12px;
          background: rgba(255,255,255,.035);
          color: rgba(255,255,255,.70);
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .vtg-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
        }

        .vtg-progress {
          padding: 15px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 16px;
          background: rgba(255,255,255,.025);
        }

        .vtg-progress-top {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
        }

        .vtg-progress-top span {
          color: rgba(255,255,255,.40);
        }

        .vtg-progress-track {
          height: 6px;
          margin-top: 10px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,.065);
        }

        .vtg-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #d9500f,
            #ff9942
          );
          transition: width .18s ease;
        }

        .vtg-error {
          padding: 13px 14px;
          border: 1px solid rgba(255,70,70,.18);
          border-radius: 12px;
          background: rgba(255,50,50,.05);
          color: rgba(255,184,184,.88);
          font-size: 11px;
          line-height: 1.5;
        }

        .vtg-result {
          margin-top: 16px;
          padding: 17px;
          border: 1px solid rgba(255,120,45,.20);
          border-radius: 18px;
          background: rgba(255,255,255,.025);
        }

        .vtg-result-grid {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 8px;
          margin-top: 13px;
        }

        .vtg-download {
          width: 100%;
          min-height: 44px;
          margin-top: 13px;
          border: 1px solid rgba(255,120,45,.24);
          border-radius: 11px;
          background: rgba(255,90,20,.09);
          color: white;
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        @media (max-width: 900px) {
          .vtg-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .vtg-options {
            grid-template-columns: repeat(3,1fr);
          }

          .vtg-summary,
          .vtg-result-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 650px) {
          .video-to-gif-tool {
            padding: 20px 16px 28px;
          }

          .vtg-dropzone {
            min-height: 300px;
          }

          .vtg-preview video {
            height: 250px;
          }

          .vtg-section-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {!file ? (
        <div>
          <input
            ref={inputRef}
            type="file"
            className="vtg-input"
            accept="video/*,.mp4,.webm,.mov,.mkv,.avi,.m4v,.mpeg,.mpg"
            onChange={
              handleFileInput
            }
          />

          <div
            className={`vtg-dropzone ${
              isDragging
                ? "dragging"
                : ""
            }`}
            onClick={
              handleBrowseClick
            }
            onDragOver={
              handleDragOver
            }
            onDragLeave={
              handleDragLeave
            }
            onDrop={
              handleDrop
            }
            role="button"
            tabIndex={0}
            onKeyDown={(
              event
            ) => {
              if (
                event.key ===
                  "Enter" ||
                event.key ===
                  " "
              ) {
                event.preventDefault();
                handleBrowseClick();
              }
            }}
          >
            <div className="vtg-upload">
              <div className="vtg-icon">
                GIF
              </div>

              <div className="vtg-eyebrow">
                VIDEO TO GIF
              </div>

              <div className="vtg-title">
                Turn a video into a GIF
              </div>

              <div className="vtg-description">
                Select a short section of your
                video, choose the frame rate and
                size, and export a looping GIF.
              </div>

              <div className="vtg-browse">
                Choose Video
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="vtg-layout">
          <div>
            <div className="vtg-preview">
              <video
                ref={videoRef}
                src={previewUrl}
                controls
                playsInline
                preload="metadata"
                onLoadedMetadata={
                  handleLoadedMetadata
                }
              />
            </div>

            {result && (
              <div className="vtg-result">
                <strong>
                  GIF created successfully
                </strong>

                <div className="vtg-result-grid">
                  <div className="vtg-stat">
                    <span>
                      GIF Size
                    </span>

                    <strong>
                      {
                        result.outputSizeLabel
                      }
                    </strong>
                  </div>

                  <div className="vtg-stat">
                    <span>
                      Dimensions
                    </span>

                    <strong>
                      {result.width} ×{" "}
                      {result.height}
                    </strong>
                  </div>

                  <div className="vtg-stat">
                    <span>
                      FPS
                    </span>

                    <strong>
                      {result.fps}
                    </strong>
                  </div>

                  <div className="vtg-stat">
                    <span>
                      Duration
                    </span>

                    <strong>
                      {result.durationLabel}
                    </strong>
                  </div>

                  <div className="vtg-stat">
                    <span>
                      Saved
                    </span>

                    <strong>
                      {
                        result.savedPercentLabel
                      }
                    </strong>
                  </div>

                  <div className="vtg-stat">
                    <span>
                      Format
                    </span>

                    <strong>
                      GIF
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="vtg-download"
                  onClick={
                    downloadResult
                  }
                >
                  Download GIF
                </button>
              </div>
            )}
          </div>

          <div className="vtg-panel">
            <div className="vtg-card">
              <span className="vtg-label">
                Selected Video
              </span>

              <div className="vtg-file">
                <div
                  style={{
                    minWidth: 0,
                  }}
                >
                  <div className="vtg-file-name">
                    {file.name}
                  </div>

                  <div className="vtg-file-meta">
                    {formatBytes(
                      file.size
                    )}{" "}
                    ·{" "}
                    {info?.width ||
                      "—"} ×{" "}
                    {info?.height ||
                      "—"}{" "}
                    ·{" "}
                    {formatDuration(
                      info?.duration ||
                        0
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className="vtg-remove"
                  onClick={
                    clearFile
                  }
                  disabled={
                    isProcessing
                  }
                >
                  ×
                </button>
              </div>
            </div>

            <div className="vtg-card">
              <span className="vtg-label">
                GIF Section
              </span>

              <div className="vtg-section-row">
                <div className="vtg-field">
                  <label>
                    Start
                  </label>

                  <input
                    type="number"
                    min="0"
                    max={
                      Math.max(
                        0,
                        (info?.duration ||
                          0) -
                          0.1
                      )
                    }
                    step="0.1"
                    value={startTime}
                    onChange={(
                      event
                    ) =>
                      handleStartChange(
                        event.target
                          .value
                      )
                    }
                    disabled={
                      isProcessing
                    }
                  />
                </div>

                <div className="vtg-field">
                  <label>
                    End
                  </label>

                  <input
                    type="number"
                    min={
                      startTime +
                      0.1
                    }
                    max={
                      info?.duration ||
                      0
                    }
                    step="0.1"
                    value={
                      endTime ??
                      ""
                    }
                    onChange={(
                      event
                    ) =>
                      handleEndChange(
                        event.target
                          .value
                      )
                    }
                    disabled={
                      isProcessing
                    }
                  />
                </div>
              </div>

              <input
                type="range"
                className="vtg-range"
                min="0"
                max={
                  Math.max(
                    0,
                    info?.duration ||
                      0
                  )
                }
                step="0.1"
                value={startTime}
                onChange={(
                  event
                ) =>
                  handleStartChange(
                    event.target
                      .value
                  )
                }
                disabled={
                  isProcessing
                }
              />

              <div className="vtg-range-labels">
                <span>
                  0:00
                </span>

                <span>
                  {formatDuration(
                    selectedDuration
                  )}
                  {" selected"}
                </span>

                <span>
                  {formatDuration(
                    info?.duration ||
                      0
                  )}
                </span>
              </div>

              <input
                type="range"
                className="vtg-range"
                min={
                  startTime +
                  0.1
                }
                max={
                  info?.duration ||
                  0
                }
                step="0.1"
                value={
                  endTime ??
                  info?.duration ??
                  0
                }
                onChange={(
                  event
                ) =>
                  handleEndChange(
                    event.target
                      .value
                  )
                }
                disabled={
                  isProcessing
                }
              />

              <button
                type="button"
                className="vtg-secondary"
                style={{
                  marginTop:
                    "9px",
                }}
                onClick={
                  playPreviewFromStart
                }
                disabled={
                  isProcessing
                }
              >
                Preview Selected Section
              </button>
            </div>

            <div className="vtg-card">
              <span className="vtg-label">
                Frame Rate
              </span>

              <div className="vtg-options">
                {GIF_FPS_OPTIONS.map(
                  (option) => (
                    <button
                      key={
                        option.value
                      }
                      type="button"
                      className={`vtg-option ${
                        fps ===
                        option.value
                          ? "active"
                          : ""
                      }`}
                      onClick={() => {
                        setFps(
                          option.value
                        );

                        setResult(
                          null
                        );
                      }}
                      disabled={
                        isProcessing
                      }
                    >
                      {
                        option.label
                      }
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="vtg-card">
              <span className="vtg-label">
                GIF Size
              </span>

              <div className="vtg-size-options">
                {GIF_SIZE_OPTIONS.map(
                  (option) => (
                    <button
                      key={
                        option.value
                      }
                      type="button"
                      className={`vtg-size ${
                        width ===
                        option.width
                          ? "active"
                          : ""
                      }`}
                      onClick={() => {
                        setWidth(
                          option.width
                        );

                        setResult(
                          null
                        );
                      }}
                      disabled={
                        isProcessing
                      }
                    >
                      <strong>
                        {
                          option.label
                        }
                      </strong>

                      <span>
                        {
                          option.width
                        }px wide
                      </span>
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="vtg-card">
              <span className="vtg-label">
                Export Summary
              </span>

              <div className="vtg-summary">
                <div className="vtg-stat">
                  <span>
                    Section
                  </span>

                  <strong>
                    {formatDuration(
                      selectedDuration
                    )}
                  </strong>
                </div>

                <div className="vtg-stat">
                  <span>
                    FPS
                  </span>

                  <strong>
                    {fps}
                  </strong>
                </div>

                <div className="vtg-stat">
                  <span>
                    Width
                  </span>

                  <strong>
                    {selectedSize
                      ?.width ||
                      width}px
                  </strong>
                </div>
              </div>
            </div>

            {isProcessing && (
              <div className="vtg-progress">
                <div className="vtg-progress-top">
                  <span>
                    {phase ===
                    "loading"
                      ? "Loading GIF engine..."
                      : phase ===
                        "palette"
                      ? "Generating colour palette..."
                      : phase ===
                        "finalizing"
                      ? "Finalizing GIF..."
                      : "Converting video to GIF..."}
                  </span>

                  <strong>
                    {progress}%
                  </strong>
                </div>

                <div className="vtg-progress-track">
                  <div
                    className="vtg-progress-fill"
                    style={{
                      width:
                        `${progress}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="vtg-error">
                {error}
              </div>
            )}

            <div className="vtg-actions">
              <button
                type="button"
                className="vtg-secondary"
                onClick={
                  clearFile
                }
                disabled={
                  isProcessing
                }
              >
                Choose Another
              </button>

              <button
                type="button"
                className="vtg-primary"
                onClick={
                  handleConvert
                }
                disabled={
                  isProcessing ||
                  !file
                }
              >
                {isProcessing
                  ? "Creating GIF..."
                  : "Create GIF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default VideoToGif;