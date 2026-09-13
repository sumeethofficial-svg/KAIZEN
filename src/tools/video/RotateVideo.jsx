import {
  useEffect,
  useRef,
  useState,
} from "react";
import { rotateVideo } from "../../services/video/rotateVideo";

const TRANSFORM_OPTIONS = [
  {
    value: "rotate90",
    label: "Rotate 90°",
    description: "Clockwise",
    previewClass: "rotate-90",
  },
  {
    value: "rotate180",
    label: "Rotate 180°",
    description: "Upside down",
    previewClass: "rotate-180",
  },
  {
    value: "rotate270",
    label: "Rotate 270°",
    description: "Counter-clockwise",
    previewClass: "rotate-270",
  },
  {
    value: "flipHorizontal",
    label: "Flip Horizontal",
    description: "Mirror left ↔ right",
    previewClass: "flip-horizontal",
  },
  {
    value: "flipVertical",
    label: "Flip Vertical",
    description: "Mirror top ↕ bottom",
    previewClass: "flip-vertical",
  },
];

const FORMAT_OPTIONS = [
  {
    value: "mp4",
    label: "MP4",
    description: "Best compatibility",
  },
  {
    value: "webm",
    label: "WebM",
    description: "Web-friendly",
  },
  {
    value: "mov",
    label: "MOV",
    description: "Editing-friendly",
  },
];

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
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

  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${
    units[index]
  }`;
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

  const remainingSeconds =
    totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(
      minutes
    ).padStart(
      2,
      "0"
    )}:${String(
      remainingSeconds
    ).padStart(
      2,
      "0"
    )}`;
  }

  return `${minutes}:${String(
    remainingSeconds
  ).padStart(
    2,
    "0"
  )}`;
};

