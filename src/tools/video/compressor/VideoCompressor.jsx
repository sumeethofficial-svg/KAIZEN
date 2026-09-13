import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  compressVideo,
  formatTime,
  getCompressVideoInfo,
  getCompressionPresets,
  getResolutionOptions,
} from "../../../services/video/compressVideo.js";

const COMPRESSION_PRESETS =
  getCompressionPresets();

const RESOLUTION_OPTIONS =
  getResolutionOptions();

function formatBytes(
  bytes
) {
  if (!bytes) {
    return "0 B";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
  ];

  let value = bytes;
  let index = 0;

  while (
    value >= 1024 &&
    index <
      units.length - 1
  ) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(
    value >= 10 ? 0 : 1
  )} ${units[index]}`;
}

function downloadBlob(
  blob,
  fileName
) {
  const url =
    URL.createObjectURL(
      blob
    );

  const anchor =
    document.createElement(
      "a"
    );

  anchor.href =
    url;

  anchor.download =
    fileName;

  document.body.appendChild(
    anchor
  );

  anchor.click();

  anchor.remove();

  window.setTimeout(
    () => {
      URL.revokeObjectURL(
        url
      );
    },
    1000
  );
}

function getSavingsLabel(
  percent
) {
  if (
    !Number.isFinite(
      percent
    )
  ) {
    return "0%";
  }

  return `${percent.toFixed(
    1
  )}%`;
}

export default function VideoCompressor() {
  const fileInputRef =
    useRef(null);

  const previewURLRef =
    useRef(null);

  const [
    videoFile,
    setVideoFile,
  ] = useState(null);

  const [
    videoInfo,
    setVideoInfo,
  ] = useState(null);

  const [
    compression,
    setCompression,
  ] = useState(
    "balanced"
  );

  const [
    resolution,
    setResolution,
  ] = useState(
    "original"
  );

  const [
    isProcessing,
    setIsProcessing,
  ] = useState(false);

  const [
    progress,
    setProgress,
  ] = useState(0);

  const [
    status,
    setStatus,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    result,
    setResult,
  ] = useState(null);

  useEffect(() => {
    return () => {
      if (
        previewURLRef.current
      ) {
        URL.revokeObjectURL(
          previewURLRef.current
        );
      }
    };
  }, []);

  function clearPreviewURL() {
    if (
      previewURLRef.current
    ) {
      URL.revokeObjectURL(
        previewURLRef.current
      );

      previewURLRef.current =
        null;
    }
  }

  async function loadVideo(
    file
  ) {
    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "video/"
      )
    ) {
      setError(
        "Please select a video file."
      );

      return;
    }

    setError("");
    setResult(null);
    setProgress(0);
    setStatus(
      "Reading video..."
    );

    clearPreviewURL();

    try {
      const info =
        await getCompressVideoInfo(
          file
        );

      const previewURL =
        URL.createObjectURL(
          file
        );

      previewURLRef.current =
        previewURL;

      setVideoFile(file);
      setVideoInfo(info);

      /*
       * Automatically pick a sensible
       * target resolution when the source
       * is smaller than the selected option.
       */
      setResolution(
        "original"
      );

      setStatus(
        "Video ready."
      );
    } catch (loadError) {
      setVideoFile(null);
      setVideoInfo(null);

      setError(
        loadError?.message ||
          "Unable to read this video."
      );

      setStatus("");
    }
  }

  async function handleFileChange(
    event
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    await loadVideo(
      file
    );

    event.target.value =
      "";
  }

  function handleDrop(
    event
  ) {
    event.preventDefault();

    const file =
      event.dataTransfer.files?.[0];

    if (file) {
      loadVideo(file);
    }
  }

  function handleDragOver(
    event
  ) {
    event.preventDefault();
  }

  function clearVideo() {
    clearPreviewURL();

    setVideoFile(null);
    setVideoInfo(null);
    setResult(null);
    setProgress(0);
    setStatus("");
    setError("");
    setResolution(
      "original"
    );
    setCompression(
      "balanced"
    );
  }

  async function handleCompress() {
    if (!videoFile) {
      setError(
        "Select a video first."
      );

      return;
    }

    setError("");
    setResult(null);
    setProgress(0);
    setStatus(
      "Preparing compression..."
    );

    setIsProcessing(
      true
    );

    try {
      const output =
        await compressVideo(
          videoFile,
          {
            compression,
            resolution,
            outputFormat:
              "mp4",

            onProgress: ({
              progress:
                nextProgress,
              message,
            }) => {
              if (
                Number.isFinite(
                  nextProgress
                )
              ) {
                setProgress(
                  nextProgress
                );
              }

              if (message) {
                setStatus(
                  message
                );
              }
            },
          }
        );

      setResult(
        output
      );

      setProgress(
        100
      );

      setStatus(
        "Compressed video ready."
      );
    } catch (
      compressionError
    ) {
      setError(
        compressionError?.message ||
          "Unable to compress this video."
      );

      setStatus("");
      setProgress(
        0
      );
    } finally {
      setIsProcessing(
        false
      );
    }
  }

  const selectedPreset =
    COMPRESSION_PRESETS[
      compression
    ];

  const selectedResolution =
    RESOLUTION_OPTIONS[
      resolution
    ];

  return (
    <div className="video-compressor-tool">
      <style>{`
        .video-compressor-tool {
          width: 100%;

          box-sizing:
            border-box;

          padding:
            26px
            30px
            38px;

          color:
            rgba(255,255,255,.94);
        }

        /*
         * =====================================================
         * MAIN LAYOUT
         * =====================================================
         */

        .video-compressor-layout {
          display:
            grid;

          grid-template-columns:
            minmax(0,1.25fr)
            minmax(320px,.75fr);

          gap:
            20px;
        }

        .video-compressor-panel,
        .video-compressor-settings,
        .video-compressor-result {
          border:
            1px solid
            rgba(255,255,255,.09);

          border-radius:
            18px;

          background:
            rgba(255,255,255,.035);

          backdrop-filter:
            blur(16px);

          -webkit-backdrop-filter:
            blur(16px);

          box-shadow:
            0
            16px
            50px
            rgba(0,0,0,.2);
        }

        /*
         * =====================================================
         * HEADER
         * =====================================================
         */

        .video-compressor-header {
          min-height:
            55px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          gap:
            12px;

          padding:
            11px
            17px;

          border-bottom:
            1px solid
            rgba(255,255,255,.07);
        }

        .video-compressor-title {
          margin:
            0;

          color:
            rgba(255,255,255,.72);

          font-size:
            12px;

          font-weight:
            700;

          letter-spacing:
            .1em;

          text-transform:
            uppercase;
        }

        .video-compressor-meta {
          color:
            rgba(255,255,255,.34);

          font-size:
            10px;
        }

        /*
         * =====================================================
         * UPLOAD
         * =====================================================
         */

        .video-compressor-upload {
          min-height:
            420px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          padding:
            26px;
        }

        .video-compressor-dropzone {
          width:
            100%;

          min-height:
            320px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          flex-direction:
            column;

          text-align:
            center;

          border:
            1px dashed
            rgba(255,255,255,.15);

          border-radius:
            17px;

          background:
            rgba(0,0,0,.13);

          transition:
            border-color .2s ease,
            background .2s ease,
            transform .2s ease;
        }

        .video-compressor-dropzone:hover {
          border-color:
            rgba(249,115,22,.38);

          background:
            rgba(249,115,22,.035);

          transform:
            translateY(-1px);
        }

        .video-compressor-icon {
          width:
            60px;

          height:
            60px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          margin-bottom:
            15px;

          border:
            1px solid
            rgba(249,115,22,.22);

          border-radius:
            17px;

          background:
            rgba(249,115,22,.09);

          color:
            #fb923c;

          font-size:
            25px;

          box-shadow:
            0
            0
            30px
            rgba(249,115,22,.08);
        }

        .video-compressor-drop-title {
          margin:
            0
            0
            7px;

          font-size:
            16px;

          font-weight:
            700;
        }

        .video-compressor-drop-description {
          max-width:
            360px;

          margin:
            0
            0
            17px;

          color:
            rgba(255,255,255,.4);

          font-size:
            12px;

          line-height:
            1.55;
        }

        .video-compressor-file-input {
          display:
            none;
        }

        .video-compressor-browse {
          display:
            inline-flex;

          align-items:
            center;

          justify-content:
            center;

          padding:
            10px
            15px;

          border:
            1px solid
            rgba(249,115,22,.35);

          border-radius:
            10px;

          background:
            rgba(249,115,22,.1);

          color:
            #fdba74;

          font-size:
            12px;

          font-weight:
            700;

          cursor:
            pointer;
        }

        /*
         * =====================================================
         * VIDEO PREVIEW
         * =====================================================
         */

        .video-compressor-preview {
          padding:
            18px;
        }

        .video-compressor-video-wrap {
          position:
            relative;

          width:
            100%;

          overflow:
            hidden;

          border:
            1px solid
            rgba(255,255,255,.07);

          border-radius:
            13px;

          background:
            #050505;
        }

        .video-compressor-video {
          display:
            block;

          width:
            100%;

          max-height:
            470px;

          object-fit:
            contain;

          background:
            #050505;
        }

        /*
         * =====================================================
         * FILE INFO
         * =====================================================
         */

        .video-compressor-info {
          display:
            grid;

          grid-template-columns:
            repeat(
              3,
              minmax(0,1fr)
            );

          gap:
            8px;

          padding:
            0
            18px
            18px;
        }

        .video-compressor-stat {
          min-width:
            0;

          padding:
            11px;

          border:
            1px solid
            rgba(255,255,255,.07);

          border-radius:
            10px;

          background:
            rgba(0,0,0,.12);
        }

        .video-compressor-stat-label {
          margin-bottom:
            5px;

          color:
            rgba(255,255,255,.33);

          font-size:
            8px;

          font-weight:
            700;

          letter-spacing:
            .08em;

          text-transform:
            uppercase;
        }

        .video-compressor-stat-value {
          overflow:
            hidden;

          text-overflow:
            ellipsis;

          white-space:
            nowrap;

          color:
            rgba(255,255,255,.8);

          font-size:
            11px;

          font-weight:
            700;
        }

        /*
         * =====================================================
         * SETTINGS
         * =====================================================
         */

        .video-compressor-settings {
          padding:
            18px;
        }

        .video-compressor-setting {
          margin-top:
            16px;
        }

        .video-compressor-setting-label {
          margin-bottom:
            8px;

          color:
            rgba(255,255,255,.42);

          font-size:
            9px;

          font-weight:
            700;

          letter-spacing:
            .1em;

          text-transform:
            uppercase;
        }

        /*
         * =====================================================
         * COMPRESSION CARDS
         * =====================================================
         */

        .video-compressor-presets {
          display:
            grid;

          grid-template-columns:
            1fr;

          gap:
            7px;
        }

        .video-compressor-preset {
          position:
            relative;

          width:
            100%;

          padding:
            11px
            12px;

          border:
            1px solid
            rgba(255,255,255,.08);

          border-radius:
            10px;

          background:
            rgba(255,255,255,.03);

          color:
            rgba(255,255,255,.7);

          text-align:
            left;

          cursor:
            pointer;

          transition:
            border-color .18s ease,
            background .18s ease,
            transform .18s ease;
        }

        .video-compressor-preset:hover {
          border-color:
            rgba(249,115,22,.25);

          background:
            rgba(249,115,22,.035);

          transform:
            translateY(-1px);
        }

        .video-compressor-preset.active {
          border-color:
            rgba(249,115,22,.5);

          background:
            rgba(249,115,22,.075);

          box-shadow:
            0
            0
            20px
            rgba(249,115,22,.05);
        }

        .video-compressor-preset-name {
          display:
            block;

          margin-bottom:
            4px;

          color:
            rgba(255,255,255,.84);

          font-size:
            11px;

          font-weight:
            800;
        }

        .video-compressor-preset-description {
          color:
            rgba(255,255,255,.34);

          font-size:
            9px;

          line-height:
            1.45;
        }

        .video-compressor-preset-check {
          position:
            absolute;

          top:
            10px;

          right:
            10px;

          width:
            17px;

          height:
            17px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          border:
            1px solid
            rgba(255,255,255,.1);

          border-radius:
            50%;

          color:
            transparent;

          font-size:
            9px;
        }

        .video-compressor-preset.active
        .video-compressor-preset-check {
          border-color:
            rgba(249,115,22,.5);

          background:
            rgba(249,115,22,.8);

          color:
            #ffffff;
        }

        /*
         * =====================================================
         * RESOLUTION SELECTOR
         * =====================================================
         */

        .video-compressor-resolution-grid {
          display:
            grid;

          grid-template-columns:
            repeat(
              4,
              minmax(0,1fr)
            );

          gap:
            6px;
        }

        .video-compressor-resolution {
          min-height:
            41px;

          border:
            1px solid
            rgba(255,255,255,.08);

          border-radius:
            9px;

          background:
            rgba(255,255,255,.03);

          color:
            rgba(255,255,255,.45);

          font-size:
            9px;

          font-weight:
            700;

          cursor:
            pointer;
        }

        .video-compressor-resolution:hover {
          border-color:
            rgba(249,115,22,.25);

          color:
            rgba(255,255,255,.72);
        }

        .video-compressor-resolution.active {
          border-color:
            rgba(249,115,22,.48);

          background:
            rgba(249,115,22,.08);

          color:
            #fdba74;
        }

        /*
         * =====================================================
         * SELECTED SUMMARY
         * =====================================================
         */

        .video-compressor-selection-summary {
          margin-top:
            16px;

          padding:
            13px;

          border:
            1px solid
            rgba(249,115,22,.13);

          border-radius:
            11px;

          background:
            rgba(249,115,22,.025);
        }

        .video-compressor-summary-title {
          margin:
            0
            0
            8px;

          color:
            rgba(255,255,255,.65);

          font-size:
            9px;

          font-weight:
            700;

          letter-spacing:
            .08em;

          text-transform:
            uppercase;
        }

        .video-compressor-summary-value {
          color:
            #fdba74;

          font-size:
            11px;

          font-weight:
            700;

          line-height:
            1.5;
        }

        /*
         * =====================================================
         * ACTIONS
         * =====================================================
         */

        .video-compressor-actions {
          display:
            flex;

          gap:
            8px;

          margin-top:
            16px;
        }

        .video-compressor-button {
          flex:
            1;

          min-height:
            42px;

          padding:
            10px
            13px;

          border:
            1px solid
            rgba(255,255,255,.1);

          border-radius:
            10px;

          background:
            rgba(255,255,255,.05);

          color:
            rgba(255,255,255,.8);

          font-size:
            10px;

          font-weight:
            700;

          cursor:
            pointer;
        }

        .video-compressor-button.primary {
          border-color:
            rgba(249,115,22,.42);

          background:
            linear-gradient(
              135deg,
              rgba(249,115,22,.96),
              rgba(234,88,12,.78)
            );

          color:
            #ffffff;

          box-shadow:
            0
            10px
            28px
            rgba(249,115,22,.13);
        }

        .video-compressor-button:disabled {
          opacity:
            .45;

          cursor:
            not-allowed;
        }

        /*
         * =====================================================
         * PROGRESS
         * =====================================================
         */

        .video-compressor-progress {
          margin-top:
            15px;
        }

        .video-compressor-progress-track {
          height:
            6px;

          overflow:
            hidden;

          border-radius:
            999px;

          background:
            rgba(255,255,255,.08);
        }

        .video-compressor-progress-fill {
          height:
            100%;

          border-radius:
            inherit;

          background:
            linear-gradient(
              90deg,
              #f97316,
              #fb923c
            );

          transition:
            width .2s ease;
        }

        .video-compressor-progress-text {
          margin-top:
            7px;

          color:
            rgba(255,255,255,.4);

          font-size:
            9px;
        }

        /*
         * =====================================================
         * ERROR
         * =====================================================
         */

        .video-compressor-error {
          margin-top:
            13px;

          padding:
            11px
            13px;

          border:
            1px solid
            rgba(248,113,113,.24);

          border-radius:
            10px;

          background:
            rgba(127,29,29,.18);

          color:
            #fecaca;

          font-size:
            10px;

          line-height:
            1.5;
        }

        /*
         * =====================================================
         * RESULT
         * =====================================================
         */

        .video-compressor-result {
          grid-column:
            1 / -1;

          padding:
            18px;
        }

        .video-compressor-result-title {
          margin:
            0
            0
            8px;

          color:
            rgba(255,255,255,.9);

          font-size:
            14px;

          font-weight:
            700;
        }

        .video-compressor-result-file {
          color:
            rgba(255,255,255,.38);

          font-size:
            10px;

          overflow:
            hidden;

          text-overflow:
            ellipsis;

          white-space:
            nowrap;
        }

        .video-compressor-result-stats {
          display:
            grid;

          grid-template-columns:
            repeat(
              4,
              minmax(0,1fr)
            );

          gap:
            9px;

          margin-top:
            15px;
        }

        .video-compressor-result-stat {
          padding:
            12px;

          border:
            1px solid
            rgba(255,255,255,.07);

          border-radius:
            10px;

          background:
            rgba(0,0,0,.12);
        }

        .video-compressor-result-stat-label {
          margin-bottom:
            5px;

          color:
            rgba(255,255,255,.32);

          font-size:
            8px;

          font-weight:
            700;

          letter-spacing:
            .08em;

          text-transform:
            uppercase;
        }

        .video-compressor-result-stat-value {
          color:
            rgba(255,255,255,.86);

          font-size:
            13px;

          font-weight:
            800;
        }

        .video-compressor-result-stat-value.saved {
          color:
            #fb923c;
        }

        /*
         * =====================================================
         * RESPONSIVE
         * =====================================================
         */

        @media (max-width: 950px) {
          .video-compressor-layout {
            grid-template-columns:
              1fr;
          }

          .video-compressor-result {
            grid-column:
              auto;
          }
        }

        @media (max-width: 680px) {
          .video-compressor-tool {
            padding:
              22px
              18px
              30px;
          }

          .video-compressor-info {
            grid-template-columns:
              1fr;
          }

          .video-compressor-result-stats {
            grid-template-columns:
              repeat(
                2,
                minmax(0,1fr)
              );
          }

          .video-compressor-resolution-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0,1fr)
              );
          }
        }
      `}</style>

      <div className="video-compressor-layout">

        {/* ==================================================
            LEFT — VIDEO
        ================================================== */}

        <section className="video-compressor-panel">
          <div className="video-compressor-header">
            <h2 className="video-compressor-title">
              Video Compressor
            </h2>

            <span className="video-compressor-meta">
              Local processing
            </span>
          </div>

          {!videoFile ? (
            <div className="video-compressor-upload">
              <div
                className="video-compressor-dropzone"
                onDrop={handleDrop}
                onDragOver={
                  handleDragOver
                }
              >
                <div className="video-compressor-icon">
                  ↓
                </div>

                <h3 className="video-compressor-drop-title">
                  Drop a video here
                </h3>

                <p className="video-compressor-drop-description">
                  Compress your video directly in
                  your browser and see exactly how
                  much space was saved.
                </p>

                <input
                  ref={fileInputRef}
                  id="kaizen-video-compressor-input"
                  className="video-compressor-file-input"
                  type="file"
                  accept="video/*"
                  onChange={
                    handleFileChange
                  }
                />

                <label
                  htmlFor="kaizen-video-compressor-input"
                  className="video-compressor-browse"
                >
                  Choose Video
                </label>
              </div>
            </div>
          ) : (
            <>
              <div className="video-compressor-preview">
                <div className="video-compressor-video-wrap">
                  <video
                    className="video-compressor-video"
                    src={
                      previewURLRef.current ||
                      undefined
                    }
                    controls
                    preload="metadata"
                  />
                </div>
              </div>

              <div className="video-compressor-info">
                <div className="video-compressor-stat">
                  <div className="video-compressor-stat-label">
                    File
                  </div>

                  <div className="video-compressor-stat-value">
                    {
                      videoFile.name
                    }
                  </div>
                </div>

                <div className="video-compressor-stat">
                  <div className="video-compressor-stat-label">
                    Size
                  </div>

                  <div className="video-compressor-stat-value">
                    {formatBytes(
                      videoInfo.fileSize
                    )}
                  </div>
                </div>

                <div className="video-compressor-stat">
                  <div className="video-compressor-stat-label">
                    Duration
                  </div>

                  <div className="video-compressor-stat-value">
                    {formatTime(
                      videoInfo.duration
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        {/* ==================================================
            RIGHT — SETTINGS
        ================================================== */}

        <section className="video-compressor-settings">
          <div
            className="video-compressor-header"
            style={{
              padding:
                0,

              border:
                0,

              minHeight:
                0,
            }}
          >
            <h2 className="video-compressor-title">
              Compression
            </h2>
          </div>

          {/* ================================================
              QUALITY
          ================================================= */}

          <div className="video-compressor-setting">
            <div className="video-compressor-setting-label">
              Compression level
            </div>

            <div className="video-compressor-presets">
              {Object.entries(
                COMPRESSION_PRESETS
              ).map(
                ([
                  key,
                  preset,
                ]) => (
                  <button
                    type="button"
                    key={
                      key
                    }
                    className={`video-compressor-preset ${
                      compression ===
                      key
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setCompression(
                        key
                      )
                    }
                    disabled={
                      isProcessing
                    }
                  >
                    <span className="video-compressor-preset-name">
                      {
                        preset.label
                      }
                    </span>

                    <span className="video-compressor-preset-description">
                      {
                        preset.description
                      }
                    </span>

                    <span className="video-compressor-preset-check">
                      ✓
                    </span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* ================================================
              RESOLUTION
          ================================================= */}

          <div className="video-compressor-setting">
            <div className="video-compressor-setting-label">
              Output resolution
            </div>

            <div className="video-compressor-resolution-grid">
              {Object.entries(
                RESOLUTION_OPTIONS
              ).map(
                ([
                  key,
                  option,
                ]) => (
                  <button
                    type="button"
                    key={
                      key
                    }
                    className={`video-compressor-resolution ${
                      resolution ===
                      key
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setResolution(
                        key
                      )
                    }
                    disabled={
                      isProcessing
                    }
                  >
                    {
                      option.label
                    }
                  </button>
                )
              )}
            </div>
          </div>

          {/* ================================================
              SUMMARY
          ================================================= */}

          {videoInfo && (
            <>
              <div className="video-compressor-selection-summary">
                <div className="video-compressor-summary-title">
                  Selected settings
                </div>

                <div className="video-compressor-summary-value">
                  {
                    selectedPreset.label
                  }
                  {" · "}
                  {
                    selectedResolution.label
                  }
                  {" · MP4"}
                </div>
              </div>

              <div className="video-compressor-actions">
                <button
                  type="button"
                  className="video-compressor-button"
                  onClick={
                    clearVideo
                  }
                  disabled={
                    isProcessing
                  }
                >
                  Replace Video
                </button>

                <button
                  type="button"
                  className="video-compressor-button primary"
                  onClick={
                    handleCompress
                  }
                  disabled={
                    isProcessing
                  }
                >
                  {isProcessing
                    ? "Compressing..."
                    : "Compress Video"}
                </button>
              </div>
            </>
          )}

          {/* ================================================
              PROGRESS
          ================================================= */}

          {(isProcessing ||
            progress > 0) && (
            <div className="video-compressor-progress">
              <div className="video-compressor-progress-track">
                <div
                  className="video-compressor-progress-fill"
                  style={{
                    width:
                      `${progress}%`,
                  }}
                />
              </div>

              <div className="video-compressor-progress-text">
                {status ||
                  `${progress}%`}
              </div>
            </div>
          )}

          {/* ================================================
              ERROR
          ================================================= */}

          {error && (
            <div className="video-compressor-error">
              {error}
            </div>
          )}
        </section>

        {/* ==================================================
            RESULT
        ================================================== */}

        {result && (
          <section className="video-compressor-result">
            <h3 className="video-compressor-result-title">
              Compression complete
            </h3>

            <div className="video-compressor-result-file">
              {
                result.fileName
              }
            </div>

            <div className="video-compressor-result-stats">
              <div className="video-compressor-result-stat">
                <div className="video-compressor-result-stat-label">
                  Original
                </div>

                <div className="video-compressor-result-stat-value">
                  {formatBytes(
                    result.originalSize
                  )}
                </div>
              </div>

              <div className="video-compressor-result-stat">
                <div className="video-compressor-result-stat-label">
                  Compressed
                </div>

                <div className="video-compressor-result-stat-value">
                  {formatBytes(
                    result.compressedSize
                  )}
                </div>
              </div>

              <div className="video-compressor-result-stat">
                <div className="video-compressor-result-stat-label">
                  Saved
                </div>

                <div className="video-compressor-result-stat-value saved">
                  {getSavingsLabel(
                    result.savedPercent
                  )}
                </div>
              </div>

              <div className="video-compressor-result-stat">
                <div className="video-compressor-result-stat-label">
                  Resolution
                </div>

                <div className="video-compressor-result-stat-value">
                  {
                    result.outputWidth
                  }
                  ×
                  {
                    result.outputHeight
                  }
                </div>
              </div>
            </div>

            <div className="video-compressor-actions">
              <button
                type="button"
                className="video-compressor-button primary"
                onClick={() =>
                  downloadBlob(
                    result.blob,
                    result.fileName
                  )
                }
              >
                Download Compressed Video
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}