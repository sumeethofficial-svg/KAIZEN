import { useState } from "react";
import FileDropzone from "../../../components/files/FileDropzone";
import {
  alternateAndMix,
  getPdfPageCount,
} from "../../../services/pdf/alternateAndMix";

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AlternateAndMix() {
  const [files, setFiles] = useState({
    first: null,
    second: null,
  });

  const [pageCounts, setPageCounts] = useState({
    first: 0,
    second: 0,
  });

  const [order, setOrder] = useState("first-first");

  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function loadPdf(file, side) {
    if (!file) {
      return;
    }

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setError("Please select valid PDF files only.");
      setStatus("error");
      return;
    }

    try {
      const count = await getPdfPageCount(file);

      setFiles((current) => ({
        ...current,
        [side]: file,
      }));

      setPageCounts((current) => ({
        ...current,
        [side]: count,
      }));

      setError("");
      setResult(null);
      setStatus("ready");
    } catch (err) {
      setError(
        err?.message ||
          `Unable to read ${
            side === "first"
              ? "the first"
              : "the second"
          } PDF.`
      );

      setStatus("error");
    }
  }

  function handleFirstFile(selectedFiles) {
    loadPdf(selectedFiles?.[0], "first");
  }

  function handleSecondFile(selectedFiles) {
    loadPdf(selectedFiles?.[0], "second");
  }

  async function handleMix() {
    if (!files.first || !files.second) {
      setError("Please select both PDF files first.");
      setStatus("error");
      return;
    }

    setError("");
    setResult(null);
    setProgress(0);
    setStatus("processing");

    try {
      const mixedPdf = await alternateAndMix(
        files.first,
        files.second,
        order,
        (percentage) => {
          setProgress(
            Math.max(
              0,
              Math.min(100, percentage)
            )
          );
        }
      );

      setResult(mixedPdf);
      setProgress(100);
      setStatus("success");
    } catch (err) {
      setError(
        err?.message ||
          "Unable to alternate and mix the PDF files."
      );

      setStatus("error");
    }
  }

  function handleDownload() {
    if (!result) {
      return;
    }

    const blob =
      result.blob || result;

    const url =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement("a");

    anchor.href = url;
    anchor.download =
      "alternate-and-mixed.pdf";

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function removeFile(side) {
    setFiles((current) => ({
      ...current,
      [side]: null,
    }));

    setPageCounts((current) => ({
      ...current,
      [side]: 0,
    }));

    setResult(null);
    setProgress(0);
    setError("");

    if (!files.first && !files.second) {
      setStatus("idle");
    } else {
      setStatus("ready");
    }
  }

  function handleReset() {
    setFiles({
      first: null,
      second: null,
    });

    setPageCounts({
      first: 0,
      second: 0,
    });

    setOrder("first-first");
    setStatus("idle");
    setProgress(0);
    setResult(null);
    setError("");
  }

  const canMix =
    Boolean(files.first) &&
    Boolean(files.second);

  const totalInputPages =
    pageCounts.first +
    pageCounts.second;

  const outputPageEstimate =
    totalInputPages;

  return (
    <>
      <style>{`
        .alternate-mix-workspace {
          width: 100%;
          max-width: 1080px;
          margin: 0 auto;
          padding: 22px 46px 38px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 20px;
          color: rgba(255, 255, 255, 0.95);
        }

        .alternate-mix-workspace-empty {
          min-height: 420px;
          justify-content: center;
        }

        .alternate-mix-grid {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(
            2,
            minmax(0, 1fr)
          );
          gap: 14px;
          align-items: stretch;
        }

        .alternate-mix-upload {
          width: 100%;
        }

        .alternate-mix-upload label {
          display: block;
          width: 100%;
          cursor: pointer;
        }

        .alternate-mix-upload input {
          display: none;
        }

        .alternate-mix-upload-box {
          width: 100%;
          min-height: 235px;
          border: 1px dashed rgba(255, 153, 72, 0.4);
          border-radius: 20px;
          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.045),
              rgba(255, 255, 255, 0.02)
            );
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 28px;
          box-sizing: border-box;
          transition:
            border-color 180ms ease,
            background 180ms ease,
            transform 180ms ease;
        }

        .alternate-mix-upload-box:hover {
          border-color: rgba(255, 153, 72, 0.72);
          background:
            linear-gradient(
              180deg,
              rgba(255, 153, 72, 0.055),
              rgba(255, 255, 255, 0.025)
            );
          transform: translateY(-1px);
        }

        .alternate-mix-upload-icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 24px;
          font-weight: 700;
          background:
            radial-gradient(
              circle at 50% 40%,
              rgba(255, 151, 67, 0.95),
              rgba(237, 91, 26, 0.82) 55%,
              rgba(163, 47, 12, 0.7)
            );
          box-shadow:
            0 0 32px rgba(255, 119, 45, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.18);
          margin-bottom: 16px;
        }

        .alternate-mix-upload-title {
          font-size: 18px;
          font-weight: 700;
        }

        .alternate-mix-upload-subtitle {
          margin-top: 7px;
          color: rgba(255, 255, 255, 0.5);
          font-size: 13px;
        }

        .alternate-mix-upload-meta {
          margin-top: 11px;
          color: rgba(255, 159, 84, 0.78);
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .alternate-mix-file-card {
          min-height: 235px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          padding: 20px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .alternate-mix-file-top {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .alternate-mix-file-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          background:
            linear-gradient(
              145deg,
              rgba(255, 133, 51, 0.9),
              rgba(184, 57, 16, 0.8)
            );
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          flex: 0 0 auto;
        }

        .alternate-mix-file-info {
          min-width: 0;
        }

        .alternate-mix-file-name {
          font-size: 14px;
          font-weight: 650;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .alternate-mix-file-meta {
          margin-top: 5px;
          color: rgba(255, 255, 255, 0.43);
          font-size: 11px;
        }

        .alternate-mix-remove {
          align-self: flex-end;
          width: 33px;
          height: 33px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.035);
          color: rgba(255, 255, 255, 0.65);
          cursor: pointer;
          font-size: 17px;
        }

        .alternate-mix-remove:hover {
          border-color: rgba(255, 123, 48, 0.34);
          background: rgba(255, 123, 48, 0.1);
          color: #fff;
        }

        .alternate-mix-panel {
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(255, 255, 255, 0.025);
          padding: 20px;
          box-sizing: border-box;
        }

        .alternate-mix-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 15px;
        }

        .alternate-mix-panel-title {
          font-size: 14px;
          font-weight: 700;
        }

        .alternate-mix-panel-caption {
          color: rgba(255, 255, 255, 0.4);
          font-size: 11px;
        }

        .alternate-mix-order-row {
          display: grid;
          grid-template-columns: repeat(
            2,
            minmax(0, 1fr)
          );
          gap: 10px;
        }

        .alternate-mix-order-button {
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.025);
          color: rgba(255, 255, 255, 0.68);
          padding: 14px;
          cursor: pointer;
          text-align: left;
          transition:
            border-color 160ms ease,
            background 160ms ease,
            color 160ms ease;
        }

        .alternate-mix-order-button:hover {
          border-color: rgba(255, 153, 72, 0.3);
          color: #fff;
        }

        .alternate-mix-order-button.active {
          border-color: rgba(255, 145, 63, 0.45);
          background: rgba(255, 125, 45, 0.08);
          color: #fff;
        }

        .alternate-mix-order-button strong {
          display: block;
          font-size: 13px;
        }

        .alternate-mix-order-button span {
          display: block;
          margin-top: 5px;
          color: rgba(255, 255, 255, 0.4);
          font-size: 11px;
        }

        .alternate-mix-preview {
          margin-top: 16px;
          padding: 14px 15px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.02);
        }

        .alternate-mix-preview-label {
          color: rgba(255, 255, 255, 0.4);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .alternate-mix-sequence {
          margin-top: 8px;
          color: rgba(255, 255, 255, 0.82);
          font-size: 12px;
          line-height: 1.5;
        }

        .alternate-mix-summary {
          display: grid;
          grid-template-columns: repeat(
            3,
            minmax(0, 1fr)
          );
          gap: 10px;
          margin-top: 16px;
        }

        .alternate-mix-summary-card {
          border-radius: 13px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.018);
          padding: 13px;
        }

        .alternate-mix-summary-label {
          color: rgba(255, 255, 255, 0.38);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .alternate-mix-summary-value {
          margin-top: 5px;
          color: rgba(255, 255, 255, 0.88);
          font-size: 15px;
          font-weight: 700;
        }

        .alternate-mix-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 18px;
        }

        .alternate-mix-primary,
        .alternate-mix-secondary {
          border-radius: 13px;
          padding: 12px 18px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition:
            transform 160ms ease,
            opacity 160ms ease,
            border-color 160ms ease;
        }

        .alternate-mix-primary {
          border: 1px solid rgba(255, 174, 113, 0.22);
          color: #fff;
          background:
            radial-gradient(
              circle at 50% 30%,
              rgba(255, 157, 82, 0.98),
              rgba(232, 89, 24, 0.9) 60%,
              rgba(172, 53, 13, 0.86)
            );
          box-shadow:
            0 10px 32px rgba(255, 103, 32, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.17);
        }

        .alternate-mix-primary:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .alternate-mix-secondary {
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.7);
          background: rgba(255, 255, 255, 0.035);
        }

        .alternate-mix-secondary:hover:not(:disabled) {
          border-color: rgba(255, 255, 255, 0.14);
          color: #fff;
        }

        .alternate-mix-primary:disabled,
        .alternate-mix-secondary:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .alternate-mix-progress {
          margin-top: 18px;
          padding: 14px;
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(255, 255, 255, 0.02);
        }

        .alternate-mix-progress-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .alternate-mix-progress-label {
          color: rgba(255, 255, 255, 0.56);
          font-size: 12px;
        }

        .alternate-mix-progress-value {
          color: rgba(255, 255, 255, 0.84);
          font-size: 12px;
          font-weight: 700;
        }

        .alternate-mix-progress-track {
          height: 7px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.06);
        }

        .alternate-mix-progress-fill {
          height: 100%;
          border-radius: inherit;
          background:
            linear-gradient(
              90deg,
              rgba(221, 75, 15, 0.95),
              rgba(255, 154, 76, 0.98)
            );
          transition: width 180ms ease;
        }

        .alternate-mix-error {
          margin-top: 16px;
          padding: 13px 14px;
          border-radius: 14px;
          border: 1px solid rgba(255, 89, 69, 0.2);
          background: rgba(255, 73, 52, 0.06);
          color: rgba(255, 185, 175, 0.95);
          font-size: 12px;
          line-height: 1.5;
        }

        .alternate-mix-success {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          border-radius: 17px;
          border: 1px solid rgba(121, 255, 178, 0.12);
          background: rgba(95, 255, 160, 0.035);
          padding: 15px;
        }

        .alternate-mix-success-title {
          font-size: 13px;
          font-weight: 700;
        }

        .alternate-mix-success-meta {
          margin-top: 4px;
          color: rgba(255, 255, 255, 0.42);
          font-size: 11px;
        }

        @media (max-width: 900px) {
          .alternate-mix-workspace {
            padding-left: 28px;
            padding-right: 28px;
          }
        }

        @media (max-width: 680px) {
          .alternate-mix-workspace {
            padding-left: 18px;
            padding-right: 18px;
          }

          .alternate-mix-workspace-empty {
            min-height: 360px;
          }

          .alternate-mix-grid,
          .alternate-mix-order-row {
            grid-template-columns: 1fr;
          }

          .alternate-mix-summary {
            grid-template-columns: 1fr;
          }

          .alternate-mix-success {
            align-items: flex-start;
            flex-direction: column;
          }

          .alternate-mix-actions {
            flex-direction: column;
          }

          .alternate-mix-primary,
          .alternate-mix-secondary {
            width: 100%;
          }
        }
      `}</style>

      <div
        className={`alternate-mix-workspace ${
          !canMix
            ? "alternate-mix-workspace-empty"
            : ""
        }`}
      >
        <div className="alternate-mix-grid">
          {!files.first ? (
            <div className="alternate-mix-upload">
              <FileDropzone
                accept="application/pdf,.pdf"
                onFiles={handleFirstFile}
              >
                <div className="alternate-mix-upload-box">
                  <div className="alternate-mix-upload-icon">
                    A
                  </div>

                  <div className="alternate-mix-upload-title">
                    Add first PDF
                  </div>

                  <div className="alternate-mix-upload-subtitle">
                    Drop or click to browse
                  </div>

                  <div className="alternate-mix-upload-meta">
                    PDF only
                  </div>
                </div>
              </FileDropzone>
            </div>
          ) : (
            <div className="alternate-mix-file-card">
              <div className="alternate-mix-file-top">
                <div className="alternate-mix-file-icon">
                  A
                </div>

                <div className="alternate-mix-file-info">
                  <div className="alternate-mix-file-name">
                    {files.first.name}
                  </div>

                  <div className="alternate-mix-file-meta">
                    {formatFileSize(
                      files.first.size
                    )}{" "}
                    ·{" "}
                    {pageCounts.first}{" "}
                    {pageCounts.first === 1
                      ? "page"
                      : "pages"}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="alternate-mix-remove"
                onClick={() =>
                  removeFile("first")
                }
                disabled={
                  status === "processing"
                }
                aria-label="Remove first PDF"
              >
                ×
              </button>
            </div>
          )}

          {!files.second ? (
            <div className="alternate-mix-upload">
              <FileDropzone
                accept="application/pdf,.pdf"
                onFiles={handleSecondFile}
              >
                <div className="alternate-mix-upload-box">
                  <div className="alternate-mix-upload-icon">
                    B
                  </div>

                  <div className="alternate-mix-upload-title">
                    Add second PDF
                  </div>

                  <div className="alternate-mix-upload-subtitle">
                    Drop or click to browse
                  </div>

                  <div className="alternate-mix-upload-meta">
                    PDF only
                  </div>
                </div>
              </FileDropzone>
            </div>
          ) : (
            <div className="alternate-mix-file-card">
              <div className="alternate-mix-file-top">
                <div className="alternate-mix-file-icon">
                  B
                </div>

                <div className="alternate-mix-file-info">
                  <div className="alternate-mix-file-name">
                    {files.second.name}
                  </div>

                  <div className="alternate-mix-file-meta">
                    {formatFileSize(
                      files.second.size
                    )}{" "}
                    ·{" "}
                    {pageCounts.second}{" "}
                    {pageCounts.second === 1
                      ? "page"
                      : "pages"}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="alternate-mix-remove"
                onClick={() =>
                  removeFile("second")
                }
                disabled={
                  status === "processing"
                }
                aria-label="Remove second PDF"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {canMix && (
          <div className="alternate-mix-panel">
            <div className="alternate-mix-panel-header">
              <div className="alternate-mix-panel-title">
                Mixing order
              </div>

              <div className="alternate-mix-panel-caption">
                Alternate one page at a time
              </div>
            </div>

            <div className="alternate-mix-order-row">
              <button
                type="button"
                className={`alternate-mix-order-button ${
                  order === "first-first"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setOrder("first-first")
                }
                disabled={
                  status === "processing"
                }
              >
                <strong>
                  A → B
                </strong>

                <span>
                  First page from A, then B
                </span>
              </button>

              <button
                type="button"
                className={`alternate-mix-order-button ${
                  order === "second-first"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setOrder("second-first")
                }
                disabled={
                  status === "processing"
                }
              >
                <strong>
                  B → A
                </strong>

                <span>
                  First page from B, then A
                </span>
              </button>
            </div>

            <div className="alternate-mix-preview">
              <div className="alternate-mix-preview-label">
                Sequence
              </div>

              <div className="alternate-mix-sequence">
                {order === "first-first"
                  ? "A1 → B1 → A2 → B2 → A3 → B3 → …"
                  : "B1 → A1 → B2 → A2 → B3 → A3 → …"}
              </div>
            </div>

            <div className="alternate-mix-summary">
              <div className="alternate-mix-summary-card">
                <div className="alternate-mix-summary-label">
                  PDF A
                </div>

                <div className="alternate-mix-summary-value">
                  {pageCounts.first}{" "}
                  {pageCounts.first === 1
                    ? "page"
                    : "pages"}
                </div>
              </div>

              <div className="alternate-mix-summary-card">
                <div className="alternate-mix-summary-label">
                  PDF B
                </div>

                <div className="alternate-mix-summary-value">
                  {pageCounts.second}{" "}
                  {pageCounts.second === 1
                    ? "page"
                    : "pages"}
                </div>
              </div>

              <div className="alternate-mix-summary-card">
                <div className="alternate-mix-summary-label">
                  Output
                </div>

                <div className="alternate-mix-summary-value">
                  {outputPageEstimate}{" "}
                  pages
                </div>
              </div>
            </div>

            {status === "processing" && (
              <div className="alternate-mix-progress">
                <div className="alternate-mix-progress-top">
                  <span className="alternate-mix-progress-label">
                    Alternating and mixing…
                  </span>

                  <span className="alternate-mix-progress-value">
                    {progress}%
                  </span>
                </div>

                <div className="alternate-mix-progress-track">
                  <div
                    className="alternate-mix-progress-fill"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="alternate-mix-error">
                {error}
              </div>
            )}

            <div className="alternate-mix-actions">
              <button
                type="button"
                className="alternate-mix-secondary"
                onClick={handleReset}
                disabled={
                  status === "processing"
                }
              >
                Reset
              </button>

              <button
                type="button"
                className="alternate-mix-primary"
                onClick={handleMix}
                disabled={
                  !canMix ||
                  status === "processing"
                }
              >
                {status === "processing"
                  ? "Mixing…"
                  : "Alternate & Mix"}
              </button>
            </div>
          </div>
        )}

        {status === "success" && result && (
          <div className="alternate-mix-success">
            <div>
              <div className="alternate-mix-success-title">
                Alternate & Mix complete
              </div>

              <div className="alternate-mix-success-meta">
                Your combined PDF is ready to
                download.
              </div>
            </div>

            <button
              type="button"
              className="alternate-mix-primary"
              onClick={handleDownload}
            >
              Download PDF
            </button>
          </div>
        )}

        {error && !canMix && (
          <div className="alternate-mix-error">
            {error}
          </div>
        )}
      </div>
    </>
  );
}

export default AlternateAndMix;