import { useEffect, useState } from "react";
import {
  flattenPdf,
  getFlattenPdfInfo,
} from "../../../services/pdf/flattenPdf.js";

function FlattenPdf() {
  const [file, setFile] = useState(null);
  const [pdfInfo, setPdfInfo] = useState(null);

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

  async function loadFile(selectedFile) {
    if (!selectedFile) {
      return;
    }

    setError("");
    setStatus("loading");
    setProgress(0);

    try {
      if (
        selectedFile.type !== "application/pdf" &&
        !selectedFile.name.toLowerCase().endsWith(".pdf")
      ) {
        throw new Error("Please select a PDF file.");
      }

      const info = await getFlattenPdfInfo(selectedFile);

      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }

      setFile(selectedFile);
      setPdfInfo(info);
      setResultUrl("");
      setResultName("");
      setStatus("ready");
    } catch (err) {
      setFile(null);
      setPdfInfo(null);
      setStatus("error");
      setError(err.message || "Unable to read the PDF.");
    }
  }

  function handleFileInput(event) {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      loadFile(selectedFile);
    }

    event.target.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragActive(false);

    const droppedFile = event.dataTransfer.files?.[0];

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
    setResultUrl("");
    setResultName("");
    setProgress(0);
    setError("");
    setStatus("idle");
  }

  function resetTool() {
    removeFile();
  }

  async function handleFlatten() {
    if (!file) {
      setError("Please select a PDF first.");
      return;
    }

    try {
      setError("");
      setStatus("processing");
      setProgress(0);

      const blob = await flattenPdf(file, ({ percent }) => {
        setProgress(percent);
      });

      if (!(blob instanceof Blob) || blob.size === 0) {
        throw new Error("The generated PDF is empty.");
      }

      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }

      const url = URL.createObjectURL(blob);
      const baseName = file.name.replace(/\.pdf$/i, "");

      setResultUrl(url);
      setResultName(`${baseName}-flattened.pdf`);
      setProgress(100);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err.message || "Failed to flatten the PDF.");
    }
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return (
    <div className="flatten-pdf-tool">
      <style>{`
        .flatten-pdf-tool {
          width: 100%;
          color: #f5f5f5;
        }

        .flatten-pdf-shell {
          width: min(980px, 100%);
          margin: 0 auto;
          padding: 28px;
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

        .flatten-pdf-upload {
          min-height: 320px;
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

        .flatten-pdf-upload.active {
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

        .flatten-pdf-upload-icon {
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
          letter-spacing: 0.5px;
        }

        .flatten-pdf-upload h3 {
          margin: 0 0 8px;
          font-size: 21px;
        }

        .flatten-pdf-upload p {
          max-width: 520px;
          margin: 0 0 22px;
          color: rgba(255,255,255,0.5);
          font-size: 14px;
          line-height: 1.6;
        }

        .flatten-pdf-upload-button {
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

        .flatten-pdf-upload-button:hover {
          background: rgba(255,255,255,0.11);
          border-color: rgba(255,145,60,0.3);
        }

        .flatten-pdf-upload input {
          display: none;
        }

        .flatten-pdf-file {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          margin-bottom: 20px;
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
        }

        .flatten-pdf-file-icon {
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

        .flatten-pdf-file-info {
          flex: 1;
          min-width: 0;
        }

        .flatten-pdf-file-info strong {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
        }

        .flatten-pdf-file-info span {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,0.43);
          font-size: 12px;
        }

        .flatten-pdf-remove {
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

        .flatten-pdf-remove:hover {
          color: #fff;
          border-color: rgba(255,100,30,0.35);
        }

        .flatten-pdf-content {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 280px;
          gap: 18px;
        }

        .flatten-pdf-card {
          padding: 20px;
          border-radius: 19px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.025);
        }

        .flatten-pdf-section-title {
          margin: 0 0 14px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1.7px;
          color: rgba(255,255,255,0.43);
        }

        .flatten-pdf-explanation {
          color: rgba(255,255,255,0.65);
          font-size: 13px;
          line-height: 1.7;
        }

        .flatten-pdf-explanation strong {
          color: rgba(255,255,255,0.9);
        }

        .flatten-pdf-note {
          margin-top: 15px;
          padding: 13px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255,145,60,0.12);
          background: rgba(255,110,30,0.045);
          color: rgba(255,255,255,0.52);
          font-size: 12px;
          line-height: 1.55;
        }

        .flatten-pdf-stats {
          display: grid;
          gap: 9px;
        }

        .flatten-pdf-stat {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 11px 12px;
          border-radius: 11px;
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.055);
        }

        .flatten-pdf-stat span {
          color: rgba(255,255,255,0.45);
          font-size: 12px;
        }

        .flatten-pdf-stat strong {
          font-size: 13px;
        }

        .flatten-pdf-ready {
          margin-top: 15px;
          padding: 13px 14px;
          border-radius: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.5);
          font-size: 12px;
          line-height: 1.55;
        }

        .flatten-pdf-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .flatten-pdf-primary,
        .flatten-pdf-secondary {
          min-height: 46px;
          border-radius: 13px;
          padding: 0 18px;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .flatten-pdf-primary {
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

        .flatten-pdf-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 14px 32px rgba(255,90,20,0.2),
            inset 0 1px 0 rgba(255,255,255,0.18);
        }

        .flatten-pdf-primary:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
        }

        .flatten-pdf-secondary {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.045);
          color: rgba(255,255,255,0.75);
        }

        .flatten-pdf-secondary:hover:not(:disabled) {
          background: rgba(255,255,255,0.08);
          color: #fff;
        }

        .flatten-pdf-progress {
          margin-top: 16px;
          padding: 14px;
          border-radius: 13px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
        }

        .flatten-pdf-progress-head {
          display: flex;
          justify-content: space-between;
          margin-bottom: 9px;
          color: rgba(255,255,255,0.58);
          font-size: 12px;
        }

        .flatten-pdf-progress-track {
          height: 6px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,0.07);
        }

        .flatten-pdf-progress-bar {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #ff6420,
            #ff9b57
          );
          transition: width 0.2s ease;
        }

        .flatten-pdf-result {
          margin-top: 16px;
          padding: 16px;
          border-radius: 15px;
          border: 1px solid rgba(101,209,131,0.15);
          background: rgba(80,190,110,0.045);
        }

        .flatten-pdf-result strong {
          display: block;
          font-size: 14px;
        }

        .flatten-pdf-result span {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,0.46);
          font-size: 12px;
        }

        .flatten-pdf-download {
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

        .flatten-pdf-error {
          margin-top: 16px;
          padding: 13px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255,90,80,0.17);
          background: rgba(255,70,60,0.055);
          color: #ffb1aa;
          font-size: 12px;
          line-height: 1.5;
        }

        @media (max-width: 760px) {
          .flatten-pdf-shell {
            padding: 17px;
            border-radius: 20px;
          }

          .flatten-pdf-content {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .flatten-pdf-actions {
            flex-direction: column;
          }

          .flatten-pdf-primary,
          .flatten-pdf-secondary {
            width: 100%;
          }
        }
      `}</style>

      <div className="flatten-pdf-shell">
        {!file && (
          <div
            className={`flatten-pdf-upload ${
              dragActive ? "active" : ""
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            <div className="flatten-pdf-upload-icon">
              PDF
            </div>

            <h3>Flatten your PDF</h3>

            <p>
              Turn interactive PDF form fields into permanent
              page content so the document can no longer be
              edited through those fields.
            </p>

            <label className="flatten-pdf-upload-button">
              Choose PDF
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileInput}
              />
            </label>
          </div>
        )}

        {file && pdfInfo && (
          <>
            <div className="flatten-pdf-file">
              <div className="flatten-pdf-file-icon">
                PDF
              </div>

              <div className="flatten-pdf-file-info">
                <strong>{file.name}</strong>

                <span>
                  {pdfInfo.pageCount}{" "}
                  {pdfInfo.pageCount === 1
                    ? "page"
                    : "pages"}
                  {" · "}
                  {formatFileSize(file.size)}
                </span>
              </div>

              <button
                type="button"
                className="flatten-pdf-remove"
                onClick={removeFile}
                aria-label="Remove PDF"
              >
                ×
              </button>
            </div>

            <div className="flatten-pdf-content">
              <div className="flatten-pdf-card">
                <h3 className="flatten-pdf-section-title">
                  WHAT FLATTENING DOES
                </h3>

                <div className="flatten-pdf-explanation">
                  <strong>
                    Interactive form fields become static.
                  </strong>{" "}
                  Text fields, checkboxes, dropdowns, radio
                  buttons, and other AcroForm controls are
                  flattened into the document's page content.
                </div>

                <div className="flatten-pdf-note">
                  After flattening, the form fields cannot be
                  edited or filled again as interactive PDF
                  controls.
                </div>

                <div className="flatten-pdf-ready">
                  {pdfInfo.hasFormFields
                    ? `This PDF contains ${pdfInfo.fieldCount} interactive ${
                        pdfInfo.fieldCount === 1
                          ? "form field"
                          : "form fields"
                      } and is ready to flatten.`
                    : "No interactive AcroForm fields were detected. The PDF can still be processed safely."}
                </div>
              </div>

              <div className="flatten-pdf-card">
                <h3 className="flatten-pdf-section-title">
                  PDF INFO
                </h3>

                <div className="flatten-pdf-stats">
                  <div className="flatten-pdf-stat">
                    <span>Pages</span>
                    <strong>{pdfInfo.pageCount}</strong>
                  </div>

                  <div className="flatten-pdf-stat">
                    <span>Form fields</span>
                    <strong>{pdfInfo.fieldCount}</strong>
                  </div>

                  <div className="flatten-pdf-stat">
                    <span>File size</span>
                    <strong>
                      {formatFileSize(pdfInfo.size)}
                    </strong>
                  </div>

                  <div className="flatten-pdf-stat">
                    <span>Status</span>
                    <strong>
                      {pdfInfo.hasFormFields
                        ? "Interactive"
                        : "Static"}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="flatten-pdf-actions">
              <button
                type="button"
                className="flatten-pdf-primary"
                onClick={handleFlatten}
                disabled={status === "processing"}
              >
                {status === "processing"
                  ? `Flattening PDF · ${progress}%`
                  : "Flatten PDF"}
              </button>

              <button
                type="button"
                className="flatten-pdf-secondary"
                onClick={resetTool}
                disabled={status === "processing"}
              >
                Reset
              </button>
            </div>

            {status === "processing" && (
              <div className="flatten-pdf-progress">
                <div className="flatten-pdf-progress-head">
                  <span>Processing PDF</span>
                  <span>{progress}%</span>
                </div>

                <div className="flatten-pdf-progress-track">
                  <div
                    className="flatten-pdf-progress-bar"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {status === "success" && resultUrl && (
              <div className="flatten-pdf-result">
                <strong>
                  PDF flattened successfully.
                </strong>

                <span>{resultName}</span>

                <a
                  className="flatten-pdf-download"
                  href={resultUrl}
                  download={resultName}
                >
                  Download PDF
                </a>
              </div>
            )}

            {status === "error" && error && (
              <div className="flatten-pdf-error">
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default FlattenPdf;