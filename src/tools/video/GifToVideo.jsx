import {
  useEffect,
  useRef,
  useState,
} from "react";
import { gifToVideo } from "../../services/video/gifToVideo";

const OUTPUT_OPTIONS = [
  {
    value: "mp4",
    label: "MP4",
    description: "Best compatibility",
  },
  {
    value: "webm",
    label: "WebM",
    description: "Smaller web-friendly output",
  },
  {
    value: "mov",
    label: "MOV",
    description: "Editing-friendly format",
  },
];

const WIDTH_OPTIONS = [
  {
    value: "original",
    label: "Original",
  },
  {
    value: "640",
    label: "640 px",
  },
  {
    value: "854",
    label: "854 px",
  },
  {
    value: "1280",
    label: "1280 px",
  },
];

const FPS_OPTIONS = [12, 15, 20, 24, 30, 60];

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );

  const value = bytes / 1024 ** index;

  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${
    units[index]
  }`;
};

const getVideoMetadata = (url) =>
  new Promise((resolve) => {
    const video = document.createElement("video");

    video.preload = "metadata";
    video.muted = true;

    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
        duration: Number.isFinite(video.duration)
          ? video.duration
          : 0,
      });

      URL.revokeObjectURL(url);
    };

    video.onerror = () => {
      resolve({
        width: 0,
        height: 0,
        duration: 0,
      });

      URL.revokeObjectURL(url);
    };

    video.src = url;
  });

export default function GifToVideo() {
  const inputRef = useRef(null);
  const resultUrlRef = useRef(null);
  const previewUrlRef = useRef(null);
  const abortControllerRef = useRef(null);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [metadata, setMetadata] = useState({
    width: 0,
    height: 0,
    duration: 0,
  });

  const [format, setFormat] = useState("mp4");
  const [fps, setFps] = useState(24);
  const [width, setWidth] = useState("original");

  const [dragActive, setDragActive] = useState(false);
  const [stage, setStage] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      if (resultUrlRef.current) {
        URL.revokeObjectURL(resultUrlRef.current);
      }

      abortControllerRef.current?.abort();
    };
  }, []);

  const clearResult = () => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }

    setResult(null);
  };

  const loadFile = async (selectedFile) => {
    if (!selectedFile) {
      return;
    }

    clearResult();
    setError("");
    setProgress(0);

    const isGif =
      selectedFile.type === "image/gif" ||
      selectedFile.name.toLowerCase().endsWith(".gif");

    if (!isGif) {
      setFile(null);
      setPreviewUrl(null);
      setStage("error");
      setError("Please select a GIF file.");
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const url = URL.createObjectURL(selectedFile);

    previewUrlRef.current = url;

    setFile(selectedFile);
    setPreviewUrl(url);
    setStage("ready");

    const preview = document.createElement("img");

    preview.onload = async () => {
      const metadataUrl = URL.createObjectURL(selectedFile);

      const videoMetadata = await getVideoMetadata(metadataUrl);

      setMetadata({
        width: preview.naturalWidth || videoMetadata.width || 0,
        height:
          preview.naturalHeight || videoMetadata.height || 0,
        duration: videoMetadata.duration || 0,
      });

      URL.revokeObjectURL(metadataUrl);
    };

    preview.src = url;
  };

  const handleInputChange = (event) => {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      loadFile(selectedFile);
    }

    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);

    const droppedFile = event.dataTransfer.files?.[0];

    if (droppedFile) {
      loadFile(droppedFile);
    }
  };

  const handleConvert = async () => {
    if (!file) {
      return;
    }

    setError("");
    setProgress(0);
    setStage("processing");

    const controller = new AbortController();

    abortControllerRef.current = controller;

    try {
      const converted = await gifToVideo({
        file,
        format,
        fps,
        width,
        signal: controller.signal,
        onProgress: (value) => {
          setProgress(value);
        },
      });

      resultUrlRef.current = converted.url;

      setResult(converted);
      setStage("success");
      setProgress(100);
    } catch (conversionError) {
      if (conversionError?.name === "AbortError") {
        setStage("ready");
        setProgress(0);
        return;
      }

      console.error(conversionError);

      setStage("error");
      setError(
        conversionError?.message ||
          "Something went wrong while converting the GIF."
      );
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
  };

  const handleReset = () => {
    abortControllerRef.current?.abort();

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
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
    setProgress(0);
    setError("");
    setStage("idle");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const outputLabel =
    OUTPUT_OPTIONS.find((option) => option.value === format)
      ?.label || "MP4";

  return (
    <div className="gif-to-video-tool">
      <div className="gif-to-video-header">
        <div>
          <h2>GIF to Video</h2>
          <p>
            Convert animated GIFs into clean, editable video files.
          </p>
        </div>

        <div className="gif-to-video-badge">
          BROWSER · PRIVATE
        </div>
      </div>

      {!file && stage === "idle" && (
        <button
          type="button"
          className={`gif-to-video-dropzone ${
            dragActive ? "is-dragging" : ""
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <div className="gif-to-video-upload-icon">
            ↑
          </div>

          <strong>Drop your GIF here</strong>

          <span>
            or click to choose a GIF from your computer
          </span>

          <small>Animated GIF only</small>

          <input
            ref={inputRef}
            type="file"
            accept="image/gif,.gif"
            onChange={handleInputChange}
            hidden
          />
        </button>
      )}

      {file && (
        <>
          <div className="gif-to-video-workspace">
            <div className="gif-to-video-preview-card">
              <div className="gif-to-video-preview">
                {stage === "success" && result ? (
                  <video
                    src={result.url}
                    controls
                    playsInline
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="GIF preview"
                  />
                )}
              </div>

              <div className="gif-to-video-file-info">
                <div>
                  <strong>{file.name}</strong>
                  <span>{formatBytes(file.size)}</span>
                </div>

                {metadata.width > 0 && (
                  <span>
                    {metadata.width} × {metadata.height}
                  </span>
                )}
              </div>
            </div>

            {stage !== "success" && (
              <div className="gif-to-video-settings">
                <div className="gif-to-video-setting-group">
                  <label>Output format</label>

                  <div className="gif-to-video-option-grid">
                    {OUTPUT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={
                          format === option.value
                            ? "active"
                            : ""
                        }
                        onClick={() => setFormat(option.value)}
                        disabled={stage === "processing"}
                      >
                        <strong>{option.label}</strong>
                        <span>{option.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="gif-to-video-setting-row">
                  <div className="gif-to-video-setting-group">
                    <label htmlFor="gif-fps">
                      Frame rate
                    </label>

                    <select
                      id="gif-fps"
                      value={fps}
                      onChange={(event) =>
                        setFps(Number(event.target.value))
                      }
                      disabled={stage === "processing"}
                    >
                      {FPS_OPTIONS.map((value) => (
                        <option key={value} value={value}>
                          {value} FPS
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="gif-to-video-setting-group">
                    <label htmlFor="gif-width">
                      Output width
                    </label>

                    <select
                      id="gif-width"
                      value={width}
                      onChange={(event) =>
                        setWidth(event.target.value)
                      }
                      disabled={stage === "processing"}
                    >
                      {WIDTH_OPTIONS.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {stage === "processing" && (
            <div className="gif-to-video-progress">
              <div className="gif-to-video-progress-top">
                <span>Converting GIF…</span>
                <strong>{progress}%</strong>
              </div>

              <div className="gif-to-video-progress-track">
                <div
                  className="gif-to-video-progress-fill"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              <button
                type="button"
                className="gif-to-video-secondary"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          )}

          {stage === "error" && error && (
            <div className="gif-to-video-error">
              {error}
            </div>
          )}

          {stage === "success" && result && (
            <div className="gif-to-video-success">
              <div>
                <span className="gif-to-video-success-label">
                  Conversion complete
                </span>

                <strong>{result.fileName}</strong>

                <small>
                  {outputLabel} · {formatBytes(result.size)}
                </small>
              </div>

              <a
                className="gif-to-video-download"
                href={result.url}
                download={result.fileName}
              >
                Download {outputLabel}
              </a>
            </div>
          )}

          <div className="gif-to-video-actions">
            {stage === "ready" && (
              <button
                type="button"
                className="gif-to-video-primary"
                onClick={handleConvert}
              >
                Convert to {outputLabel}
              </button>
            )}

            {stage === "error" && (
              <button
                type="button"
                className="gif-to-video-primary"
                onClick={handleConvert}
              >
                Try Again
              </button>
            )}

            {stage === "success" && (
              <button
                type="button"
                className="gif-to-video-primary"
                onClick={() => {
                  clearResult();
                  setStage("ready");
                  setProgress(0);
                }}
              >
                Convert Again
              </button>
            )}

            <button
              type="button"
              className="gif-to-video-secondary"
              onClick={handleReset}
              disabled={stage === "processing"}
            >
              Reset
            </button>
          </div>
        </>
      )}

      <style>{`
        .gif-to-video-tool {
          width: 100%;
          box-sizing: border-box;
          padding: 26px 30px 38px;
          color: rgba(255,255,255,.94);
        }

        .gif-to-video-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 26px;
        }

        .gif-to-video-header h2 {
          margin: 0 0 6px;
          font-size: 26px;
          line-height: 1.15;
          letter-spacing: -.03em;
        }

        .gif-to-video-header p {
          margin: 0;
          color: rgba(255,255,255,.55);
          font-size: 14px;
        }

        .gif-to-video-badge {
          padding: 8px 11px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 999px;
          color: rgba(255,255,255,.48);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .12em;
          white-space: nowrap;
        }

        .gif-to-video-dropzone {
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

        .gif-to-video-dropzone:hover,
        .gif-to-video-dropzone.is-dragging {
          border-color: rgba(255,119,0,.65);
          background: rgba(255,119,0,.055);
        }

        .gif-to-video-dropzone:active {
          transform: scale(.995);
        }

        .gif-to-video-upload-icon {
          width: 48px;
          height: 48px;
          margin-bottom: 10px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: rgba(255,119,0,.12);
          color: #ff8a33;
          font-size: 24px;
          font-weight: 700;
        }

        .gif-to-video-dropzone strong {
          font-size: 16px;
        }

        .gif-to-video-dropzone span {
          color: rgba(255,255,255,.5);
          font-size: 13px;
        }

        .gif-to-video-dropzone small {
          margin-top: 8px;
          color: rgba(255,255,255,.3);
          font-size: 11px;
        }

        .gif-to-video-workspace {
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) minmax(280px, .75fr);
          gap: 18px;
        }

        .gif-to-video-preview-card,
        .gif-to-video-settings {
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 22px;
          background: rgba(255,255,255,.025);
          overflow: hidden;
        }

        .gif-to-video-preview {
          min-height: 320px;
          display: grid;
          place-items: center;
          padding: 18px;
          background:
            linear-gradient(
              135deg,
              rgba(255,255,255,.025),
              rgba(255,255,255,.01)
            );
        }

        .gif-to-video-preview img,
        .gif-to-video-preview video {
          display: block;
          max-width: 100%;
          max-height: 430px;
          object-fit: contain;
          border-radius: 14px;
          background: #090909;
        }

        .gif-to-video-file-info {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 14px 16px;
          border-top: 1px solid rgba(255,255,255,.07);
        }

        .gif-to-video-file-info > div {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .gif-to-video-file-info strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .gif-to-video-file-info span {
          color: rgba(255,255,255,.4);
          font-size: 11px;
        }

        .gif-to-video-settings {
          padding: 20px;
        }

        .gif-to-video-setting-group {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .gif-to-video-setting-group + .gif-to-video-setting-row {
          margin-top: 22px;
        }

        .gif-to-video-setting-group label {
          color: rgba(255,255,255,.6);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .gif-to-video-option-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .gif-to-video-option-grid button {
          width: 100%;
          padding: 12px 13px;
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

        .gif-to-video-option-grid button:hover {
          border-color: rgba(255,119,0,.35);
        }

        .gif-to-video-option-grid button.active {
          border-color: rgba(255,119,0,.7);
          background: rgba(255,119,0,.08);
        }

        .gif-to-video-option-grid button strong,
        .gif-to-video-option-grid button span {
          display: block;
        }

        .gif-to-video-option-grid button strong {
          margin-bottom: 3px;
          font-size: 13px;
        }

        .gif-to-video-option-grid button span {
          color: rgba(255,255,255,.38);
          font-size: 10px;
        }

        .gif-to-video-setting-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .gif-to-video-setting-row select {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 11px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 12px;
          background: #17120f;
          color: white;
          outline: none;
        }

        .gif-to-video-progress {
          margin-top: 18px;
          padding: 18px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 18px;
          background: rgba(255,255,255,.025);
        }

        .gif-to-video-progress-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 13px;
        }

        .gif-to-video-progress-top strong {
          color: #ff8730;
        }

        .gif-to-video-progress-track {
          width: 100%;
          height: 7px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,.08);
        }

        .gif-to-video-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: #ff7b20;
          transition: width .18s ease;
        }

        .gif-to-video-progress .gif-to-video-secondary {
          margin-top: 12px;
        }

        .gif-to-video-error {
          margin-top: 18px;
          padding: 13px 15px;
          border: 1px solid rgba(255,75,75,.2);
          border-radius: 14px;
          background: rgba(255,75,75,.05);
          color: rgba(255,180,180,.9);
          font-size: 13px;
        }

        .gif-to-video-success {
          margin-top: 18px;
          padding: 16px;
          border: 1px solid rgba(105,255,160,.18);
          border-radius: 18px;
          background: rgba(105,255,160,.045);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .gif-to-video-success > div {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .gif-to-video-success-label {
          color: rgba(155,255,190,.75);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .gif-to-video-success strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .gif-to-video-success small {
          color: rgba(255,255,255,.38);
          font-size: 11px;
        }

        .gif-to-video-download,
        .gif-to-video-primary,
        .gif-to-video-secondary {
          min-height: 42px;
          padding: 0 16px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid transparent;
          transition:
            transform .18s ease,
            border-color .18s ease,
            background .18s ease;
        }

        .gif-to-video-download,
        .gif-to-video-primary {
          background: #ff7b20;
          color: #120c08;
        }

        .gif-to-video-download:hover,
        .gif-to-video-primary:hover {
          transform: translateY(-1px);
          background: #ff8a36;
        }

        .gif-to-video-secondary {
          border-color: rgba(255,255,255,.09);
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.78);
        }

        .gif-to-video-secondary:hover {
          border-color: rgba(255,255,255,.18);
          background: rgba(255,255,255,.05);
        }

        .gif-to-video-secondary:disabled,
        .gif-to-video-primary:disabled {
          opacity: .45;
          cursor: not-allowed;
          transform: none;
        }

        .gif-to-video-actions {
          margin-top: 18px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        @media (max-width: 820px) {
          .gif-to-video-tool {
            padding: 22px 18px 30px;
          }

          .gif-to-video-header {
            flex-direction: column;
          }

          .gif-to-video-workspace {
            grid-template-columns: 1fr;
          }

          .gif-to-video-preview {
            min-height: 240px;
          }
        }

        @media (max-width: 520px) {
          .gif-to-video-setting-row {
            grid-template-columns: 1fr;
          }

          .gif-to-video-success {
            align-items: flex-start;
            flex-direction: column;
          }

          .gif-to-video-download {
            width: 100%;
          }

          .gif-to-video-actions {
            justify-content: stretch;
          }

          .gif-to-video-actions button {
            flex: 1 1 100%;
          }
        }
      `}</style>
    </div>
  );
}