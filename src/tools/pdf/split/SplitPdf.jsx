import { useEffect, useState } from "react";
import FileDropzone from "../../../components/files/FileDropzone";
import {
  getPdfPageCount,
  splitPdfEveryNPages,
} from "../../../services/pdf/splitPdf";

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SplitPdf() {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [pagesPerPart, setPagesPerPart] = useState(1);

  const [isReading, setIsReading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      results.forEach((result) => {
        if (result.url) {
          URL.revokeObjectURL(result.url);
        }
      });
    };
  }, [results]);

  async function handleFileSelect(selectedFiles) {
    const selectedFile = selectedFiles?.[0];

    if (!selectedFile) {
      return;
    }

    setError("");
    setResults([]);
    setFile(null);
    setPageCount(0);
    setIsReading(true);

    try {
      const count = await getPdfPageCount(selectedFile);

      if (!count) {
        throw new Error("This PDF does not contain any pages.");
      }

      setFile(selectedFile);
      setPageCount(count);
      setPagesPerPart(1);
    } catch (err) {
      setError(
        err?.message || "Unable to read this PDF file."
      );
    } finally {
      setIsReading(false);
    }
  }

  function handlePagesPerPartChange(event) {
    const value = Number(event.target.value);

    if (!Number.isFinite(value)) {
      return;
    }

    const safeValue = Math.min(
      Math.max(1, Math.floor(value)),
      pageCount || 1
    );

    setPagesPerPart(safeValue);
    setResults([]);
    setError("");
  }

  async function handleSplit() {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    if (!pageCount) {
      setError("Unable to determine the PDF page count.");
      return;
    }

    if (
      !Number.isInteger(pagesPerPart) ||
      pagesPerPart < 1 ||
      pagesPerPart > pageCount
    ) {
      setError(
        `Please enter a value between 1 and ${pageCount}.`
      );
      return;
    }

    setError("");
    setResults([]);
    setIsProcessing(true);

    try {
      const splitResults = await splitPdfEveryNPages(
        file,
        pagesPerPart
      );

      const resultsWithUrls = splitResults.map((result) => ({
        ...result,
        url: URL.createObjectURL(result.blob),
        filename: `${file.name.replace(
          /\.pdf$/i,
          ""
        )}_part_${String(result.partNumber).padStart(
          2,
          "0"
        )}.pdf`,
      }));

      setResults(resultsWithUrls);
    } catch (err) {
      setError(
        err?.message || "Unable to split this PDF."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  function handleReset() {
    results.forEach((result) => {
      if (result.url) {
        URL.revokeObjectURL(result.url);
      }
    });

    setFile(null);
    setPageCount(0);
    setPagesPerPart(1);
    setResults([]);
    setError("");
    setIsReading(false);
    setIsProcessing(false);
  }

  const partCount = file
    ? Math.ceil(pageCount / pagesPerPart)
    : 0;

  return (
    <>
      <style>{`
        /* =========================================================
           SPLIT PDF TOOL
        ========================================================= */

        .split-pdf-tool {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;

          display: flex;
          flex-direction: column;
          gap: 16px;

          padding: 22px;

          color: rgba(255, 255, 255, 0.92);
        }


        /* =========================================================
           COMMON PANEL
        ========================================================= */

        .split-pdf-upload-panel,
        .split-pdf-work-panel,
        .split-pdf-processing-panel,
        .split-pdf-results-panel {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;

          border:
            1px solid
            rgba(255, 255, 255, 0.09);

          border-radius: 18px;

          background:
            linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.045),
              rgba(255, 255, 255, 0.012)
            );

          box-shadow:
            inset 0 1px 0
            rgba(255, 255, 255, 0.045);
        }


        /* =========================================================
           LABELS
        ========================================================= */

        .split-pdf-panel-label {
          display: block;

          color:
            rgba(255, 158, 88, 0.70);

          font-size: 9px;
          font-weight: 650;

          letter-spacing: 3px;
          text-transform: uppercase;
        }


        /* =========================================================
           TYPOGRAPHY
        ========================================================= */

        .split-pdf-panel-heading h2,
        .split-pdf-option-copy h2,
        .split-pdf-processing-panel h2,
        .split-pdf-results-header h2 {
          margin: 9px 0 0;

          color:
            rgba(255, 255, 255, 0.92);

          font-size: 25px;
          line-height: 1.05;
          letter-spacing: -0.8px;
          font-weight: 620;
        }

        .split-pdf-panel-heading p,
        .split-pdf-option-copy p,
        .split-pdf-processing-panel p,
        .split-pdf-results-header p {
          margin: 8px 0 0;

          max-width: 650px;

          color:
            rgba(255, 255, 255, 0.40);

          font-size: 12px;
          line-height: 1.5;
        }


        /* =========================================================
           UPLOAD PANEL
        ========================================================= */

        .split-pdf-upload-panel {
          padding: 20px;
        }

        .split-pdf-panel-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;

          gap: 20px;
        }

        .split-pdf-dropzone {
          width: 100%;
          margin-top: 18px;
        }

        .split-pdf-dropzone label {
          position: relative;

          min-height: 175px;
          width: 100%;

          display: flex;
          align-items: center;
          justify-content: center;

          box-sizing: border-box;

          border:
            1px dashed
            rgba(255, 255, 255, 0.16);

          border-radius: 16px;

          background:
            radial-gradient(
              circle at 50% 38%,
              rgba(255, 112, 35, 0.055),
              transparent 56%
            ),
            rgba(0, 0, 0, 0.16);

          cursor: pointer;

          transition:
            border-color 180ms ease,
            background 180ms ease,
            transform 180ms ease;
        }

        .split-pdf-dropzone label:hover {
          border-color:
            rgba(255, 130, 50, 0.42);

          background:
            radial-gradient(
              circle at 50% 38%,
              rgba(255, 112, 35, 0.09),
              transparent 56%
            ),
            rgba(255, 100, 20, 0.025);

          transform:
            translateY(-1px);
        }

        .split-pdf-dropzone input {
          display: none;
        }

        .split-pdf-dropzone-content {
          display: flex;
          flex-direction: column;
          align-items: center;

          text-align: center;
        }

        .split-pdf-file-symbol {
          width: 46px;
          height: 56px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin-bottom: 13px;

          border:
            1px solid
            rgba(255, 130, 45, 0.38);

          border-radius: 11px;

          background:
            linear-gradient(
              145deg,
              rgba(255, 120, 35, 0.14),
              rgba(255, 80, 10, 0.045)
            );

          color:
            rgba(255, 175, 110, 0.92);

          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;

          box-shadow:
            0 12px 30px
            rgba(255, 70, 10, 0.08),

            inset 0 1px 0
            rgba(255, 255, 255, 0.08);
        }

        .split-pdf-dropzone-content strong {
          color:
            rgba(255, 255, 255, 0.88);

          font-size: 14px;
          font-weight: 600;
        }

        .split-pdf-dropzone-content span {
          margin-top: 6px;

          color:
            rgba(255, 255, 255, 0.33);

          font-size: 10px;
        }

        .split-pdf-upload-meta {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;

          gap: 18px;

          margin-top: 12px;

          color:
            rgba(255, 255, 255, 0.25);

          font-size: 9px;
          letter-spacing: 0.4px;
        }


        /* =========================================================
           FILE SUMMARY
        ========================================================= */

        .split-pdf-work-panel {
          padding: 20px;
        }

        .split-pdf-file-summary {
          min-width: 0;

          display: flex;
          align-items: center;

          gap: 12px;

          padding-bottom: 17px;

          border-bottom:
            1px solid
            rgba(255, 255, 255, 0.07);
        }

        .split-pdf-file-badge {
          width: 38px;
          height: 44px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border:
            1px solid
            rgba(255, 130, 45, 0.30);

          border-radius: 9px;

          background:
            rgba(255, 96, 20, 0.07);

          color:
            rgba(255, 155, 85, 0.86);

          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1px;
        }

        .split-pdf-file-details {
          min-width: 0;
          flex: 1;

          display: flex;
          flex-direction: column;

          gap: 4px;
        }

        .split-pdf-file-details strong {
          overflow: hidden;

          color:
            rgba(255, 255, 255, 0.84);

          font-size: 12px;
          font-weight: 550;

          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .split-pdf-file-details span {
          color:
            rgba(255, 255, 255, 0.30);

          font-size: 9px;
        }

        .split-pdf-change-button {
          flex-shrink: 0;

          height: 34px;

          padding: 0 13px;

          border:
            1px solid
            rgba(255, 255, 255, 0.10);

          border-radius: 9px;

          background:
            rgba(255, 255, 255, 0.025);

          color:
            rgba(255, 255, 255, 0.48);

          font-size: 10px;

          cursor: pointer;

          transition:
            background 180ms ease,
            border-color 180ms ease,
            color 180ms ease;
        }

        .split-pdf-change-button:hover {
          border-color:
            rgba(255, 130, 45, 0.30);

          background:
            rgba(255, 105, 20, 0.06);

          color:
            rgba(255, 205, 175, 0.90);
        }


        /* =========================================================
           OPTIONS
        ========================================================= */

        .split-pdf-option-panel {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 30px;

          margin-top: 17px;
          padding: 17px;

          border:
            1px solid
            rgba(255, 255, 255, 0.07);

          border-radius: 14px;

          background:
            rgba(0, 0, 0, 0.16);
        }

        .split-pdf-option-copy {
          min-width: 0;
        }

        .split-pdf-control {
          flex-shrink: 0;
        }

        .split-pdf-control label {
          display: block;

          margin-bottom: 7px;

          color:
            rgba(255, 255, 255, 0.34);

          font-size: 9px;
          letter-spacing: 1.6px;
          text-transform: uppercase;
        }

        .split-pdf-number-control {
          display: flex;
          align-items: center;

          gap: 8px;
        }

        .split-pdf-number-control input {
          width: 86px;
          height: 42px;

          box-sizing: border-box;

          padding: 0 11px;

          border:
            1px solid
            rgba(255, 130, 45, 0.30);

          border-radius: 10px;

          outline: none;

          background:
            rgba(255, 100, 20, 0.055);

          color:
            rgba(255, 255, 255, 0.92);

          font-size: 15px;
          font-weight: 600;

          text-align: center;

          transition:
            border-color 180ms ease,
            background 180ms ease;
        }

        .split-pdf-number-control input:focus {
          border-color:
            rgba(255, 145, 65, 0.65);

          background:
            rgba(255, 100, 20, 0.09);
        }

        .split-pdf-number-control span {
          color:
            rgba(255, 255, 255, 0.28);

          font-size: 10px;
        }


        /* =========================================================
           STATISTICS
        ========================================================= */

        .split-pdf-stat-row {
          display: grid;

          grid-template-columns:
            repeat(3, minmax(0, 1fr));

          gap: 10px;

          margin-top: 11px;
        }

        .split-pdf-stat {
          min-width: 0;

          padding: 12px 13px;

          border:
            1px solid
            rgba(255, 255, 255, 0.065);

          border-radius: 12px;

          background:
            rgba(255, 255, 255, 0.018);
        }

        .split-pdf-stat span {
          display: block;

          color:
            rgba(255, 255, 255, 0.24);

          font-size: 8px;
          letter-spacing: 1.7px;
        }

        .split-pdf-stat strong {
          display: block;

          margin-top: 6px;

          color:
            rgba(255, 255, 255, 0.82);

          font-size: 14px;
          font-weight: 600;
        }


        /* =========================================================
           ACTION
        ========================================================= */

        .split-pdf-action-row,
        .split-pdf-results-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 20px;

          margin-top: 14px;
        }

        .split-pdf-action-row > span,
        .split-pdf-results-footer > span {
          color:
            rgba(255, 255, 255, 0.27);

          font-size: 9px;
        }

        .split-pdf-primary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: 9px;

          min-width: 132px;
          height: 40px;

          padding: 0 16px;

          border:
            1px solid
            rgba(255, 128, 38, 0.50);

          border-radius: 10px;

          background:
            linear-gradient(
              135deg,
              rgba(255, 123, 35, 0.88),
              rgba(210, 58, 5, 0.76)
            );

          box-shadow:
            0 8px 24px
            rgba(255, 75, 10, 0.10),

            inset 0 1px 0
            rgba(255, 255, 255, 0.15);

          color: #ffffff;

          font-size: 10px;
          font-weight: 650;

          cursor: pointer;

          transition:
            transform 180ms ease,
            box-shadow 180ms ease;
        }

        .split-pdf-primary-button:hover {
          transform:
            translateY(-1px);

          box-shadow:
            0 12px 30px
            rgba(255, 75, 10, 0.16),

            inset 0 1px 0
            rgba(255, 255, 255, 0.17);
        }

        .split-pdf-primary-button span {
          font-size: 14px;
        }


        /* =========================================================
           PROCESSING
        ========================================================= */

        .split-pdf-processing-panel {
          min-height: 245px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          padding: 30px;

          text-align: center;
        }

        .split-pdf-spinner {
          width: 30px;
          height: 30px;

          margin-bottom: 17px;

          border:
            2px solid
            rgba(255, 255, 255, 0.10);

          border-top-color:
            rgba(255, 133, 45, 0.90);

          border-radius: 50%;

          animation:
            split-pdf-spin
            0.8s
            linear
            infinite;
        }

        @keyframes split-pdf-spin {
          to {
            transform: rotate(360deg);
          }
        }


        /* =========================================================
           RESULTS
        ========================================================= */

        .split-pdf-results-panel {
          padding: 20px;
        }

        .split-pdf-results-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;

          gap: 20px;
        }

        .split-pdf-results-list {
          display: flex;
          flex-direction: column;

          gap: 7px;

          margin-top: 18px;
        }

        .split-pdf-result-card {
          min-width: 0;

          display: flex;
          align-items: center;

          gap: 12px;

          padding: 10px 11px;

          border:
            1px solid
            rgba(255, 255, 255, 0.075);

          border-radius: 11px;

          background:
            rgba(255, 255, 255, 0.025);
        }

        .split-pdf-result-index {
          width: 27px;

          flex-shrink: 0;

          color:
            rgba(255, 255, 255, 0.25);

          font-size: 9px;

          text-align: center;
        }

        .split-pdf-result-file {
          min-width: 0;
          flex: 1;

          display: flex;
          flex-direction: column;

          gap: 4px;
        }

        .split-pdf-result-file strong {
          overflow: hidden;

          color:
            rgba(255, 255, 255, 0.80);

          font-size: 10px;
          font-weight: 500;

          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .split-pdf-result-file span {
          color:
            rgba(255, 255, 255, 0.28);

          font-size: 8px;
        }

        .split-pdf-download-button {
          flex-shrink: 0;

          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: 7px;

          min-width: 82px;
          height: 31px;

          padding: 0 10px;

          border:
            1px solid
            rgba(255, 128, 40, 0.33);

          border-radius: 8px;

          background:
            rgba(255, 100, 20, 0.07);

          color:
            rgba(255, 191, 150, 0.90);

          font-size: 9px;
          font-weight: 600;

          text-decoration: none;

          transition:
            background 180ms ease,
            border-color 180ms ease;
        }

        .split-pdf-download-button:hover {
          border-color:
            rgba(255, 128, 40, 0.55);

          background:
            rgba(255, 100, 20, 0.12);
        }

        .split-pdf-download-button span {
          font-size: 11px;
        }

        .split-pdf-results-footer {
          padding-top: 15px;

          border-top:
            1px solid
            rgba(255, 255, 255, 0.07);
        }


        /* =========================================================
           ERROR
        ========================================================= */

        .split-pdf-error {
          display: flex;
          flex-direction: column;

          gap: 4px;

          padding: 10px 12px;

          border:
            1px solid
            rgba(255, 90, 70, 0.25);

          border-radius: 10px;

          background:
            rgba(255, 70, 50, 0.065);

          color:
            rgba(255, 190, 175, 0.90);

          font-size: 9px;
        }

        .split-pdf-error strong {
          color:
            rgba(255, 205, 195, 0.95);

          font-size: 10px;
        }


        /* =========================================================
           RESPONSIVE
        ========================================================= */

        @media (max-width: 800px) {
          .split-pdf-tool {
            padding: 18px;
          }

          .split-pdf-option-panel {
            align-items: flex-start;

            flex-direction: column;

            gap: 18px;
          }

          .split-pdf-control {
            width: 100%;
          }

          .split-pdf-number-control input {
            width: 100%;
          }
        }

        @media (max-width: 600px) {
          .split-pdf-stat-row {
            grid-template-columns: 1fr;
          }

          .split-pdf-action-row,
          .split-pdf-results-footer {
            align-items: stretch;

            flex-direction: column;
          }

          .split-pdf-primary-button {
            width: 100%;
          }

          .split-pdf-result-card {
            align-items: flex-start;

            flex-wrap: wrap;
          }

          .split-pdf-download-button {
            margin-left: 39px;
          }

          .split-pdf-file-summary {
            align-items: flex-start;
          }

          .split-pdf-change-button {
            align-self: center;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .split-pdf-dropzone label,
          .split-pdf-change-button,
          .split-pdf-primary-button,
          .split-pdf-download-button {
            transition: none;
          }

          .split-pdf-spinner {
            animation: none;
          }
        }
      `}</style>

      <div className="split-pdf-tool">
        {!file &&
          !isProcessing &&
          results.length === 0 && (
            <section className="split-pdf-upload-panel">
              <div className="split-pdf-panel-heading">
                <div>
                  <span className="split-pdf-panel-label">
                    SELECT FILE
                  </span>

                  <h2>
                    Choose a PDF to split
                  </h2>

                  <p>
                    Upload one PDF and divide it into
                    smaller files based on page count.
                  </p>
                </div>
              </div>

              <FileDropzone
                accept="application/pdf,.pdf"
                multiple={false}
                onFiles={handleFileSelect}
                className="split-pdf-dropzone"
              >
                <div className="split-pdf-dropzone-content">
                  <div className="split-pdf-file-symbol">
                    PDF
                  </div>

                  <strong>
                    {isReading
                      ? "Reading PDF..."
                      : "Drop your PDF here"}
                  </strong>

                  <span>
                    or click anywhere here to choose a
                    file
                  </span>
                </div>
              </FileDropzone>

              <div className="split-pdf-upload-meta">
                <span>PDF files only</span>
                <span>No upload required</span>
                <span>Processed locally</span>
              </div>
            </section>
          )}

        {file &&
          !isProcessing &&
          results.length === 0 && (
            <section className="split-pdf-work-panel">
              <div className="split-pdf-file-summary">
                <div className="split-pdf-file-badge">
                  PDF
                </div>

                <div className="split-pdf-file-details">
                  <strong>{file.name}</strong>

                  <span>
                    {pageCount}{" "}
                    {pageCount === 1
                      ? "page"
                      : "pages"}{" "}
                    · {formatFileSize(file.size)}
                  </span>
                </div>

                <button
                  type="button"
                  className="split-pdf-change-button"
                  onClick={handleReset}
                >
                  Change
                </button>
              </div>

              <div className="split-pdf-option-panel">
                <div className="split-pdf-option-copy">
                  <span className="split-pdf-panel-label">
                    SPLIT METHOD
                  </span>

                  <h2>
                    Every N pages
                  </h2>

                  <p>
                    Create a new PDF whenever the
                    selected number of pages is reached.
                  </p>
                </div>

                <div className="split-pdf-control">
                  <label htmlFor="pages-per-part">
                    Pages per file
                  </label>

                  <div className="split-pdf-number-control">
                    <input
                      id="pages-per-part"
                      type="number"
                      min="1"
                      max={pageCount}
                      step="1"
                      value={pagesPerPart}
                      onChange={
                        handlePagesPerPartChange
                      }
                    />

                    <span>
                      / {pageCount}
                    </span>
                  </div>
                </div>
              </div>

              <div className="split-pdf-stat-row">
                <div className="split-pdf-stat">
                  <span>OUTPUT FILES</span>

                  <strong>
                    {partCount}
                  </strong>
                </div>

                <div className="split-pdf-stat">
                  <span>PAGES PER FILE</span>

                  <strong>
                    {pagesPerPart}
                  </strong>
                </div>

                <div className="split-pdf-stat">
                  <span>LAST FILE</span>

                  <strong>
                    {pageCount % pagesPerPart === 0
                      ? pagesPerPart
                      : pageCount %
                        pagesPerPart}{" "}
                    {pageCount % pagesPerPart === 1
                      ? "page"
                      : "pages"}
                  </strong>
                </div>
              </div>

              <div className="split-pdf-action-row">
                <span>
                  Your original PDF remains unchanged.
                </span>

                <button
                  type="button"
                  className="split-pdf-primary-button"
                  onClick={handleSplit}
                >
                  Split PDF

                  <span>↗</span>
                </button>
              </div>
            </section>
          )}

        {isProcessing && (
          <section className="split-pdf-processing-panel">
            <div className="split-pdf-spinner"></div>

            <span className="split-pdf-panel-label">
              PROCESSING
            </span>

            <h2>
              Splitting your PDF
            </h2>

            <p>
              Creating {partCount}{" "}
              {partCount === 1
                ? "PDF"
                : "PDFs"}{" "}
              from your document.
            </p>
          </section>
        )}

        {results.length > 0 && (
          <section className="split-pdf-results-panel">
            <div className="split-pdf-results-header">
              <div>
                <span className="split-pdf-panel-label">
                  COMPLETE
                </span>

                <h2>
                  Your PDF has been split.
                </h2>

                <p>
                  Created {results.length} output{" "}
                  {results.length === 1
                    ? "file"
                    : "files"}{" "}
                  from {pageCount}{" "}
                  {pageCount === 1
                    ? "page"
                    : "pages"}.
                </p>
              </div>

              <button
                type="button"
                className="split-pdf-change-button"
                onClick={handleReset}
              >
                Start Over
              </button>
            </div>

            <div className="split-pdf-results-list">
              {results.map((result) => (
                <div
                  className="split-pdf-result-card"
                  key={result.filename}
                >
                  <div className="split-pdf-result-index">
                    {String(
                      result.partNumber
                    ).padStart(2, "0")}
                  </div>

                  <div className="split-pdf-result-file">
                    <strong>
                      {result.filename}
                    </strong>

                    <span>
                      Pages {result.startPage}–
                      {result.endPage} ·{" "}
                      {formatFileSize(
                        result.blob.size
                      )}
                    </span>
                  </div>

                  <a
                    href={result.url}
                    download={result.filename}
                    className="split-pdf-download-button"
                  >
                    Download

                    <span>↓</span>
                  </a>
                </div>
              ))}
            </div>

            <div className="split-pdf-results-footer">
              <span>
                Files were generated locally in your
                browser.
              </span>

              <button
                type="button"
                className="split-pdf-primary-button"
                onClick={handleReset}
              >
                Split Another PDF

                <span>↗</span>
              </button>
            </div>
          </section>
        )}

        {error && (
          <div
            className="split-pdf-error"
            role="alert"
          >
            <strong>
              Unable to continue
            </strong>

            <span>{error}</span>
          </div>
        )}
      </div>
    </>
  );
}

export default SplitPdf;