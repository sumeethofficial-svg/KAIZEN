import { useEffect, useMemo, useState } from "react";
import FileDropzone from "../../../components/files/FileDropzone";
import {
  convertPdfToJpg,
  getPdfPageCount,
} from "../../../services/pdf/pdfToJpg";

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PdfToJpg() {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);

  const [mode, setMode] = useState("all");
  const [selectedPages, setSelectedPages] = useState([]);

  const [scale, setScale] = useState(2);
  const [quality, setQuality] = useState(0.92);

  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

  const selectedPageCount = selectedPages.length;

  const outputCount = useMemo(() => {
    if (!file || !pageCount) {
      return 0;
    }

    return mode === "all"
      ? pageCount
      : selectedPageCount;
  }, [
    file,
    pageCount,
    mode,
    selectedPageCount,
  ]);

  async function handleFiles(files) {
    const selectedFile = files?.[0];

    if (!selectedFile) {
      return;
    }

    setFile(null);
    setPageCount(0);
    setSelectedPages([]);
    setResults([]);
    setProgress(0);
    setError("");
    setStatus("loading");

    try {
      const isPdf =
        selectedFile.type ===
          "application/pdf" ||
        selectedFile.name
          .toLowerCase()
          .endsWith(".pdf");

      if (!isPdf) {
        throw new Error(
          "Please select a valid PDF file."
        );
      }

      const count =
        await getPdfPageCount(
          selectedFile
        );

      setFile(selectedFile);
      setPageCount(count);
      setSelectedPages([]);
      setMode("all");
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
  }

  function selectAllPages() {
    if (!pageCount) {
      return;
    }

    setSelectedPages(
      Array.from(
        { length: pageCount },
        (_, index) => index + 1
      )
    );
  }

  function clearSelectedPages() {
    setSelectedPages([]);
  }

  async function handleConvert() {
    if (!file) {
      return;
    }

    if (
      mode === "selected" &&
      selectedPages.length === 0
    ) {
      setError(
        "Select at least one page to convert."
      );
      return;
    }

    setError("");
    setResults([]);
    setProgress(0);
    setStatus("processing");

    try {
      const pageSelection =
        mode === "all"
          ? null
          : selectedPages;

      const conversion =
        await convertPdfToJpg(
          file,
          {
            scale,
            quality,
          },
          pageSelection,
          ({ percentage }) => {
            setProgress(
              Math.max(
                0,
                Math.min(100, percentage)
              )
            );
          }
        );

      setResults(conversion.results);
      setProgress(100);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(
        err?.message ||
          "Unable to convert the PDF to JPG."
      );
    }
  }

  function handleReset() {
    setFile(null);
    setPageCount(0);
    setMode("all");
    setSelectedPages([]);
    setScale(2);
    setQuality(0.92);
    setStatus("idle");
    setProgress(0);
    setResults([]);
    setError("");
  }

  function downloadResult(result) {
    const url =
      URL.createObjectURL(result.blob);

    const anchor =
      document.createElement("a");

    anchor.href = url;
    anchor.download = result.fileName;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function downloadAll() {
    results.forEach((result, index) => {
      setTimeout(() => {
        downloadResult(result);
      }, index * 180);
    });
  }

  const uploadContent = (
    <>
      <div className="pdf-to-jpg-upload-icon">
        ↑
      </div>

      <div className="pdf-to-jpg-upload-title">
        Drop your PDF here
      </div>

      <div className="pdf-to-jpg-upload-subtitle">
        or click to browse
      </div>

      <div className="pdf-to-jpg-upload-meta">
        PDF files only
      </div>
    </>
  );

  return (
    <>
      <style>{`
        .pdf-to-jpg-workspace {
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

        .pdf-to-jpg-upload {
          width: 100%;
        }

        .pdf-to-jpg-upload label {
          display: block;
          cursor: pointer;
        }

        .pdf-to-jpg-upload input {
          display: none;
        }

        .pdf-to-jpg-upload-box {
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

        .pdf-to-jpg-upload-box:hover {
          border-color: rgba(255, 153, 72, 0.72);
          background:
            linear-gradient(
              180deg,
              rgba(255, 153, 72, 0.055),
              rgba(255, 255, 255, 0.025)
            );
          transform: translateY(-1px);
        }

        .pdf-to-jpg-upload-icon {
          width: 58px;
          height: 58px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          font-weight: 700;
          color: #ffffff;
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

        .pdf-to-jpg-upload-title {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .pdf-to-jpg-upload-subtitle {
          margin-top: 8px;
          color: rgba(255, 255, 255, 0.56);
          font-size: 14px;
        }

        .pdf-to-jpg-upload-meta {
          margin-top: 12px;
          color: rgba(255, 159, 84, 0.8);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.16em;
        }

        .pdf-to-jpg-file-card {
          min-height: 82px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.035);
          padding: 15px 17px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-sizing: border-box;
        }

        .pdf-to-jpg-file-icon {
          width: 46px;
          height: 46px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #ffffff;
          background:
            linear-gradient(
              145deg,
              rgba(255, 133, 51, 0.9),
              rgba(184, 57, 16, 0.8)
            );
          flex: 0 0 auto;
        }

        .pdf-to-jpg-file-info {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
          flex: 1;
        }

        .pdf-to-jpg-file-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 15px;
          font-weight: 650;
        }

        .pdf-to-jpg-file-meta {
          color: rgba(255, 255, 255, 0.48);
          font-size: 12px;
        }

        .pdf-to-jpg-file-remove {
          width: 34px;
          height: 34px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.035);
          color: rgba(255, 255, 255, 0.68);
          cursor: pointer;
          font-size: 18px;
          transition:
            background 160ms ease,
            color 160ms ease,
            border-color 160ms ease;
        }

        .pdf-to-jpg-file-remove:hover {
          color: #ffffff;
          border-color: rgba(255, 123, 48, 0.34);
          background: rgba(255, 123, 48, 0.1);
        }

        .pdf-to-jpg-panel {
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(255, 255, 255, 0.025);
          padding: 19px;
          box-sizing: border-box;
        }

        .pdf-to-jpg-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }

        .pdf-to-jpg-panel-title {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .pdf-to-jpg-panel-caption {
          color: rgba(255, 255, 255, 0.42);
          font-size: 12px;
        }

        .pdf-to-jpg-mode-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .pdf-to-jpg-mode-button {
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.025);
          color: rgba(255, 255, 255, 0.72);
          padding: 13px 15px;
          cursor: pointer;
          text-align: left;
          transition:
            border-color 160ms ease,
            background 160ms ease,
            color 160ms ease;
        }

        .pdf-to-jpg-mode-button:hover {
          border-color: rgba(255, 153, 72, 0.3);
          color: #ffffff;
        }

        .pdf-to-jpg-mode-button.active {
          border-color: rgba(255, 145, 63, 0.45);
          background: rgba(255, 125, 45, 0.08);
          color: #ffffff;
        }

        .pdf-to-jpg-mode-button strong {
          display: block;
          font-size: 13px;
          margin-bottom: 4px;
        }

        .pdf-to-jpg-mode-button span {
          display: block;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.42);
        }

        .pdf-to-jpg-page-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 16px;
          margin-bottom: 12px;
        }

        .pdf-to-jpg-page-toolbar-label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.53);
        }

        .pdf-to-jpg-page-actions {
          display: flex;
          gap: 8px;
        }

        .pdf-to-jpg-small-button {
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.035);
          color: rgba(255, 255, 255, 0.7);
          padding: 8px 11px;
          cursor: pointer;
          font-size: 11px;
          transition:
            border-color 160ms ease,
            background 160ms ease,
            color 160ms ease;
        }

        .pdf-to-jpg-small-button:hover:not(:disabled) {
          border-color: rgba(255, 139, 56, 0.32);
          background: rgba(255, 139, 56, 0.08);
          color: #ffffff;
        }

        .pdf-to-jpg-small-button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .pdf-to-jpg-page-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fill,
            minmax(58px, 1fr)
          );
          gap: 8px;
        }

        .pdf-to-jpg-page-button {
          min-height: 50px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.022);
          color: rgba(255, 255, 255, 0.64);
          cursor: pointer;
          font-size: 12px;
          font-weight: 650;
          transition:
            border-color 150ms ease,
            background 150ms ease,
            color 150ms ease,
            transform 150ms ease;
        }

        .pdf-to-jpg-page-button:hover {
          border-color: rgba(255, 151, 68, 0.34);
          color: #ffffff;
          transform: translateY(-1px);
        }

        .pdf-to-jpg-page-button.active {
          border-color: rgba(255, 144, 59, 0.55);
          background: rgba(255, 130, 45, 0.12);
          color: #ffffff;
          box-shadow:
            inset 0 0 0 1px rgba(255, 139, 56, 0.08),
            0 0 22px rgba(255, 119, 45, 0.08);
        }

        .pdf-to-jpg-options {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          margin-top: 16px;
        }

        .pdf-to-jpg-option {
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.02);
          padding: 14px;
        }

        .pdf-to-jpg-option-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }

        .pdf-to-jpg-option-label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.62);
        }

        .pdf-to-jpg-option-value {
          color: #ffffff;
          font-size: 12px;
          font-weight: 700;
        }

        .pdf-to-jpg-option input[type="range"] {
          width: 100%;
          accent-color: #ff873d;
          cursor: pointer;
        }

        .pdf-to-jpg-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 16px;
        }

        .pdf-to-jpg-primary-button,
        .pdf-to-jpg-secondary-button {
          border-radius: 13px;
          padding: 12px 18px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition:
            transform 160ms ease,
            opacity 160ms ease,
            border-color 160ms ease,
            background 160ms ease;
        }

        .pdf-to-jpg-primary-button {
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

        .pdf-to-jpg-primary-button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .pdf-to-jpg-primary-button:disabled,
        .pdf-to-jpg-secondary-button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .pdf-to-jpg-secondary-button {
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.7);
          background: rgba(255, 255, 255, 0.035);
        }

        .pdf-to-jpg-secondary-button:hover:not(:disabled) {
          border-color: rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.055);
          color: #ffffff;
        }

        .pdf-to-jpg-progress {
          margin-top: 16px;
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(255, 255, 255, 0.02);
          padding: 14px;
        }

        .pdf-to-jpg-progress-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .pdf-to-jpg-progress-label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.58);
        }

        .pdf-to-jpg-progress-value {
          font-size: 12px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.86);
        }

        .pdf-to-jpg-progress-track {
          height: 7px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.06);
        }

        .pdf-to-jpg-progress-fill {
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

        .pdf-to-jpg-error {
          margin-top: 16px;
          border-radius: 14px;
          border: 1px solid rgba(255, 89, 69, 0.2);
          background: rgba(255, 73, 52, 0.06);
          color: rgba(255, 185, 175, 0.95);
          padding: 13px 14px;
          font-size: 12px;
          line-height: 1.55;
        }

        .pdf-to-jpg-success {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          border-radius: 16px;
          border: 1px solid rgba(121, 255, 178, 0.12);
          background: rgba(95, 255, 160, 0.035);
          padding: 14px 15px;
        }

        .pdf-to-jpg-success-copy {
          min-width: 0;
        }

        .pdf-to-jpg-success-title {
          font-size: 13px;
          font-weight: 700;
        }

        .pdf-to-jpg-success-meta {
          margin-top: 4px;
          color: rgba(255, 255, 255, 0.44);
          font-size: 11px;
        }

        .pdf-to-jpg-results {
          display: grid;
          grid-template-columns: repeat(
            auto-fill,
            minmax(220px, 1fr)
          );
          gap: 12px;
        }

        .pdf-to-jpg-result-card {
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 17px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.025);
        }

        .pdf-to-jpg-result-preview {
          width: 100%;
          aspect-ratio: 4 / 3;
          background:
            linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.055),
              rgba(255, 255, 255, 0.018)
            );
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .pdf-to-jpg-result-preview img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }

        .pdf-to-jpg-result-info {
          padding: 12px;
        }

        .pdf-to-jpg-result-name {
          font-size: 11px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: rgba(255, 255, 255, 0.78);
        }

        .pdf-to-jpg-result-meta {
          margin-top: 5px;
          color: rgba(255, 255, 255, 0.4);
          font-size: 10px;
        }

        .pdf-to-jpg-result-download {
          margin-top: 10px;
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.035);
          color: rgba(255, 255, 255, 0.72);
          padding: 9px 10px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 650;
        }

        .pdf-to-jpg-result-download:hover {
          border-color: rgba(255, 139, 56, 0.28);
          background: rgba(255, 139, 56, 0.07);
          color: #ffffff;
        }

        @media (max-width: 900px) {
          .pdf-to-jpg-workspace {
            padding-left: 28px;
            padding-right: 28px;
          }
        }

        @media (max-width: 640px) {
          .pdf-to-jpg-workspace {
            padding-left: 18px;
            padding-right: 18px;
          }

          .pdf-to-jpg-mode-row,
          .pdf-to-jpg-options {
            grid-template-columns: 1fr;
          }

          .pdf-to-jpg-page-toolbar {
            align-items: flex-start;
            flex-direction: column;
          }

          .pdf-to-jpg-success {
            align-items: flex-start;
            flex-direction: column;
          }

          .pdf-to-jpg-actions {
            flex-direction: column;
          }

          .pdf-to-jpg-primary-button,
          .pdf-to-jpg-secondary-button {
            width: 100%;
          }
        }
      `}</style>

      <div className="pdf-to-jpg-workspace">
        {!file ? (
          <div className="pdf-to-jpg-upload">
            <FileDropzone
              accept="application/pdf,.pdf"
              onFiles={handleFiles}
            >
              <div className="pdf-to-jpg-upload-box">
                {uploadContent}
              </div>
            </FileDropzone>
          </div>
        ) : (
          <>
            <div className="pdf-to-jpg-file-card">
              <div className="pdf-to-jpg-file-icon">
                PDF
              </div>

              <div className="pdf-to-jpg-file-info">
                <div className="pdf-to-jpg-file-name">
                  {file.name}
                </div>

                <div className="pdf-to-jpg-file-meta">
                  {formatFileSize(file.size)} ·{" "}
                  {pageCount}{" "}
                  {pageCount === 1
                    ? "page"
                    : "pages"}
                </div>
              </div>

              <button
                type="button"
                className="pdf-to-jpg-file-remove"
                onClick={handleReset}
                aria-label="Remove PDF"
                disabled={
                  status === "processing"
                }
              >
                ×
              </button>
            </div>

            <div className="pdf-to-jpg-panel">
              <div className="pdf-to-jpg-panel-header">
                <div className="pdf-to-jpg-panel-title">
                  Conversion settings
                </div>

                <div className="pdf-to-jpg-panel-caption">
                  {outputCount}{" "}
                  {outputCount === 1
                    ? "image"
                    : "images"}{" "}
                  will be created
                </div>
              </div>

              <div className="pdf-to-jpg-mode-row">
                <button
                  type="button"
                  className={`pdf-to-jpg-mode-button ${
                    mode === "all"
                      ? "active"
                      : ""
                  }`}
                  onClick={() => {
                    setMode("all");
                    setSelectedPages([]);
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
                    Convert every page in
                    the PDF
                  </span>
                </button>

                <button
                  type="button"
                  className={`pdf-to-jpg-mode-button ${
                    mode === "selected"
                      ? "active"
                      : ""
                  }`}
                  onClick={() => {
                    setMode("selected");
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
                    Choose exactly which
                    pages to convert
                  </span>
                </button>
              </div>

              {mode === "selected" && (
                <>
                  <div className="pdf-to-jpg-page-toolbar">
                    <div className="pdf-to-jpg-page-toolbar-label">
                      {selectedPageCount} of{" "}
                      {pageCount} pages
                      selected
                    </div>

                    <div className="pdf-to-jpg-page-actions">
                      <button
                        type="button"
                        className="pdf-to-jpg-small-button"
                        onClick={() => {
                          selectAllPages();
                          setError("");
                        }}
                        disabled={
                          status ===
                          "processing"
                        }
                      >
                        Select all
                      </button>

                      <button
                        type="button"
                        className="pdf-to-jpg-small-button"
                        onClick={() => {
                          clearSelectedPages();
                          setError("");
                        }}
                        disabled={
                          selectedPageCount ===
                            0 ||
                          status ===
                            "processing"
                        }
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="pdf-to-jpg-page-grid">
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
                            className={`pdf-to-jpg-page-button ${
                              active
                                ? "active"
                                : ""
                            }`}
                            onClick={() => {
                              togglePage(
                                pageNumber
                              );
                              setError("");
                            }}
                            aria-pressed={
                              active
                            }
                            disabled={
                              status ===
                              "processing"
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

              <div className="pdf-to-jpg-options">
                <div className="pdf-to-jpg-option">
                  <div className="pdf-to-jpg-option-top">
                    <span className="pdf-to-jpg-option-label">
                      Render scale
                    </span>

                    <span className="pdf-to-jpg-option-value">
                      {scale}×
                    </span>
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.5"
                    value={scale}
                    onChange={(event) =>
                      setScale(
                        Number(
                          event.target.value
                        )
                      )
                    }
                    disabled={
                      status === "processing"
                    }
                    aria-label="Render scale"
                  />
                </div>

                <div className="pdf-to-jpg-option">
                  <div className="pdf-to-jpg-option-top">
                    <span className="pdf-to-jpg-option-label">
                      JPG quality
                    </span>

                    <span className="pdf-to-jpg-option-value">
                      {Math.round(
                        quality * 100
                      )}
                      %
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0.6"
                    max="1"
                    step="0.01"
                    value={quality}
                    onChange={(event) =>
                      setQuality(
                        Number(
                          event.target.value
                        )
                      )
                    }
                    disabled={
                      status === "processing"
                    }
                    aria-label="JPG quality"
                  />
                </div>
              </div>

              {status === "processing" && (
                <div className="pdf-to-jpg-progress">
                  <div className="pdf-to-jpg-progress-top">
                    <span className="pdf-to-jpg-progress-label">
                      Converting PDF…
                    </span>

                    <span className="pdf-to-jpg-progress-value">
                      {progress}%
                    </span>
                  </div>

                  <div className="pdf-to-jpg-progress-track">
                    <div
                      className="pdf-to-jpg-progress-fill"
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="pdf-to-jpg-error">
                  {error}
                </div>
              )}

              <div className="pdf-to-jpg-actions">
                <button
                  type="button"
                  className="pdf-to-jpg-secondary-button"
                  onClick={handleReset}
                  disabled={
                    status === "processing"
                  }
                >
                  Reset
                </button>

                <button
                  type="button"
                  className="pdf-to-jpg-primary-button"
                  onClick={handleConvert}
                  disabled={
                    status === "processing" ||
                    (mode === "selected" &&
                      selectedPageCount === 0)
                  }
                >
                  {status === "processing"
                    ? "Converting…"
                    : "Convert to JPG"}
                </button>
              </div>
            </div>
          </>
        )}

        {status === "success" &&
          results.length > 0 && (
            <>
              <div className="pdf-to-jpg-success">
                <div className="pdf-to-jpg-success-copy">
                  <div className="pdf-to-jpg-success-title">
                    Conversion complete
                  </div>

                  <div className="pdf-to-jpg-success-meta">
                    {results.length}{" "}
                    {results.length === 1
                      ? "JPG image"
                      : "JPG images"}{" "}
                    created successfully
                  </div>
                </div>

                <button
                  type="button"
                  className="pdf-to-jpg-primary-button"
                  onClick={downloadAll}
                >
                  Download all
                </button>
              </div>

              <div className="pdf-to-jpg-results">
                {results.map((result) => (
                  <PdfToJpgResult
                    key={result.fileName}
                    result={result}
                  />
                ))}
              </div>
            </>
          )}

        {status === "loading" && (
          <div className="pdf-to-jpg-progress">
            <div className="pdf-to-jpg-progress-top">
              <span className="pdf-to-jpg-progress-label">
                Reading PDF…
              </span>

              <span className="pdf-to-jpg-progress-value">
                Please wait
              </span>
            </div>

            <div className="pdf-to-jpg-progress-track">
              <div
                className="pdf-to-jpg-progress-fill"
                style={{
                  width: "100%",
                }}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function PdfToJpgResult({ result }) {
  const [previewUrl, setPreviewUrl] =
    useState("");

  useEffect(() => {
    const url =
      URL.createObjectURL(result.blob);

    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [result.blob]);

  function handleDownload() {
    const url =
      URL.createObjectURL(result.blob);

    const anchor =
      document.createElement("a");

    anchor.href = url;
    anchor.download = result.fileName;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  return (
    <div className="pdf-to-jpg-result-card">
      <div className="pdf-to-jpg-result-preview">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={`Preview of ${result.fileName}`}
          />
        ) : (
          <span>
            Loading preview…
          </span>
        )}
      </div>

      <div className="pdf-to-jpg-result-info">
        <div className="pdf-to-jpg-result-name">
          {result.fileName}
        </div>

        <div className="pdf-to-jpg-result-meta">
          Page {result.pageNumber} ·{" "}
          {result.width} ×{" "}
          {result.height}
        </div>

        <button
          type="button"
          className="pdf-to-jpg-result-download"
          onClick={handleDownload}
        >
          Download JPG
        </button>
      </div>
    </div>
  );
}

export default PdfToJpg;