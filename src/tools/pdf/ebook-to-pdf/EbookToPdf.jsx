import {
  useState,
} from "react";

import {
  ebookToPdf,
  getEbookInfo,
} from "../../../services/conversion/ebookToPdf.js";

function formatBytes(bytes) {
  if (!bytes) {
    return "0 B";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
  ];

  let value = bytes;
  let unitIndex = 0;

  while (
    value >= 1024 &&
    unitIndex < units.length - 1
  ) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(
    value >= 10 ? 0 : 1
  )} ${units[unitIndex]}`;
}

function downloadBlob(
  blob,
  fileName
) {
  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;

  document.body.appendChild(
    anchor
  );

  anchor.click();

  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export default function EbookToPdf() {
  const [
    ebookFile,
    setEbookFile,
  ] = useState(null);

  const [
    ebookInfo,
    setEbookInfo,
  ] = useState(null);

  const [
    title,
    setTitle,
  ] = useState(
    "eBook"
  );

  const [
    fileName,
    setFileName,
  ] = useState(
    "ebook.pdf"
  );

  const [
    pageSize,
    setPageSize,
  ] = useState("a4");

  const [
    orientation,
    setOrientation,
  ] = useState(
    "portrait"
  );

  const [
    margin,
    setMargin,
  ] = useState(34);

  const [
    fontFamily,
    setFontFamily,
  ] = useState(
    "Georgia"
  );

  const [
    fontSize,
    setFontSize,
  ] = useState(16);

  const [
    lineHeight,
    setLineHeight,
  ] = useState(1.65);

  const [
    isReading,
    setIsReading,
  ] = useState(false);

  const [
    isProcessing,
    setIsProcessing,
  ] = useState(false);

  const [
    progress,
    setProgress,
  ] = useState(0);

  const [
    statusMessage,
    setStatusMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    result,
    setResult,
  ] = useState(null);

  async function handleFile(
    file
  ) {
    if (!file) {
      return;
    }

    if (
      !file.name
        .toLowerCase()
        .endsWith(".epub")
    ) {
      setError(
        "Please select an EPUB file."
      );

      return;
    }

    setError("");
    setResult(null);
    setEbookFile(file);
    setEbookInfo(null);
    setIsReading(true);

    setStatusMessage(
      "Reading eBook..."
    );

    try {
      const info =
        await getEbookInfo(
          file
        );

      setEbookInfo(info);

      setTitle(
        info.title ||
          file.name.replace(
            /\.epub$/i,
            ""
          )
      );

      setFileName(
        `${file.name.replace(
          /\.epub$/i,
          ""
        )}.pdf`
      );

      setStatusMessage(
        "eBook loaded successfully."
      );
    } catch (readError) {
      setEbookFile(null);
      setEbookInfo(null);

      setError(
        readError?.message ||
          "Unable to read this EPUB."
      );

      setStatusMessage("");
    } finally {
      setIsReading(false);
    }
  }

  function handleFileChange(
    event
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    handleFile(file);

    event.target.value = "";
  }

  function handleDrop(
    event
  ) {
    event.preventDefault();

    const file =
      event.dataTransfer.files?.[0];

    if (file) {
      handleFile(file);
    }
  }

  function handleDragOver(
    event
  ) {
    event.preventDefault();
  }

  function clearFile() {
    setEbookFile(null);
    setEbookInfo(null);
    setResult(null);
    setError("");
    setProgress(0);
    setStatusMessage("");
  }

  async function handleGenerate() {
    if (!ebookFile) {
      setError(
        "Select an EPUB file first."
      );

      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setError("");
    setResult(null);

    try {
      const output =
        await ebookToPdf(
          ebookFile,
          {
            fileName,
            title,
            pageSize,
            orientation,
            margin,
            fontFamily,
            fontSize,
            lineHeight,

            onProgress: ({
              progress:
                nextProgress,
              message,
            }) => {
              setProgress(
                nextProgress
              );

              setStatusMessage(
                message
              );
            },
          }
        );

      setResult(output);
      setProgress(100);

      setStatusMessage(
        "PDF generated successfully."
      );
    } catch (generationError) {
      setError(
        generationError?.message ||
          "Something went wrong while generating the PDF."
      );

      setProgress(0);
      setStatusMessage("");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="ebook-to-pdf-tool">
      <style>{`
        .ebook-to-pdf-tool {
          width: 100%;
          box-sizing: border-box;
          padding: 26px 30px 38px;
          color: rgba(255,255,255,.94);
        }

        .ebook-grid {
          display: grid;

          grid-template-columns:
            minmax(0, 1fr)
            minmax(360px, .8fr);

          gap: 22px;
        }

        .ebook-panel,
        .ebook-info-panel,
        .ebook-settings,
        .ebook-result {
          border:
            1px solid
            rgba(255,255,255,.09);

          border-radius: 18px;

          background:
            rgba(255,255,255,.035);

          backdrop-filter: blur(16px);

          box-shadow:
            0 14px 40px
            rgba(0,0,0,.18);
        }

        .ebook-header {
          min-height: 58px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 12px;

          padding:
            12px
            18px;

          border-bottom:
            1px solid
            rgba(255,255,255,.07);
        }

        .ebook-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ebook-title {
          margin: 0;

          font-size: 13px;
          font-weight: 700;

          letter-spacing: .08em;
          text-transform: uppercase;

          color:
            rgba(255,255,255,.78);
        }

        .ebook-meta {
          color:
            rgba(255,255,255,.4);

          font-size: 12px;

          white-space: nowrap;
        }

        .ebook-upload {
          min-height: 390px;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 30px;
        }

        .ebook-dropzone {
          width: 100%;
          min-height: 310px;

          display: flex;
          flex-direction: column;

          align-items: center;
          justify-content: center;

          text-align: center;

          border:
            1px dashed
            rgba(255,255,255,.15);

          border-radius: 18px;

          background:
            rgba(0,0,0,.15);

          transition:
            background .18s ease,
            border-color .18s ease;
        }

        .ebook-dropzone:hover {
          background:
            rgba(249,115,22,.035);

          border-color:
            rgba(249,115,22,.38);
        }

        .ebook-icon {
          width: 64px;
          height: 64px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin-bottom: 16px;

          border-radius: 18px;

          background:
            rgba(249,115,22,.1);

          border:
            1px solid
            rgba(249,115,22,.2);

          color:
            #fb923c;

          font-size: 28px;
        }

        .ebook-drop-title {
          margin:
            0
            0
            7px;

          font-size: 16px;
          font-weight: 700;
        }

        .ebook-drop-text {
          margin:
            0
            0
            18px;

          font-size: 12px;

          color:
            rgba(255,255,255,.4);
        }

        .ebook-file-input {
          display: none;
        }

        .ebook-browse {
          display: inline-flex;
          align-items: center;
          justify-content: center;

          border:
            1px solid
            rgba(249,115,22,.35);

          border-radius: 10px;

          padding:
            10px
            16px;

          cursor: pointer;

          background:
            rgba(249,115,22,.1);

          color:
            #fdba74;

          font-size: 12px;
          font-weight: 700;
        }

        .ebook-selected {
          padding: 30px;
        }

        .ebook-file-card {
          display: flex;
          align-items: center;

          gap: 14px;

          padding: 16px;

          border:
            1px solid
            rgba(255,255,255,.08);

          border-radius: 14px;

          background:
            rgba(0,0,0,.14);
        }

        .ebook-file-icon {
          width: 48px;
          height: 48px;

          flex: 0 0 auto;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 13px;

          background:
            rgba(249,115,22,.1);

          color:
            #fb923c;

          font-size: 20px;
        }

        .ebook-file-info {
          min-width: 0;
          flex: 1;
        }

        .ebook-file-name {
          margin:
            0
            0
            5px;

          overflow: hidden;

          text-overflow: ellipsis;

          white-space: nowrap;

          font-size: 14px;

          font-weight: 700;
        }

        .ebook-file-details {
          font-size: 12px;

          color:
            rgba(255,255,255,.4);
        }

        .ebook-remove {
          border: 0;
          background: transparent;

          color:
            rgba(255,255,255,.45);

          font-size: 18px;

          cursor: pointer;
        }

        .ebook-info-content {
          padding: 24px;
        }

        .ebook-stat-grid {
          display: grid;

          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );

          gap: 10px;
        }

        .ebook-stat {
          padding: 14px;

          border:
            1px solid
            rgba(255,255,255,.07);

          border-radius: 12px;

          background:
            rgba(0,0,0,.12);
        }

        .ebook-stat-label {
          margin-bottom: 7px;

          font-size: 10px;

          text-transform: uppercase;

          letter-spacing: .07em;

          color:
            rgba(255,255,255,.36);
        }

        .ebook-stat-value {
          overflow: hidden;

          text-overflow: ellipsis;

          white-space: nowrap;

          font-size: 14px;

          font-weight: 700;

          color:
            rgba(255,255,255,.86);
        }

        .ebook-settings {
          margin-top: 22px;

          padding: 18px;
        }

        .ebook-settings-grid {
          display: grid;

          grid-template-columns:
            repeat(
              4,
              minmax(0, 1fr)
            );

          gap: 12px;

          margin-top: 16px;
        }

        .ebook-setting {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .ebook-setting.full {
          grid-column: 1 / -1;
        }

        .ebook-setting label {
          font-size: 11px;

          text-transform:
            uppercase;

          letter-spacing: .07em;

          color:
            rgba(255,255,255,.48);
        }

        .ebook-setting input,
        .ebook-setting select {
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

        .ebook-setting input:focus,
        .ebook-setting select:focus {
          border-color:
            rgba(249,115,22,.45);

          box-shadow:
            0 0 0 3px
            rgba(249,115,22,.08);
        }

        .ebook-actions {
          display: flex;

          justify-content: flex-end;

          gap: 10px;

          margin-top: 16px;
        }

        .ebook-button {
          border:
            1px solid
            rgba(255,255,255,.1);

          border-radius: 11px;

          padding:
            11px
            16px;

          cursor: pointer;

          color:
            rgba(255,255,255,.9);

          background:
            rgba(255,255,255,.06);

          font-weight: 700;
        }

        .ebook-button.primary {
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

        .ebook-button:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .ebook-progress {
          margin-top: 16px;
        }

        .ebook-progress-track {
          height: 7px;

          overflow: hidden;

          border-radius: 999px;

          background:
            rgba(255,255,255,.08);
        }

        .ebook-progress-fill {
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

        .ebook-status {
          margin-top: 8px;

          font-size: 12px;

          color:
            rgba(255,255,255,.5);
        }

        .ebook-error {
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

          color:
            #fecaca;

          font-size: 13px;
        }

        .ebook-result {
          margin-top: 22px;

          padding: 18px;
        }

        .ebook-result-title {
          margin:
            0
            0
            8px;

          font-size: 15px;
          font-weight: 700;
        }

        .ebook-result-details {
          display: flex;

          flex-wrap: wrap;

          gap: 18px;

          color:
            rgba(255,255,255,.5);

          font-size: 12px;
        }

        @media (max-width: 1050px) {
          .ebook-grid {
            grid-template-columns:
              1fr;
          }

          .ebook-settings-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
          }
        }

        @media (max-width: 700px) {
          .ebook-to-pdf-tool {
            padding:
              24px
              20px
              32px;
          }

          .ebook-settings-grid {
            grid-template-columns:
              1fr;
          }

          .ebook-stat-grid {
            grid-template-columns:
              1fr;
          }
        }
      `}</style>

      <div className="ebook-grid">
        <section className="ebook-panel">
          <div className="ebook-header">
            <div className="ebook-header-left">
              <h2 className="ebook-title">
                eBook Input
              </h2>

              <span className="ebook-meta">
                EPUB · Local processing
              </span>
            </div>

            {ebookFile && (
              <button
                type="button"
                className="ebook-button"
                onClick={clearFile}
                disabled={
                  isProcessing ||
                  isReading
                }
              >
                Clear
              </button>
            )}
          </div>

          {!ebookFile ? (
            <div className="ebook-upload">
              <div
                className="ebook-dropzone"
                onDrop={handleDrop}
                onDragOver={
                  handleDragOver
                }
              >
                <div className="ebook-icon">
                  ▣
                </div>

                <h3 className="ebook-drop-title">
                  Drop an EPUB here
                </h3>

                <p className="ebook-drop-text">
                  Convert an EPUB eBook into a polished PDF
                </p>

                <input
                  id="kaizen-ebook-input"
                  className="ebook-file-input"
                  type="file"
                  accept=".epub,application/epub+zip"
                  onChange={
                    handleFileChange
                  }
                />

                <label
                  htmlFor="kaizen-ebook-input"
                  className="ebook-browse"
                >
                  Choose EPUB
                </label>
              </div>
            </div>
          ) : (
            <div className="ebook-selected">
              <div className="ebook-file-card">
                <div className="ebook-file-icon">
                  ▣
                </div>

                <div className="ebook-file-info">
                  <p className="ebook-file-name">
                    {ebookFile.name}
                  </p>

                  <div className="ebook-file-details">
                    {formatBytes(
                      ebookFile.size
                    )}

                    {ebookInfo &&
                      ` · ${ebookInfo.chapterCount} chapters`}
                  </div>
                </div>

                <button
                  type="button"
                  className="ebook-remove"
                  onClick={
                    clearFile
                  }
                  disabled={
                    isProcessing ||
                    isReading
                  }
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="ebook-info-panel">
          <div className="ebook-header">
            <h2 className="ebook-title">
              eBook Information
            </h2>

            <span className="ebook-meta">
              {isReading
                ? "Reading..."
                : ebookInfo
                ? "Ready"
                : "Waiting for EPUB"}
            </span>
          </div>

          {!ebookInfo ? (
            <div className="ebook-upload">
              <div className="ebook-drop-text">
                Select an EPUB to inspect its
                title, author, language and chapters.
              </div>
            </div>
          ) : (
            <div className="ebook-info-content">
              <div className="ebook-stat-grid">
                <div className="ebook-stat">
                  <div className="ebook-stat-label">
                    Title
                  </div>

                  <div className="ebook-stat-value">
                    {ebookInfo.title ||
                      "Untitled"}
                  </div>
                </div>

                <div className="ebook-stat">
                  <div className="ebook-stat-label">
                    Author
                  </div>

                  <div className="ebook-stat-value">
                    {ebookInfo.author ||
                      "Unknown"}
                  </div>
                </div>

                <div className="ebook-stat">
                  <div className="ebook-stat-label">
                    Chapters
                  </div>

                  <div className="ebook-stat-value">
                    {ebookInfo.chapterCount}
                  </div>
                </div>

                <div className="ebook-stat">
                  <div className="ebook-stat-label">
                    File Size
                  </div>

                  <div className="ebook-stat-value">
                    {formatBytes(
                      ebookInfo.fileSize
                    )}
                  </div>
                </div>

                <div className="ebook-stat">
                  <div className="ebook-stat-label">
                    Language
                  </div>

                  <div className="ebook-stat-value">
                    {ebookInfo.language ||
                      "Unknown"}
                  </div>
                </div>

                <div className="ebook-stat">
                  <div className="ebook-stat-label">
                    Content
                  </div>

                  <div className="ebook-stat-value">
                    {ebookInfo.characterCount.toLocaleString()}{" "}
                    chars
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="ebook-settings">
        <div
          className="ebook-header"
          style={{
            padding: 0,
            border: 0,
            minHeight: 0,
          }}
        >
          <h2 className="ebook-title">
            PDF Settings
          </h2>
        </div>

        <div className="ebook-settings-grid">
          <div className="ebook-setting">
            <label>
              PDF Title
            </label>

            <input
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value
                )
              }
              disabled={isProcessing}
            />
          </div>

          <div className="ebook-setting">
            <label>
              Page Size
            </label>

            <select
              value={pageSize}
              onChange={(event) =>
                setPageSize(
                  event.target.value
                )
              }
              disabled={isProcessing}
            >
              <option value="a4">
                A4
              </option>

              <option value="a3">
                A3
              </option>

              <option value="letter">
                Letter
              </option>

              <option value="legal">
                Legal
              </option>
            </select>
          </div>

          <div className="ebook-setting">
            <label>
              Orientation
            </label>

            <select
              value={orientation}
              onChange={(event) =>
                setOrientation(
                  event.target.value
                )
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

          <div className="ebook-setting">
            <label>
              Font
            </label>

            <select
              value={fontFamily}
              onChange={(event) =>
                setFontFamily(
                  event.target.value
                )
              }
              disabled={isProcessing}
            >
              <option value="Georgia">
                Georgia
              </option>

              <option value="Arial">
                Arial
              </option>

              <option value="Times New Roman">
                Times New Roman
              </option>

              <option value="Courier New">
                Courier New
              </option>
            </select>
          </div>

          <div className="ebook-setting">
            <label>
              Font Size
            </label>

            <input
              type="number"
              min="9"
              max="30"
              value={fontSize}
              onChange={(event) =>
                setFontSize(
                  Number(
                    event.target.value
                  ) || 16
                )
              }
              disabled={isProcessing}
            />
          </div>

          <div className="ebook-setting">
            <label>
              Line Height
            </label>

            <input
              type="number"
              min="1"
              max="2.5"
              step="0.05"
              value={lineHeight}
              onChange={(event) =>
                setLineHeight(
                  Number(
                    event.target.value
                  ) || 1.65
                )
              }
              disabled={isProcessing}
            />
          </div>

          <div className="ebook-setting">
            <label>
              Margin
            </label>

            <input
              type="number"
              min="10"
              max="72"
              value={margin}
              onChange={(event) =>
                setMargin(
                  Number(
                    event.target.value
                  ) || 34
                )
              }
              disabled={isProcessing}
            />
          </div>

          <div className="ebook-setting full">
            <label>
              File Name
            </label>

            <input
              value={fileName}
              onChange={(event) =>
                setFileName(
                  event.target.value
                )
              }
              disabled={isProcessing}
            />
          </div>
        </div>

        <div className="ebook-actions">
          <button
            type="button"
            className="ebook-button"
            onClick={clearFile}
            disabled={
              isProcessing ||
              !ebookFile
            }
          >
            Clear
          </button>

          <button
            type="button"
            className="ebook-button primary"
            onClick={
              handleGenerate
            }
            disabled={
              isProcessing ||
              isReading ||
              !ebookFile ||
              !ebookInfo
            }
          >
            {isProcessing
              ? "Generating..."
              : "Generate PDF"}
          </button>
        </div>

        {(isProcessing ||
          progress > 0) && (
          <div className="ebook-progress">
            <div className="ebook-progress-track">
              <div
                className="ebook-progress-fill"
                style={{
                  width:
                    `${progress}%`,
                }}
              />
            </div>

            <div className="ebook-status">
              {statusMessage ||
                `${progress}%`}
            </div>
          </div>
        )}

        {error && (
          <div className="ebook-error">
            {error}
          </div>
        )}
      </section>

      {result && (
        <section className="ebook-result">
          <h3 className="ebook-result-title">
            PDF Ready
          </h3>

          <div className="ebook-result-details">
            <span>
              {result.fileName}
            </span>

            <span>
              {result.pageCount} pages
            </span>

            <span>
              {result.ebookInfo.chapterCount} chapters
            </span>

            <span>
              {formatBytes(
                result.byteSize
              )}
            </span>
          </div>

          <div className="ebook-actions">
            <button
              type="button"
              className="ebook-button primary"
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
              className="ebook-button"
              onClick={() =>
                setResult(null)
              }
            >
              Edit Again
            </button>
          </div>
        </section>
      )}
    </div>
  );
}