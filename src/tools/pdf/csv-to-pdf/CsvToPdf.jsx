import { useEffect, useMemo, useState } from "react";
import {
  csvToPdf,
  getCsvPreview,
} from "../../../services/conversion/csvToPdf.js";

const SAMPLE_CSV = `Name,Department,Status,Score
Rahul,Engineering,Complete,94
Priya,Design,Complete,91
Arjun,Marketing,In Progress,78
Sneha,Engineering,Complete,96
Kiran,Finance,Pending,67`;

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

function downloadBlob(blob, fileName) {
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

async function readFileAsText(file) {
  return file.text();
}

export default function CsvToPdf() {
  const [csv, setCsv] =
    useState(SAMPLE_CSV);

  const [fileName, setFileName] =
    useState("csv-document.pdf");

  const [title, setTitle] =
    useState("CSV Document");

  const [delimiter, setDelimiter] =
    useState("auto");

  const [
    firstRowAsHeader,
    setFirstRowAsHeader,
  ] = useState(true);

  const [pageSize, setPageSize] =
    useState("a4");

  const [
    orientation,
    setOrientation,
  ] = useState("landscape");

  const [fontSize, setFontSize] =
    useState(8);

  const [margin, setMargin] =
    useState(24);

  const [
    repeatHeader,
    setRepeatHeader,
  ] = useState(true);

  const [
    showPageNumbers,
    setShowPageNumbers,
  ] = useState(true);

  const [
    showDelimiterInfo,
    setShowDelimiterInfo,
  ] = useState(false);

  const [
    isProcessing,
    setIsProcessing,
  ] = useState(false);

  const [progress, setProgress] =
    useState(0);

  const [
    statusMessage,
    setStatusMessage,
  ] = useState("");

  const [error, setError] =
    useState("");

  const [result, setResult] =
    useState(null);

  const preview = useMemo(
    () =>
      getCsvPreview(csv, {
        delimiter,
        firstRowAsHeader,
        maxRows: 100,
      }),
    [
      csv,
      delimiter,
      firstRowAsHeader,
    ]
  );

  useEffect(() => {
    setError("");
    setResult(null);
  }, [
    csv,
    delimiter,
    firstRowAsHeader,
  ]);

  async function handleFile(event) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const extension =
      file.name
        .toLowerCase()
        .split(".")
        .pop();

    if (
      extension !== "csv" &&
      file.type !==
        "text/csv"
    ) {
      setError(
        "Please select a CSV file."
      );

      event.target.value = "";
      return;
    }

    try {
      const text =
        await readFileAsText(file);

      setCsv(text);

      setError("");

      setResult(null);

      const baseName =
        file.name.replace(
          /\.[^/.]+$/,
          ""
        );

      setFileName(
        `${baseName}.pdf`
      );
    } catch {
      setError(
        "Unable to read the CSV file."
      );
    }

    event.target.value = "";
  }

  function handleUseSample() {
    setCsv(SAMPLE_CSV);
    setTitle("CSV Document");
    setFileName("csv-document.pdf");
    setError("");
    setResult(null);
  }

  function handleClear() {
    setCsv("");
    setError("");
    setResult(null);
  }

  async function handleGenerate() {
    if (!csv.trim()) {
      setError(
        "Add or paste CSV content first."
      );
      return;
    }

    if (!preview.rows.length) {
      setError(
        "No usable CSV rows were found."
      );
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setStatusMessage(
      "Preparing CSV..."
    );
    setError("");
    setResult(null);

    try {
      const output =
        await csvToPdf(csv, {
          fileName,
          title,
          pageSize,
          orientation,
          margin,
          fontSize,
          delimiter,
          firstRowAsHeader,
          repeatHeader,
          showPageNumbers,
          showDelimiterInfo,

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
        });

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
    <div className="csv-to-pdf-tool">
      <style>{`
        .csv-to-pdf-tool {
          width: 100%;
          box-sizing: border-box;
          padding: 26px 30px 38px;
          color: rgba(255,255,255,.94);
        }

        .csv-grid {
          display: grid;
          grid-template-columns:
            minmax(0, 1.1fr)
            minmax(360px, .9fr);
          gap: 22px;
        }

        .csv-panel,
        .csv-preview-panel,
        .csv-settings,
        .csv-result {
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

        .csv-panel,
        .csv-preview-panel {
          overflow: hidden;
        }

        .csv-header {
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

        .csv-header-left {
          display: flex;
          align-items: center;

          gap: 12px;

          min-width: 0;
        }

        .csv-title {
          margin: 0;

          font-size: 13px;

          font-weight: 700;

          letter-spacing: .08em;

          text-transform:
            uppercase;

          color:
            rgba(255,255,255,.78);
        }

        .csv-meta {
          font-size: 12px;

          color:
            rgba(255,255,255,.4);

          white-space: nowrap;
        }

        .csv-actions {
          display: flex;
          gap: 8px;
        }

        .csv-action {
          border:
            1px solid
            rgba(255,255,255,.1);

          border-radius: 9px;

          padding:
            8px
            11px;

          cursor: pointer;

          background:
            rgba(255,255,255,.05);

          color:
            rgba(255,255,255,.82);

          font-size: 12px;

          font-weight: 600;

          transition:
            background .18s ease,
            transform .18s ease;
        }

        .csv-action:hover {
          background:
            rgba(255,255,255,.09);

          transform:
            translateY(-1px);
        }

        .csv-action.primary {
          border-color:
            rgba(249,115,22,.3);

          background:
            rgba(249,115,22,.1);

          color:
            #fdba74;
        }

        .csv-file-input {
          display: none;
        }

        .csv-editor {
          width: 100%;
          min-height: 500px;

          resize: vertical;

          box-sizing: border-box;

          padding:
            20px;

          border: 0;
          outline: none;

          background:
            rgba(0,0,0,.16);

          color:
            rgba(255,255,255,.92);

          font-family:
            "Courier New",
            monospace;

          font-size: 14px;

          line-height: 1.65;
        }

        .csv-editor::selection {
          background:
            rgba(249,115,22,.28);
        }

        .csv-preview-wrap {
          min-height: 500px;
          max-height: 620px;

          overflow: auto;

          background:
            rgba(0,0,0,.08);
        }

        .csv-empty-preview {
          min-height: 500px;

          display: flex;

          align-items: center;
          justify-content: center;

          padding: 30px;

          text-align: center;

          color:
            rgba(255,255,255,.34);

          font-size: 13px;
        }

        .csv-table {
          width: 100%;

          border-collapse:
            collapse;

          font-size: 12px;
        }

        .csv-table th,
        .csv-table td {
          padding:
            10px
            12px;

          border-bottom:
            1px solid
            rgba(255,255,255,.07);

          border-right:
            1px solid
            rgba(255,255,255,.05);

          text-align: left;

          vertical-align: top;

          white-space: pre-wrap;

          word-break: break-word;

          min-width: 110px;
        }

        .csv-table th {
          position: sticky;

          top: 0;

          z-index: 2;

          background:
            rgba(32,32,32,.98);

          color:
            rgba(255,255,255,.9);

          font-weight: 700;

          box-shadow:
            0 1px 0
            rgba(255,255,255,.08);
        }

        .csv-table td {
          color:
            rgba(255,255,255,.67);
        }

        .csv-table tr:nth-child(even) td {
          background:
            rgba(255,255,255,.018);
        }

        .csv-settings {
          margin-top: 22px;

          padding: 18px;
        }

        .csv-settings-grid {
          display: grid;

          grid-template-columns:
            repeat(
              4,
              minmax(0, 1fr)
            );

          gap: 12px;
        }

        .csv-setting {
          display: flex;

          flex-direction: column;

          gap: 7px;
        }

        .csv-setting.full {
          grid-column: 1 / -1;
        }

        .csv-setting label {
          font-size: 11px;

          text-transform: uppercase;

          letter-spacing: .07em;

          color:
            rgba(255,255,255,.48);
        }

        .csv-setting input,
        .csv-setting select {
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

        .csv-setting input:focus,
        .csv-setting select:focus {
          border-color:
            rgba(249,115,22,.45);

          box-shadow:
            0 0 0 3px
            rgba(249,115,22,.08);
        }

        .csv-checkbox-grid {
          display: grid;

          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );

          gap: 10px;

          margin-top: 14px;
        }

        .csv-checkbox {
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

        .csv-checkbox input {
          accent-color:
            #f97316;
        }

        .csv-bottom-actions {
          display: flex;

          justify-content: flex-end;

          gap: 10px;

          margin-top: 16px;
        }

        .csv-button {
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

          transition:
            transform .18s ease,
            background .18s ease;
        }

        .csv-button:hover {
          transform:
            translateY(-1px);

          background:
            rgba(255,255,255,.09);
        }

        .csv-button.primary {
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

        .csv-button:disabled {
          opacity: .5;

          cursor: not-allowed;

          transform: none;
        }

        .csv-progress {
          margin-top: 16px;
        }

        .csv-progress-track {
          height: 7px;

          overflow: hidden;

          border-radius: 999px;

          background:
            rgba(255,255,255,.08);
        }

        .csv-progress-fill {
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

        .csv-status {
          margin-top: 8px;

          font-size: 12px;

          color:
            rgba(255,255,255,.5);
        }

        .csv-error {
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

        .csv-result {
          margin-top: 22px;

          padding: 18px;
        }

        .csv-result-title {
          margin:
            0
            0
            8px;

          font-size: 15px;
          font-weight: 700;
        }

        .csv-result-details {
          display: flex;

          flex-wrap: wrap;

          gap: 18px;

          color:
            rgba(255,255,255,.5);

          font-size: 12px;
        }

        @media (max-width: 1050px) {
          .csv-grid {
            grid-template-columns:
              1fr;
          }

          .csv-settings-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
          }
        }

        @media (max-width: 700px) {
          .csv-to-pdf-tool {
            padding:
              24px
              20px
              32px;
          }

          .csv-actions {
            flex-wrap: wrap;
          }

          .csv-settings-grid {
            grid-template-columns:
              1fr;
          }

          .csv-checkbox-grid {
            grid-template-columns:
              1fr;
          }

          .csv-editor,
          .csv-preview-wrap,
          .csv-empty-preview {
            min-height: 420px;
          }
        }
      `}</style>

      <div className="csv-grid">
        <section className="csv-panel">
          <div className="csv-header">
            <div className="csv-header-left">
              <h2 className="csv-title">
                CSV Input
              </h2>

              <span className="csv-meta">
                {csv.length.toLocaleString()} characters
              </span>
            </div>

            <div className="csv-actions">
              <input
                id="kaizen-csv-file"
                className="csv-file-input"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFile}
              />

              <label
                htmlFor="kaizen-csv-file"
                className="csv-action primary"
              >
                Upload CSV
              </label>

              <button
                type="button"
                className="csv-action"
                onClick={handleUseSample}
                disabled={isProcessing}
              >
                Sample
              </button>
            </div>
          </div>

          <textarea
            className="csv-editor"
            value={csv}
            onChange={(event) =>
              setCsv(event.target.value)
            }
            spellCheck="false"
            placeholder="Paste CSV data here..."
          />
        </section>

        <section className="csv-preview-panel">
          <div className="csv-header">
            <div className="csv-header-left">
              <h2 className="csv-title">
                Table Preview
              </h2>

              {preview.rows.length > 0 && (
                <span className="csv-meta">
                  {preview.totalRows.toLocaleString()} rows ·{" "}
                  {preview.columnCount} columns
                </span>
              )}
            </div>

            <span className="csv-meta">
              {preview.delimiter === ","
                ? "Comma"
                : preview.delimiter === "\t"
                ? "Tab"
                : preview.delimiter === ";"
                ? "Semicolon"
                : "Pipe"}
            </span>
          </div>

          <div className="csv-preview-wrap">
            {!preview.headers.length ? (
              <div className="csv-empty-preview">
                Add CSV data to see the table preview.
              </div>
            ) : (
              <table className="csv-table">
                <thead>
                  <tr>
                    {preview.headers.map(
                      (header, index) => (
                        <th
                          key={`header-${index}`}
                        >
                          {header ||
                            `Column ${
                              index + 1
                            }`}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {preview.rows.map(
                    (row, rowIndex) => (
                      <tr
                        key={`row-${rowIndex}`}
                      >
                        {row.map(
                          (value, columnIndex) => (
                            <td
                              key={`cell-${rowIndex}-${columnIndex}`}
                            >
                              {value}
                            </td>
                          )
                        )}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      <section className="csv-settings">
        <div className="csv-header" style={{
          padding: 0,
          border: 0,
          minHeight: 0,
        }}>
          <h2 className="csv-title">
            PDF Settings
          </h2>
        </div>

        <div
          className="csv-settings-grid"
          style={{ marginTop: 16 }}
        >
          <div className="csv-setting">
            <label>Title</label>

            <input
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value
                )
              }
              disabled={isProcessing}
            />
          </div>

          <div className="csv-setting">
            <label>Delimiter</label>

            <select
              value={delimiter}
              onChange={(event) =>
                setDelimiter(
                  event.target.value
                )
              }
              disabled={isProcessing}
            >
              <option value="auto">
                Auto Detect
              </option>

              <option value=",">
                Comma (,)
              </option>

              <option value=";">
                Semicolon (;)
              </option>

              <option value="\t">
                Tab
              </option>

              <option value="|">
                Pipe (|)
              </option>
            </select>
          </div>

          <div className="csv-setting">
            <label>Page Size</label>

            <select
              value={pageSize}
              onChange={(event) =>
                setPageSize(
                  event.target.value
                )
              }
              disabled={isProcessing}
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

          <div className="csv-setting">
            <label>Orientation</label>

            <select
              value={orientation}
              onChange={(event) =>
                setOrientation(
                  event.target.value
                )
              }
              disabled={isProcessing}
            >
              <option value="portrait">
                Portrait
              </option>

              <option value="landscape">
                Landscape
              </option>
            </select>
          </div>

          <div className="csv-setting">
            <label>Font Size</label>

            <input
              type="number"
              min="5"
              max="16"
              value={fontSize}
              onChange={(event) =>
                setFontSize(
                  Number(
                    event.target.value
                  ) || 8
                )
              }
              disabled={isProcessing}
            />
          </div>

          <div className="csv-setting">
            <label>Margin</label>

            <input
              type="number"
              min="10"
              max="72"
              value={margin}
              onChange={(event) =>
                setMargin(
                  Number(
                    event.target.value
                  ) || 24
                )
              }
              disabled={isProcessing}
            />
          </div>

          <div className="csv-setting full">
            <label>File Name</label>

            <input
              value={fileName}
              onChange={(event) =>
                setFileName(
                  event.target.value
                )
              }
              disabled={isProcessing}
            />
          </div>
        </div>

        <div className="csv-checkbox-grid">
          <label className="csv-checkbox">
            <input
              type="checkbox"
              checked={firstRowAsHeader}
              onChange={(event) =>
                setFirstRowAsHeader(
                  event.target.checked
                )
              }
              disabled={isProcessing}
            />

            First row is header
          </label>

          <label className="csv-checkbox">
            <input
              type="checkbox"
              checked={repeatHeader}
              onChange={(event) =>
                setRepeatHeader(
                  event.target.checked
                )
              }
              disabled={
                isProcessing ||
                !firstRowAsHeader
              }
            />

            Repeat header on pages
          </label>

          <label className="csv-checkbox">
            <input
              type="checkbox"
              checked={showPageNumbers}
              onChange={(event) =>
                setShowPageNumbers(
                  event.target.checked
                )
              }
              disabled={isProcessing}
            />

            Page numbers
          </label>

          <label className="csv-checkbox">
            <input
              type="checkbox"
              checked={showDelimiterInfo}
              onChange={(event) =>
                setShowDelimiterInfo(
                  event.target.checked
                )
              }
              disabled={isProcessing}
            />

            Show CSV information
          </label>
        </div>

        <div className="csv-bottom-actions">
          <button
            type="button"
            className="csv-button"
            onClick={handleClear}
            disabled={isProcessing}
          >
            Clear
          </button>

          <button
            type="button"
            className="csv-button"
            onClick={handleUseSample}
            disabled={isProcessing}
          >
            Load Sample
          </button>

          <button
            type="button"
            className="csv-button primary"
            onClick={handleGenerate}
            disabled={
              isProcessing ||
              !csv.trim()
            }
          >
            {isProcessing
              ? "Generating..."
              : "Generate PDF"}
          </button>
        </div>

        {(isProcessing ||
          progress > 0) && (
          <div className="csv-progress">
            <div className="csv-progress-track">
              <div
                className="csv-progress-fill"
                style={{
                  width:
                    `${progress}%`,
                }}
              />
            </div>

            <div className="csv-status">
              {statusMessage ||
                `${progress}%`}
            </div>
          </div>
        )}

        {error && (
          <div className="csv-error">
            {error}
          </div>
        )}
      </section>

      {result && (
        <section className="csv-result">
          <h3 className="csv-result-title">
            PDF Ready
          </h3>

          <div className="csv-result-details">
            <span>
              {result.fileName}
            </span>

            <span>
              {result.pageCount} page(s)
            </span>

            <span>
              {result.rowCount.toLocaleString()} rows
            </span>

            <span>
              {result.columnCount} columns
            </span>

            <span>
              {formatBytes(
                result.byteSize
              )}
            </span>
          </div>

          <div className="csv-bottom-actions">
            <button
              type="button"
              className="csv-button primary"
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
              className="csv-button"
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