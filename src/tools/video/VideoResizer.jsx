import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  getVideoResizeInfo,
  resizeVideo,
} from "../../services/video/resizeVideo.js";

const PRESETS = [
  {
    id: "1080",
    label: "1080p",
    width: 1920,
    height: 1080,
  },
  {
    id: "720",
    label: "720p",
    width: 1280,
    height: 720,
  },
  {
    id: "480",
    label: "480p",
    width: 854,
    height: 480,
  },
  {
    id: "square",
    label: "Square",
    width: 1080,
    height: 1080,
  },
];

const MODES = [
  {
    id: "contain",
    title: "Contain",
    description:
      "Keep the full video visible. Empty space is added when needed.",
  },
  {
    id: "cover",
    title: "Cover",
    description:
      "Fill the entire frame. Edges may be cropped.",
  },
  {
    id: "stretch",
    title: "Stretch",
    description:
      "Fill the exact dimensions without preserving aspect ratio.",
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

function makeEven(value) {
  const number =
    Math.max(
      2,
      Math.round(
        Number(value) || 2
      )
    );

  return number % 2 === 0
    ? number
    : number - 1;
}

function VideoResizer() {
  const [file, setFile] =
    useState(null);

  const [info, setInfo] =
    useState(null);

  const [previewUrl, setPreviewUrl] =
    useState("");

  const [width, setWidth] =
    useState(1280);

  const [height, setHeight] =
    useState(720);

  const [mode, setMode] =
    useState("contain");

  const [status, setStatus] =
    useState("idle");

  const [phase, setPhase] =
    useState("");

  const [progress, setProgress] =
    useState(0);

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

  const isProcessing =
    status === "processing";

  const dimensionsLabel =
    `${makeEven(width)} × ${makeEven(
      height
    )}`;

  const aspectRatioText =
    info?.width &&
    info?.height
      ? (
          info.width /
          info.height
        ).toFixed(2)
      : "—";

  const presetMatch =
    PRESETS.find(
      (preset) =>
        preset.width ===
          makeEven(width) &&
        preset.height ===
          makeEven(height)
    );

  const targetMegapixels =
    (
      (makeEven(width) *
        makeEven(height)) /
      1000000
    ).toFixed(2);

  const previewStyle =
    useMemo(() => {
      if (!previewUrl) {
        return {};
      }

      return {
        maxWidth: "100%",
      };
    }, [previewUrl]);

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
        await getVideoResizeInfo(
          selected
        );

      setFile(selected);
      setInfo(videoInfo);

      /*
       * Start with the original
       * dimensions.
       */
      setWidth(
        makeEven(
          videoInfo.width
        )
      );

      setHeight(
        makeEven(
          videoInfo.height
        )
      );

      setMode("contain");
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
    if (!isProcessing) {
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

  function applyPreset(preset) {
    setWidth(
      makeEven(preset.width)
    );

    setHeight(
      makeEven(preset.height)
    );

    setResult(null);
    setError("");
    setStatus(
      file ? "ready" : "idle"
    );
  }

  function handleWidthChange(
    value
  ) {
    const next =
      makeEven(value);

    setWidth(next);
    setResult(null);
    setStatus(
      file ? "ready" : "idle"
    );
  }

  function handleHeightChange(
    value
  ) {
    const next =
      makeEven(value);

    setHeight(next);
    setResult(null);
    setStatus(
      file ? "ready" : "idle"
    );
  }

  function resetDimensions() {
    if (!info) {
      return;
    }

    setWidth(
      makeEven(info.width)
    );

    setHeight(
      makeEven(info.height)
    );

    setMode("contain");
    setResult(null);
    setError("");
    setStatus("ready");
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
    setWidth(1280);
    setHeight(720);
    setMode("contain");
    setStatus("idle");
  }

  async function handleResize() {
    if (!file) {
      return;
    }

    const targetWidth =
      makeEven(width);

    const targetHeight =
      makeEven(height);

    if (
      targetWidth < 2 ||
      targetHeight < 2
    ) {
      setError(
        "Please enter valid dimensions."
      );

      return;
    }

    if (
      targetWidth > 7680 ||
      targetHeight > 4320
    ) {
      setError(
        "Maximum supported output size is 7680 × 4320."
      );

      return;
    }

    setWidth(targetWidth);
    setHeight(targetHeight);
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
      const resizeResult =
        await resizeVideo(
          file,
          {
            width:
              targetWidth,

            height:
              targetHeight,

            mode,

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
          resizeResult.file
        );

      resultUrlRef.current =
        url;

      setResult({
        ...resizeResult,
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
          "The video could not be resized."
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
    <section className="video-resizer-tool">
      <style>{`
        .video-resizer-tool {
          width: 100%;
          box-sizing: border-box;
          padding: 26px 30px 38px;
          color: rgba(255,255,255,.94);
        }

        .video-resizer-tool * {
          box-sizing: border-box;
        }

        .video-resizer-upload {
          position: relative;
        }

        .video-resizer-upload-input {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0,0,0,0);
          white-space: nowrap;
          border: 0;
        }

        .video-resizer-dropzone {
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

        .video-resizer-dropzone:hover {
          border-color: rgba(255,135,65,.32);
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(255,115,35,.13),
              transparent 52%
            ),
            rgba(255,255,255,.018);
        }

        .video-resizer-dropzone.dragging {
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

        .video-resizer-upload-content {
          text-align: center;
        }

        .video-resizer-upload-icon {
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

        .video-resizer-upload-eyebrow {
          color: rgba(255,255,255,.42);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .22em;
          text-transform: uppercase;
        }

        .video-resizer-upload-title {
          margin-top: 12px;
          font-size: 23px;
          font-weight: 700;
          letter-spacing: -.7px;
        }

        .video-resizer-upload-description {
          max-width: 500px;
          margin: 8px auto 0;
          color: rgba(255,255,255,.38);
          font-size: 12px;
          line-height: 1.6;
        }

        .video-resizer-browse {
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

        .video-resizer-upload-hint {
          margin-top: 11px;
          color: rgba(255,255,255,.24);
          font-size: 9px;
          letter-spacing: .06em;
        }

        .video-resizer-layout {
          display: grid;
          grid-template-columns: minmax(0,1.05fr) minmax(340px,.95fr);
          gap: 28px;
          align-items: start;
        }

        .video-resizer-preview {
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

        .video-resizer-preview video {
          display: block;
          width: 100%;
          height: 390px;
          object-fit: contain;
          background: #050505;
        }

        .video-resizer-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .video-resizer-card {
          padding: 18px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 18px;
          background: rgba(255,255,255,.025);
        }

        .video-resizer-label {
          display: block;
          margin-bottom: 13px;
          color: rgba(255,255,255,.38);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .2em;
          text-transform: uppercase;
        }

        .video-resizer-file {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .video-resizer-file-name {
          min-width: 0;
          font-size: 14px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .video-resizer-file-meta {
          margin-top: 5px;
          color: rgba(255,255,255,.40);
          font-size: 11px;
        }

        .video-resizer-remove {
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

        .video-resizer-dimensions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .video-resizer-field {
          position: relative;
        }

        .video-resizer-field label {
          display: block;
          margin-bottom: 7px;
          color: rgba(255,255,255,.37);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        .video-resizer-field input {
          width: 100%;
          min-height: 46px;
          padding: 0 13px;
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 11px;
          outline: none;
          background: rgba(255,255,255,.035);
          color: rgba(255,255,255,.90);
          font: inherit;
          font-size: 12px;
          font-weight: 700;
        }

        .video-resizer-field input:focus {
          border-color: rgba(255,125,50,.40);
          box-shadow:
            0 0 0 3px rgba(255,100,30,.07);
        }

        .video-resizer-presets {
          display: grid;
          grid-template-columns: repeat(4,minmax(0,1fr));
          gap: 8px;
        }

        .video-resizer-preset {
          min-height: 58px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 11px;
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.62);
          font: inherit;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .video-resizer-preset:hover {
          border-color: rgba(255,125,50,.24);
          background: rgba(255,255,255,.05);
        }

        .video-resizer-preset.active {
          border-color: rgba(255,125,50,.52);
          background: rgba(255,95,20,.09);
          color: white;
        }

        .video-resizer-preset strong {
          display: block;
          font-size: 12px;
        }

        .video-resizer-preset span {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,.34);
          font-size: 9px;
        }

        .video-resizer-modes {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 8px;
        }

        .video-resizer-mode {
          min-height: 86px;
          padding: 11px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 12px;
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.62);
          text-align: left;
          cursor: pointer;
        }

        .video-resizer-mode.active {
          border-color: rgba(255,125,50,.52);
          background: rgba(255,95,20,.09);
          color: white;
        }

        .video-resizer-mode strong {
          display: block;
          font-size: 11px;
        }

        .video-resizer-mode span {
          display: block;
          margin-top: 6px;
          color: rgba(255,255,255,.33);
          font-size: 9px;
          line-height: 1.45;
        }

        .video-resizer-mode.active span {
          color: rgba(255,255,255,.50);
        }

        .video-resizer-summary {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 8px;
        }

        .video-resizer-summary-item {
          padding: 11px;
          border-radius: 10px;
          background: rgba(255,255,255,.035);
        }

        .video-resizer-summary-item span {
          display: block;
          color: rgba(255,255,255,.32);
          font-size: 8px;
          letter-spacing: .1em;
          text-transform: uppercase;
        }

        .video-resizer-summary-item strong {
          display: block;
          margin-top: 4px;
          font-size: 11px;
        }

        .video-resizer-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
        }

        .video-resizer-secondary {
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

        .video-resizer-primary {
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

        .video-resizer-primary:disabled,
        .video-resizer-secondary:disabled,
        .video-resizer-remove:disabled {
          opacity: .42;
          cursor: not-allowed;
        }

        .video-resizer-progress {
          padding: 15px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 16px;
          background: rgba(255,255,255,.025);
        }

        .video-resizer-progress-top {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          font-size: 11px;
        }

        .video-resizer-progress-top span {
          color: rgba(255,255,255,.40);
        }

        .video-resizer-progress-track {
          height: 6px;
          margin-top: 10px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,.065);
        }

        .video-resizer-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #d9500f,
            #ff9942
          );
          transition: width .18s ease;
        }

        .video-resizer-error {
          padding: 13px 14px;
          border: 1px solid rgba(255,70,70,.18);
          border-radius: 12px;
          background: rgba(255,50,50,.05);
          color: rgba(255,184,184,.88);
          font-size: 11px;
          line-height: 1.5;
        }

        .video-resizer-result {
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

        .video-resizer-result-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .video-resizer-result-heading strong {
          font-size: 14px;
        }

        .video-resizer-result-grid {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 8px;
          margin-top: 13px;
        }

        .video-resizer-result-stat {
          padding: 10px;
          border-radius: 10px;
          background: rgba(255,255,255,.035);
        }

        .video-resizer-result-stat span {
          display: block;
          color: rgba(255,255,255,.32);
          font-size: 8px;
          letter-spacing: .1em;
          text-transform: uppercase;
        }

        .video-resizer-result-stat strong {
          display: block;
          margin-top: 4px;
          font-size: 11px;
        }

        .video-resizer-download {
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

        @media (max-width: 900px) {
          .video-resizer-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .video-resizer-presets {
            grid-template-columns: repeat(2,1fr);
          }

          .video-resizer-modes {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 650px) {
          .video-resizer-tool {
            padding: 20px 16px 28px;
          }

          .video-resizer-dropzone {
            min-height: 300px;
          }

          .video-resizer-preview video {
            height: 250px;
          }

          .video-resizer-summary,
          .video-resizer-result-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>

      {!file ? (
        <div className="video-resizer-upload">
          <input
            ref={inputRef}
            type="file"
            className="video-resizer-upload-input"
            accept="video/*,.mp4,.webm,.mov,.mkv,.avi,.m4v,.mpeg,.mpg"
            onChange={
              handleFileInput
            }
          />

          <div
            className={`video-resizer-dropzone ${
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
            onDrop={
              handleDrop
            }
            role="button"
            tabIndex={0}
            onKeyDown={(
              event
            ) => {
              if (
                event.key ===
                  "Enter" ||
                event.key ===
                  " "
              ) {
                event.preventDefault();
                handleBrowseClick();
              }
            }}
            aria-label="Upload video"
          >
            <div className="video-resizer-upload-content">
              <div className="video-resizer-upload-icon">
                ↗
              </div>

              <div className="video-resizer-upload-eyebrow">
                VIDEO RESIZER
              </div>

              <div className="video-resizer-upload-title">
                Drop your video here
              </div>

              <div className="video-resizer-upload-description">
                Resize your video to a custom
                resolution or a ready-made
                preset while preserving the
                original content.
              </div>

              <div className="video-resizer-browse">
                Choose Video
              </div>

              <div className="video-resizer-upload-hint">
                MP4 · WebM · MOV · AVI · MKV
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="video-resizer-layout">
          <div>
            <div className="video-resizer-preview">
              <video
                src={previewUrl}
                controls
                playsInline
                preload="metadata"
                style={
                  previewStyle
                }
              />
            </div>

            {result && (
              <div className="video-resizer-result">
                <div className="video-resizer-result-heading">
                  <strong>
                    Resize complete
                  </strong>

                  <span
                    style={{
                      color:
                        "#ffad75",
                      fontSize:
                        "11px",
                      fontWeight:
                        800,
                    }}
                  >
                    {result.savedPercentLabel}
                    {" "}
                    smaller
                  </span>
                </div>

                <div className="video-resizer-result-grid">
                  <div className="video-resizer-result-stat">
                    <span>
                      Original
                    </span>

                    <strong>
                      {result.originalWidth} ×{" "}
                      {result.originalHeight}
                    </strong>
                  </div>

                  <div className="video-resizer-result-stat">
                    <span>
                      Output
                    </span>

                    <strong>
                      {result.outputWidth} ×{" "}
                      {result.outputHeight}
                    </strong>
                  </div>

                  <div className="video-resizer-result-stat">
                    <span>
                      Original Size
                    </span>

                    <strong>
                      {result.originalSizeLabel}
                    </strong>
                  </div>

                  <div className="video-resizer-result-stat">
                    <span>
                      Output Size
                    </span>

                    <strong>
                      {result.outputSizeLabel}
                    </strong>
                  </div>

                  <div className="video-resizer-result-stat">
                    <span>
                      Saved
                    </span>

                    <strong>
                      {result.savedBytesLabel}
                    </strong>
                  </div>

                  <div className="video-resizer-result-stat">
                    <span>
                      Mode
                    </span>

                    <strong>
                      {result.mode}
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="video-resizer-download"
                  onClick={
                    downloadResult
                  }
                >
                  Download Resized Video
                </button>
              </div>
            )}
          </div>

          <div className="video-resizer-panel">
            <div className="video-resizer-card">
              <span className="video-resizer-label">
                Selected Video
              </span>

              <div className="video-resizer-file">
                <div
                  style={{
                    minWidth: 0,
                  }}
                >
                  <div className="video-resizer-file-name">
                    {file.name}
                  </div>

                  <div className="video-resizer-file-meta">
                    {formatBytes(
                      file.size
                    )}{" "}
                    ·{" "}
                    {info?.width || "—"} ×{" "}
                    {info?.height || "—"}{" "}
                    ·{" "}
                    {formatDuration(
                      info?.duration ||
                        0
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className="video-resizer-remove"
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

            <div className="video-resizer-card">
              <span className="video-resizer-label">
                Dimensions
              </span>

              <div className="video-resizer-dimensions">
                <div className="video-resizer-field">
                  <label htmlFor="video-resizer-width">
                    Width
                  </label>

                  <input
                    id="video-resizer-width"
                    type="number"
                    min="2"
                    max="7680"
                    step="2"
                    value={width}
                    onChange={(
                      event
                    ) =>
                      handleWidthChange(
                        event.target
                          .value
                      )
                    }
                    disabled={
                      isProcessing
                    }
                  />
                </div>

                <div className="video-resizer-field">
                  <label htmlFor="video-resizer-height">
                    Height
                  </label>

                  <input
                    id="video-resizer-height"
                    type="number"
                    min="2"
                    max="4320"
                    step="2"
                    value={height}
                    onChange={(
                      event
                    ) =>
                      handleHeightChange(
                        event.target
                          .value
                      )
                    }
                    disabled={
                      isProcessing
                    }
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop:
                    "10px",
                  color:
                    "rgba(255,255,255,.32)",
                  fontSize:
                    "9px",
                }}
              >
                Target:{" "}
                {dimensionsLabel}
                {" · "}
                {targetMegapixels}
                {" MP"}
              </div>
            </div>

            <div className="video-resizer-card">
              <span className="video-resizer-label">
                Presets
              </span>

              <div className="video-resizer-presets">
                {PRESETS.map(
                  (preset) => (
                    <button
                      key={
                        preset.id
                      }
                      type="button"
                      className={`video-resizer-preset ${
                        presetMatch?.id ===
                        preset.id
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        applyPreset(
                          preset
                        )
                      }
                      disabled={
                        isProcessing
                      }
                    >
                      <strong>
                        {
                          preset.label
                        }
                      </strong>

                      <span>
                        {
                          preset.width
                        }{" "}
                        ×{" "}
                        {
                          preset.height
                        }
                      </span>
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="video-resizer-card">
              <span className="video-resizer-label">
                Resize Behaviour
              </span>

              <div className="video-resizer-modes">
                {MODES.map(
                  (resizeMode) => (
                    <button
                      key={
                        resizeMode.id
                      }
                      type="button"
                      className={`video-resizer-mode ${
                        mode ===
                        resizeMode.id
                          ? "active"
                          : ""
                      }`}
                      onClick={() => {
                        setMode(
                          resizeMode.id
                        );

                        setResult(
                          null
                        );

                        setStatus(
                          file
                            ? "ready"
                            : "idle"
                        );
                      }}
                      disabled={
                        isProcessing
                      }
                    >
                      <strong>
                        {
                          resizeMode.title
                        }
                      </strong>

                      <span>
                        {
                          resizeMode.description
                        }
                      </span>
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="video-resizer-card">
              <span className="video-resizer-label">
                Summary
              </span>

              <div className="video-resizer-summary">
                <div className="video-resizer-summary-item">
                  <span>
                    Original
                  </span>

                  <strong>
                    {info?.width ||
                      "—"}{" "}
                    ×{" "}
                    {info?.height ||
                      "—"}
                  </strong>
                </div>

                <div className="video-resizer-summary-item">
                  <span>
                    Output
                  </span>

                  <strong>
                    {
                      dimensionsLabel
                    }
                  </strong>
                </div>

                <div className="video-resizer-summary-item">
                  <span>
                    Aspect
                  </span>

                  <strong>
                    {aspectRatioText}
                  </strong>
                </div>
              </div>
            </div>

            <div className="video-resizer-actions">
              <button
                type="button"
                className="video-resizer-secondary"
                onClick={
                  resetDimensions
                }
                disabled={
                  isProcessing
                }
              >
                Reset
              </button>

              <button
                type="button"
                className="video-resizer-secondary"
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
              <div className="video-resizer-progress">
                <div className="video-resizer-progress-top">
                  <span>
                    {phase ===
                    "loading"
                      ? "Loading resize engine..."
                      : phase ===
                        "finalizing"
                      ? "Finalizing video..."
                      : "Resizing video..."}
                  </span>

                  <strong>
                    {progress}%
                  </strong>
                </div>

                <div className="video-resizer-progress-track">
                  <div
                    className="video-resizer-progress-fill"
                    style={{
                      width:
                        `${progress}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="video-resizer-error">
                {error}
              </div>
            )}

            <button
              type="button"
              className="video-resizer-primary"
              onClick={
                handleResize
              }
              disabled={
                isProcessing ||
                !file
              }
            >
              {isProcessing
                ? "Resizing Video..."
                : "Resize Video"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default VideoResizer;