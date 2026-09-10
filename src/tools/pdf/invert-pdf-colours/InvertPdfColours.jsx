import { useEffect, useState } from "react";
import {
  getInvertPdfColoursInfo,
  invertPdfColours,
} from "../../../services/pdf/invertPdfColours.js";

function InvertPdfColours() {
  const [file, setFile] = useState(null);
  const [pdfInfo, setPdfInfo] = useState(null);

  const [renderScale, setRenderScale] = useState(1.5);
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
        selectedFile.name.toLowerCase().endsWith(".pdf");

      if (!isPdf) {
        throw new Error("Please select a PDF file.");
      }

      const info = await getInvertPdfColoursInfo(
        selectedFile
      );

      if (!info || !info.pageCount) {
        throw new Error(
          "Unable to read the PDF. The file may be damaged or unsupported."
        );
      }

      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
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
          "Unable to read the PDF. Please try another file."
      );
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
    setRenderScale(1.5);
  }

  async function handleInvert() {
    if (!file) {
      setError("Please select a PDF first.");
      return;
    }

    try {
      setError("");
      setStatus("processing");
      setProgress(0);

      const blob = await invertPdfColours(
        file,
        {
          renderScale,
        },
        ({ percent }) => {
          setProgress(percent);
        }
      );

      if (!(blob instanceof Blob) || blob.size === 0) {
        throw new Error(
          "The generated PDF is empty."
        );
      }

      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }

      const url = URL.createObjectURL(blob);
      const baseName = file.name.replace(/\.pdf$/i, "");

      setResultUrl(url);
      setResultName(`${baseName}-inverted.pdf`);
      setProgress(100);
      setStatus("success");
    } catch (err) {
      setStatus("error");

      setError(
        err?.message ||
          "Failed to invert the PDF colours."
      );
    }
  }

  return (
    <div className="invert-pdf-colours-tool">
      <style>{`
        .invert-pdf-colours-tool {
          width: 100%;
          color: #f5f5f5;
        }

        .invert-pdf-colours-shell {
          width: min(980px, 100%);
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

        .invert-pdf-colours-upload {
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

        .invert-pdf-colours-upload.active {
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

        .invert-pdf-colours-upload.loading {
          cursor: wait;
        }

        .invert-pdf-colours-upload-icon {
          width: 66px;
          height: 66px;
          margin-bottom: 18px;
          display: grid;
          place-items: center;
          border-radius: 18px;
          border: 1px solid rgba(255,145,60,0.18);
          background: rgba(255,100,30,0.1);
          color: #ff8a3d;
          font-size: 20px;
          font-weight: 900;
          letter-spacing: 0.5px;
        }

        .invert-pdf-colours-upload h3 {
          margin: 0 0 8px;
          font-size: 21px;
        }

        .invert-pdf-colours-upload p {
          max-width: 570px;
          margin: 0 0 22px;
          color: rgba(255,255,255,0.5);
          font-size: 14px;
          line-height: 1.6;
        }

        .invert-pdf-colours-upload-button {
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

        .invert-pdf-colours-upload-button:hover {
          background: rgba(255,255,255,0.11);
          border-color: rgba(255,145,60,0.3);
        }

        .invert-pdf-colours-upload-button.disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .invert-pdf-colours-upload input {
          display: none;
        }

        .invert-pdf-colours-loader {
          width: 34px;
          height: 34px;
          margin: 4px auto 18px;
          border-radius: 50%;
          border: 3px solid rgba(255,255,255,0.1);
          border-top-color: #ff7c34;
          animation: invertPdfSpin 0.8s linear infinite;
        }

        @keyframes invertPdfSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .invert-pdf-colours-error-upload {
          width: min(560px, 100%);
          margin-top: 4px;
          padding: 13px 14px;
          box-sizing: border-box;
          border-radius: 12px;
          border: 1px solid rgba(255,90,80,0.2);
          background: rgba(255,70,60,0.07);
          color: #ffb1aa;
          font-size: 12px;
          line-height: 1.55;
        }

        .invert-pdf-colours-retry {
          margin-top: 12px;
          min-height: 38px;
          padding: 0 14px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.8);
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .invert-pdf-colours-retry:hover {
          background: rgba(255,255,255,0.08);
          color: #fff;
        }

        .invert-pdf-colours-file {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          margin-bottom: 20px;
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
        }

        .invert-pdf-colours-file-icon {
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

        .invert-pdf-colours-file-info {
          flex: 1;
          min-width: 0;
        }

        .invert-pdf-colours-file-info strong {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
        }

        .invert-pdf-colours-file-info span {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,0.43);
          font-size: 12px;
        }

        .invert-pdf-colours-remove {
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

        .invert-pdf-colours-remove:hover {
          color: #fff;
          border-color: rgba(255,100,30,0.35);
        }

        .invert-pdf-colours-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 310px;
          gap: 18px;
          align-items: stretch;
        }

        .invert-pdf-colours-card {
          padding: 21px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.025);
        }

        .invert-pdf-colours-section-title {
          margin: 0 0 15px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1.7px;
          color: rgba(255,255,255,0.43);
        }

        .invert-pdf-colours-explanation {
          color: rgba(255,255,255,0.64);
          font-size: 13px;
          line-height: 1.75;
        }

        .invert-pdf-colours-explanation strong {
          color: rgba(255,255,255,0.9);
        }

        .invert-pdf-colours-swatch-row {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 12px;
          margin-top: 20px;
        }

        .invert-pdf-colours-swatch {
          min-height: 100px;
          padding: 14px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          border: 1px solid rgba(255,255,255,0.08);
          text-align: center;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.4px;
        }

        .invert-pdf-colours-swatch.light {
          background:
            linear-gradient(145deg, #ffffff, #eeeeee);
          color: #181818;
          border-color: rgba(255,255,255,0.55);
        }

        .invert-pdf-colours-swatch.dark {
          background:
            linear-gradient(145deg, #171717, #050505);
          color: #fff;
          border-color: rgba(255,255,255,0.13);
        }

        .invert-pdf-colours-swatch-small {
          margin-top: 5px;
          font-size: 9px;
          opacity: 0.5;
          font-weight: 600;
        }

        .invert-pdf-colours-arrow {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: rgba(255,110,30,0.08);
          border: 1px solid rgba(255,145,60,0.14);
          color: #ff8a3d;
          font-size: 16px;
        }

        .invert-pdf-colours-note {
          margin-top: 18px;
          padding: 13px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255,145,60,0.12);
          background: rgba(255,110,30,0.045);
          color: rgba(255,255,255,0.48);
          font-size: 11px;
          line-height: 1.6;
        }

        .invert-pdf-colours-info-list {
          display: grid;
          gap: 9px;
        }

        .invert-pdf-colours-stat {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 12px;
          border-radius: 11px;
          border: 1px solid rgba(255,255,255,0.055);
          background: rgba(255,255,255,0.035);
        }

        .invert-pdf-colours-stat span {
          color: rgba(255,255,255,0.42);
          font-size: 12px;
        }

        .invert-pdf-colours-stat strong {
          font-size: 12px;
        }

        .invert-pdf-colours-control {
          margin-top: 15px;
        }

        .invert-pdf-colours-control-label {
          display: block;
          margin-bottom: 7px;
          color: rgba(255,255,255,0.43);
          font-size: 11px;
          font-weight: 700;
        }

        .invert-pdf-colours-select {
          width: 100%;
          min-height: 42px;
          box-sizing: border-box;
          padding: 10px 11px;
          border-radius: 11px;
          border: 1px solid rgba(255,255,255,0.08);
          outline: none;
          background: rgba(255,255,255,0.045);
          color: #fff;
          font: inherit;
          font-size: 13px;
        }

        .invert-pdf-colours-select:focus {
          border-color: rgba(255,135,55,0.55);
          box-shadow: 0 0 0 3px rgba(255,110,30,0.08);
        }

        .invert-pdf-colours-select option {
          background: #1d1a18;
          color: #fff;
        }

        .invert-pdf-colours-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .invert-pdf-colours-primary,
        .invert-pdf-colours-secondary {
          min-height: 46px;
          padding: 0 18px;
          border-radius: 13px;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .invert-pdf-colours-primary {
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

        .invert-pdf-colours-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 14px 32px rgba(255,90,20,0.2),
            inset 0 1px 0 rgba(255,255,255,0.18);
        }

        .invert-pdf-colours-primary:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
        }

        .invert-pdf-colours-secondary {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.045);
          color: rgba(255,255,255,0.75);
        }

        .invert-pdf-colours-secondary:hover:not(:disabled) {
          background: rgba(255,255,255,0.08);
          color: #fff;
        }

        .invert-pdf-colours-progress {
          margin-top: 16px;
          padding: 14px;
          border-radius: 13px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
        }

        .invert-pdf-colours-progress-head {
          display: flex;
          justify-content: space-between;
          margin-bottom: 9px;
          color: rgba(255,255,255,0.58);
          font-size: 12px;
        }

        .invert-pdf-colours-progress-track {
          height: 6px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,0.07);
        }

        .invert-pdf-colours-progress-bar {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #ff6420,
            #ff9b57
          );
          transition: width 0.2s ease;
        }

        .invert-pdf-colours-result {
          margin-top: 16px;
          padding: 16px;
          border-radius: 15px;
          border: 1px solid rgba(101,209,131,0.15);
          background: rgba(80,190,110,0.045);
        }

        .invert-pdf-colours-result strong {
          display: block;
          font-size: 14px;
        }

        .invert-pdf-colours-result span {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,0.46);
          font-size: 12px;
        }

        .invert-pdf-colours-download {
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

        .invert-pdf-colours-error {
          margin-top: 16px;
          padding: 13px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255,90,80,0.17);
          background: rgba(255,70,60,0.055);
          color: #ffb1aa;
          font-size: 12px;
          line-height: 1.5;
        }

        @media (max-width: 800px) {
          .invert-pdf-colours-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .invert-pdf-colours-shell {
            padding: 17px;
            border-radius: 20px;
          }

          .invert-pdf-colours-swatch-row {
            grid-template-columns: 1fr;
          }

          .invert-pdf-colours-arrow {
            margin: 0 auto;
            transform: rotate(90deg);
          }

          .invert-pdf-colours-actions {
            flex-direction: column;
          }

          .invert-pdf-colours-primary,
          .invert-pdf-colours-secondary {
            width: 100%;
          }
        }
      `}</style>

      <div className="invert-pdf-colours-shell">
        {!file && (
          <div
            className={`invert-pdf-colours-upload ${
              dragActive ? "active" : ""
            } ${
              status === "loading" ? "loading" : ""
            }`}
            onDragOver={(event) => {
              event.preventDefault();

              if (status !== "loading") {
                setDragActive(true);
              }
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(event) => {
              if (status !== "loading") {
                handleDrop(event);
              }
            }}
          >
            {status === "loading" ? (
              <>
                <div className="invert-pdf-colours-loader" />

                <h3>Reading PDF…</h3>

                <p>
                  Validating the selected PDF and reading
                  its page information.
                </p>
              </>
            ) : (
              <>
                <div className="invert-pdf-colours-upload-icon">
                  ◐
                </div>

                <h3>Invert PDF colours</h3>

                <p>
                  Create a visually inverted version of your
                  PDF by turning light pixels dark and dark
                  pixels light.
                </p>

                <label
                  className={`invert-pdf-colours-upload-button ${
                    status === "loading"
                      ? "disabled"
                      : ""
                  }`}
                >
                  Choose PDF

                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handleFileInput}
                    disabled={status === "loading"}
                  />
                </label>

                {status === "error" && error && (
                  <>
                    <div className="invert-pdf-colours-error-upload">
                      {error}
                    </div>

                    <button
                      type="button"
                      className="invert-pdf-colours-retry"
                      onClick={() => {
                        setError("");
                        setStatus("idle");
                      }}
                    >
                      Try Again
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {file && pdfInfo && (
          <>
            <div className="invert-pdf-colours-file">
              <div className="invert-pdf-colours-file-icon">
                PDF
              </div>

              <div className="invert-pdf-colours-file-info">
                <strong>{file.name}</strong>

                <span>
                  {pdfInfo.pageCount}{" "}
                  {pdfInfo.pageCount === 1
                    ? "page"
                    : "pages"}
                  {" · "}
                  {formatFileSize(pdfInfo.size)}
                </span>
              </div>

              <button
                type="button"
                className="invert-pdf-colours-remove"
                onClick={removeFile}
                disabled={status === "processing"}
                aria-label="Remove PDF"
              >
                ×
              </button>
            </div>

            <div className="invert-pdf-colours-grid">
              <div className="invert-pdf-colours-card">
                <h3 className="invert-pdf-colours-section-title">
                  COLOUR INVERSION
                </h3>

                <div className="invert-pdf-colours-explanation">
                  <strong>
                    Every visible RGB colour is inverted.
                  </strong>{" "}
                  Light areas become dark, dark areas become
                  light, and the alpha channel is preserved.
                </div>

                <div className="invert-pdf-colours-swatch-row">
                  <div className="invert-pdf-colours-swatch light">
                    LIGHT PDF

                    <span className="invert-pdf-colours-swatch-small">
                      white background · dark text
                    </span>
                  </div>

                  <div className="invert-pdf-colours-arrow">
                    →
                  </div>

                  <div className="invert-pdf-colours-swatch dark">
                    INVERTED PDF

                    <span className="invert-pdf-colours-swatch-small">
                      dark background · light text
                    </span>
                  </div>
                </div>

                <div className="invert-pdf-colours-note">
                  The output is rebuilt from rendered page
                  images so the visible colours are genuinely
                  inverted. Because of this, the resulting
                  PDF is rasterized and the original
                  selectable text, links, forms, and
                  annotations are not preserved.
                </div>
              </div>

              <div className="invert-pdf-colours-card">
                <h3 className="invert-pdf-colours-section-title">
                  PDF INFO
                </h3>

                <div className="invert-pdf-colours-info-list">
                  <div className="invert-pdf-colours-stat">
                    <span>Pages</span>
                    <strong>
                      {pdfInfo.pageCount}
                    </strong>
                  </div>

                  <div className="invert-pdf-colours-stat">
                    <span>Input size</span>
                    <strong>
                      {formatFileSize(pdfInfo.size)}
                    </strong>
                  </div>

                  <div className="invert-pdf-colours-stat">
                    <span>Output mode</span>
                    <strong>
                      Rasterized
                    </strong>
                  </div>
                </div>

                <div className="invert-pdf-colours-control">
                  <label
                    className="invert-pdf-colours-control-label"
                    htmlFor="invert-render-quality"
                  >
                    RENDER QUALITY
                  </label>

                  <select
                    id="invert-render-quality"
                    className="invert-pdf-colours-select"
                    value={renderScale}
                    onChange={(event) =>
                      setRenderScale(
                        Number(event.target.value)
                      )
                    }
                    disabled={status === "processing"}
                  >
                    <option value="1">
                      Standard · 1×
                    </option>

                    <option value="1.5">
                      High · 1.5×
                    </option>

                    <option value="2">
                      Very High · 2×
                    </option>

                    <option value="2.5">
                      Ultra · 2.5×
                    </option>

                    <option value="3">
                      Maximum · 3×
                    </option>
                  </select>
                </div>

                <div className="invert-pdf-colours-note">
                  Higher quality creates sharper output but
                  uses more memory and may take longer on
                  large PDFs.
                </div>
              </div>
            </div>

            <div className="invert-pdf-colours-actions">
              <button
                type="button"
                className="invert-pdf-colours-primary"
                onClick={handleInvert}
                disabled={status === "processing"}
              >
                {status === "processing"
                  ? `Inverting Colours · ${progress}%`
                  : "Invert PDF Colours"}
              </button>

              <button
                type="button"
                className="invert-pdf-colours-secondary"
                onClick={resetTool}
                disabled={status === "processing"}
              >
                Reset
              </button>
            </div>

            {status === "processing" && (
              <div className="invert-pdf-colours-progress">
                <div className="invert-pdf-colours-progress-head">
                  <span>Processing PDF</span>
                  <span>{progress}%</span>
                </div>

                <div className="invert-pdf-colours-progress-track">
                  <div
                    className="invert-pdf-colours-progress-bar"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {status === "success" && resultUrl && (
              <div className="invert-pdf-colours-result">
                <strong>
                  PDF colours inverted successfully.
                </strong>

                <span>{resultName}</span>

                <a
                  className="invert-pdf-colours-download"
                  href={resultUrl}
                  download={resultName}
                >
                  Download PDF
                </a>
              </div>
            )}

            {status === "error" && error && (
              <div className="invert-pdf-colours-error">
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default InvertPdfColours;