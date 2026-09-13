import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  changeAudioSpeed,
} from "../../services/audio/changeAudioSpeed";

const SPEED_OPTIONS = [
  {
    value: 0.25,
    label: "0.25×",
    description: "4× slower",
  },
  {
    value: 0.5,
    label: "0.5×",
    description: "2× slower",
  },
  {
    value: 0.75,
    label: "0.75×",
    description: "Slightly slower",
  },
  {
    value: 1,
    label: "1×",
    description: "Original speed",
  },
  {
    value: 1.25,
    label: "1.25×",
    description: "Slightly faster",
  },
  {
    value: 1.5,
    label: "1.5×",
    description: "50% faster",
  },
  {
    value: 2,
    label: "2×",
    description: "Twice as fast",
  },
  {
    value: 4,
    label: "4×",
    description: "4× faster",
  },
];

const FORMAT_OPTIONS = [
  {
    value: "mp3",
    label: "MP3",
    description: "Best compatibility",
  },
  {
    value: "m4a",
    label: "M4A",
    description: "Efficient high quality",
  },
  {
    value: "wav",
    label: "WAV",
    description: "Uncompressed",
  },
  {
    value: "ogg",
    label: "OGG",
    description: "Open audio",
  },
  {
    value: "opus",
    label: "Opus",
    description: "Compact modern audio",
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
    (totalSeconds % 3600) /
      60
  );

  const remaining =
    totalSeconds % 60;

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
};

