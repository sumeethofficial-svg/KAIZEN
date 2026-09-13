import {
  useEffect,
  useRef,
  useState,
} from "react";
import { changeVideoSpeed } from "../../services/video/changeVideoSpeed";

const SPEED_OPTIONS = [
  { value: 0.25, label: "0.25×", description: "4× slower" },
  { value: 0.5, label: "0.5×", description: "2× slower" },
  { value: 0.75, label: "0.75×", description: "Slightly slower" },
  { value: 1, label: "1×", description: "Original speed" },
  { value: 1.25, label: "1.25×", description: "Slightly faster" },
  { value: 1.5, label: "1.5×", description: "50% faster" },
  { value: 2, label: "2×", description: "Twice as fast" },
  { value: 4, label: "4×", description: "4× faster" },
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

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "--:--";
  }

  const totalSeconds = Math.round(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(
    2,
    "0"
  )}`;
};

const getNewDuration = (duration, speed) => {
  if (!duration || !speed) {
    return 0;
  }

  return duration / speed;
};

export default function ChangeVideoSpeed() {
  const inputRef = useRef(null);
  const previewUrlRef = useRef(null);
  const resultUrlRef = useRef(null);
  const abortControllerRef = useRef(null);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [metadata, setMetadata] = useState({
    width: 0,
    height: 0,
    duration: 0,
  });

  const [speed, setSpeed] = useState(1);
  const [format, setFormat] = useState("mp4");

  const [dragActive, setDragActive] = useState(false);
  const [stage, setStage] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      if (resultUrlRef.current) {
        URL.revokeObjectURL(resultUrlRef.current);
      }
    };
  }, []);

  const clearResult = () => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
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
      selectedFile.type.startsWith("video/") ||
      /\.(mp4|mov|mkv|webm|avi|m4v|wmv|flv|mpeg|mpg|3gp)$/i.test(
        selectedFile.name
      );

    if (!looksLikeVideo) {
      setFile(null);
      setPreviewUrl(null);
      setStage("error");
      setError("Please select a video file.");
      return;
    }

    if (selectedFile.size <= 0) {
      setFile(null);
      setPreviewUrl(null);
      setStage("error");
      setError("The selected video file is empty.");
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

    const video = document.createElement("video");

    video.preload = "metadata";

    video.onloadedmetadata = () => {
      setMetadata({
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
        duration: Number.isFinite(video.duration)
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

  const handleChangeSpeed = async () => {
    if (!file) {
      return;
    }

    setError("");
    setProgress(0);
    setStage("processing");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const processed = await changeVideoSpeed({
        file,
        speed,
        format,
        signal: controller.signal,
        onProgress: (value) => {
          setProgress(value);
        },
      });

      resultUrlRef.current = processed.url;

      setResult(processed);
      setProgress(100);
      setStage("success");
    } catch (speedError) {
      if (speedError?.name === "AbortError") {
        setStage("ready");
        setProgress(0);
        return;
      }

      console.error(speedError);

      setStage("error");
      setError(
        speedError?.message ||
          "Something went wrong while changing the video speed."
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

    setSpeed(1);
    setFormat("mp4");
    setProgress(0);
    setError("");
    setStage("idle");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const selectedSpeed =
    SPEED_OPTIONS.find(
      (option) => option.value === speed
    );

  const selectedFormat =
    FORMAT_OPTIONS.find(
      (option) => option.value === format
    );

  const outputDuration = getNewDuration(
    metadata.duration,
    speed
  );

  return (
    <div className="change-speed-tool">
      <div className="change-speed-header">
        <div>
          <h2>Change Video Speed</h2>

          <p>
            Make your video slower or faster while keeping the
            audio synchronized.
          </p>
        </div>

        <div className="change-speed-badge">
          BROWSER · PRIVATE
        </div>
      </div>

      {!file && stage === "idle" && (
        <button
          type="button"
          className={`change-speed-dropzone ${
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
          <div className="change-speed-upload-icon">
            ↗
          </div>

          <strong>Drop your video here</strong>

          <span>
            or click to choose a video from your computer
          </span>

          <small>
            MP4, MOV, WebM, MKV and more
          </small>

          <input
            ref={inputRef}
            type="file"
            accept="video/*,.mkv,.avi,.m4v,.wmv,.flv,.mpeg,.mpg,.3gp"
            onChange={handleInputChange}
            hidden
          />
        </button>
      )}

      {file && (
        <>
          <div className="change-speed-workspace">
            <div className="change-speed-preview-card">
              <div className="change-speed-preview">
                {stage === "success" && result ? (
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

              <div className="change-speed-file-info">
                <div>
                  <strong>{file.name}</strong>

                  <span>
                    {formatBytes(file.size)}
                  </span>
                </div>

                <div className="change-speed-meta">
                  {metadata.width > 0 &&
                    `${metadata.width} × ${metadata.height}`}

                  {metadata.duration > 0 &&
                    ` · ${formatDuration(metadata.duration)}`}
                </div>
              </div>
            </div>

            {stage !== "success" && (
              <div className="change-speed-settings">
                <div className="change-speed-setting-group">
                  <label>Playback speed</label>

                  <div className="change-speed-options">
                    {SPEED_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={
                          speed === option.value
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          setSpeed(option.value)
                        }
                        disabled={
                          stage === "processing"
                        }
                      >
                        <strong>{option.label}</strong>

                        <span>
                          {option.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="change-speed-duration-card">
                  <div>
                    <span>Original duration</span>
                    <strong>
                      {formatDuration(
                        metadata.duration
                      )}
                    </strong>
                  </div>

                  <div className="change-speed-arrow">
                    →
                  </div>

                  <div>
                    <span>New duration</span>
                    <strong>
                      {formatDuration(
                        outputDuration
                      )}
                    </strong>
                  </div>
                </div>

                <div className="change-speed-setting-group change-speed-format-group">
                  <label>Output format</label>

                  <div className="change-speed-format-options">
                    {FORMAT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={
                          format === option.value
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          setFormat(option.value)
                        }
                        disabled={
                          stage === "processing"
                        }
                      >
                        <strong>{option.label}</strong>

                        <span>
                          {option.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="change-speed-note">
                  <div className="change-speed-note-icon">
                    ✓
                  </div>

                  <p>
                    Audio tempo is adjusted together with the
                    video so the soundtrack stays synchronized.
                  </p>
                </div>
              </div>
            )}
          </div>

          {stage === "processing" && (
            <div className="change-speed-progress">
              <div className="change-speed-progress-top">
                <span>
                  Changing video speed…
                </span>

                <strong>{progress}%</strong>
              </div>

              <div className="change-speed-progress-track">
                <div
                  className="change-speed-progress-fill"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              <button
                type="button"
                className="change-speed-secondary"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          )}

          {stage === "error" && error && (
            <div className="change-speed-error">
              {error}
            </div>
          )}

          {stage === "success" && result && (
            <div className="change-speed-success">
              <div className="change-speed-success-icon">
                ✓
              </div>

              <div className="change-speed-success-info">
                <span>
                  SPEED CHANGE COMPLETE
                </span>

                <strong>{result.fileName}</strong>

                <small>
                  {selectedSpeed?.label || `${result.speed}×`} ·{" "}
                  {selectedFormat?.label || result.format.toUpperCase()}{" "}
                  · {formatBytes(result.size)}
                </small>
              </div>

              <a
                className="change-speed-download"
                href={result.url}
                download={result.fileName}
              >
                Download Video
              </a>
            </div>
          )}

          <div className="change-speed-actions">
            {stage === "ready" && (
              <button
                type="button"
                className="change-speed-primary"
                onClick={handleChangeSpeed}
              >
                Apply {selectedSpeed?.label || "1×"}
              </button>
            )}

            {stage === "error" && (
              <button
                type="button"
                className="change-speed-primary"
                onClick={handleChangeSpeed}
              >
                Try Again
              </button>
            )}

            {stage === "success" && (
              <button
                type="button"
                className="change-speed-primary"
                onClick={() => {
                  clearResult();
                  setStage("ready");
                  setProgress(0);
                }}
              >
                Change Again
              </button>
            )}

            <button
              type="button"
              className="change-speed-secondary"
              onClick={handleReset}
              disabled={stage === "processing"}
            >
              Reset
            </button>
          </div>
        </>
      )}

      <style>{`
        .change-speed-tool {
          width: 100%;
          box-sizing: border-box;
          padding: 26px 30px 38px;
          color: rgba(255,255,255,.94);
        }

        .change-speed-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 26px;
        }

        .change-speed-header h2 {
          margin: 0 0 6px;
          font-size: 26px;
          line-height: 1.15;
          letter-spacing: -.03em;
        }

        .change-speed-header p {
          margin: 0;
          color: rgba(255,255,255,.55);
          font-size: 14px;
        }

        .change-speed-badge {
          padding: 8px 11px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 999px;
          color: rgba(255,255,255,.48);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .12em;
          white-space: nowrap;
        }

        .change-speed-dropzone {
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

        .change-speed-dropzone:hover,
        .change-speed-dropzone.is-dragging {
          border-color: rgba(255,119,0,.65);
          background: rgba(255,119,0,.055);
        }

        .change-speed-dropzone:active {
          transform: scale(.995);
        }

        .change-speed-upload-icon {
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

        .change-speed-dropzone strong {
          font-size: 16px;
        }

        .change-speed-dropzone span {
          color: rgba(255,255,255,.5);
          font-size: 13px;
        }

        .change-speed-dropzone small {
          margin-top: 8px;
          color: rgba(255,255,255,.3);
          font-size: 11px;
        }

        .change-speed-workspace {
          display: grid;
          grid-template-columns: minmax(0,1.25fr) minmax(290px,.75fr);
          gap: 18px;
        }

        .change-speed-preview-card,
        .change-speed-settings {
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 22px;
          background: rgba(255,255,255,.025);
          overflow: hidden;
        }

        .change-speed-preview {
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

        .change-speed-preview video {
          display: block;
          width: 100%;
          max-height: 430px;
          border-radius: 14px;
          background: #090909;
        }

        .change-speed-file-info {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 16px;
          border-top: 1px solid rgba(255,255,255,.07);
        }

        .change-speed-file-info > div:first-child {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .change-speed-file-info strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .change-speed-file-info span,
        .change-speed-meta {
          color: rgba(255,255,255,.4);
          font-size: 11px;
        }

        .change-speed-meta {
          text-align: right;
          white-space: nowrap;
        }

        .change-speed-settings {
          padding: 20px;
        }

        .change-speed-setting-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .change-speed-setting-group label {
          color: rgba(255,255,255,.6);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .change-speed-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .change-speed-options button,
        .change-speed-format-options button {
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

        .change-speed-options button:hover,
        .change-speed-format-options button:hover {
          border-color: rgba(255,119,0,.35);
        }

        .change-speed-options button.active,
        .change-speed-format-options button.active {
          border-color: rgba(255,119,0,.7);
          background: rgba(255,119,0,.08);
        }

        .change-speed-options button strong,
        .change-speed-options button span,
        .change-speed-format-options button strong,
        .change-speed-format-options button span {
          display: block;
        }

        .change-speed-options button strong,
        .change-speed-format-options button strong {
          margin-bottom: 4px;
          font-size: 13px;
        }

        .change-speed-options button span,
        .change-speed-format-options button span {
          color: rgba(255,255,255,.38);
          font-size: 10px;
          line-height: 1.35;
        }

        .change-speed-duration-card {
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

        .change-speed-duration-card > div:not(.change-speed-arrow) {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .change-speed-duration-card span {
          color: rgba(255,255,255,.38);
          font-size: 10px;
        }

        .change-speed-duration-card strong {
          font-size: 14px;
        }

        .change-speed-duration-card > div:last-child {
          text-align: right;
        }

        .change-speed-arrow {
          color: #ff8730;
          font-size: 17px;
        }

        .change-speed-format-group {
          margin-top: 20px;
        }

        .change-speed-format-options {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
        }

        .change-speed-note {
          margin-top: 18px;
          padding: 12px;
          border: 1px solid rgba(255,119,0,.12);
          border-radius: 14px;
          background: rgba(255,119,0,.035);
          display: flex;
          align-items: flex-start;
          gap: 9px;
        }

        .change-speed-note-icon {
          flex: 0 0 auto;
          width: 22px;
          height: 22px;
          border-radius: 7px;
          display: grid;
          place-items: center;
          background: rgba(255,119,0,.12);
          color: #ff8730;
          font-size: 11px;
          font-weight: 800;
        }

        .change-speed-note p {
          margin: 2px 0 0;
          color: rgba(255,255,255,.4);
          font-size: 11px;
          line-height: 1.5;
        }

        .change-speed-progress {
          margin-top: 18px;
          padding: 18px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 18px;
          background: rgba(255,255,255,.025);
        }

        .change-speed-progress-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 13px;
        }

        .change-speed-progress-top strong {
          color: #ff8730;
        }

        .change-speed-progress-track {
          width: 100%;
          height: 7px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,.08);
        }

        .change-speed-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: #ff7b20;
          transition: width .18s ease;
        }

        .change-speed-progress .change-speed-secondary {
          margin-top: 12px;
        }

        .change-speed-error {
          margin-top: 18px;
          padding: 13px 15px;
          border: 1px solid rgba(255,75,75,.2);
          border-radius: 14px;
          background: rgba(255,75,75,.05);
          color: rgba(255,180,180,.9);
          font-size: 13px;
        }

        .change-speed-success {
          margin-top: 18px;
          padding: 16px;
          border: 1px solid rgba(105,255,160,.18);
          border-radius: 18px;
          background: rgba(105,255,160,.045);
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .change-speed-success-icon {
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

        .change-speed-success-info {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .change-speed-success-info span {
          color: rgba(155,255,190,.75);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .08em;
        }

        .change-speed-success-info strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .change-speed-success-info small {
          color: rgba(255,255,255,.38);
          font-size: 11px;
        }

        .change-speed-primary,
        .change-speed-secondary,
        .change-speed-download {
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

        .change-speed-primary,
        .change-speed-download {
          background: #ff7b20;
          color: #120c08;
        }

        .change-speed-primary:hover,
        .change-speed-download:hover {
          transform: translateY(-1px);
          background: #ff8a36;
        }

        .change-speed-secondary {
          border-color: rgba(255,255,255,.09);
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.78);
        }

        .change-speed-secondary:hover {
          border-color: rgba(255,255,255,.18);
          background: rgba(255,255,255,.05);
        }

        .change-speed-secondary:disabled,
        .change-speed-primary:disabled {
          opacity: .45;
          cursor: not-allowed;
          transform: none;
        }

        .change-speed-actions {
          margin-top: 18px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        @media (max-width: 920px) {
          .change-speed-workspace {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .change-speed-tool {
            padding: 22px 18px 30px;
          }

          .change-speed-header {
            flex-direction: column;
          }

          .change-speed-preview {
            min-height: 240px;
          }

          .change-speed-file-info {
            align-items: flex-start;
            flex-direction: column;
          }

          .change-speed-meta {
            text-align: left;
          }

          .change-speed-format-options {
            grid-template-columns: 1fr;
          }

          .change-speed-success {
            align-items: flex-start;
            flex-direction: column;
          }

          .change-speed-download {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .change-speed-options {
            grid-template-columns: 1fr;
          }

          .change-speed-duration-card {
            grid-template-columns: 1fr;
            gap: 6px;
          }

          .change-speed-duration-card > div:last-child {
            text-align: left;
          }

          .change-speed-arrow {
            transform: rotate(90deg);
            justify-self: center;
          }

          .change-speed-actions {
            justify-content: stretch;
          }

          .change-speed-actions button {
            flex: 1 1 100%;
          }
        }
      `}</style>
    </div>
  );
}