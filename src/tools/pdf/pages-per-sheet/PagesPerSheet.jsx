import { useEffect, useState } from "react";
import FileDropzone from "../../../components/files/FileDropzone";
import {
  createPagesPerSheetPdf,
  getPdfInfo,
} from "../../../services/pdf/pagesPerSheet";

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function PagesPerSheet() {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);

  const [pagesPerSheet, setPagesPerSheet] = useState(4);
  const [orientation, setOrientation] = useState("portrait");
  const [margin, setMargin] = useState(18);
  const [gap, setGap] = useState(10);

  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const outputSheetCount = file
    ? Math.ceil(pageCount / pagesPerSheet)
    : 0;

  async function handleFiles(files) {
    const selectedFile = files?.[0];

    if (!selectedFile) {
      return;
    }

    const isPdf =
      selectedFile.type === "application/pdf" ||
      selectedFile.name
        .toLowerCase()
        .endsWith(".pdf");

    if (!isPdf) {
      setStatus("error");
      setError("Please select a valid PDF file.");
      return;
    }

    setFile(null);
    setPageCount(0);
    setResult(null);
    setProgress(0);
    setError("");
    setStatus("loading");

    try {
      const info = await getPdfInfo(selectedFile);

      if (!info.pageCount || info.pageCount < 1) {
        throw new Error(
          "The PDF does not contain any pages."
        );
      }

      setFile(selectedFile);
      setPageCount(info.pageCount);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setError(
        err?.message ||
          "Unable to read this PDF file."
      );
    }
  }

  async function handleCreate() {
    if (!file) {
      return;
    }

    setError("");
    setResult(null);
    setProgress(0);
    setStatus("processing");

    try {
      const output =
        await createPagesPerSheetPdf(
          file,
          {
            pagesPerSheet,
            orientation,
            margin,
            gap,
          },
          (percentage) => {
            setProgress(
              Math.max(
                0,
                Math.min(100, percentage)
              )
            );
          }
        );

      setResult(output);
      setProgress(100);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(
        err?.message ||
          "Unable to create the pages-per-sheet PDF."
      );
    }
  }

  function handleDownload() {
    if (!result?.blob) {
      return;
    }

    const url =
      URL.createObjectURL(result.blob);

    const anchor =
      document.createElement("a");

    anchor.href = url;
    anchor.download =
      getOutputFileName(file?.name);

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function handleReset() {
    setFile(null);
    setPageCount(0);
    setPagesPerSheet(4);
    setOrientation("portrait");
    setMargin(18);
    setGap(10);
    setStatus("idle");
    setProgress(0);
    setResult(null);
    setError("");
  }

  useEffect(() => {
    if (status === "error" && file) {
      return;
    }
  }, [status, file]);

  return (
    <>
      <style>{`
        .pages-per-sheet-workspace {
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

        .pages-per-sheet-workspace-empty {
          min-height: 420px;
          justify-content: center;
        }

        .pages-per-sheet-upload {
          width: 100%;
        }

        .pages-per-sheet-upload label {
          display: block;
          width: 100%;
          cursor: pointer;
        }

        .pages-per-sheet-upload input {
          display: none;
        }

        .pages-per-sheet-upload-box {
          width: 100%;
          min-height: 280px;
          border: 1px dashed rgba(255, 153, 72, 0.42);
          border-radius: 22px;
          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.045),
              rgba(255, 255, 255, 0.02)
            );
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.055),
            0 18px 48px rgba(0, 0, 0, 0.16);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 32px;
          box-sizing: border-box;
          transition:
            border-color 180ms ease,
            background 180ms ease,
            transform 180ms ease;
        }

        .pages-per-sheet-upload-box:hover {
          border-color: rgba(255, 153, 72, 0.72);
          background:
            linear-gradient(
              180deg,
              rgba(255, 153, 72, 0.055),
              rgba(255, 255, 255, 0.025)
            );
          transform: translateY(-1px);
        }

        .pages-per-sheet-upload-icon {
          width: 58px;
          height: 58px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 26px;
          font-weight: 700;
          background:
            radial-gradient(
              circle at 50% 40%,
              rgba(255, 151, 67, 0.95),
              rgba(237, 91, 26, 0.82) 55%,
              rgba(163, 47, 12, 0.7)
            );
          box-shadow:
            0 0 34px rgba(255, 119, 45, 0.24),
            inset 0 1px 0 rgba(255, 255, 255, 0.18);
          margin-bottom: 18px;
        }

        .pages-per-sheet-upload-title {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .pages-per-sheet-upload-subtitle {
          margin-top: 8px;
          color: rgba(255, 255, 255, 0.56);
          font-size: 14px;
        }

        .pages-per-sheet-upload-meta {
          margin-top: 12px;
          color: rgba(255, 159, 84, 0.8);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.16em;
        }

        .pages-per-sheet-file-card {
          min-height: 84px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.035);
          padding: 15px 17px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-sizing: border-box;
        }

        .pages-per-sheet-file-icon {
          width: 46px;
          height: 46px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
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

        .pages-per-sheet-file-info {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .pages-per-sheet-file-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 15px;
          font-weight: 650;
        }

        .pages-per-sheet-file-meta {
          color: rgba(255, 255, 255, 0.48);
          font-size: 12px;
        }

        .pages-per-sheet-file-remove {
          width: 34px;
          height: 34px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.035);
          color: rgba(255, 255, 255, 0.68);
          cursor: pointer;
          font-size: 18px;
          flex: 0 0 auto;
        }

        .pages-per-sheet-file-remove:hover {
          color: #ffffff;
          border-color: rgba(255, 123, 48, 0.34);
          background: rgba(255, 123, 48, 0.1);
        }

        .pages-per-sheet-panel {
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(255, 255, 255, 0.025);
          padding: 20px;
          box-sizing: border-box;
        }

        .pages-per-sheet-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }

        .pages-per-sheet-panel-title {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .pages-per-sheet-panel-caption {
          color: rgba(255, 255, 255, 0.42);
          font-size: 12px;
        }

        .pages-per-sheet-layouts {
          display: grid;
          grid-template-columns: repeat(
            5,
            minmax(0, 1fr)
          );
          gap: 10px;
        }

        .pages-per-sheet-layout {
          min-height: 86px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.025);
          color: rgba(255, 255, 255, 0.65);
          cursor: pointer;
          padding: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 7px;
          transition:
            border-color 160ms ease,
            background 160ms ease,
            color 160ms ease,
            transform 160ms ease;
        }

        .pages-per-sheet-layout:hover {
          border-color: rgba(255, 153, 72, 0.3);
          color: #ffffff;
          transform: translateY(-1px);
        }

        .pages-per-sheet-layout.active {
          border-color: rgba(255, 145, 63, 0.5);
          background: rgba(255, 125, 45, 0.09);
          color: #ffffff;
        }

        .pages-per-sheet-layout-number {
          font-size: 17px;
          font-weight: 750;
        }

        .pages-per-sheet-layout-label {
          color: rgba(255, 255, 255, 0.38);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .pages-per-sheet-layout.active
          .pages-per-sheet-layout-label {
          color: rgba(255, 176, 111, 0.75);
        }

        .pages-per-sheet-options {
          display: grid;
          grid-template-columns: repeat(
            2,
            minmax(0, 1fr)
          );
          gap: 12px;
          margin-top: 16px;
        }

        .pages-per-sheet-option-group {
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(255, 255, 255, 0.02);
          padding: 14px;
        }

        .pages-per-sheet-option-label {
          display: block;
          margin-bottom: 10px;
          color: rgba(255, 255, 255, 0.48);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .pages-per-sheet-segmented {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .pages-per-sheet-segment {
          border-radius: 11px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(255, 255, 255, 0.025);
          color: rgba(255, 255, 255, 0.62);
          padding: 10px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 650;
          transition:
            border-color 150ms ease,
            background 150ms ease,
            color 150ms ease;
        }

        .pages-per-sheet-segment:hover {
          color: #ffffff;
          border-color: rgba(255, 153, 72, 0.28);
        }

        .pages-per-sheet-segment.active {
          color: #ffffff;
          border-color: rgba(255, 145, 63, 0.45);
          background: rgba(255, 125, 45, 0.08);
        }

        .pages-per-sheet-range-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .pages-per-sheet-range {
          width: 100%;
          accent-color: #ff873d;
          cursor: pointer;
        }

        .pages-per-sheet-range-value {
          min-width: 42px;
          text-align: right;
          color: #ffffff;
          font-size: 12px;
          font-weight: 700;
        }

        .pages-per-sheet-stats {
          display: grid;
          grid-template-columns: repeat(
            3,
            minmax(0, 1fr)
          );
          gap: 10px;
          margin-top: 16px;
        }

        .pages-per-sheet-stat {
          border-radius: 13px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.018);
          padding: 13px;
        }

        .pages-per-sheet-stat-label {
          color: rgba(255, 255, 255, 0.38);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .pages-per-sheet-stat-value {
          margin-top: 5px;
          color: rgba(255, 255, 255, 0.88);
          font-size: 15px;
          font-weight: 700;
        }

        .pages-per-sheet-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 18px;
        }

        .pages-per-sheet-primary,
        .pages-per-sheet-secondary {
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

        .pages-per-sheet-primary {
          border: 1px solid rgba(255, 174, 113, 0.22);
          color: #ffffff;
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

        .pages-per-sheet-primary:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .pages-per-sheet-secondary {
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.7);
          background: rgba(255, 255, 255, 0.035);
        }

        .pages-per-sheet-secondary:hover:not(:disabled) {
          border-color: rgba(255, 255, 255, 0.14);
          color: #ffffff;
        }

        .pages-per-sheet-primary:disabled,
        .pages-per-sheet-secondary:disabled,
        .pages-per-sheet-file-remove:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .pages-per-sheet-progress {
          margin-top: 18px;
          padding: 14px;
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(255, 255, 255, 0.02);
        }

        .pages-per-sheet-progress-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .pages-per-sheet-progress-label {
          color: rgba(255, 255, 255, 0.56);
          font-size: 12px;
        }

        .pages-per-sheet-progress-value {
          color: rgba(255, 255, 255, 0.84);
          font-size: 12px;
          font-weight: 700;
        }

        .pages-per-sheet-progress-track {
          height: 7px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.06);
        }

        .pages-per-sheet-progress-fill {
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

        .pages-per-sheet-error {
          margin-top: 16px;
          padding: 13px 14px;
          border-radius: 14px;
          border: 1px solid rgba(255, 89, 69, 0.2);
          background: rgba(255, 73, 52, 0.06);
          color: rgba(255, 185, 175, 0.95);
          font-size: 12px;
          line-height: 1.5;
        }

        .pages-per-sheet-success {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          border-radius: 17px;
          border: 1px solid rgba(121, 255, 178, 0.12);
          background: rgba(95, 255, 160, 0.035);
          padding: 15px;
        }

        .pages-per-sheet-success-title {
          font-size: 13px;
          font-weight: 700;
        }

        .pages-per-sheet-success-meta {
          margin-top: 4px;
          color: rgba(255, 255, 255, 0.42);
          font-size: 11px;
        }

        @media (max-width: 900px) {
          .pages-per-sheet-workspace {
            padding-left: 28px;
            padding-right: 28px;
          }

          .pages-per-sheet-layouts {
            grid-template-columns: repeat(
              3,
              minmax(0, 1fr)
            );
          }
        }

        @media (max-width: 680px) {
          .pages-per-sheet-workspace {
            padding-left: 18px;
            padding-right: 18px;
          }

          .pages-per-sheet-workspace-empty {
            min-height: 360px;
          }

          .pages-per-sheet-layouts,
          .pages-per-sheet-options,
          .pages-per-sheet-stats {
            grid-template-columns: 1fr;
          }

          .pages-per-sheet-success {
            align-items: flex-start;
            flex-direction: column;
          }

          .pages-per-sheet-actions {
            flex-direction: column;
          }

          .pages-per-sheet-primary,
          .pages-per-sheet-secondary {
            width: 100%;
          }
        }
      `}</style>

      <div
        className={`pages-per-sheet-workspace ${
          !file
            ? "pages-per-sheet-workspace-empty"
            : ""
        }`}
      >
        {!file ? (
          <div className="pages-per-sheet-upload">
            <FileDropzone
              accept="application/pdf,.pdf"
              onFiles={handleFiles}
            >
              <div className="pages-per-sheet-upload-box">
                <div className="pages-per-sheet-upload-icon">
                  ⊞
                </div>

                <div className="pages-per-sheet-upload-title">
                  Drop your PDF here
                </div>

                <div className="pages-per-sheet-upload-subtitle">
                  or click to browse
                </div>

                <div className="pages-per-sheet-upload-meta">
                  PDF files only
                </div>
              </div>
            </FileDropzone>
          </div>
        ) : (
          <>
            <div className="pages-per-sheet-file-card">
              <div className="pages-per-sheet-file-icon">
                PDF
              </div>

              <div className="pages-per-sheet-file-info">
                <div className="pages-per-sheet-file-name">
                  {file.name}
                </div>

                <div className="pages-per-sheet-file-meta">
                  {formatFileSize(file.size)} ·{" "}
                  {pageCount}{" "}
                  {pageCount === 1
                    ? "page"
                    : "pages"}
                </div>
              </div>

              <button
                type="button"
                className="pages-per-sheet-file-remove"
                onClick={handleReset}
                disabled={
                  status === "processing"
                }
                aria-label="Remove PDF"
              >
                ×
              </button>
            </div>

            <div className="pages-per-sheet-panel">
              <div className="pages-per-sheet-panel-header">
                <div className="pages-per-sheet-panel-title">
                  Sheet layout
                </div>

                <div className="pages-per-sheet-panel-caption">
                  Choose how many pages fit on one sheet
                </div>
              </div>

              <div className="pages-per-sheet-layouts">
                {[2, 4, 6, 9, 16].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`pages-per-sheet-layout ${
                      pagesPerSheet === value
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setPagesPerSheet(value)
                    }
                    disabled={
                      status === "processing"
                    }
                  >
                    <span className="pages-per-sheet-layout-number">
                      {value}
                    </span>

                    <span className="pages-per-sheet-layout-label">
                      per sheet
                    </span>
                  </button>
                ))}
              </div>

              <div className="pages-per-sheet-options">
                <div className="pages-per-sheet-option-group">
                  <span className="pages-per-sheet-option-label">
                    Output orientation
                  </span>

                  <div className="pages-per-sheet-segmented">
                    <button
                      type="button"
                      className={`pages-per-sheet-segment ${
                        orientation ===
                        "portrait"
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        setOrientation(
                          "portrait"
                        )
                      }
                      disabled={
                        status ===
                        "processing"
                      }
                    >
                      Portrait
                    </button>

                    <button
                      type="button"
                      className={`pages-per-sheet-segment ${
                        orientation ===
                        "landscape"
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        setOrientation(
                          "landscape"
                        )
                      }
                      disabled={
                        status ===
                        "processing"
                      }
                    >
                      Landscape
                    </button>
                  </div>
                </div>

                <div className="pages-per-sheet-option-group">
                  <span className="pages-per-sheet-option-label">
                    Page margin
                  </span>

                  <div className="pages-per-sheet-range-row">
                    <input
                      className="pages-per-sheet-range"
                      type="range"
                      min="0"
                      max="40"
                      step="1"
                      value={margin}
                      onChange={(event) =>
                        setMargin(
                          Number(
                            event.target
                              .value
                          )
                        )
                      }
                      disabled={
                        status ===
                        "processing"
                      }
                      aria-label="Page margin"
                    />

                    <span className="pages-per-sheet-range-value">
                      {margin}px
                    </span>
                  </div>
                </div>

                <div className="pages-per-sheet-option-group">
                  <span className="pages-per-sheet-option-label">
                    Space between pages
                  </span>

                  <div className="pages-per-sheet-range-row">
                    <input
                      className="pages-per-sheet-range"
                      type="range"
                      min="0"
                      max="30"
                      step="1"
                      value={gap}
                      onChange={(event) =>
                        setGap(
                          Number(
                            event.target
                              .value
                          )
                        )
                      }
                      disabled={
                        status ===
                        "processing"
                      }
                      aria-label="Space between pages"
                    />

                    <span className="pages-per-sheet-range-value">
                      {gap}px
                    </span>
                  </div>
                </div>
              </div>

              <div className="pages-per-sheet-stats">
                <div className="pages-per-sheet-stat">
                  <div className="pages-per-sheet-stat-label">
                    Input pages
                  </div>

                  <div className="pages-per-sheet-stat-value">
                    {pageCount}
                  </div>
                </div>

                <div className="pages-per-sheet-stat">
                  <div className="pages-per-sheet-stat-label">
                    Pages / sheet
                  </div>

                  <div className="pages-per-sheet-stat-value">
                    {pagesPerSheet}
                  </div>
                </div>

                <div className="pages-per-sheet-stat">
                  <div className="pages-per-sheet-stat-label">
                    Output sheets
                  </div>

                  <div className="pages-per-sheet-stat-value">
                    {outputSheetCount}
                  </div>
                </div>
              </div>

              {status === "processing" && (
                <div className="pages-per-sheet-progress">
                  <div className="pages-per-sheet-progress-top">
                    <span className="pages-per-sheet-progress-label">
                      Creating PDF…
                    </span>

                    <span className="pages-per-sheet-progress-value">
                      {progress}%
                    </span>
                  </div>

                  <div className="pages-per-sheet-progress-track">
                    <div
                      className="pages-per-sheet-progress-fill"
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="pages-per-sheet-error">
                  {error}
                </div>
              )}

              <div className="pages-per-sheet-actions">
                <button
                  type="button"
                  className="pages-per-sheet-secondary"
                  onClick={handleReset}
                  disabled={
                    status === "processing"
                  }
                >
                  Reset
                </button>

                <button
                  type="button"
                  className="pages-per-sheet-primary"
                  onClick={handleCreate}
                  disabled={
                    status === "processing"
                  }
                >
                  {status === "processing"
                    ? "Creating…"
                    : "Create PDF"}
                </button>
              </div>
            </div>
          </>
        )}

        {status === "success" && result && (
          <div className="pages-per-sheet-success">
            <div>
              <div className="pages-per-sheet-success-title">
                Pages Per Sheet complete
              </div>

              <div className="pages-per-sheet-success-meta">
                {result.outputPageCount}{" "}
                output{" "}
                {result.outputPageCount === 1
                  ? "sheet"
                  : "sheets"}{" "}
                created from{" "}
                {result.originalPageCount}{" "}
                input{" "}
                {result.originalPageCount === 1
                  ? "page"
                  : "pages"}.
              </div>
            </div>

            <button
              type="button"
              className="pages-per-sheet-primary"
              onClick={handleDownload}
            >
              Download PDF
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function getOutputFileName(fileName) {
  const baseName =
    fileName?.replace(
      /\.pdf$/i,
      ""
    ) || "document";

  return `${baseName}-${4}-per-sheet.pdf`;
}

export default PagesPerSheet;