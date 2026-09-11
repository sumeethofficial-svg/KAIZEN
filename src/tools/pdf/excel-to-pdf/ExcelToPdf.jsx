import { useEffect, useRef, useState } from "react";
import FileDropzone from "../../../components/files/FileDropzone";
import {
  excelToPdf,
  getExcelToPdfInfo,
} from "../../../services/conversion/excelToPdf";

function formatFileSize(bytes) {
  if (!bytes) return "0 B";

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ExcelToPdf() {
  const [file, setFile] = useState(null);
  const [info, setInfo] = useState(null);
  const [output, setOutput] = useState(null);

  const [pageSize, setPageSize] = useState("A4");
  const [orientation, setOrientation] = useState("auto");
  const [fontSize, setFontSize] = useState(7);
  const [margin, setMargin] = useState(10);
  const [repeatHeaders, setRepeatHeaders] = useState(true);
  const [includeSheetTitles, setIncludeSheetTitles] = useState(true);
  const [alternateRowColors, setAlternateRowColors] = useState(true);

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
      const workbookInfo = await getExcelToPdfInfo(selectedFile);

      setFile(selectedFile);
      setInfo(workbookInfo);
      setStatus("ready");
    } catch (validationError) {
      console.error("Excel validation error:", validationError);

      setFile(null);
      setInfo(null);
      setStatus("error");
      setError(
        validationError?.message ||
          "This Excel file could not be processed.",
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
    setProgressMessage("Preparing conversion...");
    setStatus("processing");

    try {
      const result = await excelToPdf(
        file,
        {
          pageSize,
          orientation,
          fontSize,
          margin,
          repeatHeaders,
          includeSheetTitles,
          alternateRowColors,
        },
        ({ progress: currentProgress, message }) => {
          setProgress(currentProgress);
          setProgressMessage(message || "Processing workbook...");
        },
      );

      if (downloadUrlRef.current) {
        URL.revokeObjectURL(downloadUrlRef.current);
      }

      const downloadUrl = URL.createObjectURL(result.blob);

      downloadUrlRef.current = downloadUrl;

      setOutput({
        ...result,
        url: downloadUrl,
      });

      setProgress(100);
      setProgressMessage("Excel converted successfully.");
      setStatus("success");
    } catch (conversionError) {
      console.error("Excel to PDF conversion error:", conversionError);

      setStatus("error");
      setError(
        conversionError?.message ||
          "The Excel file could not be converted.",
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
      <div className="excel-to-pdf-tool">
        <div className="excel-to-pdf-header">
          <div>
            <div className="excel-to-pdf-kicker">
              SPREADSHEET · PDF
            </div>

            <h2>Excel to PDF</h2>

            <p>
              Convert Excel spreadsheets into clean,
              multi-page PDF documents.
            </p>
          </div>

          {file && (
            <button
              type="button"
              className="excel-to-pdf-reset-button"
              onClick={handleReset}
            >
              Start Over
            </button>
          )}
        </div>

        {status === "idle" && (
          <div className="excel-to-pdf-upload-section">
            <FileDropzone
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              multiple={false}
              onFiles={handleFiles}
              className="excel-to-pdf-dropzone-wrapper"
            >
              <div className="excel-to-pdf-dropzone">
                <div className="excel-to-pdf-drop-icon">X</div>

                <div className="excel-to-pdf-drop-title">
                  Drop your Excel file here
                </div>

                <div className="excel-to-pdf-drop-description">
                  or click to browse from your device
                </div>

                <div className="excel-to-pdf-drop-formats">
                  Supports XLSX and XLS
                </div>
              </div>
            </FileDropzone>
          </div>
        )}

        {status === "validating" && (
          <div className="excel-to-pdf-state-card">
            <div className="excel-to-pdf-spinner" />
            <strong>Reading workbook...</strong>
            <span>
              Inspecting worksheets and spreadsheet structure.
            </span>
          </div>
        )}

        {file && info && status !== "idle" && status !== "validating" && (
          <>
            <div className="excel-to-pdf-file-card">
              <div className="excel-to-pdf-file-icon">X</div>

              <div className="excel-to-pdf-file-info">
                <strong>{file.name}</strong>
                <span>
                  {formatFileSize(file.size)} · {info.sheetCount}{" "}
                  {info.sheetCount === 1 ? "sheet" : "sheets"} ·{" "}
                  {info.totalRows} populated rows
                </span>
              </div>

              <div className="excel-to-pdf-file-status">
                {status === "processing"
                  ? "Processing"
                  : status === "success"
                    ? "Complete"
                    : "Ready"}
              </div>
            </div>

            {info.sheets?.length > 0 && (
              <div className="excel-to-pdf-section">
                <div className="excel-to-pdf-section-heading">
                  <div>
                    <span>01</span>
                    <h3>Workbook</h3>
                  </div>

                  <p>
                    Review the worksheets detected in your Excel file.
                  </p>
                </div>

                <div className="excel-to-pdf-sheet-list">
                  {info.sheets.map((sheet, index) => (
                    <div
                      key={`${sheet.name}-${index}`}
                      className="excel-to-pdf-sheet-row"
                    >
                      <div className="excel-to-pdf-sheet-number">
                        {String(index + 1).padStart(2, "0")}
                      </div>

                      <div className="excel-to-pdf-sheet-main">
                        <strong>{sheet.name}</strong>

                        <span>
                          {sheet.rows}{" "}
                          {sheet.rows === 1 ? "row" : "rows"} ·{" "}
                          {sheet.columns}{" "}
                          {sheet.columns === 1
                            ? "column"
                            : "columns"}
                        </span>
                      </div>

                      <div className="excel-to-pdf-sheet-badge">
                        XLS
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="excel-to-pdf-section">
              <div className="excel-to-pdf-section-heading">
                <div>
                  <span>02</span>
                  <h3>PDF Settings</h3>
                </div>

                <p>
                  Adjust the layout and appearance of the resulting PDF.
                </p>
              </div>

              <div className="excel-to-pdf-settings-grid">
                <label className="excel-to-pdf-control">
                  <span>Page Size</span>

                  <select
                    value={pageSize}
                    onChange={(event) =>
                      setPageSize(event.target.value)
                    }
                    disabled={status === "processing"}
                  >
                    <option value="A4">A4</option>
                    <option value="A3">A3</option>
                    <option value="Letter">Letter</option>
                    <option value="Legal">Legal</option>
                  </select>
                </label>

                <label className="excel-to-pdf-control">
                  <span>Orientation</span>

                  <select
                    value={orientation}
                    onChange={(event) =>
                      setOrientation(event.target.value)
                    }
                    disabled={status === "processing"}
                  >
                    <option value="auto">Automatic</option>
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </label>

                <label className="excel-to-pdf-control">
                  <span>Font Size</span>

                  <select
                    value={fontSize}
                    onChange={(event) =>
                      setFontSize(Number(event.target.value))
                    }
                    disabled={status === "processing"}
                  >
                    <option value={6}>6 pt</option>
                    <option value={7}>7 pt</option>
                    <option value={8}>8 pt</option>
                    <option value={9}>9 pt</option>
                    <option value={10}>10 pt</option>
                    <option value={11}>11 pt</option>
                    <option value={12}>12 pt</option>
                  </select>
                </label>

                <label className="excel-to-pdf-control">
                  <span>Margins</span>

                  <select
                    value={margin}
                    onChange={(event) =>
                      setMargin(Number(event.target.value))
                    }
                    disabled={status === "processing"}
                  >
                    <option value={5}>5 mm</option>
                    <option value={8}>8 mm</option>
                    <option value={10}>10 mm</option>
                    <option value={12}>12 mm</option>
                    <option value={15}>15 mm</option>
                    <option value={20}>20 mm</option>
                  </select>
                </label>
              </div>

              <div className="excel-to-pdf-options">
                <label className="excel-to-pdf-toggle">
                  <input
                    type="checkbox"
                    checked={repeatHeaders}
                    onChange={(event) =>
                      setRepeatHeaders(event.target.checked)
                    }
                    disabled={status === "processing"}
                  />

                  <span className="excel-to-pdf-checkmark">
                    {repeatHeaders ? "✓" : ""}
                  </span>

                  <span>
                    <strong>Repeat headers</strong>
                    <small>
                      Show the spreadsheet header row on each PDF page.
                    </small>
                  </span>
                </label>

                <label className="excel-to-pdf-toggle">
                  <input
                    type="checkbox"
                    checked={includeSheetTitles}
                    onChange={(event) =>
                      setIncludeSheetTitles(event.target.checked)
                    }
                    disabled={status === "processing"}
                  />

                  <span className="excel-to-pdf-checkmark">
                    {includeSheetTitles ? "✓" : ""}
                  </span>

                  <span>
                    <strong>Include sheet titles</strong>
                    <small>
                      Display each worksheet name above its table.
                    </small>
                  </span>
                </label>

                <label className="excel-to-pdf-toggle">
                  <input
                    type="checkbox"
                    checked={alternateRowColors}
                    onChange={(event) =>
                      setAlternateRowColors(event.target.checked)
                    }
                    disabled={status === "processing"}
                  />

                  <span className="excel-to-pdf-checkmark">
                    {alternateRowColors ? "✓" : ""}
                  </span>

                  <span>
                    <strong>Alternate rows</strong>
                    <small>
                      Give alternating table rows subtle separation.
                    </small>
                  </span>
                </label>
              </div>
            </div>

            {status === "processing" && (
              <div className="excel-to-pdf-progress-card">
                <div className="excel-to-pdf-progress-top">
                  <div>
                    <span>PROCESSING</span>

                    <strong>{progressMessage}</strong>
                  </div>

                  <b>{progress}%</b>
                </div>

                <div className="excel-to-pdf-progress-track">
                  <div
                    className="excel-to-pdf-progress-fill"
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

            {status !== "processing" && status !== "success" && (
              <div className="excel-to-pdf-action-area">
                <button
                  type="button"
                  className="excel-to-pdf-convert-button"
                  onClick={handleConvert}
                  disabled={!canConvert}
                >
                  <span>Convert to PDF</span>
                  <span>→</span>
                </button>

                <p>
                  Your spreadsheet is processed locally in your browser.
                </p>
              </div>
            )}

            {status === "success" && output && (
              <div className="excel-to-pdf-success-card">
                <div className="excel-to-pdf-success-icon">
                  ✓
                </div>

                <div className="excel-to-pdf-success-content">
                  <span>CONVERSION COMPLETE</span>

                  <h3>{output.fileName}</h3>

                  <p>
                    {output.sheets}{" "}
                    {output.sheets === 1
                      ? "worksheet"
                      : "worksheets"}{" "}
                    converted successfully ·{" "}
                    {formatFileSize(output.size)}
                  </p>
                </div>

                <button
                  type="button"
                  className="excel-to-pdf-download-button"
                  onClick={handleDownload}
                >
                  Download PDF
                </button>
              </div>
            )}
          </>
        )}

        {status === "error" && error && (
          <div className="excel-to-pdf-error-card">
            <div className="excel-to-pdf-error-icon">!</div>

            <div>
              <strong>Something went wrong</strong>
              <p>{error}</p>
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
        .excel-to-pdf-tool {
          width: 100%;
          box-sizing: border-box;
          padding: 26px 30px 38px;
          color: rgba(255, 255, 255, 0.94);
        }

        .excel-to-pdf-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 28px;
        }

        .excel-to-pdf-kicker {
          margin-bottom: 8px;
          color: rgba(255, 139, 61, 0.9);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.2em;
        }

        .excel-to-pdf-header h2 {
          margin: 0;
          font-size: clamp(28px, 3vw, 42px);
          line-height: 1.05;
          letter-spacing: -0.04em;
        }

        .excel-to-pdf-header p {
          margin: 10px 0 0;
          max-width: 620px;
          color: rgba(255, 255, 255, 0.58);
          font-size: 14px;
          line-height: 1.6;
        }

        .excel-to-pdf-reset-button {
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

        .excel-to-pdf-reset-button:hover {
          border-color: rgba(255, 138, 58, 0.35);
          background: rgba(255, 138, 58, 0.08);
          color: #fff;
        }

        .excel-to-pdf-dropzone-wrapper {
          width: 100%;
        }

        .excel-to-pdf-dropzone-wrapper label {
          display: block;
          width: 100%;
        }

        .excel-to-pdf-dropzone-wrapper input[type="file"] {
          display: none;
        }

        .excel-to-pdf-dropzone {
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

        .excel-to-pdf-dropzone:hover {
          border-color: rgba(255, 138, 58, 0.5);
          background:
            linear-gradient(
              180deg,
              rgba(255, 138, 58, 0.08),
              rgba(255, 255, 255, 0.025)
            );
          transform: translateY(-1px);
        }

        .excel-to-pdf-drop-icon {
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

        .excel-to-pdf-drop-title {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .excel-to-pdf-drop-description {
          margin-top: 7px;
          color: rgba(255, 255, 255, 0.52);
          font-size: 13px;
        }

        .excel-to-pdf-drop-formats {
          margin-top: 14px;
          color: rgba(255, 138, 58, 0.72);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .excel-to-pdf-state-card {
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

        .excel-to-pdf-state-card strong {
          margin-top: 16px;
          font-size: 15px;
        }

        .excel-to-pdf-state-card span {
          margin-top: 6px;
          color: rgba(255, 255, 255, 0.45);
          font-size: 12px;
        }

        .excel-to-pdf-spinner {
          width: 34px;
          height: 34px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-top-color: #ff8b3d;
          border-radius: 50%;
          animation: excelToPdfSpin 0.8s linear infinite;
        }

        @keyframes excelToPdfSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .excel-to-pdf-file-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 17px 18px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.035);
        }

        .excel-to-pdf-file-icon {
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

        .excel-to-pdf-file-info {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .excel-to-pdf-file-info strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
        }

        .excel-to-pdf-file-info span {
          color: rgba(255, 255, 255, 0.45);
          font-size: 11px;
        }

        .excel-to-pdf-file-status {
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

        .excel-to-pdf-section {
          margin-top: 28px;
        }

        .excel-to-pdf-section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 14px;
        }

        .excel-to-pdf-section-heading > div {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .excel-to-pdf-section-heading span {
          color: rgba(255, 138, 58, 0.7);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .excel-to-pdf-section-heading h3 {
          margin: 0;
          font-size: 15px;
          letter-spacing: -0.015em;
        }

        .excel-to-pdf-section-heading p {
          margin: 0;
          color: rgba(255, 255, 255, 0.42);
          font-size: 11px;
          text-align: right;
        }

        .excel-to-pdf-sheet-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .excel-to-pdf-sheet-row {
          display: flex;
          align-items: center;
          gap: 14px;
          min-height: 58px;
          padding: 10px 13px;
          box-sizing: border-box;
          border: 1px solid rgba(255, 255, 255, 0.065);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.025);
        }

        .excel-to-pdf-sheet-number {
          width: 34px;
          flex: 0 0 34px;
          color: rgba(255, 138, 58, 0.65);
          font-size: 10px;
          font-weight: 800;
          text-align: center;
        }

        .excel-to-pdf-sheet-main {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .excel-to-pdf-sheet-main strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .excel-to-pdf-sheet-main span {
          color: rgba(255, 255, 255, 0.42);
          font-size: 10px;
        }

        .excel-to-pdf-sheet-badge {
          padding: 5px 7px;
          border-radius: 7px;
          background: rgba(255, 255, 255, 0.055);
          color: rgba(255, 255, 255, 0.46);
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .excel-to-pdf-settings-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .excel-to-pdf-control {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .excel-to-pdf-control > span {
          color: rgba(255, 255, 255, 0.48);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .excel-to-pdf-control select {
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

        .excel-to-pdf-control select:focus {
          border-color: rgba(255, 138, 58, 0.48);
        }

        .excel-to-pdf-control select option {
          background: #1a1512;
          color: #fff;
        }

        .excel-to-pdf-options {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 12px;
        }

        .excel-to-pdf-toggle {
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

        .excel-to-pdf-toggle input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .excel-to-pdf-checkmark {
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

        .excel-to-pdf-toggle > span:last-child {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .excel-to-pdf-toggle strong {
          font-size: 11px;
        }

        .excel-to-pdf-toggle small {
          color: rgba(255, 255, 255, 0.39);
          font-size: 9px;
          line-height: 1.45;
        }

        .excel-to-pdf-progress-card {
          margin-top: 24px;
          padding: 17px 18px;
          border: 1px solid rgba(255, 138, 58, 0.15);
          border-radius: 16px;
          background: rgba(255, 138, 58, 0.045);
        }

        .excel-to-pdf-progress-top {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
        }

        .excel-to-pdf-progress-top > div {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .excel-to-pdf-progress-top span {
          color: rgba(255, 138, 58, 0.68);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.14em;
        }

        .excel-to-pdf-progress-top strong {
          font-size: 12px;
        }

        .excel-to-pdf-progress-top b {
          color: #ff9a59;
          font-size: 13px;
        }

        .excel-to-pdf-progress-track {
          height: 5px;
          margin-top: 13px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
        }

        .excel-to-pdf-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #ff6b1a,
            #ffad69
          );
          transition: width 180ms ease;
        }

        .excel-to-pdf-action-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 30px;
        }

        .excel-to-pdf-convert-button {
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

        .excel-to-pdf-convert-button:hover:not(:disabled) {
          transform: translateY(-2px);
          border-color: rgba(255, 170, 107, 0.5);
          box-shadow:
            0 0 34px rgba(255, 107, 26, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .excel-to-pdf-convert-button:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .excel-to-pdf-action-area p {
          margin: 11px 0 0;
          color: rgba(255, 255, 255, 0.34);
          font-size: 10px;
          text-align: center;
        }

        .excel-to-pdf-success-card {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-top: 24px;
          padding: 16px 17px;
          border: 1px solid rgba(126, 255, 186, 0.13);
          border-radius: 17px;
          background: rgba(126, 255, 186, 0.035);
        }

        .excel-to-pdf-success-icon {
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

        .excel-to-pdf-success-content {
          min-width: 0;
          flex: 1;
        }

        .excel-to-pdf-success-content > span {
          color: rgba(164, 255, 202, 0.65);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.14em;
        }

        .excel-to-pdf-success-content h3 {
          overflow: hidden;
          margin: 4px 0;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .excel-to-pdf-success-content p {
          margin: 0;
          color: rgba(255, 255, 255, 0.4);
          font-size: 10px;
        }

        .excel-to-pdf-download-button {
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

        .excel-to-pdf-download-button:hover {
          background: rgba(126, 255, 186, 0.12);
        }

        .excel-to-pdf-error-card {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-top: 24px;
          padding: 16px;
          border: 1px solid rgba(255, 86, 86, 0.16);
          border-radius: 16px;
          background: rgba(255, 86, 86, 0.04);
        }

        .excel-to-pdf-error-icon {
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

        .excel-to-pdf-error-card > div:nth-child(2) {
          min-width: 0;
          flex: 1;
        }

        .excel-to-pdf-error-card strong {
          font-size: 12px;
        }

        .excel-to-pdf-error-card p {
          margin: 5px 0 0;
          color: rgba(255, 255, 255, 0.43);
          font-size: 10px;
          line-height: 1.5;
        }

        .excel-to-pdf-error-card button {
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
          .excel-to-pdf-tool {
            padding: 24px 24px 32px;
          }

          .excel-to-pdf-settings-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .excel-to-pdf-options {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 620px) {
          .excel-to-pdf-tool {
            padding: 20px 16px 26px;
          }

          .excel-to-pdf-header {
            flex-direction: column;
          }

          .excel-to-pdf-reset-button {
            align-self: flex-start;
          }

          .excel-to-pdf-dropzone {
            min-height: 190px;
            padding: 25px 18px;
          }

          .excel-to-pdf-settings-grid {
            grid-template-columns: 1fr;
          }

          .excel-to-pdf-section-heading {
            align-items: flex-start;
            flex-direction: column;
            gap: 7px;
          }

          .excel-to-pdf-section-heading p {
            text-align: left;
          }

          .excel-to-pdf-file-card {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .excel-to-pdf-file-status {
            margin-left: 64px;
          }

          .excel-to-pdf-success-card {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .excel-to-pdf-download-button {
            width: 100%;
          }

          .excel-to-pdf-error-card {
            align-items: flex-start;
            flex-wrap: wrap;
          }
        }
      `}</style>
    </>
  );
}

export default ExcelToPdf;