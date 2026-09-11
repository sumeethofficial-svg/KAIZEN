import { useEffect, useState } from "react";
import {
  getWordToPdfInfo,
  wordToPdf,
} from "../../../services/conversion/wordToPdf.js";

function WordToPdf() {
  const [file, setFile] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);

  const [dragActive, setDragActive] =
    useState(false);

  const [status, setStatus] =
    useState("idle");

  const [progress, setProgress] =
    useState(0);

  const [error, setError] =
    useState("");

  const [resultUrl, setResultUrl] =
    useState("");

  const [resultName, setResultName] =
    useState("");

  useEffect(() => {
    return () => {
      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }
    };
  }, [resultUrl]);

  function formatFileSize(bytes) {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(2)} MB`;
  }

  async function loadFile(selectedFile) {
    if (!selectedFile) {
      return;
    }

    setError("");
    setStatus("loading");
    setProgress(0);

    try {
      const info =
        await getWordToPdfInfo(
          selectedFile
        );

      if (resultUrl) {
        URL.revokeObjectURL(
          resultUrl
        );
      }

      setFile(selectedFile);
      setFileInfo(info);

      setResultUrl("");
      setResultName("");

      setProgress(0);
      setError("");
      setStatus("ready");
    } catch (err) {
      if (resultUrl) {
        URL.revokeObjectURL(
          resultUrl
        );
      }

      setFile(null);
      setFileInfo(null);

      setResultUrl("");
      setResultName("");

      setProgress(0);
      setStatus("error");

      setError(
        err?.message ||
          "Unable to read the Word document."
      );
    }
  }

  function handleFileInput(event) {
    const selectedFile =
      event.target.files?.[0];

    if (selectedFile) {
      loadFile(selectedFile);
    }

    event.target.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragActive(false);

    const droppedFile =
      event.dataTransfer.files?.[0];

    if (droppedFile) {
      loadFile(droppedFile);
    }
  }

  function removeFile() {
    if (resultUrl) {
      URL.revokeObjectURL(
        resultUrl
      );
    }

    setFile(null);
    setFileInfo(null);

    setResultUrl("");
    setResultName("");

    setProgress(0);
    setError("");
    setStatus("idle");
  }

  function resetTool() {
    removeFile();
  }

  async function handleConvert() {
    if (!file) {
      setError(
        "Please select a Word document first."
      );
      return;
    }

    try {
      setError("");
      setStatus("processing");
      setProgress(0);

      const blob =
        await wordToPdf(
          file,
          ({ percent }) => {
            setProgress(
              Math.round(percent)
            );
          }
        );

      if (
        !(blob instanceof Blob) ||
        blob.size === 0
      ) {
        throw new Error(
          "The generated PDF is empty."
        );
      }

      if (resultUrl) {
        URL.revokeObjectURL(
          resultUrl
        );
      }

      const url =
        URL.createObjectURL(blob);

      const baseName =
        file.name.replace(
          /\.docx$/i,
          ""
        );

      const outputName =
        `${baseName}.pdf`;

      setResultUrl(url);
      setResultName(outputName);

      setProgress(100);
      setStatus("success");
    } catch (err) {
      setStatus("error");

      setError(
        err?.message ||
          "Failed to convert the Word document to PDF."
      );
    }
  }

  return (
    <div className="word-to-pdf-tool">
      <style>{`
        .word-to-pdf-tool {
          width: 100%;
          color: #f5f5f5;
        }

        .word-to-pdf-shell {
          width: min(1020px, 100%);
          margin: 0 auto;
          padding: 28px;
          box-sizing: border-box;
          border-radius: 26px;
          border: 1px solid rgba(255,255,255,0.08);
          background:
            linear-gradient(
              180deg,
              rgba(255,255,255,0.055),
              rgba(255,255,255,0.025)
            );
          backdrop-filter: blur(22px);
          box-shadow:
            0 24px 80px rgba(0,0,0,0.35),
            inset 0 1px 0 rgba(255,255,255,0.05);
        }

        .word-to-pdf-upload {
          min-height: 330px;
          padding: 42px 30px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 22px;
          border: 1px dashed rgba(255,145,60,0.35);
          background:
            radial-gradient(
              circle at center,
              rgba(255,110,30,0.08),
              transparent 62%
            ),
            rgba(255,255,255,0.02);
          text-align: center;
          transition:
            border-color 0.2s ease,
            background 0.2s ease,
            transform 0.2s ease;
        }

        .word-to-pdf-upload.active {
          border-color: rgba(255,145,60,0.75);
          background:
            radial-gradient(
              circle at center,
              rgba(255,110,30,0.15),
              transparent 65%
            ),
            rgba(255,255,255,0.035);
          transform: translateY(-1px);
        }

        .word-to-pdf-upload-icon {
          width: 66px;
          height: 66px;
          margin-bottom: 18px;
          display: grid;
          place-items: center;
          border-radius: 18px;
          border: 1px solid rgba(255,145,60,0.18);
          background: rgba(255,100,30,0.1);
          color: #ff8a3d;
          font-size: 18px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .word-to-pdf-upload h3 {
          margin: 0 0 8px;
          font-size: 21px;
        }

        .word-to-pdf-upload p {
          max-width: 650px;
          margin: 0 0 22px;
          color: rgba(255,255,255,0.5);
          font-size: 14px;
          line-height: 1.65;
        }

        .word-to-pdf-upload-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 17px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.07);
          color: #fff;
          cursor: pointer;
          font-size: 13px;
          font-weight: 800;
          transition: 0.2s ease;
        }

        .word-to-pdf-upload-button:hover {
          background: rgba(255,255,255,0.11);
          border-color: rgba(255,145,60,0.3);
        }

        .word-to-pdf-upload input {
          display: none;
        }

        .word-to-pdf-loader {
          width: 30px;
          height: 30px;
          margin-bottom: 17px;
          border-radius: 50%;
          border: 3px solid rgba(255,255,255,0.12);
          border-top-color: #ff7c34;
          animation: wordPdfSpin 0.8s linear infinite;
        }

        @keyframes wordPdfSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .word-to-pdf-file {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          margin-bottom: 20px;
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
        }

        .word-to-pdf-file-icon {
          width: 44px;
          height: 44px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: rgba(255,100,30,0.12);
          color: #ff8a3d;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .word-to-pdf-file-info {
          min-width: 0;
          flex: 1;
        }

        .word-to-pdf-file-info strong {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
        }

        .word-to-pdf-file-info span {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,0.43);
          font-size: 12px;
        }

        .word-to-pdf-remove {
          width: 35px;
          height: 35px;
          flex: 0 0 auto;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.09);
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.72);
          cursor: pointer;
          font-size: 18px;
        }

        .word-to-pdf-remove:hover:not(:disabled) {
          color: #fff;
          border-color: rgba(255,100,30,0.35);
        }

        .word-to-pdf-remove:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .word-to-pdf-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 300px;
          gap: 18px;
          align-items: stretch;
        }

        .word-to-pdf-card {
          padding: 21px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.025);
        }

        .word-to-pdf-section-title {
          margin: 0 0 15px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1.7px;
          color: rgba(255,255,255,0.43);
        }

        .word-to-pdf-explanation {
          color: rgba(255,255,255,0.62);
          font-size: 13px;
          line-height: 1.7;
        }

        .word-to-pdf-explanation strong {
          color: rgba(255,255,255,0.9);
        }

        .word-to-pdf-feature-list {
          display: grid;
          gap: 9px;
          margin-top: 20px;
        }

        .word-to-pdf-feature {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 40px;
          padding: 9px 11px;
          border-radius: 11px;
          border: 1px solid rgba(255,255,255,0.055);
          background: rgba(255,255,255,0.03);
        }

        .word-to-pdf-feature-icon {
          width: 24px;
          height: 24px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 7px;
          background: rgba(255,110,30,0.09);
          color: #ff9b5d;
          font-size: 10px;
        }

        .word-to-pdf-feature span {
          color: rgba(255,255,255,0.54);
          font-size: 11px;
        }

        .word-to-pdf-info-list {
          display: grid;
          gap: 9px;
        }

        .word-to-pdf-stat {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 12px;
          border-radius: 11px;
          border: 1px solid rgba(255,255,255,0.055);
          background: rgba(255,255,255,0.035);
        }

        .word-to-pdf-stat span {
          color: rgba(255,255,255,0.42);
          font-size: 12px;
        }

        .word-to-pdf-stat strong {
          max-width: 155px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
        }

        .word-to-pdf-local {
          margin-top: 15px;
          padding: 14px;
          border-radius: 13px;
          border: 1px solid rgba(255,145,60,0.12);
          background:
            radial-gradient(
              circle at 25% 20%,
              rgba(255,110,30,0.08),
              transparent 65%
            ),
            rgba(255,255,255,0.025);
        }

        .word-to-pdf-local strong {
          display: block;
          font-size: 13px;
        }

        .word-to-pdf-local span {
          display: block;
          margin-top: 5px;
          color: rgba(255,255,255,0.42);
          font-size: 10px;
          line-height: 1.55;
        }

        .word-to-pdf-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .word-to-pdf-primary,
        .word-to-pdf-secondary {
          min-height: 46px;
          padding: 0 18px;
          border-radius: 13px;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .word-to-pdf-primary {
          flex: 1;
          border: 1px solid rgba(255,145,60,0.28);
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(255,165,90,0.35),
              transparent 58%
            ),
            linear-gradient(
              180deg,
              rgba(255,110,30,0.9),
              rgba(220,72,14,0.9)
            );
          color: #fff;
          box-shadow:
            0 10px 28px rgba(255,90,20,0.14),
            inset 0 1px 0 rgba(255,255,255,0.16);
        }

        .word-to-pdf-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 14px 32px rgba(255,90,20,0.2),
            inset 0 1px 0 rgba(255,255,255,0.18);
        }

        .word-to-pdf-primary:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
        }

        .word-to-pdf-secondary {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.045);
          color: rgba(255,255,255,0.75);
        }

        .word-to-pdf-secondary:hover:not(:disabled) {
          background: rgba(255,255,255,0.08);
          color: #fff;
        }

        .word-to-pdf-progress {
          margin-top: 16px;
          padding: 14px;
          border-radius: 13px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
        }

        .word-to-pdf-progress-head {
          display: flex;
          justify-content: space-between;
          margin-bottom: 9px;
          color: rgba(255,255,255,0.58);
          font-size: 12px;
        }

        .word-to-pdf-progress-track {
          height: 6px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,0.07);
        }

        .word-to-pdf-progress-bar {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #ff6420,
            #ff9b57
          );
          transition: width 0.2s ease;
        }

        .word-to-pdf-result {
          margin-top: 16px;
          padding: 16px;
          border-radius: 15px;
          border: 1px solid rgba(101,209,131,0.15);
          background: rgba(80,190,110,0.045);
        }

        .word-to-pdf-result strong {
          display: block;
          font-size: 14px;
        }

        .word-to-pdf-result span {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,0.46);
          font-size: 12px;
        }

        .word-to-pdf-download {
          display: inline-flex;
          margin-top: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid rgba(255,145,60,0.2);
          background: rgba(255,110,30,0.1);
          color: #ffae78;
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
        }

        .word-to-pdf-error {
          margin-top: 16px;
          padding: 13px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255,90,80,0.17);
          background: rgba(255,70,60,0.055);
          color: #ffb1aa;
          font-size: 12px;
          line-height: 1.5;
        }

        @media (max-width: 820px) {
          .word-to-pdf-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .word-to-pdf-shell {
            padding: 17px;
            border-radius: 20px;
          }

          .word-to-pdf-actions {
            flex-direction: column;
          }

          .word-to-pdf-primary,
          .word-to-pdf-secondary {
            width: 100%;
          }
        }
      `}</style>

      <div className="word-to-pdf-shell">
        {!file && (
          <div
            className={`word-to-pdf-upload ${
              dragActive
                ? "active"
                : ""
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() =>
              setDragActive(false)
            }
            onDrop={handleDrop}
          >
            {status === "loading" ? (
              <>
                <div className="word-to-pdf-loader" />

                <h3>
                  Reading document…
                </h3>

                <p>
                  Validating the Word file
                  before conversion.
                </p>
              </>
            ) : (
              <>
                <div className="word-to-pdf-upload-icon">
                  DOCX
                </div>

                <h3>
                  Convert Word to PDF
                </h3>

                <p>
                  Drop a .docx document here or
                  choose one from your device.
                  Conversion happens locally in
                  your browser.
                </p>

                <label className="word-to-pdf-upload-button">
                  Choose Word File

                  <input
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={
                      handleFileInput
                    }
                  />
                </label>
              </>
            )}
          </div>
        )}

        {status === "error" &&
          !file &&
          error && (
            <div className="word-to-pdf-error">
              {error}
            </div>
          )}

        {file && fileInfo && (
          <>
            <div className="word-to-pdf-file">
              <div className="word-to-pdf-file-icon">
                DOCX
              </div>

              <div className="word-to-pdf-file-info">
                <strong>
                  {file.name}
                </strong>

                <span>
                  Word document
                  {" · "}
                  {formatFileSize(
                    file.size
                  )}
                </span>
              </div>

              <button
                type="button"
                className="word-to-pdf-remove"
                onClick={removeFile}
                disabled={
                  status ===
                  "processing"
                }
                aria-label="Remove Word document"
              >
                ×
              </button>
            </div>

            <div className="word-to-pdf-grid">
              <div className="word-to-pdf-card">
                <h3 className="word-to-pdf-section-title">
                  CONVERSION
                </h3>

                <div className="word-to-pdf-explanation">
                  <strong>
                    Turn your Word document
                    into a PDF.
                  </strong>{" "}
                  KAIZEN renders the document
                  locally and creates a printable
                  PDF while preserving supported
                  Word formatting.
                </div>

                <div className="word-to-pdf-feature-list">
                  <div className="word-to-pdf-feature">
                    <div className="word-to-pdf-feature-icon">
                      ✓
                    </div>

                    <span>
                      Headings, paragraphs and
                      supported styles
                    </span>
                  </div>

                  <div className="word-to-pdf-feature">
                    <div className="word-to-pdf-feature-icon">
                      ✓
                    </div>

                    <span>
                      Images and tables
                    </span>
                  </div>

                  <div className="word-to-pdf-feature">
                    <div className="word-to-pdf-feature-icon">
                      ✓
                    </div>

                    <span>
                      Headers, footers and
                      page breaks
                    </span>
                  </div>

                  <div className="word-to-pdf-feature">
                    <div className="word-to-pdf-feature-icon">
                      ✓
                    </div>

                    <span>
                      No server upload required
                    </span>
                  </div>
                </div>
              </div>

              <div className="word-to-pdf-card">
                <h3 className="word-to-pdf-section-title">
                  DOCUMENT
                </h3>

                <div className="word-to-pdf-info-list">
                  <div className="word-to-pdf-stat">
                    <span>
                      File type
                    </span>

                    <strong>
                      DOCX
                    </strong>
                  </div>

                  <div className="word-to-pdf-stat">
                    <span>
                      File size
                    </span>

                    <strong>
                      {formatFileSize(
                        file.size
                      )}
                    </strong>
                  </div>

                  <div className="word-to-pdf-stat">
                    <span>
                      Output
                    </span>

                    <strong>
                      PDF / A4
                    </strong>
                  </div>
                </div>

                <div className="word-to-pdf-local">
                  <strong>
                    Local conversion
                  </strong>

                  <span>
                    Your Word document stays in
                    the browser during conversion.
                  </span>
                </div>
              </div>
            </div>

            <div className="word-to-pdf-actions">
              <button
                type="button"
                className="word-to-pdf-primary"
                onClick={
                  handleConvert
                }
                disabled={
                  status ===
                  "processing"
                }
              >
                {status ===
                "processing"
                  ? `Converting to PDF · ${progress}%`
                  : "Convert to PDF"}
              </button>

              <button
                type="button"
                className="word-to-pdf-secondary"
                onClick={
                  resetTool
                }
                disabled={
                  status ===
                  "processing"
                }
              >
                Reset
              </button>
            </div>

            {status ===
              "processing" && (
              <div className="word-to-pdf-progress">
                <div className="word-to-pdf-progress-head">
                  <span>
                    Converting Word document
                  </span>

                  <span>
                    {progress}%
                  </span>
                </div>

                <div className="word-to-pdf-progress-track">
                  <div
                    className="word-to-pdf-progress-bar"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {status ===
              "success" &&
              resultUrl && (
                <div className="word-to-pdf-result">
                  <strong>
                    Word document converted successfully.
                  </strong>

                  <span>
                    {resultName}
                  </span>

                  <a
                    className="word-to-pdf-download"
                    href={
                      resultUrl
                    }
                    download={
                      resultName
                    }
                  >
                    Download PDF
                  </a>
                </div>
              )}

            {status === "error" &&
              error && (
                <div className="word-to-pdf-error">
                  {error}
                </div>
              )}
          </>
        )}
      </div>
    </div>
  );
}

export default WordToPdf;