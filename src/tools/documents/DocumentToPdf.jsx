import React, { useRef, useState } from "react";
import {
  documentToPdf,
  loadDocument,
} from "../../services/documents/documentToPdf.js";

const ACCEPTED_FILES = ".docx,.txt,.html,.htm,.md";

function DocumentToPdf() {
  const fileInputRef = useRef(null);
  const previewRef = useRef(null);

  const [file, setFile] = useState(null);
  const [documentHtml, setDocumentHtml] = useState("");
  const [warnings, setWarnings] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const [pageSize, setPageSize] = useState("a4");
  const [orientation, setOrientation] = useState("portrait");

  const handleFile = async (selectedFile) => {
    if (!selectedFile) return;

    setError("");
    setWarnings([]);
    setDocumentHtml("");
    setFile(null);
    setIsLoading(true);

    try {
      const result = await loadDocument(selectedFile);

      setFile(selectedFile);
      setDocumentHtml(result.html || "");
      setWarnings(result.warnings || []);
    } catch (err) {
      setError(
        err?.message || "Unable to load this document."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (event) => {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      handleFile(selectedFile);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();

    const droppedFile = event.dataTransfer.files?.[0];

    if (droppedFile) {
      handleFile(droppedFile);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const clearDocument = () => {
    setFile(null);
    setDocumentHtml("");
    setWarnings([]);
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleConvert = async () => {
    if (!previewRef.current || !file) {
      setError("Please select a document first.");
      return;
    }

    setError("");
    setIsConverting(true);

    try {
      const originalName = file.name.replace(/\.[^/.]+$/, "");
      const filename = `${originalName || "document"}.pdf`;

      const pdfBlob = await documentToPdf(
        previewRef.current,
        {
          pageSize,
          orientation,
          filename,
        }
      );

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");

      link.href = url;
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err?.message || "Failed to convert the document to PDF."
      );
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="document-to-pdf-tool">
      {!file && (
        <div
          className="document-upload-area"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={openFilePicker}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              openFilePicker();
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FILES}
            onChange={handleInputChange}
            hidden
          />

          <div className="document-upload-icon">
            ↑
          </div>

          <div className="document-upload-title">
            Drop your document here
          </div>

          <div className="document-upload-subtitle">
            or click to browse
          </div>

          <div className="document-upload-formats">
            DOCX · TXT · HTML · MD
          </div>
        </div>
      )}

      {isLoading && (
        <div className="document-status">
          Loading document...
        </div>
      )}

      {error && (
        <div className="document-error">
          {error}
        </div>
      )}

      {file && !isLoading && (
        <>
          <div className="document-file-bar">
            <div className="document-file-info">
              <div className="document-file-icon">
                DOC
              </div>

              <div className="document-file-details">
                <div className="document-file-name">
                  {file.name}
                </div>

                <div className="document-file-size">
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              </div>
            </div>

            <button
              type="button"
              className="document-remove-button"
              onClick={clearDocument}
            >
              Remove
            </button>
          </div>

          {warnings.length > 0 && (
            <div className="document-warning">
              Some document formatting may not be preserved exactly.
            </div>
          )}

          <div className="document-preview-container">
            <div className="document-preview-header">
              <span>Preview</span>
            </div>

            <div className="document-preview-scroll">
              <div
                ref={previewRef}
                className="document-preview-paper"
                dangerouslySetInnerHTML={{
                  __html: documentHtml,
                }}
              />
            </div>
          </div>

          <div className="document-settings">
            <div className="document-setting">
              <label htmlFor="document-page-size">
                Page Size
              </label>

              <select
                id="document-page-size"
                value={pageSize}
                onChange={(event) =>
                  setPageSize(event.target.value)
                }
              >
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
                <option value="legal">Legal</option>
              </select>
            </div>

            <div className="document-setting">
              <label htmlFor="document-orientation">
                Orientation
              </label>

              <select
                id="document-orientation"
                value={orientation}
                onChange={(event) =>
                  setOrientation(event.target.value)
                }
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            className="document-convert-button"
            onClick={handleConvert}
            disabled={isConverting || !documentHtml}
          >
            {isConverting
              ? "Converting..."
              : "Convert to PDF"}
          </button>
        </>
      )}

      <style>{`
        .document-to-pdf-tool {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
          color: #ffffff;
        }

        .document-upload-area {
          min-height: 280px;
          border: 1px dashed rgba(255, 255, 255, 0.22);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.025);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition:
            border-color 0.2s ease,
            background 0.2s ease;
        }

        .document-upload-area:hover {
          border-color: rgba(255, 120, 0, 0.65);
          background: rgba(255, 120, 0, 0.035);
        }

        .document-upload-icon {
          width: 52px;
          height: 52px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 25px;
          margin-bottom: 18px;
          color: #ff7a00;
        }

        .document-upload-title {
          font-size: 17px;
          font-weight: 600;
          margin-bottom: 7px;
        }

        .document-upload-subtitle {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.52);
        }

        .document-upload-formats {
          margin-top: 15px;
          font-size: 11px;
          letter-spacing: 0.08em;
          color: rgba(255, 255, 255, 0.35);
        }

        .document-status {
          padding: 14px 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.65);
          font-size: 13px;
          text-align: center;
          background: rgba(255, 255, 255, 0.025);
        }

        .document-error {
          padding: 13px 15px;
          border: 1px solid rgba(255, 70, 70, 0.35);
          border-radius: 10px;
          background: rgba(255, 50, 50, 0.06);
          color: #ff8c8c;
          font-size: 13px;
        }

        .document-warning {
          padding: 12px 14px;
          border: 1px solid rgba(255, 170, 0, 0.25);
          border-radius: 10px;
          background: rgba(255, 170, 0, 0.05);
          color: rgba(255, 210, 130, 0.9);
          font-size: 12px;
        }

        .document-file-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.025);
        }

        .document-file-info {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .document-file-icon {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          border-radius: 9px;
          background: rgba(255, 90, 0, 0.1);
          border: 1px solid rgba(255, 100, 0, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ff7a00;
          font-size: 9px;
          font-weight: 700;
        }

        .document-file-details {
          min-width: 0;
        }

        .document-file-name {
          font-size: 13px;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .document-file-size {
          margin-top: 3px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
        }

        .document-remove-button {
          flex-shrink: 0;
          padding: 8px 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          background: transparent;
          color: rgba(255, 255, 255, 0.55);
          font-size: 11px;
          cursor: pointer;
        }

        .document-remove-button:hover {
          border-color: rgba(255, 90, 90, 0.4);
          color: #ff8c8c;
        }

        .document-preview-container {
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.2);
        }

        .document-preview-header {
          padding: 11px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(255, 255, 255, 0.42);
        }

        .document-preview-scroll {
          max-height: 600px;
          overflow: auto;
          padding: 24px;
        }

        .document-preview-paper {
          width: 100%;
          max-width: 794px;
          min-height: 1123px;
          margin: 0 auto;
          padding: 60px;
          box-sizing: border-box;
          background: #ffffff;
          color: #111111;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
          font-family: Arial, Helvetica, sans-serif;
          font-size: 14px;
          line-height: 1.6;
          overflow-wrap: break-word;
        }

        .document-preview-paper h1 {
          font-size: 28px;
          line-height: 1.25;
          margin: 0 0 18px;
        }

        .document-preview-paper h2 {
          font-size: 22px;
          line-height: 1.3;
          margin: 22px 0 12px;
        }

        .document-preview-paper h3 {
          font-size: 18px;
          line-height: 1.35;
          margin: 18px 0 10px;
        }

        .document-preview-paper p {
          margin: 0 0 12px;
        }

        .document-preview-paper img {
          max-width: 100%;
          height: auto;
        }

        .document-preview-paper table {
          width: 100%;
          border-collapse: collapse;
          margin: 18px 0;
        }

        .document-preview-paper th,
        .document-preview-paper td {
          border: 1px solid #cccccc;
          padding: 7px 9px;
          text-align: left;
        }

        .document-preview-paper blockquote {
          margin: 18px 0;
          padding: 10px 16px;
          border-left: 4px solid #999999;
          background: #f5f5f5;
        }

        .document-settings {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .document-setting {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .document-setting label {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.48);
        }

        .document-setting select {
          width: 100%;
          padding: 11px 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.04);
          color: #ffffff;
          outline: none;
          font-size: 12px;
        }

        .document-setting select:focus {
          border-color: rgba(255, 120, 0, 0.55);
        }

        .document-setting option {
          background: #161616;
          color: #ffffff;
        }

        .document-convert-button {
          width: 100%;
          padding: 13px 18px;
          border: 1px solid rgba(255, 120, 0, 0.55);
          border-radius: 10px;
          background: rgba(255, 100, 0, 0.12);
          color: #ff9a4d;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition:
            background 0.2s ease,
            border-color 0.2s ease;
        }

        .document-convert-button:hover:not(:disabled) {
          background: rgba(255, 100, 0, 0.2);
          border-color: rgba(255, 130, 0, 0.8);
        }

        .document-convert-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        @media (max-width: 700px) {
          .document-preview-scroll {
            padding: 12px;
          }

          .document-preview-paper {
            padding: 35px 25px;
            min-height: 800px;
          }

          .document-settings {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default DocumentToPdf;