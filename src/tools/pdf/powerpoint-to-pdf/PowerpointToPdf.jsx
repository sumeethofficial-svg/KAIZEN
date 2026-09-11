import { useEffect, useRef, useState } from "react";
import FileDropzone from "../../../components/files/FileDropzone";
import {
  getPowerPointToPdfInfo,
  powerpointToPdf,
} from "../../../services/conversion/powerpointToPdf";

function formatFileSize(bytes) {
  if (!bytes) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PowerpointToPdf() {
  const [file, setFile] = useState(null);
  const [info, setInfo] = useState(null);
  const [output, setOutput] = useState(null);

  const [pageSize, setPageSize] = useState("A4");
  const [orientation, setOrientation] = useState("auto");
  const [margin, setMargin] = useState(8);
  const [quality, setQuality] = useState(2);
  const [includeHiddenSlides, setIncludeHiddenSlides] =
    useState(false);

  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [error, setError] = useState("");

  const downloadUrlRef = useRef(null);

  useEffect(() => {
    return () => {
      if (downloadUrlRef.current) {
        URL.revokeObjectURL(downloadUrlRef.current);
      }
    };
  }, []);

  async function handleFiles(selectedFiles) {
    const selectedFile = selectedFiles?.[0];

    if (!selectedFile) {
      return;
    }

    setError("");
    setOutput(null);
    setInfo(null);
    setProgress(0);
    setProgressMessage("");
    setStatus("validating");

    try {
      const presentationInfo =
        await getPowerPointToPdfInfo(selectedFile);

      setFile(selectedFile);
      setInfo(presentationInfo);
      setStatus("ready");
    } catch (validationError) {
      console.error(
        "PowerPoint validation error:",
        validationError,
      );

      setFile(null);
      setInfo(null);
      setStatus("error");
      setError(
        validationError?.message ||
          "This PowerPoint file could not be processed.",
      );
    }
  }

  function handleReset() {
    if (downloadUrlRef.current) {
      URL.revokeObjectURL(downloadUrlRef.current);
      downloadUrlRef.current = null;
    }

    setFile(null);
    setInfo(null);
    setOutput(null);
    setStatus("idle");
    setProgress(0);
    setProgressMessage("");
    setError("");
  }

  async function handleConvert() {
    if (!file) {
      return;
    }

    setError("");
    setOutput(null);
    setProgress(0);
    setProgressMessage(
      "Preparing PowerPoint conversion...",
    );
    setStatus("processing");

    try {
      const result = await powerpointToPdf(
        file,
        {
          pageSize,
          orientation,
          margin,
          quality,
          includeHiddenSlides,
        },
        ({ progress: currentProgress, message }) => {
          setProgress(
            Math.max(
              0,
              Math.min(100, currentProgress || 0),
            ),
          );

          setProgressMessage(
            message || "Processing presentation...",
          );
        },
      );

      if (downloadUrlRef.current) {
        URL.revokeObjectURL(downloadUrlRef.current);
      }

      const downloadUrl = URL.createObjectURL(
        result.blob,
      );

      downloadUrlRef.current = downloadUrl;

      setOutput({
        ...result,
        url: downloadUrl,
      });

      setProgress(100);
      setProgressMessage(
        "PowerPoint converted successfully.",
      );
      setStatus("success");
    } catch (conversionError) {
      console.error(
        "PowerPoint to PDF conversion error:",
        conversionError,
      );

      setStatus("error");
      setError(
        conversionError?.message ||
          "The PowerPoint file could not be converted.",
      );
    }
  }

  function handleDownload() {
    if (!output?.url) {
      return;
    }

    const anchor = document.createElement("a");

    anchor.href = output.url;
    anchor.download = output.fileName;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  const canConvert =
    Boolean(file) &&
    Boolean(info) &&
    (status === "ready" || status === "success");

  return (
    <>
      <div className="powerpoint-to-pdf-tool">
        <div className="powerpoint-to-pdf-header">
          <div>
            <div className="powerpoint-to-pdf-kicker">
              PRESENTATION · PDF
            </div>

            <h2>PowerPoint to PDF</h2>

            <p>
              Convert PowerPoint presentations into
              clean PDF documents while preserving slide
              layout and proportions.
            </p>
          </div>

          {file && (
            <button
              type="button"
              className="powerpoint-to-pdf-reset-button"
              onClick={handleReset}
            >
              Start Over
            </button>
          )}
        </div>

        {status === "idle" && (
          <div className="powerpoint-to-pdf-upload-section">
            <FileDropzone
              accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              multiple={false}
              onFiles={handleFiles}
              className="powerpoint-to-pdf-dropzone-wrapper"
            >
              <div className="powerpoint-to-pdf-dropzone">
                <div className="powerpoint-to-pdf-drop-icon">
                  P
                </div>

                <div className="powerpoint-to-pdf-drop-title">
                  Drop your PowerPoint file here
                </div>

                <div className="powerpoint-to-pdf-drop-description">
                  or click to browse from your device
                </div>

                <div className="powerpoint-to-pdf-drop-formats">
                  Supports PPTX
                </div>
              </div>
            </FileDropzone>
          </div>
        )}

        {status === "validating" && (
          <div className="powerpoint-to-pdf-state-card">
            <div className="powerpoint-to-pdf-spinner" />

            <strong>
              Reading presentation...
            </strong>

            <span>
              Inspecting slides and presentation structure.
            </span>
          </div>
        )}

        {file &&
          info &&
          status !== "idle" &&
          status !== "validating" && (
            <>
              <div className="powerpoint-to-pdf-file-card">
                <div className="powerpoint-to-pdf-file-icon">
                  P
                </div>

                <div className="powerpoint-to-pdf-file-info">
                  <strong>{file.name}</strong>

                  <span>
                    {formatFileSize(file.size)} ·{" "}
                    {info.slideCount}{" "}
                    {info.slideCount === 1
                      ? "slide"
                      : "slides"}{" "}
                    · {info.visibleSlides} visible
                  </span>
                </div>

                <div className="powerpoint-to-pdf-file-status">
                  {status === "processing"
                    ? "Processing"
                    : status === "success"
                      ? "Complete"
                      : "Ready"}
                </div>
              </div>

              {info.hiddenSlides > 0 && (
                <div className="powerpoint-to-pdf-hidden-notice">
                  <div className="powerpoint-to-pdf-hidden-icon">
                    !
                  </div>

                  <div>
                    <strong>
                      {info.hiddenSlides} hidden{" "}
                      {info.hiddenSlides === 1
                        ? "slide"
                        : "slides"}{" "}
                      detected
                    </strong>

                    <span>
                      Hidden slides are excluded by default.
                      You can include them below.
                    </span>
                  </div>
                </div>
              )}

              <div className="powerpoint-to-pdf-section">
                <div className="powerpoint-to-pdf-section-heading">
                  <div>
                    <span>01</span>
                    <h3>Presentation</h3>
                  </div>

                  <p>
                    Review the presentation before conversion.
                  </p>
                </div>

                <div className="powerpoint-to-pdf-summary-grid">
                  <div className="powerpoint-to-pdf-summary-card">
                    <span>Total Slides</span>
                    <strong>
                      {info.slideCount}
                    </strong>
                  </div>

                  <div className="powerpoint-to-pdf-summary-card">
                    <span>Visible</span>
                    <strong>
                      {info.visibleSlides}
                    </strong>
                  </div>

                  <div className="powerpoint-to-pdf-summary-card">
                    <span>Hidden</span>
                    <strong>
                      {info.hiddenSlides}
                    </strong>
                  </div>

                  <div className="powerpoint-to-pdf-summary-card">
                    <span>Format</span>
                    <strong>PPTX</strong>
                  </div>
                </div>
              </div>

              <div className="powerpoint-to-pdf-section">
                <div className="powerpoint-to-pdf-section-heading">
                  <div>
                    <span>02</span>
                    <h3>PDF Settings</h3>
                  </div>

                  <p>
                    Adjust page size, orientation and rendering quality.
                  </p>
                </div>

                <div className="powerpoint-to-pdf-settings-grid">
                  <label className="powerpoint-to-pdf-control">
                    <span>Page Size</span>

                    <select
                      value={pageSize}
                      onChange={(event) =>
                        setPageSize(event.target.value)
                      }
                      disabled={status === "processing"}
                    >
                      <option value="A4">
                        A4
                      </option>

                      <option value="A3">
                        A3
                      </option>

                      <option value="Letter">
                        Letter
                      </option>

                      <option value="Legal">
                        Legal
                      </option>
                    </select>
                  </label>

                  <label className="powerpoint-to-pdf-control">
                    <span>Orientation</span>

                    <select
                      value={orientation}
                      onChange={(event) =>
                        setOrientation(event.target.value)
                      }
                      disabled={status === "processing"}
                    >
                      <option value="auto">
                        Automatic
                      </option>

                      <option value="landscape">
                        Landscape
                      </option>

                      <option value="portrait">
                        Portrait
                      </option>
                    </select>
                  </label>

                  <label className="powerpoint-to-pdf-control">
                    <span>Margins</span>

                    <select
                      value={margin}
                      onChange={(event) =>
                        setMargin(
                          Number(event.target.value),
                        )
                      }
                      disabled={status === "processing"}
                    >
                      <option value={0}>
                        None
                      </option>

                      <option value={5}>
                        5 mm
                      </option>

                      <option value={8}>
                        8 mm
                      </option>

                      <option value={10}>
                        10 mm
                      </option>

                      <option value={15}>
                        15 mm
                      </option>

                      <option value={20}>
                        20 mm
                      </option>
                    </select>
                  </label>

                  <label className="powerpoint-to-pdf-control">
                    <span>Render Quality</span>

                    <select
                      value={quality}
                      onChange={(event) =>
                        setQuality(
                          Number(event.target.value),
                        )
                      }
                      disabled={status === "processing"}
                    >
                      <option value={1}>
                        Standard
                      </option>

                      <option value={1.5}>
                        Enhanced
                      </option>

                      <option value={2}>
                        High
                      </option>

                      <option value={2.5}>
                        Very High
                      </option>

                      <option value={3}>
                        Maximum
                      </option>
                    </select>
                  </label>
                </div>

                <div className="powerpoint-to-pdf-options">
                  <label className="powerpoint-to-pdf-toggle">
                    <input
                      type="checkbox"
                      checked={includeHiddenSlides}
                      onChange={(event) =>
                        setIncludeHiddenSlides(
                          event.target.checked,
                        )
                      }
                      disabled={status === "processing"}
                    />

                    <span className="powerpoint-to-pdf-checkmark">
                      {includeHiddenSlides ? "✓" : ""}
                    </span>

                    <span>
                      <strong>
                        Include hidden slides
                      </strong>

                      <small>
                        Add hidden PowerPoint slides to the
                        resulting PDF.
                      </small>
                    </span>
                  </label>
                </div>
              </div>

              {status === "processing" && (
                <div className="powerpoint-to-pdf-progress-card">
                  <div className="powerpoint-to-pdf-progress-top">
                    <div>
                      <span>
                        PROCESSING
                      </span>

                      <strong>
                        {progressMessage}
                      </strong>
                    </div>

                    <b>
                      {progress}%
                    </b>
                  </div>

                  <div className="powerpoint-to-pdf-progress-track">
                    <div
                      className="powerpoint-to-pdf-progress-fill"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, progress),
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {status !== "processing" &&
                status !== "success" && (
                  <div className="powerpoint-to-pdf-action-area">
                    <button
                      type="button"
                      className="powerpoint-to-pdf-convert-button"
                      onClick={handleConvert}
                      disabled={!canConvert}
                    >
                      <span>
                        Convert to PDF
                      </span>

                      <span>→</span>
                    </button>

                    <p>
                      Your presentation is processed locally
                      in your browser.
                    </p>
                  </div>
                )}

              {status === "success" &&
                output && (
                  <div className="powerpoint-to-pdf-success-card">
                    <div className="powerpoint-to-pdf-success-icon">
                      ✓
                    </div>

                    <div className="powerpoint-to-pdf-success-content">
                      <span>
                        CONVERSION COMPLETE
                      </span>

                      <h3>
                        {output.fileName}
                      </h3>

                      <p>
                        {output.slideCount}{" "}
                        {output.slideCount === 1
                          ? "slide"
                          : "slides"}{" "}
                        converted successfully ·{" "}
                        {formatFileSize(output.size)}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="powerpoint-to-pdf-download-button"
                      onClick={handleDownload}
                    >
                      Download PDF
                    </button>
                  </div>
                )}
            </>
          )}

        {status === "error" && error && (
          <div className="powerpoint-to-pdf-error-card">
            <div className="powerpoint-to-pdf-error-icon">
              !
            </div>

            <div>
              <strong>
                Something went wrong
              </strong>

              <p>
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={handleReset}
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      <style>{`
        .powerpoint-to-pdf-tool {
          width: 100%;
          box-sizing: border-box;
          padding: 26px 30px 38px;
          color: rgba(255, 255, 255, 0.94);
        }

        .powerpoint-to-pdf-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 28px;
        }

        .powerpoint-to-pdf-kicker {
          margin-bottom: 8px;
          color: rgba(255, 139, 61, 0.9);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.2em;
        }

        .powerpoint-to-pdf-header h2 {
          margin: 0;
          font-size: clamp(28px, 3vw, 42px);
          line-height: 1.05;
          letter-spacing: -0.04em;
        }

        .powerpoint-to-pdf-header p {
          margin: 10px 0 0;
          max-width: 650px;
          color: rgba(255, 255, 255, 0.58);
          font-size: 14px;
          line-height: 1.6;
        }

        .powerpoint-to-pdf-reset-button {
          flex: 0 0 auto;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.045);
          color: rgba(255, 255, 255, 0.72);
          padding: 10px 14px;
          cursor: pointer;
          font-size: 12px;
          transition:
            background 160ms ease,
            border-color 160ms ease,
            color 160ms ease;
        }

        .powerpoint-to-pdf-reset-button:hover {
          border-color: rgba(255, 138, 58, 0.35);
          background: rgba(255, 138, 58, 0.08);
          color: #fff;
        }

        .powerpoint-to-pdf-dropzone-wrapper {
          width: 100%;
        }

        .powerpoint-to-pdf-dropzone-wrapper label {
          display: block;
          width: 100%;
        }

        .powerpoint-to-pdf-dropzone-wrapper input[type="file"] {
          display: none;
        }

        .powerpoint-to-pdf-dropzone {
          min-height: 220px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 34px;
          border: 1px dashed rgba(255, 255, 255, 0.18);
          border-radius: 22px;
          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.045),
              rgba(255, 255, 255, 0.02)
            );
          cursor: pointer;
          text-align: center;
          transition:
            border-color 160ms ease,
            background 160ms ease,
            transform 160ms ease;
        }

        .powerpoint-to-pdf-dropzone:hover {
          border-color: rgba(255, 138, 58, 0.5);
          background:
            linear-gradient(
              180deg,
              rgba(255, 138, 58, 0.08),
              rgba(255, 255, 255, 0.025)
            );
          transform: translateY(-1px);
        }

        .powerpoint-to-pdf-drop-icon {
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          margin-bottom: 18px;
          border: 1px solid rgba(255, 138, 58, 0.28);
          border-radius: 17px;
          background: rgba(255, 138, 58, 0.1);
          color: #ff9a59;
          font-size: 22px;
          font-weight: 800;
          box-shadow: 0 12px 36px rgba(255, 101, 26, 0.12);
        }

        .powerpoint-to-pdf-drop-title {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .powerpoint-to-pdf-drop-description {
          margin-top: 7px;
          color: rgba(255, 255, 255, 0.52);
          font-size: 13px;
        }

        .powerpoint-to-pdf-drop-formats {
          margin-top: 14px;
          color: rgba(255, 138, 58, 0.72);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .powerpoint-to-pdf-state-card {
          min-height: 190px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.025);
          text-align: center;
        }

        .powerpoint-to-pdf-state-card strong {
          margin-top: 16px;
          font-size: 15px;
        }

        .powerpoint-to-pdf-state-card span {
          margin-top: 6px;
          color: rgba(255, 255, 255, 0.45);
          font-size: 12px;
        }

        .powerpoint-to-pdf-spinner {
          width: 34px;
          height: 34px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-top-color: #ff8b3d;
          border-radius: 50%;
          animation: powerpointToPdfSpin 0.8s linear infinite;
        }

        @keyframes powerpointToPdfSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .powerpoint-to-pdf-file-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 17px 18px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.035);
        }

        .powerpoint-to-pdf-file-icon {
          width: 48px;
          height: 48px;
          flex: 0 0 48px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255, 138, 58, 0.22);
          border-radius: 14px;
          background: rgba(255, 138, 58, 0.09);
          color: #ff9a59;
          font-size: 17px;
          font-weight: 800;
        }

        .powerpoint-to-pdf-file-info {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .powerpoint-to-pdf-file-info strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
        }

        .powerpoint-to-pdf-file-info span {
          color: rgba(255, 255, 255, 0.45);
          font-size: 11px;
        }

        .powerpoint-to-pdf-file-status {
          flex: 0 0 auto;
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(255, 138, 58, 0.09);
          color: rgba(255, 174, 122, 0.92);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .powerpoint-to-pdf-hidden-notice {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-top: 12px;
          padding: 13px 15px;
          border: 1px solid rgba(255, 190, 90, 0.12);
          border-radius: 14px;
          background: rgba(255, 190, 90, 0.035);
        }

        .powerpoint-to-pdf-hidden-icon {
          width: 28px;
          height: 28px;
          flex: 0 0 28px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          background: rgba(255, 190, 90, 0.09);
          color: #ffd184;
          font-size: 12px;
          font-weight: 800;
        }

        .powerpoint-to-pdf-hidden-notice div:last-child {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .powerpoint-to-pdf-hidden-notice strong {
          font-size: 11px;
        }

        .powerpoint-to-pdf-hidden-notice span {
          color: rgba(255, 255, 255, 0.42);
          font-size: 10px;
          line-height: 1.5;
        }

        .powerpoint-to-pdf-section {
          margin-top: 28px;
        }

        .powerpoint-to-pdf-section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 14px;
        }

        .powerpoint-to-pdf-section-heading > div {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .powerpoint-to-pdf-section-heading span {
          color: rgba(255, 138, 58, 0.7);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .powerpoint-to-pdf-section-heading h3 {
          margin: 0;
          font-size: 15px;
          letter-spacing: -0.015em;
        }

        .powerpoint-to-pdf-section-heading p {
          margin: 0;
          color: rgba(255, 255, 255, 0.42);
          font-size: 11px;
          text-align: right;
        }

        .powerpoint-to-pdf-summary-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .powerpoint-to-pdf-summary-card {
          min-height: 74px;
          padding: 13px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border: 1px solid rgba(255, 255, 255, 0.065);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.025);
        }

        .powerpoint-to-pdf-summary-card span {
          color: rgba(255, 255, 255, 0.42);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .powerpoint-to-pdf-summary-card strong {
          color: rgba(255, 255, 255, 0.9);
          font-size: 20px;
          line-height: 1;
        }

        .powerpoint-to-pdf-settings-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .powerpoint-to-pdf-control {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .powerpoint-to-pdf-control > span {
          color: rgba(255, 255, 255, 0.48);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .powerpoint-to-pdf-control select {
          width: 100%;
          height: 44px;
          box-sizing: border-box;
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 11px;
          outline: none;
          background: rgba(255, 255, 255, 0.045);
          color: rgba(255, 255, 255, 0.88);
          padding: 0 12px;
          font-size: 12px;
          cursor: pointer;
        }

        .powerpoint-to-pdf-control select:focus {
          border-color: rgba(255, 138, 58, 0.48);
        }

        .powerpoint-to-pdf-control select option {
          background: #1a1512;
          color: #fff;
        }

        .powerpoint-to-pdf-options {
          margin-top: 12px;
        }

        .powerpoint-to-pdf-toggle {
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          min-height: 70px;
          padding: 12px;
          box-sizing: border-box;
          border: 1px solid rgba(255, 255, 255, 0.065);
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.022);
          cursor: pointer;
        }

        .powerpoint-to-pdf-toggle input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .powerpoint-to-pdf-checkmark {
          width: 20px;
          height: 20px;
          flex: 0 0 20px;
          display: grid;
          place-items: center;
          box-sizing: border-box;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.035);
          color: #ff9a59;
          font-size: 12px;
          font-weight: 900;
        }

        .powerpoint-to-pdf-toggle > span:last-child {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .powerpoint-to-pdf-toggle strong {
          font-size: 11px;
        }

        .powerpoint-to-pdf-toggle small {
          color: rgba(255, 255, 255, 0.39);
          font-size: 9px;
          line-height: 1.45;
        }

        .powerpoint-to-pdf-progress-card {
          margin-top: 24px;
          padding: 17px 18px;
          border: 1px solid rgba(255, 138, 58, 0.15);
          border-radius: 16px;
          background: rgba(255, 138, 58, 0.045);
        }

        .powerpoint-to-pdf-progress-top {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
        }

        .powerpoint-to-pdf-progress-top > div {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .powerpoint-to-pdf-progress-top span {
          color: rgba(255, 138, 58, 0.68);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.14em;
        }

        .powerpoint-to-pdf-progress-top strong {
          font-size: 12px;
        }

        .powerpoint-to-pdf-progress-top b {
          color: #ff9a59;
          font-size: 13px;
        }

        .powerpoint-to-pdf-progress-track {
          height: 5px;
          margin-top: 13px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
        }

        .powerpoint-to-pdf-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #ff6b1a,
            #ffad69
          );
          transition: width 180ms ease;
        }

        .powerpoint-to-pdf-action-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 30px;
        }

        .powerpoint-to-pdf-convert-button {
          min-width: 230px;
          min-height: 50px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 18px;
          border: 1px solid rgba(255, 170, 107, 0.28);
          border-radius: 15px;
          background:
            radial-gradient(
              circle at center,
              rgba(255, 157, 84, 0.32),
              rgba(255, 107, 26, 0.15) 44%,
              rgba(255, 107, 26, 0.05) 74%
            );
          box-shadow:
            0 0 26px rgba(255, 107, 26, 0.13),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition:
            transform 160ms ease,
            box-shadow 160ms ease,
            border-color 160ms ease;
        }

        .powerpoint-to-pdf-convert-button:hover:not(:disabled) {
          transform: translateY(-2px);
          border-color: rgba(255, 170, 107, 0.5);
          box-shadow:
            0 0 34px rgba(255, 107, 26, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .powerpoint-to-pdf-convert-button:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .powerpoint-to-pdf-action-area p {
          margin: 11px 0 0;
          color: rgba(255, 255, 255, 0.34);
          font-size: 10px;
          text-align: center;
        }

        .powerpoint-to-pdf-success-card {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-top: 24px;
          padding: 16px 17px;
          border: 1px solid rgba(126, 255, 186, 0.13);
          border-radius: 17px;
          background: rgba(126, 255, 186, 0.035);
        }

        .powerpoint-to-pdf-success-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: rgba(126, 255, 186, 0.09);
          color: #a4ffca;
          font-size: 17px;
          font-weight: 800;
        }

        .powerpoint-to-pdf-success-content {
          min-width: 0;
          flex: 1;
        }

        .powerpoint-to-pdf-success-content > span {
          color: rgba(164, 255, 202, 0.65);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.14em;
        }

        .powerpoint-to-pdf-success-content h3 {
          overflow: hidden;
          margin: 4px 0;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .powerpoint-to-pdf-success-content p {
          margin: 0;
          color: rgba(255, 255, 255, 0.4);
          font-size: 10px;
        }

        .powerpoint-to-pdf-download-button {
          flex: 0 0 auto;
          min-height: 40px;
          padding: 0 15px;
          border: 1px solid rgba(126, 255, 186, 0.18);
          border-radius: 10px;
          background: rgba(126, 255, 186, 0.07);
          color: #c8ffdd;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .powerpoint-to-pdf-download-button:hover {
          background: rgba(126, 255, 186, 0.12);
        }

        .powerpoint-to-pdf-error-card {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-top: 24px;
          padding: 16px;
          border: 1px solid rgba(255, 86, 86, 0.16);
          border-radius: 16px;
          background: rgba(255, 86, 86, 0.04);
        }

        .powerpoint-to-pdf-error-icon {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: rgba(255, 86, 86, 0.09);
          color: #ff9d9d;
          font-weight: 800;
        }

        .powerpoint-to-pdf-error-card > div:nth-child(2) {
          min-width: 0;
          flex: 1;
        }

        .powerpoint-to-pdf-error-card strong {
          font-size: 12px;
        }

        .powerpoint-to-pdf-error-card p {
          margin: 5px 0 0;
          color: rgba(255, 255, 255, 0.43);
          font-size: 10px;
          line-height: 1.5;
        }

        .powerpoint-to-pdf-error-card button {
          flex: 0 0 auto;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.72);
          padding: 8px 11px;
          cursor: pointer;
          font-size: 10px;
        }

        @media (max-width: 900px) {
          .powerpoint-to-pdf-tool {
            padding: 24px 24px 32px;
          }

          .powerpoint-to-pdf-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .powerpoint-to-pdf-settings-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 620px) {
          .powerpoint-to-pdf-tool {
            padding: 20px 16px 26px;
          }

          .powerpoint-to-pdf-header {
            flex-direction: column;
          }

          .powerpoint-to-pdf-reset-button {
            align-self: flex-start;
          }

          .powerpoint-to-pdf-dropzone {
            min-height: 190px;
            padding: 25px 18px;
          }

          .powerpoint-to-pdf-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .powerpoint-to-pdf-settings-grid {
            grid-template-columns: 1fr;
          }

          .powerpoint-to-pdf-section-heading {
            align-items: flex-start;
            flex-direction: column;
            gap: 7px;
          }

          .powerpoint-to-pdf-section-heading p {
            text-align: left;
          }

          .powerpoint-to-pdf-file-card {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .powerpoint-to-pdf-file-status {
            margin-left: 64px;
          }

          .powerpoint-to-pdf-success-card {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .powerpoint-to-pdf-download-button {
            width: 100%;
          }

          .powerpoint-to-pdf-error-card {
            align-items: flex-start;
            flex-wrap: wrap;
          }
        }
      `}</style>
    </>
  );
}

export default PowerpointToPdf;