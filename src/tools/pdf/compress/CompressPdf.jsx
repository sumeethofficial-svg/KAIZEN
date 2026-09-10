import { useEffect, useState } from "react";
import FileDropzone from "../../../components/files/FileDropzone";
import {
  compressPdf,
  getPdfInfo,
} from "../../../services/pdf/compressPdf";

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function CompressPdf() {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);

  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
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
      setError("Please select a valid PDF file.");
      setStatus("error");
      return;
    }

    setFile(null);
    setPageCount(0);
    setResult(null);
    setPreviewUrl("");
    setProgress(0);
    setError("");
    setStatus("loading");

    try {
      const info = await getPdfInfo(selectedFile);

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

  async function handleCompress() {
    if (!file) {
      return;
    }

    setError("");
    setResult(null);
    setPreviewUrl("");
    setProgress(0);
    setStatus("processing");

    try {
      const compressionResult =
        await compressPdf(
          file,
          (percentage) => {
            setProgress(
              Math.max(
                0,
                Math.min(100, percentage)
              )
            );
          }
        );

      setResult(compressionResult);

      const url =
        URL.createObjectURL(
          compressionResult.blob
        );

      setPreviewUrl(url);
      setProgress(100);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(
        err?.message ||
          "Unable to compress the PDF."
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
    anchor.download = getOutputFileName(
      file?.name
    );

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
    setStatus("idle");
    setProgress(0);
    setResult(null);
    setError("");
  }

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const hasSavedSpace =
    result?.wasReduced === true;

  const savedAmount = result
    ? Math.abs(result.savedBytes)
    : 0;

  const savedPercent = result
    ? Math.abs(result.savedPercentage)
    : 0;

  return (
    <>
      <style>{`
        .compress-pdf-workspace {
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

        .compress-pdf-upload {
          width: 100%;
        }

        .compress-pdf-upload label {
          display: block;
          cursor: pointer;
        }

        .compress-pdf-upload input {
          display: none;
        }

        .compress-pdf-upload-box {
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

        .compress-pdf-upload-box:hover {
          border-color: rgba(255, 153, 72, 0.72);
          background:
            linear-gradient(
              180deg,
              rgba(255, 153, 72, 0.055),
              rgba(255, 255, 255, 0.025)
            );
          transform: translateY(-1px);
        }

        .compress-pdf-upload-icon {
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

        .compress-pdf-upload-title {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .compress-pdf-upload-subtitle {
          margin-top: 8px;
          color: rgba(255, 255, 255, 0.56);
          font-size: 14px;
        }

        .compress-pdf-upload-meta {
          margin-top: 12px;
          color: rgba(255, 159, 84, 0.8);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.16em;
        }

        .compress-pdf-file-card {
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

        .compress-pdf-file-icon {
          width: 46px;
          height: 46px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
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
        }

        .compress-pdf-file-info {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .compress-pdf-file-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 15px;
          font-weight: 650;
        }

        .compress-pdf-file-meta {
          color: rgba(255, 255, 255, 0.48);
          font-size: 12px;
        }

        .compress-pdf-remove {
          width: 34px;
          height: 34px;
          flex: 0 0 auto;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.035);
          color: rgba(255, 255, 255, 0.68);
          cursor: pointer;
          font-size: 18px;
          transition:
            background 160ms ease,
            border-color 160ms ease,
            color 160ms ease;
        }

        .compress-pdf-remove:hover {
          color: #ffffff;
          border-color: rgba(255, 123, 48, 0.34);
          background: rgba(255, 123, 48, 0.1);
        }

        .compress-pdf-panel {
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(255, 255, 255, 0.025);
          padding: 20px;
          box-sizing: border-box;
        }

        .compress-pdf-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }

        .compress-pdf-panel-title {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .compress-pdf-panel-caption {
          color: rgba(255, 255, 255, 0.42);
          font-size: 12px;
        }

        .compress-pdf-info-grid {
          display: grid;
          grid-template-columns: repeat(
            3,
            minmax(0, 1fr)
          );
          gap: 10px;
        }

        .compress-pdf-info-item {
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.02);
          padding: 14px;
        }

        .compress-pdf-info-label {
          color: rgba(255, 255, 255, 0.42);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .compress-pdf-info-value {
          margin-top: 6px;
          font-size: 15px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.88);
        }

        .compress-pdf-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 18px;
        }

        .compress-pdf-primary-button,
        .compress-pdf-secondary-button {
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

        .compress-pdf-primary-button {
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

        .compress-pdf-primary-button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .compress-pdf-secondary-button {
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.7);
          background: rgba(255, 255, 255, 0.035);
        }

        .compress-pdf-secondary-button:hover:not(:disabled) {
          border-color: rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.055);
          color: #ffffff;
        }

        .compress-pdf-primary-button:disabled,
        .compress-pdf-secondary-button:disabled,
        .compress-pdf-remove:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .compress-pdf-progress {
          margin-top: 18px;
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(255, 255, 255, 0.02);
          padding: 14px;
        }

        .compress-pdf-progress-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .compress-pdf-progress-label {
          color: rgba(255, 255, 255, 0.58);
          font-size: 12px;
        }

        .compress-pdf-progress-value {
          color: rgba(255, 255, 255, 0.86);
          font-size: 12px;
          font-weight: 700;
        }

        .compress-pdf-progress-track {
          height: 7px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.06);
        }

        .compress-pdf-progress-fill {
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

        .compress-pdf-error {
          margin-top: 16px;
          border-radius: 14px;
          border: 1px solid rgba(255, 89, 69, 0.2);
          background: rgba(255, 73, 52, 0.06);
          color: rgba(255, 185, 175, 0.95);
          padding: 13px 14px;
          font-size: 12px;
          line-height: 1.55;
        }

        .compress-pdf-success {
          border-radius: 18px;
          border: 1px solid rgba(121, 255, 178, 0.12);
          background: rgba(95, 255, 160, 0.035);
          padding: 18px;
        }

        .compress-pdf-success-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .compress-pdf-success-title {
          font-size: 14px;
          font-weight: 700;
        }

        .compress-pdf-success-subtitle {
          margin-top: 5px;
          color: rgba(255, 255, 255, 0.45);
          font-size: 11px;
        }

        .compress-pdf-size-comparison {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 16px;
        }

        .compress-pdf-size-card {
          border: 1px solid rgba(255, 255, 255, 0.065);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.02);
          padding: 14px;
        }

        .compress-pdf-size-label {
          color: rgba(255, 255, 255, 0.42);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .compress-pdf-size-value {
          margin-top: 6px;
          color: rgba(255, 255, 255, 0.9);
          font-size: 15px;
          font-weight: 750;
        }

        .compress-pdf-size-note {
          margin-top: 4px;
          color: rgba(255, 255, 255, 0.38);
          font-size: 10px;
        }

        .compress-pdf-saving-note {
          margin-top: 14px;
          padding: 11px 12px;
          border-radius: 12px;
          background: rgba(255, 137, 56, 0.055);
          border: 1px solid rgba(255, 137, 56, 0.08);
          color: rgba(255, 185, 137, 0.9);
          font-size: 11px;
          line-height: 1.5;
        }

        @media (max-width: 900px) {
          .compress-pdf-workspace {
            padding-left: 28px;
            padding-right: 28px;
          }
        }

        @media (max-width: 680px) {
          .compress-pdf-workspace {
            padding-left: 18px;
            padding-right: 18px;
          }

          .compress-pdf-info-grid,
          .compress-pdf-size-comparison {
            grid-template-columns: 1fr;
          }

          .compress-pdf-success-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .compress-pdf-actions {
            flex-direction: column;
          }

          .compress-pdf-primary-button,
          .compress-pdf-secondary-button {
            width: 100%;
          }
        }
      `}</style>

      <div className="compress-pdf-workspace">
        {!file ? (
          <div className="compress-pdf-upload">
            <FileDropzone
              accept="application/pdf,.pdf"
              onFiles={handleFiles}
            >
              <div className="compress-pdf-upload-box">
                <div className="compress-pdf-upload-icon">
                  ↓
                </div>

                <div className="compress-pdf-upload-title">
                  Drop your PDF here
                </div>

                <div className="compress-pdf-upload-subtitle">
                  or click to browse
                </div>

                <div className="compress-pdf-upload-meta">
                  PDF files only
                </div>
              </div>
            </FileDropzone>
          </div>
        ) : (
          <>
            <div className="compress-pdf-file-card">
              <div className="compress-pdf-file-icon">
                PDF
              </div>

              <div className="compress-pdf-file-info">
                <div className="compress-pdf-file-name">
                  {file.name}
                </div>

                <div className="compress-pdf-file-meta">
                  {formatFileSize(file.size)} ·{" "}
                  {pageCount}{" "}
                  {pageCount === 1
                    ? "page"
                    : "pages"}
                </div>
              </div>

              <button
                type="button"
                className="compress-pdf-remove"
                onClick={handleReset}
                disabled={
                  status === "processing"
                }
                aria-label="Remove PDF"
              >
                ×
              </button>
            </div>

            <div className="compress-pdf-panel">
              <div className="compress-pdf-panel-header">
                <div className="compress-pdf-panel-title">
                  PDF details
                </div>

                <div className="compress-pdf-panel-caption">
                  Ready to optimize
                </div>
              </div>

              <div className="compress-pdf-info-grid">
                <div className="compress-pdf-info-item">
                  <div className="compress-pdf-info-label">
                    Original size
                  </div>

                  <div className="compress-pdf-info-value">
                    {formatFileSize(
                      file.size
                    )}
                  </div>
                </div>

                <div className="compress-pdf-info-item">
                  <div className="compress-pdf-info-label">
                    Pages
                  </div>

                  <div className="compress-pdf-info-value">
                    {pageCount}
                  </div>
                </div>

                <div className="compress-pdf-info-item">
                  <div className="compress-pdf-info-label">
                    Processing
                  </div>

                  <div className="compress-pdf-info-value">
                    Browser
                  </div>
                </div>
              </div>

              {status === "processing" && (
                <div className="compress-pdf-progress">
                  <div className="compress-pdf-progress-top">
                    <span className="compress-pdf-progress-label">
                      Compressing PDF…
                    </span>

                    <span className="compress-pdf-progress-value">
                      {progress}%
                    </span>
                  </div>

                  <div className="compress-pdf-progress-track">
                    <div
                      className="compress-pdf-progress-fill"
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="compress-pdf-error">
                  {error}
                </div>
              )}

              <div className="compress-pdf-actions">
                <button
                  type="button"
                  className="compress-pdf-secondary-button"
                  onClick={handleReset}
                  disabled={
                    status === "processing"
                  }
                >
                  Reset
                </button>

                <button
                  type="button"
                  className="compress-pdf-primary-button"
                  onClick={handleCompress}
                  disabled={
                    status === "processing"
                  }
                >
                  {status === "processing"
                    ? "Compressing…"
                    : "Compress PDF"}
                </button>
              </div>
            </div>
          </>
        )}

        {status === "success" &&
          result && (
            <div className="compress-pdf-success">
              <div className="compress-pdf-success-header">
                <div>
                  <div className="compress-pdf-success-title">
                    Compression complete
                  </div>

                  <div className="compress-pdf-success-subtitle">
                    Your optimized PDF is ready.
                  </div>
                </div>

                <button
                  type="button"
                  className="compress-pdf-primary-button"
                  onClick={handleDownload}
                >
                  Download PDF
                </button>
              </div>

              <div className="compress-pdf-size-comparison">
                <div className="compress-pdf-size-card">
                  <div className="compress-pdf-size-label">
                    Before
                  </div>

                  <div className="compress-pdf-size-value">
                    {formatFileSize(
                      result.originalSize
                    )}
                  </div>

                  <div className="compress-pdf-size-note">
                    Original PDF
                  </div>
                </div>

                <div className="compress-pdf-size-card">
                  <div className="compress-pdf-size-label">
                    After
                  </div>

                  <div className="compress-pdf-size-value">
                    {formatFileSize(
                      result.compressedSize
                    )}
                  </div>

                  <div className="compress-pdf-size-note">
                    Optimized PDF
                  </div>
                </div>

                <div className="compress-pdf-size-card">
                  <div className="compress-pdf-size-label">
                    Result
                  </div>

                  <div className="compress-pdf-size-value">
                    {hasSavedSpace
                      ? `${savedPercent.toFixed(
                          1
                        )}% smaller`
                      : "No reduction"}
                  </div>

                  <div className="compress-pdf-size-note">
                    {hasSavedSpace
                      ? `${formatFileSize(
                          savedAmount
                        )} saved`
                      : "Original was already efficient"}
                  </div>
                </div>
              </div>

              {!hasSavedSpace && (
                <div className="compress-pdf-saving-note">
                  This PDF could not be reduced
                  further by the current browser-side
                  optimization. The resulting file is
                  still a valid PDF.
                </div>
              )}
            </div>
          )}

        {previewUrl && (
          <div
            style={{
              display: "none",
            }}
            aria-hidden="true"
          >
            <iframe
              title="Compressed PDF preview"
              src={previewUrl}
            />
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

  return `${baseName}-compressed.pdf`;
}

export default CompressPdf;