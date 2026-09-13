import {
  useEffect,
  useRef,
  useState,
} from "react";
import { compressAudio } from "../../services/audio/compressAudio";

const FORMAT_OPTIONS = [
  {
    value: "mp3",
    label: "MP3",
    description:
      "Universal compatibility",
  },
  {
    value: "m4a",
    label: "M4A",
    description:
      "Efficient high quality",
  },
  {
    value: "ogg",
    label: "OGG",
    description:
      "Open audio format",
  },
  {
    value: "opus",
    label: "Opus",
    description:
      "Excellent size/quality",
  },
];

const BITRATE_OPTIONS = [
  {
    value: "64k",
    label: "64 kbps",
    description: "Smallest",
  },
  {
    value: "96k",
    label: "96 kbps",
    description: "Very small",
  },
  {
    value: "128k",
    label: "128 kbps",
    description: "Balanced",
  },
  {
    value: "160k",
    label: "160 kbps",
    description: "Good quality",
  },
  {
    value: "192k",
    label: "192 kbps",
    description: "High quality",
  },
  {
    value: "256k",
    label: "256 kbps",
    description: "Very high",
  },
  {
    value: "320k",
    label: "320 kbps",
    description: "Maximum",
  },
];

const formatBytes = (bytes) => {
  if (
    !Number.isFinite(bytes) ||
    bytes <= 0
  ) {
    return "0 B";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
  ];

  const index = Math.min(
    Math.floor(
      Math.log(bytes) /
        Math.log(1024)
    ),
    units.length - 1
  );

  const value =
    bytes / 1024 ** index;

  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
};

