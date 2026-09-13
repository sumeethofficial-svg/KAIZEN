import {
  useEffect,
  useRef,
  useState,
} from "react";
import { videoToAudio } from "../../services/audio/videoToAudio";

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
    value: "aac",
    label: "AAC",
    description: "Compact audio",
  },
  {
    value: "ogg",
    label: "OGG",
    description: "Open audio",
  },
  {
    value: "flac",
    label: "FLAC",
    description: "Lossless audio",
  },
];

const BITRATE_OPTIONS = [
  "96k",
  "128k",
  "160k",
  "192k",
  "256k",
  "320k",
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
      Math.log(bytes) / Math.log(1024)
    ),
    units.length - 1
  );

  const value =
    bytes / 1024 ** index;

  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
};

const formatDuration = (seconds) => {
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

  const remaining =
    totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(
      minutes
    ).padStart(
      2,
      "0"
    )}:${String(
      remaining
    ).padStart(
      2,
      "0"
    )}`;
  }

  return `${minutes}:${String(
    remaining
  ).padStart(
    2,
    "0"
  )}`;
};

export default function VideoToAudio() {
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

  const [metadata, setMetadata] =
    useState({
      duration: 0,
      width: 0,
      height: 0,
    });

  const [format, setFormat] =
    useState("mp3");

  const [bitrate, setBitrate] =
    useState("192k");

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

    const looksLikeVideo =
      selectedFile.type.startsWith(
        "video/"
      ) ||
      /\.(mp4|mov|mkv|webm|avi|m4v|wmv|flv|mpeg|mpg|3gp)$/i.test(
        selectedFile.name
      );

    if (!looksLikeVideo) {
      setFile(null);
      setPreviewUrl(null);
      setStage("error");
      setError(
        "Please select a video file."
      );
      return;
    }

    if (selectedFile.size <= 0) {
      setFile(null);
      setPreviewUrl(null);
      setStage("error");
      setError(
        "The selected video file is empty."
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

    const video =
      document.createElement(
        "video"
      );

    video.preload =
      "metadata";

    video.onloadedmetadata =
      () => {
        setMetadata({
          duration:
            Number.isFinite(
              video.duration
            )
              ? video.duration
              : 0,
          width:
            video.videoWidth ||
            0,
          height:
            video.videoHeight ||
            0,
        });
      };

    video.onerror = () => {
      setMetadata({
        duration: 0,
        width: 0,
        height: 0,
      });
    };

    video.src = url;
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

  const handleExtract =
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
        const extracted =
          await videoToAudio({
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
          extracted.url;

        setResult(
          extracted
        );

        setProgress(100);
        setStage("success");
      } catch (
        extractionError
      ) {
        if (
          extractionError?.name ===
          "AbortError"
        ) {
          setStage("ready");
          setProgress(0);
          return;
        }

        console.error(
          extractionError
        );

        setStage("error");

        setError(
          extractionError?.message ||
            "Something went wrong while extracting the audio."
        );
      } finally {
        abortControllerRef.current =
          null;
      }
    };

  const handleCancel =
    () => {
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

    setMetadata({
      duration: 0,
      width: 0,
      height: 0,
    });

    setFormat("mp3");
    setBitrate("192k");
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

  const isLossless =
    format === "wav" ||
    format === "flac";

  return (
    <div className="video-to-audio-tool">
      <div className="video-to-audio-header">
        <div>
          <h2>
            Video to Audio
          </h2>

          <p>
            Extract the soundtrack from a
            video and save it as a standalone
            audio file.
          </p>
        </div>

        <div className="video-to-audio-badge">
          BROWSER · PRIVATE
        </div>
      </div>

      {!file &&
        stage === "idle" && (
          <button
            type="button"
            className={`video-to-audio-dropzone ${
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
            <div className="video-to-audio-upload-icon">
              ♪
            </div>

            <strong>
              Drop your video here
            </strong>

            <span>
              or click to choose a video
              from your computer
            </span>

            <small>
              MP4, MOV, WebM, MKV and more
            </small>

            <input
              ref={inputRef}
              type="file"
              accept="video/*,.mkv,.avi,.m4v,.wmv,.flv,.mpeg,.mpg,.3gp"
              onChange={
                handleInputChange
              }
              hidden
            />
          </button>
        )}

      {file && (
        <>
          <div className="video-to-audio-workspace">
            <div className="video-to-audio-preview-card">
              <div className="video-to-audio-preview">
                <video
                  src={previewUrl}
                  controls
                  playsInline
                />
              </div>

              <div className="video-to-audio-file-info">
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

                <div className="video-to-audio-meta">
                  {metadata.width > 0 &&
                    `${metadata.width} × ${metadata.height}`}

                  {metadata.duration >
                    0 &&
                    ` · ${formatDuration(
                      metadata.duration
                    )}`}
                </div>
              </div>
            </div>

            {stage !==
              "success" && (
              <div className="video-to-audio-settings">
                <div className="video-to-audio-setting-group">
                  <label>
                    Audio format
                  </label>

                  <div className="video-to-audio-format-grid">
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

                {!isLossless && (
                  <div className="video-to-audio-setting-group video-to-audio-bitrate-group">
                    <label>
                      Bitrate
                    </label>

                    <select
                      value={
                        bitrate
                      }
                      onChange={(
                        event
                      ) =>
                        setBitrate(
                          event.target
                            .value
                        )
                      }
                      disabled={
                        stage ===
                        "processing"
                      }
                    >
                      {BITRATE_OPTIONS.map(
                        (value) => (
                          <option
                            key={
                              value
                            }
                            value={
                              value
                            }
                          >
                            {value}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                )}

                <div className="video-to-audio-summary">
                  <div>
                    <span>
                      Source
                    </span>

                    <strong>
                      Video
                    </strong>
                  </div>

                  <div>
                    <span>
                      Duration
                    </span>

                    <strong>
                      {formatDuration(
                        metadata.duration
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Output
                    </span>

                    <strong>
                      {
                        selectedFormat?.label
                      }
                    </strong>
                  </div>
                </div>

                <div className="video-to-audio-note">
                  <span>
                    ⓘ
                  </span>

                  <p>
                    {isLossless
                      ? "The selected format keeps lossless audio quality."
                      : `The audio track will be encoded at ${bitrate}.`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {stage ===
            "processing" && (
            <div className="video-to-audio-progress">
              <div className="video-to-audio-progress-top">
                <span>
                  Extracting audio…
                </span>

                <strong>
                  {progress}%
                </strong>
              </div>

              <div className="video-to-audio-progress-track">
                <div
                  className="video-to-audio-progress-fill"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              <button
                type="button"
                className="video-to-audio-secondary"
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
              <div className="video-to-audio-error">
                {error}
              </div>
            )}

          {stage ===
            "success" &&
            result && (
              <div className="video-to-audio-success">
                <div className="video-to-audio-success-player">
                  <audio
                    src={
                      result.url
                    }
                    controls
                  />
                </div>

                <div className="video-to-audio-success-info">
                  <span>
                    EXTRACTION COMPLETE
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

                <a
                  className="video-to-audio-download"
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

          <div className="video-to-audio-actions">
            {stage ===
              "ready" && (
              <button
                type="button"
                className="video-to-audio-primary"
                onClick={
                  handleExtract
                }
              >
                Extract as{" "}
                {
                  selectedFormat?.label
                }
              </button>
            )}

            {stage ===
              "error" && (
              <button
                type="button"
                className="video-to-audio-primary"
                onClick={
                  handleExtract
                }
              >
                Try Again
              </button>
            )}

            {stage ===
              "success" && (
              <button
                type="button"
                className="video-to-audio-primary"
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
                Extract Again
              </button>
            )}

            <button
              type="button"
              className="video-to-audio-secondary"
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
        .video-to-audio-tool {
          width: 100%;
          box-sizing: border-box;
          padding: 26px 30px 38px;
          color: rgba(255,255,255,.94);
        }

        .video-to-audio-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 26px;
        }

        .video-to-audio-header h2 {
          margin: 0 0 6px;
          font-size: 26px;
          line-height: 1.15;
          letter-spacing: -.03em;
        }

        .video-to-audio-header p {
          margin: 0;
          color: rgba(255,255,255,.55);
          font-size: 14px;
        }

        .video-to-audio-badge {
          padding: 8px 11px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 999px;
          color: rgba(255,255,255,.48);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .12em;
          white-space: nowrap;
        }

        .video-to-audio-dropzone {
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

        .video-to-audio-dropzone:hover,
        .video-to-audio-dropzone.is-dragging {
          border-color: rgba(255,119,0,.65);
          background: rgba(255,119,0,.055);
        }

        .video-to-audio-dropzone:active {
          transform: scale(.995);
        }

        .video-to-audio-upload-icon {
          width: 48px;
          height: 48px;
          margin-bottom: 10px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: rgba(255,119,0,.12);
          color: #ff8a33;
          font-size: 23px;
          font-weight: 700;
        }

        .video-to-audio-dropzone strong {
          font-size: 16px;
        }

        .video-to-audio-dropzone span {
          color: rgba(255,255,255,.5);
          font-size: 13px;
        }

        .video-to-audio-dropzone small {
          margin-top: 8px;
          color: rgba(255,255,255,.3);
          font-size: 11px;
        }

        .video-to-audio-workspace {
          display: grid;
          grid-template-columns: minmax(0,1.2fr) minmax(290px,.8fr);
          gap: 18px;
        }

        .video-to-audio-preview-card,
        .video-to-audio-settings {
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 22px;
          background: rgba(255,255,255,.025);
          overflow: hidden;
        }

        .video-to-audio-preview {
          min-height: 320px;
          padding: 18px;
          display: grid;
          place-items: center;
          background:
            linear-gradient(
              135deg,
              rgba(255,255,255,.025),
              rgba(255,255,255,.01)
            );
        }

        .video-to-audio-preview video {
          display: block;
          width: 100%;
          max-height: 430px;
          border-radius: 14px;
          background: #090909;
        }

        .video-to-audio-file-info {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 16px;
          border-top: 1px solid rgba(255,255,255,.07);
        }

        .video-to-audio-file-info > div:first-child {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .video-to-audio-file-info strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .video-to-audio-file-info span,
        .video-to-audio-meta {
          color: rgba(255,255,255,.4);
          font-size: 11px;
        }

        .video-to-audio-meta {
          text-align: right;
          white-space: nowrap;
        }

        .video-to-audio-settings {
          padding: 20px;
        }

        .video-to-audio-setting-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .video-to-audio-setting-group label {
          color: rgba(255,255,255,.6);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .video-to-audio-format-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .video-to-audio-format-grid button {
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

        .video-to-audio-format-grid button:hover {
          border-color: rgba(255,119,0,.35);
        }

        .video-to-audio-format-grid button.active {
          border-color: rgba(255,119,0,.7);
          background: rgba(255,119,0,.08);
        }

        .video-to-audio-format-grid button strong,
        .video-to-audio-format-grid button span {
          display: block;
        }

        .video-to-audio-format-grid button strong {
          margin-bottom: 4px;
          font-size: 13px;
        }

        .video-to-audio-format-grid button span {
          color: rgba(255,255,255,.38);
          font-size: 10px;
          line-height: 1.35;
        }

        .video-to-audio-bitrate-group {
          margin-top: 20px;
        }

        .video-to-audio-bitrate-group select {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 11px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 12px;
          background: #17120f;
          color: white;
          outline: none;
        }

        .video-to-audio-summary {
          margin-top: 20px;
          padding: 13px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 14px;
          background: rgba(255,255,255,.02);
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
        }

        .video-to-audio-summary div {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .video-to-audio-summary span {
          color: rgba(255,255,255,.35);
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: .07em;
        }

        .video-to-audio-summary strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
        }

        .video-to-audio-note {
          margin-top: 18px;
          padding: 12px;
          border: 1px solid rgba(255,119,0,.12);
          border-radius: 14px;
          background: rgba(255,119,0,.035);
          display: flex;
          align-items: flex-start;
          gap: 9px;
        }

        .video-to-audio-note span {
          color: #ff8730;
          font-size: 12px;
        }

        .video-to-audio-note p {
          margin: 0;
          color: rgba(255,255,255,.4);
          font-size: 10px;
          line-height: 1.5;
        }

        .video-to-audio-progress {
          margin-top: 18px;
          padding: 18px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 18px;
          background: rgba(255,255,255,.025);
        }

        .video-to-audio-progress-top {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 13px;
        }

        .video-to-audio-progress-top strong {
          color: #ff8730;
        }

        .video-to-audio-progress-track {
          width: 100%;
          height: 7px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,.08);
        }

        .video-to-audio-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: #ff7b20;
          transition: width .18s ease;
        }

        .video-to-audio-progress .video-to-audio-secondary {
          margin-top: 12px;
        }

        .video-to-audio-error {
          margin-top: 18px;
          padding: 13px 15px;
          border: 1px solid rgba(255,75,75,.2);
          border-radius: 14px;
          background: rgba(255,75,75,.05);
          color: rgba(255,180,180,.9);
          font-size: 13px;
        }

        .video-to-audio-success {
          margin-top: 18px;
          padding: 16px;
          border: 1px solid rgba(105,255,160,.18);
          border-radius: 18px;
          background: rgba(105,255,160,.045);
          display: grid;
          grid-template-columns: minmax(220px,1fr) minmax(180px,.8fr) auto;
          align-items: center;
          gap: 16px;
        }

        .video-to-audio-success-player audio {
          display: block;
          width: 100%;
        }

        .video-to-audio-success-info {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .video-to-audio-success-info span {
          color: rgba(155,255,190,.75);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .08em;
        }

        .video-to-audio-success-info strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .video-to-audio-success-info small {
          color: rgba(255,255,255,.38);
          font-size: 11px;
        }

        .video-to-audio-primary,
        .video-to-audio-secondary,
        .video-to-audio-download {
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

        .video-to-audio-primary,
        .video-to-audio-download {
          background: #ff7b20;
          color: #120c08;
        }

        .video-to-audio-primary:hover,
        .video-to-audio-download:hover {
          transform: translateY(-1px);
          background: #ff8a36;
        }

        .video-to-audio-secondary {
          border-color: rgba(255,255,255,.09);
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.78);
        }

        .video-to-audio-secondary:hover {
          border-color: rgba(255,255,255,.18);
          background: rgba(255,255,255,.05);
        }

        .video-to-audio-secondary:disabled,
        .video-to-audio-primary:disabled {
          opacity: .45;
          cursor: not-allowed;
          transform: none;
        }

        .video-to-audio-actions {
          margin-top: 18px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        @media (max-width: 950px) {
          .video-to-audio-workspace {
            grid-template-columns: 1fr;
          }

          .video-to-audio-success {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .video-to-audio-tool {
            padding: 22px 18px 30px;
          }

          .video-to-audio-header {
            flex-direction: column;
          }

          .video-to-audio-file-info {
            align-items: flex-start;
            flex-direction: column;
          }

          .video-to-audio-meta {
            text-align: left;
          }

          .video-to-audio-format-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .video-to-audio-summary {
            grid-template-columns: 1fr;
          }

          .video-to-audio-actions {
            justify-content: stretch;
          }

          .video-to-audio-actions button {
            flex: 1 1 100%;
          }

          .video-to-audio-download {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}