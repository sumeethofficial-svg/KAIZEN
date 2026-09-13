import {
  useEffect,
  useRef,
  useState,
} from "react";
import { extractVideoAudio } from "../../services/video/extractVideoAudio";

const OUTPUT_OPTIONS = [
  {
    value: "mp3",
    label: "MP3",
    description: "Best compatibility",
  },
  {
    value: "wav",
    label: "WAV",
    description: "Uncompressed audio",
  },
  {
    value: "m4a",
    label: "M4A",
    description: "Efficient high quality",
  },
  {
    value: "aac",
    label: "AAC",
    description: "Compact audio",
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
  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );
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

export default function ExtractVideoAudio() {
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

  const [format, setFormat] = useState("mp3");
  const [bitrate, setBitrate] = useState("192k");

  const [dragActive, setDragActive] = useState(false);
  const [stage, setStage] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

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

    if (selectedFile.size <= 0) {
      setStage("error");
      setFile(null);
      setPreviewUrl(null);
      setError("The selected video file is empty.");
      return;
    }

    const looksLikeVideo =
      selectedFile.type.startsWith("video/") ||
      /\.(mp4|mov|mkv|webm|avi|m4v|wmv|flv|mpeg|mpg|3gp)$/i.test(
        selectedFile.name
      );

    if (!looksLikeVideo) {
      setStage("error");
      setFile(null);
      setPreviewUrl(null);
      setError("Please select a video file.");
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(
        previewUrlRef.current
      );
    }

    const url = URL.createObjectURL(
      selectedFile
    );

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
        duration:
          Number.isFinite(video.duration)
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

  const handleExtract = async () => {
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
      const extracted =
        await extractVideoAudio({
          file,
          format,
          bitrate,
          signal: controller.signal,
          onProgress: (value) => {
            setProgress(value);
          },
        });

      resultUrlRef.current =
        extracted.url;

      setResult(extracted);
      setProgress(100);
      setStage("success");
    } catch (extractionError) {
      if (
        extractionError?.name ===
        "AbortError"
      ) {
        setStage("ready");
        setProgress(0);
        return;
      }

      console.error(extractionError);

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

    setProgress(0);
    setError("");
    setStage("idle");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const outputLabel =
    OUTPUT_OPTIONS.find(
      (option) =>
        option.value === format
    )?.label || "MP3";

  const isLossless = format === "wav";

  return (
    <div className="extract-audio-tool">
      <div className="extract-audio-header">
        <div>
          <h2>Extract Audio</h2>

          <p>
            Pull the audio track out of your
            video and save it separately.
          </p>
        </div>

        <div className="extract-audio-badge">
          BROWSER · PRIVATE
        </div>
      </div>

      {!file && stage === "idle" && (
        <button
          type="button"
          className={`extract-audio-dropzone ${
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
          <div className="extract-audio-upload-icon">
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
            MP4, MOV, MKV, WebM and more
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
          <div className="extract-audio-workspace">
            <div className="extract-audio-preview-card">
              <div className="extract-audio-preview">
                <video
                  src={previewUrl}
                  controls
                  playsInline
                />
              </div>

              <div className="extract-audio-file-info">
                <div>
                  <strong>
                    {file.name}
                  </strong>

                  <span>
                    {formatBytes(file.size)}
                  </span>
                </div>

                <div className="extract-audio-meta">
                  {metadata.width > 0 &&
                    `${metadata.width} × ${metadata.height}`}

                  {metadata.duration > 0 &&
                    ` · ${formatDuration(
                      metadata.duration
                    )}`}
                </div>
              </div>
            </div>

            {stage !== "success" && (
              <div className="extract-audio-settings">
                <div className="extract-audio-setting-group">
                  <label>
                    Output format
                  </label>

                  <div className="extract-audio-format-grid">
                    {OUTPUT_OPTIONS.map(
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
                            {option.label}
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
                  <div className="extract-audio-setting-group extract-audio-bitrate-group">
                    <label htmlFor="audio-bitrate">
                      Bitrate
                    </label>

                    <select
                      id="audio-bitrate"
                      value={bitrate}
                      onChange={(event) =>
                        setBitrate(
                          event.target.value
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
                            key={value}
                            value={value}
                          >
                            {value}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                )}

                <div className="extract-audio-info-note">
                  <span>ⓘ</span>

                  <p>
                    {isLossless
                      ? "WAV keeps uncompressed PCM audio and may produce a much larger file."
                      : `Your audio will be encoded at ${bitrate}.`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {stage === "processing" && (
            <div className="extract-audio-progress">
              <div className="extract-audio-progress-top">
                <span>
                  Extracting audio…
                </span>

                <strong>
                  {progress}%
                </strong>
              </div>

              <div className="extract-audio-progress-track">
                <div
                  className="extract-audio-progress-fill"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              <button
                type="button"
                className="extract-audio-secondary"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          )}

          {stage === "error" &&
            error && (
              <div className="extract-audio-error">
                {error}
              </div>
            )}

          {stage === "success" &&
            result && (
              <div className="extract-audio-result">
                <div className="extract-audio-result-player">
                  <audio
                    src={result.url}
                    controls
                  />
                </div>

                <div className="extract-audio-success-info">
                  <span>
                    EXTRACTION COMPLETE
                  </span>

                  <strong>
                    {result.fileName}
                  </strong>

                  <small>
                    {outputLabel} ·{" "}
                    {formatBytes(
                      result.size
                    )}
                  </small>
                </div>

                <a
                  className="extract-audio-download"
                  href={result.url}
                  download={
                    result.fileName
                  }
                >
                  Download{" "}
                  {outputLabel}
                </a>
              </div>
            )}

          <div className="extract-audio-actions">
            {stage === "ready" && (
              <button
                type="button"
                className="extract-audio-primary"
                onClick={
                  handleExtract
                }
              >
                Extract as{" "}
                {outputLabel}
              </button>
            )}

            {stage === "error" && (
              <button
                type="button"
                className="extract-audio-primary"
                onClick={
                  handleExtract
                }
              >
                Try Again
              </button>
            )}

            {stage === "success" && (
              <button
                type="button"
                className="extract-audio-primary"
                onClick={() => {
                  clearResult();
                  setStage("ready");
                  setProgress(0);
                }}
              >
                Extract Again
              </button>
            )}

            <button
              type="button"
              className="extract-audio-secondary"
              onClick={handleReset}
              disabled={
                stage === "processing"
              }
            >
              Reset
            </button>
          </div>
        </>
      )}

      <style>{`
        .extract-audio-tool {
          width: 100%;
          box-sizing: border-box;
          padding: 26px 30px 38px;
          color: rgba(255,255,255,.94);
        }

        .extract-audio-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 26px;
        }

        .extract-audio-header h2 {
          margin: 0 0 6px;
          font-size: 26px;
          line-height: 1.15;
          letter-spacing: -.03em;
        }

        .extract-audio-header p {
          margin: 0;
          color: rgba(255,255,255,.55);
          font-size: 14px;
        }

        .extract-audio-badge {
          padding: 8px 11px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 999px;
          color: rgba(255,255,255,.48);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .12em;
          white-space: nowrap;
        }

        .extract-audio-dropzone {
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

        .extract-audio-dropzone:hover,
        .extract-audio-dropzone.is-dragging {
          border-color: rgba(255,119,0,.65);
          background: rgba(255,119,0,.055);
        }

        .extract-audio-dropzone:active {
          transform: scale(.995);
        }

        .extract-audio-upload-icon {
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

        .extract-audio-dropzone strong {
          font-size: 16px;
        }

        .extract-audio-dropzone span {
          color: rgba(255,255,255,.5);
          font-size: 13px;
        }

        .extract-audio-dropzone small {
          margin-top: 8px;
          color: rgba(255,255,255,.3);
          font-size: 11px;
        }

        .extract-audio-workspace {
          display: grid;
          grid-template-columns: minmax(0,1.25fr) minmax(280px,.75fr);
          gap: 18px;
        }

        .extract-audio-preview-card,
        .extract-audio-settings {
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 22px;
          background: rgba(255,255,255,.025);
          overflow: hidden;
        }

        .extract-audio-preview {
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

        .extract-audio-preview video {
          display: block;
          width: 100%;
          max-height: 430px;
          border-radius: 14px;
          background: #090909;
        }

        .extract-audio-file-info {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 16px;
          border-top: 1px solid rgba(255,255,255,.07);
        }

        .extract-audio-file-info > div:first-child {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .extract-audio-file-info strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .extract-audio-file-info span,
        .extract-audio-meta {
          color: rgba(255,255,255,.4);
          font-size: 11px;
        }

        .extract-audio-meta {
          text-align: right;
          white-space: nowrap;
        }

        .extract-audio-settings {
          padding: 20px;
        }

        .extract-audio-setting-group {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .extract-audio-setting-group label {
          color: rgba(255,255,255,.6);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .extract-audio-format-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .extract-audio-format-grid button {
          width: 100%;
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

        .extract-audio-format-grid button:hover {
          border-color: rgba(255,119,0,.35);
        }

        .extract-audio-format-grid button.active {
          border-color: rgba(255,119,0,.7);
          background: rgba(255,119,0,.08);
        }

        .extract-audio-format-grid button strong,
        .extract-audio-format-grid button span {
          display: block;
        }

        .extract-audio-format-grid button strong {
          margin-bottom: 4px;
          font-size: 13px;
        }

        .extract-audio-format-grid button span {
          color: rgba(255,255,255,.38);
          font-size: 10px;
        }

        .extract-audio-bitrate-group {
          margin-top: 20px;
        }

        .extract-audio-bitrate-group select {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 11px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 12px;
          background: #17120f;
          color: white;
          outline: none;
        }

        .extract-audio-info-note {
          margin-top: 18px;
          padding: 11px 12px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 13px;
          display: flex;
          align-items: flex-start;
          gap: 9px;
          background: rgba(255,255,255,.02);
        }

        .extract-audio-info-note span {
          color: #ff8730;
          font-size: 12px;
        }

        .extract-audio-info-note p {
          margin: 0;
          color: rgba(255,255,255,.4);
          font-size: 11px;
          line-height: 1.5;
        }

        .extract-audio-progress {
          margin-top: 18px;
          padding: 18px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 18px;
          background: rgba(255,255,255,.025);
        }

        .extract-audio-progress-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 13px;
        }

        .extract-audio-progress-top strong {
          color: #ff8730;
        }

        .extract-audio-progress-track {
          width: 100%;
          height: 7px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,.08);
        }

        .extract-audio-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: #ff7b20;
          transition: width .18s ease;
        }

        .extract-audio-progress .extract-audio-secondary {
          margin-top: 12px;
        }

        .extract-audio-error {
          margin-top: 18px;
          padding: 13px 15px;
          border: 1px solid rgba(255,75,75,.2);
          border-radius: 14px;
          background: rgba(255,75,75,.05);
          color: rgba(255,180,180,.9);
          font-size: 13px;
        }

        .extract-audio-result {
          margin-top: 18px;
          padding: 16px;
          border: 1px solid rgba(105,255,160,.18);
          border-radius: 18px;
          background: rgba(105,255,160,.045);
          display: grid;
          grid-template-columns: minmax(240px,1fr) minmax(180px,.8fr) auto;
          align-items: center;
          gap: 16px;
        }

        .extract-audio-result-player audio {
          display: block;
          width: 100%;
          min-width: 0;
        }

        .extract-audio-success-info {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .extract-audio-success-info span {
          color: rgba(155,255,190,.75);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .08em;
        }

        .extract-audio-success-info strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .extract-audio-success-info small {
          color: rgba(255,255,255,.38);
          font-size: 11px;
        }

        .extract-audio-primary,
        .extract-audio-secondary,
        .extract-audio-download {
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

        .extract-audio-primary,
        .extract-audio-download {
          background: #ff7b20;
          color: #120c08;
        }

        .extract-audio-primary:hover,
        .extract-audio-download:hover {
          transform: translateY(-1px);
          background: #ff8a36;
        }

        .extract-audio-secondary {
          border-color: rgba(255,255,255,.09);
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.78);
        }

        .extract-audio-secondary:hover {
          border-color: rgba(255,255,255,.18);
          background: rgba(255,255,255,.05);
        }

        .extract-audio-secondary:disabled,
        .extract-audio-primary:disabled {
          opacity: .45;
          cursor: not-allowed;
          transform: none;
        }

        .extract-audio-actions {
          margin-top: 18px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        @media (max-width: 900px) {
          .extract-audio-workspace {
            grid-template-columns: 1fr;
          }

          .extract-audio-result {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .extract-audio-tool {
            padding: 22px 18px 30px;
          }

          .extract-audio-header {
            flex-direction: column;
          }

          .extract-audio-preview {
            min-height: 240px;
          }

          .extract-audio-file-info {
            align-items: flex-start;
            flex-direction: column;
          }

          .extract-audio-meta {
            text-align: left;
          }
        }

        @media (max-width: 480px) {
          .extract-audio-format-grid {
            grid-template-columns: 1fr;
          }

          .extract-audio-actions {
            justify-content: stretch;
          }

          .extract-audio-actions button {
            flex: 1 1 100%;
          }

          .extract-audio-download {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}