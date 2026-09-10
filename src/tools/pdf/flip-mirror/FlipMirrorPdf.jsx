import { useState } from "react";
import FileDropzone from "../../../components/files/FileDropzone";
import {
  flipMirrorPdf,
  getPdfPageCount,
} from "../../../services/pdf/flipMirrorPdf";

function FlipMirrorPdf() {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);

  const [mode, setMode] = useState("horizontal");
  const [scope, setScope] = useState("all");
  const [selectedPages, setSelectedPages] = useState([]);

  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

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
    setSelectedPages([]);
    setResult(null);
    setProgress(0);
    setError("");
    setStatus("loading");

    try {
      const count =
        await getPdfPageCount(
          selectedFile
        );

      if (!count || count < 1) {
        throw new Error(
          "The PDF does not contain any pages."
        );
      }

      setFile(selectedFile);
      setPageCount(count);
      setScope("all");
      setMode("horizontal");
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setError(
        err?.message ||
          "Unable to read this PDF file."
      );
    }
  }

  function togglePage(pageNumber) {
    setSelectedPages((current) => {
      if (current.includes(pageNumber)) {
        return current.filter(
          (page) => page !== pageNumber
        );
      }

      return [...current, pageNumber].sort(
        (a, b) => a - b
      );
    });

    setError("");
  }

  function selectAllPages() {
    setSelectedPages(
      Array.from(
        { length: pageCount },
        (_, index) => index + 1
      )
    );

    setError("");
  }

  function clearSelectedPages() {
    setSelectedPages([]);
    setError("");
  }

  async function handleFlip() {
    if (!file) {
      return;
    }

    if (
      scope === "selected" &&
      selectedPages.length === 0
    ) {
      setError(
        "Select at least one page to flip."
      );
      setStatus("error");
      return;
    }

    setError("");
    setResult(null);
    setProgress(0);
    setStatus("processing");

    try {
      const pageSelection =
        scope === "all"
          ? null
          : selectedPages;

      const output =
        await flipMirrorPdf(
          file,
          mode,
          pageSelection,
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
          "Unable to flip or mirror the PDF."
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
      getOutputFileName(file?.name, mode);

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
    setMode("horizontal");
    setScope("all");
    setSelectedPages([]);
    setStatus("idle");
    setProgress(0);
    setResult(null);
    setError("");
  }

  const selectedCount =
    selectedPages.length;

  const affectedPages =
    scope === "all"
      ? pageCount
      : selectedCount;

  return (
    <>
      <style>{`
        .flip-mirror-workspace {
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

        .flip-mirror-workspace-empty {
          min-height: 420px;
          justify-content: center;
        }

        .flip-mirror-upload {
          width: 100%;
        }

        .flip-mirror-upload label {
          display: block;
          width: 100%;
          cursor: pointer;
        }

        .flip-mirror-upload input {
          display: none;
        }

        .flip-mirror-upload-box {
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

        .flip-mirror-upload-box:hover {
          border-color: rgba(255, 153, 72, 0.72);
          background:
            linear-gradient(
              180deg,
              rgba(255, 153, 72, 0.055),
              rgba(255, 255, 255, 0.025)
            );
          transform: translateY(-1px);
        }

        .flip-mirror-upload-icon {
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

        .flip-mirror-upload-title {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .flip-mirror-upload-subtitle {
          margin-top: 8px;
          color: rgba(255, 255, 255, 0.56);
          font-size: 14px;
        }

        .flip-mirror-upload-meta {
          margin-top: 12px;
          color: rgba(255, 159, 84, 0.8);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.16em;
        }

        .flip-mirror-file-card {
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

        .flip-mirror-file-icon {
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

        .flip-mirror-file-info {
          min-width: 0;
          flex: 1;
        }

        .flip-mirror-file-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 15px;
          font-weight: 650;
        }

        .flip-mirror-file-meta {
          margin-top: 5px;
          color: rgba(255, 255, 255, 0.48);
          font-size: 12px;
        }

        .flip-mirror-file-remove {
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

        .flip-mirror-file-remove:hover {
          color: #ffffff;
          border-color: rgba(255, 123, 48, 0.34);
          background: rgba(255, 123, 48, 0.1);
        }

        .flip-mirror-panel {
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(255, 255, 255, 0.025);
          padding: 20px;
          box-sizing: border-box;
        }

        .flip-mirror-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }

        .flip-mirror-panel-title {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .flip-mirror-panel-caption {
          color: rgba(255, 255, 255, 0.42);
          font-size: 12px;
        }

        .flip-mirror-option-grid {
          display: grid;
          grid-template-columns: repeat(
            3,
            minmax(0, 1fr)
          );
          gap: 10px;
        }

        .flip-mirror-option {
          min-height: 88px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.025);
          color: rgba(255, 255, 255, 0.65);
          padding: 13px;
          cursor: pointer;
          text-align: left;
          transition:
            border-color 160ms ease,
            background 160ms ease,
            color 160ms ease,
            transform 160ms ease;
        }

        .flip-mirror-option:hover {
          border-color: rgba(255, 153, 72, 0.3);
          color: #ffffff;
          transform: translateY(-1px);
        }

        .flip-mirror-option.active {
          border-color: rgba(255, 145, 63, 0.48);
          background: rgba(255, 125, 45, 0.08);
          color: #ffffff;
        }

        .flip-mirror-option-icon {
          display: block;
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .flip-mirror-option-title {
          display: block;
          font-size: 12px;
          font-weight: 700;
        }

        .flip-mirror-option-description {
          display: block;
          margin-top: 4px;
          color: rgba(255, 255, 255, 0.4);
          font-size: 10px;
        }

        .flip-mirror-scope {
          margin-top: 16px;
        }

        .flip-mirror-scope-label {
          display: block;
          margin-bottom: 9px;
          color: rgba(255, 255, 255, 0.42);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.11em;
        }

        .flip-mirror-scope-row {
          display: grid;
          grid-template-columns: repeat(
            2,
            minmax(0, 1fr)
          );
          gap: 10px;
        }

        .flip-mirror-scope-button {
          border-radius: 13px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.025);
          color: rgba(255, 255, 255, 0.68);
          padding: 12px 14px;
          cursor: pointer;
          text-align: left;
          transition:
            border-color 160ms ease,
            background 160ms ease,
            color 160ms ease;
        }

        .flip-mirror-scope-button:hover {
          border-color: rgba(255, 153, 72, 0.28);
          color: #ffffff;
        }

        .flip-mirror-scope-button.active {
          border-color: rgba(255, 145, 63, 0.45);
          background: rgba(255, 125, 45, 0.08);
          color: #ffffff;
        }

        .flip-mirror-scope-button strong {
          display: block;
          font-size: 12px;
        }

        .flip-mirror-scope-button span {
          display: block;
          margin-top: 4px;
          color: rgba(255, 255, 255, 0.4);
          font-size: 10px;
        }

        .flip-mirror-page-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 16px;
          margin-bottom: 12px;
        }

        .flip-mirror-page-count {
          color: rgba(255, 255, 255, 0.5);
          font-size: 11px;
        }

        .flip-mirror-page-actions {
          display: flex;
          gap: 8px;
        }

        .flip-mirror-small-button {
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.035);
          color: rgba(255, 255, 255, 0.7);
          padding: 8px 11px;
          cursor: pointer;
          font-size: 11px;
        }

        .flip-mirror-small-button:hover:not(:disabled) {
          border-color: rgba(255, 139, 56, 0.32);
          background: rgba(255, 139, 56, 0.08);
          color: #ffffff;
        }

        .flip-mirror-small-button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .flip-mirror-page-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fill,
            minmax(62px, 1fr)
          );
          gap: 8px;
        }

        .flip-mirror-page-button {
          min-height: 50px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.022);
          color: rgba(255, 255, 255, 0.62);
          cursor: pointer;
          font-size: 11px;
          font-weight: 650;
          transition:
            border-color 150ms ease,
            background 150ms ease,
            color 150ms ease,
            transform 150ms ease;
        }

        .flip-mirror-page-button:hover:not(:disabled) {
          border-color: rgba(255, 151, 68, 0.34);
          color: #ffffff;
          transform: translateY(-1px);
        }

        .flip-mirror-page-button.active {
          border-color: rgba(255, 144, 59, 0.55);
          background: rgba(255, 130, 45, 0.12);
          color: #ffffff;
        }

        .flip-mirror-page-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .flip-mirror-summary {
          display: grid;
          grid-template-columns: repeat(
            3,
            minmax(0, 1fr)
          );
          gap: 10px;
          margin-top: 16px;
        }

        .flip-mirror-summary-card {
          border-radius: 13px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.018);
          padding: 13px;
        }

        .flip-mirror-summary-label {
          color: rgba(255, 255, 255, 0.38);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .flip-mirror-summary-value {
          margin-top: 5px;
          color: rgba(255, 255, 255, 0.88);
          font-size: 15px;
          font-weight: 700;
        }

        .flip-mirror-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 18px;
        }

        .flip-mirror-primary,
        .flip-mirror-secondary {
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

        .flip-mirror-primary {
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

        .flip-mirror-primary:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .flip-mirror-secondary {
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.7);
          background: rgba(255, 255, 255, 0.035);
        }

        .flip-mirror-secondary:hover:not(:disabled) {
          border-color: rgba(255, 255, 255, 0.14);
          color: #ffffff;
        }

        .flip-mirror-primary:disabled,
        .flip-mirror-secondary:disabled,
        .flip-mirror-file-remove:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .flip-mirror-progress {
          margin-top: 18px;
          padding: 14px;
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(255, 255, 255, 0.02);
        }

        .flip-mirror-progress-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .flip-mirror-progress-label {
          color: rgba(255, 255, 255, 0.56);
          font-size: 12px;
        }

        .flip-mirror-progress-value {
          color: rgba(255, 255, 255, 0.84);
          font-size: 12px;
          font-weight: 700;
        }

        .flip-mirror-progress-track {
          height: 7px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.06);
        }

        .flip-mirror-progress-fill {
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

        .flip-mirror-error {
          margin-top: 16px;
          padding: 13px 14px;
          border-radius: 14px;
          border: 1px solid rgba(255, 89, 69, 0.2);
          background: rgba(255, 73, 52, 0.06);
          color: rgba(255, 185, 175, 0.95);
          font-size: 12px;
          line-height: 1.5;
        }

        .flip-mirror-success {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          border-radius: 17px;
          border: 1px solid rgba(121, 255, 178, 0.12);
          background: rgba(95, 255, 160, 0.035);
          padding: 15px;
        }

        .flip-mirror-success-title {
          font-size: 13px;
          font-weight: 700;
        }

        .flip-mirror-success-meta {
          margin-top: 4px;
          color: rgba(255, 255, 255, 0.42);
          font-size: 11px;
        }

        @media (max-width: 900px) {
          .flip-mirror-workspace {
            padding-left: 28px;
            padding-right: 28px;
          }
        }

        @media (max-width: 680px) {
          .flip-mirror-workspace {
            padding-left: 18px;
            padding-right: 18px;
          }

          .flip-mirror-workspace-empty {
            min-height: 360px;
          }

          .flip-mirror-option-grid,
          .flip-mirror-scope-row,
          .flip-mirror-summary {
            grid-template-columns: 1fr;
          }

          .flip-mirror-page-toolbar {
            align-items: flex-start;
            flex-direction: column;
          }

          .flip-mirror-success {
            align-items: flex-start;
            flex-direction: column;
          }

          .flip-mirror-actions {
            flex-direction: column;
          }

          .flip-mirror-primary,
          .flip-mirror-secondary {
            width: 100%;
          }
        }
      `}</style>

      <div
        className={`flip-mirror-workspace ${
          !file
            ? "flip-mirror-workspace-empty"
            : ""
        }`}
      >
        {!file ? (
          <div className="flip-mirror-upload">
            <FileDropzone
              accept="application/pdf,.pdf"
              onFiles={handleFiles}
            >
              <div className="flip-mirror-upload-box">
                <div className="flip-mirror-upload-icon">
                  ↔
                </div>

                <div className="flip-mirror-upload-title">
                  Drop your PDF here
                </div>

                <div className="flip-mirror-upload-subtitle">
                  or click to browse
                </div>

                <div className="flip-mirror-upload-meta">
                  PDF files only
                </div>
              </div>
            </FileDropzone>
          </div>
        ) : (
          <>
            <div className="flip-mirror-file-card">
              <div className="flip-mirror-file-icon">
                PDF
              </div>

              <div className="flip-mirror-file-info">
                <div className="flip-mirror-file-name">
                  {file.name}
                </div>

                <div className="flip-mirror-file-meta">
                  {pageCount}{" "}
                  {pageCount === 1
                    ? "page"
                    : "pages"}
                </div>
              </div>

              <button
                type="button"
                className="flip-mirror-file-remove"
                onClick={handleReset}
                disabled={
                  status === "processing"
                }
                aria-label="Remove PDF"
              >
                ×
              </button>
            </div>

            <div className="flip-mirror-panel">
              <div className="flip-mirror-panel-header">
                <div className="flip-mirror-panel-title">
                  Flip / Mirror
                </div>

                <div className="flip-mirror-panel-caption">
                  Choose the transformation
                </div>
              </div>

              <div className="flip-mirror-option-grid">
                <button
                  type="button"
                  className={`flip-mirror-option ${
                    mode === "horizontal"
                      ? "active"
                      : ""
                  }`}
                  onClick={() => {
                    setMode("horizontal");
                    setError("");
                  }}
                  disabled={
                    status === "processing"
                  }
                >
                  <span className="flip-mirror-option-icon">
                    ↔
                  </span>

                  <span className="flip-mirror-option-title">
                    Horizontal
                  </span>

                  <span className="flip-mirror-option-description">
                    Mirror left ↔ right
                  </span>
                </button>

                <button
                  type="button"
                  className={`flip-mirror-option ${
                    mode === "vertical"
                      ? "active"
                      : ""
                  }`}
                  onClick={() => {
                    setMode("vertical");
                    setError("");
                  }}
                  disabled={
                    status === "processing"
                  }
                >
                  <span className="flip-mirror-option-icon">
                    ↕
                  </span>

                  <span className="flip-mirror-option-title">
                    Vertical
                  </span>

                  <span className="flip-mirror-option-description">
                    Mirror top ↕ bottom
                  </span>
                </button>

                <button
                  type="button"
                  className={`flip-mirror-option ${
                    mode === "both"
                      ? "active"
                      : ""
                  }`}
                  onClick={() => {
                    setMode("both");
                    setError("");
                  }}
                  disabled={
                    status === "processing"
                  }
                >
                  <span className="flip-mirror-option-icon">
                    ⤢
                  </span>

                  <span className="flip-mirror-option-title">
                    Both
                  </span>

                  <span className="flip-mirror-option-description">
                    Flip in both directions
                  </span>
                </button>
              </div>

              <div className="flip-mirror-scope">
                <span className="flip-mirror-scope-label">
                  Apply to
                </span>

                <div className="flip-mirror-scope-row">
                  <button
                    type="button"
                    className={`flip-mirror-scope-button ${
                      scope === "all"
                        ? "active"
                        : ""
                    }`}
                    onClick={() => {
                      setScope("all");
                      setError("");
                    }}
                    disabled={
                      status === "processing"
                    }
                  >
                    <strong>
                      All pages
                    </strong>

                    <span>
                      Flip the complete PDF
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`flip-mirror-scope-button ${
                      scope === "selected"
                        ? "active"
                        : ""
                    }`}
                    onClick={() => {
                      setScope("selected");
                      setError("");
                    }}
                    disabled={
                      status === "processing"
                    }
                  >
                    <strong>
                      Selected pages
                    </strong>

                    <span>
                      Choose specific pages
                    </span>
                  </button>
                </div>
              </div>

              {scope === "selected" && (
                <>
                  <div className="flip-mirror-page-toolbar">
                    <div className="flip-mirror-page-count">
                      {selectedCount} of{" "}
                      {pageCount} pages
                      selected
                    </div>

                    <div className="flip-mirror-page-actions">
                      <button
                        type="button"
                        className="flip-mirror-small-button"
                        onClick={
                          selectAllPages
                        }
                        disabled={
                          status ===
                          "processing"
                        }
                      >
                        Select all
                      </button>

                      <button
                        type="button"
                        className="flip-mirror-small-button"
                        onClick={
                          clearSelectedPages
                        }
                        disabled={
                          selectedCount ===
                            0 ||
                          status ===
                            "processing"
                        }
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="flip-mirror-page-grid">
                    {Array.from(
                      {
                        length: pageCount,
                      },
                      (_, index) => {
                        const pageNumber =
                          index + 1;

                        const active =
                          selectedPages.includes(
                            pageNumber
                          );

                        return (
                          <button
                            key={
                              pageNumber
                            }
                            type="button"
                            className={`flip-mirror-page-button ${
                              active
                                ? "active"
                                : ""
                            }`}
                            onClick={() =>
                              togglePage(
                                pageNumber
                              )
                            }
                            disabled={
                              status ===
                              "processing"
                            }
                            aria-pressed={
                              active
                            }
                          >
                            Page{" "}
                            {pageNumber}
                          </button>
                        );
                      }
                    )}
                  </div>
                </>
              )}

              <div className="flip-mirror-summary">
                <div className="flip-mirror-summary-card">
                  <div className="flip-mirror-summary-label">
                    PDF pages
                  </div>

                  <div className="flip-mirror-summary-value">
                    {pageCount}
                  </div>
                </div>

                <div className="flip-mirror-summary-card">
                  <div className="flip-mirror-summary-label">
                    Affected
                  </div>

                  <div className="flip-mirror-summary-value">
                    {affectedPages}
                  </div>
                </div>

                <div className="flip-mirror-summary-card">
                  <div className="flip-mirror-summary-label">
                    Direction
                  </div>

                  <div className="flip-mirror-summary-value">
                    {mode === "horizontal"
                      ? "Horizontal"
                      : mode === "vertical"
                        ? "Vertical"
                        : "Both"}
                  </div>
                </div>
              </div>

              {status === "processing" && (
                <div className="flip-mirror-progress">
                  <div className="flip-mirror-progress-top">
                    <span className="flip-mirror-progress-label">
                      Applying mirror transformation…
                    </span>

                    <span className="flip-mirror-progress-value">
                      {progress}%
                    </span>
                  </div>

                  <div className="flip-mirror-progress-track">
                    <div
                      className="flip-mirror-progress-fill"
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="flip-mirror-error">
                  {error}
                </div>
              )}

              <div className="flip-mirror-actions">
                <button
                  type="button"
                  className="flip-mirror-secondary"
                  onClick={handleReset}
                  disabled={
                    status === "processing"
                  }
                >
                  Reset
                </button>

                <button
                  type="button"
                  className="flip-mirror-primary"
                  onClick={handleFlip}
                  disabled={
                    status === "processing" ||
                    (scope === "selected" &&
                      selectedCount === 0)
                  }
                >
                  {status === "processing"
                    ? "Processing…"
                    : "Apply Flip"}
                </button>
              </div>
            </div>
          </>
        )}

        {status === "success" && result && (
          <div className="flip-mirror-success">
            <div>
              <div className="flip-mirror-success-title">
                Flip / Mirror complete
              </div>

              <div className="flip-mirror-success-meta">
                {result.flippedPages}{" "}
                {result.flippedPages === 1
                  ? "page"
                  : "pages"}{" "}
                transformed successfully.
              </div>
            </div>

            <button
              type="button"
              className="flip-mirror-primary"
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

function getOutputFileName(
  fileName,
  mode
) {
  const baseName =
    fileName?.replace(
      /\.pdf$/i,
      ""
    ) || "document";

  const suffix =
    mode === "horizontal"
      ? "horizontal-flip"
      : mode === "vertical"
        ? "vertical-flip"
        : "double-flip";

  return `${baseName}-${suffix}.pdf`;
}

export default FlipMirrorPdf;