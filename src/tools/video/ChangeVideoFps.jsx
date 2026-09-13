import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  changeVideoFps,
  getVideoFpsInfo,
  FPS_OPTIONS,
} from "../../services/video/changeVideoFps.js";

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

function ChangeVideoFps() {
  const [file, setFile] =
    useState(null);

  const [info, setInfo] =
    useState(null);

  const [previewUrl, setPreviewUrl] =
    useState("");

  const [fps, setFps] =
    useState(30);

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
        await getVideoFpsInfo(
          selected
        );

      setFile(selected);
      setInfo(videoInfo);
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
    setFps(30);
    setStatus("idle");
  }

  async function handleConvert() {
    if (!file) {
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
      const conversionResult =
        await changeVideoFps(
          file,
          {
            fps,

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
          conversionResult.file
        );

      resultUrlRef.current =
        url;

      setResult({
        ...conversionResult,
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
          "The frame rate could not be changed."
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
    <section className="change-video-fps-tool">
      <style>{`
        .change-video-fps-tool {
          width: 100%;
          box-sizing: border-box;
          padding: 26px 30px 38px;
          color: rgba(255,255,255,.94);
        }

        .change-video-fps-tool * {
          box-sizing: border-box;
        }

        .cvf-upload-input {
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

        .cvf-dropzone {
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
            background .2s ease,
            transform .2s ease;
        }

        .cvf-dropzone:hover {
          border-color: rgba(255,135,65,.32);
        }

        .cvf-dropzone.dragging {
          border-color: rgba(255,135,65,.64);
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(255,115,35,.18),
              transparent 55%
            ),
            rgba(255,105,30,.045);
        }

        .cvf-upload-content {
          padding: 35px;
          text-align: center;
        }

        .cvf-icon {
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

        .cvf-eyebrow {
          color: rgba(255,255,255,.42);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .22em;
        }

        .cvf-title {
          margin-top: 12px;
          font-size: 23px;
          font-weight: 700;
          letter-spacing: -.7px;
        }

        .cvf-description {
          max-width: 500px;
          margin: 8px auto 0;
          color: rgba(255,255,255,.38);
          font-size: 12px;
          line-height: 1.6;
        }

        .cvf-browse {
          display: inline-flex;
          margin-top: 20px;
          padding: 12px 17px;
          border: 1px solid rgba(255,125,50,.22);
          border-radius: 11px;
          background: rgba(255,95,20,.08);
          font-size: 11px;
          font-weight: 800;
        }

        .cvf-layout {
          display: grid;
          grid-template-columns: minmax(0,1.05fr) minmax(340px,.95fr);
          gap: 28px;
        }

        .cvf-preview {
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 20px;
          background: rgba(0,0,0,.28);
        }

        .cvf-preview video {
          display: block;
          width: 100%;
          height: 390px;
          object-fit: contain;
          background: #050505;
        }

        .cvf-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .cvf-card {
          padding: 18px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 18px;
          background: rgba(255,255,255,.025);
        }

        .cvf-label {
          display: block;
          margin-bottom: 13px;
          color: rgba(255,255,255,.38);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .2em;
          text-transform: uppercase;
        }

        .cvf-file {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .cvf-file-name {
          min-width: 0;
          font-size: 14px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cvf-file-meta {
          margin-top: 5px;
          color: rgba(255,255,255,.40);
          font-size: 11px;
        }

        .cvf-remove {
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

        .cvf-fps-grid {
          display: grid;
          grid-template-columns: repeat(4,minmax(0,1fr));
          gap: 8px;
        }

        .cvf-fps-button {
          min-height: 58px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 11px;
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.62);
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .cvf-fps-button:hover {
          border-color: rgba(255,125,50,.24);
        }

        .cvf-fps-button.active {
          border-color: rgba(255,125,50,.54);
          background: rgba(255,95,20,.09);
          color: white;
        }

        .cvf-summary {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 8px;
        }

        .cvf-stat {
          padding: 11px;
          border-radius: 10px;
          background: rgba(255,255,255,.035);
        }

        .cvf-stat span {
          display: block;
          color: rgba(255,255,255,.32);
          font-size: 8px;
          letter-spacing: .1em;
          text-transform: uppercase;
        }

        .cvf-stat strong {
          display: block;
          margin-top: 4px;
          font-size: 11px;
        }

        .cvf-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
        }

        .cvf-secondary {
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

        .cvf-primary {
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
        }

        .cvf-progress {
          padding: 15px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 16px;
          background: rgba(255,255,255,.025);
        }

        .cvf-progress-top {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
        }

        .cvf-progress-top span {
          color: rgba(255,255,255,.40);
        }

        .cvf-progress-track {
          height: 6px;
          margin-top: 10px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,.065);
        }

        .cvf-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #d9500f,
            #ff9942
          );
          transition: width .18s ease;
        }

        .cvf-error {
          padding: 13px 14px;
          border: 1px solid rgba(255,70,70,.18);
          border-radius: 12px;
          background: rgba(255,50,50,.05);
          color: rgba(255,184,184,.88);
          font-size: 11px;
        }

        .cvf-result {
          margin-top: 16px;
          padding: 17px;
          border: 1px solid rgba(255,120,45,.20);
          border-radius: 18px;
          background: rgba(255,255,255,.025);
        }

        .cvf-result-grid {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 8px;
          margin-top: 13px;
        }

        .cvf-download {
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

        .cvf-disabled {
          opacity: .42;
          cursor: not-allowed;
        }

        @media (max-width: 900px) {
          .cvf-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .cvf-fps-grid {
            grid-template-columns: repeat(2,1fr);
          }
        }

        @media (max-width: 650px) {
          .change-video-fps-tool {
            padding: 20px 16px 28px;
          }

          .cvf-dropzone {
            min-height: 300px;
          }

          .cvf-preview video {
            height: 250px;
          }

          .cvf-summary,
          .cvf-result-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>

      {!file ? (
        <div>
          <input
            ref={inputRef}
            type="file"
            className="cvf-upload-input"
            accept="video/*,.mp4,.webm,.mov,.mkv,.avi,.m4v,.mpeg,.mpg"
            onChange={
              handleFileInput
            }
          />

          <div
            className={`cvf-dropzone ${
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
            <div className="cvf-upload-content">
              <div className="cvf-icon">
                ↯
              </div>

              <div className="cvf-eyebrow">
                CHANGE FPS
              </div>

              <div className="cvf-title">
                Drop your video here
              </div>

              <div className="cvf-description">
                Change the frame rate of your
                video for smoother playback,
                compatibility, or a specific
                delivery format.
              </div>

              <div className="cvf-browse">
                Choose Video
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="cvf-layout">
          <div>
            <div className="cvf-preview">
              <video
                src={previewUrl}
                controls
                playsInline
                preload="metadata"
              />
            </div>

            {result && (
              <div className="cvf-result">
                <strong>
                  Frame rate changed
                </strong>

                <div className="cvf-result-grid">
                  <div className="cvf-stat">
                    <span>
                      Output FPS
                    </span>

                    <strong>
                      {result.outputFps}
                    </strong>
                  </div>

                  <div className="cvf-stat">
                    <span>
                      Output Size
                    </span>

                    <strong>
                      {result.outputSizeLabel}
                    </strong>
                  </div>

                  <div className="cvf-stat">
                    <span>
                      Saved
                    </span>

                    <strong>
                      {result.savedPercentLabel}
                    </strong>
                  </div>

                  <div className="cvf-stat">
                    <span>
                      Resolution
                    </span>

                    <strong>
                      {result.width} ×{" "}
                      {result.height}
                    </strong>
                  </div>

                  <div className="cvf-stat">
                    <span>
                      Duration
                    </span>

                    <strong>
                      {result.duration
                        ? formatDuration(
                            result.duration
                          )
                        : "—"}
                    </strong>
                  </div>

                  <div className="cvf-stat">
                    <span>
                      Format
                    </span>

                    <strong>
                      MP4 / H.264
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="cvf-download"
                  onClick={
                    downloadResult
                  }
                >
                  Download Converted Video
                </button>
              </div>
            )}
          </div>

          <div className="cvf-panel">
            <div className="cvf-card">
              <span className="cvf-label">
                Selected Video
              </span>

              <div className="cvf-file">
                <div
                  style={{
                    minWidth: 0,
                  }}
                >
                  <div className="cvf-file-name">
                    {file.name}
                  </div>

                  <div className="cvf-file-meta">
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
                  className={`cvf-remove ${
                    isProcessing
                      ? "cvf-disabled"
                      : ""
                  }`}
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

            <div className="cvf-card">
              <span className="cvf-label">
                Output Frame Rate
              </span>

              <div className="cvf-fps-grid">
                {FPS_OPTIONS.map(
                  (option) => (
                    <button
                      key={
                        option.label
                      }
                      type="button"
                      className={`cvf-fps-button ${
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

                        setError("");
                        setStatus(
                          "ready"
                        );
                      }}
                      disabled={
                        isProcessing
                      }
                    >
                      {option.label}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="cvf-card">
              <span className="cvf-label">
                Summary
              </span>

              <div className="cvf-summary">
                <div className="cvf-stat">
                  <span>
                    Target FPS
                  </span>

                  <strong>
                    {fps}
                  </strong>
                </div>

                <div className="cvf-stat">
                  <span>
                    Resolution
                  </span>

                  <strong>
                    {info?.width ||
                      "—"} ×{" "}
                    {info?.height ||
                      "—"}
                  </strong>
                </div>

                <div className="cvf-stat">
                  <span>
                    Duration
                  </span>

                  <strong>
                    {formatDuration(
                      info?.duration ||
                        0
                    )}
                  </strong>
                </div>
              </div>
            </div>

            {isProcessing && (
              <div className="cvf-progress">
                <div className="cvf-progress-top">
                  <span>
                    {phase ===
                    "loading"
                      ? "Loading FPS engine..."
                      : phase ===
                        "finalizing"
                      ? "Finalizing video..."
                      : "Changing frame rate..."}
                  </span>

                  <strong>
                    {progress}%
                  </strong>
                </div>

                <div className="cvf-progress-track">
                  <div
                    className="cvf-progress-fill"
                    style={{
                      width:
                        `${progress}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="cvf-error">
                {error}
              </div>
            )}

            <div className="cvf-actions">
              <button
                type="button"
                className="cvf-secondary"
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
                className="cvf-primary"
                onClick={
                  handleConvert
                }
                disabled={
                  isProcessing ||
                  !file
                }
              >
                {isProcessing
                  ? "Changing FPS..."
                  : "Change FPS"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default ChangeVideoFps;