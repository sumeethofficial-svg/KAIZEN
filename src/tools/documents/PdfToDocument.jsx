import React, { useRef, useState } from "react";
import {
  extractPdfText,
  pdfToDocx,
  pdfToTxt,
} from "../../services/documents/pdfToDocument.js";

function PdfToDocument() {
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [format, setFormat] = useState("docx");
  const [isLoading, setIsLoading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (selectedFile) => {
    if (!selectedFile) return;

    setError("");
    setText("");
    setPageCount(0);
    setFile(null);
    setIsLoading(true);

    try {
      const result = await extractPdfText(selectedFile);

      setFile(selectedFile);
      setText(result.text);
      setPageCount(result.pageCount);
    } catch (err) {
      setError(
        err?.message || "Unable to read this PDF."
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

  const handleConvert = async () => {
    if (!file) {
      setError("Please select a PDF first.");
      return;
    }

    setError("");
    setIsConverting(true);

    try {
      const baseName = file.name.replace(/\.[^/.]+$/, "");

      let result;

      if (format === "docx") {
        result = await pdfToDocx(file, {
          filename: `${baseName}.docx`,
        });
      } else {
        result = await pdfToTxt(file, {
          filename: `${baseName}.txt`,
        });
      }

      const url = URL.createObjectURL(result.blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = result.filename;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err?.message || "Failed to convert the PDF."
      );
    } finally {
      setIsConverting(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setText("");
    setPageCount(0);
    setError("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="pdf-to-document-tool">
      {!file && !isLoading && (
        <div
          className="pdf-document-dropzone"
          onDrop={handleDrop}
          onDragOver={(event) => event.preventDefault()}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleInputChange}
            hidden
          />

          <div className="pdf-document-icon">PDF</div>

          <div className="pdf-document-title">
            Drop your PDF here
          </div>

          <div className="pdf-document-subtitle">
            or click to browse
          </div>

          <div className="pdf-document-format">
            PDF files only
          </div>
        </div>
      )}

      {isLoading && (
        <div className="pdf-document-status">
          Reading PDF...
        </div>
      )}

      {error && (
        <div className="pdf-document-error">
          {error}
        </div>
      )}

      {file && !isLoading && (
        <>
          <div className="pdf-document-file">
            <div>
              <div className="pdf-document-name">
                {file.name}
              </div>

              <div className="pdf-document-meta">
                {pageCount} {pageCount === 1 ? "page" : "pages"}
                {" · "}
                {(file.size / 1024).toFixed(1)} KB
              </div>
            </div>

            <button
              type="button"
              onClick={clearFile}
              className="pdf-document-remove"
            >
              Remove
            </button>
          </div>

          <div className="pdf-document-preview">
            <div className="pdf-document-preview-header">
              Extracted Text
            </div>

            <div className="pdf-document-text">
              {text || "No selectable text was found in this PDF."}
            </div>
          </div>

          <div className="pdf-document-settings">
            <label>
              Output format
              <select
                value={format}
                onChange={(event) =>
                  setFormat(event.target.value)
                }
              >
                <option value="docx">DOCX</option>
                <option value="txt">TXT</option>
              </select>
            </label>
          </div>

          <button
            type="button"
            className="pdf-document-convert"
            onClick={handleConvert}
            disabled={isConverting}
          >
            {isConverting
              ? "Converting..."
              : `Convert to ${format.toUpperCase()}`}
          </button>
        </>
      )}

      <style>{`
        .pdf-to-document-tool {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          color: #fff;
        }

        .pdf-document-dropzone {
          min-height: 280px;
          border: 1px dashed rgba(255,255,255,.22);
          border-radius: 16px;
          background: rgba(255,255,255,.025);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .pdf-document-dropzone:hover {
          border-color: rgba(255,120,0,.65);
          background: rgba(255,120,0,.035);
        }

        .pdf-document-icon {
          padding: 10px 13px;
          border: 1px solid rgba(255,100,0,.3);
          border-radius: 9px;
          color: #ff8a3d;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 16px;
        }

        .pdf-document-title {
          font-size: 17px;
          font-weight: 600;
        }

        .pdf-document-subtitle {
          margin-top: 7px;
          color: rgba(255,255,255,.5);
          font-size: 13px;
        }

        .pdf-document-format {
          margin-top: 14px;
          color: rgba(255,255,255,.3);
          font-size: 11px;
        }

        .pdf-document-status,
        .pdf-document-error {
          padding: 14px;
          border-radius: 10px;
          font-size: 13px;
        }

        .pdf-document-status {
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.6);
          text-align: center;
        }

        .pdf-document-error {
          border: 1px solid rgba(255,70,70,.3);
          background: rgba(255,50,50,.06);
          color: #ff9292;
        }

        .pdf-document-file {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 13px 15px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 12px;
          background: rgba(255,255,255,.025);
        }

        .pdf-document-name {
          font-size: 13px;
          font-weight: 600;
        }

        .pdf-document-meta {
          margin-top: 4px;
          color: rgba(255,255,255,.4);
          font-size: 11px;
        }

        .pdf-document-remove {
          padding: 8px 12px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 8px;
          background: transparent;
          color: rgba(255,255,255,.55);
          cursor: pointer;
        }

        .pdf-document-preview {
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 12px;
          overflow: hidden;
          background: rgba(0,0,0,.18);
        }

        .pdf-document-preview-header {
          padding: 11px 14px;
          border-bottom: 1px solid rgba(255,255,255,.08);
          color: rgba(255,255,255,.45);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        .pdf-document-text {
          max-height: 420px;
          overflow: auto;
          padding: 20px;
          color: rgba(255,255,255,.75);
          font-size: 13px;
          line-height: 1.7;
          white-space: pre-wrap;
        }

        .pdf-document-settings label {
          display: flex;
          flex-direction: column;
          gap: 7px;
          color: rgba(255,255,255,.5);
          font-size: 11px;
        }

        .pdf-document-settings select {
          padding: 11px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 9px;
          background: rgba(255,255,255,.04);
          color: #fff;
        }

        .pdf-document-settings option {
          background: #161616;
        }

        .pdf-document-convert {
          padding: 13px;
          border: 1px solid rgba(255,120,0,.55);
          border-radius: 10px;
          background: rgba(255,100,0,.12);
          color: #ff9a4d;
          font-weight: 600;
          cursor: pointer;
        }

        .pdf-document-convert:disabled {
          opacity: .45;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

export default PdfToDocument;