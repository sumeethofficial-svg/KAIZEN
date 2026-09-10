import { useEffect, useState } from "react";
import {
  encryptPdf,
  getEncryptPdfInfo,
} from "../../../services/pdf/encryptPdf.js";

function EncryptPdf() {
  const [file, setFile] = useState(null);
  const [pdfInfo, setPdfInfo] = useState(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [ownerPassword, setOwnerPassword] =
    useState("");

  const [showOwnerPassword, setShowOwnerPassword] =
    useState(false);

  const [allowPrinting, setAllowPrinting] =
    useState(false);

  const [allowCopying, setAllowCopying] =
    useState(false);

  const [allowModifying, setAllowModifying] =
    useState(false);

  const [allowAnnotating, setAllowAnnotating] =
    useState(false);

  const [allowFillingForms, setAllowFillingForms] =
    useState(false);

  const [
    allowDocumentAssembly,
    setAllowDocumentAssembly,
  ] = useState(false);

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
        selectedFile.type ===
          "application/pdf" ||
        selectedFile.name
          .toLowerCase()
          .endsWith(".pdf");

      if (!isPdf) {
        throw new Error(
          "Please select a PDF file."
        );
      }

      const info =
        await getEncryptPdfInfo(
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
      URL.revokeObjectURL(
        resultUrl
      );
    }

    setFile(null);
    setPdfInfo(null);
    setResultUrl("");
    setResultName("");
    setProgress(0);
    setError("");
    setStatus("idle");
  }

  function resetTool() {
    removeFile();

    setPassword("");
    setConfirmPassword("");
    setOwnerPassword("");

    setShowPassword(false);
    setShowOwnerPassword(false);

    setAllowPrinting(false);
    setAllowCopying(false);
    setAllowModifying(false);
    setAllowAnnotating(false);
    setAllowFillingForms(false);
    setAllowDocumentAssembly(false);
  }

  function validatePasswords() {
    if (!password) {
      return "Please enter a password.";
    }

    if (password.length < 4) {
      return "Password must contain at least 4 characters.";
    }

    if (!confirmPassword) {
      return "Please confirm your password.";
    }

    if (password !== confirmPassword) {
      return "Passwords do not match.";
    }

    if (
      ownerPassword &&
      ownerPassword.length < 4
    ) {
      return (
        "Owner password must contain at least 4 characters."
      );
    }

    if (
      ownerPassword &&
      ownerPassword === password
    ) {
      return (
        "For stronger security, use a different owner password."
      );
    }

    return "";
  }

  function getPermissionCount() {
    return [
      allowPrinting,
      allowCopying,
      allowModifying,
      allowAnnotating,
      allowFillingForms,
      allowDocumentAssembly,
    ].filter(Boolean).length;
  }

  async function handleEncrypt() {
    if (!file) {
      setError(
        "Please select a PDF first."
      );
      return;
    }

    const passwordError =
      validatePasswords();

    if (passwordError) {
      setError(passwordError);
      return;
    }

    try {
      setError("");
      setStatus("processing");
      setProgress(0);

      const blob =
        await encryptPdf(
          file,
          {
            userPassword:
              password,

            ownerPassword:
              ownerPassword,

            allowPrinting,
            allowCopying,
            allowModifying,
            allowAnnotating,
            allowFillingForms,
            allowDocumentAssembly,
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
          "The encrypted PDF is empty."
        );
      }

      if (resultUrl) {
        URL.revokeObjectURL(
          resultUrl
        );
      }

      const url =
        URL.createObjectURL(
          blob
        );

      const baseName =
        file.name.replace(
          /\.pdf$/i,
          ""
        );

      setResultUrl(url);
      setResultName(
        `${baseName}-encrypted.pdf`
      );
      setProgress(100);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(
        err?.message ||
          "Failed to encrypt the PDF."
      );
    }
  }

  function passwordStrength() {
    if (!password) {
      return {
        label: "Not set",
        score: 0,
      };
    }

    let score = 0;

    if (password.length >= 4) {
      score += 1;
    }

    if (password.length >= 8) {
      score += 1;
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    }

    if (/[0-9]/.test(password)) {
      score += 1;
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score += 1;
    }

    if (score <= 1) {
      return {
        label: "Weak",
        score,
      };
    }

    if (score <= 3) {
      return {
        label: "Moderate",
        score,
      };
    }

    return {
      label: "Strong",
      score,
    };
  }

  const strength =
    passwordStrength();

  return (
    <div className="encrypt-pdf-tool">
      <style>{`
        .encrypt-pdf-tool {
          width: 100%;
          color: #f5f5f5;
        }

        .encrypt-pdf-shell {
          width: min(1060px, 100%);
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

        .encrypt-pdf-upload {
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

        .encrypt-pdf-upload.active {
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

        .encrypt-pdf-upload-icon {
          width: 66px;
          height: 66px;
          margin-bottom: 18px;
          display: grid;
          place-items: center;
          border-radius: 18px;
          border: 1px solid rgba(255,145,60,0.18);
          background: rgba(255,100,30,0.1);
          color: #ff8a3d;
          font-size: 23px;
          font-weight: 900;
        }

        .encrypt-pdf-upload h3 {
          margin: 0 0 8px;
          font-size: 21px;
        }

        .encrypt-pdf-upload p {
          max-width: 610px;
          margin: 0 0 22px;
          color: rgba(255,255,255,0.5);
          font-size: 14px;
          line-height: 1.65;
        }

        .encrypt-pdf-upload-button {
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

        .encrypt-pdf-upload-button:hover {
          background: rgba(255,255,255,0.11);
          border-color: rgba(255,145,60,0.3);
        }

        .encrypt-pdf-upload input {
          display: none;
        }

        .encrypt-pdf-loader {
          width: 30px;
          height: 30px;
          margin-bottom: 17px;
          border-radius: 50%;
          border: 3px solid rgba(255,255,255,0.12);
          border-top-color: #ff7c34;
          animation: encryptPdfSpin 0.8s linear infinite;
        }

        @keyframes encryptPdfSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .encrypt-pdf-file {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          margin-bottom: 20px;
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
        }

        .encrypt-pdf-file-icon {
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

        .encrypt-pdf-file-info {
          flex: 1;
          min-width: 0;
        }

        .encrypt-pdf-file-info strong {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
        }

        .encrypt-pdf-file-info span {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,0.43);
          font-size: 12px;
        }

        .encrypt-pdf-remove {
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

        .encrypt-pdf-remove:hover {
          color: #fff;
          border-color: rgba(255,100,30,0.35);
        }

        .encrypt-pdf-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 310px;
          gap: 18px;
          align-items: start;
        }

        .encrypt-pdf-card {
          padding: 21px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.025);
        }

        .encrypt-pdf-section + .encrypt-pdf-section {
          margin-top: 22px;
          padding-top: 22px;
          border-top: 1px solid rgba(255,255,255,0.07);
        }

        .encrypt-pdf-section-title {
          margin: 0 0 15px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1.7px;
          color: rgba(255,255,255,0.43);
        }

        .encrypt-pdf-password-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
          margin-bottom: 13px;
        }

        .encrypt-pdf-password-field:last-child {
          margin-bottom: 0;
        }

        .encrypt-pdf-password-field label {
          color: rgba(255,255,255,0.43);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.4px;
        }

        .encrypt-pdf-password-wrap {
          position: relative;
        }

        .encrypt-pdf-password-wrap input {
          width: 100%;
          min-height: 44px;
          padding: 10px 44px 10px 11px;
          box-sizing: border-box;
          border-radius: 11px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.045);
          color: #fff;
          outline: none;
          font: inherit;
          font-size: 13px;
        }

        .encrypt-pdf-password-wrap input:focus {
          border-color: rgba(255,135,55,0.55);
          box-shadow: 0 0 0 3px rgba(255,110,30,0.08);
        }

        .encrypt-pdf-password-wrap input::placeholder {
          color: rgba(255,255,255,0.22);
        }

        .encrypt-pdf-password-toggle {
          position: absolute;
          right: 7px;
          top: 50%;
          width: 32px;
          height: 32px;
          transform: translateY(-50%);
          border: 0;
          border-radius: 8px;
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.55);
          cursor: pointer;
          font-size: 11px;
        }

        .encrypt-pdf-password-toggle:hover {
          color: #fff;
          background: rgba(255,255,255,0.08);
        }

        .encrypt-pdf-strength {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-top: 8px;
        }

        .encrypt-pdf-strength-bars {
          display: flex;
          gap: 3px;
          flex: 1;
        }

        .encrypt-pdf-strength-bar {
          height: 4px;
          flex: 1;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
        }

        .encrypt-pdf-strength-bar.active {
          background: rgba(255,110,30,0.72);
        }

        .encrypt-pdf-strength span {
          min-width: 55px;
          text-align: right;
          color: rgba(255,255,255,0.4);
          font-size: 10px;
        }

        .encrypt-pdf-security-note {
          margin-top: 14px;
          padding: 12px 13px;
          border-radius: 11px;
          border: 1px solid rgba(255,145,60,0.11);
          background: rgba(255,110,30,0.04);
          color: rgba(255,255,255,0.47);
          font-size: 11px;
          line-height: 1.6;
        }

        .encrypt-pdf-permissions {
          display: grid;
          gap: 8px;
        }

        .encrypt-pdf-permission {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px;
          border-radius: 11px;
          border: 1px solid rgba(255,255,255,0.055);
          background: rgba(255,255,255,0.03);
        }

        .encrypt-pdf-permission input {
          width: 16px;
          height: 16px;
          flex: 0 0 auto;
          accent-color: #ff7c34;
        }

        .encrypt-pdf-permission label {
          color: rgba(255,255,255,0.65);
          font-size: 11px;
          line-height: 1.4;
          cursor: pointer;
        }

        .encrypt-pdf-info-list {
          display: grid;
          gap: 9px;
        }

        .encrypt-pdf-stat {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 12px;
          border-radius: 11px;
          border: 1px solid rgba(255,255,255,0.055);
          background: rgba(255,255,255,0.035);
        }

        .encrypt-pdf-stat span {
          color: rgba(255,255,255,0.42);
          font-size: 12px;
        }

        .encrypt-pdf-stat strong {
          max-width: 160px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
        }

        .encrypt-pdf-security-badge {
          margin-top: 15px;
          padding: 14px;
          border-radius: 13px;
          border: 1px solid rgba(255,145,60,0.13);
          background:
            radial-gradient(
              circle at 25% 20%,
              rgba(255,110,30,0.09),
              transparent 65%
            ),
            rgba(255,255,255,0.025);
        }

        .encrypt-pdf-security-badge strong {
          display: block;
          font-size: 13px;
        }

        .encrypt-pdf-security-badge span {
          display: block;
          margin-top: 5px;
          color: rgba(255,255,255,0.42);
          font-size: 10px;
          line-height: 1.55;
        }

        .encrypt-pdf-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .encrypt-pdf-primary,
        .encrypt-pdf-secondary {
          min-height: 46px;
          padding: 0 18px;
          border-radius: 13px;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .encrypt-pdf-primary {
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

        .encrypt-pdf-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 14px 32px rgba(255,90,20,0.2),
            inset 0 1px 0 rgba(255,255,255,0.18);
        }

        .encrypt-pdf-primary:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
        }

        .encrypt-pdf-secondary {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.045);
          color: rgba(255,255,255,0.75);
        }

        .encrypt-pdf-secondary:hover:not(:disabled) {
          background: rgba(255,255,255,0.08);
          color: #fff;
        }

        .encrypt-pdf-progress {
          margin-top: 16px;
          padding: 14px;
          border-radius: 13px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
        }

        .encrypt-pdf-progress-head {
          display: flex;
          justify-content: space-between;
          margin-bottom: 9px;
          color: rgba(255,255,255,0.58);
          font-size: 12px;
        }

        .encrypt-pdf-progress-track {
          height: 6px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,0.07);
        }

        .encrypt-pdf-progress-bar {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #ff6420,
            #ff9b57
          );
          transition: width 0.2s ease;
        }

        .encrypt-pdf-result {
          margin-top: 16px;
          padding: 16px;
          border-radius: 15px;
          border: 1px solid rgba(101,209,131,0.15);
          background: rgba(80,190,110,0.045);
        }

        .encrypt-pdf-result strong {
          display: block;
          font-size: 14px;
        }

        .encrypt-pdf-result span {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,0.46);
          font-size: 12px;
        }

        .encrypt-pdf-download {
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

        .encrypt-pdf-error {
          margin-top: 16px;
          padding: 13px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255,90,80,0.17);
          background: rgba(255,70,60,0.055);
          color: #ffb1aa;
          font-size: 12px;
          line-height: 1.5;
        }

        @media (max-width: 850px) {
          .encrypt-pdf-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .encrypt-pdf-shell {
            padding: 17px;
            border-radius: 20px;
          }

          .encrypt-pdf-actions {
            flex-direction: column;
          }

          .encrypt-pdf-primary,
          .encrypt-pdf-secondary {
            width: 100%;
          }
        }
      `}</style>

      <div className="encrypt-pdf-shell">
        {!file && (
          <div
            className={`encrypt-pdf-upload ${
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
                <div className="encrypt-pdf-loader" />

                <h3>
                  Reading PDF…
                </h3>

                <p>
                  Validating the document before
                  encryption.
                </p>
              </>
            ) : (
              <>
                <div className="encrypt-pdf-upload-icon">
                  🔒
                </div>

                <h3>
                  Encrypt your PDF
                </h3>

                <p>
                  Protect your document with a password
                  and control what recipients are allowed
                  to do with it.
                </p>

                <label className="encrypt-pdf-upload-button">
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
            <div className="encrypt-pdf-error">
              {error}
            </div>
          )}

        {file && pdfInfo && (
          <>
            <div className="encrypt-pdf-file">
              <div className="encrypt-pdf-file-icon">
                PDF
              </div>

              <div className="encrypt-pdf-file-info">
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
                className="encrypt-pdf-remove"
                onClick={removeFile}
                disabled={
                  status ===
                  "processing"
                }
                aria-label="Remove PDF"
              >
                ×
              </button>
            </div>

            <div className="encrypt-pdf-grid">
              <div className="encrypt-pdf-card">
                <div className="encrypt-pdf-section">
                  <h3 className="encrypt-pdf-section-title">
                    PASSWORD
                  </h3>

                  <div className="encrypt-pdf-password-field">
                    <label htmlFor="encrypt-password">
                      PDF PASSWORD
                    </label>

                    <div className="encrypt-pdf-password-wrap">
                      <input
                        id="encrypt-password"
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        value={password}
                        onChange={(
                          event
                        ) =>
                          setPassword(
                            event.target
                              .value
                          )
                        }
                        placeholder="Enter a strong password"
                        autoComplete="new-password"
                        disabled={
                          status ===
                          "processing"
                        }
                      />

                      <button
                        type="button"
                        className="encrypt-pdf-password-toggle"
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

                    <div className="encrypt-pdf-strength">
                      <div className="encrypt-pdf-strength-bars">
                        {[1, 2, 3, 4, 5].map(
                          (level) => (
                            <div
                              key={
                                level
                              }
                              className={`encrypt-pdf-strength-bar ${
                                strength.score >=
                                level
                                  ? "active"
                                  : ""
                              }`}
                            />
                          )
                        )}
                      </div>

                      <span>
                        {
                          strength.label
                        }
                      </span>
                    </div>
                  </div>

                  <div className="encrypt-pdf-password-field">
                    <label htmlFor="encrypt-confirm-password">
                      CONFIRM PASSWORD
                    </label>

                    <div className="encrypt-pdf-password-wrap">
                      <input
                        id="encrypt-confirm-password"
                        type="password"
                        value={
                          confirmPassword
                        }
                        onChange={(
                          event
                        ) =>
                          setConfirmPassword(
                            event.target
                              .value
                          )
                        }
                        placeholder="Re-enter the password"
                        autoComplete="new-password"
                        disabled={
                          status ===
                          "processing"
                        }
                      />
                    </div>
                  </div>

                  <div className="encrypt-pdf-password-field">
                    <label htmlFor="encrypt-owner-password">
                      OWNER PASSWORD
                      <span
                        style={{
                          marginLeft:
                            6,
                          color:
                            "rgba(255,255,255,0.26)",
                          fontWeight:
                            500,
                        }}
                      >
                        optional
                      </span>
                    </label>

                    <div className="encrypt-pdf-password-wrap">
                      <input
                        id="encrypt-owner-password"
                        type={
                          showOwnerPassword
                            ? "text"
                            : "password"
                        }
                        value={
                          ownerPassword
                        }
                        onChange={(
                          event
                        ) =>
                          setOwnerPassword(
                            event.target
                              .value
                          )
                        }
                        placeholder="Optional separate owner password"
                        autoComplete="new-password"
                        disabled={
                          status ===
                          "processing"
                        }
                      />

                      <button
                        type="button"
                        className="encrypt-pdf-password-toggle"
                        onClick={() =>
                          setShowOwnerPassword(
                            (value) =>
                              !value
                          )
                        }
                        disabled={
                          status ===
                          "processing"
                        }
                        aria-label={
                          showOwnerPassword
                            ? "Hide owner password"
                            : "Show owner password"
                        }
                      >
                        {showOwnerPassword
                          ? "Hide"
                          : "Show"}
                      </button>
                    </div>
                  </div>

                  <div className="encrypt-pdf-security-note">
                    Use a strong password that is not reused
                    elsewhere. KAIZEN does not display the
                    password after processing.
                  </div>
                </div>

                <div className="encrypt-pdf-section">
                  <h3 className="encrypt-pdf-section-title">
                    PERMISSIONS
                  </h3>

                  <div className="encrypt-pdf-permissions">
                    <div className="encrypt-pdf-permission">
                      <input
                        id="encrypt-printing"
                        type="checkbox"
                        checked={
                          allowPrinting
                        }
                        onChange={(
                          event
                        ) =>
                          setAllowPrinting(
                            event.target
                              .checked
                          )
                        }
                        disabled={
                          status ===
                          "processing"
                        }
                      />

                      <label htmlFor="encrypt-printing">
                        Allow printing
                      </label>
                    </div>

                    <div className="encrypt-pdf-permission">
                      <input
                        id="encrypt-copying"
                        type="checkbox"
                        checked={
                          allowCopying
                        }
                        onChange={(
                          event
                        ) =>
                          setAllowCopying(
                            event.target
                              .checked
                          )
                        }
                        disabled={
                          status ===
                          "processing"
                        }
                      />

                      <label htmlFor="encrypt-copying">
                        Allow text and content copying
                      </label>
                    </div>

                    <div className="encrypt-pdf-permission">
                      <input
                        id="encrypt-modifying"
                        type="checkbox"
                        checked={
                          allowModifying
                        }
                        onChange={(
                          event
                        ) =>
                          setAllowModifying(
                            event.target
                              .checked
                          )
                        }
                        disabled={
                          status ===
                          "processing"
                        }
                      />

                      <label htmlFor="encrypt-modifying">
                        Allow document modification
                      </label>
                    </div>

                    <div className="encrypt-pdf-permission">
                      <input
                        id="encrypt-annotating"
                        type="checkbox"
                        checked={
                          allowAnnotating
                        }
                        onChange={(
                          event
                        ) =>
                          setAllowAnnotating(
                            event.target
                              .checked
                          )
                        }
                        disabled={
                          status ===
                          "processing"
                        }
                      />

                      <label htmlFor="encrypt-annotating">
                        Allow annotations
                      </label>
                    </div>

                    <div className="encrypt-pdf-permission">
                      <input
                        id="encrypt-filling"
                        type="checkbox"
                        checked={
                          allowFillingForms
                        }
                        onChange={(
                          event
                        ) =>
                          setAllowFillingForms(
                            event.target
                              .checked
                          )
                        }
                        disabled={
                          status ===
                          "processing"
                        }
                      />

                      <label htmlFor="encrypt-filling">
                        Allow filling existing forms
                      </label>
                    </div>

                    <div className="encrypt-pdf-permission">
                      <input
                        id="encrypt-assembly"
                        type="checkbox"
                        checked={
                          allowDocumentAssembly
                        }
                        onChange={(
                          event
                        ) =>
                          setAllowDocumentAssembly(
                            event.target
                              .checked
                          )
                        }
                        disabled={
                          status ===
                          "processing"
                        }
                      />

                      <label htmlFor="encrypt-assembly">
                        Allow document assembly
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="encrypt-pdf-card">
                <h3 className="encrypt-pdf-section-title">
                  SECURITY SUMMARY
                </h3>

                <div className="encrypt-pdf-info-list">
                  <div className="encrypt-pdf-stat">
                    <span>
                      Encryption
                    </span>

                    <strong>
                      AES-256
                    </strong>
                  </div>

                  <div className="encrypt-pdf-stat">
                    <span>
                      Pages
                    </span>

                    <strong>
                      {pdfInfo.pageCount ||
                        "—"}
                    </strong>
                  </div>

                  <div className="encrypt-pdf-stat">
                    <span>
                      File size
                    </span>

                    <strong>
                      {formatFileSize(
                        pdfInfo.size
                      )}
                    </strong>
                  </div>

                  <div className="encrypt-pdf-stat">
                    <span>
                      Permissions
                    </span>

                    <strong>
                      {
                        getPermissionCount()
                      }{" "}
                      enabled
                    </strong>
                  </div>
                </div>

                <div className="encrypt-pdf-security-badge">
                  <strong>
                    Password protected
                  </strong>

                  <span>
                    The resulting PDF requires the configured
                    password to open. Permissions are applied
                    according to your selections.
                  </span>
                </div>

                <div className="encrypt-pdf-security-note">
                  Keep your password safe. KAIZEN cannot
                  recover a forgotten PDF password for you.
                </div>
              </div>
            </div>

            <div className="encrypt-pdf-actions">
              <button
                type="button"
                className="encrypt-pdf-primary"
                onClick={
                  handleEncrypt
                }
                disabled={
                  status ===
                  "processing"
                }
              >
                {status ===
                "processing"
                  ? `Encrypting PDF · ${progress}%`
                  : "Encrypt PDF"}
              </button>

              <button
                type="button"
                className="encrypt-pdf-secondary"
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
              <div className="encrypt-pdf-progress">
                <div className="encrypt-pdf-progress-head">
                  <span>
                    Encrypting PDF
                  </span>

                  <span>
                    {progress}%
                  </span>
                </div>

                <div className="encrypt-pdf-progress-track">
                  <div
                    className="encrypt-pdf-progress-bar"
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
                <div className="encrypt-pdf-result">
                  <strong>
                    PDF encrypted successfully.
                  </strong>

                  <span>
                    {resultName}
                  </span>

                  <a
                    className="encrypt-pdf-download"
                    href={
                      resultUrl
                    }
                    download={
                      resultName
                    }
                  >
                    Download Encrypted PDF
                  </a>
                </div>
              )}

            {status === "error" &&
              error && (
                <div className="encrypt-pdf-error">
                  {error}
                </div>
              )}
          </>
        )}
      </div>
    </div>
  );
}

export default EncryptPdf;