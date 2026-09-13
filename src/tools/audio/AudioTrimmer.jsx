import {
  useEffect,
  useRef,
  useState,
} from "react";
import { trimAudio } from "../../services/audio/trimAudio";

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
    description: "Uncompressed audio",
  },
  {
    value: "ogg",
    label: "OGG",
    description: "Open audio format",
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

const formatTime = (seconds) => {
  if (
    !Number.isFinite(seconds) ||
    seconds < 0
  ) {
    return "00:00";
  }

  const totalSeconds =
    Math.floor(seconds);

  const minutes = Math.floor(
    totalSeconds / 60
  );

  const remaining =
    totalSeconds % 60;

  return `${String(minutes).padStart(
    2,
    "0"
  )}:${String(
    remaining
  ).padStart(
    2,
    "0"
  )}`;
};

const parseTime = (value) => {
  if (typeof value !== "string") {
    return 0;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return 0;
  }

  if (
    trimmed.includes(":")
  ) {
    const parts =
      trimmed
        .split(":")
        .map(Number);

    if (
      parts.some(
        (part) =>
          !Number.isFinite(
            part
          )
      )
    ) {
      return NaN;
    }

    if (parts.length === 2) {
      return (
        parts[0] * 60 +
        parts[1]
      );
    }

    if (parts.length === 3) {
      return (
        parts[0] * 3600 +
        parts[1] * 60 +
        parts[2]
      );
    }

    return NaN;
  }

  return Number(trimmed);
};

export default function AudioTrimmer() {
  const inputRef =
    useRef(null);

  const audioRef =
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

  const [startTime, setStartTime] =
    useState("0");

  const [endTime, setEndTime] =
    useState("");

  const [currentTime, setCurrentTime] =
    useState(0);

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

    if (
      selectedFile.size <= 0
    ) {
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

    setStartTime("0");
    setCurrentTime(0);

    const audio =
      document.createElement(
        "audio"
      );

    audio.preload =
      "metadata";

    audio.onloadedmetadata =
      () => {
        const loadedDuration =
          Number.isFinite(
            audio.duration
          )
            ? audio.duration
            : 0;

        setDuration(
          loadedDuration
        );

        setEndTime(
          loadedDuration
            ? String(
                Number(
                  loadedDuration.toFixed(
                    2
                  )
                )
              )
            : ""
        );
      };

    audio.onerror = () => {
      setDuration(0);
      setEndTime("");
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

  const updateStartTime = (
    value
  ) => {
    setStartTime(value);
    setError("");
    clearResult();

    const parsed =
      parseTime(value);

    if (
      Number.isFinite(parsed) &&
      duration > 0
    ) {
      const clamped = Math.max(
        0,
        Math.min(
          parsed,
          Math.max(
            0,
            duration - 0.05
          )
        )
      );

      if (
        audioRef.current
      ) {
        audioRef.current.currentTime =
          clamped;
      }

      setCurrentTime(
        clamped
      );
    }
  };

  const updateEndTime = (
    value
  ) => {
    setEndTime(value);
    setError("");
    clearResult();
  };

  const handleTimelineChange = (
    event
  ) => {
    const value =
      Number(
        event.target.value
      );

    if (
      !Number.isFinite(value)
    ) {
      return;
    }

    const nextStart =
      Math.min(
        value,
        Math.max(
          0,
          duration - 0.05
        )
      );

    setStartTime(
      Number(
        nextStart.toFixed(2)
      ).toString()
    );

    setCurrentTime(
      nextStart
    );

    clearResult();

    if (
      audioRef.current
    ) {
      audioRef.current.currentTime =
        nextStart;
    }
  };

  const jumpToStart = () => {
    const parsed =
      parseTime(startTime);

    if (
      Number.isFinite(parsed) &&
      audioRef.current
    ) {
      audioRef.current.currentTime =
        parsed;
      setCurrentTime(
        parsed
      );
    }
  };

  const jumpToEnd = () => {
    const parsed =
      parseTime(endTime);

    if (
      Number.isFinite(parsed) &&
      audioRef.current
    ) {
      const target =
        Math.max(
          0,
          parsed - 0.05
        );

      audioRef.current.currentTime =
        target;

      setCurrentTime(
        target
      );
    }
  };

  const handleTrim =
    async () => {
      if (!file) {
        return;
      }

      const start =
        parseTime(startTime);

      const end =
        parseTime(endTime);

      if (
        !Number.isFinite(
          start
        ) ||
        start < 0
      ) {
        setStage("error");
        setError(
          "Enter a valid start time."
        );
        return;
      }

      if (
        !Number.isFinite(end) ||
        end <= 0
      ) {
        setStage("error");
        setError(
          "Enter a valid end time."
        );
        return;
      }

      if (
        end <= start
      ) {
        setStage("error");
        setError(
          "End time must be greater than start time."
        );
        return;
      }

      if (
        duration > 0 &&
        end > duration
      ) {
        setStage("error");
        setError(
          `End time cannot exceed ${formatTime(
            duration
          )}.`
        );
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
        const trimmed =
          await trimAudio({
            file,
            startTime: start,
            endTime: end,
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
          trimmed.url;

        setResult(
          trimmed
        );

        setProgress(100);
        setStage("success");
      } catch (
        trimError
      ) {
        if (
          trimError?.name ===
          "AbortError"
        ) {
          setStage("ready");
          setProgress(0);
          return;
        }

        console.error(
          trimError
        );

        setStage("error");

        setError(
          trimError?.message ||
            "Something went wrong while trimming the audio."
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
    setStartTime("0");
    setEndTime("");
    setCurrentTime(0);
    setFormat("mp3");
    setProgress(0);
    setError("");
    setStage("idle");

    if (inputRef.current) {
      inputRef.current.value =
        "";
    }
  };

  const selectedStart =
    parseTime(startTime);

  const selectedEnd =
    parseTime(endTime);

  const trimDuration =
    Number.isFinite(
      selectedStart
    ) &&
    Number.isFinite(
      selectedEnd
    ) &&
    selectedEnd >
      selectedStart
      ? selectedEnd -
        selectedStart
      : 0;

  const timelineMax =
    duration > 0
      ? duration
      : 1;

  return (
    <div className="audio-trimmer-tool">
      <div className="audio-trimmer-header">
        <div>
          <h2>
            Audio Trimmer
          </h2>

          <p>
            Cut out exactly the part of
            your audio you want to keep.
          </p>
        </div>

        <div className="audio-trimmer-badge">
          BROWSER · PRIVATE
        </div>
      </div>

      {!file &&
        stage === "idle" && (
          <button
            type="button"
            className={`audio-trimmer-dropzone ${
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
            <div className="audio-trimmer-upload-icon">
              ✂
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
          <div className="audio-trimmer-workspace">
            <div className="audio-trimmer-preview-card">
              <div className="audio-trimmer-preview">
                <div className="audio-trimmer-disc">
                  ♪
                </div>

                <audio
                  ref={audioRef}
                  src={
                    previewUrl
                  }
                  controls
                  onTimeUpdate={(
                    event
                  ) =>
                    setCurrentTime(
                      event.currentTarget
                        .currentTime
                    )
                  }
                />

                <div className="audio-trimmer-current-time">
                  {formatTime(
                    currentTime
                  )}{" "}
                  /{" "}
                  {formatTime(
                    duration
                  )}
                </div>
              </div>

              <div className="audio-trimmer-file-info">
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

                <div className="audio-trimmer-meta">
                  {formatTime(
                    duration
                  )}
                </div>
              </div>
            </div>

            {stage !==
              "success" && (
              <div className="audio-trimmer-settings">
                <div className="audio-trimmer-setting-group">
                  <label>
                    Select portion
                  </label>

                  <div className="audio-trimmer-range-wrap">
                    <input
                      type="range"
                      min="0"
                      max={
                        timelineMax
                      }
                      step="0.01"
                      value={
                        Number.isFinite(
                          selectedStart
                        )
                          ? Math.min(
                              selectedStart,
                              Math.max(
                                0,
                                timelineMax
                              )
                            )
                          : 0
                      }
                      onChange={
                        handleTimelineChange
                      }
                      disabled={
                        stage ===
                        "processing"
                      }
                    />

                    <div className="audio-trimmer-range-labels">
                      <span>
                        00:00
                      </span>

                      <span>
                        {formatTime(
                          duration
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="audio-trimmer-time-grid">
                  <div className="audio-trimmer-time-field">
                    <label htmlFor="audio-start">
                      Start
                    </label>

                    <input
                      id="audio-start"
                      type="text"
                      inputMode="decimal"
                      value={
                        startTime
                      }
                      onChange={(
                        event
                      ) =>
                        updateStartTime(
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="0"
                      disabled={
                        stage ===
                        "processing"
                      }
                    />

                    <button
                      type="button"
                      onClick={
                        jumpToStart
                      }
                      disabled={
                        stage ===
                        "processing"
                      }
                    >
                      Jump
                    </button>
                  </div>

                  <div className="audio-trimmer-time-arrow">
                    →
                  </div>

                  <div className="audio-trimmer-time-field">
                    <label htmlFor="audio-end">
                      End
                    </label>

                    <input
                      id="audio-end"
                      type="text"
                      inputMode="decimal"
                      value={
                        endTime
                      }
                      onChange={(
                        event
                      ) =>
                        updateEndTime(
                          event
                            .target
                            .value
                        )
                      }
                      placeholder={
                        duration
                          ? String(
                              duration
                            )
                          : "0"
                      }
                      disabled={
                        stage ===
                        "processing"
                      }
                    />

                    <button
                      type="button"
                      onClick={
                        jumpToEnd
                      }
                      disabled={
                        stage ===
                        "processing"
                      }
                    >
                      Jump
                    </button>
                  </div>
                </div>

                <div className="audio-trimmer-summary">
                  <div>
                    <span>
                      Selected
                    </span>

                    <strong>
                      {formatTime(
                        trimDuration
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      From
                    </span>

                    <strong>
                      {formatTime(
                        selectedStart
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      To
                    </span>

                    <strong>
                      {formatTime(
                        selectedEnd
                      )}
                    </strong>
                  </div>
                </div>

                <div className="audio-trimmer-setting-group audio-trimmer-format-group">
                  <label>
                    Output format
                  </label>

                  <div className="audio-trimmer-format-grid">
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

                <div className="audio-trimmer-help">
                  <span>
                    TIP
                  </span>

                  <p>
                    You can enter seconds
                    directly, or use{" "}
                    <strong>
                      mm:ss
                    </strong>{" "}
                    /{" "}
                    <strong>
                      hh:mm:ss
                    </strong>{" "}
                    format.
                  </p>
                </div>
              </div>
            )}
          </div>

          {stage ===
            "processing" && (
            <div className="audio-trimmer-progress">
              <div className="audio-trimmer-progress-top">
                <span>
                  Trimming audio…
                </span>

                <strong>
                  {progress}%
                </strong>
              </div>

              <div className="audio-trimmer-progress-track">
                <div
                  className="audio-trimmer-progress-fill"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              <button
                type="button"
                className="audio-trimmer-secondary"
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
              <div className="audio-trimmer-error">
                {error}
              </div>
            )}

          {stage ===
            "success" &&
            result && (
            <div className="audio-trimmer-success">
              <div className="audio-trimmer-success-player">
                <audio
                  src={
                    result.url
                  }
                  controls
                />
              </div>

              <div className="audio-trimmer-success-info">
                <span>
                  TRIM COMPLETE
                </span>

                <strong>
                  {
                    result.fileName
                  }
                </strong>

                <small>
                  {formatTime(
                    result.duration
                  )}{" "}
                  ·{" "}
                  {formatBytes(
                    result.size
                  )}
                </small>
              </div>

              <a
                className="audio-trimmer-download"
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

          <div className="audio-trimmer-actions">
            {stage ===
              "ready" && (
              <button
                type="button"
                className="audio-trimmer-primary"
                onClick={
                  handleTrim
                }
              >
                Trim Audio
              </button>
            )}

            {stage ===
              "error" && (
              <button
                type="button"
                className="audio-trimmer-primary"
                onClick={
                  handleTrim
                }
              >
                Try Again
              </button>
            )}

            {stage ===
              "success" && (
              <button
                type="button"
                className="audio-trimmer-primary"
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
                Trim Again
              </button>
            )}

            <button
              type="button"
              className="audio-trimmer-secondary"
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
        .audio-trimmer-tool {
          width: 100%;
          box-sizing: border-box;
          padding: 26px 30px 38px;
          color: rgba(255,255,255,.94);
        }

        .audio-trimmer-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 26px;
        }

        .audio-trimmer-header h2 {
          margin: 0 0 6px;
          font-size: 26px;
          line-height: 1.15;
          letter-spacing: -.03em;
        }

        .audio-trimmer-header p {
          margin: 0;
          color: rgba(255,255,255,.55);
          font-size: 14px;
        }

        .audio-trimmer-badge {
          padding: 8px 11px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 999px;
          color: rgba(255,255,255,.48);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .12em;
          white-space: nowrap;
        }

        .audio-trimmer-dropzone {
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

        .audio-trimmer-dropzone:hover,
        .audio-trimmer-dropzone.is-dragging {
          border-color: rgba(255,119,0,.65);
          background: rgba(255,119,0,.055);
        }

        .audio-trimmer-dropzone:active {
          transform: scale(.995);
        }

        .audio-trimmer-upload-icon {
          width: 48px;
          height: 48px;
          margin-bottom: 10px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: rgba(255,119,0,.12);
          color: #ff8a33;
          font-size: 21px;
          font-weight: 800;
        }

        .audio-trimmer-dropzone strong {
          font-size: 16px;
        }

        .audio-trimmer-dropzone span {
          color: rgba(255,255,255,.5);
          font-size: 13px;
        }

        .audio-trimmer-dropzone small {
          margin-top: 8px;
          color: rgba(255,255,255,.3);
          font-size: 11px;
        }

        .audio-trimmer-workspace {
          display: grid;
          grid-template-columns: minmax(0,1.1fr) minmax(300px,.9fr);
          gap: 18px;
        }

        .audio-trimmer-preview-card,
        .audio-trimmer-settings {
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 22px;
          background: rgba(255,255,255,.025);
          overflow: hidden;
        }

        .audio-trimmer-preview {
          min-height: 300px;
          padding: 22px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 18px;
          background:
            linear-gradient(
              135deg,
              rgba(255,255,255,.025),
              rgba(255,255,255,.01)
            );
        }

        .audio-trimmer-disc {
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

        .audio-trimmer-preview audio {
          width: min(100%, 620px);
        }

        .audio-trimmer-current-time {
          color: rgba(255,255,255,.4);
          font-size: 11px;
          font-variant-numeric: tabular-nums;
        }

        .audio-trimmer-file-info {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 16px;
          border-top: 1px solid rgba(255,255,255,.07);
        }

        .audio-trimmer-file-info > div:first-child {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .audio-trimmer-file-info strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .audio-trimmer-file-info span,
        .audio-trimmer-meta {
          color: rgba(255,255,255,.4);
          font-size: 11px;
        }

        .audio-trimmer-meta {
          white-space: nowrap;
        }

        .audio-trimmer-settings {
          padding: 20px;
        }

        .audio-trimmer-setting-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .audio-trimmer-setting-group > label {
          color: rgba(255,255,255,.6);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .audio-trimmer-range-wrap {
          padding: 8px 0 0;
        }

        .audio-trimmer-range-wrap input[type="range"] {
          width: 100%;
          accent-color: #ff7b20;
          cursor: pointer;
        }

        .audio-trimmer-range-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 5px;
          color: rgba(255,255,255,.3);
          font-size: 9px;
          font-variant-numeric: tabular-nums;
        }

        .audio-trimmer-time-grid {
          margin-top: 20px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: end;
          gap: 9px;
        }

        .audio-trimmer-time-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .audio-trimmer-time-field label {
          color: rgba(255,255,255,.5);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .07em;
          text-transform: uppercase;
        }

        .audio-trimmer-time-field input {
          width: 100%;
          box-sizing: border-box;
          min-height: 42px;
          padding: 0 11px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 11px;
          background: rgba(255,255,255,.025);
          color: white;
          outline: none;
          font-size: 12px;
        }

        .audio-trimmer-time-field input:focus {
          border-color: rgba(255,119,0,.55);
        }

        .audio-trimmer-time-field button {
          align-self: flex-start;
          padding: 5px 8px;
          border: 0;
          background: none;
          color: #ff8730;
          font-size: 9px;
          font-weight: 700;
          cursor: pointer;
        }

        .audio-trimmer-time-arrow {
          padding-bottom: 34px;
          color: #ff8730;
          font-size: 15px;
        }

        .audio-trimmer-summary {
          margin-top: 18px;
          padding: 13px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 14px;
          background: rgba(255,255,255,.02);
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
        }

        .audio-trimmer-summary div {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .audio-trimmer-summary span {
          color: rgba(255,255,255,.35);
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: .07em;
        }

        .audio-trimmer-summary strong {
          font-size: 12px;
          font-variant-numeric: tabular-nums;
        }

        .audio-trimmer-format-group {
          margin-top: 20px;
        }

        .audio-trimmer-format-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .audio-trimmer-format-grid button {
          min-height: 62px;
          padding: 10px 11px;
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

        .audio-trimmer-format-grid button:hover {
          border-color: rgba(255,119,0,.35);
        }

        .audio-trimmer-format-grid button.active {
          border-color: rgba(255,119,0,.7);
          background: rgba(255,119,0,.08);
        }

        .audio-trimmer-format-grid button strong,
        .audio-trimmer-format-grid button span {
          display: block;
        }

        .audio-trimmer-format-grid button strong {
          margin-bottom: 3px;
          font-size: 12px;
        }

        .audio-trimmer-format-grid button span {
          color: rgba(255,255,255,.38);
          font-size: 9px;
          line-height: 1.3;
        }

        .audio-trimmer-help {
          margin-top: 18px;
          padding: 11px 12px;
          border: 1px solid rgba(255,119,0,.12);
          border-radius: 13px;
          background: rgba(255,119,0,.035);
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }

        .audio-trimmer-help span {
          color: #ff8730;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .08em;
        }

        .audio-trimmer-help p {
          margin: 0;
          color: rgba(255,255,255,.4);
          font-size: 10px;
          line-height: 1.5;
        }

        .audio-trimmer-help strong {
          color: rgba(255,255,255,.65);
        }

        .audio-trimmer-progress {
          margin-top: 18px;
          padding: 18px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 18px;
          background: rgba(255,255,255,.025);
        }

        .audio-trimmer-progress-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 13px;
        }

        .audio-trimmer-progress-top strong {
          color: #ff8730;
        }

        .audio-trimmer-progress-track {
          width: 100%;
          height: 7px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,.08);
        }

        .audio-trimmer-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: #ff7b20;
          transition: width .18s ease;
        }

        .audio-trimmer-progress .audio-trimmer-secondary {
          margin-top: 12px;
        }

        .audio-trimmer-error {
          margin-top: 18px;
          padding: 13px 15px;
          border: 1px solid rgba(255,75,75,.2);
          border-radius: 14px;
          background: rgba(255,75,75,.05);
          color: rgba(255,180,180,.9);
          font-size: 13px;
        }

        .audio-trimmer-success {
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

        .audio-trimmer-success-player audio {
          display: block;
          width: 100%;
        }

        .audio-trimmer-success-info {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .audio-trimmer-success-info span {
          color: rgba(155,255,190,.75);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .08em;
        }

        .audio-trimmer-success-info strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .audio-trimmer-success-info small {
          color: rgba(255,255,255,.38);
          font-size: 11px;
        }

        .audio-trimmer-primary,
        .audio-trimmer-secondary,
        .audio-trimmer-download {
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

        .audio-trimmer-primary,
        .audio-trimmer-download {
          background: #ff7b20;
          color: #120c08;
        }

        .audio-trimmer-primary:hover,
        .audio-trimmer-download:hover {
          transform: translateY(-1px);
          background: #ff8a36;
        }

        .audio-trimmer-secondary {
          border-color: rgba(255,255,255,.09);
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.78);
        }

        .audio-trimmer-secondary:hover {
          border-color: rgba(255,255,255,.18);
          background: rgba(255,255,255,.05);
        }

        .audio-trimmer-secondary:disabled,
        .audio-trimmer-primary:disabled {
          opacity: .45;
          cursor: not-allowed;
          transform: none;
        }

        .audio-trimmer-actions {
          margin-top: 18px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        @media (max-width: 1000px) {
          .audio-trimmer-workspace {
            grid-template-columns: 1fr;
          }

          .audio-trimmer-success {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .audio-trimmer-tool {
            padding: 22px 18px 30px;
          }

          .audio-trimmer-header {
            flex-direction: column;
          }

          .audio-trimmer-preview {
            min-height: 240px;
          }

          .audio-trimmer-file-info {
            align-items: flex-start;
            flex-direction: column;
          }

          .audio-trimmer-format-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .audio-trimmer-time-grid,
          .audio-trimmer-summary {
            grid-template-columns: 1fr;
          }

          .audio-trimmer-time-arrow {
            display: none;
          }

          .audio-trimmer-actions {
            justify-content: stretch;
          }

          .audio-trimmer-actions button {
            flex: 1 1 100%;
          }

          .audio-trimmer-download {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}