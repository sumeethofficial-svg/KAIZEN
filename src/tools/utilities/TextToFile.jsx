import React, { useState } from "react";
import { createTextFile } from "../../services/utilities/textToFile.js";

function TextToFile() {
  const [text, setText] = useState("");
  const [filename, setFilename] =
    useState("kaizen-file");
  const [fileType, setFileType] =
    useState("txt");
  const [isCreating, setIsCreating] =
    useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] =
    useState("");

  const fileTypes = {
    txt: {
      extension: "txt",
      mimeType:
        "text/plain;charset=utf-8",
    },
    md: {
      extension: "md",
      mimeType:
        "text/markdown;charset=utf-8",
    },
    html: {
      extension: "html",
      mimeType:
        "text/html;charset=utf-8",
    },
    css: {
      extension: "css",
      mimeType:
        "text/css;charset=utf-8",
    },
    js: {
      extension: "js",
      mimeType:
        "text/javascript;charset=utf-8",
    },
    json: {
      extension: "json",
      mimeType:
        "application/json;charset=utf-8",
    },
    csv: {
      extension: "csv",
      mimeType:
        "text/csv;charset=utf-8",
    },
    xml: {
      extension: "xml",
      mimeType:
        "application/xml;charset=utf-8",
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
      const selectedType =
        fileTypes[fileType];

      const cleanFilename =
        filename.trim() ||
        "kaizen-file";

      const finalFilename =
        cleanFilename
          .toLowerCase()
          .endsWith(
            `.${selectedType.extension}`
          )
          ? cleanFilename
          : `${cleanFilename}.${selectedType.extension}`;

      const result =
        createTextFile(text, {
          filename: finalFilename,
          mimeType:
            selectedType.mimeType,
        });

      const url =
        URL.createObjectURL(
          result.blob
        );

      const link =
        document.createElement("a");

      link.href = url;
      link.download = result.filename;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      link.remove();

      setSuccess(
        `${result.filename} created successfully.`
      );

      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (err) {
      console.error(
        "Text to File error:",
        err
      );

      setError(
        err?.message ||
          "Failed to create the file."
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
    ? text.split(/\r\n|\r|\n/)
        .length
    : 0;

  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "20px 24px 30px",
        color: "rgba(255,255,255,.94)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(0, 1.65fr) minmax(260px, .75fr)",
          gap: "14px",
          alignItems: "start",
        }}
      >
        <div
          style={{
            border:
              "1px solid rgba(255,255,255,.08)",
            borderRadius: "16px",
            padding: "15px",
            background:
              "rgba(255,255,255,.022)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent:
                "space-between",
              gap: "10px",
              marginBottom: "9px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing:
                  ".13em",
                color:
                  "rgba(255,153,82,.72)",
              }}
            >
              TEXT CONTENT
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                fontSize: "10px",
                color:
                  "rgba(255,255,255,.25)",
              }}
            >
              <span>
                {characterCount.toLocaleString()}{" "}
                chars
              </span>

              <span>·</span>

              <span>
                {lineCount.toLocaleString()}{" "}
                lines
              </span>
            </div>
          </div>

          <textarea
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setError("");
              setSuccess("");
            }}
            placeholder="Enter or paste your text here..."
            style={{
              width: "100%",
              minHeight: "255px",
              boxSizing: "border-box",
              resize: "vertical",
              padding: "13px",
              border:
                "1px solid rgba(255,255,255,.08)",
              borderRadius: "11px",
              outline: "none",
              background:
                "rgba(0,0,0,.12)",
              color: "#fff",
              fontFamily:
                "Consolas, 'Courier New', monospace",
              fontSize: "12px",
              lineHeight: 1.6,
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div
            style={{
              border:
                "1px solid rgba(255,255,255,.08)",
              borderRadius: "16px",
              padding: "15px",
              background:
                "rgba(255,255,255,.022)",
            }}
          >
            <div
              style={{
                marginBottom: "12px",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing:
                  ".13em",
                color:
                  "rgba(255,153,82,.72)",
              }}
            >
              FILE SETTINGS
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <label
                style={{
                  display: "flex",
                  flexDirection:
                    "column",
                  gap: "6px",
                  fontSize: "10px",
                  color:
                    "rgba(255,255,255,.42)",
                }}
              >
                File name

                <input
                  value={filename}
                  onChange={(event) => {
                    setFilename(
                      event.target.value
                    );
                    setError("");
                    setSuccess("");
                  }}
                  placeholder="kaizen-file"
                  style={{
                    width: "100%",
                    height: "40px",
                    boxSizing: "border-box",
                    padding:
                      "0 11px",
                    border:
                      "1px solid rgba(255,255,255,.08)",
                    borderRadius:
                      "9px",
                    outline: "none",
                    background:
                      "rgba(255,255,255,.035)",
                    color: "#fff",
                    font:
                      "inherit",
                    fontSize:
                      "11px",
                  }}
                />
              </label>

              <label
                style={{
                  display: "flex",
                  flexDirection:
                    "column",
                  gap: "6px",
                  fontSize: "10px",
                  color:
                    "rgba(255,255,255,.42)",
                }}
              >
                File type

                <select
                  value={fileType}
                  onChange={(event) => {
                    setFileType(
                      event.target.value
                    );
                    setError("");
                    setSuccess("");
                  }}
                  style={{
                    width: "100%",
                    height: "40px",
                    boxSizing: "border-box",
                    padding:
                      "0 11px",
                    border:
                      "1px solid rgba(255,255,255,.08)",
                    borderRadius:
                      "9px",
                    outline: "none",
                    background:
                      "#17120f",
                    color: "#fff",
                    font:
                      "inherit",
                    fontSize:
                      "11px",
                    cursor:
                      "pointer",
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
              </label>
            </div>
          </div>

          <div
            style={{
              padding: "12px 13px",
              border:
                "1px solid rgba(255,255,255,.07)",
              borderRadius: "12px",
              background:
                "rgba(255,255,255,.018)",
              color:
                "rgba(255,255,255,.36)",
              fontSize: "10px",
              lineHeight: 1.5,
            }}
          >
            Create a local file from your
            text and download it directly to
            your device.
          </div>

          {error && (
            <div
              style={{
                padding:
                  "10px 12px",
                border:
                  "1px solid rgba(255,70,70,.22)",
                borderRadius:
                  "9px",
                background:
                  "rgba(255,50,50,.06)",
                color:
                  "#ff9c9c",
                fontSize:
                  "11px",
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                padding:
                  "10px 12px",
                border:
                  "1px solid rgba(100,200,100,.18)",
                borderRadius:
                  "9px",
                background:
                  "rgba(100,200,100,.045)",
                color:
                  "#a8e5a8",
                fontSize:
                  "11px",
              }}
            >
              {success}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: "8px",
            }}
          >
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isCreating}
              style={{
                flex: 1,
                minHeight: "42px",
                border:
                  "1px solid rgba(255,106,0,.35)",
                borderRadius:
                  "10px",
                background:
                  "linear-gradient(135deg, rgba(255,118,0,.18), rgba(255,77,0,.1))",
                color:
                  "#ff9a4d",
                font: "inherit",
                fontSize:
                  "11px",
                fontWeight:
                  700,
                cursor:
                  isCreating
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  isCreating
                    ? 0.55
                    : 1,
              }}
            >
              {isCreating
                ? "Creating..."
                : "Create & Download"}
            </button>

            {text && (
              <button
                type="button"
                onClick={handleClear}
                style={{
                  minHeight:
                    "42px",
                  padding:
                    "0 14px",
                  border:
                    "1px solid rgba(255,255,255,.08)",
                  borderRadius:
                    "10px",
                  background:
                    "rgba(255,255,255,.04)",
                  color:
                    "rgba(255,255,255,.62)",
                  font:
                    "inherit",
                  fontSize:
                    "11px",
                  fontWeight:
                    600,
                  cursor:
                    "pointer",
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        textarea:focus,
        input:focus,
        select:focus {
          border-color: rgba(255,106,0,.45) !important;
          background: rgba(255,255,255,.04) !important;
        }

        @media (max-width: 720px) {
          .text-file-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default TextToFile;