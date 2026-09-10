import { useState } from "react";
import FileDropzone from "../../../components/files/FileDropzone";
import {
  createPdfZip,
  getPdfFilesInfo,
} from "../../../services/pdf/pdfToZip";

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

function PdfToZip() {
  const [files, setFiles] = useState([]);

  const [compression, setCompression] =
    useState("DEFLATE");

  const [compressionLevel, setCompressionLevel] =
    useState(6);

  const [status, setStatus] =
    useState("idle");

  const [progress, setProgress] =
    useState(0);

  const [currentFile, setCurrentFile] =
    useState("");

  const [result, setResult] =
    useState(null);

  const [error, setError] =
    useState("");

  function handleFiles(selectedFiles) {
    if (!selectedFiles?.length) {
      return;
    }

    try {
      const info =
        getPdfFilesInfo(
          selectedFiles
        );

      setFiles(
        Array.from(
          selectedFiles
        )
      );

      setResult(null);
      setProgress(0);
      setCurrentFile("");
      setError("");
      setStatus("ready");

      /*
       * Keep the validation result available
       * without storing duplicate file metadata
       * in state.
       */
      void info;
    } catch (err) {
      setFiles([]);
      setResult(null);
      setProgress(0);
      setCurrentFile("");
      setStatus("error");
      setError(
        err?.message ||
          "Unable to read the selected PDF files."
      );
    }
  }

  function removeFile(index) {
    setFiles((current) =>
      current.filter(
        (_, fileIndex) =>
          fileIndex !== index
      )
    );

    setResult(null);
    setError("");
    setProgress(0);

    setStatus(
      files.length <= 1
        ? "idle"
        : "ready"
    );
  }

  function handleReset() {
    setFiles([]);
    setCompression("DEFLATE");
    setCompressionLevel(6);
    setStatus("idle");
    setProgress(0);
    setCurrentFile("");
    setResult(null);
    setError("");
  }

  async function handleCreateZip() {
    if (!files.length) {
      setError(
        "Please select at least one PDF file."
      );
      setStatus("error");
      return;
    }

    setError("");
    setResult(null);
    setProgress(0);
    setCurrentFile("");
    setStatus("processing");

    try {
      const output =
        await createPdfZip(
          files,
          {
            compression,
            compressionLevel,
          },
          ({
            percent,
            currentFile: processingFile,
          }) => {
            setProgress(
              Math.max(
                0,
                Math.min(
                  100,
                  Math.round(
                    percent
                  )
                )
              )
            );

            setCurrentFile(
              processingFile || ""
            );
          }
        );

      setResult(output);
      setProgress(100);
      setCurrentFile("");
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setCurrentFile("");
      setError(
        err?.message ||
          "Unable to create the ZIP archive."
      );
    }
  }

  function handleDownload() {
    if (!result?.blob) {
      return;
    }

    const url =
      URL.createObjectURL(
        result.blob
      );

    const anchor =
      document.createElement("a");

    anchor.href = url;
    anchor.download =
      "kaizen-pdfs.zip";

    document.body.appendChild(
      anchor
    );

    anchor.click();
    anchor.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  const totalSize =
    files.reduce(
      (total, file) =>
        total + file.size,
      0
    );

  const canCreateZip =
    files.length > 0 &&
    status !== "processing";

  return (
    <>
      <style>{`
        .pdf-to-zip-workspace {
          width: 100%;
          max-width: 1080px;
          margin: 0 auto;
          padding: 22px 46px 38px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 18px;
          color: rgba(255, 255, 255, 0.95);
        }

        .pdf-to-zip-empty {
          min-height: 420px;
          justify-content: center;
        }

        .pdf-to-zip-upload {
          width: 100%;
        }

        .pdf-to-zip-upload label {
          display: block;
          width: 100%;
          cursor: pointer;
        }

        .pdf-to-zip-upload input {
          display: none;
        }

        .pdf-to-zip-upload-box {
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

        .pdf-to-zip-upload-box:hover {
          border-color: rgba(255, 153, 72, 0.72);
          background:
            linear-gradient(
              180deg,
              rgba(255, 153, 72, 0.055),
              rgba(255, 255, 255, 0.025)
            );
          transform: translateY(-1px);
        }

        .pdf-to-zip-upload-icon {
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

        .pdf-to-zip-upload-title {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .pdf-to-zip-upload-subtitle {
          margin-top: 8px;
          color: rgba(255, 255, 255, 0.56);
          font-size: 14px;
        }

        .pdf-to-zip-upload-meta {
          margin-top: 12px;
          color: rgba(255, 159, 84, 0.8);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.16em;
        }

        .pdf-to-zip-file-list {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .pdf-to-zip-file {
          min-height: 72px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(255, 255, 255, 0.03);
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 13px;
          box-sizing: border-box;
        }

        .pdf-to-zip-file-icon {
          width: 43px;
          height: 43px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          color: #ffffff;
          background:
            linear-gradient(
              145deg,
              rgba(255, 133, 51, 0.9),
              rgba(184, 57, 16, 0.8)
            );
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .pdf-to-zip-file-info {
          min-width: 0;
          flex: 1;
        }

        .pdf-to-zip-file-name {
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: 13px;
          font-weight: 650;
        }

        .pdf-to-zip-file-meta {
          margin-top: 4px;
          color: rgba(255, 255, 255, 0.4);
          font-size: 10px;
        }

        .pdf-to-zip-remove {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          color: rgba(255, 255, 255, 0.62);
          cursor: pointer;
          font-size: 17px;
          flex: 0 0 auto;
        }

        .pdf-to-zip-remove:hover {
          border-color: rgba(255, 123, 48, 0.34);
          background: rgba(255, 123, 48, 0.1);
          color: #ffffff;
        }

        .pdf-to-zip-panel {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(255, 255, 255, 0.025);
          padding: 18px;
          box-sizing: border-box;
        }

        .pdf-to-zip-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 14px;
        }

        .pdf-to-zip-panel-title {
          font-size: 13px;
          font-weight: 700;
        }

        .pdf-to-zip-panel-caption {
          color: rgba(255, 255, 255, 0.4);
          font-size: 10px;
        }

        .pdf-to-zip-compression-row {
          display: grid;
          grid-template-columns: repeat(
            2,
            minmax(0, 1fr)
          );
          gap: 10px;
        }

        .pdf-to-zip-option {
          border-radius: 13px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(255, 255, 255, 0.018);
          padding: 12px;
        }

        .pdf-to-zip-option-label {
          display: block;
          margin-bottom: 8px;
          color: rgba(255, 255, 255, 0.42);
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .pdf-to-zip-segmented {
          display: grid;
          grid-template-columns: repeat(
            2,
            minmax(0, 1fr)
          );
          gap: 7px;
        }

        .pdf-to-zip-segment {
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(255, 255, 255, 0.025);
          color: rgba(255, 255, 255, 0.6);
          padding: 9px;
          cursor: pointer;
          font-size: 10px;
          font-weight: 650;
        }

        .pdf-to-zip-segment.active {
          border-color: rgba(255, 145, 63, 0.45);
          background: rgba(255, 125, 45, 0.08);
          color: #ffffff;
        }

        .pdf-to-zip-range {
          width: 100%;
          accent-color: #ff873d;
          cursor: pointer;
        }

        .pdf-to-zip-range-value {
          margin-top: 7px;
          color: rgba(255, 255, 255, 0.72);
          font-size: 11px;
        }

        .pdf-to-zip-stats {
          display: grid;
          grid-template-columns: repeat(
            3,
            minmax(0, 1fr)
          );
          gap: 9px;
          margin-top: 12px;
        }

        .pdf-to-zip-stat {
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.018);
          padding: 11px;
        }

        .pdf-to-zip-stat-label {
          color: rgba(255, 255, 255, 0.36);
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.09em;
        }

        .pdf-to-zip-stat-value {
          margin-top: 5px;
          color: rgba(255, 255, 255, 0.88);
          font-size: 13px;
          font-weight: 700;
        }

        .pdf-to-zip-progress {
          margin-top: 14px;
          padding: 13px;
          border-radius: 13px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.018);
        }

        .pdf-to-zip-progress-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 9px;
        }

        .pdf-to-zip-progress-label {
          min-width: 0;
          color: rgba(255, 255, 255, 0.52);
          font-size: 11px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .pdf-to-zip-progress-value {
          color: rgba(255, 255, 255, 0.84);
          font-size: 11px;
          font-weight: 700;
        }

        .pdf-to-zip-progress-track {
          height: 6px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.06);
        }

        .pdf-to-zip-progress-fill {
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

        .pdf-to-zip-error {
          margin-top: 13px;
          padding: 12px 13px;
          border-radius: 12px;
          border: 1px solid rgba(255, 89, 69, 0.2);
          background: rgba(255, 73, 52, 0.06);
          color: rgba(255, 185, 175, 0.95);
          font-size: 11px;
          line-height: 1.5;
        }

        .pdf-to-zip-actions {
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          margin-top: 14px;
        }

        .pdf-to-zip-primary,
        .pdf-to-zip-secondary {
          border-radius: 12px;
          padding: 11px 17px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .pdf-to-zip-primary {
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
            0 9px 26px rgba(255, 103, 32, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.17);
        }

        .pdf-to-zip-primary:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .pdf-to-zip-secondary {
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.68);
          background: rgba(255, 255, 255, 0.035);
        }

        .pdf-to-zip-secondary:hover:not(:disabled) {
          border-color: rgba(255, 255, 255, 0.14);
          color: #ffffff;
        }

        .pdf-to-zip-primary:disabled,
        .pdf-to-zip-secondary:disabled,
        .pdf-to-zip-remove:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .pdf-to-zip-success {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          border-radius: 16px;
          border: 1px solid rgba(121, 255, 178, 0.12);
          background: rgba(95, 255, 160, 0.035);
          padding: 14px;
        }

        .pdf-to-zip-success-title {
          font-size: 13px;
          font-weight: 700;
        }

        .pdf-to-zip-success-meta {
          margin-top: 4px;
          color: rgba(255, 255, 255, 0.42);
          font-size: 11px;
        }

        @media (max-width: 680px) {
          .pdf-to-zip-workspace {
            padding-left: 18px;
            padding-right: 18px;
          }

          .pdf-to-zip-empty {
            min-height: 360px;
          }

          .pdf-to-zip-compression-row,
          .pdf-to-zip-stats {
            grid-template-columns: 1fr;
          }

          .pdf-to-zip-success {
            align-items: flex-start;
            flex-direction: column;
          }

          .pdf-to-zip-actions {
            flex-direction: column;
          }

          .pdf-to-zip-primary,
          .pdf-to-zip-secondary {
            width: 100%;
          }
        }
      `}</style>

      <div
        className={`pdf-to-zip-workspace ${
          files.length === 0
            ? "pdf-to-zip-empty"
            : ""
        }`}
      >
        {files.length === 0 ? (
          <div className="pdf-to-zip-upload">
            <FileDropzone
              accept="application/pdf,.pdf"
              multiple
              onFiles={handleFiles}
            >
              <div className="pdf-to-zip-upload-box">
                <div className="pdf-to-zip-upload-icon">
                  ↓
                </div>

                <div className="pdf-to-zip-upload-title">
                  Drop your PDFs here
                </div>

                <div className="pdf-to-zip-upload-subtitle">
                  or click to browse multiple files
                </div>

                <div className="pdf-to-zip-upload-meta">
                  PDF files only
                </div>
              </div>
            </FileDropzone>
          </div>
        ) : (
          <>
            <div className="pdf-to-zip-panel">
              <div className="pdf-to-zip-panel-header">
                <div className="pdf-to-zip-panel-title">
                  Selected PDFs
                </div>

                <div className="pdf-to-zip-panel-caption">
                  {files.length}{" "}
                  {files.length === 1
                    ? "file"
                    : "files"}
                </div>
              </div>

              <div className="pdf-to-zip-file-list">
                {files.map(
                  (file, index) => (
                    <div
                      key={`${file.name}-${file.lastModified}-${index}`}
                      className="pdf-to-zip-file"
                    >
                      <div className="pdf-to-zip-file-icon">
                        PDF
                      </div>

                      <div className="pdf-to-zip-file-info">
                        <div className="pdf-to-zip-file-name">
                          {file.name}
                        </div>

                        <div className="pdf-to-zip-file-meta">
                          {formatFileSize(
                            file.size
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="pdf-to-zip-remove"
                        onClick={() =>
                          removeFile(
                            index
                          )
                        }
                        disabled={
                          status ===
                          "processing"
                        }
                        aria-label={`Remove ${file.name}`}
                      >
                        ×
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="pdf-to-zip-panel">
              <div className="pdf-to-zip-panel-header">
                <div className="pdf-to-zip-panel-title">
                  ZIP settings
                </div>

                <div className="pdf-to-zip-panel-caption">
                  Files stay as individual PDFs
                </div>
              </div>

              <div className="pdf-to-zip-compression-row">
                <div className="pdf-to-zip-option">
                  <span className="pdf-to-zip-option-label">
                    Compression
                  </span>

                  <div className="pdf-to-zip-segmented">
                    <button
                      type="button"
                      className={`pdf-to-zip-segment ${
                        compression ===
                        "DEFLATE"
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        setCompression(
                          "DEFLATE"
                        )
                      }
                      disabled={
                        status ===
                        "processing"
                      }
                    >
                      Compressed
                    </button>

                    <button
                      type="button"
                      className={`pdf-to-zip-segment ${
                        compression ===
                        "STORE"
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        setCompression(
                          "STORE"
                        )
                      }
                      disabled={
                        status ===
                        "processing"
                      }
                    >
                      No compression
                    </button>
                  </div>
                </div>

                <div className="pdf-to-zip-option">
                  <span className="pdf-to-zip-option-label">
                    Compression level
                  </span>

                  <input
                    className="pdf-to-zip-range"
                    type="range"
                    min="1"
                    max="9"
                    step="1"
                    value={
                      compressionLevel
                    }
                    onChange={(event) =>
                      setCompressionLevel(
                        Number(
                          event.target
                            .value
                        )
                      )
                    }
                    disabled={
                      compression !==
                        "DEFLATE" ||
                      status ===
                        "processing"
                    }
                    aria-label="Compression level"
                  />

                  <div className="pdf-to-zip-range-value">
                    Level{" "}
                    {compressionLevel}
                  </div>
                </div>
              </div>

              <div className="pdf-to-zip-stats">
                <div className="pdf-to-zip-stat">
                  <div className="pdf-to-zip-stat-label">
                    Files
                  </div>

                  <div className="pdf-to-zip-stat-value">
                    {files.length}
                  </div>
                </div>

                <div className="pdf-to-zip-stat">
                  <div className="pdf-to-zip-stat-label">
                    Input size
                  </div>

                  <div className="pdf-to-zip-stat-value">
                    {formatFileSize(
                      totalSize
                    )}
                  </div>
                </div>

                <div className="pdf-to-zip-stat">
                  <div className="pdf-to-zip-stat-label">
                    Archive
                  </div>

                  <div className="pdf-to-zip-stat-value">
                    ZIP
                  </div>
                </div>
              </div>

              {status ===
                "processing" && (
                <div className="pdf-to-zip-progress">
                  <div className="pdf-to-zip-progress-top">
                    <span className="pdf-to-zip-progress-label">
                      {currentFile
                        ? `Adding ${currentFile}`
                        : "Creating ZIP archive…"}
                    </span>

                    <span className="pdf-to-zip-progress-value">
                      {progress}%
                    </span>
                  </div>

                  <div className="pdf-to-zip-progress-track">
                    <div
                      className="pdf-to-zip-progress-fill"
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="pdf-to-zip-error">
                  {error}
                </div>
              )}

              <div className="pdf-to-zip-actions">
                <button
                  type="button"
                  className="pdf-to-zip-secondary"
                  onClick={
                    handleReset
                  }
                  disabled={
                    status ===
                    "processing"
                  }
                >
                  Reset
                </button>

                <button
                  type="button"
                  className="pdf-to-zip-primary"
                  onClick={
                    handleCreateZip
                  }
                  disabled={
                    !canCreateZip
                  }
                >
                  {status ===
                  "processing"
                    ? "Creating ZIP…"
                    : "Create ZIP"}
                </button>
              </div>
            </div>
          </>
        )}

        {status ===
          "success" &&
          result && (
          <div className="pdf-to-zip-success">
            <div>
              <div className="pdf-to-zip-success-title">
                ZIP archive created
              </div>

              <div className="pdf-to-zip-success-meta">
                {result.fileCount}{" "}
                {result.fileCount === 1
                  ? "PDF"
                  : "PDFs"}{" "}
                packaged successfully ·{" "}
                {formatFileSize(
                  result.zipSize
                )}
              </div>
            </div>

            <button
              type="button"
              className="pdf-to-zip-primary"
              onClick={
                handleDownload
              }
            >
              Download ZIP
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default PdfToZip;