import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  convertVideo,
  getVideoConversionInfo,
  OUTPUT_FORMATS,
} from "../../services/video/convertVideo.js";

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

function formatDuration(
  seconds
) {
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

function VideoConverter() {
  const [file, setFile] =
    useState(null);

  const [info, setInfo] =
    useState(null);

  const [previewUrl, setPreviewUrl] =
    useState("");

  const [format, setFormat] =
    useState("mp4");

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
        await getVideoConversionInfo(
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
    setFormat("mp4");
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
        await convertVideo(
          file,
          {
            format,

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
          "The video could not be converted."
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
    <section className="video-converter-tool">
      <style>{`
        .video-converter-tool {
          width: 100%;
          box-sizing: border-box;
          padding: 26px 30px 38px;
          color: rgba(255,255,255,.94);
        }

        .video-converter-tool * {
          box-sizing: border-box;
        }

        .vc-upload-input {
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

        .vc-dropzone {
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

        .vc-dropzone:hover,
        .vc-dropzone.dragging {
          border-color: rgba(255,135,65,.50);
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(255,115,35,.14),
              transparent 52%
            ),
            rgba(255,255,255,.018);
        }

        .vc-upload-content {
          max-width: 560px;
          padding: 35px;
          text-align: center;
        }

        .vc-icon {
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

        .vc-eyebrow {
          color: rgba(255,255,255,.42);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .22em;
        }

        .vc-title {
          margin-top: 12px;
          font-size: 23px;
          font-weight: 700;
          letter-spacing: -.7px;
        }

        .vc-description {
          margin-top: 8px;
          color: rgba(255,255,255,.38);
          font-size: 12px;
          line-height: 1.6;
        }

        .vc-browse {
          display: inline-flex;
          margin-top: 20px;
          padding: 12px 18px;
          border: 1px solid rgba(255,125,50,.22);
          border-radius: 11px;
          background: rgba(255,95,20,.08);
          font-size: 11px;
          font-weight: 800;
        }

        .vc-layout {
          display: grid;
          grid-template-columns: minmax(0,1.05fr) minmax(340px,.95fr);
          gap: 28px;
        }

        .vc-preview {
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 20px;
          background: rgba(0,0,0,.28);
        }

        .vc-preview video {
          display: block;
          width: 100%;
          height: 390px;
          object-fit: contain;
          background: #050505;
        }

        .vc-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .vc-card {
          padding: 18px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 18px;
          background: rgba(255,255,255,.025);
        }

        .vc-label {
          display: block;
          margin-bottom: 13px;
          color: rgba(255,255,255,.38);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .2em;
          text-transform: uppercase;
        }

        .vc-file {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .vc-file-name {
          min-width: 0;
          font-size: 14px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .vc-file-meta {
          margin-top: 5px;
          color: rgba(255,255,255,.40);
          font-size: 11px;
        }

        .vc-remove {
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

        .vc-formats {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 8px;
        }

        .vc-format {
          min-height: 78px;
          padding: 11px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 12px;
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.62);
          text-align: left;
          cursor: pointer;
        }

        .vc-format:hover {
          border-color: rgba(255,125,50,.25);
        }

        .vc-format.active {
          border-color: rgba(255,125,50,.54);
          background: rgba(255,95,20,.09);
          color: white;
        }

        .vc-format strong {
          display: block;
          font-size: 12px;
        }

        .vc-format span {
          display: block;
          margin-top: 6px;
          color: rgba(255,255,255,.34);
          font-size: 9px;
          line-height: 1.4;
        }

        .vc-summary {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 8px;
        }

        .vc-stat {
          padding: 11px;
          border-radius: 10px;
          background: rgba(255,255,255,.035);
        }

        .vc-stat span {
          display: block;
          color: rgba(255,255,255,.32);
          font-size: 8px;
          letter-spacing: .1em;
          text-transform: uppercase;
        }

        .vc-stat strong {
          display: block;
          margin-top: 4px;
          font-size: 11px;
        }

        .vc-progress {
          padding: 15px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 16px;
          background: rgba(255,255,255,.025);
        }

        .vc-progress-top {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
        }

        .vc-progress-top span {
          color: rgba(255,255,255,.40);
        }

        .vc-progress-track {
          height: 6px;
          margin-top: 10px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,.065);
        }

        .vc-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #d9500f,
            #ff9942
          );
          transition: width .18s ease;
        }

        .vc-error {
          padding: 13px 14px;
          border: 1px solid rgba(255,70,70,.18);
          border-radius: 12px;
          background: rgba(255,50,50,.05);
          color: rgba(255,184,184,.88);
          font-size: 11px;
        }

        .vc-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
        }

        .vc-secondary {
          min-height: 46px;
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 12px;
          background: rgba(255,255,255,.035);
          color: rgba(255,255,255,.70);
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .vc-primary {
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

        .vc-result {
          margin-top: 16px;
          padding: 17px;
          border: 1px solid rgba(255,120,45,.20);
          border-radius: 18px;
          background: rgba(255,255,255,.025);
        }

        .vc-result-grid {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 8px;
          margin-top: 13px;
        }

        .vc-download {
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
          .vc-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 650px) {
          .video-converter-tool {
            padding: 20px 16px 28px;
          }

          .vc-dropzone {
            min-height: 300px;
          }

          .vc-preview video {
            height: 250px;
          }

          .vc-formats {
            grid-template-columns: repeat(2,1fr);
          }

          .vc-summary,
          .vc-result-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>

      {!file ? (
        <div>
          <input
            ref={inputRef}
            type="file"
            className="vc-upload-input"
            accept="video/*,.mp4,.webm,.mov,.mkv,.avi,.m4v,.mpeg,.mpg"
            onChange={
              handleFileInput
            }
          />

          <div
            className={`vc-dropzone ${
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
            <div className="vc-upload-content">
              <div className="vc-icon">
                ⇄
              </div>

              <div className="vc-eyebrow">
                VIDEO CONVERTER
              </div>

              <div className="vc-title">
                Drop your video here
              </div>

              <div className="vc-description">
                Convert your video into
                MP4, WebM, MOV, MKV or AVI
                directly in your browser.
              </div>

              <div className="vc-browse">
                Choose Video
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="vc-layout">
          <div>
            <div className="vc-preview">
              <video
                src={previewUrl}
                controls
                playsInline
                preload="metadata"
              />
            </div>

            {result && (
              <div className="vc-result">
                <strong>
                  Conversion complete
                </strong>

                <div className="vc-result-grid">
                  <div className="vc-stat">
                    <span>
                      Format
                    </span>

                    <strong>
                      {
                        result.formatLabel
                      }
                    </strong>
                  </div>

                  <div className="vc-stat">
                    <span>
                      Original
                    </span>

                    <strong>
                      {
                        result.originalSizeLabel
                      }
                    </strong>
                  </div>

                  <div className="vc-stat">
                    <span>
                      Output
                    </span>

                    <strong>
                      {
                        result.outputSizeLabel
                      }
                    </strong>
                  </div>

                  <div className="vc-stat">
                    <span>
                      Resolution
                    </span>

                    <strong>
                      {result.width} ×{" "}
                      {result.height}
                    </strong>
                  </div>

                  <div className="vc-stat">
                    <span>
                      Duration
                    </span>

                    <strong>
                      {
                        result.durationLabel
                      }
                    </strong>
                  </div>

                  <div className="vc-stat">
                    <span>
                      Size Change
                    </span>

                    <strong>
                      {
                        result.savedPercentLabel
                      }
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="vc-download"
                  onClick={
                    downloadResult
                  }
                >
                  Download Converted Video
                </button>
              </div>
            )}
          </div>

          <div className="vc-panel">
            <div className="vc-card">
              <span className="vc-label">
                Selected Video
              </span>

              <div className="vc-file">
                <div
                  style={{
                    minWidth: 0,
                  }}
                >
                  <div className="vc-file-name">
                    {file.name}
                  </div>

                  <div className="vc-file-meta">
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
                  className="vc-remove"
                  onClick={
                    clearFile
                  }
                  disabled={
                    isProcessing
                  }
                  aria-label="Remove video"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="vc-card">
              <span className="vc-label">
                Output Format
              </span>

              <div className="vc-formats">
                {Object.entries(
                  OUTPUT_FORMATS
                ).map(
                  ([
                    key,
                    option,
                  ]) => (
                    <button
                      key={key}
                      type="button"
                      className={`vc-format ${
                        format === key
                          ? "active"
                          : ""
                      }`}
                      onClick={() => {
                        setFormat(
                          key
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
                      <strong>
                        {
                          option.label
                        }
                      </strong>

                      <span>
                        {key ===
                        "mp4"
                          ? "Best general compatibility."
                          : key ===
                            "webm"
                          ? "Web-friendly open format."
                          : key ===
                            "mov"
                          ? "Apple / editing workflows."
                          : key ===
                            "mkv"
                          ? "Flexible container."
                          : "Legacy compatibility."}
                      </span>
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="vc-card">
              <span className="vc-label">
                Conversion Summary
              </span>

              <div className="vc-summary">
                <div className="vc-stat">
                  <span>
                    Input
                  </span>

                  <strong>
                    {info?.extension?.toUpperCase() ||
                      "VIDEO"}
                  </strong>
                </div>

                <div className="vc-stat">
                  <span>
                    Output
                  </span>

                  <strong>
                    {format.toUpperCase()}
                  </strong>
                </div>

                <div className="vc-stat">
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
              </div>
            </div>

            {isProcessing && (
              <div className="vc-progress">
                <div className="vc-progress-top">
                  <span>
                    {phase ===
                    "loading"
                      ? "Loading conversion engine..."
                      : phase ===
                        "finalizing"
                      ? "Finalizing video..."
                      : "Converting video..."}
                  </span>

                  <strong>
                    {progress}%
                  </strong>
                </div>

                <div className="vc-progress-track">
                  <div
                    className="vc-progress-fill"
                    style={{
                      width:
                        `${progress}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="vc-error">
                {error}
              </div>
            )}

            <div className="vc-actions">
              <button
                type="button"
                className="vc-secondary"
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
                className="vc-primary"
                onClick={
                  handleConvert
                }
                disabled={
                  isProcessing ||
                  !file
                }
              >
                {isProcessing
                  ? "Converting..."
                  : "Convert Video"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default VideoConverter;