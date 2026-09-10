import { useEffect, useMemo, useState, useRef } from "react";
import {
  createRedaction,
  getRedactPdfInfo,
  redactPdf,
} from "../../../services/pdf/redactPdf.js";

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createRectFromDrag(start, end) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

function RedactPdf() {
  const [file, setFile] = useState(null);
  const [pdfInfo, setPdfInfo] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  const [redactions, setRedactions] = useState([]);
  const [selectedRedactionIndex, setSelectedRedactionIndex] =
    useState(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [drawPreview, setDrawPreview] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const [result, setResult] = useState(null);

  const [pdfUrl, setPdfUrl] = useState("");
  const [resultUrl, setResultUrl] = useState("");

  const canvasRef = useRef(null);

  const currentPageRedactions = useMemo(() => {
    return redactions
      .map((redaction, index) => ({
        ...redaction,
        originalIndex: index,
      }))
      .filter(
        (redaction) =>
          redaction.pageNumber === pageNumber
      );
  }, [redactions, pageNumber]);

  useEffect(() => {
    if (!file) {
      setPdfUrl("");
      return;
    }

    const url = URL.createObjectURL(file);

    setPdfUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    return () => {
      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }
    };
  }, [resultUrl]);

  useEffect(() => {
    if (!file) {
      return;
    }

    let cancelled = false;

    async function inspectPdf() {
      setIsLoading(true);
      setError("");
      setPdfInfo(null);
      setProgress(0);
      setRedactions([]);
      setSelectedRedactionIndex(null);
      setResult(null);

      try {
        const info = await getRedactPdfInfo(file);

        if (cancelled) {
          return;
        }

        setPdfInfo(info);
        setPageNumber(1);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError?.message ||
              "Unable to read this PDF."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    inspectPdf();

    return () => {
      cancelled = true;
    };
  }, [file]);

  function handleFile(selectedFile) {
    setError("");
    setResult(null);
    setProgress(0);
    setRedactions([]);
    setSelectedRedactionIndex(null);

    if (
      !selectedFile ||
      selectedFile.type !== "application/pdf"
    ) {
      setFile(null);
      setPdfInfo(null);
      setError("Please select a valid PDF file.");
      return;
    }

    setFile(selectedFile);
  }

  function getNormalizedPoint(event) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return null;
    }

    const bounds =
      canvas.getBoundingClientRect();

    if (!bounds.width || !bounds.height) {
      return null;
    }

    return {
      x: clamp(
        (event.clientX - bounds.left) /
          bounds.width,
        0,
        1
      ),
      y: clamp(
        (event.clientY - bounds.top) /
          bounds.height,
        0,
        1
      ),
    };
  }

  function handlePointerDown(event) {
    if (
      isProcessing ||
      isLoading ||
      !file ||
      !pdfInfo ||
      !canvasRef.current
    ) {
      return;
    }

    const point = getNormalizedPoint(event);

    if (!point) {
      return;
    }

    setError("");
    setSelectedRedactionIndex(null);
    setIsDrawing(true);
    setDrawStart(point);
    setDrawPreview({
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
    });

    canvasRef.current.setPointerCapture?.(
      event.pointerId
    );
  }

  function handlePointerMove(event) {
    if (!isDrawing || !drawStart) {
      return;
    }

    const point = getNormalizedPoint(event);

    if (!point) {
      return;
    }

    setDrawPreview(
      createRectFromDrag(drawStart, point)
    );
  }

  function handlePointerUp(event) {
    if (!isDrawing || !drawStart) {
      return;
    }

    const point = getNormalizedPoint(event);

    setIsDrawing(false);
    setDrawStart(null);
    setDrawPreview(null);

    canvasRef.current?.releasePointerCapture?.(
      event.pointerId
    );

    if (!point) {
      return;
    }

    const rect = createRectFromDrag(
      drawStart,
      point
    );

    if (
      rect.width < 0.02 ||
      rect.height < 0.012
    ) {
      return;
    }

    const redaction = createRedaction(
      pageNumber,
      rect,
      {
        color: [0, 0, 0],
      }
    );

    setRedactions((previous) => [
      ...previous,
      redaction,
    ]);

    setSelectedRedactionIndex(
      redactions.length
    );
  }

  function removeRedaction(index) {
    setRedactions((previous) =>
      previous.filter(
        (_, redactionIndex) =>
          redactionIndex !== index
      )
    );

    setSelectedRedactionIndex(null);
  }

  function clearRedactions() {
    setRedactions([]);
    setSelectedRedactionIndex(null);
    setError("");
    setResult(null);
  }

  function goToPage(nextPage) {
    if (!pdfInfo?.pageCount) {
      return;
    }

    setPageNumber(
      clamp(
        nextPage,
        1,
        pdfInfo.pageCount
      )
    );

    setSelectedRedactionIndex(null);
  }

  async function handleRedactPdf() {
    if (!file) {
      setError(
        "Please select a PDF file first."
      );
      return;
    }

    if (redactions.length === 0) {
      setError(
        "Please add at least one redaction area."
      );
      return;
    }

    setError("");
    setResult(null);
    setIsProcessing(true);
    setProgress(0);

    try {
      const processed = await redactPdf(
        file,
        redactions,
        {
          redactionColor: [0, 0, 0],
          scale: 2,
        },
        setProgress
      );

      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }

      const url = URL.createObjectURL(
        processed.blob
      );

      setResultUrl(url);

      setResult({
        pageCount: processed.pageCount,
        redactionCount:
          processed.redactionCount,
      });
    } catch (processError) {
      setError(
        processError?.message ||
          "Unable to redact this PDF."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  function resetTool() {
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
    }

    setFile(null);
    setPdfInfo(null);
    setPageNumber(1);

    setRedactions([]);
    setSelectedRedactionIndex(null);

    setIsDrawing(false);
    setDrawStart(null);
    setDrawPreview(null);

    setIsLoading(false);
    setIsProcessing(false);
    setProgress(0);
    setError("");

    setResult(null);
    setPdfUrl("");
    setResultUrl("");
  }

  return (
    <div className="redact-pdf">
      {!file && (
        <div className="redact-pdf-upload">
          <div className="redact-pdf-upload-icon">
            ▰
          </div>

          <h2>Redact your PDF</h2>

          <p>
            Permanently remove sensitive information
            by drawing redaction areas directly over
            the document.
          </p>

          <label className="redact-pdf-upload-button">
            Choose PDF

            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => {
                const selectedFile =
                  event.target.files?.[0];

                if (selectedFile) {
                  handleFile(selectedFile);
                }

                event.target.value = "";
              }}
            />
          </label>

          <span className="redact-pdf-upload-hint">
            or drag and drop a PDF
          </span>

          {error && (
            <div className="redact-pdf-upload-error">
              {error}
            </div>
          )}
        </div>
      )}

      {file && (
        <>
          <div className="redact-pdf-toolbar">
            <div className="redact-pdf-file">
              <div className="redact-pdf-file-icon">
                PDF
              </div>

              <div className="redact-pdf-file-details">
                <strong>{file.name}</strong>

                <span>
                  {formatFileSize(file.size)}
                </span>
              </div>
            </div>

            <div className="redact-pdf-toolbar-stats">
              <div>
                <strong>
                  {pdfInfo?.pageCount ?? "—"}
                </strong>
                <span>
                  {pdfInfo?.pageCount === 1
                    ? "page"
                    : "pages"}
                </span>
              </div>

              <div>
                <strong>
                  {redactions.length}
                </strong>
                <span>
                  {redactions.length === 1
                    ? "redaction"
                    : "redactions"}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="redact-pdf-change-button"
              onClick={resetTool}
              disabled={
                isLoading ||
                isProcessing
              }
            >
              Change PDF
            </button>
          </div>

          {isLoading ? (
            <div className="redact-pdf-loading">
              <div className="redact-pdf-loading-spinner" />

              <h3>
                Preparing document
              </h3>

              <p>
                Loading your PDF for redaction...
              </p>
            </div>
          ) : (
            <div className="redact-pdf-editor">
              <aside className="redact-pdf-sidebar">
                <section className="redact-pdf-section">
                  <span className="redact-pdf-label">
                    REDACTION
                  </span>

                  <div className="redact-pdf-instruction">
                    <div className="redact-pdf-instruction-icon">
                      ▰
                    </div>

                    <div>
                      <strong>
                        Draw to redact
                      </strong>

                      <p>
                        Drag over any sensitive
                        content on the page.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="redact-pdf-section">
                  <span className="redact-pdf-label">
                    PAGE
                  </span>

                  <div className="redact-pdf-page-controls">
                    <button
                      type="button"
                      onClick={() =>
                        goToPage(
                          pageNumber - 1
                        )
                      }
                      disabled={
                        isProcessing ||
                        pageNumber <= 1
                      }
                    >
                      ←
                    </button>

                    <span>
                      {pageNumber} /{" "}
                      {pdfInfo?.pageCount ??
                        "—"}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        goToPage(
                          pageNumber + 1
                        )
                      }
                      disabled={
                        isProcessing ||
                        pageNumber >=
                          (pdfInfo?.pageCount ||
                            1)
                      }
                    >
                      →
                    </button>
                  </div>
                </section>

                <section className="redact-pdf-section">
                  <div className="redact-pdf-section-heading">
                    <span className="redact-pdf-label">
                      REDACTIONS
                    </span>

                    <span className="redact-pdf-count">
                      {redactions.length}
                    </span>
                  </div>

                  <div className="redact-pdf-list">
                    {redactions.length ===
                      0 && (
                      <div className="redact-pdf-empty">
                        No redactions added yet.
                      </div>
                    )}

                    {redactions.map(
                      (
                        redaction,
                        index
                      ) => (
                        <button
                          key={index}
                          type="button"
                          className={
                            selectedRedactionIndex ===
                            index
                              ? "selected"
                              : ""
                          }
                          onClick={() => {
                            setPageNumber(
                              redaction.pageNumber
                            );

                            setSelectedRedactionIndex(
                              index
                            );
                          }}
                          disabled={
                            isProcessing
                          }
                        >
                          <span className="redact-pdf-list-number">
                            {String(
                              index + 1
                            ).padStart(
                              2,
                              "0"
                            )}
                          </span>

                          <div>
                            <strong>
                              Redaction{" "}
                              {index + 1}
                            </strong>

                            <small>
                              Page{" "}
                              {
                                redaction.pageNumber
                              }
                            </small>
                          </div>

                          <span
                            className="redact-pdf-list-remove"
                            onClick={(event) => {
                              event.stopPropagation();

                              removeRedaction(
                                index
                              );
                            }}
                          >
                            ×
                          </span>
                        </button>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    className="redact-pdf-clear-button"
                    onClick={clearRedactions}
                    disabled={
                      isProcessing ||
                      redactions.length === 0
                    }
                  >
                    Clear all redactions
                  </button>
                </section>

                <section className="redact-pdf-security-note">
                  <div className="redact-pdf-security-icon">
                    ✓
                  </div>

                  <div>
                    <strong>
                      Permanent redaction
                    </strong>

                    <p>
                      The output PDF is rebuilt
                      from rendered pixels so the
                      covered content is not retained
                      underneath the redaction.
                    </p>
                  </div>
                </section>

                {error && (
                  <div className="redact-pdf-error">
                    {error}
                  </div>
                )}
              </aside>

              <main className="redact-pdf-workspace">
                <div className="redact-pdf-preview-header">
                  <div>
                    <span className="redact-pdf-label">
                      DOCUMENT PREVIEW
                    </span>

                    <p>
                      Draw black boxes over the
                      information you want to remove.
                    </p>
                  </div>

                  <div className="redact-pdf-page-indicator">
                    Page {pageNumber}
                  </div>
                </div>

                <div className="redact-pdf-page-stage">
                  <div className="redact-pdf-page-shell">
                    {pdfUrl && (
                      <iframe
                        title="PDF redaction preview"
                        src={`${pdfUrl}#page=${pageNumber}&toolbar=0&navpanes=0&scrollbar=0`}
                        className="redact-pdf-preview"
                      />
                    )}

                    <div
                      ref={canvasRef}
                      className="redact-pdf-interaction-layer"
                      onPointerDown={
                        handlePointerDown
                      }
                      onPointerMove={
                        handlePointerMove
                      }
                      onPointerUp={
                        handlePointerUp
                      }
                      onPointerCancel={
                        handlePointerUp
                      }
                    >
                      {currentPageRedactions.map(
                        (redaction) => (
                          <div
                            key={
                              redaction.originalIndex
                            }
                            className={`redact-pdf-overlay ${
                              selectedRedactionIndex ===
                              redaction.originalIndex
                                ? "selected"
                                : ""
                            }`}
                            style={{
                              left:
                                `${redaction.x * 100}%`,
                              top:
                                `${redaction.y * 100}%`,
                              width:
                                `${redaction.width * 100}%`,
                              height:
                                `${redaction.height * 100}%`,
                            }}
                            onPointerDown={(event) => {
                              event.stopPropagation();

                              setSelectedRedactionIndex(
                                redaction.originalIndex
                              );
                            }}
                          >
                            <span>
                              REDACTED
                            </span>

                            {selectedRedactionIndex ===
                              redaction.originalIndex && (
                              <button
                                type="button"
                                className="redact-pdf-overlay-delete"
                                onClick={(event) => {
                                  event.stopPropagation();

                                  removeRedaction(
                                    redaction.originalIndex
                                  );
                                }}
                                aria-label="Delete redaction"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        )
                      )}

                      {drawPreview && (
                        <div
                          className="redact-pdf-draw-preview"
                          style={{
                            left:
                              `${drawPreview.x * 100}%`,
                            top:
                              `${drawPreview.y * 100}%`,
                            width:
                              `${drawPreview.width * 100}%`,
                            height:
                              `${drawPreview.height * 100}%`,
                          }}
                        >
                          <span>
                            REDACT
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="redact-pdf-preview-hint">
                  Drag anywhere on the page to
                  create a redaction area.
                </div>
              </main>
            </div>
          )}

          {!isLoading && (
            <div className="redact-pdf-bottom">
              <div className="redact-pdf-summary">
                <span>
                  {redactions.length}{" "}
                  {redactions.length === 1
                    ? "redaction"
                    : "redactions"}
                </span>

                <span>•</span>

                <span>
                  Page {pageNumber} of{" "}
                  {pdfInfo?.pageCount ?? "—"}
                </span>
              </div>

              {isProcessing ? (
                <div className="redact-pdf-progress">
                  <div className="redact-pdf-progress-header">
                    <span>
                      Permanently redacting PDF
                    </span>

                    <strong>
                      {progress}%
                    </strong>
                  </div>

                  <div className="redact-pdf-progress-track">
                    <div
                      className="redact-pdf-progress-fill"
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="redact-pdf-process-button"
                  onClick={
                    handleRedactPdf
                  }
                  disabled={
                    !file ||
                    redactions.length ===
                      0
                  }
                >
                  Permanently Redact
                  <span>→</span>
                </button>
              )}
            </div>
          )}

          {result && resultUrl && (
            <div className="redact-pdf-result">
              <div>
                <span className="redact-pdf-result-label">
                  COMPLETE
                </span>

                <h3>
                  Your redacted PDF is ready.
                </h3>

                <p>
                  {result.redactionCount}{" "}
                  {result.redactionCount ===
                  1
                    ? "area"
                    : "areas"}{" "}
                  permanently redacted across{" "}
                  {result.pageCount}{" "}
                  {result.pageCount === 1
                    ? "page"
                    : "pages"}.
                </p>
              </div>

              <a
                href={resultUrl}
                download={`redacted-${file.name}`}
                className="redact-pdf-download-button"
              >
                Download PDF
                <span>↓</span>
              </a>
            </div>
          )}
        </>
      )}

      <style>{`
        .redact-pdf {
          width: 100%;
          min-width: 0;
          color: rgba(255,255,255,0.94);
        }

        .redact-pdf-upload {
          width: 100%;
          min-height: 500px;
          box-sizing: border-box;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 28px;
          background:
            linear-gradient(
              135deg,
              rgba(255,255,255,0.075),
              rgba(255,255,255,0.025)
            );
          backdrop-filter: blur(20px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 48px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.08),
            0 24px 80px rgba(0,0,0,0.22);
        }

        .redact-pdf-upload-icon {
          width: 72px;
          height: 72px;
          border-radius: 21px;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(
              circle at center,
              rgba(255,115,35,0.35),
              rgba(255,115,35,0.07) 68%,
              transparent 76%
            );
          color: #ff8d4a;
          font-size: 26px;
          margin-bottom: 20px;
        }

        .redact-pdf-upload h2 {
          margin: 0;
          font-size: 28px;
          letter-spacing: -0.03em;
        }

        .redact-pdf-upload p {
          max-width: 520px;
          margin: 10px 0 26px;
          color: rgba(255,255,255,0.52);
          font-size: 14px;
          line-height: 1.55;
        }

        .redact-pdf-upload-button {
          cursor: pointer;
          padding: 13px 22px;
          border-radius: 14px;
          color: white;
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(255,150,80,0.65),
              rgba(255,94,0,0.9)
            );
          box-shadow:
            0 12px 32px rgba(255,92,0,0.22);
          font-size: 14px;
          font-weight: 700;
        }

        .redact-pdf-upload-button input {
          display: none;
        }

        .redact-pdf-upload-hint {
          margin-top: 13px;
          color: rgba(255,255,255,0.28);
          font-size: 11px;
        }

        .redact-pdf-upload-error {
          margin-top: 17px;
          padding: 9px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255,80,55,0.18);
          background: rgba(255,70,50,0.07);
          color: #ff9b84;
          font-size: 10px;
        }

        .redact-pdf-toolbar {
          width: 100%;
          min-width: 0;
          min-height: 72px;
          box-sizing: border-box;
          display: grid;
          grid-template-columns:
            minmax(180px, 1fr)
            auto
            auto;
          align-items: center;
          gap: 18px;
          padding: 12px 14px;
          margin-bottom: 18px;
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 20px;
          background:
            linear-gradient(
              135deg,
              rgba(255,255,255,0.06),
              rgba(255,255,255,0.025)
            );
          backdrop-filter: blur(18px);
        }

        .redact-pdf-file {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .redact-pdf-file-icon {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 800;
          color: #ff8b47;
          background: rgba(255,112,37,0.11);
          border: 1px solid rgba(255,123,54,0.18);
        }

        .redact-pdf-file-details {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .redact-pdf-file-details strong {
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
        }

        .redact-pdf-file-details span {
          color: rgba(255,255,255,0.35);
          font-size: 10px;
        }

        .redact-pdf-toolbar-stats {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .redact-pdf-toolbar-stats div {
          display: flex;
          align-items: baseline;
          gap: 5px;
        }

        .redact-pdf-toolbar-stats strong {
          color: #ff9658;
          font-size: 19px;
        }

        .redact-pdf-toolbar-stats span {
          color: rgba(255,255,255,0.32);
          font-size: 9px;
        }

        .redact-pdf-change-button {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
          color: rgba(255,255,255,0.68);
          border-radius: 11px;
          padding: 10px 13px;
          white-space: nowrap;
          cursor: pointer;
          font-size: 11px;
        }

        .redact-pdf-change-button:hover {
          color: white;
          background: rgba(255,255,255,0.07);
        }

        .redact-pdf-loading {
          width: 100%;
          min-height: 600px;
          box-sizing: border-box;
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background:
            linear-gradient(
              135deg,
              rgba(255,255,255,0.055),
              rgba(255,255,255,0.018)
            );
        }

        .redact-pdf-loading-spinner {
          width: 34px;
          height: 34px;
          margin-bottom: 18px;
          border: 2px solid rgba(255,255,255,0.08);
          border-top-color: #ff7530;
          border-radius: 50%;
          animation:
            redactPdfSpin 0.85s linear infinite;
        }

        @keyframes redactPdfSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .redact-pdf-loading h3 {
          margin: 0;
          font-size: 16px;
        }

        .redact-pdf-loading p {
          margin: 7px 0 0;
          color: rgba(255,255,255,0.35);
          font-size: 11px;
        }

        .redact-pdf-editor {
          width: 100%;
          min-width: 0;
          min-height: 650px;
          box-sizing: border-box;
          display: grid;
          grid-template-columns:
            minmax(290px, 330px)
            minmax(0,1fr);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 24px;
          overflow: hidden;
          background:
            linear-gradient(
              135deg,
              rgba(255,255,255,0.055),
              rgba(255,255,255,0.018)
            );
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.05),
            0 20px 60px rgba(0,0,0,0.18);
        }

        .redact-pdf-sidebar {
          min-width: 0;
          box-sizing: border-box;
          padding: 22px;
          overflow-x: hidden;
          overflow-y: auto;
          border-right: 1px solid rgba(255,255,255,0.07);
          background: rgba(7,7,7,0.24);
        }

        .redact-pdf-section {
          min-width: 0;
          padding-bottom: 20px;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .redact-pdf-section:last-of-type {
          margin-bottom: 18px;
        }

        .redact-pdf-label {
          display: block;
          margin-bottom: 10px;
          color: rgba(255,255,255,0.32);
          font-size: 9px;
          letter-spacing: 0.18em;
          font-weight: 800;
        }

        .redact-pdf-instruction {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          padding: 11px;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          background: rgba(255,255,255,0.025);
        }

        .redact-pdf-instruction-icon {
          width: 30px;
          height: 30px;
          flex: 0 0 30px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #161616;
          color: #ff7c36;
          font-size: 11px;
        }

        .redact-pdf-instruction strong {
          display: block;
          margin-bottom: 3px;
          font-size: 11px;
        }

        .redact-pdf-instruction p {
          margin: 0;
          color: rgba(255,255,255,0.3);
          font-size: 9px;
          line-height: 1.5;
        }

        .redact-pdf-page-controls {
          display: grid;
          grid-template-columns: 36px 1fr 36px;
          gap: 7px;
          align-items: center;
        }

        .redact-pdf-page-controls button {
          height: 34px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
          color: rgba(255,255,255,0.72);
          border-radius: 9px;
          cursor: pointer;
        }

        .redact-pdf-page-controls button:hover:not(:disabled) {
          background: rgba(255,255,255,0.07);
        }

        .redact-pdf-page-controls button:disabled {
          opacity: 0.25;
          cursor: not-allowed;
        }

        .redact-pdf-page-controls span {
          text-align: center;
          color: rgba(255,255,255,0.6);
          font-size: 11px;
        }

        .redact-pdf-section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .redact-pdf-section-heading .redact-pdf-label {
          margin-bottom: 10px;
        }

        .redact-pdf-count {
          min-width: 24px;
          height: 24px;
          padding: 0 6px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          color: #ff995b;
          background: rgba(255,108,31,0.08);
          border: 1px solid rgba(255,108,31,0.13);
          font-size: 9px;
          font-weight: 700;
        }

        .redact-pdf-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 240px;
          overflow-y: auto;
          margin-bottom: 10px;
        }

        .redact-pdf-list button {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          display: grid;
          grid-template-columns:
            27px
            minmax(0,1fr)
            20px;
          align-items: center;
          gap: 8px;
          padding: 8px;
          text-align: left;
          border: 1px solid transparent;
          border-radius: 10px;
          background: rgba(255,255,255,0.025);
          color: rgba(255,255,255,0.7);
          cursor: pointer;
        }

        .redact-pdf-list button:hover,
        .redact-pdf-list button.selected {
          background: rgba(255,80,40,0.08);
          border-color: rgba(255,100,45,0.2);
        }

        .redact-pdf-list-number {
          width: 25px;
          height: 25px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 7px;
          background: rgba(0,0,0,0.25);
          color: #ff8550;
          font-size: 8px;
          font-weight: 700;
        }

        .redact-pdf-list button > div {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .redact-pdf-list strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 10px;
        }

        .redact-pdf-list small {
          color: rgba(255,255,255,0.28);
          font-size: 8px;
        }

        .redact-pdf-list-remove {
          color: rgba(255,255,255,0.3);
          font-size: 16px;
          cursor: pointer;
        }

        .redact-pdf-list-remove:hover {
          color: #ff8b52;
        }

        .redact-pdf-empty {
          padding: 11px;
          border-radius: 10px;
          color: rgba(255,255,255,0.27);
          background: rgba(255,255,255,0.025);
          font-size: 10px;
        }

        .redact-pdf-clear-button {
          width: 100%;
          box-sizing: border-box;
          padding: 9px;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 9px;
          background: rgba(255,255,255,0.025);
          color: rgba(255,255,255,0.42);
          font-size: 10px;
          cursor: pointer;
        }

        .redact-pdf-clear-button:hover:not(:disabled) {
          color: white;
          background: rgba(255,255,255,0.06);
        }

        .redact-pdf-clear-button:disabled {
          opacity: 0.25;
          cursor: not-allowed;
        }

        .redact-pdf-security-note {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          border: 1px solid rgba(102,255,170,0.1);
          border-radius: 12px;
          background: rgba(102,255,170,0.035);
        }

        .redact-pdf-security-icon {
          width: 22px;
          height: 22px;
          flex: 0 0 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(101,217,150,0.12);
          color: #82dca6;
          font-size: 10px;
          font-weight: 700;
        }

        .redact-pdf-security-note strong {
          display: block;
          margin-bottom: 4px;
          color: rgba(255,255,255,0.68);
          font-size: 10px;
        }

        .redact-pdf-security-note p {
          margin: 0;
          color: rgba(255,255,255,0.28);
          font-size: 8px;
          line-height: 1.5;
        }

        .redact-pdf-error {
          margin-top: 15px;
          padding: 10px 11px;
          border: 1px solid rgba(255,80,55,0.18);
          border-radius: 10px;
          background: rgba(255,70,50,0.07);
          color: #ff9b84;
          font-size: 10px;
          line-height: 1.45;
        }

        .redact-pdf-workspace {
          min-width: 0;
          display: flex;
          flex-direction: column;
          background:
            radial-gradient(
              circle at 50% 30%,
              rgba(255,111,37,0.045),
              transparent 38%
            ),
            #090909;
        }

        .redact-pdf-preview-header {
          min-width: 0;
          padding: 18px 20px 0;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
        }

        .redact-pdf-preview-header > div:first-child {
          min-width: 0;
        }

        .redact-pdf-preview-header .redact-pdf-label {
          margin-bottom: 4px;
        }

        .redact-pdf-preview-header p {
          margin: 0;
          color: rgba(255,255,255,0.28);
          font-size: 9px;
          line-height: 1.45;
        }

        .redact-pdf-page-indicator {
          flex: 0 0 auto;
          padding: 6px 9px;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 999px;
          color: rgba(255,255,255,0.28);
          background: rgba(255,255,255,0.02);
          font-size: 8px;
        }

        .redact-pdf-page-stage {
          flex: 1;
          min-height: 540px;
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 30px;
          overflow: auto;
        }

        .redact-pdf-page-shell {
          position: relative;
          width: min(100%, 740px);
          aspect-ratio: 0.707;
          flex: 0 0 auto;
          background: white;
          border-radius: 2px;
          overflow: hidden;
          box-shadow:
            0 24px 60px rgba(0,0,0,0.45);
        }

        .redact-pdf-preview {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: 0;
          background: white;
          pointer-events: none;
        }

        .redact-pdf-interaction-layer {
          position: absolute;
          inset: 0;
          cursor: crosshair;
          touch-action: none;
        }

        .redact-pdf-overlay {
          position: absolute;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: visible;
          background: #050505;
          border: 1px solid rgba(255,255,255,0.35);
          color: white;
          user-select: none;
        }

        .redact-pdf-overlay > span {
          color: rgba(255,255,255,0.42);
          font-size: clamp(6px, 0.75vw, 9px);
          letter-spacing: 0.15em;
          font-weight: 800;
          pointer-events: none;
        }

        .redact-pdf-overlay.selected {
          border-color: #ff722b;
          box-shadow:
            0 0 0 2px rgba(255,114,43,0.18);
        }

        .redact-pdf-overlay-delete {
          position: absolute;
          top: -13px;
          right: -13px;
          width: 25px;
          height: 25px;
          border: 1px solid rgba(255,255,255,0.35);
          border-radius: 999px;
          background: #191919;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }

        .redact-pdf-draw-preview {
          position: absolute;
          box-sizing: border-box;
          border: 1px dashed #ff7d38;
          background: rgba(0,0,0,0.76);
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .redact-pdf-draw-preview span {
          color: rgba(255,255,255,0.45);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.15em;
        }

        .redact-pdf-preview-hint {
          padding: 11px 18px 14px;
          text-align: center;
          color: rgba(255,255,255,0.28);
          font-size: 10px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .redact-pdf-bottom {
          width: 100%;
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-top: 16px;
          padding: 15px 2px 0;
        }

        .redact-pdf-summary {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 9px;
          flex-wrap: wrap;
          color: rgba(255,255,255,0.38);
          font-size: 11px;
        }

        .redact-pdf-process-button,
        .redact-pdf-download-button {
          border: 0;
          border-radius: 13px;
          padding: 12px 17px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: white;
          text-decoration: none;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(255,154,94,0.85),
              #ff5e0b
            );
          box-shadow:
            0 10px 28px rgba(255,83,0,0.2);
        }

        .redact-pdf-process-button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
          box-shadow: none;
        }

        .redact-pdf-progress {
          width: min(380px, 45%);
          min-width: 180px;
        }

        .redact-pdf-progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 7px;
          color: rgba(255,255,255,0.45);
          font-size: 10px;
        }

        .redact-pdf-progress-header strong {
          color: #ff985b;
        }

        .redact-pdf-progress-track {
          height: 5px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
        }

        .redact-pdf-progress-fill {
          height: 100%;
          border-radius: inherit;
          background:
            linear-gradient(
              90deg,
              #ff5310,
              #ff9b5b
            );
          transition:
            width 0.2s ease;
        }

        .redact-pdf-result {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          margin-top: 18px;
          padding: 20px 22px;
          border: 1px solid rgba(102,255,170,0.12);
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          background:
            linear-gradient(
              135deg,
              rgba(102,255,170,0.045),
              rgba(255,255,255,0.025)
            );
        }

        .redact-pdf-result > div:first-child {
          min-width: 0;
        }

        .redact-pdf-result-label {
          color: #8de0ad;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.16em;
        }

        .redact-pdf-result h3 {
          margin: 6px 0 4px;
          font-size: 15px;
        }

        .redact-pdf-result p {
          margin: 0;
          color: rgba(255,255,255,0.42);
          font-size: 10px;
          line-height: 1.4;
        }

        @media (max-width: 1000px) {
          .redact-pdf-toolbar {
            grid-template-columns:
              minmax(0, 1fr)
              auto;
          }

          .redact-pdf-change-button {
            grid-column: 2;
          }
        }

        @media (max-width: 850px) {
          .redact-pdf-editor {
            grid-template-columns: 1fr;
          }

          .redact-pdf-sidebar {
            border-right: 0;
            border-bottom: 1px solid rgba(255,255,255,0.07);
          }

          .redact-pdf-page-stage {
            min-height: 480px;
          }

          .redact-pdf-toolbar {
            grid-template-columns: 1fr;
          }

          .redact-pdf-change-button {
            grid-column: auto;
            justify-self: start;
          }
        }

        @media (max-width: 600px) {
          .redact-pdf-upload {
            min-height: 400px;
            padding: 28px 20px;
          }

          .redact-pdf-upload h2 {
            font-size: 24px;
          }

          .redact-pdf-toolbar {
            gap: 12px;
          }

          .redact-pdf-editor {
            border-radius: 18px;
          }

          .redact-pdf-sidebar {
            padding: 17px;
          }

          .redact-pdf-page-stage {
            min-height: 400px;
            padding: 12px;
          }

          .redact-pdf-preview-header {
            padding: 15px 15px 0;
          }

          .redact-pdf-bottom,
          .redact-pdf-result {
            align-items: stretch;
            flex-direction: column;
          }

          .redact-pdf-progress {
            width: 100%;
            min-width: 0;
          }

          .redact-pdf-process-button,
          .redact-pdf-download-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default RedactPdf;