export default function AudioChangeSpeed() {
  const inputRef =
    useRef(null);

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

  const [duration, setDuration] =
    useState(0);

  const [speed, setSpeed] =
    useState(1);

  const [format, setFormat] =
    useState("mp3");

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

      if (
        previewUrlRef.current
      ) {
        URL.revokeObjectURL(
          previewUrlRef.current
        );
      }

      if (
        resultUrlRef.current
      ) {
        URL.revokeObjectURL(
          resultUrlRef.current
        );
      }
    };
  }, []);

  const clearResult = () => {
    if (
      resultUrlRef.current
    ) {
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

    if (
      previewUrlRef.current
    ) {
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

    audio.preload =
      "metadata";

    audio.onloadedmetadata =
      () => {
        setDuration(
          Number.isFinite(
            audio.duration
          )
            ? audio.duration
            : 0
        );
      };

    audio.onerror = () => {
      setDuration(0);
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

  const handleChangeSpeed =
    async () => {
      if (!file) {
        return;
      }

      setError("");
      setProgress(0);
      setStage(
        "processing"
      );

      const controller =
        new AbortController();

      abortControllerRef.current =
        controller;

      try {
        const changed =
          await changeAudioSpeed({
            file,
            speed,
            format,
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
          changed.url;

        setResult(
          changed
        );

        setProgress(100);
        setStage("success");
      } catch (
        speedError
      ) {
        if (
          speedError?.name ===
          "AbortError"
        ) {
          setStage("ready");
          setProgress(0);
          return;
        }

        console.error(
          speedError
        );

        setStage("error");

        setError(
          speedError?.message ||
            "Something went wrong while changing the audio speed."
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

    if (
      previewUrlRef.current
    ) {
      URL.revokeObjectURL(
        previewUrlRef.current
      );

      previewUrlRef.current =
        null;
    }

    clearResult();

    setFile(null);
    setPreviewUrl(null);
    setDuration(0);
    setSpeed(1);
    setFormat("mp3");
    setProgress(0);
    setError("");
    setStage("idle");

    if (inputRef.current) {
      inputRef.current.value =
        "";
    }
  };

  const selectedSpeed =
    SPEED_OPTIONS.find(
      (option) =>
        option.value === speed
    );

  const selectedFormat =
    FORMAT_OPTIONS.find(
      (option) =>
        option.value === format
    );

  const newDuration =
    duration > 0
      ? duration / speed
      : 0;

  return (
    <div className="audio-speed-tool">
      <div className="audio-speed-header">
        <div>
          <h2>
            Change Audio Speed
          </h2>

          <p>
            Speed up or slow down your
            audio while keeping the
            recording natural.
          </p>
        </div>

        <div className="audio-speed-badge">
          BROWSER · PRIVATE
        </div>
      </div>

      {!file &&
        stage === "idle" && (
          <button
            type="button"
            className={`audio-speed-dropzone ${
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
            <div className="audio-speed-upload-icon">
              ↗
            </div>

            <strong>
              Drop your audio here
            </strong>

            <span>
              or click to choose an
              audio file
            </span>

            <small>
              MP3, WAV, M4A, OGG,
              FLAC and more
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
          <div className="audio-speed-workspace">
            <div className="audio-speed-preview-card">
              <div className="audio-speed-preview">
                <div className="audio-speed-disc">
                  ♪
                </div>

                <audio
                  src={
                    previewUrl
                  }
                  controls
                />
              </div>

              <div className="audio-speed-file-info">
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

                <div className="audio-speed-meta">
                  {formatDuration(
                    duration
                  )}
                </div>
              </div>
            </div>

            {stage !==
              "success" && (
              <div className="audio-speed-settings">
                <div className="audio-speed-setting-group">
                  <label>
                    Playback speed
                  </label>

                  <div className="audio-speed-options">
                    {SPEED_OPTIONS.map(
                      (option) => (
                        <button
                          key={
                            option.value
                          }
                          type="button"
                          className={
                            speed ===
                            option.value
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            setSpeed(
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

                <div className="audio-speed-duration-card">
                  <div>
                    <span>
                      Original
                    </span>

                    <strong>
                      {formatDuration(
                        duration
                      )}
                    </strong>
                  </div>

                  <div className="audio-speed-arrow">
                    →
                  </div>

                  <div>
                    <span>
                      New duration
                    </span>

                    <strong>
                      {formatDuration(
                        newDuration
                      )}
                    </strong>
                  </div>
                </div>

                <div className="audio-speed-setting-group audio-speed-format-group">
                  <label>
                    Output format
                  </label>

                  <div className="audio-speed-format-grid">
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

                <div className="audio-speed-note">
                  <span>✓</span>

                  <p>
                    The tempo changes while
                    the audio remains
                    properly processed for the
                    selected speed.
                  </p>
                </div>
              </div>
            )}
          </div>

          {stage ===
            "processing" && (
            <div className="audio-speed-progress">
              <div className="audio-speed-progress-top">
                <span>
                  Changing audio speed…
                </span>

                <strong>
                  {progress}%
                </strong>
              </div>

              <div className="audio-speed-progress-track">
                <div
                  className="audio-speed-progress-fill"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              <button
                type="button"
                className="audio-speed-secondary"
                onClick={
                  handleCancel
                }
              >
                Cancel
              </button>
            </div>
          )}

          {stage === "error" &&
            error && (
              <div className="audio-speed-error">
                {error}
              </div>
            )}

          {stage ===
            "success" &&
            result && (
            <div className="audio-speed-success">
              <div className="audio-speed-success-player">
                <audio
                  src={
                    result.url
                  }
                  controls
                />
              </div>

              <div className="audio-speed-success-info">
                <span>
                  SPEED CHANGE COMPLETE
                </span>

                <strong>
                  {result.fileName}
                </strong>

                <small>
                  {
                    selectedSpeed?.label
                  }{" "}
                  ·{" "}
                  {
                    selectedFormat?.label
                  }{" "}
                  ·{" "}
                  {formatBytes(
                    result.size
                  )}
                </small>
              </div>

              <a
                className="audio-speed-download"
                href={
                  result.url
                }
                download={
                  result.fileName
                }
              >
                Download Audio
              </a>
            </div>
          )}

          <div className="audio-speed-actions">
            {stage === "ready" && (
              <button
                type="button"
                className="audio-speed-primary"
                onClick={
                  handleChangeSpeed
                }
              >
                Apply{" "}
                {
                  selectedSpeed?.label
                }
              </button>
            )}

            {stage ===
              "error" && (
              <button
                type="button"
                className="audio-speed-primary"
                onClick={
                  handleChangeSpeed
                }
              >
                Try Again
              </button>
            )}

            {stage ===
              "success" && (
              <button
                type="button"
                className="audio-speed-primary"
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
                Change Again
              </button>
            )}

            <button
              type="button"
              className="audio-speed-secondary"
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
        .audio-speed-tool {
          width: 100%;
          box-sizing: border-box;
          padding: 26px 30px 38px;
          color: rgba(255,255,255,.94);
        }

        .audio-speed-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 26px;
        }

        .audio-speed-header h2 {
          margin: 0 0 6px;
          font-size: 26px;
          line-height: 1.15;
          letter-spacing: -.03em;
        }

        .audio-speed-header p {
          margin: 0;
          color: rgba(255,255,255,.55);
          font-size: 14px;
        }

        .audio-speed-badge {
          padding: 8px 11px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 999px;
          color: rgba(255,255,255,.48);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .12em;
          white-space: nowrap;
        }

        .audio-speed-dropzone {
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

        .audio-speed-dropzone:hover,
        .audio-speed-dropzone.is-dragging {
          border-color: rgba(255,119,0,.65);
          background: rgba(255,119,0,.055);
        }

        .audio-speed-dropzone:active {
          transform: scale(.995);
        }

        .audio-speed-upload-icon {
          width: 48px;
          height: 48px;
          margin-bottom: 10px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: rgba(255,119,0,.12);
          color: #ff8a33;
          font-size: 23px;
          font-weight: 800;
        }

        .audio-speed-dropzone strong {
          font-size: 16px;
        }

        .audio-speed-dropzone span {
          color: rgba(255,255,255,.5);
          font-size: 13px;
        }

        .audio-speed-dropzone small {
          margin-top: 8px;
          color: rgba(255,255,255,.3);
          font-size: 11px;
        }

        .audio-speed-workspace {
          display: grid;
          grid-template-columns: minmax(0,1.15fr) minmax(290px,.85fr);
          gap: 18px;
        }

        .audio-speed-preview-card,
        .audio-speed-settings {
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 22px;
          background: rgba(255,255,255,.025);
          overflow: hidden;
        }

        .audio-speed-preview {
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

        .audio-speed-disc {
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

        .audio-speed-preview audio {
          width: min(100%, 620px);
        }

        .audio-speed-file-info {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 16px;
          border-top: 1px solid rgba(255,255,255,.07);
        }

        .audio-speed-file-info > div:first-child {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .audio-speed-file-info strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .audio-speed-file-info span,
        .audio-speed-meta {
          color: rgba(255,255,255,.4);
          font-size: 11px;
        }

        .audio-speed-meta {
          white-space: nowrap;
        }

        .audio-speed-settings {
          padding: 20px;
        }

        .audio-speed-setting-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .audio-speed-setting-group > label {
          color: rgba(255,255,255,.6);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .audio-speed-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .audio-speed-options button,
        .audio-speed-format-grid button {
          min-height: 66px;
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

        .audio-speed-options button:hover,
        .audio-speed-format-grid button:hover {
          border-color: rgba(255,119,0,.35);
        }

        .audio-speed-options button.active,
        .audio-speed-format-grid button.active {
          border-color: rgba(255,119,0,.7);
          background: rgba(255,119,0,.08);
        }

        .audio-speed-options button strong,
        .audio-speed-options button span,
        .audio-speed-format-grid button strong,
        .audio-speed-format-grid button span {
          display: block;
        }

        .audio-speed-options button strong,
        .audio-speed-format-grid button strong {
          margin-bottom: 4px;
          font-size: 13px;
        }

        .audio-speed-options button span,
        .audio-speed-format-grid button span {
          color: rgba(255,255,255,.38);
          font-size: 10px;
          line-height: 1.35;
        }

        .audio-speed-duration-card {
          margin-top: 18px;
          padding: 14px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 15px;
          background: rgba(255,255,255,.02);
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 10px;
        }

        .audio-speed-duration-card > div:not(.audio-speed-arrow) {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .audio-speed-duration-card span {
          color: rgba(255,255,255,.38);
          font-size: 10px;
        }

        .audio-speed-duration-card strong {
          font-size: 14px;
        }

        .audio-speed-duration-card > div:last-child {
          text-align: right;
        }

        .audio-speed-arrow {
          color: #ff8730;
          font-size: 17px;
        }

        .audio-speed-format-group {
          margin-top: 20px;
        }

        .audio-speed-format-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .audio-speed-format-grid button {
          min-height: 62px;
        }

        .audio-speed-note {
          margin-top: 18px;
          padding: 12px;
          border: 1px solid rgba(255,119,0,.12);
          border-radius: 14px;
          background: rgba(255,119,0,.035);
          display: flex;
          gap: 9px;
          align-items: flex-start;
        }

        .audio-speed-note span {
          color: #ff8730;
          font-size: 12px;
          font-weight: 800;
        }

        .audio-speed-note p {
          margin: 1px 0 0;
          color: rgba(255,255,255,.4);
          font-size: 10px;
          line-height: 1.5;
        }

        .audio-speed-progress {
          margin-top: 18px;
          padding: 18px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 18px;
          background: rgba(255,255,255,.025);
        }

        .audio-speed-progress-top {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 13px;
        }

        .audio-speed-progress-top strong {
          color: #ff8730;
        }

        .audio-speed-progress-track {
          width: 100%;
          height: 7px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,.08);
        }

        .audio-speed-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: #ff7b20;
          transition: width .18s ease;
        }

        .audio-speed-progress .audio-speed-secondary {
          margin-top: 12px;
        }

        .audio-speed-error {
          margin-top: 18px;
          padding: 13px 15px;
          border: 1px solid rgba(255,75,75,.2);
          border-radius: 14px;
          background: rgba(255,75,75,.05);
          color: rgba(255,180,180,.9);
          font-size: 13px;
        }

        .audio-speed-success {
          margin-top: 18px;
          padding: 16px;
          border: 1px solid rgba(105,255,160,.18);
          border-radius: 18px;
          background: rgba(105,255,160,.045);
          display: grid;
          grid-template-columns: minmax(220px,1fr) minmax(170px,.8fr) auto;
          align-items: center;
          gap: 16px;
        }

        .audio-speed-success-player audio {
          display: block;
          width: 100%;
        }

        .audio-speed-success-info {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .audio-speed-success-info span {
          color: rgba(155,255,190,.75);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .08em;
        }

        .audio-speed-success-info strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .audio-speed-success-info small {
          color: rgba(255,255,255,.38);
          font-size: 11px;
        }

        .audio-speed-primary,
        .audio-speed-secondary,
        .audio-speed-download {
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

        .audio-speed-primary,
        .audio-speed-download {
          background: #ff7b20;
          color: #120c08;
        }

        .audio-speed-primary:hover,
        .audio-speed-download:hover {
          transform: translateY(-1px);
          background: #ff8a36;
        }

        .audio-speed-secondary {
          border-color: rgba(255,255,255,.09);
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.78);
        }

        .audio-speed-secondary:hover {
          border-color: rgba(255,255,255,.18);
          background: rgba(255,255,255,.05);
        }

        .audio-speed-secondary:disabled,
        .audio-speed-primary:disabled {
          opacity: .45;
          cursor: not-allowed;
          transform: none;
        }

        .audio-speed-actions {
          margin-top: 18px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        @media (max-width: 950px) {
          .audio-speed-workspace {
            grid-template-columns: 1fr;
          }

          .audio-speed-success {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .audio-speed-tool {
            padding: 22px 18px 30px;
          }

          .audio-speed-header {
            flex-direction: column;
          }

          .audio-speed-preview {
            min-height: 240px;
          }

          .audio-speed-file-info {
            align-items: flex-start;
            flex-direction: column;
          }

          .audio-speed-format-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .audio-speed-options {
            grid-template-columns: 1fr;
          }

          .audio-speed-duration-card {
            grid-template-columns: 1fr;
          }

          .audio-speed-duration-card > div:last-child {
            text-align: left;
          }

          .audio-speed-arrow {
            justify-self: center;
            transform: rotate(90deg);
          }

          .audio-speed-actions {
            justify-content: stretch;
          }

          .audio-speed-actions button {
            flex: 1 1 100%;
          }

          .audio-speed-download {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}