import { useEffect, useMemo, useState } from "react";
import {
  addHeadersFooters,
  getHeadersFootersPdfInfo,
  createHeadersFootersOptions,
} from "../../../services/pdf/headersFooters.js";

function HeadersFooters() {
  const [file, setFile] = useState(null);
  const [pdfInfo, setPdfInfo] = useState(null);

  const [headerEnabled, setHeaderEnabled] = useState(true);
  const [footerEnabled, setFooterEnabled] = useState(true);

  const [headerLeft, setHeaderLeft] = useState("");
  const [headerCenter, setHeaderCenter] = useState("");
  const [headerRight, setHeaderRight] = useState("");

  const [footerLeft, setFooterLeft] = useState("");
  const [footerCenter, setFooterCenter] = useState("Page {{page}} of {{pages}}");
  const [footerRight, setFooterRight] = useState("");

  const [font, setFont] = useState("Helvetica");
  const [fontSize, setFontSize] = useState(9);
  const [opacity, setOpacity] = useState(1);

  const [marginTop, setMarginTop] = useState(24);
  const [marginBottom, setMarginBottom] = useState(24);
  const [marginLeft, setMarginLeft] = useState(24);
  const [marginRight, setMarginRight] = useState(24);

  const [lineEnabled, setLineEnabled] = useState(false);
  const [lineWidth, setLineWidth] = useState(0.6);
  const [lineGap, setLineGap] = useState(6);

  const [pageSelection, setPageSelection] = useState("all");
  const [customPages, setCustomPages] = useState("");

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

  const parsedCustomPages = useMemo(() => {
    return customPages
      .split(",")
      .map((value) => Number(value.trim()))
      .filter(
        (value) =>
          Number.isInteger(value) &&
          value > 0 &&
          (!pdfInfo || value <= pdfInfo.pageCount)
      );
  }, [customPages, pdfInfo]);

  async function loadFile(selectedFile) {
    if (!selectedFile) {
      return;
    }

    setError("");
    setStatus("loading");

    try {
      if (
        selectedFile.type !== "application/pdf" &&
        !selectedFile.name.toLowerCase().endsWith(".pdf")
      ) {
        throw new Error("Please select a PDF file.");
      }

      const info = await getHeadersFootersPdfInfo(selectedFile);

      setFile(selectedFile);
      setPdfInfo(info);
      setStatus("ready");
      setProgress(0);
      setResultUrl("");
      setResultName("");
    } catch (err) {
      setFile(null);
      setPdfInfo(null);
      setStatus("error");
      setError(err.message || "Unable to load the PDF.");
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
    setStatus("idle");
    setProgress(0);
    setError("");
    setResultUrl("");
    setResultName("");
  }

  function resetTool() {
    removeFile();

    setHeaderEnabled(true);
    setFooterEnabled(true);

    setHeaderLeft("");
    setHeaderCenter("");
    setHeaderRight("");

    setFooterLeft("");
    setFooterCenter("Page {{page}} of {{pages}}");
    setFooterRight("");

    setFont("Helvetica");
    setFontSize(9);
    setOpacity(1);

    setMarginTop(24);
    setMarginBottom(24);
    setMarginLeft(24);
    setMarginRight(24);

    setLineEnabled(false);
    setLineWidth(0.6);
    setLineGap(6);

    setPageSelection("all");
    setCustomPages("");
  }

  function buildOptions() {
    return createHeadersFootersOptions({
      header: {
        enabled: headerEnabled,
        left: headerLeft,
        center: headerCenter,
        right: headerRight,
      },

      footer: {
        enabled: footerEnabled,
        left: footerLeft,
        center: footerCenter,
        right: footerRight,
      },

      font,
      fontSize,
      opacity,

      marginTop,
      marginBottom,
      marginLeft,
      marginRight,

      lineEnabled,
      lineWidth,
      lineGap,

      pageSelection,
      customPages: parsedCustomPages,
    });
  }

  async function handleProcess() {
    if (!file) {
      setError("Please select a PDF first.");
      return;
    }

    if (!headerEnabled && !footerEnabled) {
      setError("Enable at least a header or footer.");
      return;
    }

    if (
      headerEnabled &&
      !headerLeft.trim() &&
      !headerCenter.trim() &&
      !headerRight.trim()
    ) {
      setError("Add at least one header value.");
      return;
    }

    if (
      footerEnabled &&
      !footerLeft.trim() &&
      !footerCenter.trim() &&
      !footerRight.trim()
    ) {
      setError("Add at least one footer value.");
      return;
    }

    if (pageSelection === "custom" && parsedCustomPages.length === 0) {
      setError("Enter at least one valid custom page number.");
      return;
    }

    try {
      setStatus("processing");
      setProgress(0);
      setError("");

      const blob = await addHeadersFooters(
        file,
        buildOptions(),
        ({ percent }) => {
          setProgress(percent);
        }
      );

      if (!(blob instanceof Blob) || blob.size === 0) {
        throw new Error("The generated PDF is empty.");
      }

      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }

      const url = URL.createObjectURL(blob);

      const baseName = file.name.replace(/\.pdf$/i, "");

      setResultUrl(url);
      setResultName(`${baseName}-headers-footers.pdf`);
      setProgress(100);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err.message || "Failed to add headers and footers.");
    }
  }

  function previewValue(value) {
    return value
      .replace(/\{\{page\}\}/gi, "1")
      .replace(/\{\{pages\}\}/gi, String(pdfInfo?.pageCount || 8))
      .replace(/\{\{filename\}\}/gi, file?.name?.replace(/\.pdf$/i, "") || "document")
      .replace(/\{\{date\}\}/gi, new Date().toLocaleDateString())
      .replace(/\{\{time\}\}/gi, new Date().toLocaleTimeString());
  }

  const previewHeaderLeft = previewValue(headerLeft);
  const previewHeaderCenter = previewValue(headerCenter);
  const previewHeaderRight = previewValue(headerRight);

  const previewFooterLeft = previewValue(footerLeft);
  const previewFooterCenter = previewValue(footerCenter);
  const previewFooterRight = previewValue(footerRight);

  return (
    <div className="headers-footers-tool">
      <style>{`
        .headers-footers-tool {
          width: 100%;
          color: #f5f5f5;
        }

        .headers-footers-shell {
          width: min(1180px, 100%);
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

        .headers-footers-upload {
          padding: 42px 30px;
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

        .headers-footers-upload.active {
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

        .headers-footers-upload-icon {
          width: 62px;
          height: 62px;
          margin: 0 auto 16px;
          display: grid;
          place-items: center;
          border-radius: 18px;
          background: rgba(255,110,30,0.1);
          border: 1px solid rgba(255,145,60,0.18);
          color: #ff8a3d;
          font-size: 21px;
          font-weight: 800;
        }

        .headers-footers-upload h3 {
          margin: 0 0 8px;
          font-size: 20px;
          font-weight: 700;
        }

        .headers-footers-upload p {
          margin: 0 0 20px;
          color: rgba(255,255,255,0.55);
          font-size: 14px;
        }

        .headers-footers-upload input {
          display: none;
        }

        .headers-footers-upload-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 11px 18px;
          border-radius: 12px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff;
          cursor: pointer;
          font-size: 14px;
          font-weight: 700;
          transition: 0.2s ease;
        }

        .headers-footers-upload-button:hover {
          background: rgba(255,255,255,0.11);
          border-color: rgba(255,145,60,0.3);
        }

        .headers-footers-file-bar {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          margin-bottom: 22px;
          border-radius: 15px;
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .headers-footers-file-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: rgba(255,100,30,0.12);
          color: #ff8a3d;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.5px;
        }

        .headers-footers-file-info {
          flex: 1;
          min-width: 0;
        }

        .headers-footers-file-info strong {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
        }

        .headers-footers-file-info span {
          display: block;
          margin-top: 3px;
          color: rgba(255,255,255,0.45);
          font-size: 12px;
        }

        .headers-footers-remove {
          width: 34px;
          height: 34px;
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 10px;
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.7);
          cursor: pointer;
          font-size: 18px;
        }

        .headers-footers-remove:hover {
          color: #fff;
          border-color: rgba(255,100,30,0.35);
        }

        .headers-footers-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(360px, 0.9fr);
          gap: 22px;
          align-items: start;
        }

        .headers-footers-panel {
          border-radius: 20px;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          padding: 20px;
        }

        .headers-footers-section + .headers-footers-section {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,0.07);
        }

        .headers-footers-section-title {
          margin: 0 0 15px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.7px;
          color: rgba(255,255,255,0.43);
        }

        .headers-footers-toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          margin-bottom: 15px;
        }

        .headers-footers-toggle-info strong {
          display: block;
          font-size: 14px;
        }

        .headers-footers-toggle-info span {
          display: block;
          margin-top: 3px;
          color: rgba(255,255,255,0.42);
          font-size: 12px;
        }

        .headers-footers-switch {
          position: relative;
          width: 44px;
          height: 24px;
          flex: 0 0 auto;
        }

        .headers-footers-switch input {
          display: none;
        }

        .headers-footers-switch-track {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.08);
          cursor: pointer;
          transition: 0.2s ease;
        }

        .headers-footers-switch-track::after {
          content: "";
          position: absolute;
          width: 18px;
          height: 18px;
          top: 2px;
          left: 2px;
          border-radius: 50%;
          background: rgba(255,255,255,0.72);
          transition: 0.2s ease;
        }

        .headers-footers-switch input:checked + .headers-footers-switch-track {
          background: rgba(255,110,30,0.5);
          border-color: rgba(255,140,70,0.7);
        }

        .headers-footers-switch input:checked + .headers-footers-switch-track::after {
          transform: translateX(20px);
          background: #fff;
        }

        .headers-footers-fields {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .headers-footers-field,
        .headers-footers-full-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .headers-footers-field label,
        .headers-footers-full-field label {
          font-size: 11px;
          color: rgba(255,255,255,0.43);
          font-weight: 700;
        }

        .headers-footers-field input,
        .headers-footers-field select,
        .headers-footers-full-field input,
        .headers-footers-full-field select {
          width: 100%;
          box-sizing: border-box;
          min-height: 42px;
          padding: 10px 11px;
          border-radius: 11px;
          border: 1px solid rgba(255,255,255,0.08);
          outline: none;
          background: rgba(255,255,255,0.045);
          color: #fff;
          font: inherit;
        }

        .headers-footers-field input:focus,
        .headers-footers-field select:focus,
        .headers-footers-full-field input:focus,
        .headers-footers-full-field select:focus {
          border-color: rgba(255,135,55,0.55);
          box-shadow: 0 0 0 3px rgba(255,110,30,0.08);
        }

        .headers-footers-field select option,
        .headers-footers-full-field select option {
          background: #1d1a18;
          color: #fff;
        }

        .headers-footers-options-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .headers-footers-range-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .headers-footers-range-row input[type="range"] {
          flex: 1;
          accent-color: #ff7c34;
        }

        .headers-footers-range-value {
          min-width: 44px;
          text-align: right;
          color: rgba(255,255,255,0.68);
          font-size: 12px;
        }

        .headers-footers-checkbox-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 14px;
          padding: 12px;
          border-radius: 12px;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.055);
        }

        .headers-footers-checkbox-row input {
          accent-color: #ff7c34;
          width: 16px;
          height: 16px;
        }

        .headers-footers-checkbox-row span {
          font-size: 13px;
          color: rgba(255,255,255,0.72);
        }

        .headers-footers-preview-title {
          margin: 0 0 14px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.7px;
          color: rgba(255,255,255,0.43);
        }

        .headers-footers-preview-wrap {
          padding: 18px;
          border-radius: 16px;
          background:
            radial-gradient(
              circle at 50% 30%,
              rgba(255,110,30,0.06),
              transparent 48%
            ),
            rgba(0,0,0,0.12);
          border: 1px solid rgba(255,255,255,0.06);
        }

        .headers-footers-paper {
          position: relative;
          min-height: 500px;
          padding:
            max(30px, var(--preview-top))
            max(30px, var(--preview-right))
            max(30px, var(--preview-bottom))
            max(30px, var(--preview-left));
          box-sizing: border-box;
          background: #f7f5f1;
          color: #1b1b1b;
          border-radius: 4px;
          box-shadow:
            0 18px 40px rgba(0,0,0,0.24),
            0 2px 6px rgba(0,0,0,0.16);
          overflow: hidden;
        }

        .headers-footers-paper-header {
          position: absolute;
          top: 17px;
          left: 18px;
          right: 18px;
          font-size: 9px;
          line-height: 1.3;
        }

        .headers-footers-paper-footer {
          position: absolute;
          bottom: 17px;
          left: 18px;
          right: 18px;
          font-size: 9px;
          line-height: 1.3;
        }

        .headers-footers-paper-three {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
          align-items: center;
        }

        .headers-footers-paper-center {
          text-align: center;
        }

        .headers-footers-paper-right {
          text-align: right;
        }

        .headers-footers-paper-line {
          height: 1px;
          margin-top: 6px;
          background: rgba(20,20,20,0.35);
        }

        .headers-footers-paper-content {
          height: 100%;
          min-height: 400px;
          display: flex;
          justify-content: center;
          align-items: center;
          color: rgba(30,30,30,0.18);
          font-size: 11px;
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }

        .headers-footers-placeholder-help {
          margin-top: 12px;
          padding: 11px 12px;
          border-radius: 11px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.055);
          color: rgba(255,255,255,0.43);
          font-size: 11px;
          line-height: 1.55;
        }

        .headers-footers-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 20px;
        }

        .headers-footers-primary,
        .headers-footers-secondary {
          min-height: 46px;
          padding: 0 18px;
          border-radius: 13px;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .headers-footers-primary {
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

        .headers-footers-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 14px 32px rgba(255,90,20,0.2),
            inset 0 1px 0 rgba(255,255,255,0.18);
        }

        .headers-footers-primary:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .headers-footers-secondary {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.045);
          color: rgba(255,255,255,0.75);
        }

        .headers-footers-secondary:hover {
          background: rgba(255,255,255,0.08);
          color: #fff;
        }

        .headers-footers-status {
          margin-top: 16px;
          padding: 14px;
          border-radius: 13px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
        }

        .headers-footers-status-label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 9px;
          font-size: 12px;
          color: rgba(255,255,255,0.58);
        }

        .headers-footers-progress {
          height: 6px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,0.07);
        }

        .headers-footers-progress-bar {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #ff6420,
            #ff9b57
          );
          transition: width 0.2s ease;
        }

        .headers-footers-result {
          margin-top: 16px;
          padding: 16px;
          border-radius: 15px;
          border: 1px solid rgba(101, 209, 131, 0.15);
          background: rgba(80,190,110,0.045);
        }

        .headers-footers-result strong {
          display: block;
          font-size: 14px;
        }

        .headers-footers-result span {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,0.46);
          font-size: 12px;
        }

        .headers-footers-download {
          display: inline-flex;
          margin-top: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          text-decoration: none;
          border: 1px solid rgba(255,145,60,0.2);
          background: rgba(255,110,30,0.1);
          color: #ffae78;
          font-size: 12px;
          font-weight: 800;
        }

        .headers-footers-error {
          margin-top: 16px;
          padding: 13px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255,90,80,0.17);
          background: rgba(255,70,60,0.055);
          color: #ffb1aa;
          font-size: 12px;
          line-height: 1.5;
        }

        .headers-footers-info {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 12px;
        }

        .headers-footers-chip {
          padding: 6px 9px;
          border-radius: 8px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.055);
          color: rgba(255,255,255,0.48);
          font-size: 11px;
        }

        @media (max-width: 900px) {
          .headers-footers-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .headers-footers-shell {
            padding: 16px;
            border-radius: 20px;
          }

          .headers-footers-fields,
          .headers-footers-options-grid {
            grid-template-columns: 1fr;
          }

          .headers-footers-paper {
            min-height: 420px;
          }

          .headers-footers-actions {
            flex-direction: column;
          }

          .headers-footers-primary,
          .headers-footers-secondary {
            width: 100%;
          }
        }
      `}</style>

      <div className="headers-footers-shell">
        {!file && (
          <div
            className={`headers-footers-upload ${
              dragActive ? "active" : ""
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            <div className="headers-footers-upload-icon">PDF</div>

            <h3>Add headers & footers</h3>

            <p>
              Upload a PDF to add professional header and footer content.
            </p>

            <label className="headers-footers-upload-button">
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
            <div className="headers-footers-file-bar">
              <div className="headers-footers-file-icon">PDF</div>

              <div className="headers-footers-file-info">
                <strong>{file.name}</strong>
                <span>
                  {pdfInfo.pageCount}{" "}
                  {pdfInfo.pageCount === 1 ? "page" : "pages"}
                  {" · "}
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>

              <button
                type="button"
                className="headers-footers-remove"
                onClick={removeFile}
                aria-label="Remove PDF"
              >
                ×
              </button>
            </div>

            <div className="headers-footers-layout">
              <div className="headers-footers-panel">
                <div className="headers-footers-section">
                  <h3 className="headers-footers-section-title">
                    HEADER
                  </h3>

                  <div className="headers-footers-toggle-row">
                    <div className="headers-footers-toggle-info">
                      <strong>Enable header</strong>
                      <span>Add content above the page body</span>
                    </div>

                    <label className="headers-footers-switch">
                      <input
                        type="checkbox"
                        checked={headerEnabled}
                        onChange={(event) =>
                          setHeaderEnabled(event.target.checked)
                        }
                      />
                      <span className="headers-footers-switch-track" />
                    </label>
                  </div>

                  {headerEnabled && (
                    <div className="headers-footers-fields">
                      <div className="headers-footers-field">
                        <label>LEFT</label>
                        <input
                          type="text"
                          value={headerLeft}
                          onChange={(event) =>
                            setHeaderLeft(event.target.value)
                          }
                          placeholder="Company name"
                        />
                      </div>

                      <div className="headers-footers-field">
                        <label>CENTER</label>
                        <input
                          type="text"
                          value={headerCenter}
                          onChange={(event) =>
                            setHeaderCenter(event.target.value)
                          }
                          placeholder="Document title"
                        />
                      </div>

                      <div className="headers-footers-field">
                        <label>RIGHT</label>
                        <input
                          type="text"
                          value={headerRight}
                          onChange={(event) =>
                            setHeaderRight(event.target.value)
                          }
                          placeholder="Confidential"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="headers-footers-section">
                  <h3 className="headers-footers-section-title">
                    FOOTER
                  </h3>

                  <div className="headers-footers-toggle-row">
                    <div className="headers-footers-toggle-info">
                      <strong>Enable footer</strong>
                      <span>Add content below the page body</span>
                    </div>

                    <label className="headers-footers-switch">
                      <input
                        type="checkbox"
                        checked={footerEnabled}
                        onChange={(event) =>
                          setFooterEnabled(event.target.checked)
                        }
                      />
                      <span className="headers-footers-switch-track" />
                    </label>
                  </div>

                  {footerEnabled && (
                    <div className="headers-footers-fields">
                      <div className="headers-footers-field">
                        <label>LEFT</label>
                        <input
                          type="text"
                          value={footerLeft}
                          onChange={(event) =>
                            setFooterLeft(event.target.value)
                          }
                          placeholder="Author"
                        />
                      </div>

                      <div className="headers-footers-field">
                        <label>CENTER</label>
                        <input
                          type="text"
                          value={footerCenter}
                          onChange={(event) =>
                            setFooterCenter(event.target.value)
                          }
                          placeholder="Page {{page}} of {{pages}}"
                        />
                      </div>

                      <div className="headers-footers-field">
                        <label>RIGHT</label>
                        <input
                          type="text"
                          value={footerRight}
                          onChange={(event) =>
                            setFooterRight(event.target.value)
                          }
                          placeholder="www.example.com"
                        />
                      </div>
                    </div>
                  )}

                  <div className="headers-footers-placeholder-help">
                    Dynamic values:
                    {" "}
                    <strong>
                      {"{{page}}"}
                    </strong>
                    {" "}
                    current page ·
                    {" "}
                    <strong>
                      {"{{pages}}"}
                    </strong>
                    {" "}
                    total pages ·
                    {" "}
                    <strong>
                      {"{{filename}}"}
                    </strong>
                    {" "}
                    filename ·
                    {" "}
                    <strong>
                      {"{{date}}"}
                    </strong>
                    {" "}
                    date ·
                    {" "}
                    <strong>
                      {"{{time}}"}
                    </strong>
                    {" "}
                    time
                  </div>
                </div>

                <div className="headers-footers-section">
                  <h3 className="headers-footers-section-title">
                    STYLE
                  </h3>

                  <div className="headers-footers-options-grid">
                    <div className="headers-footers-field">
                      <label>FONT</label>
                      <select
                        value={font}
                        onChange={(event) =>
                          setFont(event.target.value)
                        }
                      >
                        <option value="Helvetica">
                          Helvetica
                        </option>
                        <option value="Helvetica-Bold">
                          Helvetica Bold
                        </option>
                        <option value="Helvetica-Oblique">
                          Helvetica Oblique
                        </option>
                        <option value="Times-Roman">
                          Times Roman
                        </option>
                        <option value="Times-Bold">
                          Times Bold
                        </option>
                        <option value="Times-Italic">
                          Times Italic
                        </option>
                        <option value="Courier">
                          Courier
                        </option>
                        <option value="Courier-Bold">
                          Courier Bold
                        </option>
                        <option value="Courier-Oblique">
                          Courier Oblique
                        </option>
                      </select>
                    </div>

                    <div className="headers-footers-field">
                      <label>SIZE</label>
                      <input
                        type="number"
                        min="5"
                        max="36"
                        step="1"
                        value={fontSize}
                        onChange={(event) =>
                          setFontSize(
                            Math.max(
                              5,
                              Math.min(
                                36,
                                Number(event.target.value) || 5
                              )
                            )
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="headers-footers-field" style={{ marginTop: 12 }}>
                    <label>OPACITY</label>
                    <div className="headers-footers-range-row">
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={opacity}
                        onChange={(event) =>
                          setOpacity(Number(event.target.value))
                        }
                      />
                      <span className="headers-footers-range-value">
                        {Math.round(opacity * 100)}%
                      </span>
                    </div>
                  </div>

                  <div className="headers-footers-checkbox-row">
                    <input
                      id="headers-footers-line"
                      type="checkbox"
                      checked={lineEnabled}
                      onChange={(event) =>
                        setLineEnabled(event.target.checked)
                      }
                    />
                    <label htmlFor="headers-footers-line">
                      <span>Add separator line</span>
                    </label>
                  </div>
                </div>

                <div className="headers-footers-section">
                  <h3 className="headers-footers-section-title">
                    MARGINS
                  </h3>

                  <div className="headers-footers-options-grid">
                    <div className="headers-footers-field">
                      <label>TOP</label>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={marginTop}
                        onChange={(event) =>
                          setMarginTop(
                            Math.max(
                              0,
                              Math.min(
                                200,
                                Number(event.target.value) || 0
                              )
                            )
                          )
                        }
                      />
                    </div>

                    <div className="headers-footers-field">
                      <label>BOTTOM</label>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={marginBottom}
                        onChange={(event) =>
                          setMarginBottom(
                            Math.max(
                              0,
                              Math.min(
                                200,
                                Number(event.target.value) || 0
                              )
                            )
                          )
                        }
                      />
                    </div>

                    <div className="headers-footers-field">
                      <label>LEFT</label>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={marginLeft}
                        onChange={(event) =>
                          setMarginLeft(
                            Math.max(
                              0,
                              Math.min(
                                200,
                                Number(event.target.value) || 0
                              )
                            )
                          )
                        }
                      />
                    </div>

                    <div className="headers-footers-field">
                      <label>RIGHT</label>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={marginRight}
                        onChange={(event) =>
                          setMarginRight(
                            Math.max(
                              0,
                              Math.min(
                                200,
                                Number(event.target.value) || 0
                              )
                            )
                          )
                        }
                      />
                    </div>
                  </div>

                  {lineEnabled && (
                    <div className="headers-footers-options-grid" style={{ marginTop: 12 }}>
                      <div className="headers-footers-field">
                        <label>LINE WIDTH</label>
                        <input
                          type="number"
                          min="0.1"
                          max="5"
                          step="0.1"
                          value={lineWidth}
                          onChange={(event) =>
                            setLineWidth(
                              Math.max(
                                0.1,
                                Math.min(
                                  5,
                                  Number(event.target.value) || 0.1
                                )
                              )
                            )
                          }
                        />
                      </div>

                      <div className="headers-footers-field">
                        <label>LINE GAP</label>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          value={lineGap}
                          onChange={(event) =>
                            setLineGap(
                              Math.max(
                                0,
                                Math.min(
                                  30,
                                  Number(event.target.value) || 0
                                )
                              )
                            )
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="headers-footers-section">
                  <h3 className="headers-footers-section-title">
                    PAGES
                  </h3>

                  <div className="headers-footers-full-field">
                    <label>APPLY TO</label>
                    <select
                      value={pageSelection}
                      onChange={(event) =>
                        setPageSelection(event.target.value)
                      }
                    >
                      <option value="all">All pages</option>
                      <option value="first">First page</option>
                      <option value="last">Last page</option>
                      <option value="odd">Odd pages</option>
                      <option value="even">Even pages</option>
                      <option value="custom">Custom pages</option>
                    </select>
                  </div>

                  {pageSelection === "custom" && (
                    <div
                      className="headers-footers-full-field"
                      style={{ marginTop: 12 }}
                    >
                      <label>
                        PAGE NUMBERS
                      </label>

                      <input
                        type="text"
                        value={customPages}
                        onChange={(event) =>
                          setCustomPages(event.target.value)
                        }
                        placeholder="1, 3, 5, 8"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="headers-footers-panel">
                <h3 className="headers-footers-preview-title">
                  LIVE PREVIEW
                </h3>

                <div className="headers-footers-preview-wrap">
                  <div
                    className="headers-footers-paper"
                    style={{
                      "--preview-top": `${Math.min(marginTop + 20, 100)}px`,
                      "--preview-bottom": `${Math.min(
                        marginBottom + 20,
                        100
                      )}px`,
                      "--preview-left": `${Math.min(
                        marginLeft + 20,
                        100
                      )}px`,
                      "--preview-right": `${Math.min(
                        marginRight + 20,
                        100
                      )}px`,
                      fontFamily:
                        font.startsWith("Times")
                          ? "Georgia, serif"
                          : font.startsWith("Courier")
                          ? '"Courier New", monospace'
                          : "Arial, sans-serif",
                      fontSize: `${Math.max(
                        7,
                        Math.min(fontSize, 18)
                      )}px`,
                    }}
                  >
                    {headerEnabled && (
                      <div
                        className="headers-footers-paper-header"
                        style={{
                          opacity,
                          fontWeight: font.includes("Bold")
                            ? 700
                            : 400,
                          fontStyle:
                            font.includes("Italic") ||
                            font.includes("Oblique")
                              ? "italic"
                              : "normal",
                        }}
                      >
                        <div className="headers-footers-paper-three">
                          <div>
                            {previewHeaderLeft}
                          </div>
                          <div className="headers-footers-paper-center">
                            {previewHeaderCenter}
                          </div>
                          <div className="headers-footers-paper-right">
                            {previewHeaderRight}
                          </div>
                        </div>

                        {lineEnabled && (
                          <div className="headers-footers-paper-line" />
                        )}
                      </div>
                    )}

                    <div className="headers-footers-paper-content">
                      PDF CONTENT
                    </div>

                    {footerEnabled && (
                      <div
                        className="headers-footers-paper-footer"
                        style={{
                          opacity,
                          fontWeight: font.includes("Bold")
                            ? 700
                            : 400,
                          fontStyle:
                            font.includes("Italic") ||
                            font.includes("Oblique")
                              ? "italic"
                              : "normal",
                        }}
                      >
                        {lineEnabled && (
                          <div
                            className="headers-footers-paper-line"
                            style={{
                              marginTop: 0,
                              marginBottom: 6,
                            }}
                          />
                        )}

                        <div className="headers-footers-paper-three">
                          <div>
                            {previewFooterLeft}
                          </div>
                          <div className="headers-footers-paper-center">
                            {previewFooterCenter}
                          </div>
                          <div className="headers-footers-paper-right">
                            {previewFooterRight}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="headers-footers-info">
                  <span className="headers-footers-chip">
                    {pageSelection === "all"
                      ? "All pages"
                      : pageSelection === "first"
                      ? "First page"
                      : pageSelection === "last"
                      ? "Last page"
                      : pageSelection === "odd"
                      ? "Odd pages"
                      : pageSelection === "even"
                      ? "Even pages"
                      : `${parsedCustomPages.length} custom pages`}
                  </span>

                  <span className="headers-footers-chip">
                    {fontSize} pt
                  </span>

                  <span className="headers-footers-chip">
                    {Math.round(opacity * 100)}% opacity
                  </span>
                </div>
              </div>
            </div>

            <div className="headers-footers-actions">
              <button
                type="button"
                className="headers-footers-primary"
                onClick={handleProcess}
                disabled={status === "processing"}
              >
                {status === "processing"
                  ? `Adding headers & footers · ${progress}%`
                  : "Add Headers & Footers"}
              </button>

              <button
                type="button"
                className="headers-footers-secondary"
                onClick={resetTool}
                disabled={status === "processing"}
              >
                Reset
              </button>
            </div>

            {status === "processing" && (
              <div className="headers-footers-status">
                <div className="headers-footers-status-label">
                  <span>Processing PDF</span>
                  <span>{progress}%</span>
                </div>

                <div className="headers-footers-progress">
                  <div
                    className="headers-footers-progress-bar"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {status === "success" && resultUrl && (
              <div className="headers-footers-result">
                <strong>Headers & footers added successfully.</strong>

                <span>{resultName}</span>

                <a
                  className="headers-footers-download"
                  href={resultUrl}
                  download={resultName}
                >
                  Download PDF
                </a>
              </div>
            )}

            {status === "error" && error && (
              <div className="headers-footers-error">
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default HeadersFooters;