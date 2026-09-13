import {
  useEffect,
  useRef,
  useState,
} from "react";
import { muteVideo } from "../../services/video/muteVideo";

const OUTPUT_OPTIONS = [
  {
    value: "auto",
    label: "Auto",
    description: "Keep the original container",
  },
  {
    value: "mp4",
    label: "MP4",
    description: "Best compatibility",
  },
  {
    value: "webm",
    label: "WebM",
    description: "Web-friendly container",
  },
  {
    value: "mov",
    label: "MOV",
    description: "Editing-friendly",
  },
  {
    value: "mkv",
    label: "MKV",
    description: "Flexible container",
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

  const totalSeconds = Math.round(
    seconds
  );

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

export default function MuteVideo() {
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
      width: 0,
      height: 0,
      duration: 0,
    });

  const [container, setContainer] =
    useState("auto");

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

      resultUrlRef.current = null;
    }

    setResult(null);
  };

  const loadFile = (selectedFile) => {
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

    if (previewUrlRef.current) {
      URL.revokeObjectURL(
        previewUrlRef.current
      );
    }

    const url =
      URL.createObjectURL(
        selectedFile
      );

    previewUrlRef.current = url;

    setFile(selectedFile);
    setPreviewUrl(url);
    setStage("ready");

    const video =
      document.createElement(
        "video"
      );

    video.preload = "metadata";

    video.onloadedmetadata = () => {
      setMetadata({
        width:
          video.videoWidth || 0,
        height:
          video.videoHeight || 0,
        duration:
          Number.isFinite(
            video.duration
          )
            ? video.duration
            : 0,
      });
    };

    video.onerror = () => {
      setMetadata({
        width: 0,
        height: 0,
        duration: 0,
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
      loadFile(selectedFile);
    }

    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);

    const droppedFile =
      event.dataTransfer.files?.[0];

    if (droppedFile) {
      loadFile(droppedFile);
    }
  };

  const handleMute = async () => {
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
      const muted =
        await muteVideo({
          file,
          container,
          signal:
            controller.signal,
          onProgress: (value) => {
            setProgress(value);
          },
        });

      resultUrlRef.current =
        muted.url;

      setResult(muted);
      setProgress(100);
      setStage("success");
    } catch (muteError) {
      if (
        muteError?.name ===
        "AbortError"
      ) {
        setStage("ready");
        setProgress(0);
        return;
      }

      console.error(muteError);

      setStage("error");

      setError(
        muteError?.message ||
          "Something went wrong while muting the video."
      );
    } finally {
      abortControllerRef.current =
        null;
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
  };

  const handleReset = () => {
    abortControllerRef.current?.abort();

    if (previewUrlRef.current) {
      URL.revokeObjectURL(
        previewUrlRef.current
      );

      previewUrlRef.current = null;
    }

    clearResult();

    setFile(null);
    setPreviewUrl(null);

    setMetadata({
      width: 0,
      height: 0,
      duration: 0,
    });

    setContainer("auto");
    setProgress(0);
    setError("");
    setStage("idle");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const selectedLabel =
    OUTPUT_OPTIONS.find(
      (option) =>
        option.value === container
    )?.label || "Auto";

  return (
    <div className="mute-video-tool">
      <div className="mute-video-header">
        <div>
          <h2>Mute Video</h2>

          <p>
            Remove the audio track from
            your video without re-encoding
            the picture.
          </p>
        </div>

        <div className="mute-video-badge">
          BROWSER · PRIVATE
        </div>
      </div>

      {!file && stage === "idle" && (
        <button
          type="button"
          className={`mute-video-dropzone ${
            dragActive
              ? "is-dragging"
              : ""
          }`}
          onClick={() =>
            inputRef.current?.click()
          }
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() =>
            setDragActive(false)
          }
          onDrop={handleDrop}
        >
          <div className="mute-video-upload-icon">
            🔇
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
          <div className="mute-video-workspace">
            <div className="mute-video-preview-card">
              <div className="mute-video-preview">
                {stage ===
                  "success" &&
                result ? (
                  <video
                    src={result.url}
                    controls
                    playsInline
                  />
                ) : (
                  <video
                    src={previewUrl}
                    controls
                    playsInline
                  />
                )}
              </div>

              <div className="mute-video-file-info">
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

                <div className="mute-video-meta">
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

            {stage !== "success" && (
              <div className="mute-video-settings">
                <div className="mute-video-setting-group">
                  <label>
                    Output container
                  </label>

                  <div className="mute-video-options">
                    {OUTPUT_OPTIONS.map(
                      (option) => (
                        <button
                          key={
                            option.value
                          }
                          type="button"
                          className={
                            container ===
                            option.value
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            setContainer(
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

                <div className="mute-video-preserve-note">
                  <div className="mute-video-note-icon">
                    ✓
                  </div>

                  <div>
                    <strong>
                      Video stays untouched
                    </strong>

                    <p>
                      KAIZEN removes only
                      the audio stream.
                      The video is copied
                      without re-encoding,
                      preserving its original
                      visual quality.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {stage === "processing" && (
            <div className="mute-video-progress">
              <div className="mute-video-progress-top">
                <span>
                  Removing audio…
                </span>

                <strong>
                  {progress}%
                </strong>
              </div>

              <div className="mute-video-progress-track">
                <div
                  className="mute-video-progress-fill"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              <button
                type="button"
                className="mute-video-secondary"
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
              <div className="mute-video-error">
                {error}
              </div>
            )}

          {stage === "success" &&
            result && (
              <div className="mute-video-success">
                <div className="mute-video-success-icon">
                  ✓
                </div>

                <div className="mute-video-success-info">
                  <span>
                    VIDEO MUTED
                  </span>

                  <strong>
                    {result.fileName}
                  </strong>

                  <small>
                    {result.format.toUpperCase()}{" "}
                    ·{" "}
                    {formatBytes(
                      result.size
                    )}
                  </small>
                </div>

                <a
                  className="mute-video-download"
                  href={result.url}
                  download={
                    result.fileName
                  }
                >
                  Download Video
                </a>
              </div>
            )}

          <div className="mute-video-actions">
            {stage === "ready" && (
              <button
                type="button"
                className="mute-video-primary"
                onClick={
                  handleMute
                }
              >
                Mute Video
              </button>
            )}

            {stage === "error" && (
              <button
                type="button"
                className="mute-video-primary"
                onClick={
                  handleMute
                }
              >
                Try Again
              </button>
            )}

            {stage === "success" && (
              <button
                type="button"
                className="mute-video-primary"
                onClick={() => {
                  clearResult();
                  setStage("ready");
                  setProgress(0);
                }}
              >
                Mute Again
              </button>
            )}

            <button
              type="button"
              className="mute-video-secondary"
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
        .mute-video-tool {
          width: 100%;
          box-sizing: border-box;
          padding: 26px 30px 38px;
          color: rgba(255,255,255,.94);
        }

        .mute-video-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 26px;
        }

        .mute-video-header h2 {
          margin: 0 0 6px;
          font-size: 26px;
          line-height: 1.15;
          letter-spacing: -.03em;
        }

        .mute-video-header p {
          margin: 0;
          color: rgba(255,255,255,.55);
          font-size: 14px;
        }

        .mute-video-badge {
          padding: 8px 11px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 999px;
          color: rgba(255,255,255,.48);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .12em;
          white-space: nowrap;
        }

        .mute-video-dropzone {
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

        .mute-video-dropzone:hover,
        .mute-video-dropzone.is-dragging {
          border-color: rgba(255,119,0,.65);
          background: rgba(255,119,0,.055);
        }

        .mute-video-dropzone:active {
          transform: scale(.995);
        }

        .mute-video-upload-icon {
          width: 48px;
          height: 48px;
          margin-bottom: 10px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: rgba(255,119,0,.12);
          color: #ff8a33;
          font-size: 20px;
        }

        .mute-video-dropzone strong {
          font-size: 16px;
        }

        .mute-video-dropzone span {
          color: rgba(255,255,255,.5);
          font-size: 13px;
        }

        .mute-video-dropzone small {
          margin-top: 8px;
          color: rgba(255,255,255,.3);
          font-size: 11px;
        }

        .mute-video-workspace {
          display: grid;
          grid-template-columns: minmax(0,1.25fr) minmax(280px,.75fr);
          gap: 18px;
        }

        .mute-video-preview-card,
        .mute-video-settings {
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 22px;
          background: rgba(255,255,255,.025);
          overflow: hidden;
        }

        .mute-video-preview {
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

        .mute-video-preview video {
          display: block;
          width: 100%;
          max-height: 430px;
          border-radius: 14px;
          background: #090909;
        }

        .mute-video-file-info {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 16px;
          border-top: 1px solid rgba(255,255,255,.07);
        }

        .mute-video-file-info > div:first-child {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .mute-video-file-info strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .mute-video-file-info span,
        .mute-video-meta {
          color: rgba(255,255,255,.4);
          font-size: 11px;
        }

        .mute-video-meta {
          text-align: right;
          white-space: nowrap;
        }

        .mute-video-settings {
          padding: 20px;
        }

        .mute-video-setting-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .mute-video-setting-group label {
          color: rgba(255,255,255,.6);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .mute-video-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .mute-video-options button {
          min-height: 70px;
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

        .mute-video-options button:hover {
          border-color: rgba(255,119,0,.35);
        }

        .mute-video-options button.active {
          border-color: rgba(255,119,0,.7);
          background: rgba(255,119,0,.08);
        }

        .mute-video-options button strong,
        .mute-video-options button span {
          display: block;
        }

        .mute-video-options button strong {
          margin-bottom: 4px;
          font-size: 13px;
        }

        .mute-video-options button span {
          color: rgba(255,255,255,.38);
          font-size: 10px;
          line-height: 1.35;
        }

        .mute-video-preserve-note {
          margin-top: 18px;
          padding: 13px;
          border: 1px solid rgba(255,119,0,.12);
          border-radius: 14px;
          background: rgba(255,119,0,.035);
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }

        .mute-video-note-icon {
          flex: 0 0 auto;
          width: 23px;
          height: 23px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          background: rgba(255,119,0,.12);
          color: #ff8730;
          font-size: 12px;
          font-weight: 800;
        }

        .mute-video-preserve-note strong {
          display: block;
          margin-bottom: 4px;
          font-size: 12px;
        }

        .mute-video-preserve-note p {
          margin: 0;
          color: rgba(255,255,255,.4);
          font-size: 11px;
          line-height: 1.5;
        }

        .mute-video-progress {
          margin-top: 18px;
          padding: 18px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 18px;
          background: rgba(255,255,255,.025);
        }

        .mute-video-progress-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 13px;
        }

        .mute-video-progress-top strong {
          color: #ff8730;
        }

        .mute-video-progress-track {
          width: 100%;
          height: 7px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,.08);
        }

        .mute-video-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: #ff7b20;
          transition: width .18s ease;
        }

        .mute-video-progress .mute-video-secondary {
          margin-top: 12px;
        }

        .mute-video-error {
          margin-top: 18px;
          padding: 13px 15px;
          border: 1px solid rgba(255,75,75,.2);
          border-radius: 14px;
          background: rgba(255,75,75,.05);
          color: rgba(255,180,180,.9);
          font-size: 13px;
        }

        .mute-video-success {
          margin-top: 18px;
          padding: 16px;
          border: 1px solid rgba(105,255,160,.18);
          border-radius: 18px;
          background: rgba(105,255,160,.045);
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .mute-video-success-icon {
          flex: 0 0 auto;
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: rgba(105,255,160,.1);
          color: #8dffb4;
          font-weight: 800;
        }

        .mute-video-success-info {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .mute-video-success-info span {
          color: rgba(155,255,190,.75);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .08em;
        }

        .mute-video-success-info strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .mute-video-success-info small {
          color: rgba(255,255,255,.38);
          font-size: 11px;
        }

        .mute-video-primary,
        .mute-video-secondary,
        .mute-video-download {
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

        .mute-video-primary,
        .mute-video-download {
          background: #ff7b20;
          color: #120c08;
        }

        .mute-video-primary:hover,
        .mute-video-download:hover {
          transform: translateY(-1px);
          background: #ff8a36;
        }

        .mute-video-secondary {
          border-color: rgba(255,255,255,.09);
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.78);
        }

        .mute-video-secondary:hover {
          border-color: rgba(255,255,255,.18);
          background: rgba(255,255,255,.05);
        }

        .mute-video-secondary:disabled,
        .mute-video-primary:disabled {
          opacity: .45;
          cursor: not-allowed;
          transform: none;
        }

        .mute-video-actions {
          margin-top: 18px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        @media (max-width: 900px) {
          .mute-video-workspace {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .mute-video-tool {
            padding: 22px 18px 30px;
          }

          .mute-video-header {
            flex-direction: column;
          }

          .mute-video-preview {
            min-height: 240px;
          }

          .mute-video-file-info {
            align-items: flex-start;
            flex-direction: column;
          }

          .mute-video-meta {
            text-align: left;
          }

          .mute-video-success {
            align-items: flex-start;
            flex-direction: column;
          }

          .mute-video-download {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .mute-video-options {
            grid-template-columns: 1fr;
          }

          .mute-video-actions {
            justify-content: stretch;
          }

          .mute-video-actions button {
            flex: 1 1 100%;
          }
        }
      `}</style>
    </div>
  );
}