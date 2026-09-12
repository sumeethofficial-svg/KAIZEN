import React, { useRef, useState } from "react";
import { textToPdf } from "../../services/documents/textToPdf.js";

function TextToPdf() {
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [pageSize, setPageSize] = useState("a4");
  const [orientation, setOrientation] = useState("portrait");
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith(".txt")) {
      setError("Please select a TXT file.");
      return;
    }

    setError("");
    setFile(selectedFile);

    try {
      setText(await selectedFile.text());
    } catch {
      setError("Unable to read the text file.");
    }
  };

  const handleConvert = async () => {
    if (!file) {
      setError("Please select a text file first.");
      return;
    }

    setError("");
    setIsConverting(true);

    try {
      const baseName = file.name.replace(/\.[^/.]+$/, "");

      const blob = await textToPdf(file, {
        pageSize,
        orientation,
        filename: `${baseName}.pdf`,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${baseName}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err?.message || "Failed to create the PDF."
      );
    } finally {
      setIsConverting(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setText("");
    setError("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="text-to-pdf-tool">
      {!file && (
        <div
          className="text-pdf-dropzone"
          onClick={() => inputRef.current?.click()}
          onDrop={(event) => {
            event.preventDefault();
            handleFile(event.dataTransfer.files?.[0]);
          }}
          onDragOver={(event) => event.preventDefault()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".txt,text/plain"
            hidden
            onChange={(event) =>
              handleFile(event.target.files?.[0])
            }
          />

          <div className="text-pdf-icon">TXT</div>

          <div className="text-pdf-title">
            Drop your text file here
          </div>

          <div className="text-pdf-subtitle">
            or click to browse
          </div>
        </div>
      )}

      {error && (
        <div className="text-pdf-error">
          {error}
        </div>
      )}

      {file && (
        <>
          <div className="text-pdf-file">
            <div>
              <div className="text-pdf-name">
                {file.name}
              </div>

              <div className="text-pdf-meta">
                {(file.size / 1024).toFixed(1)} KB
              </div>
            </div>

            <button
              type="button"
              onClick={clearFile}
            >
              Remove
            </button>
          </div>

          <div className="text-pdf-preview">
            <div className="text-pdf-preview-title">
              Preview
            </div>

            <div className="text-pdf-paper">
              {text || "Empty text file"}
            </div>
          </div>

          <div className="text-pdf-settings">
            <label>
              Page Size
              <select
                value={pageSize}
                onChange={(event) =>
                  setPageSize(event.target.value)
                }
              >
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
                <option value="legal">Legal</option>
              </select>
            </label>

            <label>
              Orientation
              <select
                value={orientation}
                onChange={(event) =>
                  setOrientation(event.target.value)
                }
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </label>
          </div>

          <button
            className="text-pdf-convert"
            onClick={handleConvert}
            disabled={isConverting}
          >
            {isConverting
              ? "Creating PDF..."
              : "Convert to PDF"}
          </button>
        </>
      )}

      <style>{`
        .text-to-pdf-tool {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          color: #fff;
        }

        .text-pdf-dropzone {
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

        .text-pdf-dropzone:hover {
          border-color: rgba(255,120,0,.65);
        }

        .text-pdf-icon {
          padding: 10px 13px;
          border: 1px solid rgba(255,120,0,.3);
          border-radius: 9px;
          color: #ff8a3d;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 16px;
        }

        .text-pdf-title {
          font-size: 17px;
          font-weight: 600;
        }

        .text-pdf-subtitle {
          margin-top: 7px;
          color: rgba(255,255,255,.5);
          font-size: 13px;
        }

        .text-pdf-error {
          padding: 13px;
          border: 1px solid rgba(255,70,70,.3);
          border-radius: 10px;
          color: #ff9292;
          background: rgba(255,50,50,.06);
          font-size: 13px;
        }

        .text-pdf-file {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 13px 15px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 12px;
          background: rgba(255,255,255,.025);
        }

        .text-pdf-name {
          font-size: 13px;
          font-weight: 600;
        }

        .text-pdf-meta {
          margin-top: 4px;
          color: rgba(255,255,255,.4);
          font-size: 11px;
        }

        .text-pdf-file button {
          padding: 8px 12px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 8px;
          background: transparent;
          color: rgba(255,255,255,.55);
          cursor: pointer;
        }

        .text-pdf-preview {
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 12px;
          overflow: hidden;
        }

        .text-pdf-preview-title {
          padding: 11px 14px;
          border-bottom: 1px solid rgba(255,255,255,.08);
          color: rgba(255,255,255,.45);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        .text-pdf-paper {
          max-height: 430px;
          overflow: auto;
          margin: 20px;
          padding: 40px;
          background: #fff;
          color: #111;
          white-space: pre-wrap;
          line-height: 1.6;
          font-size: 14px;
        }

        .text-pdf-settings {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .text-pdf-settings label {
          display: flex;
          flex-direction: column;
          gap: 7px;
          color: rgba(255,255,255,.5);
          font-size: 11px;
        }

        .text-pdf-settings select {
          padding: 11px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 9px;
          background: rgba(255,255,255,.04);
          color: #fff;
        }

        .text-pdf-settings option {
          background: #161616;
        }

        .text-pdf-convert {
          padding: 13px;
          border: 1px solid rgba(255,120,0,.55);
          border-radius: 10px;
          background: rgba(255,100,0,.12);
          color: #ff9a4d;
          font-weight: 600;
          cursor: pointer;
        }

        .text-pdf-convert:disabled {
          opacity: .45;
        }

        @media (max-width: 650px) {
          .text-pdf-settings {
            grid-template-columns: 1fr;
          }

          .text-pdf-paper {
            padding: 25px;
          }
        }
      `}</style>
    </div>
  );
}

export default TextToPdf;