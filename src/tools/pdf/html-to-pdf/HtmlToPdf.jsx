import { useEffect, useRef, useState } from "react";
import FileDropzone from "../../../components/files/FileDropzone";
import {
  getHtmlToPdfInfo,
  htmlToPdf,
} from "../../../services/conversion/htmlToPdf";

function formatFileSize(bytes) {
  if (!bytes) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function HtmlToPdf() {
  const [file, setFile] = useState(null);
  const [info, setInfo] = useState(null);
  const [output, setOutput] = useState(null);

  const [pageSize, setPageSize] = useState("A4");
  const [orientation, setOrientation] = useState("portrait");
  const [margin, setMargin] = useState(10);
  const [scale, setScale] = useState(2);
  const [imageFormat, setImageFormat] = useState("jpeg");
  const [imageQuality, setImageQuality] = useState(0.95);

  const [htmlSource, setHtmlSource] = useState("");
  const [previewMode, setPreviewMode] = useState(false);

  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [error, setError] = useState("");

  const [inputMode, setInputMode] = useState("upload");

  const downloadUrlRef = useRef(null);

  useEffect(() => {
    return () => {
      if (downloadUrlRef.current) {
        URL.revokeObjectURL(downloadUrlRef.current);
      }
    };
  }, []);

  async function inspectHtmlFile(selectedFile) {
    setError("");
    setOutput(null);
    setInfo(null);
    setProgress(0);
    setProgressMessage("");
    setStatus("validating");

    try {
      const htmlInfo =
        await getHtmlToPdfInfo(selectedFile);

      const html = await selectedFile.text();

      setFile(selectedFile);
      setInfo(htmlInfo);
      setHtmlSource(html);
      setStatus("ready");
    } catch (validationError) {
      console.error(
        "HTML validation error:",
        validationError,
      );

      setFile(null);
      setInfo(null);
      setHtmlSource("");
      setStatus("error");
      setError(
        validationError?.message ||
          "This HTML file could not be processed.",
      );
    }
  }

  function handleFiles(selectedFiles) {
    const selectedFile = selectedFiles?.[0];

    if (!selectedFile) {
      return;
    }

    inspectHtmlFile(selectedFile);
  }

  function createHtmlFileFromSource(source) {
    const blob = new Blob(
      [source],
      {
        type: "text/html;charset=utf-8",
      },
    );

    return new File(
      [blob],
      "kaizen-html-document.html",
      {
        type: "text/html",
        lastModified: Date.now(),
      },
    );
  }

  async function handleConvert() {
    let conversionFile = file;

    if (inputMode === "paste") {
      const trimmedSource = htmlSource.trim();

      if (!trimmedSource) {
        setError(
          "Please enter some HTML before converting.",
        );
        setStatus("error");
        return;
      }

      conversionFile =
        createHtmlFileFromSource(
          trimmedSource,
        );

      try {
        const htmlInfo =
          await getHtmlToPdfInfo(
            conversionFile,
          );

        setFile(conversionFile);
        setInfo(htmlInfo);
      } catch (validationError) {
        setError(
          validationError?.message ||
            "The HTML content could not be processed.",
        );
        setStatus("error");
        return;
      }
    }

    if (!conversionFile) {
      setError(
        "Please provide HTML content first.",
      );
      setStatus("error");
      return;
    }

    setError("");
    setOutput(null);
    setProgress(0);
    setProgressMessage(
      "Preparing HTML conversion...",
    );
    setStatus("processing");

    try {
      const result = await htmlToPdf(
        conversionFile,
        {
          pageSize,
          orientation,
          margin,
          scale,
          imageFormat,
          imageQuality,
        },
        ({
          progress: currentProgress,
          message,
        }) => {
          setProgress(
            Math.max(
              0,
              Math.min(
                100,
                currentProgress || 0,
              ),
            ),
          );

          setProgressMessage(
            message ||
              "Processing HTML document...",
          );
        },
      );

      if (downloadUrlRef.current) {
        URL.revokeObjectURL(
          downloadUrlRef.current,
        );
      }

      const downloadUrl =
        URL.createObjectURL(
          result.blob,
        );

      downloadUrlRef.current =
        downloadUrl;

      setOutput({
        ...result,
        url: downloadUrl,
      });

      setProgress(100);
      setProgressMessage(
        "HTML converted successfully.",
      );
      setStatus("success");
    } catch (conversionError) {
      console.error(
        "HTML to PDF conversion error:",
        conversionError,
      );

      setStatus("error");
      setError(
        conversionError?.message ||
          "The HTML document could not be converted.",
      );
    }
  }

  function handleReset() {
    if (downloadUrlRef.current) {
      URL.revokeObjectURL(
        downloadUrlRef.current,
      );

      downloadUrlRef.current =
        null;
    }

    setFile(null);
    setInfo(null);
    setOutput(null);
    setHtmlSource("");
    setPreviewMode(false);
    setStatus("idle");
    setProgress(0);
    setProgressMessage("");
    setError("");
  }

  function handleDownload() {
    if (!output?.url) {
      return;
    }

    const anchor =
      document.createElement("a");

    anchor.href = output.url;
    anchor.download =
      output.fileName;

    document.body.appendChild(
      anchor,
    );

    anchor.click();
    anchor.remove();
  }

  function handlePasteMode() {
    setInputMode("paste");
    setFile(null);
    setInfo(null);
    setOutput(null);
    setError("");
    setStatus("idle");
    setHtmlSource("");
  }

  function handleUploadMode() {
    setInputMode("upload");
    setFile(null);
    setInfo(null);
    setOutput(null);
    setError("");
    setStatus("idle");
    setHtmlSource("");
  }

  const hasHtml =
    inputMode === "paste"
      ? Boolean(htmlSource.trim())
      : Boolean(file && info);

  const canConvert =
    hasHtml &&
    (status === "ready" ||
      status === "success" ||
      (inputMode === "paste" &&
        Boolean(htmlSource.trim()) &&
        status === "idle"));

  return (
    <>
      <div className="html-to-pdf-tool">
        <div className="html-to-pdf-header">
          <div>
            <div className="html-to-pdf-kicker">
              WEB DOCUMENT · PDF
            </div>

            <h2>HTML to PDF</h2>

            <p>
              Turn HTML documents or pasted HTML
              into polished PDF files directly
              in your browser.
            </p>
          </div>

          {(file || htmlSource) && (
            <button
              type="button"
              className="html-to-pdf-reset-button"
              onClick={handleReset}
            >
              Start Over
            </button>
          )}
        </div>

        <div className="html-to-pdf-mode-switch">
          <button
            type="button"
            className={
              inputMode === "upload"
                ? "active"
                : ""
            }
            onClick={handleUploadMode}
            disabled={status === "processing"}
          >
            Upload HTML
          </button>

          <button
            type="button"
            className={
              inputMode === "paste"
                ? "active"
                : ""
            }
            onClick={handlePasteMode}
            disabled={status === "processing"}
          >
            Paste HTML
          </button>
        </div>

        {inputMode === "upload" &&
          status === "idle" && (
            <div className="html-to-pdf-upload-section">
              <FileDropzone
                accept=".html,.htm,text/html"
                multiple={false}
                onFiles={handleFiles}
                className="html-to-pdf-dropzone-wrapper"
              >
                <div className="html-to-pdf-dropzone">
                  <div className="html-to-pdf-drop-icon">
                    &lt;/&gt;
                  </div>

                  <div className="html-to-pdf-drop-title">
                    Drop your HTML file here
                  </div>

                  <div className="html-to-pdf-drop-description">
                    or click to browse from your device
                  </div>

                  <div className="html-to-pdf-drop-formats">
                    Supports HTML and HTM
                  </div>
                </div>
              </FileDropzone>
            </div>
          )}

        {inputMode === "paste" &&
          status === "idle" && (
            <div className="html-to-pdf-editor-card">
              <div className="html-to-pdf-editor-top">
                <div>
                  <span>
                    HTML SOURCE
                  </span>

                  <strong>
                    Paste your markup
                  </strong>
                </div>

                <span>
                  {htmlSource.length} characters
                </span>
              </div>

              <textarea
                value={htmlSource}
                onChange={(event) =>
                  setHtmlSource(
                    event.target.value,
                  )
                }
                placeholder={`<!DOCTYPE html>
<html>
  <head>
    <title>My Document</title>
  </head>
  <body>
    <h1>Hello KAIZEN</h1>
    <p>Your HTML content goes here.</p>
  </body>
</html>`}
                spellCheck={false}
              />

              <div className="html-to-pdf-editor-footer">
                <span>
                  HTML is processed locally.
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setPreviewMode(
                      (current) => !current,
                    )
                  }
                  disabled={
                    !htmlSource.trim()
                  }
                >
                  {previewMode
                    ? "Hide Preview"
                    : "Preview HTML"}
                </button>
              </div>

              {previewMode &&
                htmlSource.trim() && (
                  <div className="html-to-pdf-browser-preview">
                    <iframe
                      title="HTML preview"
                      srcDoc={htmlSource}
                      sandbox=""
                    />
                  </div>
                )}
            </div>
          )}

        {status === "validating" && (
          <div className="html-to-pdf-state-card">
            <div className="html-to-pdf-spinner" />

            <strong>
              Reading HTML document...
            </strong>

            <span>
              Inspecting the document structure and resources.
            </span>
          </div>
        )}

        {file &&
          info &&
          status !== "idle" &&
          status !== "validating" && (
            <>
              <div className="html-to-pdf-file-card">
                <div className="html-to-pdf-file-icon">
                  &lt;/&gt;
                </div>

                <div className="html-to-pdf-file-info">
                  <strong>
                    {file.name}
                  </strong>

                  <span>
                    {formatFileSize(file.size)} ·{" "}
                    {info.characterCount} characters ·{" "}
                    {info.images}{" "}
                    {info.images === 1
                      ? "image"
                      : "images"}{" "}
                    · {info.links}{" "}
                    {info.links === 1
                      ? "link"
                      : "links"}
                  </span>
                </div>

                <div className="html-to-pdf-file-status">
                  {status === "processing"
                    ? "Processing"
                    : status === "success"
                      ? "Complete"
                      : "Ready"}
                </div>
              </div>

              {inputMode === "paste" &&
                htmlSource.trim() && (
                  <div className="html-to-pdf-source-preview">
                    <div className="html-to-pdf-source-preview-top">
                      <div>
                        <span>
                          SOURCE PREVIEW
                        </span>

                        <strong>
                          Rendered HTML
                        </strong>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setPreviewMode(
                            (current) =>
                              !current,
                          )
                        }
                      >
                        {previewMode
                          ? "Hide Preview"
                          : "Show Preview"}
                      </button>
                    </div>

                    {previewMode && (
                      <iframe
                        title="HTML source preview"
                        srcDoc={
                          htmlSource
                        }
                        sandbox=""
                      />
                    )}
                  </div>
                )}

              <div className="html-to-pdf-section">
                <div className="html-to-pdf-section-heading">
                  <div>
                    <span>
                      01
                    </span>

                    <h3>
                      Document
                    </h3>
                  </div>

                  <p>
                    Review the HTML content detected by KAIZEN.
                  </p>
                </div>

                <div className="html-to-pdf-summary-grid">
                  <div className="html-to-pdf-summary-card">
                    <span>
                      Title
                    </span>

                    <strong className="wide-value">
                      {info.title ||
                        "Untitled"}
                    </strong>
                  </div>

                  <div className="html-to-pdf-summary-card">
                    <span>
                      Headings
                    </span>

                    <strong>
                      {info.headings}
                    </strong>
                  </div>

                  <div className="html-to-pdf-summary-card">
                    <span>
                      Images
                    </span>

                    <strong>
                      {info.images}
                    </strong>
                  </div>

                  <div className="html-to-pdf-summary-card">
                    <span>
                      Links
                    </span>

                    <strong>
                      {info.links}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="html-to-pdf-section">
                <div className="html-to-pdf-section-heading">
                  <div>
                    <span>
                      02
                    </span>

                    <h3>
                      PDF Settings
                    </h3>
                  </div>

                  <p>
                    Control the PDF page layout and rendering quality.
                  </p>
                </div>

                <div className="html-to-pdf-settings-grid">
                  <label className="html-to-pdf-control">
                    <span>
                      Page Size
                    </span>

                    <select
                      value={pageSize}
                      onChange={(event) =>
                        setPageSize(
                          event.target.value,
                        )
                      }
                      disabled={
                        status ===
                        "processing"
                      }
                    >
                      <option value="A4">
                        A4
                      </option>

                      <option value="A3">
                        A3
                      </option>

                      <option value="Letter">
                        Letter
                      </option>

                      <option value="Legal">
                        Legal
                      </option>
                    </select>
                  </label>

                  <label className="html-to-pdf-control">
                    <span>
                      Orientation
                    </span>

                    <select
                      value={
                        orientation
                      }
                      onChange={(event) =>
                        setOrientation(
                          event.target
                            .value,
                        )
                      }
                      disabled={
                        status ===
                        "processing"
                      }
                    >
                      <option value="portrait">
                        Portrait
                      </option>

                      <option value="landscape">
                        Landscape
                      </option>
                    </select>
                  </label>

                  <label className="html-to-pdf-control">
                    <span>
                      Margins
                    </span>

                    <select
                      value={margin}
                      onChange={(event) =>
                        setMargin(
                          Number(
                            event
                              .target
                              .value,
                          ),
                        )
                      }
                      disabled={
                        status ===
                        "processing"
                      }
                    >
                      <option value={0}>
                        None
                      </option>

                      <option value={5}>
                        5 mm
                      </option>

                      <option value={10}>
                        10 mm
                      </option>

                      <option value={15}>
                        15 mm
                      </option>

                      <option value={20}>
                        20 mm
                      </option>
                    </select>
                  </label>

                  <label className="html-to-pdf-control">
                    <span>
                      Render Scale
                    </span>

                    <select
                      value={scale}
                      onChange={(event) =>
                        setScale(
                          Number(
                            event
                              .target
                              .value,
                          ),
                        )
                      }
                      disabled={
                        status ===
                        "processing"
                      }
                    >
                      <option value={1}>
                        Standard
                      </option>

                      <option value={1.5}>
                        Enhanced
                      </option>

                      <option value={2}>
                        High
                      </option>

                      <option value={2.5}>
                        Very High
                      </option>

                      <option value={3}>
                        Maximum
                      </option>
                    </select>
                  </label>
                </div>

                <div className="html-to-pdf-options-grid">
                  <label className="html-to-pdf-control">
                    <span>
                      Image Format
                    </span>

                    <select
                      value={
                        imageFormat
                      }
                      onChange={(event) =>
                        setImageFormat(
                          event.target
                            .value,
                        )
                      }
                      disabled={
                        status ===
                        "processing"
                      }
                    >
                      <option value="jpeg">
                        JPEG
                      </option>

                      <option value="png">
                        PNG
                      </option>
                    </select>
                  </label>

                  <label className="html-to-pdf-control">
                    <span>
                      Image Quality
                    </span>

                    <select
                      value={
                        imageQuality
                      }
                      onChange={(event) =>
                        setImageQuality(
                          Number(
                            event
                              .target
                              .value,
                          ),
                        )
                      }
                      disabled={
                        status ===
                        "processing"
                      }
                    >
                      <option value={0.75}>
                        Balanced
                      </option>

                      <option value={0.85}>
                        Enhanced
                      </option>

                      <option value={0.95}>
                        High
                      </option>

                      <option value={1}>
                        Maximum
                      </option>
                    </select>
                  </label>
                </div>
              </div>

              {status === "processing" && (
                <div className="html-to-pdf-progress-card">
                  <div className="html-to-pdf-progress-top">
                    <div>
                      <span>
                        PROCESSING
                      </span>

                      <strong>
                        {progressMessage}
                      </strong>
                    </div>

                    <b>
                      {progress}%
                    </b>
                  </div>

                  <div className="html-to-pdf-progress-track">
                    <div
                      className="html-to-pdf-progress-fill"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(
                            100,
                            progress,
                          ),
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {status !==
                "processing" &&
                status !==
                  "success" && (
                  <div className="html-to-pdf-action-area">
                    <button
                      type="button"
                      className="html-to-pdf-convert-button"
                      onClick={
                        handleConvert
                      }
                      disabled={
                        !canConvert
                      }
                    >
                      <span>
                        Convert to PDF
                      </span>

                      <span>
                        →
                      </span>
                    </button>

                    <p>
                      HTML is rendered locally in your browser.
                    </p>
                  </div>
                )}

              {status ===
                "success" &&
                output && (
                  <div className="html-to-pdf-success-card">
                    <div className="html-to-pdf-success-icon">
                      ✓
                    </div>

                    <div className="html-to-pdf-success-content">
                      <span>
                        CONVERSION COMPLETE
                      </span>

                      <h3>
                        {output.fileName}
                      </h3>

                      <p>
                        {output.pageCount}{" "}
                        {output.pageCount ===
                        1
                          ? "page"
                          : "pages"}{" "}
                        generated successfully ·{" "}
                        {formatFileSize(
                          output.size,
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="html-to-pdf-download-button"
                      onClick={
                        handleDownload
                      }
                    >
                      Download PDF
                    </button>
                  </div>
                )}
            </>
          )}

        {status ===
          "error" &&
          error && (
            <div className="html-to-pdf-error-card">
              <div className="html-to-pdf-error-icon">
                !
              </div>

              <div>
                <strong>
                  Something went wrong
                </strong>

                <p>
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  handleReset
                }
              >
                Try Again
              </button>
            </div>
          )}
      </div>

      <style>{`
        .html-to-pdf-tool {
          width: 100%;
          box-sizing: border-box;
          padding: 26px 30px 38px;
          color: rgba(255, 255, 255, 0.94);
        }

        .html-to-pdf-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 22px;
        }

        .html-to-pdf-kicker {
          margin-bottom: 8px;
          color: rgba(255, 139, 61, 0.9);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.2em;
        }

        .html-to-pdf-header h2 {
          margin: 0;
          font-size: clamp(28px, 3vw, 42px);
          line-height: 1.05;
          letter-spacing: -0.04em;
        }

        .html-to-pdf-header p {
          margin: 10px 0 0;
          max-width: 670px;
          color: rgba(255, 255, 255, 0.58);
          font-size: 14px;
          line-height: 1.6;
        }

        .html-to-pdf-reset-button {
          flex: 0 0 auto;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.045);
          color: rgba(255, 255, 255, 0.72);
          padding: 10px 14px;
          cursor: pointer;
          font-size: 12px;
        }

        .html-to-pdf-reset-button:hover {
          border-color: rgba(255, 138, 58, 0.35);
          background: rgba(255, 138, 58, 0.08);
          color: #fff;
        }

        .html-to-pdf-mode-switch {
          display: inline-flex;
          gap: 5px;
          padding: 4px;
          margin-bottom: 16px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.025);
        }

        .html-to-pdf-mode-switch button {
          min-height: 34px;
          padding: 0 12px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: rgba(255, 255, 255, 0.45);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .html-to-pdf-mode-switch button.active {
          background: rgba(255, 138, 58, 0.1);
          color: #ffad7a;
        }

        .html-to-pdf-dropzone-wrapper,
        .html-to-pdf-dropzone-wrapper label {
          width: 100%;
          display: block;
        }

        .html-to-pdf-dropzone-wrapper input[type="file"] {
          display: none;
        }

        .html-to-pdf-dropzone {
          min-height: 220px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 34px;
          border: 1px dashed rgba(255, 255, 255, 0.18);
          border-radius: 22px;
          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.045),
              rgba(255, 255, 255, 0.02)
            );
          cursor: pointer;
          text-align: center;
          transition:
            border-color 160ms ease,
            background 160ms ease,
            transform 160ms ease;
        }

        .html-to-pdf-dropzone:hover {
          border-color: rgba(255, 138, 58, 0.5);
          background:
            linear-gradient(
              180deg,
              rgba(255, 138, 58, 0.08),
              rgba(255, 255, 255, 0.025)
            );
          transform: translateY(-1px);
        }

        .html-to-pdf-drop-icon {
          min-width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          margin-bottom: 18px;
          padding: 0 10px;
          box-sizing: border-box;
          border: 1px solid rgba(255, 138, 58, 0.28);
          border-radius: 17px;
          background: rgba(255, 138, 58, 0.1);
          color: #ff9a59;
          font-size: 17px;
          font-weight: 800;
          box-shadow: 0 12px 36px rgba(255, 101, 26, 0.12);
        }

        .html-to-pdf-drop-title {
          font-size: 18px;
          font-weight: 700;
        }

        .html-to-pdf-drop-description {
          margin-top: 7px;
          color: rgba(255, 255, 255, 0.52);
          font-size: 13px;
        }

        .html-to-pdf-drop-formats {
          margin-top: 14px;
          color: rgba(255, 138, 58, 0.72);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .html-to-pdf-editor-card {
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.028);
        }

        .html-to-pdf-editor-top,
        .html-to-pdf-editor-footer,
        .html-to-pdf-source-preview-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 13px 15px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .html-to-pdf-editor-top > div,
        .html-to-pdf-source-preview-top > div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .html-to-pdf-editor-top span:first-child,
        .html-to-pdf-source-preview-top span {
          color: rgba(255, 138, 58, 0.68);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.13em;
        }

        .html-to-pdf-editor-top strong,
        .html-to-pdf-source-preview-top strong {
          font-size: 12px;
        }

        .html-to-pdf-editor-top > span:last-child {
          color: rgba(255, 255, 255, 0.34);
          font-size: 10px;
        }

        .html-to-pdf-editor-card textarea {
          display: block;
          width: 100%;
          min-height: 300px;
          box-sizing: border-box;
          padding: 18px;
          border: 0;
          outline: none;
          resize: vertical;
          background: #11100f;
          color: #f4eee9;
          font-family:
            ui-monospace,
            SFMono-Regular,
            Menlo,
            Monaco,
            Consolas,
            monospace;
          font-size: 12px;
          line-height: 1.65;
        }

        .html-to-pdf-editor-footer {
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          border-bottom: 0;
        }

        .html-to-pdf-editor-footer span {
          color: rgba(255, 255, 255, 0.35);
          font-size: 10px;
        }

        .html-to-pdf-editor-footer button,
        .html-to-pdf-source-preview-top button {
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.7);
          padding: 7px 10px;
          cursor: pointer;
          font-size: 10px;
        }

        .html-to-pdf-editor-footer button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .html-to-pdf-browser-preview,
        .html-to-pdf-source-preview {
          margin-top: 12px;
        }

        .html-to-pdf-browser-preview {
          padding: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(0, 0, 0, 0.18);
        }

        .html-to-pdf-browser-preview iframe,
        .html-to-pdf-source-preview iframe {
          display: block;
          width: 100%;
          min-height: 420px;
          border: 0;
          border-radius: 10px;
          background: #fff;
        }

        .html-to-pdf-state-card {
          min-height: 190px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.025);
          text-align: center;
        }

        .html-to-pdf-state-card strong {
          margin-top: 16px;
          font-size: 15px;
        }

        .html-to-pdf-state-card span {
          margin-top: 6px;
          color: rgba(255, 255, 255, 0.45);
          font-size: 12px;
        }

        .html-to-pdf-spinner {
          width: 34px;
          height: 34px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-top-color: #ff8b3d;
          border-radius: 50%;
          animation: htmlToPdfSpin 0.8s linear infinite;
        }

        @keyframes htmlToPdfSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .html-to-pdf-file-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 17px 18px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.035);
        }

        .html-to-pdf-file-icon {
          min-width: 48px;
          width: 48px;
          height: 48px;
          flex: 0 0 48px;
          display: grid;
          place-items: center;
          box-sizing: border-box;
          border: 1px solid rgba(255, 138, 58, 0.22);
          border-radius: 14px;
          background: rgba(255, 138, 58, 0.09);
          color: #ff9a59;
          font-size: 11px;
          font-weight: 800;
        }

        .html-to-pdf-file-info {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .html-to-pdf-file-info strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
        }

        .html-to-pdf-file-info span {
          color: rgba(255, 255, 255, 0.45);
          font-size: 11px;
        }

        .html-to-pdf-file-status {
          flex: 0 0 auto;
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(255, 138, 58, 0.09);
          color: rgba(255, 174, 122, 0.92);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .html-to-pdf-source-preview {
          margin-top: 12px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.065);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.02);
        }

        .html-to-pdf-source-preview-top {
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .html-to-pdf-section {
          margin-top: 28px;
        }

        .html-to-pdf-section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 14px;
        }

        .html-to-pdf-section-heading > div {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .html-to-pdf-section-heading > div > span {
          color: rgba(255, 138, 58, 0.7);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .html-to-pdf-section-heading h3 {
          margin: 0;
          font-size: 15px;
        }

        .html-to-pdf-section-heading p {
          margin: 0;
          color: rgba(255, 255, 255, 0.42);
          font-size: 11px;
          text-align: right;
        }

        .html-to-pdf-summary-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .html-to-pdf-summary-card {
          min-height: 74px;
          padding: 13px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border: 1px solid rgba(255, 255, 255, 0.065);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.025);
        }

        .html-to-pdf-summary-card span {
          color: rgba(255, 255, 255, 0.42);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .html-to-pdf-summary-card strong {
          color: rgba(255, 255, 255, 0.9);
          font-size: 20px;
          line-height: 1;
        }

        .html-to-pdf-summary-card .wide-value {
          overflow: hidden;
          max-width: 100%;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .html-to-pdf-settings-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .html-to-pdf-options-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 12px;
          max-width: calc(50% - 6px);
        }

        .html-to-pdf-control {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .html-to-pdf-control > span {
          color: rgba(255, 255, 255, 0.48);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .html-to-pdf-control select {
          width: 100%;
          height: 44px;
          box-sizing: border-box;
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 11px;
          outline: none;
          background: rgba(255, 255, 255, 0.045);
          color: rgba(255, 255, 255, 0.88);
          padding: 0 12px;
          font-size: 12px;
          cursor: pointer;
        }

        .html-to-pdf-control select:focus {
          border-color: rgba(255, 138, 58, 0.48);
        }

        .html-to-pdf-control select option {
          background: #1a1512;
          color: #fff;
        }

        .html-to-pdf-progress-card {
          margin-top: 24px;
          padding: 17px 18px;
          border: 1px solid rgba(255, 138, 58, 0.15);
          border-radius: 16px;
          background: rgba(255, 138, 58, 0.045);
        }

        .html-to-pdf-progress-top {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
        }

        .html-to-pdf-progress-top > div {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .html-to-pdf-progress-top span {
          color: rgba(255, 138, 58, 0.68);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.14em;
        }

        .html-to-pdf-progress-top strong {
          font-size: 12px;
        }

        .html-to-pdf-progress-top b {
          color: #ff9a59;
          font-size: 13px;
        }

        .html-to-pdf-progress-track {
          height: 5px;
          margin-top: 13px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
        }

        .html-to-pdf-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #ff6b1a,
            #ffad69
          );
          transition: width 180ms ease;
        }

        .html-to-pdf-action-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 30px;
        }

        .html-to-pdf-convert-button {
          min-width: 230px;
          min-height: 50px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 18px;
          border: 1px solid rgba(255, 170, 107, 0.28);
          border-radius: 15px;
          background:
            radial-gradient(
              circle at center,
              rgba(255, 157, 84, 0.32),
              rgba(255, 107, 26, 0.15) 44%,
              rgba(255, 107, 26, 0.05) 74%
            );
          box-shadow:
            0 0 26px rgba(255, 107, 26, 0.13),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition:
            transform 160ms ease,
            box-shadow 160ms ease,
            border-color 160ms ease;
        }

        .html-to-pdf-convert-button:hover:not(:disabled) {
          transform: translateY(-2px);
          border-color: rgba(255, 170, 107, 0.5);
          box-shadow:
            0 0 34px rgba(255, 107, 26, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .html-to-pdf-convert-button:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .html-to-pdf-action-area p {
          margin: 11px 0 0;
          color: rgba(255, 255, 255, 0.34);
          font-size: 10px;
          text-align: center;
        }

        .html-to-pdf-success-card {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-top: 24px;
          padding: 16px 17px;
          border: 1px solid rgba(126, 255, 186, 0.13);
          border-radius: 17px;
          background: rgba(126, 255, 186, 0.035);
        }

        .html-to-pdf-success-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: rgba(126, 255, 186, 0.09);
          color: #a4ffca;
          font-size: 17px;
          font-weight: 800;
        }

        .html-to-pdf-success-content {
          min-width: 0;
          flex: 1;
        }

        .html-to-pdf-success-content > span {
          color: rgba(164, 255, 202, 0.65);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.14em;
        }

        .html-to-pdf-success-content h3 {
          overflow: hidden;
          margin: 4px 0;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .html-to-pdf-success-content p {
          margin: 0;
          color: rgba(255, 255, 255, 0.4);
          font-size: 10px;
        }

        .html-to-pdf-download-button {
          flex: 0 0 auto;
          min-height: 40px;
          padding: 0 15px;
          border: 1px solid rgba(126, 255, 186, 0.18);
          border-radius: 10px;
          background: rgba(126, 255, 186, 0.07);
          color: #c8ffdd;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .html-to-pdf-download-button:hover {
          background: rgba(126, 255, 186, 0.12);
        }

        .html-to-pdf-error-card {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-top: 24px;
          padding: 16px;
          border: 1px solid rgba(255, 86, 86, 0.16);
          border-radius: 16px;
          background: rgba(255, 86, 86, 0.04);
        }

        .html-to-pdf-error-icon {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: rgba(255, 86, 86, 0.09);
          color: #ff9d9d;
          font-weight: 800;
        }

        .html-to-pdf-error-card > div:nth-child(2) {
          min-width: 0;
          flex: 1;
        }

        .html-to-pdf-error-card strong {
          font-size: 12px;
        }

        .html-to-pdf-error-card p {
          margin: 5px 0 0;
          color: rgba(255, 255, 255, 0.43);
          font-size: 10px;
          line-height: 1.5;
        }

        .html-to-pdf-error-card button {
          flex: 0 0 auto;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.72);
          padding: 8px 11px;
          cursor: pointer;
          font-size: 10px;
        }

        @media (max-width: 900px) {
          .html-to-pdf-tool {
            padding: 24px 24px 32px;
          }

          .html-to-pdf-summary-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            );
          }

          .html-to-pdf-settings-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            );
          }

          .html-to-pdf-options-grid {
            max-width: 100%;
          }
        }

        @media (max-width: 620px) {
          .html-to-pdf-tool {
            padding: 20px 16px 26px;
          }

          .html-to-pdf-header {
            flex-direction: column;
          }

          .html-to-pdf-reset-button {
            align-self: flex-start;
          }

          .html-to-pdf-dropzone {
            min-height: 190px;
            padding: 25px 18px;
          }

          .html-to-pdf-summary-grid {
            grid-template-columns: 1fr 1fr;
          }

          .html-to-pdf-settings-grid,
          .html-to-pdf-options-grid {
            grid-template-columns: 1fr;
          }

          .html-to-pdf-section-heading {
            align-items: flex-start;
            flex-direction: column;
            gap: 7px;
          }

          .html-to-pdf-section-heading p {
            text-align: left;
          }

          .html-to-pdf-file-card {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .html-to-pdf-file-status {
            margin-left: 64px;
          }

          .html-to-pdf-success-card {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .html-to-pdf-download-button {
            width: 100%;
          }

          .html-to-pdf-error-card {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .html-to-pdf-editor-card textarea {
            min-height: 240px;
          }
        }
      `}</style>
    </>
  );
}

export default HtmlToPdf;