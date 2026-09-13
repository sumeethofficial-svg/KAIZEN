import React, { useState } from "react";
import { createTextFile } from "../../services/utilities/textToFile.js";

function TextToFile() {
  const [text, setText] = useState("");
  const [filename, setFilename] = useState("kaizen-file");
  const [fileType, setFileType] = useState("txt");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fileTypes = {
    txt: {
      extension: "txt",
      mimeType: "text/plain;charset=utf-8",
    },
    md: {
      extension: "md",
      mimeType: "text/markdown;charset=utf-8",
    },
    html: {
      extension: "html",
      mimeType: "text/html;charset=utf-8",
    },
    css: {
      extension: "css",
      mimeType: "text/css;charset=utf-8",
    },
    js: {
      extension: "js",
      mimeType: "text/javascript;charset=utf-8",
    },
    json: {
      extension: "json",
      mimeType: "application/json;charset=utf-8",
    },
    csv: {
      extension: "csv",
      mimeType: "text/csv;charset=utf-8",
    },
    xml: {
      extension: "xml",
      mimeType: "application/xml;charset=utf-8",
    },
  };

  const handleGenerate = () => {
    if (!text.trim()) {
      setError("Please enter some text.");
      setSuccess("");
      return;
    }

    setError("");
    setSuccess("");
    setIsCreating(true);

    try {
      const selectedType = fileTypes[fileType];

      const cleanFilename =
        filename.trim() || "kaizen-file";

      const finalFilename =
        cleanFilename.toLowerCase().endsWith(
          `.${selectedType.extension}`
        )
          ? cleanFilename
          : `${cleanFilename}.${selectedType.extension}`;

      const result = createTextFile(text, {
        filename: finalFilename,
        mimeType: selectedType.mimeType,
      });

      const url = URL.createObjectURL(result.blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = result.filename;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess(
        `${result.filename} created successfully.`
      );

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (err) {
      console.error("Text to File error:", err);

      setError(
        err?.message || "Failed to create the file."
      );
      setSuccess("");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClear = () => {
    setText("");
    setFilename("kaizen-file");
    setFileType("txt");
    setError("");
    setSuccess("");
  };

  const characterCount = text.length;
  const lineCount = text
    ? text.split(/\r\n|\r|\n/).length
    : 0;

  return (
    <div className="text-to-file-tool">
      <div className="text-input-section">
        <label className="text-file-label">
          Text content
        </label>

        <textarea
          className="text-file-textarea"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setError("");
            setSuccess("");
          }}
          placeholder="Enter or paste your text here..."
        />

        <div className="text-file-stats">
          <span>
            {characterCount.toLocaleString()} characters
          </span>

          <span>
            {lineCount.toLocaleString()} lines
          </span>
        </div>
      </div>

      <div className="text-file-settings">
        <div className="text-file-field">
          <label>
            File name
          </label>

          <input
            type="text"
            value={filename}
            onChange={(event) => {
              setFilename(event.target.value);
              setError("");
              setSuccess("");
            }}
            placeholder="kaizen-file"
          />
        </div>

        <div className="text-file-field">
          <label>
            File type
          </label>

          <select
            value={fileType}
            onChange={(event) => {
              setFileType(event.target.value);
              setError("");
              setSuccess("");
            }}
          >
            <option value="txt">
              TXT — Plain Text
            </option>

            <option value="md">
              MD — Markdown
            </option>

            <option value="html">
              HTML
            </option>

            <option value="css">
              CSS
            </option>

            <option value="js">
              JS — JavaScript
            </option>

            <option value="json">
              JSON
            </option>

            <option value="csv">
              CSV
            </option>

            <option value="xml">
              XML
            </option>
          </select>
        </div>
      </div>

      {error && (
        <div className="text-file-error">
          {error}
        </div>
      )}

      {success && (
        <div className="text-file-success">
          {success}
        </div>
      )}

      <div className="text-file-actions">
        <button
          type="button"
          className="text-file-create-button"
          onClick={handleGenerate}
          disabled={isCreating}
        >
          {isCreating
            ? "Creating File..."
            : "Create & Download"}
        </button>

        {text && (
          <button
            type="button"
            className="text-file-clear-button"
            onClick={handleClear}
          >
            Clear
          </button>
        )}
      </div>

      <style>{`
        .text-to-file-tool {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          color: #fff;
        }

        .text-input-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .text-file-label {
          color: rgba(255,255,255,.5);
          font-size: 11px;
        }

        .text-file-textarea {
          width: 100%;
          min-height: 280px;
          box-sizing: border-box;
          resize: vertical;
          padding: 14px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 12px;
          outline: none;
          background: rgba(255,255,255,.035);
          color: #fff;
          font-family: "Consolas", "Courier New", monospace;
          font-size: 12px;
          line-height: 1.6;
        }

        .text-file-textarea::placeholder {
          color: rgba(255,255,255,.25);
        }

        .text-file-textarea:focus {
          border-color: rgba(255,120,0,.55);
          background: rgba(255,255,255,.045);
        }

        .text-file-stats {
          display: flex;
          justify-content: space-between;
          color: rgba(255,255,255,.3);
          font-size: 10px;
        }

        .text-file-settings {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .text-file-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .text-file-field label {
          color: rgba(255,255,255,.45);
          font-size: 11px;
        }

        .text-file-field input,
        .text-file-field select {
          width: 100%;
          box-sizing: border-box;
          padding: 11px 12px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 9px;
          outline: none;
          background: rgba(255,255,255,.04);
          color: #fff;
          font-size: 12px;
        }

        .text-file-field input:focus,
        .text-file-field select:focus {
          border-color: rgba(255,120,0,.5);
        }

        .text-file-field select {
          cursor: pointer;
        }

        .text-file-field select option {
          background: #161616;
          color: #fff;
        }

        .text-file-error,
        .text-file-success {
          padding: 13px 15px;
          border-radius: 10px;
          font-size: 13px;
        }

        .text-file-error {
          border: 1px solid rgba(255,70,70,.3);
          background: rgba(255,50,50,.06);
          color: #ff9292;
        }

        .text-file-success {
          border: 1px solid rgba(100,200,100,.25);
          background: rgba(100,200,100,.05);
          color: #9be39b;
        }

        .text-file-actions {
          display: flex;
          gap: 10px;
        }

        .text-file-create-button {
          flex: 1;
          padding: 13px;
          border: 1px solid rgba(255,120,0,.55);
          border-radius: 10px;
          background: rgba(255,100,0,.12);
          color: #ff9a4d;
          font-weight: 600;
          cursor: pointer;
          transition:
            background .2s ease,
            border-color .2s ease;
        }

        .text-file-create-button:hover:not(:disabled) {
          background: rgba(255,100,0,.18);
          border-color: rgba(255,120,0,.75);
        }

        .text-file-create-button:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .text-file-clear-button {
          padding: 13px 22px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 10px;
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.65);
          cursor: pointer;
        }

        .text-file-clear-button:hover {
          background: rgba(255,255,255,.07);
          color: #fff;
        }

        @media (max-width: 600px) {
          .text-file-settings {
            grid-template-columns: 1fr;
          }

          .text-file-actions {
            flex-direction: column;
          }

          .text-file-clear-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default TextToFile;