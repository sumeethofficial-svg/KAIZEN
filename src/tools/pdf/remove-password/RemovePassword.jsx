import { useEffect, useState } from "react";
import {
  getRemovePasswordPdfInfo,
  removePassword,
} from "../../../services/pdf/removePassword.js";

function RemovePassword() {
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
        await getRemovePasswordPdfInfo(
          selectedFile
        );

      if (!info) {
        throw new Error(
          "Unable to read the PDF."
        );
      }

      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }

      setFile(selectedFile);
      setPdfInfo(info);
      setResultUrl("");
      setResultName("");
      setPassword("");
      setProgress(0);
      setError("");
      setStatus("ready");
    } catch (err) {
      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
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

  async function handleRemovePassword() {
    if (!file) {
      setError(
        "Please select a PDF first."
      );
      return;
    }

    if (!password) {
      setError(
        "Enter the current PDF password."
      );
      return;
    }

    try {
      setError("");
      setStatus("processing");
      setProgress(0);

      const blob =
        await removePassword(
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
        URL.revokeObjectURL(resultUrl);
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

      /*
       * Clear the password from React state after
       * successful processing.
       */
      setPassword("");
      setProgress(100);
      setStatus("success");
    } catch (err) {
      setStatus("error");

      setError(
        err?.message ||
          "Failed to remove the PDF password."
      );
    }
  }

  return (
    <div className="remove-password-tool">
      <style>{`
        .remove-password-tool {
          width: 100%;
          color: #f5f5f5;
        }

        .remove-password-shell {
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

        .remove-password-upload {
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

        .remove-password-upload.active {
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

        .remove-password-upload-icon {
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

        .remove-password-upload h3 {
          margin: 0 0 8px;
          font-size: 21px;
        }

        .remove-password-upload p {
          max-width: 620px;
          margin: 0 0 22px;
          color: rgba(255,255,255,0.5);
          font-size: 14px;
          line-height: 1.65;
        }

        .remove-password-upload-button {
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

        .remove-password-upload-button:hover {
          background: rgba(255,255,255,0.11);
          border-color: rgba(255,145,60,0.3);
        }

        .remove-password-upload input {
          display: none;
        }

        .remove-password-loader {
          width: 30px;
          height: 30px;
          margin-bottom: 17px;
          border-radius: 50%;
          border: 3px solid rgba(255,255,255,0.12);
          border-top-color: #ff7c34;
          animation: removePasswordSpin 0.8s linear infinite;
        }

        @keyframes removePasswordSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .remove-password-file {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          margin-bottom: 20px;
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
        }

        .remove-password-file-icon {
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

        .remove-password-file-info {
          flex: 1;
          min-width: 0;
        }

        .remove-password-file-info strong {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
        }

        .remove-password-file-info span {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,0.43);
          font-size: 12px;
        }

        .remove-password-remove {
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

        .remove-password-remove:hover:not(:disabled) {
          color: #fff;
          border-color: rgba(255,100,30,0.35);
        }

        .remove-password-remove:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .remove-password-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 300px;
          gap: 18px;
          align-items: start;
        }

        .remove-password-card {
          padding: 21px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.025);
        }

        .remove-password-section-title {
          margin: 0 0 15px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1.7px;
          color: rgba(255,255,255,0.43);
        }

        .remove-password-explanation {
          color: rgba(255,255,255,0.62);
          font-size: 13px;
          line-height: 1.7;
        }

        .remove-password-explanation strong {
          color: rgba(255,255,255,0.9);
        }

        .remove-password-password-field {
          margin-top: 20px;
        }

        .remove-password-password-label {
          display: block;
          margin-bottom: 7px;
          color: rgba(255,255,255,0.43);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.4px;
        }

        .remove-password-input-wrap {
          position: relative;
        }

        .remove-password-input {
          width: 100%;
          min-height: 45px;
          box-sizing: border-box;
          padding: 10px 72px 10px 12px;
          border-radius: 11px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.045);
          color: #fff;
          outline: none;
          font: inherit;
          font-size: 13px;
        }

        .remove-password-input:focus {
          border-color: rgba(255,135,55,0.55);
          box-shadow: 0 0 0 3px rgba(255,110,30,0.08);
        }

        .remove-password-input::placeholder {
          color: rgba(255,255,255,0.22);
        }

        .remove-password-show {
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

        .remove-password-show:hover {
          color: #fff;
          background: rgba(255,255,255,0.08);
        }

        .remove-password-security-note {
          margin-top: 14px;
          padding: 13px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255,145,60,0.12);
          background: rgba(255,110,30,0.045);
          color: rgba(255,255,255,0.46);
          font-size: 11px;
          line-height: 1.6;
        }

        .remove-password-info-list {
          display: grid;
          gap: 9px;
        }

        .remove-password-stat {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 12px;
          border-radius: 11px;
          border: 1px solid rgba(255,255,255,0.055);
          background: rgba(255,255,255,0.035);
        }

        .remove-password-stat span {
          color: rgba(255,255,255,0.42);
          font-size: 12px;
        }

        .remove-password-stat strong {
          max-width: 155px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
        }

        .remove-password-status-card {
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

        .remove-password-status-card strong {
          display: block;
          font-size: 13px;
        }

        .remove-password-status-card span {
          display: block;
          margin-top: 5px;
          color: rgba(255,255,255,0.42);
          font-size: 10px;
          line-height: 1.55;
        }

        .remove-password-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .remove-password-primary,
        .remove-password-secondary {
          min-height: 46px;
          padding: 0 18px;
          border-radius: 13px;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .remove-password-primary {
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

        .remove-password-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 14px 32px rgba(255,90,20,0.2),
            inset 0 1px 0 rgba(255,255,255,0.18);
        }

        .remove-password-primary:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
        }

        .remove-password-secondary {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.045);
          color: rgba(255,255,255,0.75);
        }

        .remove-password-secondary:hover:not(:disabled) {
          background: rgba(255,255,255,0.08);
          color: #fff;
        }

        .remove-password-progress {
          margin-top: 16px;
          padding: 14px;
          border-radius: 13px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
        }

        .remove-password-progress-head {
          display: flex;
          justify-content: space-between;
          margin-bottom: 9px;
          color: rgba(255,255,255,0.58);
          font-size: 12px;
        }

        .remove-password-progress-track {
          height: 6px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,0.07);
        }

        .remove-password-progress-bar {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #ff6420,
            #ff9b57
          );
          transition: width 0.2s ease;
        }

        .remove-password-result {
          margin-top: 16px;
          padding: 16px;
          border-radius: 15px;
          border: 1px solid rgba(101,209,131,0.15);
          background: rgba(80,190,110,0.045);
        }

        .remove-password-result strong {
          display: block;
          font-size: 14px;
        }

        .remove-password-result span {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,0.46);
          font-size: 12px;
        }

        .remove-password-download {
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

        .remove-password-error {
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
          .remove-password-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .remove-password-shell {
            padding: 17px;
            border-radius: 20px;
          }

          .remove-password-actions {
            flex-direction: column;
          }

          .remove-password-primary,
          .remove-password-secondary {
            width: 100%;
          }
        }
      `}</style>

      <div className="remove-password-shell">
        {!file && (
          <div
            className={`remove-password-upload ${
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
                <div className="remove-password-loader" />

                <h3>
                  Reading PDF…
                </h3>

                <p>
                  Checking the document before
                  removing its password.
                </p>
              </>
            ) : (
              <>
                <div className="remove-password-upload-icon">
                  🔓
                </div>

                <h3>
                  Remove PDF password
                </h3>

                <p>
                  Enter the current PDF password to
                  create an unprotected copy of the
                  document.
                </p>

                <label className="remove-password-upload-button">
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
            <div className="remove-password-error">
              {error}
            </div>
          )}

        {file && pdfInfo && (
          <>
            <div className="remove-password-file">
              <div className="remove-password-file-icon">
                PDF
              </div>

              <div className="remove-password-file-info">
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
                className="remove-password-remove"
                onClick={removeFile}
                disabled={
                  status === "processing"
                }
                aria-label="Remove PDF"
              >
                ×
              </button>
            </div>

            <div className="remove-password-grid">
              <div className="remove-password-card">
                <h3 className="remove-password-section-title">
                  PDF PASSWORD
                </h3>

                <div className="remove-password-explanation">
                  <strong>
                    Enter the existing password.
                  </strong>{" "}
                  KAIZEN will use it to decrypt the PDF
                  and create a new copy without password
                  protection.
                </div>

                <div className="remove-password-password-field">
                  <label
                    className="remove-password-password-label"
                    htmlFor="remove-pdf-password"
                  >
                    CURRENT PASSWORD
                  </label>

                  <div className="remove-password-input-wrap">
                    <input
                      id="remove-pdf-password"
                      className="remove-password-input"
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
                      className="remove-password-show"
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
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showPassword
                        ? "Hide"
                        : "Show"}
                    </button>
                  </div>
                </div>

                <div className="remove-password-security-note">
                  The password is used only for this
                  decryption operation. It is cleared from
                  the interface after a successful unlock.
                </div>
              </div>

              <div className="remove-password-card">
                <h3 className="remove-password-section-title">
                  DOCUMENT
                </h3>

                <div className="remove-password-info-list">
                  <div className="remove-password-stat">
                    <span>
                      Pages
                    </span>

                    <strong>
                      {pdfInfo.pageCount ||
                        "—"}
                    </strong>
                  </div>

                  <div className="remove-password-stat">
                    <span>
                      File size
                    </span>

                    <strong>
                      {formatFileSize(
                        pdfInfo.size
                      )}
                    </strong>
                  </div>

                  <div className="remove-password-stat">
                    <span>
                      Encryption
                    </span>

                    <strong>
                      {pdfInfo.encrypted
                        ? "Protected"
                        : "Not encrypted"}
                    </strong>
                  </div>

                  <div className="remove-password-stat">
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

                <div className="remove-password-status-card">
                  <strong>
                    Local processing
                  </strong>

                  <span>
                    The PDF is processed in your browser
                    using the local PDF engine.
                  </span>
                </div>
              </div>
            </div>

            <div className="remove-password-actions">
              <button
                type="button"
                className="remove-password-primary"
                onClick={
                  handleRemovePassword
                }
                disabled={
                  status ===
                  "processing"
                }
              >
                {status ===
                "processing"
                  ? `Removing Password · ${progress}%`
                  : "Remove Password"}
              </button>

              <button
                type="button"
                className="remove-password-secondary"
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
              <div className="remove-password-progress">
                <div className="remove-password-progress-head">
                  <span>
                    Decrypting PDF
                  </span>

                  <span>
                    {progress}%
                  </span>
                </div>

                <div className="remove-password-progress-track">
                  <div
                    className="remove-password-progress-bar"
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
                <div className="remove-password-result">
                  <strong>
                    PDF password removed successfully.
                  </strong>

                  <span>
                    {resultName}
                  </span>

                  <a
                    className="remove-password-download"
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

            {status === "error" &&
              error && (
                <div className="remove-password-error">
                  {error}
                </div>
              )}
          </>
        )}
      </div>
    </div>
  );
}

export default RemovePassword;