const formatDuration = (
  seconds
) => {
  if (
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return "--:--";
  }

  const totalSeconds =
    Math.round(seconds);

  const hours = Math.floor(
    totalSeconds / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const remainingSeconds =
    totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(
      minutes
    ).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  }

  return `${minutes}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
};

export default function AudioCompressor() {
  const inputRef = useRef(null);
  const previewUrlRef =
    useRef(null);
  const resultUrlRef =
    useRef(null);
  const abortControllerRef =
    useRef(null);

  const [file, setFile] =
    useState(null);

  const [previewUrl, setPreviewUrl] =
    useState(null);

  const [metadata, setMetadata] =
    useState({
      duration: 0,
    });

  const [format, setFormat] =
    useState("mp3");

  const [bitrate, setBitrate] =
    useState("128k");

  const [dragActive, setDragActive] =
    useState(false);

  const [stage, setStage] =
    useState("idle");

  const [progress, setProgress] =
    useState(0);

  const [result, setResult] =
    useState(null);

  const [error, setError] =
    useState("");

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();

      if (previewUrlRef.current) {
        URL.revokeObjectURL(
          previewUrlRef.current
        );
      }

      if (resultUrlRef.current) {
        URL.revokeObjectURL(
          resultUrlRef.current
        );
      }
    };
  }, []);

  const clearResult = () => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(
        resultUrlRef.current
      );

      resultUrlRef.current =
        null;
    }

    setResult(null);
  };

  const loadFile = (
    selectedFile
  ) => {
    if (!selectedFile) {
      return;
    }

    clearResult();
    setError("");
    setProgress(0);

    const looksLikeAudio =
      selectedFile.type.startsWith(
        "audio/"
      ) ||
      /\.(mp3|wav|m4a|aac|ogg|oga|flac|opus|wma|aiff|aif|alac)$/i.test(
        selectedFile.name
      );

    if (!looksLikeAudio) {
      setFile(null);
      setPreviewUrl(null);
      setStage("error");
      setError(
        "Please select an audio file."
      );
      return;
    }

    if (selectedFile.size <= 0) {
      setFile(null);
      setPreviewUrl(null);
      setStage("error");
      setError(
        "The selected audio file is empty."
      );
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(
        previewUrlRef.current
      );
    }

    const url =
      URL.createObjectURL(
        selectedFile
      );

    previewUrlRef.current =
      url;

    setFile(selectedFile);
    setPreviewUrl(url);
    setStage("ready");

    const audio =
      document.createElement(
        "audio"
      );

    audio.preload = "metadata";

    audio.onloadedmetadata =
      () => {
        setMetadata({
          duration:
            Number.isFinite(
              audio.duration
            )
              ? audio.duration
              : 0,
        });
      };

    audio.onerror = () => {
      setMetadata({
        duration: 0,
      });
    };

    audio.src = url;
  };

  const handleInputChange = (
    event
  ) => {
    const selectedFile =
      event.target.files?.[0];

    if (selectedFile) {
      loadFile(
        selectedFile
      );
    }

    event.target.value = "";
  };

  const handleDrop = (
    event
  ) => {
    event.preventDefault();
    setDragActive(false);

    const droppedFile =
      event.dataTransfer.files?.[0];

    if (droppedFile) {
      loadFile(
        droppedFile
      );
    }
  };

  const handleCompress =
    async () => {
      if (!file) {
        return;
      }

      setError("");
      setProgress(0);
      setStage("processing");

      const controller =
        new AbortController();

      abortControllerRef.current =
        controller;

      try {
        const compressed =
          await compressAudio({
            file,
            format,
            bitrate,
            signal:
              controller.signal,
            onProgress:
              (value) => {
                setProgress(
                  value
                );
              },
          });

        resultUrlRef.current =
          compressed.url;

        setResult(
          compressed
        );

        setProgress(100);
        setStage("success");
      } catch (
        compressionError
      ) {
        if (
          compressionError?.name ===
          "AbortError"
        ) {
          setStage("ready");
          setProgress(0);
          return;
        }

        console.error(
          compressionError
        );

        setStage("error");

        setError(
          compressionError?.message ||
            "Something went wrong while compressing the audio."
        );
      } finally {
        abortControllerRef.current =
          null;
      }
    };

  const handleCancel = () => {
    abortControllerRef
      .current?.abort();
  };

  const handleReset = () => {
    abortControllerRef.current?.abort();

    if (previewUrlRef.current) {
      URL.revokeObjectURL(
        previewUrlRef.current
      );

      previewUrlRef.current =
        null;
    }

    clearResult();

    setFile(null);
    setPreviewUrl(null);

    setMetadata({
      duration: 0,
    });

    setFormat("mp3");
    setBitrate("128k");

    setProgress(0);
    setError("");
    setStage("idle");

    if (inputRef.current) {
      inputRef.current.value =
        "";
    }
  };

  const selectedFormat =
    FORMAT_OPTIONS.find(
      (option) =>
        option.value === format
    );

  const selectedBitrate =
    BITRATE_OPTIONS.find(
      (option) =>
        option.value === bitrate
    );

  return (
    <div className="audio-compressor-tool">
      <div className="audio-compressor-header">
        <div>
          <h2>
            Audio Compressor
          </h2>

          <p>
            Reduce audio file size
            while keeping the sound
            quality under control.
          </p>
        </div>

        <div className="audio-compressor-badge">
          BROWSER · PRIVATE
        </div>
      </div>

      {!file &&
        stage === "idle" && (
          <button
            type="button"
            className={`audio-compressor-dropzone ${
              dragActive
                ? "is-dragging"
                : ""
            }`}
            onClick={() =>
              inputRef.current?.click()
            }
            onDragOver={(
              event
            ) => {
              event.preventDefault();
              setDragActive(
                true
              );
            }}
            onDragLeave={() =>
              setDragActive(
                false
              )
            }
            onDrop={
              handleDrop
            }
          >
            <div className="audio-compressor-upload-icon">
              ↓
            </div>

            <strong>
              Drop your audio here
            </strong>

            <span>
              or click to choose an
              audio file
            </span>

            <small>
              MP3, WAV, M4A, FLAC,
              OGG and more
            </small>

            <input
              ref={inputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.oga,.flac,.opus,.wma,.aiff,.aif,.alac"
              onChange={
                handleInputChange
              }
              hidden
            />
          </button>
        )}

      {file && (
        <>
          <div className="audio-compressor-workspace">
            <div className="audio-compressor-preview-card">
              <div className="audio-compressor-preview">
                <div className="audio-compressor-disc">
                  ♪
                </div>

                <audio
                  src={previewUrl}
                  controls
                />
              </div>

              <div className="audio-compressor-file-info">
                <div>
                  <strong>
                    {file.name}
                  </strong>

                  <span>
                    {formatBytes(
                      file.size
                    )}
                  </span>
                </div>

                <div className="audio-compressor-meta">
                  {metadata.duration >
                    0 &&
                    formatDuration(
                      metadata.duration
                    )}
                </div>
              </div>
            </div>

            {stage !==
              "success" && (
              <div className="audio-compressor-settings">
                <div className="audio-compressor-setting-group">
                  <label>
                    Output format
                  </label>

                  <div className="audio-compressor-format-grid">
                    {FORMAT_OPTIONS.map(
                      (option) => (
                        <button
                          key={
                            option.value
                          }
                          type="button"
                          className={
                            format ===
                            option.value
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            setFormat(
                              option.value
                            )
                          }
                          disabled={
                            stage ===
                            "processing"
                          }
                        >
                          <strong>
                            {
                              option.label
                            }
                          </strong>

                          <span>
                            {
                              option.description
                            }
                          </span>
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="audio-compressor-setting-group audio-compressor-bitrate-group">
                  <label>
                    Compression quality
                  </label>

                  <div className="audio-compressor-bitrate-grid">
                    {BITRATE_OPTIONS.map(
                      (option) => (
                        <button
                          key={
                            option.value
                          }
                          type="button"
                          className={
                            bitrate ===
                            option.value
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            setBitrate(
                              option.value
                            )
                          }
                          disabled={
                            stage ===
                            "processing"
                          }
                        >
                          <strong>
                            {
                              option.label
                            }
                          </strong>

                          <span>
                            {
                              option.description
                            }
                          </span>
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="audio-compressor-summary">
                  <div>
                    <span>
                      Target
                    </span>

                    <strong>
                      {
                        selectedBitrate?.label
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Format
                    </span>

                    <strong>
                      {
                        selectedFormat?.label
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Original
                    </span>

                    <strong>
                      {formatBytes(
                        file.size
                      )}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {stage ===
            "processing" && (
            <div className="audio-compressor-progress">
              <div className="audio-compressor-progress-top">
                <span>
                  Compressing audio…
                </span>

                <strong>
                  {progress}%
                </strong>
              </div>

              <div className="audio-compressor-progress-track">
                <div
                  className="audio-compressor-progress-fill"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              <button
                type="button"
                className="audio-compressor-secondary"
                onClick={
                  handleCancel
                }
              >
                Cancel
              </button>
            </div>
          )}

          {stage ===
            "error" &&
            error && (
              <div className="audio-compressor-error">
                {error}
              </div>
            )}

          {stage ===
            "success" &&
            result && (
              <div className="audio-compressor-result">
                <div className="audio-compressor-result-player">
                  <audio
                    src={
                      result.url
                    }
                    controls
                  />
                </div>

                <div className="audio-compressor-result-info">
                  <span>
                    COMPRESSION COMPLETE
                  </span>

                  <strong>
                    {
                      result.fileName
                    }
                  </strong>

                  <small>
                    {
                      selectedFormat?.label
                    }{" "}
                    ·{" "}
                    {formatBytes(
                      result.size
                    )}
                  </small>
                </div>

                <div className="audio-compressor-stat">
                  <span>
                    SAVED
                  </span>

                  <strong>
                    {result.savedPercent}%
                  </strong>

                  <small>
                    {formatBytes(
                      result.savedBytes
                    )}
                  </small>
                </div>

                <a
                  className="audio-compressor-download"
                  href={
                    result.url
                  }
                  download={
                    result.fileName
                  }
                >
                  Download
                </a>
              </div>
            )}

          <div className="audio-compressor-actions">
            {stage ===
              "ready" && (
              <button
                type="button"
                className="audio-compressor-primary"
                onClick={
                  handleCompress
                }
              >
                Compress Audio
              </button>
            )}

            {stage ===
              "error" && (
              <button
                type="button"
                className="audio-compressor-primary"
                onClick={
                  handleCompress
                }
              >
                Try Again
              </button>
            )}

            {stage ===
              "success" && (
              <button
                type="button"
                className="audio-compressor-primary"
                onClick={() => {
                  clearResult();

                  setStage(
                    "ready"
                  );

                  setProgress(
                    0
                  );
                }}
              >
                Compress Again
              </button>
            )}

            <button
              type="button"
              className="audio-compressor-secondary"
              onClick={
                handleReset
              }
              disabled={
                stage ===
                "processing"
              }
            >
              Reset
            </button>
          </div>
        </>
      )}

      <style>{`
        .audio-compressor-tool {
          width: 100%;
          box-sizing: border-box;
          padding: 26px 30px 38px;
          color: rgba(255,255,255,.94);
        }

        .audio-compressor-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 26px;
        }

        .audio-compressor-header h2 {
          margin: 0 0 6px;
          font-size: 26px;
          line-height: 1.15;
          letter-spacing: -.03em;
        }

        .audio-compressor-header p {
          margin: 0;
          color: rgba(255,255,255,.55);
          font-size: 14px;
        }

        .audio-compressor-badge {
          padding: 8px 11px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 999px;
          color: rgba(255,255,255,.48);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .12em;
          white-space: nowrap;
        }

        .audio-compressor-dropzone {
          width: 100%;
          min-height: 300px;
          border: 1px dashed rgba(255,255,255,.16);
          border-radius: 24px;
          background: rgba(255,255,255,.025);
          color: inherit;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition:
            border-color .2s ease,
            background .2s ease,
            transform .2s ease;
        }

        .audio-compressor-dropzone:hover,
        .audio-compressor-dropzone.is-dragging {
          border-color: rgba(255,119,0,.65);
          background: rgba(255,119,0,.055);
        }

        .audio-compressor-dropzone:active {
          transform: scale(.995);
        }

        .audio-compressor-upload-icon {
          width: 48px;
          height: 48px;
          margin-bottom: 10px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: rgba(255,119,0,.12);
          color: #ff8a33;
          font-size: 24px;
          font-weight: 800;
        }

        .audio-compressor-dropzone strong {
          font-size: 16px;
        }

        .audio-compressor-dropzone span {
          color: rgba(255,255,255,.5);
          font-size: 13px;
        }

        .audio-compressor-dropzone small {
          margin-top: 8px;
          color: rgba(255,255,255,.3);
          font-size: 11px;
        }

        .audio-compressor-workspace {
          display: grid;
          grid-template-columns: minmax(0,1.1fr) minmax(300px,.9fr);
          gap: 18px;
        }

        .audio-compressor-preview-card,
        .audio-compressor-settings {
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 22px;
          background: rgba(255,255,255,.025);
          overflow: hidden;
        }

        .audio-compressor-preview {
          min-height: 300px;
          padding: 22px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 22px;
          background:
            linear-gradient(
              135deg,
              rgba(255,255,255,.025),
              rgba(255,255,255,.01)
            );
        }

        .audio-compressor-disc {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,119,0,.2);
          background:
            radial-gradient(
              circle at center,
              rgba(255,119,0,.17),
              rgba(255,119,0,.04) 55%,
              rgba(255,255,255,.02) 56%
            );
          color: #ff8730;
          font-size: 42px;
          box-shadow:
            0 0 50px
            rgba(255,119,0,.08);
        }

        .audio-compressor-preview audio {
          width: min(100%, 620px);
        }

        .audio-compressor-file-info {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 16px;
          border-top: 1px solid rgba(255,255,255,.07);
        }

        .audio-compressor-file-info > div:first-child {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .audio-compressor-file-info strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .audio-compressor-file-info span,
        .audio-compressor-meta {
          color: rgba(255,255,255,.4);
          font-size: 11px;
        }

        .audio-compressor-meta {
          white-space: nowrap;
        }

        .audio-compressor-settings {
          padding: 20px;
        }

        .audio-compressor-setting-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .audio-compressor-setting-group + .audio-compressor-setting-group {
          margin-top: 20px;
        }

        .audio-compressor-setting-group > label {
          color: rgba(255,255,255,.6);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .audio-compressor-format-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .audio-compressor-format-grid button {
          min-height: 68px;
          padding: 11px 12px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 13px;
          background: rgba(255,255,255,.025);
          color: inherit;
          text-align: left;
          cursor: pointer;
          transition:
            border-color .18s ease,
            background .18s ease;
        }

        .audio-compressor-format-grid button:hover,
        .audio-compressor-bitrate-grid button:hover {
          border-color: rgba(255,119,0,.35);
        }

        .audio-compressor-format-grid button.active,
        .audio-compressor-bitrate-grid button.active {
          border-color: rgba(255,119,0,.7);
          background: rgba(255,119,0,.08);
        }

        .audio-compressor-format-grid button strong,
        .audio-compressor-format-grid button span,
        .audio-compressor-bitrate-grid button strong,
        .audio-compressor-bitrate-grid button span {
          display: block;
        }

        .audio-compressor-format-grid button strong {
          margin-bottom: 4px;
          font-size: 13px;
        }

        .audio-compressor-format-grid button span,
        .audio-compressor-bitrate-grid button span {
          color: rgba(255,255,255,.38);
          font-size: 10px;
          line-height: 1.35;
        }

        .audio-compressor-bitrate-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .audio-compressor-bitrate-grid button {
          min-height: 52px;
          padding: 9px 10px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 12px;
          background: rgba(255,255,255,.025);
          color: inherit;
          text-align: left;
          cursor: pointer;
          transition:
            border-color .18s ease,
            background .18s ease;
        }

        .audio-compressor-bitrate-grid button strong {
          margin-bottom: 3px;
          font-size: 12px;
        }

        .audio-compressor-summary {
          margin-top: 20px;
          padding: 13px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 14px;
          background: rgba(255,255,255,.02);
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
        }

        .audio-compressor-summary div {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .audio-compressor-summary span {
          color: rgba(255,255,255,.35);
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: .07em;
        }

        .audio-compressor-summary strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
        }

        .audio-compressor-progress {
          margin-top: 18px;
          padding: 18px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 18px;
          background: rgba(255,255,255,.025);
        }

        .audio-compressor-progress-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 13px;
        }

        .audio-compressor-progress-top strong {
          color: #ff8730;
        }

        .audio-compressor-progress-track {
          width: 100%;
          height: 7px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,.08);
        }

        .audio-compressor-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: #ff7b20;
          transition: width .18s ease;
        }

        .audio-compressor-progress .audio-compressor-secondary {
          margin-top: 12px;
        }

        .audio-compressor-error {
          margin-top: 18px;
          padding: 13px 15px;
          border: 1px solid rgba(255,75,75,.2);
          border-radius: 14px;
          background: rgba(255,75,75,.05);
          color: rgba(255,180,180,.9);
          font-size: 13px;
        }

        .audio-compressor-result {
          margin-top: 18px;
          padding: 16px;
          border: 1px solid rgba(105,255,160,.18);
          border-radius: 18px;
          background: rgba(105,255,160,.045);
          display: grid;
          grid-template-columns: minmax(220px,1fr) minmax(170px,.8fr) auto auto;
          align-items: center;
          gap: 16px;
        }

        .audio-compressor-result-player audio {
          display: block;
          width: 100%;
        }

        .audio-compressor-result-info {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .audio-compressor-result-info span,
        .audio-compressor-stat span {
          color: rgba(155,255,190,.75);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .08em;
        }

        .audio-compressor-result-info strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .audio-compressor-result-info small,
        .audio-compressor-stat small {
          color: rgba(255,255,255,.38);
          font-size: 11px;
        }

        .audio-compressor-stat {
          min-width: 70px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .audio-compressor-stat strong {
          color: #8dffb4;
          font-size: 18px;
        }

        .audio-compressor-primary,
        .audio-compressor-secondary,
        .audio-compressor-download {
          min-height: 42px;
          padding: 0 16px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid transparent;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          transition:
            transform .18s ease,
            border-color .18s ease,
            background .18s ease;
        }

        .audio-compressor-primary,
        .audio-compressor-download {
          background: #ff7b20;
          color: #120c08;
        }

        .audio-compressor-primary:hover,
        .audio-compressor-download:hover {
          transform: translateY(-1px);
          background: #ff8a36;
        }

        .audio-compressor-secondary {
          border-color: rgba(255,255,255,.09);
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.78);
        }

        .audio-compressor-secondary:hover {
          border-color: rgba(255,255,255,.18);
          background: rgba(255,255,255,.05);
        }

        .audio-compressor-secondary:disabled,
        .audio-compressor-primary:disabled {
          opacity: .45;
          cursor: not-allowed;
          transform: none;
        }

        .audio-compressor-actions {
          margin-top: 18px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        @media (max-width: 1000px) {
          .audio-compressor-workspace {
            grid-template-columns: 1fr;
          }

          .audio-compressor-result {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .audio-compressor-tool {
            padding: 22px 18px 30px;
          }

          .audio-compressor-header {
            flex-direction: column;
          }

          .audio-compressor-preview {
            min-height: 240px;
          }

          .audio-compressor-file-info {
            align-items: flex-start;
            flex-direction: column;
          }

          .audio-compressor-format-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .audio-compressor-bitrate-grid,
          .audio-compressor-summary {
            grid-template-columns: 1fr;
          }

          .audio-compressor-actions {
            justify-content: stretch;
          }

          .audio-compressor-actions button {
            flex: 1 1 100%;
          }

          .audio-compressor-download {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}