export default function RotateVideo() {
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
      width: 0,
      height: 0,
      duration: 0,
    });

  const [transform, setTransform] =
    useState("rotate90");

  const [format, setFormat] =
    useState("mp4");

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

    const video =
      document.createElement(
        "video"
      );

    video.preload = "metadata";

    video.onloadedmetadata =
      () => {
        setMetadata({
          width:
            video.videoWidth ||
            0,
          height:
            video.videoHeight ||
            0,
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

  const handleTransform =
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
        const processed =
          await rotateVideo({
            file,
            transform,
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
          processed.url;

        setResult(
          processed
        );

        setProgress(100);
        setStage("success");
      } catch (
        transformError
      ) {
        if (
          transformError?.name ===
          "AbortError"
        ) {
          setStage("ready");
          setProgress(0);
          return;
        }

        console.error(
          transformError
        );

        setStage("error");

        setError(
          transformError?.message ||
            "Something went wrong while transforming the video."
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

      previewUrlRef.current =
        null;
    }

    clearResult();

    setFile(null);
    setPreviewUrl(null);

    setMetadata({
      width: 0,
      height: 0,
      duration: 0,
    });

    setTransform(
      "rotate90"
    );

    setFormat("mp4");

    setProgress(0);
    setError("");
    setStage("idle");

    if (inputRef.current) {
      inputRef.current.value =
        "";
    }
  };

  const selectedTransform =
    TRANSFORM_OPTIONS.find(
      (option) =>
        option.value ===
        transform
    );

  const selectedFormat =
    FORMAT_OPTIONS.find(
      (option) =>
        option.value ===
        format
    );

  const previewClass =
    selectedTransform
      ?.previewClass || "";

  return (
    <div className="rotate-video-tool">
      <div className="rotate-video-header">
        <div>
          <h2>
            Rotate / Flip Video
          </h2>

          <p>
            Change the orientation of
            your video while keeping
            its audio synchronized.
          </p>
        </div>

        <div className="rotate-video-badge">
          BROWSER · PRIVATE
        </div>
      </div>

      {!file &&
        stage === "idle" && (
          <button
            type="button"
            className={`rotate-video-dropzone ${
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
            <div className="rotate-video-upload-icon">
              ⟳
            </div>

            <strong>
              Drop your video here
            </strong>

            <span>
              or click to choose
              a video from your
              computer
            </span>

            <small>
              MP4, MOV, WebM, MKV
              and more
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
          <div className="rotate-video-workspace">
            <div className="rotate-video-preview-card">
              <div className="rotate-video-preview">
                <video
                  key={previewClass}
                  src={
                    stage ===
                      "success" &&
                    result
                      ? result.url
                      : previewUrl
                  }
                  className={
                    stage ===
                      "success"
                      ? ""
                      : previewClass
                  }
                  controls
                  playsInline
                />
              </div>

              <div className="rotate-video-file-info">
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

                <div className="rotate-video-meta">
                  {metadata.width >
                    0 &&
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
              <div className="rotate-video-settings">
                <div className="rotate-video-setting-group">
                  <label>
                    Transformation
                  </label>

                  <div className="rotate-video-options">
                    {TRANSFORM_OPTIONS.map(
                      (
                        option
                      ) => (
                        <button
                          key={
                            option.value
                          }
                          type="button"
                          className={
                            transform ===
                            option.value
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            setTransform(
                              option.value
                            )
                          }
                          disabled={
                            stage ===
                            "processing"
                          }
                        >
                          <div className="rotate-video-option-icon">
                            {option.value.includes(
                              "rotate"
                            )
                              ? "↻"
                              : "⇆"}
                          </div>

                          <div>
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
                          </div>
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="rotate-video-format-group">
                  <label>
                    Output format
                  </label>

                  <div className="rotate-video-format-options">
                    {FORMAT_OPTIONS.map(
                      (
                        option
                      ) => (
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

                <div className="rotate-video-preview-note">
                  <span>
                    LIVE PREVIEW
                  </span>

                  <p>
                    The preview reflects the
                    selected transformation.
                    The actual file is rendered
                    when you apply the change.
                  </p>
                </div>
              </div>
            )}
          </div>

          {stage ===
            "processing" && (
            <div className="rotate-video-progress">
              <div className="rotate-video-progress-top">
                <span>
                  Applying{" "}
                  {
                    selectedTransform?.label
                  }
                  …
                </span>

                <strong>
                  {progress}%
                </strong>
              </div>

              <div className="rotate-video-progress-track">
                <div
                  className="rotate-video-progress-fill"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              <button
                type="button"
                className="rotate-video-secondary"
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
              <div className="rotate-video-error">
                {error}
              </div>
            )}

          {stage ===
            "success" &&
            result && (
              <div className="rotate-video-success">
                <div className="rotate-video-success-icon">
                  ✓
                </div>

                <div className="rotate-video-success-info">
                  <span>
                    TRANSFORMATION COMPLETE
                  </span>

                  <strong>
                    {
                      result.fileName
                    }
                  </strong>

                  <small>
                    {
                      selectedTransform?.label
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
                  className="rotate-video-download"
                  href={
                    result.url
                  }
                  download={
                    result.fileName
                  }
                >
                  Download Video
                </a>
              </div>
            )}

          <div className="rotate-video-actions">
            {stage === "ready" && (
              <button
                type="button"
                className="rotate-video-primary"
                onClick={
                  handleTransform
                }
              >
                {
                  selectedTransform?.label
                }
              </button>
            )}

            {stage === "error" && (
              <button
                type="button"
                className="rotate-video-primary"
                onClick={
                  handleTransform
                }
              >
                Try Again
              </button>
            )}

            {stage ===
              "success" && (
              <button
                type="button"
                className="rotate-video-primary"
                onClick={() => {
                  clearResult();
                  setStage(
                    "ready"
                  );
                  setProgress(0);
                }}
              >
                Transform Again
              </button>
            )}

            <button
              type="button"
              className="rotate-video-secondary"
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
        .rotate-video-tool {
          width: 100%;
          box-sizing: border-box;
          padding: 26px 30px 38px;
          color: rgba(255,255,255,.94);
        }

        .rotate-video-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 26px;
        }

        .rotate-video-header h2 {
          margin: 0 0 6px;
          font-size: 26px;
          line-height: 1.15;
          letter-spacing: -.03em;
        }

        .rotate-video-header p {
          margin: 0;
          color: rgba(255,255,255,.55);
          font-size: 14px;
        }

        .rotate-video-badge {
          padding: 8px 11px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 999px;
          color: rgba(255,255,255,.48);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .12em;
          white-space: nowrap;
        }

        .rotate-video-dropzone {
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

        .rotate-video-dropzone:hover,
        .rotate-video-dropzone.is-dragging {
          border-color: rgba(255,119,0,.65);
          background: rgba(255,119,0,.055);
        }

        .rotate-video-dropzone:active {
          transform: scale(.995);
        }

        .rotate-video-upload-icon {
          width: 48px;
          height: 48px;
          margin-bottom: 10px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: rgba(255,119,0,.12);
          color: #ff8a33;
          font-size: 25px;
          font-weight: 800;
        }

        .rotate-video-dropzone strong {
          font-size: 16px;
        }

        .rotate-video-dropzone span {
          color: rgba(255,255,255,.5);
          font-size: 13px;
        }

        .rotate-video-dropzone small {
          margin-top: 8px;
          color: rgba(255,255,255,.3);
          font-size: 11px;
        }

        .rotate-video-workspace {
          display: grid;
          grid-template-columns: minmax(0,1.25fr) minmax(290px,.75fr);
          gap: 18px;
        }

        .rotate-video-preview-card,
        .rotate-video-settings {
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 22px;
          background: rgba(255,255,255,.025);
          overflow: hidden;
        }

        .rotate-video-preview {
          min-height: 320px;
          padding: 18px;
          display: grid;
          place-items: center;
          overflow: hidden;
          background:
            linear-gradient(
              135deg,
              rgba(255,255,255,.025),
              rgba(255,255,255,.01)
            );
        }

        .rotate-video-preview video {
          display: block;
          width: min(100%, 700px);
          max-height: 430px;
          object-fit: contain;
          border-radius: 14px;
          background: #090909;
          transition:
            transform .3s ease;
        }

        .rotate-video-preview video.rotate-90 {
          transform: rotate(90deg);
          width: min(72%, 500px);
        }

        .rotate-video-preview video.rotate-180 {
          transform: rotate(180deg);
        }

        .rotate-video-preview video.rotate-270 {
          transform: rotate(-90deg);
          width: min(72%, 500px);
        }

        .rotate-video-preview video.flip-horizontal {
          transform: scaleX(-1);
        }

        .rotate-video-preview video.flip-vertical {
          transform: scaleY(-1);
        }

        .rotate-video-file-info {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 16px;
          border-top: 1px solid rgba(255,255,255,.07);
        }

        .rotate-video-file-info > div:first-child {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .rotate-video-file-info strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .rotate-video-file-info span,
        .rotate-video-meta {
          color: rgba(255,255,255,.4);
          font-size: 11px;
        }

        .rotate-video-meta {
          text-align: right;
          white-space: nowrap;
        }

        .rotate-video-settings {
          padding: 20px;
        }

        .rotate-video-setting-group,
        .rotate-video-format-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .rotate-video-setting-group label,
        .rotate-video-format-group label {
          color: rgba(255,255,255,.6);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .rotate-video-options {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .rotate-video-options button {
          min-height: 66px;
          padding: 10px 12px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 13px;
          background: rgba(255,255,255,.025);
          color: inherit;
          text-align: left;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 11px;
          transition:
            border-color .18s ease,
            background .18s ease;
        }

        .rotate-video-options button:hover {
          border-color: rgba(255,119,0,.35);
        }

        .rotate-video-options button.active {
          border-color: rgba(255,119,0,.7);
          background: rgba(255,119,0,.08);
        }

        .rotate-video-option-icon {
          flex: 0 0 auto;
          width: 32px;
          height: 32px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: rgba(255,119,0,.1);
          color: #ff8730;
          font-size: 18px;
          font-weight: 700;
        }

        .rotate-video-options button strong,
        .rotate-video-options button span {
          display: block;
        }

        .rotate-video-options button strong {
          margin-bottom: 3px;
          font-size: 13px;
        }

        .rotate-video-options button span {
          color: rgba(255,255,255,.38);
          font-size: 10px;
        }

        .rotate-video-format-group {
          margin-top: 20px;
        }

        .rotate-video-format-options {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
        }

        .rotate-video-format-options button {
          min-height: 62px;
          padding: 10px;
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

        .rotate-video-format-options button:hover {
          border-color: rgba(255,119,0,.35);
        }

        .rotate-video-format-options button.active {
          border-color: rgba(255,119,0,.7);
          background: rgba(255,119,0,.08);
        }

        .rotate-video-format-options button strong,
        .rotate-video-format-options button span {
          display: block;
        }

        .rotate-video-format-options button strong {
          margin-bottom: 3px;
          font-size: 12px;
        }

        .rotate-video-format-options button span {
          color: rgba(255,255,255,.38);
          font-size: 9px;
          line-height: 1.35;
        }

        .rotate-video-preview-note {
          margin-top: 18px;
          padding: 12px;
          border: 1px solid rgba(255,119,0,.12);
          border-radius: 14px;
          background: rgba(255,119,0,.035);
        }

        .rotate-video-preview-note span {
          display: block;
          margin-bottom: 5px;
          color: #ff8730;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .1em;
        }

        .rotate-video-preview-note p {
          margin: 0;
          color: rgba(255,255,255,.4);
          font-size: 11px;
          line-height: 1.5;
        }

        .rotate-video-progress {
          margin-top: 18px;
          padding: 18px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 18px;
          background: rgba(255,255,255,.025);
        }

        .rotate-video-progress-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 13px;
        }

        .rotate-video-progress-top strong {
          color: #ff8730;
        }

        .rotate-video-progress-track {
          width: 100%;
          height: 7px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,.08);
        }

        .rotate-video-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: #ff7b20;
          transition: width .18s ease;
        }

        .rotate-video-progress .rotate-video-secondary {
          margin-top: 12px;
        }

        .rotate-video-error {
          margin-top: 18px;
          padding: 13px 15px;
          border: 1px solid rgba(255,75,75,.2);
          border-radius: 14px;
          background: rgba(255,75,75,.05);
          color: rgba(255,180,180,.9);
          font-size: 13px;
        }

        .rotate-video-success {
          margin-top: 18px;
          padding: 16px;
          border: 1px solid rgba(105,255,160,.18);
          border-radius: 18px;
          background: rgba(105,255,160,.045);
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .rotate-video-success-icon {
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

        .rotate-video-success-info {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .rotate-video-success-info span {
          color: rgba(155,255,190,.75);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .08em;
        }

        .rotate-video-success-info strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .rotate-video-success-info small {
          color: rgba(255,255,255,.38);
          font-size: 11px;
        }

        .rotate-video-primary,
        .rotate-video-secondary,
        .rotate-video-download {
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

        .rotate-video-primary,
        .rotate-video-download {
          background: #ff7b20;
          color: #120c08;
        }

        .rotate-video-primary:hover,
        .rotate-video-download:hover {
          transform: translateY(-1px);
          background: #ff8a36;
        }

        .rotate-video-secondary {
          border-color: rgba(255,255,255,.09);
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.78);
        }

        .rotate-video-secondary:hover {
          border-color: rgba(255,255,255,.18);
          background: rgba(255,255,255,.05);
        }

        .rotate-video-secondary:disabled,
        .rotate-video-primary:disabled {
          opacity: .45;
          cursor: not-allowed;
          transform: none;
        }

        .rotate-video-actions {
          margin-top: 18px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        @media (max-width: 920px) {
          .rotate-video-workspace {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .rotate-video-tool {
            padding: 22px 18px 30px;
          }

          .rotate-video-header {
            flex-direction: column;
          }

          .rotate-video-preview {
            min-height: 240px;
          }

          .rotate-video-file-info {
            align-items: flex-start;
            flex-direction: column;
          }

          .rotate-video-meta {
            text-align: left;
          }

          .rotate-video-format-options {
            grid-template-columns: 1fr;
          }

          .rotate-video-success {
            align-items: flex-start;
            flex-direction: column;
          }

          .rotate-video-download {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .rotate-video-actions {
            justify-content: stretch;
          }

          .rotate-video-actions button {
            flex: 1 1 100%;
          }
        }
      `}</style>
    </div>
  );
}