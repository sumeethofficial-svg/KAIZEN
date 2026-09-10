import { useEffect, useState } from "react";
import {
  getUnlockPdfInfo,
  unlockPdf,
} from "../../../services/pdf/unlockPdf.js";

function UnlockPdf() {
  const [file, setFile] = useState(null);
  const [pdfInfo, setPdfInfo] = useState(null);

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [dragActive, setDragActive] = useState(false);

  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const [resultUrl, setResultUrl] = useState("");
  const [resultName, setResultName] = useState("");

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

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  async function loadFile(selectedFile) {
    if (!selectedFile) {
      return;
    }

    setError("");
    setStatus("loading");
    setProgress(0);

    try {
      const isPdf =
        selectedFile.type === "application/pdf" ||
        selectedFile.name
          .toLowerCase()
          .endsWith(".pdf");

      if (!isPdf) {
        throw new Error(
          "Please select a PDF file."
        );
      }

      const info =
        await getUnlockPdfInfo(
          selectedFile
        );

      if (!info) {
        throw new Error(
          "Unable to read the PDF."
        );
      }

      if (resultUrl) {
        URL.revokeObjectURL(
          resultUrl
        );
      }

      setFile(selectedFile);
      setPdfInfo(info);
      setResultUrl("");
      setResultName("");
      setPassword("");
      setShowPassword(false);
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
      setPdfInfo(null);
      setResultUrl("");
      setResultName("");
      setProgress(0);
      setStatus("error");

      setError(
        err?.message ||
          "Unable to read the PDF."
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
      URL.revokeObjectURL(resultUrl);
    }

    setFile(null);
    setPdfInfo(null);
    setPassword("");
    setShowPassword(false);
    setResultUrl("");
    setResultName("");
    setProgress(0);
    setError("");
    setStatus("idle");
  }

  function resetTool() {
    removeFile();
  }

  async function handleUnlock() {
    if (!file) {
      setError(
        "Please select a PDF first."
      );
      return;
    }

    if (!password) {
      setError(
        "Enter the PDF password or owner password."
      );
      return;
    }

    try {
      setError("");
      setStatus("processing");
      setProgress(0);

      const blob =
        await unlockPdf(
          file,
          {
            password,
          },
          ({ percent }) => {
            setProgress(percent);
          }
        );

      if (
        !(blob instanceof Blob) ||
        blob.size === 0
      ) {
        throw new Error(
          "The unlocked PDF is empty."
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
          /\.pdf$/i,
          ""
        );

      setResultUrl(url);
      setResultName(
        `${baseName}-unlocked.pdf`
      );

      setPassword("");
      setShowPassword(false);
      setProgress(100);
      setStatus("success");
    } catch (err) {
      setStatus("error");

      setError(
        err?.message ||
          "Failed to unlock the PDF."
      );
    }
  }

  return (
    <div className="unlock-pdf-tool">
      <style>{`
        .unlock-pdf-tool {
          width: 100%;
          color: #f5f5f5;
        }

        .unlock-pdf-shell {
          width: min(1020px, 100%);
          margin: 0 auto;
          padding: 28px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 26px;
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

        .unlock-pdf-upload {
          min-height: 330px;
          padding: 42px 30px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1px dashed rgba(255,145,60,0.35);
          border-radius: 22px;
          background:
            radial-gradient(
              circle at center,
              rgba(255,110,30,0.08),
              transparent 62%
            ),
            rgba(255,255,255,0.02);
          text-align: center;
          transition: 0.2s ease;
        }

        .unlock-pdf-upload.active {
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

        .unlock-pdf-upload-icon {
          width: 66px;
          height: 66px;
          margin-bottom: 18px;
          display: grid;
          place-items: center;
          border-radius: 18px;
          border: 1px solid rgba(255,145,60,0.18);
          background: rgba(255,100,30,0.1);
          color: #ff8a3d;
          font-size: 22px;
          font-weight: 900;
        }

        .unlock-pdf-upload h3 {
          margin: 0 0 8px;
          font-size: 21px;
        }

        .unlock-pdf-upload p {
          max-width: 620px;
          margin: 0 0 22px;
          color: rgba(255,255,255,0.5);
          font-size: 14px;
          line-height: 1.65;
        }

        .unlock-pdf-upload-button {
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

        .unlock-pdf-upload-button:hover {
          background: rgba(255,255,255,0.11);
          border-color: rgba(255,145,60,0.3);
        }

        .unlock-pdf-upload input {
          display: none;
        }

        .unlock-pdf-loader {
          width: 30px;
          height: 30px;
          margin-bottom: 17px;
          border-radius: 50%;
          border: 3px solid rgba(255,255,255,0.12);
          border-top-color: #ff7c34;
          animation: unlockPdfSpin 0.8s linear infinite;
        }

        @keyframes unlockPdfSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .unlock-pdf-file {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          margin-bottom: 20px;
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
        }

        .unlock-pdf-file-icon {
          width: 44px;
          height: 44px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: rgba(255,100,30,0.12);
          color: #ff8a3d;
          font-size: 11px;
          font-weight: 900;
        }

        .unlock-pdf-file-info {
          flex: 1;
          min-width: 0;
        }

        .unlock-pdf-file-info strong {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
        }

        .unlock-pdf-file-info span {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,0.43);
          font-size: 12px;
        }

        .unlock-pdf-remove {
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

        .unlock-pdf-remove:hover:not(:disabled) {
          color: #fff;
          border-color: rgba(255,100,30,0.35);
        }

        .unlock-pdf-remove:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .unlock-pdf-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 300px;
          gap: 18px;
          align-items: start;
        }

        .unlock-pdf-card {
          padding: 21px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.025);
        }

        .unlock-pdf-section-title {
          margin: 0 0 15px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1.7px;
          color: rgba(255,255,255,0.43);
        }

        .unlock-pdf-explanation {
          color: rgba(255,255,255,0.62);
          font-size: 13px;
          line-height: 1.7;
        }

        .unlock-pdf-explanation strong {
          color: rgba(255,255,255,0.9);
        }

        .unlock-pdf-password-field {
          margin-top: 20px;
        }

        .unlock-pdf-password-label {
          display: block;
          margin-bottom: 7px;
          color: rgba(255,255,255,0.43);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.4px;
        }

        .unlock-pdf-input-wrap {
          position: relative;
        }

        .unlock-pdf-input {
          width: 100%;
          min-height: 45px;
          padding: 10px 72px 10px 12px;
          box-sizing: border-box;
          border-radius: 11px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.045);
          color: #fff;
          outline: none;
          font: inherit;
          font-size: 13px;
        }

        .unlock-pdf-input:focus {
          border-color: rgba(255,135,55,0.55);
          box-shadow: 0 0 0 3px rgba(255,110,30,0.08);
        }

        .unlock-pdf-input::placeholder {
          color: rgba(255,255,255,0.22);
        }

        .unlock-pdf-show {
          position: absolute;
          top: 50%;
          right: 7px;
          width: 56px;
          height: 31px;
          transform: translateY(-50%);
          border-radius: 8px;
          border: 0;
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.55);
          cursor: pointer;
          font: inherit;
          font-size: 10px;
          font-weight: 700;
        }

        .unlock-pdf-show:hover {
          color: #fff;
          background: rgba(255,255,255,0.08);
        }

        .unlock-pdf-security-note {
          margin-top: 14px;
          padding: 13px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255,145,60,0.12);
          background: rgba(255,110,30,0.045);
          color: rgba(255,255,255,0.46);
          font-size: 11px;
          line-height: 1.6;
        }

        .unlock-pdf-info-list {
          display: grid;
          gap: 9px;
        }

        .unlock-pdf-stat {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 12px;
          border-radius: 11px;
          border: 1px solid rgba(255,255,255,0.055);
          background: rgba(255,255,255,0.035);
        }

        .unlock-pdf-stat span {
          color: rgba(255,255,255,0.42);
          font-size: 12px;
        }

        .unlock-pdf-stat strong {
          max-width: 155px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
        }

        .unlock-pdf-status-card {
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

        .unlock-pdf-status-card strong {
          display: block;
          font-size: 13px;
        }

        .unlock-pdf-status-card span {
          display: block;
          margin-top: 5px;
          color: rgba(255,255,255,0.42);
          font-size: 10px;
          line-height: 1.55;
        }

        .unlock-pdf-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .unlock-pdf-primary,
        .unlock-pdf-secondary {
          min-height: 46px;
          padding: 0 18px;
          border-radius: 13px;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .unlock-pdf-primary {
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

        .unlock-pdf-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 14px 32px rgba(255,90,20,0.2),
            inset 0 1px 0 rgba(255,255,255,0.18);
        }

        .unlock-pdf-primary:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
        }

        .unlock-pdf-secondary {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.045);
          color: rgba(255,255,255,0.75);
        }

        .unlock-pdf-secondary:hover:not(:disabled) {
          background: rgba(255,255,255,0.08);
          color: #fff;
        }

        .unlock-pdf-progress {
          margin-top: 16px;
          padding: 14px;
          border-radius: 13px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
        }

        .unlock-pdf-progress-head {
          display: flex;
          justify-content: space-between;
          margin-bottom: 9px;
          color: rgba(255,255,255,0.58);
          font-size: 12px;
        }

        .unlock-pdf-progress-track {
          height: 6px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,0.07);
        }

        .unlock-pdf-progress-bar {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #ff6420,
            #ff9b57
          );
          transition: width 0.2s ease;
        }

        .unlock-pdf-result {
          margin-top: 16px;
          padding: 16px;
          border-radius: 15px;
          border: 1px solid rgba(101,209,131,0.15);
          background: rgba(80,190,110,0.045);
        }

        .unlock-pdf-result strong {
          display: block;
          font-size: 14px;
        }

        .unlock-pdf-result span {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,0.46);
          font-size: 12px;
        }

        .unlock-pdf-download {
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

        .unlock-pdf-error {
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
          .unlock-pdf-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .unlock-pdf-shell {
            padding: 17px;
            border-radius: 20px;
          }

          .unlock-pdf-actions {
            flex-direction: column;
          }

          .unlock-pdf-primary,
          .unlock-pdf-secondary {
            width: 100%;
          }
        }
      `}</style>

      <div className="unlock-pdf-shell">
        {!file && (
          <div
            className={`unlock-pdf-upload ${
              dragActive ? "active" : ""
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
                <div className="unlock-pdf-loader" />

                <h3>
                  Reading PDF…
                </h3>

                <p>
                  Checking the document before
                  unlocking it.
                </p>
              </>
            ) : (
              <>
                <div className="unlock-pdf-upload-icon">
                  🔓
                </div>

                <h3>
                  Unlock your PDF
                </h3>

                <p>
                  Remove password protection and PDF
                  restrictions from a document when you
                  have the required credentials.
                </p>

                <label className="unlock-pdf-upload-button">
                  Choose PDF

                  <input
                    type="file"
                    accept="application/pdf,.pdf"
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
            <div className="unlock-pdf-error">
              {error}
            </div>
          )}

        {file && pdfInfo && (
          <>
            <div className="unlock-pdf-file">
              <div className="unlock-pdf-file-icon">
                PDF
              </div>

              <div className="unlock-pdf-file-info">
                <strong>
                  {file.name}
                </strong>

                <span>
                  {pdfInfo.pageCount
                    ? `${pdfInfo.pageCount} ${
                        pdfInfo.pageCount ===
                        1
                          ? "page"
                          : "pages"
                      }`
                    : "PDF document"}
                  {" · "}
                  {formatFileSize(
                    pdfInfo.size
                  )}
                </span>
              </div>

              <button
                type="button"
                className="unlock-pdf-remove"
                onClick={removeFile}
                disabled={
                  status === "processing"
                }
                aria-label="Remove PDF"
              >
                ×
              </button>
            </div>

            <div className="unlock-pdf-grid">
              <div className="unlock-pdf-card">
                <h3 className="unlock-pdf-section-title">
                  PDF CREDENTIALS
                </h3>

                <div className="unlock-pdf-explanation">
                  <strong>
                    Enter the required password.
                  </strong>{" "}
                  KAIZEN will use your credentials to
                  decrypt the PDF and remove its
                  protection and restrictions.
                </div>

                <div className="unlock-pdf-password-field">
                  <label
                    className="unlock-pdf-password-label"
                    htmlFor="unlock-pdf-password"
                  >
                    PASSWORD / OWNER PASSWORD
                  </label>

                  <div className="unlock-pdf-input-wrap">
                    <input
                      id="unlock-pdf-password"
                      className="unlock-pdf-input"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={password}
                      onChange={(event) =>
                        setPassword(
                          event.target
                            .value
                        )
                      }
                      placeholder="Enter PDF password"
                      autoComplete="current-password"
                      disabled={
                        status ===
                        "processing"
                      }
                    />

                    <button
                      type="button"
                      className="unlock-pdf-show"
                      onClick={() =>
                        setShowPassword(
                          (value) =>
                            !value
                        )
                      }
                      disabled={
                        status ===
                        "processing"
                      }
                    >
                      {showPassword
                        ? "Hide"
                        : "Show"}
                    </button>
                  </div>
                </div>

                <div className="unlock-pdf-security-note">
                  You must be authorized to unlock the
                  document and know the required password.
                  KAIZEN does not attempt to guess or
                  bypass passwords.
                </div>
              </div>

              <div className="unlock-pdf-card">
                <h3 className="unlock-pdf-section-title">
                  DOCUMENT
                </h3>

                <div className="unlock-pdf-info-list">
                  <div className="unlock-pdf-stat">
                    <span>
                      Pages
                    </span>

                    <strong>
                      {pdfInfo.pageCount ||
                        "—"}
                    </strong>
                  </div>

                  <div className="unlock-pdf-stat">
                    <span>
                      File size
                    </span>

                    <strong>
                      {formatFileSize(
                        pdfInfo.size
                      )}
                    </strong>
                  </div>

                  <div className="unlock-pdf-stat">
                    <span>
                      Encryption
                    </span>

                    <strong>
                      {pdfInfo.encrypted
                        ? "Protected"
                        : "Not encrypted"}
                    </strong>
                  </div>

                  <div className="unlock-pdf-stat">
                    <span>
                      Password
                    </span>

                    <strong>
                      {pdfInfo.requiresPassword
                        ? "Required"
                        : "Not required"}
                    </strong>
                  </div>
                </div>

                <div className="unlock-pdf-status-card">
                  <strong>
                    Local processing
                  </strong>

                  <span>
                    The document is processed locally in
                    your browser through the PDF engine.
                  </span>
                </div>
              </div>
            </div>

            <div className="unlock-pdf-actions">
              <button
                type="button"
                className="unlock-pdf-primary"
                onClick={
                  handleUnlock
                }
                disabled={
                  status ===
                  "processing"
                }
              >
                {status ===
                "processing"
                  ? `Unlocking PDF · ${progress}%`
                  : "Unlock PDF"}
              </button>

              <button
                type="button"
                className="unlock-pdf-secondary"
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
              <div className="unlock-pdf-progress">
                <div className="unlock-pdf-progress-head">
                  <span>
                    Unlocking PDF
                  </span>

                  <span>
                    {progress}%
                  </span>
                </div>

                <div className="unlock-pdf-progress-track">
                  <div
                    className="unlock-pdf-progress-bar"
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
                <div className="unlock-pdf-result">
                  <strong>
                    PDF unlocked successfully.
                  </strong>

                  <span>
                    {resultName}
                  </span>

                  <a
                    className="unlock-pdf-download"
                    href={
                      resultUrl
                    }
                    download={
                      resultName
                    }
                  >
                    Download Unlocked PDF
                  </a>
                </div>
              )}

            {status ===
              "error" &&
              error && (
                <div className="unlock-pdf-error">
                  {error}
                </div>
              )}
          </>
        )}
      </div>
    </div>
  );
}

export default UnlockPdf;