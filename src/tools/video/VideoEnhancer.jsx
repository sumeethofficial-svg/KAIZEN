import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  enhanceVideo,
  getVideoEnhancementInfo,
} from "../../services/video/enhanceVideo.js";

const DEFAULT_ADJUSTMENTS = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  sharpness: 0,
};

const SLIDERS = [
  {
    key: "brightness",
    label: "Brightness",
    min: -100,
    max: 100,
    step: 1,
    description:
      "Adjust the overall lightness.",
  },
  {
    key: "contrast",
    label: "Contrast",
    min: -100,
    max: 100,
    step: 1,
    description:
      "Increase or soften tonal separation.",
  },
  {
    key: "saturation",
    label: "Saturation",
    min: -100,
    max: 100,
    step: 1,
    description:
      "Control the intensity of colours.",
  },
  {
    key: "sharpness",
    label: "Sharpness",
    min: 0,
    max: 100,
    step: 1,
    description:
      "Bring out edges and fine detail.",
  },
];

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

function formatDuration(seconds) {
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

function formatSliderValue(
  key,
  value
) {
  if (key === "sharpness") {
    return `${value}%`;
  }

  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

function getPreviewFilter(
  adjustments
) {
  const brightness =
    100 +
    adjustments.brightness;

  const contrast =
    100 +
    adjustments.contrast;

  const saturation =
    100 +
    adjustments.saturation;

  const sharpen =
    adjustments.sharpness > 0
      ? 1 +
        adjustments.sharpness /
          700
      : 1;

  return [
    `brightness(${brightness}%)`,
    `contrast(${contrast}%)`,
    `saturate(${saturation}%)`,
    `contrast(${sharpen * 100}%)`,
  ].join(" ");
}

function VideoEnhancer() {
  const [file, setFile] =
    useState(null);

  const [info, setInfo] =
    useState(null);

  const [previewUrl, setPreviewUrl] =
    useState("");

  const [
    adjustments,
    setAdjustments,
  ] = useState(
    DEFAULT_ADJUSTMENTS
  );

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

  const previewFilter =
    useMemo(
      () =>
        getPreviewFilter(
          adjustments
        ),
      [adjustments]
    );

  const hasAdjustments =
    Object.values(
      adjustments
    ).some(
      (value) => value !== 0
    );

  const isProcessing =
    status === "processing";

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
        await getVideoEnhancementInfo(
          selected
        );

      setFile(selected);
      setInfo(videoInfo);
      setAdjustments(
        DEFAULT_ADJUSTMENTS
      );
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
    if (
      !isProcessing
    ) {
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
    setAdjustments(
      DEFAULT_ADJUSTMENTS
    );
    setStatus("idle");
  }

  function updateAdjustment(
    key,
    value
  ) {
    setAdjustments(
      (previous) => ({
        ...previous,
        [key]: Number(value),
      })
    );

    setResult(null);
    setStatus("ready");
  }

  function resetAdjustments() {
    if (isProcessing) {
      return;
    }

    setAdjustments(
      DEFAULT_ADJUSTMENTS
    );

    setResult(null);
    setError("");

    setStatus(
      file
        ? "ready"
        : "idle"
    );
  }

  async function handleEnhance() {
    if (!file) {
      return;
    }

    if (!hasAdjustments) {
      setError(
        "Make at least one adjustment before enhancing the video."
      );

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
      const enhancementResult =
        await enhanceVideo(
          file,
          {
            adjustments,

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
          enhancementResult.file
        );

      resultUrlRef.current =
        url;

      setResult({
        ...enhancementResult,
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
          "The video could not be enhanced."
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
    <section className="video-enhancer-tool">
      <style>{`
        .video-enhancer-tool {
          width: 100%;
          box-sizing: border-box;
          padding: 26px 30px 38px;
          color: rgba(255,255,255,.94);
        }

        .video-enhancer-tool * {
          box-sizing: border-box;
        }

        .video-enhancer-upload {
          position: relative;
          max-width: 100%;
        }

        .video-enhancer-upload-input {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .video-enhancer-dropzone {
          position: relative;
          min-height: 390px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 42px 28px;
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
            background .2s ease,
            transform .2s ease;
        }

        .video-enhancer-dropzone:hover {
          border-color: rgba(255,135,65,.32);
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(255,115,35,.13),
              transparent 52%
            ),
            rgba(255,255,255,.018);
        }

        .video-enhancer-dropzone.dragging {
          border-color: rgba(255,135,65,.64);
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(255,115,35,.18),
              transparent 55%
            ),
            rgba(255,105,30,.045);
          transform: scale(1.002);
        }

        .video-enhancer-upload-content {
          text-align: center;
        }

        .video-enhancer-upload-icon {
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

        .video-enhancer-upload-eyebrow {
          color: rgba(255,255,255,.42);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .22em;
          text-transform: uppercase;
        }

        .video-enhancer-upload-title {
          margin-top: 12px;
          font-size: 23px;
          font-weight: 700;
          letter-spacing: -.7px;
        }

        .video-enhancer-upload-description {
          max-width: 460px;
          margin: 8px auto 0;
          color: rgba(255,255,255,.38);
          font-size: 12px;
          line-height: 1.6;
        }

        .video-enhancer-browse {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          margin-top: 20px;
          padding: 0 17px;
          border: 1px solid rgba(255,125,50,.22);
          border-radius: 11px;
          background: rgba(255,95,20,.08);
          color: rgba(255,255,255,.86);
          font-size: 11px;
          font-weight: 800;
        }

        .video-enhancer-upload-hint {
          margin-top: 11px;
          color: rgba(255,255,255,.24);
          font-size: 9px;
          letter-spacing: .06em;
        }

        .video-enhancer-layout {
          display: grid;
          grid-template-columns: minmax(0,1.08fr) minmax(340px,.92fr);
          gap: 28px;
          align-items: start;
        }

        .video-enhancer-preview {
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 20px;
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(255,120,40,.10),
              transparent 48%
            ),
            rgba(0,0,0,.28);
        }

        .video-enhancer-preview video {
          display: block;
          width: 100%;
          height: 390px;
          object-fit: contain;
          background: #050505;
          transition: filter .15s ease;
        }

        .video-enhancer-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .video-enhancer-card {
          padding: 18px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 18px;
          background: rgba(255,255,255,.025);
        }

        .video-enhancer-label {
          display: block;
          margin-bottom: 13px;
          color: rgba(255,255,255,.38);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .2em;
          text-transform: uppercase;
        }

        .video-enhancer-file {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .video-enhancer-file-name {
          min-width: 0;
          font-size: 14px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .video-enhancer-file-meta {
          margin-top: 5px;
          color: rgba(255,255,255,.40);
          font-size: 11px;
        }

        .video-enhancer-remove {
          flex: 0 0 auto;
          width: 34px;
          height: 34px;
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 10px;
          background: rgba(255,255,255,.035);
          color: rgba(255,255,255,.65);
          cursor: pointer;
          font-size: 18px;
        }

        .video-enhancer-slider {
          padding: 15px 0;
          border-top: 1px solid rgba(255,255,255,.055);
        }

        .video-enhancer-slider:first-of-type {
          border-top: 0;
          padding-top: 0;
        }

        .video-enhancer-slider-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .video-enhancer-slider-name {
          font-size: 12px;
          font-weight: 700;
        }

        .video-enhancer-slider-value {
          min-width: 46px;
          padding: 4px 8px;
          border-radius: 7px;
          background: rgba(255,255,255,.05);
          color: rgba(255,255,255,.74);
          text-align: center;
          font-size: 10px;
          font-weight: 800;
        }

        .video-enhancer-slider-description {
          margin-top: 4px;
          color: rgba(255,255,255,.33);
          font-size: 10px;
        }

        .video-enhancer-slider input {
          width: 100%;
          margin-top: 13px;
          accent-color: #ff7b2f;
          cursor: pointer;
        }

        .video-enhancer-slider-scale {
          display: flex;
          justify-content: space-between;
          color: rgba(255,255,255,.24);
          font-size: 8px;
          margin-top: 4px;
        }

        .video-enhancer-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
        }

        .video-enhancer-secondary {
          min-height: 44px;
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 12px;
          background: rgba(255,255,255,.035);
          color: rgba(255,255,255,.70);
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .video-enhancer-secondary:hover {
          background: rgba(255,255,255,.06);
          color: white;
        }

        .video-enhancer-primary {
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

        .video-enhancer-primary:disabled,
        .video-enhancer-secondary:disabled,
        .video-enhancer-remove:disabled {
          opacity: .42;
          cursor: not-allowed;
        }

        .video-enhancer-progress {
          padding: 15px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 16px;
          background: rgba(255,255,255,.025);
        }

        .video-enhancer-progress-top {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          font-size: 11px;
        }

        .video-enhancer-progress-top span {
          color: rgba(255,255,255,.40);
        }

        .video-enhancer-progress-top strong {
          color: rgba(255,255,255,.86);
        }

        .video-enhancer-progress-track {
          height: 6px;
          margin-top: 10px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,.065);
        }

        .video-enhancer-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #d9500f,
            #ff9942
          );
          transition: width .18s ease;
        }

        .video-enhancer-result {
          margin-top: 16px;
          padding: 17px;
          border: 1px solid rgba(255,120,45,.20);
          border-radius: 18px;
          background:
            radial-gradient(
              circle at 85% 0%,
              rgba(255,110,35,.09),
              transparent 48%
            ),
            rgba(255,255,255,.025);
        }

        .video-enhancer-result-heading {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
        }

        .video-enhancer-result-heading strong {
          font-size: 14px;
        }

        .video-enhancer-result-saved {
          color: #ffad75;
          font-size: 11px;
          font-weight: 800;
        }

        .video-enhancer-result-grid {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 8px;
          margin-top: 13px;
        }

        .video-enhancer-result-stat {
          padding: 10px;
          border-radius: 10px;
          background: rgba(255,255,255,.035);
        }

        .video-enhancer-result-stat span {
          display: block;
          color: rgba(255,255,255,.32);
          font-size: 8px;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        .video-enhancer-result-stat strong {
          display: block;
          margin-top: 4px;
          font-size: 11px;
        }

        .video-enhancer-download {
          width: 100%;
          min-height: 44px;
          margin-top: 13px;
          border: 1px solid rgba(255,120,45,.24);
          border-radius: 11px;
          background: rgba(255,90,20,.09);
          color: rgba(255,255,255,.90);
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .video-enhancer-download:hover {
          background: rgba(255,90,20,.16);
        }

        .video-enhancer-error {
          padding: 13px 14px;
          border: 1px solid rgba(255,70,70,.18);
          border-radius: 12px;
          background: rgba(255,50,50,.05);
          color: rgba(255,184,184,.88);
          font-size: 11px;
          line-height: 1.5;
        }

        @media (max-width: 900px) {
          .video-enhancer-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 650px) {
          .video-enhancer-tool {
            padding: 20px 16px 28px;
          }

          .video-enhancer-dropzone {
            min-height: 300px;
          }

          .video-enhancer-preview video {
            height: 250px;
          }

          .video-enhancer-result-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>

      {!file ? (
        <div className="video-enhancer-upload">
          <input
            ref={inputRef}
            type="file"
            className="video-enhancer-upload-input"
            accept="video/*,.mp4,.webm,.mov,.mkv,.avi,.m4v,.mpeg,.mpg"
            onChange={handleFileInput}
          />

          <div
            className={`video-enhancer-dropzone ${
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
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (
                event.key ===
                  "Enter" ||
                event.key === " "
              ) {
                event.preventDefault();
                handleBrowseClick();
              }
            }}
            aria-label="Upload video"
          >
            <div className="video-enhancer-upload-content">
              <div className="video-enhancer-upload-icon">
                ↑
              </div>

              <div className="video-enhancer-upload-eyebrow">
                VIDEO ENHANCER
              </div>

              <div className="video-enhancer-upload-title">
                {isDragging
                  ? "Drop your video here"
                  : "Drop your video here"}
              </div>

              <div className="video-enhancer-upload-description">
                Adjust brightness, contrast,
                colour and sharpness directly
                in your browser.
              </div>

              <div className="video-enhancer-browse">
                Choose Video
              </div>

              <div className="video-enhancer-upload-hint">
                MP4 · WebM · MOV · AVI · MKV
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="video-enhancer-layout">
          <div>
            <div className="video-enhancer-preview">
              {previewUrl ? (
                <video
                  src={previewUrl}
                  controls
                  playsInline
                  preload="metadata"
                  style={{
                    filter:
                      previewFilter,
                  }}
                />
              ) : (
                <div
                  style={{
                    minHeight:
                      "390px",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    color:
                      "rgba(255,255,255,.45)",
                  }}
                >
                  Video preview unavailable
                </div>
              )}
            </div>

            {result && (
              <div className="video-enhancer-result">
                <div className="video-enhancer-result-heading">
                  <strong>
                    Enhancement complete
                  </strong>

                  <span className="video-enhancer-result-saved">
                    {result.savedPercentLabel}
                    {" "}
                    smaller
                  </span>
                </div>

                <div className="video-enhancer-result-grid">
                  <div className="video-enhancer-result-stat">
                    <span>
                      Original
                    </span>

                    <strong>
                      {result.originalSizeLabel}
                    </strong>
                  </div>

                  <div className="video-enhancer-result-stat">
                    <span>
                      Output
                    </span>

                    <strong>
                      {result.enhancedSizeLabel}
                    </strong>
                  </div>

                  <div className="video-enhancer-result-stat">
                    <span>
                      Resolution
                    </span>

                    <strong>
                      {result.width} ×{" "}
                      {result.height}
                    </strong>
                  </div>

                  <div className="video-enhancer-result-stat">
                    <span>
                      Format
                    </span>

                    <strong>
                      MP4 / H.264
                    </strong>
                  </div>

                  <div className="video-enhancer-result-stat">
                    <span>
                      Duration
                    </span>

                    <strong>
                      {formatDuration(
                        result.duration
                      )}
                    </strong>
                  </div>

                  <div className="video-enhancer-result-stat">
                    <span>
                      Saved
                    </span>

                    <strong>
                      {result.savedBytesLabel}
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="video-enhancer-download"
                  onClick={
                    downloadResult
                  }
                >
                  Download Enhanced Video
                </button>
              </div>
            )}
          </div>

          <div className="video-enhancer-panel">
            <div className="video-enhancer-card">
              <span className="video-enhancer-label">
                Selected Video
              </span>

              <div className="video-enhancer-file">
                <div
                  style={{
                    minWidth: 0,
                  }}
                >
                  <div className="video-enhancer-file-name">
                    {file.name}
                  </div>

                  <div className="video-enhancer-file-meta">
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
                  className="video-enhancer-remove"
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

            <div className="video-enhancer-card">
              <span className="video-enhancer-label">
                Adjustments
              </span>

              {SLIDERS.map(
                (slider) => (
                  <div
                    key={
                      slider.key
                    }
                    className="video-enhancer-slider"
                  >
                    <div className="video-enhancer-slider-top">
                      <div>
                        <div className="video-enhancer-slider-name">
                          {slider.label}
                        </div>

                        <div className="video-enhancer-slider-description">
                          {
                            slider.description
                          }
                        </div>
                      </div>

                      <span className="video-enhancer-slider-value">
                        {formatSliderValue(
                          slider.key,
                          adjustments[
                            slider.key
                          ]
                        )}
                      </span>
                    </div>

                    <input
                      type="range"
                      min={
                        slider.min
                      }
                      max={
                        slider.max
                      }
                      step={
                        slider.step
                      }
                      value={
                        adjustments[
                          slider.key
                        ]
                      }
                      onChange={(
                        event
                      ) =>
                        updateAdjustment(
                          slider.key,
                          event.target
                            .value
                        )
                      }
                      disabled={
                        isProcessing
                      }
                    />

                    <div className="video-enhancer-slider-scale">
                      <span>
                        {slider.min}
                      </span>

                      <span>
                        0
                      </span>

                      <span>
                        {slider.max}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="video-enhancer-actions">
              <button
                type="button"
                className="video-enhancer-secondary"
                onClick={
                  resetAdjustments
                }
                disabled={
                  isProcessing
                }
              >
                Reset
              </button>

              <button
                type="button"
                className="video-enhancer-secondary"
                onClick={
                  clearFile
                }
                disabled={
                  isProcessing
                }
              >
                Choose Another
              </button>
            </div>

            {isProcessing && (
              <div className="video-enhancer-progress">
                <div className="video-enhancer-progress-top">
                  <span>
                    {phase ===
                    "loading"
                      ? "Loading enhancement engine..."
                      : phase ===
                        "finalizing"
                      ? "Finalizing video..."
                      : "Enhancing video..."}
                  </span>

                  <strong>
                    {progress}%
                  </strong>
                </div>

                <div className="video-enhancer-progress-track">
                  <div
                    className="video-enhancer-progress-fill"
                    style={{
                      width:
                        `${progress}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="video-enhancer-error">
                {error}
              </div>
            )}

            <button
              type="button"
              className="video-enhancer-primary"
              onClick={
                handleEnhance
              }
              disabled={
                isProcessing ||
                !hasAdjustments
              }
            >
              {isProcessing
                ? "Enhancing Video..."
                : "Enhance Video"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default VideoEnhancer;