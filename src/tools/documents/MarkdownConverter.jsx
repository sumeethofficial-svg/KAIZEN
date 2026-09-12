import React, { useRef, useState } from "react";
import {
  markdownToHtml,
  markdownToPdf,
  markdownToText,
} from "../../services/documents/markdownConverter.js";

function MarkdownConverter() {
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [markdown, setMarkdown] = useState("");
  const [html, setHtml] = useState("");
  const [format, setFormat] = useState("pdf");
  const [isLoading, setIsLoading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (selectedFile) => {
    if (!selectedFile) return;

    const name = selectedFile.name.toLowerCase();

    if (!name.endsWith(".md")) {
      setError("Please select a Markdown (.md) file.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const result = await markdownToHtml(selectedFile);

      setFile(selectedFile);
      setMarkdown(result.markdown);
      setHtml(result.html);
    } catch (err) {
      setError(
        err?.message || "Unable to read the Markdown file."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!file) {
      setError("Please select a Markdown file first.");
      return;
    }

    setError("");
    setIsConverting(true);

    try {
      const baseName = file.name.replace(/\.[^/.]+$/, "");

      if (format === "pdf") {
        const blob = await markdownToPdf(file, {
          filename: `${baseName}.pdf`,
        });

        downloadBlob(blob, `${baseName}.pdf`);
      }

      if (format === "html") {
        const blob = new Blob(
          [
            `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${baseName}</title>
</head>
<body>
${html}
</body>
</html>`,
          ],
          {
            type: "text/html;charset=utf-8",
          }
        );

        downloadBlob(blob, `${baseName}.html`);
      }

      if (format === "md") {
        const text = await markdownToText(file);

        const blob = new Blob([text], {
          type: "text/markdown;charset=utf-8",
        });

        downloadBlob(blob, `${baseName}.md`);
      }
    } catch (err) {
      setError(
        err?.message || "Failed to convert Markdown."
      );
    } finally {
      setIsConverting(false);
    }
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  const clearFile = () => {
    setFile(null);
    setMarkdown("");
    setHtml("");
    setError("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="markdown-converter-tool">
      {!file && !isLoading && (
        <div
          className="markdown-dropzone"
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
            accept=".md,text/markdown"
            hidden
            onChange={(event) =>
              handleFile(event.target.files?.[0])
            }
          />

          <div className="markdown-icon">M↓</div>

          <div className="markdown-title">
            Drop your Markdown file here
          </div>

          <div className="markdown-subtitle">
            or click to browse
          </div>

          <div className="markdown-format">
            Markdown (.md)
          </div>
        </div>
      )}

      {isLoading && (
        <div className="markdown-status">
          Reading Markdown...
        </div>
      )}

      {error && (
        <div className="markdown-error">
          {error}
        </div>
      )}

      {file && !isLoading && (
        <>
          <div className="markdown-file">
            <div>
              <div className="markdown-file-name">
                {file.name}
              </div>

              <div className="markdown-file-meta">
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

          <div className="markdown-preview">
            <div className="markdown-preview-header">
              Preview
            </div>

            <div
              className="markdown-paper"
              dangerouslySetInnerHTML={{
                __html: html,
              }}
            />
          </div>

          <div className="markdown-settings">
            <label>
              Output format

              <select
                value={format}
                onChange={(event) =>
                  setFormat(event.target.value)
                }
              >
                <option value="pdf">PDF</option>
                <option value="html">HTML</option>
                <option value="md">Markdown</option>
              </select>
            </label>
          </div>

          <button
            className="markdown-convert"
            onClick={handleConvert}
            disabled={isConverting}
          >
            {isConverting
              ? "Converting..."
              : `Export ${format.toUpperCase()}`}
          </button>
        </>
      )}

      <style>{`
        .markdown-converter-tool {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          color: #fff;
        }

        .markdown-dropzone {
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

        .markdown-dropzone:hover {
          border-color: rgba(255,120,0,.65);
          background: rgba(255,120,0,.035);
        }

        .markdown-icon {
          padding: 10px 13px;
          border: 1px solid rgba(255,120,0,.3);
          border-radius: 9px;
          color: #ff8a3d;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 16px;
        }

        .markdown-title {
          font-size: 17px;
          font-weight: 600;
        }

        .markdown-subtitle {
          margin-top: 7px;
          color: rgba(255,255,255,.5);
          font-size: 13px;
        }

        .markdown-format {
          margin-top: 14px;
          color: rgba(255,255,255,.3);
          font-size: 11px;
        }

        .markdown-status {
          padding: 14px;
          border-radius: 10px;
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.6);
          text-align: center;
          font-size: 13px;
        }

        .markdown-error {
          padding: 13px;
          border: 1px solid rgba(255,70,70,.3);
          border-radius: 10px;
          background: rgba(255,50,50,.06);
          color: #ff9292;
          font-size: 13px;
        }

        .markdown-file {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 13px 15px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 12px;
          background: rgba(255,255,255,.025);
        }

        .markdown-file-name {
          font-size: 13px;
          font-weight: 600;
        }

        .markdown-file-meta {
          margin-top: 4px;
          color: rgba(255,255,255,.4);
          font-size: 11px;
        }

        .markdown-file button {
          padding: 8px 12px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 8px;
          background: transparent;
          color: rgba(255,255,255,.55);
          cursor: pointer;
        }

        .markdown-preview {
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 12px;
          overflow: hidden;
          background: rgba(0,0,0,.18);
        }

        .markdown-preview-header {
          padding: 11px 14px;
          border-bottom: 1px solid rgba(255,255,255,.08);
          color: rgba(255,255,255,.45);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        .markdown-paper {
          max-height: 560px;
          overflow: auto;
          margin: 20px;
          padding: 45px;
          background: #fff;
          color: #111;
          line-height: 1.6;
          font-size: 14px;
        }

        .markdown-paper h1 {
          font-size: 30px;
          margin-top: 0;
          margin-bottom: 20px;
        }

        .markdown-paper h2 {
          font-size: 23px;
          margin-top: 25px;
        }

        .markdown-paper h3 {
          font-size: 18px;
          margin-top: 20px;
        }

        .markdown-paper p {
          margin-bottom: 14px;
        }

        .markdown-paper pre {
          padding: 14px;
          overflow: auto;
          background: #f1f1f1;
          border-radius: 6px;
        }

        .markdown-paper code {
          font-family: monospace;
        }

        .markdown-paper blockquote {
          margin-left: 0;
          padding-left: 15px;
          border-left: 4px solid #aaa;
        }

        .markdown-paper table {
          width: 100%;
          border-collapse: collapse;
        }

        .markdown-paper th,
        .markdown-paper td {
          border: 1px solid #ccc;
          padding: 7px;
        }

        .markdown-settings label {
          display: flex;
          flex-direction: column;
          gap: 7px;
          color: rgba(255,255,255,.5);
          font-size: 11px;
        }

        .markdown-settings select {
          padding: 11px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 9px;
          background: rgba(255,255,255,.04);
          color: #fff;
        }

        .markdown-settings option {
          background: #161616;
        }

        .markdown-convert {
          padding: 13px;
          border: 1px solid rgba(255,120,0,.55);
          border-radius: 10px;
          background: rgba(255,100,0,.12);
          color: #ff9a4d;
          font-weight: 600;
          cursor: pointer;
        }

        .markdown-convert:disabled {
          opacity: .45;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

export default MarkdownConverter;