import React, { useRef, useState } from "react";
import {
  extractDocumentText,
} from "../../services/documents/extractDocumentText.js";

function ExtractDocumentText() {
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleFile = async (selectedFile) => {
    if (!selectedFile) return;

    setError("");
    setCopied(false);
    setText("");
    setFile(null);
    setIsExtracting(true);

    try {
      const extractedText =
        await extractDocumentText(selectedFile);

      setFile(selectedFile);
      setText(extractedText || "");
    } catch (err) {
      setError(
        err?.message ||
          "Unable to extract text from this document."
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCopy = async () => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setError("Unable to copy text to clipboard.");
    }
  };

  const downloadText = () => {
    if (!text) return;

    const blob = new Blob([text], {
      type: "text/plain;charset=utf-8",
    });

    const baseName =
      file?.name?.replace(/\.[^/.]+$/, "") ||
      "extracted-text";

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${baseName}.txt`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  const clearFile = () => {
    setFile(null);
    setText("");
    setError("");
    setCopied(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="extract-document-text-tool">
      {!file && !isExtracting && (
        <div
          className="extract-dropzone"
          onClick={() => inputRef.current?.click()}
          onDrop={(event) => {
            event.preventDefault();

            handleFile(
              event.dataTransfer.files?.[0]
            );
          }}
          onDragOver={(event) =>
            event.preventDefault()
          }
        >
          <input
            ref={inputRef}
            type="file"
            accept=".txt,.md,.html,.htm,.docx,.pdf"
            hidden
            onChange={(event) =>
              handleFile(
                event.target.files?.[0]
              )
            }
          />

          <div className="extract-icon">T</div>

          <div className="extract-title">
            Drop your document here
          </div>

          <div className="extract-subtitle">
            or click to browse
          </div>

          <div className="extract-formats">
            PDF · DOCX · TXT · MD · HTML
          </div>
        </div>
      )}

      {isExtracting && (
        <div className="extract-status">
          Extracting text...
        </div>
      )}

      {error && (
        <div className="extract-error">
          {error}
        </div>
      )}

      {file && !isExtracting && (
        <>
          <div className="extract-file-bar">
            <div>
              <div className="extract-file-name">
                {file.name}
              </div>

              <div className="extract-file-meta">
                {(file.size / 1024).toFixed(1)} KB
              </div>
            </div>

            <button
              type="button"
              onClick={clearFile}
              className="extract-remove"
            >
              Remove
            </button>
          </div>

          <div className="extract-result">
            <div className="extract-result-header">
              <span>Extracted Text</span>

              <span>
                {text.length.toLocaleString()} characters
              </span>
            </div>

            <textarea
              value={text}
              onChange={(event) =>
                setText(event.target.value)
              }
              placeholder="Extracted text will appear here..."
              spellCheck={false}
            />
          </div>

          <div className="extract-actions">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!text}
            >
              {copied ? "Copied" : "Copy Text"}
            </button>

            <button
              type="button"
              onClick={downloadText}
              disabled={!text}
            >
              Download TXT
            </button>
          </div>
        </>
      )}

      <style>{`
        .extract-document-text-tool {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          color: #fff;
        }

        .extract-dropzone {
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

        .extract-dropzone:hover {
          border-color: rgba(255,120,0,.65);
          background: rgba(255,120,0,.035);
        }

        .extract-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,120,0,.3);
          border-radius: 12px;
          color: #ff8a3d;
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 17px;
        }

        .extract-title {
          font-size: 17px;
          font-weight: 600;
        }

        .extract-subtitle {
          margin-top: 7px;
          color: rgba(255,255,255,.5);
          font-size: 13px;
        }

        .extract-formats {
          margin-top: 14px;
          color: rgba(255,255,255,.3);
          font-size: 11px;
          letter-spacing: .06em;
        }

        .extract-status {
          padding: 14px;
          border-radius: 10px;
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.6);
          text-align: center;
          font-size: 13px;
        }

        .extract-error {
          padding: 13px 15px;
          border: 1px solid rgba(255,70,70,.3);
          border-radius: 10px;
          background: rgba(255,50,50,.06);
          color: #ff9292;
          font-size: 13px;
        }

        .extract-file-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 13px 15px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 12px;
          background: rgba(255,255,255,.025);
        }

        .extract-file-name {
          font-size: 13px;
          font-weight: 600;
        }

        .extract-file-meta {
          margin-top: 4px;
          color: rgba(255,255,255,.4);
          font-size: 11px;
        }

        .extract-remove {
          padding: 8px 12px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 8px;
          background: transparent;
          color: rgba(255,255,255,.55);
          cursor: pointer;
        }

        .extract-result {
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 12px;
          background: rgba(0,0,0,.18);
        }

        .extract-result-header {
          display: flex;
          justify-content: space-between;
          padding: 11px 14px;
          border-bottom: 1px solid rgba(255,255,255,.08);
          color: rgba(255,255,255,.45);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .07em;
        }

        .extract-result textarea {
          display: block;
          width: 100%;
          min-height: 400px;
          padding: 18px;
          box-sizing: border-box;
          resize: vertical;
          border: 0;
          outline: 0;
          background: transparent;
          color: rgba(255,255,255,.8);
          font-family: inherit;
          font-size: 13px;
          line-height: 1.7;
        }

        .extract-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .extract-actions button {
          padding: 12px;
          border: 1px solid rgba(255,120,0,.4);
          border-radius: 9px;
          background: rgba(255,100,0,.08);
          color: #ff9a4d;
          cursor: pointer;
        }

        .extract-actions button:disabled {
          opacity: .4;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

export default ExtractDocumentText;