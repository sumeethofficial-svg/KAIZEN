import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  markdownToHtml,
  markdownToPdf,
} from "../../../services/conversion/markdownToPdf.js";

const DEFAULT_MARKDOWN = `# KAIZEN Markdown to PDF

## Welcome

Write your document using **Markdown** and convert it into a polished PDF.

### Features

- Headings
- **Bold text**
- *Italic text*
- ~~Strikethrough~~
- Links
- Lists
- Tables
- Blockquotes
- Code blocks
- Images

> Your Markdown is processed locally in your browser.

### Example table

| Feature | Status |
| --- | --- |
| Markdown | Ready |
| PDF | Ready |
| Privacy | Local processing |

\`\`\`javascript
const message = "Hello KAIZEN";
console.log(message);
\`\`\`
`;

function formatBytes(bytes) {
  if (!bytes) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export default function MarkdownToPdf() {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);

  const [pageSize, setPageSize] = useState("a4");
  const [orientation, setOrientation] = useState("portrait");
  const [margin, setMargin] = useState(18);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontSize, setFontSize] = useState(16);
  const [lineHeight, setLineHeight] = useState(1.6);
  const [fileName, setFileName] = useState(
    "kaizen-markdown-document.pdf"
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const previewHtml = useMemo(
    () => markdownToHtml(markdown),
    [markdown]
  );

  /*
   * Lock page scrolling while fullscreen editor is open.
   */
  useEffect(() => {
    if (!isFullscreen) {
      document.body.style.overflow = "";
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen]);

  /*
   * Escape closes fullscreen mode.
   */
  useEffect(() => {
    if (!isFullscreen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsFullscreen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

  function handleReset() {
    setMarkdown(DEFAULT_MARKDOWN);

    setPageSize("a4");
    setOrientation("portrait");
    setMargin(18);
    setFontFamily("Arial");
    setFontSize(16);
    setLineHeight(1.6);

    setFileName("kaizen-markdown-document.pdf");

    setProgress(0);
    setStatusMessage("");
    setError("");
    setResult(null);
    setIsProcessing(false);
  }

  async function handleGenerate() {
    if (!markdown.trim()) {
      setError("Enter some Markdown content first.");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setError("");
    setResult(null);
    setStatusMessage("Preparing Markdown...");

    try {
      const output = await markdownToPdf(markdown, {
        fileName,
        pageSize,
        orientation,
        margin,
        fontFamily,
        fontSize,
        lineHeight,
        onProgress: ({
          progress: nextProgress,
          message,
        }) => {
          setProgress(nextProgress);
          setStatusMessage(message);
        },
      });

      setResult(output);
      setStatusMessage("PDF generated successfully.");
      setProgress(100);
    } catch (generationError) {
      setError(
        generationError?.message ||
          "Something went wrong while generating the PDF."
      );

      setStatusMessage("");
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  }

  function updateMarkdown(value) {
    setMarkdown(value);
    setResult(null);
    setError("");
  }

  function openFullscreen() {
    setIsFullscreen(true);
  }

  function closeFullscreen() {
    setIsFullscreen(false);
  }

  /*
   * ==========================================
   * NORMAL TOOL UI
   * ==========================================
   */

  const normalEditor = (
    <section className="markdown-panel">
      <div className="panel-header">
        <div className="panel-header-left">
          <h2 className="panel-title">Markdown</h2>

          <span className="panel-meta">
            {markdown.length.toLocaleString()} characters
          </span>
        </div>

        <div className="panel-action-row">
          <button
            type="button"
            className="editor-action primary"
            onClick={openFullscreen}
            disabled={isProcessing}
            title="Open fullscreen Markdown editor"
          >
            <span className="fullscreen-icon" />
            <span>Fullscreen</span>
          </button>
        </div>
      </div>

      <textarea
        className="markdown-editor"
        value={markdown}
        onChange={(event) =>
          updateMarkdown(event.target.value)
        }
        spellCheck="false"
        placeholder="Write your Markdown here..."
      />
    </section>
  );

  /*
   * ==========================================
   * FULLSCREEN PORTAL
   * ==========================================
   *
   * This is rendered directly under <body>.
   * It therefore cannot be clipped by the
   * normal KAIZEN tool shell.
   */

  const fullscreenEditor =
    isFullscreen && typeof document !== "undefined"
      ? createPortal(
          <div className="markdown-fullscreen-overlay">
            <style>{`
              .markdown-fullscreen-overlay {
                position: fixed;
                inset: 0;
                z-index: 2147483647;
                width: 100vw;
                height: 100vh;
                min-height: 100vh;
                overflow: hidden;

                display: flex;
                flex-direction: column;

                background:
                  radial-gradient(
                    circle at 50% -10%,
                    rgba(249,115,22,.10),
                    transparent 38%
                  ),
                  linear-gradient(
                    180deg,
                    #101010 0%,
                    #090909 100%
                  );

                color: rgba(255,255,255,.94);
              }

              .markdown-fullscreen-header {
                flex: 0 0 68px;

                display: flex;
                align-items: center;
                justify-content: space-between;

                gap: 20px;

                padding:
                  0
                  clamp(18px, 4vw, 52px);

                border-bottom:
                  1px solid
                  rgba(255,255,255,.07);

                background:
                  rgba(8,8,8,.88);

                backdrop-filter: blur(22px);
              }

              .markdown-fullscreen-header-left {
                display: flex;
                align-items: center;
                gap: 14px;
                min-width: 0;
              }

              .markdown-fullscreen-brand {
                margin: 0;

                font-size: 13px;
                font-weight: 800;
                letter-spacing: .1em;
                text-transform: uppercase;

                color:
                  rgba(255,255,255,.9);

                white-space: nowrap;
              }

              .markdown-fullscreen-count {
                font-size: 12px;
                color: rgba(255,255,255,.38);
                white-space: nowrap;
              }

              .markdown-fullscreen-editor-wrap {
                flex: 1 1 auto;
                min-height: 0;
                overflow: hidden;

                display: flex;
                justify-content: center;
              }

              .markdown-fullscreen-editor {
                width: min(1100px, 100%);
                height: 100%;

                display: block;

                margin: 0;
                padding:
                  clamp(28px, 5vh, 58px)
                  clamp(22px, 5vw, 82px)
                  150px;

                border: 0;
                border-radius: 0;
                outline: none;
                resize: none;

                box-sizing: border-box;

                background:
                  linear-gradient(
                    180deg,
                    rgba(18,18,18,.86),
                    rgba(8,8,8,.98)
                  );

                color:
                  rgba(255,255,255,.95);

                caret-color:
                  #fb923c;

                font-family:
                  "SFMono-Regular",
                  "Cascadia Code",
                  "Roboto Mono",
                  Consolas,
                  "Courier New",
                  monospace;

                font-size: 16px;
                line-height: 1.8;

                overflow-y: auto;
                overflow-x: hidden;

                tab-size: 2;

                scrollbar-width: thin;
                scrollbar-color:
                  rgba(255,255,255,.18)
                  transparent;
              }

              .markdown-fullscreen-editor::-webkit-scrollbar {
                width: 9px;
              }

              .markdown-fullscreen-editor::-webkit-scrollbar-track {
                background: transparent;
              }

              .markdown-fullscreen-editor::-webkit-scrollbar-thumb {
                background:
                  rgba(255,255,255,.15);
                border-radius: 999px;
              }

              .markdown-fullscreen-editor::-webkit-scrollbar-thumb:hover {
                background:
                  rgba(255,255,255,.25);
              }

              .markdown-fullscreen-editor::selection {
                background:
                  rgba(249,115,22,.28);
              }

              .markdown-fullscreen-editor::placeholder {
                color:
                  rgba(255,255,255,.2);
              }

              .markdown-fullscreen-toolbar {
                position: absolute;

                left: 50%;
                bottom: 22px;

                transform:
                  translateX(-50%);

                z-index: 2;

                display: flex;
                align-items: center;
                gap: 8px;

                padding: 8px;

                border:
                  1px solid
                  rgba(255,255,255,.1);

                border-radius: 14px;

                background:
                  rgba(18,18,18,.88);

                backdrop-filter: blur(20px);

                box-shadow:
                  0 20px 60px
                  rgba(0,0,0,.46);
              }

              .markdown-fullscreen-hint {
                padding:
                  0
                  9px;

                color:
                  rgba(255,255,255,.34);

                font-size: 11px;

                white-space: nowrap;
              }

              .markdown-fullscreen-exit {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;

                border:
                  1px solid
                  rgba(249,115,22,.34);

                border-radius: 10px;

                padding:
                  9px
                  13px;

                cursor: pointer;

                background:
                  rgba(249,115,22,.1);

                color: #fdba74;

                font-size: 12px;
                font-weight: 700;

                transition:
                  background .18s ease,
                  transform .18s ease,
                  border-color .18s ease;
              }

              .markdown-fullscreen-exit:hover {
                background:
                  rgba(249,115,22,.16);

                border-color:
                  rgba(249,115,22,.5);

                transform:
                  translateY(-1px);
              }

              .markdown-fullscreen-exit-icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;

                width: 16px;
                height: 16px;

                font-size: 16px;
                line-height: 1;
              }

              @media (max-width: 700px) {
                .markdown-fullscreen-header {
                  flex-basis: 60px;
                  padding: 0 16px;
                }

                .markdown-fullscreen-brand {
                  font-size: 11px;
                }

                .markdown-fullscreen-count {
                  font-size: 11px;
                }

                .markdown-fullscreen-editor {
                  padding:
                    26px
                    18px
                    130px;

                  font-size: 15px;
                  line-height: 1.75;
                }

                .markdown-fullscreen-toolbar {
                  left: 14px;
                  right: 14px;
                  bottom: 14px;

                  transform: none;

                  justify-content:
                    space-between;
                }

                .markdown-fullscreen-hint {
                  display: none;
                }

                .markdown-fullscreen-exit {
                  flex: 1;
                }
              }
            `}</style>

            <header className="markdown-fullscreen-header">
              <div className="markdown-fullscreen-header-left">
                <h2 className="markdown-fullscreen-brand">
                  KAIZEN · Markdown Studio
                </h2>

                <span className="markdown-fullscreen-count">
                  {markdown.length.toLocaleString()} characters
                </span>
              </div>

              <button
                type="button"
                className="markdown-fullscreen-exit"
                onClick={closeFullscreen}
                title="Exit fullscreen"
              >
                <span className="markdown-fullscreen-exit-icon">
                  ⤢
                </span>

                <span>Exit Fullscreen</span>
              </button>
            </header>

            <div className="markdown-fullscreen-editor-wrap">
              <textarea
                className="markdown-fullscreen-editor"
                value={markdown}
                onChange={(event) =>
                  updateMarkdown(event.target.value)
                }
                spellCheck="false"
                autoFocus
                placeholder="Start writing your Markdown..."
              />
            </div>

            <div className="markdown-fullscreen-toolbar">
              <span className="markdown-fullscreen-hint">
                Press Esc to exit fullscreen
              </span>

              <button
                type="button"
                className="markdown-fullscreen-exit"
                onClick={closeFullscreen}
              >
                <span className="markdown-fullscreen-exit-icon">
                  ✕
                </span>

                Exit Fullscreen
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  /*
   * ==========================================
   * MAIN COMPONENT
   * ==========================================
   */

  return (
    <div className="markdown-to-pdf-tool">
      <style>{`
        .markdown-to-pdf-tool {
          width: 100%;
          box-sizing: border-box;
          padding: 26px 30px 38px;
          color: rgba(255,255,255,.94);
        }

        .markdown-to-pdf-layout {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            minmax(360px, .85fr);
          gap: 22px;
        }

        .markdown-panel,
        .preview-panel,
        .settings-panel,
        .result-panel {
          border:
            1px solid
            rgba(255,255,255,.09);

          background:
            rgba(255,255,255,.035);

          border-radius: 18px;

          backdrop-filter: blur(16px);

          box-shadow:
            0 14px 40px
            rgba(0,0,0,.18);
        }

        .markdown-panel,
        .preview-panel {
          overflow: hidden;
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 12px;

          min-height: 58px;

          padding: 12px 18px;

          border-bottom:
            1px solid
            rgba(255,255,255,.07);
        }

        .panel-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .panel-title {
          margin: 0;

          font-size: 13px;
          font-weight: 700;

          letter-spacing: .08em;
          text-transform: uppercase;

          color:
            rgba(255,255,255,.78);
        }

        .panel-meta {
          font-size: 12px;
          color:
            rgba(255,255,255,.4);

          white-space: nowrap;
        }

        .panel-action-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .editor-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: 7px;

          border:
            1px solid
            rgba(255,255,255,.09);

          border-radius: 9px;

          padding: 8px 11px;

          cursor: pointer;

          background:
            rgba(255,255,255,.045);

          color:
            rgba(255,255,255,.76);

          font-size: 12px;
          font-weight: 600;

          transition:
            background .18s ease,
            border-color .18s ease,
            transform .18s ease;
        }

        .editor-action:hover {
          background:
            rgba(255,255,255,.08);

          border-color:
            rgba(255,255,255,.14);

          transform:
            translateY(-1px);
        }

        .editor-action:disabled {
          opacity: .45;
          cursor: not-allowed;
          transform: none;
        }

        .editor-action.primary {
          border-color:
            rgba(249,115,22,.28);

          background:
            rgba(249,115,22,.1);

          color: #fdba74;
        }

        .fullscreen-icon {
          width: 15px;
          height: 15px;

          position: relative;

          display: inline-block;
        }

        .fullscreen-icon::before,
        .fullscreen-icon::after {
          content: "";

          position: absolute;

          width: 6px;
          height: 6px;

          border-color: currentColor;
          border-style: solid;

          opacity: .9;
        }

        .fullscreen-icon::before {
          top: 0;
          left: 0;

          border-width:
            1px
            0
            0
            1px;
        }

        .fullscreen-icon::after {
          right: 0;
          bottom: 0;

          border-width:
            0
            1px
            1px
            0;
        }

        .markdown-editor {
          width: 100%;
          min-height: 520px;

          resize: vertical;

          border: 0;
          outline: 0;

          padding: 20px;

          box-sizing: border-box;

          background:
            rgba(0,0,0,.16);

          color:
            rgba(255,255,255,.92);

          font-family:
            "Courier New",
            monospace;

          font-size: 14px;
          line-height: 1.65;

          tab-size: 2;
        }

        .markdown-editor::selection {
          background:
            rgba(249,115,22,.28);
        }

        .preview-scroll {
          min-height: 520px;
          max-height: 620px;

          overflow: auto;

          padding: 24px;

          background: #fff;
          color: #171717;
        }

        .markdown-preview {
          max-width: 760px;
          margin: 0 auto;

          font-family:
            Arial,
            sans-serif;

          font-size: 15px;
          line-height: 1.65;

          word-break: break-word;
        }

        .markdown-preview h1,
        .markdown-preview h2,
        .markdown-preview h3,
        .markdown-preview h4,
        .markdown-preview h5,
        .markdown-preview h6 {
          line-height: 1.2;
          margin-top: 0;
          margin-bottom: .6em;
        }

        .markdown-preview p {
          margin-top: 0;
          margin-bottom: 1em;
        }

        .markdown-preview ul,
        .markdown-preview ol {
          padding-left: 1.7em;
        }

        .markdown-preview blockquote {
          margin: 1em 0;
          padding: .8em 1em;

          border-left:
            4px solid
            #f97316;

          background: #f5f5f5;
          color: #555;
        }

        .markdown-preview pre {
          padding: 14px;

          overflow: auto;

          border-radius: 8px;

          background: #1c1c1c;
          color: #f5f5f5;
        }

        .markdown-preview code {
          padding: .12em .35em;

          border-radius: 4px;

          background: #efefef;

          font-family:
            "Courier New",
            monospace;
        }

        .markdown-preview pre code {
          padding: 0;
          background: transparent;
        }

        .markdown-preview table {
          width: 100%;

          border-collapse: collapse;

          margin: 1em 0;
        }

        .markdown-preview th,
        .markdown-preview td {
          padding: 9px 11px;

          border:
            1px solid
            #d3d3d3;

          text-align: left;
          vertical-align: top;
        }

        .markdown-preview th {
          background: #eee;
        }

        .markdown-preview img {
          max-width: 100%;
          height: auto;
        }

        .markdown-preview a {
          color: #c2410c;
        }

        .settings-panel {
          margin-top: 22px;
          padding: 18px;
        }

        .settings-grid {
          display: grid;

          grid-template-columns:
            repeat(
              4,
              minmax(0, 1fr)
            );

          gap: 12px;
        }

        .setting {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .setting label {
          font-size: 11px;

          text-transform: uppercase;

          letter-spacing: .07em;

          color:
            rgba(255,255,255,.48);
        }

        .setting input,
        .setting select {
          width: 100%;

          box-sizing: border-box;

          border:
            1px solid
            rgba(255,255,255,.1);

          border-radius: 10px;

          padding:
            10px
            11px;

          outline: none;

          background:
            rgba(0,0,0,.22);

          color:
            rgba(255,255,255,.9);
        }

        .setting input:focus,
        .setting select:focus {
          border-color:
            rgba(249,115,22,.45);

          box-shadow:
            0 0 0 3px
            rgba(249,115,22,.08);
        }

        .setting.full {
          grid-column: 1 / -1;
        }

        .action-row {
          display: flex;

          justify-content: flex-end;

          gap: 10px;

          margin-top: 16px;
        }

        .kaizen-button {
          border:
            1px solid
            rgba(255,255,255,.1);

          border-radius: 11px;

          padding:
            11px
            16px;

          cursor: pointer;

          font-weight: 700;

          color:
            rgba(255,255,255,.9);

          background:
            rgba(255,255,255,.06);

          transition:
            transform .18s ease,
            background .18s ease,
            border-color .18s ease;
        }

        .kaizen-button:hover {
          transform:
            translateY(-1px);

          background:
            rgba(255,255,255,.09);
        }

        .kaizen-button.primary {
          border-color:
            rgba(249,115,22,.45);

          background:
            linear-gradient(
              135deg,
              rgba(249,115,22,.95),
              rgba(234,88,12,.78)
            );

          box-shadow:
            0 10px 28px
            rgba(249,115,22,.18);
        }

        .kaizen-button:disabled {
          opacity: .5;
          cursor: not-allowed;
          transform: none;
        }

        .progress-wrap {
          margin-top: 16px;
        }

        .progress-track {
          height: 7px;

          overflow: hidden;

          border-radius: 999px;

          background:
            rgba(255,255,255,.08);
        }

        .progress-fill {
          height: 100%;

          border-radius: inherit;

          background:
            linear-gradient(
              90deg,
              #f97316,
              #fb923c
            );

          transition:
            width .2s ease;
        }

        .status-text {
          margin-top: 8px;

          font-size: 12px;

          color:
            rgba(255,255,255,.55);
        }

        .error-box {
          margin-top: 16px;

          padding:
            12px
            14px;

          border:
            1px solid
            rgba(248,113,113,.25);

          border-radius: 11px;

          background:
            rgba(127,29,29,.18);

          color: #fecaca;

          font-size: 13px;
        }

        .result-panel {
          margin-top: 22px;
          padding: 18px;
        }

        .result-title {
          margin:
            0
            0
            8px;

          font-size: 15px;
          font-weight: 700;
        }

        .result-details {
          display: flex;

          gap: 18px;

          flex-wrap: wrap;

          color:
            rgba(255,255,255,.5);

          font-size: 12px;
        }

        @media (max-width: 1050px) {
          .markdown-to-pdf-layout {
            grid-template-columns: 1fr;
          }

          .settings-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
          }
        }

        @media (max-width: 700px) {
          .markdown-to-pdf-tool {
            padding:
              24px
              20px
              32px;
          }

          .panel-header {
            padding:
              12px
              14px;
          }

          .panel-action-row {
            gap: 5px;
          }

          .editor-action {
            padding: 8px;
          }

          .editor-action span {
            display: none;
          }

          .settings-grid {
            grid-template-columns: 1fr;
          }

          .preview-scroll,
          .markdown-editor {
            min-height: 420px;
          }
        }
      `}</style>

      <div className="markdown-to-pdf-layout">
        {normalEditor}

        <section className="preview-panel">
          <div className="panel-header">
            <h2 className="panel-title">
              Live Preview
            </h2>

            <span className="panel-meta">
              Sanitized HTML
            </span>
          </div>

          <div className="preview-scroll">
            <div
              className="markdown-preview"
              dangerouslySetInnerHTML={{
                __html: previewHtml,
              }}
            />
          </div>
        </section>
      </div>

      <section className="settings-panel">
        <div
          className="panel-header"
          style={{
            padding: 0,
            border: 0,
            minHeight: 0,
          }}
        >
          <h2 className="panel-title">
            PDF Settings
          </h2>
        </div>

        <div
          className="settings-grid"
          style={{
            marginTop: 16,
          }}
        >
          <div className="setting">
            <label>Page Size</label>

            <select
              value={pageSize}
              onChange={(event) =>
                setPageSize(event.target.value)
              }
              disabled={isProcessing}
            >
              <option value="a4">A4</option>
              <option value="a3">A3</option>
              <option value="letter">
                Letter
              </option>
              <option value="legal">
                Legal
              </option>
            </select>
          </div>

          <div className="setting">
            <label>Orientation</label>

            <select
              value={orientation}
              onChange={(event) =>
                setOrientation(event.target.value)
              }
              disabled={isProcessing}
            >
              <option value="portrait">
                Portrait
              </option>

              <option value="landscape">
                Landscape
              </option>
            </select>
          </div>

          <div className="setting">
            <label>Font</label>

            <select
              value={fontFamily}
              onChange={(event) =>
                setFontFamily(event.target.value)
              }
              disabled={isProcessing}
            >
              <option value="Arial">Arial</option>

              <option value="Helvetica">
                Helvetica
              </option>

              <option value="Georgia">
                Georgia
              </option>

              <option value="Times New Roman">
                Times New Roman
              </option>

              <option value="Courier New">
                Courier New
              </option>
            </select>
          </div>

          <div className="setting">
            <label>Font Size</label>

            <input
              type="number"
              min="8"
              max="36"
              value={fontSize}
              onChange={(event) =>
                setFontSize(
                  Number(event.target.value) || 16
                )
              }
              disabled={isProcessing}
            />
          </div>

          <div className="setting">
            <label>Line Height</label>

            <input
              type="number"
              min="1"
              max="2.5"
              step="0.1"
              value={lineHeight}
              onChange={(event) =>
                setLineHeight(
                  Number(event.target.value) || 1.6
                )
              }
              disabled={isProcessing}
            />
          </div>

          <div className="setting">
            <label>Margin</label>

            <input
              type="number"
              min="10"
              max="72"
              value={margin}
              onChange={(event) =>
                setMargin(
                  Number(event.target.value) || 18
                )
              }
              disabled={isProcessing}
            />
          </div>

          <div className="setting full">
            <label>File Name</label>

            <input
              value={fileName}
              onChange={(event) =>
                setFileName(event.target.value)
              }
              disabled={isProcessing}
            />
          </div>
        </div>

        <div className="action-row">
          <button
            type="button"
            className="kaizen-button"
            onClick={handleReset}
            disabled={isProcessing}
          >
            Reset
          </button>

          <button
            type="button"
            className="kaizen-button primary"
            onClick={handleGenerate}
            disabled={
              isProcessing ||
              !markdown.trim()
            }
          >
            {isProcessing
              ? "Generating..."
              : "Generate PDF"}
          </button>
        </div>

        {(isProcessing || progress > 0) && (
          <div className="progress-wrap">
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>

            <div className="status-text">
              {statusMessage ||
                `${progress}%`}
            </div>
          </div>
        )}

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}
      </section>

      {result && (
        <section className="result-panel">
          <h3 className="result-title">
            PDF Ready
          </h3>

          <div className="result-details">
            <span>{result.fileName}</span>

            <span>
              {result.pageCount} page(s)
            </span>

            <span>
              {formatBytes(result.byteSize)}
            </span>
          </div>

          <div className="action-row">
            <button
              type="button"
              className="kaizen-button primary"
              onClick={() =>
                downloadBlob(
                  result.blob,
                  result.fileName
                )
              }
            >
              Download PDF
            </button>

            <button
              type="button"
              className="kaizen-button"
              onClick={() =>
                setResult(null)
              }
            >
              Edit Again
            </button>
          </div>
        </section>
      )}

      {fullscreenEditor}
    </div>
  );
}