import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  audioToPdf,
  getAudioInfo,
} from "../../../services/conversion/audioToPdf.js";

function formatBytes(bytes) {
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
  let unitIndex = 0;

  while (
    value >= 1024 &&
    unitIndex < units.length - 1
  ) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(
    value >= 10 ? 0 : 1
  )} ${units[unitIndex]}`;
}

function formatDuration(seconds) {
  if (
    !Number.isFinite(seconds) ||
    seconds < 0
  ) {
    return "Unknown";
  }

  const total =
    Math.floor(seconds);

  const hours =
    Math.floor(total / 3600);

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

function downloadBlob(
  blob,
  fileName
) {
  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;

  document.body.appendChild(anchor);

  anchor.click();

  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export default function AudioToPdf() {
  const [
    audioFile,
    setAudioFile,
  ] = useState(null);

  const [
    audioInfo,
    setAudioInfo,
  ] = useState(null);

  const [
    title,
    setTitle,
  ] = useState("Audio Report");

  const [
    fileName,
    setFileName,
  ] = useState("audio-report.pdf");

  const [
    pageSize,
    setPageSize,
  ] = useState("a4");

  const [
    orientation,
    setOrientation,
  ] = useState("portrait");

  const [
    margin,
    setMargin,
  ] = useState(34);

  const [
    includeMetadata,
    setIncludeMetadata,
  ] = useState(true);

  const [
    includeWaveform,
    setIncludeWaveform,
  ] = useState(true);

  const [
    showTechnicalDetails,
    setShowTechnicalDetails,
  ] = useState(true);

  const [
    isAnalyzing,
    setIsAnalyzing,
  ] = useState(false);

  const [
    isProcessing,
    setIsProcessing,
  ] = useState(false);

  const [
    progress,
    setProgress,
  ] = useState(0);

  const [
    statusMessage,
    setStatusMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    result,
    setResult,
  ] = useState(null);

  const audioInputRef =
    useRef(null);

  useEffect(() => {
    return () => {
      setAudioInfo(null);
      setAudioFile(null);
    };
  }, []);

  async function analyzeFile(file) {
    if (!file) {
      return;
    }

    setError("");
    setResult(null);
    setAudioInfo(null);
    setIsAnalyzing(true);
    setStatusMessage(
      "Analyzing audio..."
    );

    try {
      const info =
        await getAudioInfo(file);

      setAudioFile(file);
      setAudioInfo(info);

      const baseName =
        file.name.replace(
          /\.[^/.]+$/,
          ""
        );

      setFileName(
        `${baseName}-audio-report.pdf`
      );

      setStatusMessage(
        "Audio analysis complete."
      );
    } catch (analysisError) {
      setAudioFile(null);
      setAudioInfo(null);

      setError(
        analysisError?.message ||
          "Unable to analyze this audio file."
      );

      setStatusMessage("");
    } finally {
      setIsAnalyzing(false);
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

    await analyzeFile(file);

    event.target.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();

    const file =
      event.dataTransfer.files?.[0];

    if (!file) {
      return;
    }

    analyzeFile(file);
  }

  function handleDragOver(event) {
    event.preventDefault();
  }

  function clearFile() {
    setAudioFile(null);
    setAudioInfo(null);
    setResult(null);
    setError("");
    setProgress(0);
    setStatusMessage("");
  }

  async function handleGenerate() {
    if (!audioFile) {
      setError(
        "Select an audio file first."
      );
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setError("");
    setResult(null);

    try {
      const output =
        await audioToPdf(
          audioFile,
          {
            fileName,
            title,
            pageSize,
            orientation,
            margin,
            includeMetadata,
            includeWaveform,
            showTechnicalDetails,

            onProgress: ({
              progress:
                nextProgress,
              message,
            }) => {
              setProgress(
                nextProgress
              );

              setStatusMessage(
                message
              );
            },
          }
        );

      setResult(output);

      setProgress(100);

      setStatusMessage(
        "PDF generated successfully."
      );
    } catch (generationError) {
      setError(
        generationError?.message ||
          "Something went wrong while generating the PDF."
      );

      setProgress(0);

      setStatusMessage("");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="audio-to-pdf-tool">
      <style>{`
        .audio-to-pdf-tool {
          width: 100%;
          box-sizing: border-box;
          padding: 26px 30px 38px;
          color: rgba(255,255,255,.94);
        }

        .audio-layout {
          display: grid;
          grid-template-columns:
            minmax(0, 1.05fr)
            minmax(360px, .95fr);
          gap: 22px;
        }

        .audio-panel,
        .audio-info-panel,
        .audio-settings,
        .audio-result {
          border:
            1px solid
            rgba(255,255,255,.09);

          border-radius: 18px;

          background:
            rgba(255,255,255,.035);

          backdrop-filter: blur(16px);

          box-shadow:
            0 14px 40px
            rgba(0,0,0,.18);
        }

        .audio-panel,
        .audio-info-panel {
          overflow: hidden;
        }

        .audio-header {
          min-height: 58px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 12px;

          padding:
            12px
            18px;

          border-bottom:
            1px solid
            rgba(255,255,255,.07);
        }

        .audio-header-left {
          display: flex;
          align-items: center;
          gap: 12px;

          min-width: 0;
        }

        .audio-title {
          margin: 0;

          font-size: 13px;
          font-weight: 700;

          letter-spacing: .08em;

          text-transform:
            uppercase;

          color:
            rgba(255,255,255,.78);
        }

        .audio-meta {
          font-size: 12px;

          color:
            rgba(255,255,255,.4);

          white-space: nowrap;
        }

        .audio-upload-area {
          min-height: 380px;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 30px;
        }

        .audio-dropzone {
          width: 100%;
          min-height: 300px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          text-align: center;

          border:
            1px dashed
            rgba(255,255,255,.14);

          border-radius: 18px;

          background:
            rgba(0,0,0,.14);

          transition:
            border-color .18s ease,
            background .18s ease,
            transform .18s ease;
        }

        .audio-dropzone:hover {
          border-color:
            rgba(249,115,22,.38);

          background:
            rgba(249,115,22,.035);
        }

        .audio-dropzone-icon {
          width: 62px;
          height: 62px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin-bottom: 16px;

          border-radius: 18px;

          background:
            rgba(249,115,22,.1);

          border:
            1px solid
            rgba(249,115,22,.2);

          color:
            #fb923c;

          font-size: 27px;
        }

        .audio-dropzone-title {
          margin: 0 0 7px;

          font-size: 16px;
          font-weight: 700;

          color:
            rgba(255,255,255,.9);
        }

        .audio-dropzone-text {
          margin: 0 0 18px;

          color:
            rgba(255,255,255,.4);

          font-size: 12px;
        }

        .audio-file-input {
          display: none;
        }

        .audio-browse-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;

          border:
            1px solid
            rgba(249,115,22,.35);

          border-radius: 10px;

          padding:
            10px
            16px;

          cursor: pointer;

          background:
            rgba(249,115,22,.1);

          color:
            #fdba74;

          font-size: 12px;
          font-weight: 700;
        }

        .audio-selected {
          padding: 30px;
        }

        .audio-file-card {
          display: flex;
          align-items: center;
          gap: 15px;

          padding: 16px;

          border:
            1px solid
            rgba(255,255,255,.08);

          border-radius: 14px;

          background:
            rgba(0,0,0,.14);
        }

        .audio-file-icon {
          width: 48px;
          height: 48px;

          flex: 0 0 auto;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 13px;

          background:
            rgba(249,115,22,.1);

          color:
            #fb923c;

          font-size: 20px;
        }

        .audio-file-info {
          min-width: 0;
          flex: 1;
        }

        .audio-file-name {
          margin: 0 0 4px;

          overflow: hidden;

          text-overflow: ellipsis;

          white-space: nowrap;

          font-size: 14px;

          font-weight: 700;

          color:
            rgba(255,255,255,.9);
        }

        .audio-file-details {
          color:
            rgba(255,255,255,.4);

          font-size: 12px;
        }

        .audio-remove {
          border: 0;

          background: transparent;

          color:
            rgba(255,255,255,.45);

          cursor: pointer;

          font-size: 18px;
        }

        .audio-waveform-preview {
          margin-top: 18px;

          padding: 16px;

          border:
            1px solid
            rgba(255,255,255,.07);

          border-radius: 14px;

          background:
            rgba(0,0,0,.14);
        }

        .audio-waveform-label {
          margin-bottom: 12px;

          font-size: 10px;

          text-transform:
            uppercase;

          letter-spacing: .08em;

          color:
            rgba(255,255,255,.38);
        }

        .waveform {
          height: 90px;

          display: flex;
          align-items: center;

          gap: 1px;

          overflow: hidden;
        }

        .waveform-bar {
          flex: 1;

          min-width: 1px;

          max-width: 4px;

          border-radius: 999px;

          background:
            linear-gradient(
              180deg,
              #fb923c,
              #f97316
            );

          opacity: .82;
        }

        .audio-info-content {
          padding: 24px;
        }

        .audio-stat-grid {
          display: grid;

          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );

          gap: 10px;
        }

        .audio-stat {
          padding: 14px;

          border:
            1px solid
            rgba(255,255,255,.07);

          border-radius: 12px;

          background:
            rgba(0,0,0,.12);
        }

        .audio-stat-label {
          margin-bottom: 7px;

          font-size: 10px;

          text-transform:
            uppercase;

          letter-spacing: .07em;

          color:
            rgba(255,255,255,.36);
        }

        .audio-stat-value {
          overflow: hidden;

          text-overflow: ellipsis;

          white-space: nowrap;

          font-size: 14px;

          font-weight: 700;

          color:
            rgba(255,255,255,.84);
        }

        .audio-settings {
          margin-top: 22px;

          padding: 18px;
        }

        .audio-settings-grid {
          display: grid;

          grid-template-columns:
            repeat(
              4,
              minmax(0, 1fr)
            );

          gap: 12px;

          margin-top: 16px;
        }

        .audio-setting {
          display: flex;
          flex-direction: column;

          gap: 7px;
        }

        .audio-setting.full {
          grid-column: 1 / -1;
        }

        .audio-setting label {
          font-size: 11px;

          text-transform:
            uppercase;

          letter-spacing: .07em;

          color:
            rgba(255,255,255,.48);
        }

        .audio-setting input,
        .audio-setting select {
          width: 100%;

          box-sizing: border-box;

          border:
            1px solid
            rgba(255,255,255,.1);

          border-radius: 10px;

          padding:
            10px
            11px;

          outline: none;

          background:
            rgba(0,0,0,.22);

          color:
            rgba(255,255,255,.9);
        }

        .audio-setting input:focus,
        .audio-setting select:focus {
          border-color:
            rgba(249,115,22,.45);

          box-shadow:
            0 0 0 3px
            rgba(249,115,22,.08);
        }

        .audio-checkbox-grid {
          display: grid;

          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );

          gap: 10px;

          margin-top: 14px;
        }

        .audio-checkbox {
          display: flex;

          align-items: center;

          gap: 9px;

          min-height: 42px;

          padding:
            0
            12px;

          border:
            1px solid
            rgba(255,255,255,.07);

          border-radius: 10px;

          background:
            rgba(0,0,0,.12);

          color:
            rgba(255,255,255,.64);

          font-size: 12px;
        }

        .audio-checkbox input {
          accent-color:
            #f97316;
        }

        .audio-actions {
          display: flex;

          justify-content: flex-end;

          gap: 10px;

          margin-top: 16px;
        }

        .audio-button {
          border:
            1px solid
            rgba(255,255,255,.1);

          border-radius: 11px;

          padding:
            11px
            16px;

          cursor: pointer;

          font-weight: 700;

          color:
            rgba(255,255,255,.9);

          background:
            rgba(255,255,255,.06);
        }

        .audio-button.primary {
          border-color:
            rgba(249,115,22,.45);

          background:
            linear-gradient(
              135deg,
              rgba(249,115,22,.95),
              rgba(234,88,12,.78)
            );

          box-shadow:
            0 10px 28px
            rgba(249,115,22,.18);
        }

        .audio-button:disabled {
          opacity: .5;

          cursor: not-allowed;
        }

        .audio-progress {
          margin-top: 16px;
        }

        .audio-progress-track {
          height: 7px;

          overflow: hidden;

          border-radius: 999px;

          background:
            rgba(255,255,255,.08);
        }

        .audio-progress-fill {
          height: 100%;

          border-radius: inherit;

          background:
            linear-gradient(
              90deg,
              #f97316,
              #fb923c
            );

          transition:
            width .2s ease;
        }

        .audio-status {
          margin-top: 8px;

          color:
            rgba(255,255,255,.5);

          font-size: 12px;
        }

        .audio-error {
          margin-top: 16px;

          padding:
            12px
            14px;

          border:
            1px solid
            rgba(248,113,113,.25);

          border-radius: 11px;

          background:
            rgba(127,29,29,.18);

          color:
            #fecaca;

          font-size: 13px;
        }

        .audio-result {
          margin-top: 22px;

          padding: 18px;
        }

        .audio-result-title {
          margin:
            0
            0
            8px;

          font-size: 15px;

          font-weight: 700;
        }

        .audio-result-details {
          display: flex;

          flex-wrap: wrap;

          gap: 18px;

          color:
            rgba(255,255,255,.5);

          font-size: 12px;
        }

        @media (max-width: 1050px) {
          .audio-layout {
            grid-template-columns:
              1fr;
          }

          .audio-settings-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
          }
        }

        @media (max-width: 700px) {
          .audio-to-pdf-tool {
            padding:
              24px
              20px
              32px;
          }

          .audio-settings-grid {
            grid-template-columns:
              1fr;
          }

          .audio-checkbox-grid {
            grid-template-columns:
              1fr;
          }

          .audio-stat-grid {
            grid-template-columns:
              1fr;
          }
        }
      `}</style>

      <div className="audio-layout">
        <section className="audio-panel">
          <div className="audio-header">
            <div className="audio-header-left">
              <h2 className="audio-title">
                Audio Input
              </h2>

              <span className="audio-meta">
                Local processing
              </span>
            </div>

            {audioFile && (
              <button
                type="button"
                className="audio-button"
                onClick={clearFile}
                disabled={isProcessing}
              >
                Clear
              </button>
            )}
          </div>

          {!audioFile ? (
            <div className="audio-upload-area">
              <div
                className="audio-dropzone"
                onDrop={handleDrop}
                onDragOver={
                  handleDragOver
                }
              >
                <div className="audio-dropzone-icon">
                  ♪
                </div>

                <h3 className="audio-dropzone-title">
                  Drop an audio file here
                </h3>

                <p className="audio-dropzone-text">
                  WAV, MP3, AAC, M4A, OGG and other browser-supported formats
                </p>

                <input
                  ref={audioInputRef}
                  className="audio-file-input"
                  type="file"
                  accept="audio/*"
                  onChange={
                    handleFileChange
                  }
                />

                <label
                  htmlFor={
                    audioInputRef.current?.id ||
                    "kaizen-audio-input"
                  }
                  className="audio-browse-button"
                  onClick={() => {
                    audioInputRef.current?.click();
                  }}
                >
                  Choose Audio File
                </label>
              </div>
            </div>
          ) : (
            <div className="audio-selected">
              <div className="audio-file-card">
                <div className="audio-file-icon">
                  ♪
                </div>

                <div className="audio-file-info">
                  <p className="audio-file-name">
                    {audioFile.name}
                  </p>

                  <div className="audio-file-details">
                    {formatBytes(
                      audioFile.size
                    )}{" "}
                    ·{" "}
                    {audioInfo
                      ? formatDuration(
                          audioInfo.duration
                        )
                      : "Analyzing..."}
                  </div>
                </div>

                <button
                  type="button"
                  className="audio-remove"
                  onClick={clearFile}
                  disabled={
                    isProcessing ||
                    isAnalyzing
                  }
                  aria-label="Remove audio"
                >
                  ×
                </button>
              </div>

              {audioInfo?.waveform && (
                <div className="audio-waveform-preview">
                  <div className="audio-waveform-label">
                    Waveform
                  </div>

                  <div className="waveform">
                    {audioInfo.waveform
                      .slice(
                        0,
                        180
                      )
                      .map(
                        (
                          amplitude,
                          index
                        ) => (
                          <div
                            key={index}
                            className="waveform-bar"
                            style={{
                              height: `${Math.max(
                                4,
                                amplitude *
                                  82
                              )}px`,
                            }}
                          />
                        )
                      )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="audio-info-panel">
          <div className="audio-header">
            <div className="audio-header-left">
              <h2 className="audio-title">
                Audio Information
              </h2>

              {isAnalyzing && (
                <span className="audio-meta">
                  Analyzing...
                </span>
              )}
            </div>
          </div>

          {!audioInfo ? (
            <div className="audio-upload-area">
              <div className="audio-empty-state">
                Select an audio file to see its
                technical information.
              </div>
            </div>
          ) : (
            <div className="audio-info-content">
              <div className="audio-stat-grid">
                <div className="audio-stat">
                  <div className="audio-stat-label">
                    Format
                  </div>

                  <div className="audio-stat-value">
                    {audioInfo.format}
                  </div>
                </div>

                <div className="audio-stat">
                  <div className="audio-stat-label">
                    Duration
                  </div>

                  <div className="audio-stat-value">
                    {formatDuration(
                      audioInfo.duration
                    )}
                  </div>
                </div>

                <div className="audio-stat">
                  <div className="audio-stat-label">
                    Sample Rate
                  </div>

                  <div className="audio-stat-value">
                    {audioInfo.sampleRate.toLocaleString()}{" "}
                    Hz
                  </div>
                </div>

                <div className="audio-stat">
                  <div className="audio-stat-label">
                    Channels
                  </div>

                  <div className="audio-stat-value">
                    {audioInfo.channelLabel}
                  </div>
                </div>

                <div className="audio-stat">
                  <div className="audio-stat-label">
                    File Size
                  </div>

                  <div className="audio-stat-value">
                    {formatBytes(
                      audioInfo.fileSize
                    )}
                  </div>
                </div>

                <div className="audio-stat">
                  <div className="audio-stat-label">
                    MIME Type
                  </div>

                  <div className="audio-stat-value">
                    {audioInfo.mimeType}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="audio-settings">
        <div className="audio-header" style={{
          padding: 0,
          border: 0,
          minHeight: 0,
        }}>
          <h2 className="audio-title">
            PDF Settings
          </h2>
        </div>

        <div className="audio-settings-grid">
          <div className="audio-setting">
            <label>
              PDF Title
            </label>

            <input
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value
                )
              }
              disabled={
                isProcessing
              }
            />
          </div>

          <div className="audio-setting">
            <label>
              Page Size
            </label>

            <select
              value={pageSize}
              onChange={(event) =>
                setPageSize(
                  event.target.value
                )
              }
              disabled={
                isProcessing
              }
            >
              <option value="a4">
                A4
              </option>

              <option value="a3">
                A3
              </option>

              <option value="letter">
                Letter
              </option>

              <option value="legal">
                Legal
              </option>
            </select>
          </div>

          <div className="audio-setting">
            <label>
              Orientation
            </label>

            <select
              value={orientation}
              onChange={(event) =>
                setOrientation(
                  event.target.value
                )
              }
              disabled={
                isProcessing
              }
            >
              <option value="portrait">
                Portrait
              </option>

              <option value="landscape">
                Landscape
              </option>
            </select>
          </div>

          <div className="audio-setting">
            <label>
              Margin
            </label>

            <input
              type="number"
              min="10"
              max="72"
              value={margin}
              onChange={(event) =>
                setMargin(
                  Number(
                    event.target.value
                  ) || 34
                )
              }
              disabled={
                isProcessing
              }
            />
          </div>

          <div className="audio-setting full">
            <label>
              File Name
            </label>

            <input
              value={fileName}
              onChange={(event) =>
                setFileName(
                  event.target.value
                )
              }
              disabled={
                isProcessing
              }
            />
          </div>
        </div>

        <div className="audio-checkbox-grid">
          <label className="audio-checkbox">
            <input
              type="checkbox"
              checked={
                includeMetadata
              }
              onChange={(event) =>
                setIncludeMetadata(
                  event.target.checked
                )
              }
              disabled={
                isProcessing
              }
            />

            Include metadata
          </label>

          <label className="audio-checkbox">
            <input
              type="checkbox"
              checked={
                includeWaveform
              }
              onChange={(event) =>
                setIncludeWaveform(
                  event.target.checked
                )
              }
              disabled={
                isProcessing
              }
            />

            Include waveform
          </label>

          <label className="audio-checkbox">
            <input
              type="checkbox"
              checked={
                showTechnicalDetails
              }
              onChange={(event) =>
                setShowTechnicalDetails(
                  event.target.checked
                )
              }
              disabled={
                isProcessing
              }
            />

            Technical details
          </label>
        </div>

        <div className="audio-actions">
          <button
            type="button"
            className="audio-button"
            onClick={clearFile}
            disabled={
              isProcessing ||
              !audioFile
            }
          >
            Clear
          </button>

          <button
            type="button"
            className="audio-button primary"
            onClick={handleGenerate}
            disabled={
              isProcessing ||
              isAnalyzing ||
              !audioFile ||
              !audioInfo
            }
          >
            {isProcessing
              ? "Generating..."
              : "Generate PDF"}
          </button>
        </div>

        {(isProcessing ||
          progress > 0) && (
          <div className="audio-progress">
            <div className="audio-progress-track">
              <div
                className="audio-progress-fill"
                style={{
                  width:
                    `${progress}%`,
                }}
              />
            </div>

            <div className="audio-status">
              {statusMessage ||
                `${progress}%`}
            </div>
          </div>
        )}

        {error && (
          <div className="audio-error">
            {error}
          </div>
        )}
      </section>

      {result && (
        <section className="audio-result">
          <h3 className="audio-result-title">
            PDF Ready
          </h3>

          <div className="audio-result-details">
            <span>
              {result.fileName}
            </span>

            <span>
              {result.pageCount} page(s)
            </span>

            <span>
              {formatBytes(
                result.byteSize
              )}
            </span>

            <span>
              {formatDuration(
                result.audioInfo.duration
              )}
            </span>
          </div>

          <div className="audio-actions">
            <button
              type="button"
              className="audio-button primary"
              onClick={() =>
                downloadBlob(
                  result.blob,
                  result.fileName
                )
              }
            >
              Download PDF
            </button>

            <button
              type="button"
              className="audio-button"
              onClick={() =>
                setResult(null)
              }
            >
              Edit Again
            </button>
          </div>
        </section>
      )}
    </div>
  );
}