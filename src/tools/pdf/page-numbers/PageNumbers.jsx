import { useEffect, useMemo, useState } from "react";
import {
  addPageNumbers,
  getPageNumbersPdfInfo,
} from "../../../services/pdf/pageNumbers.js";

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

function getPreviewLabel(format, currentPage, pageCount, startNumber) {
  const pageValue =
    Number(startNumber) + currentPage - 1;

  const totalValue =
    Number(startNumber) + pageCount - 1;

  if (format === "page-of-total") {
    return `${pageValue} of ${totalValue}`;
  }

  if (format === "page-total") {
    return `${pageValue}/${totalValue}`;
  }

  return `${pageValue}`;
}

function PageNumbers() {
  const [file, setFile] = useState(null);
  const [pdfInfo, setPdfInfo] = useState(null);

  const [pageNumber, setPageNumber] = useState(1);

  const [position, setPosition] =
    useState("bottom-center");

  const [format, setFormat] =
    useState("number");

  const [startNumber, setStartNumber] =
    useState(1);

  const [font, setFont] =
    useState("helvetica");

  const [fontSize, setFontSize] =
    useState(11);

  const [margin, setMargin] =
    useState(28);

  const [opacity, setOpacity] =
    useState(100);

  const [pageSelection, setPageSelection] =
    useState("all");

  const [customPages, setCustomPages] =
    useState("");

  const [pdfUrl, setPdfUrl] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const [isProcessing, setIsProcessing] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [error, setError] =
    useState("");

  const [result, setResult] =
    useState(null);

  const [resultUrl, setResultUrl] =
    useState("");

  const previewLabel = useMemo(() => {
    if (!pdfInfo?.pageCount) {
      return "1";
    }

    return getPreviewLabel(
      format,
      pageNumber,
      pdfInfo.pageCount,
      startNumber
    );
  }, [
    format,
    pageNumber,
    pdfInfo,
    startNumber,
  ]);

  const pageSelectionLabel = useMemo(() => {
    if (pageSelection === "all") {
      return "All pages";
    }

    if (pageSelection === "odd") {
      return "Odd pages";
    }

    if (pageSelection === "even") {
      return "Even pages";
    }

    return customPages.trim()
      ? `Pages ${customPages}`
      : "Custom pages";
  }, [pageSelection, customPages]);

  useEffect(() => {
    if (!file) {
      setPdfUrl("");
      return;
    }

    const url =
      URL.createObjectURL(file);

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
      setPageNumber(1);
      setResult(null);
      setProgress(0);

      try {
        const info =
          await getPageNumbersPdfInfo(file);

        if (cancelled) {
          return;
        }

        setPdfInfo(info);
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

    if (
      !selectedFile ||
      selectedFile.type !==
        "application/pdf"
    ) {
      setFile(null);
      setPdfInfo(null);

      setError(
        "Please select a valid PDF file."
      );

      return;
    }

    setFile(selectedFile);
  }

  function parseCustomPages() {
    if (!customPages.trim()) {
      return [];
    }

    const pages =
      customPages
        .split(",")
        .flatMap((part) => {
          const trimmed =
            part.trim();

          if (
            trimmed.includes("-")
          ) {
            const [start, end] =
              trimmed
                .split("-")
                .map(Number);

            if (
              Number.isInteger(start) &&
              Number.isInteger(end)
            ) {
              const low =
                Math.min(
                  start,
                  end
                );

              const high =
                Math.max(
                  start,
                  end
                );

              return Array.from(
                {
                  length:
                    high -
                    low +
                    1,
                },
                (_, index) =>
                  low + index
              );
            }
          }

          const value =
            Number(trimmed);

          return Number.isInteger(
            value
          )
            ? [value]
            : [];
        })
        .filter(
          (page) =>
            page >= 1 &&
            page <=
              (pdfInfo?.pageCount ||
                1)
        );

    return [
      ...new Set(pages),
    ].sort(
      (a, b) => a - b
    );
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
  }

  async function handleApplyPageNumbers() {
    if (!file) {
      setError(
        "Please select a PDF file first."
      );

      return;
    }

    if (
      !pdfInfo?.pageCount
    ) {
      setError(
        "Unable to determine the PDF page count."
      );

      return;
    }

    let resolvedPageSelection =
      pageSelection;

    let resolvedCustomPages =
      [];

    if (
      pageSelection ===
      "custom"
    ) {
      resolvedCustomPages =
        parseCustomPages();

      if (
        resolvedCustomPages.length ===
        0
      ) {
        setError(
          "Enter valid page numbers for the custom selection."
        );

        return;
      }

      resolvedPageSelection =
        "custom";
    }

    setError("");
    setResult(null);
    setIsProcessing(true);
    setProgress(0);

    try {
      const processed =
        await addPageNumbers(
          file,
          {
            position,
            format,
            startNumber:
              Number(
                startNumber
              ),
            font,
            fontSize:
              Number(fontSize),
            margin:
              Number(margin),
            opacity:
              Number(opacity) / 100,
            pageSelection:
              resolvedPageSelection,
            customPages:
              resolvedCustomPages,
            color: [
              80,
              80,
              80,
            ],
          },
          setProgress
        );

      if (resultUrl) {
        URL.revokeObjectURL(
          resultUrl
        );
      }

      const url =
        URL.createObjectURL(
          processed.blob
        );

      setResultUrl(url);

      setResult({
        pageCount:
          processed.pageCount,
        numberedPages:
          processed.numberedPages,
        startNumber:
          processed.startNumber,
        format:
          processed.format,
        position:
          processed.position,
      });
    } catch (processError) {
      setError(
        processError?.message ||
          "Unable to add page numbers."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  function resetTool() {
    if (resultUrl) {
      URL.revokeObjectURL(
        resultUrl
      );
    }

    setFile(null);
    setPdfInfo(null);
    setPageNumber(1);

    setPosition(
      "bottom-center"
    );
    setFormat("number");
    setStartNumber(1);
    setFont("helvetica");
    setFontSize(11);
    setMargin(28);
    setOpacity(100);

    setPageSelection("all");
    setCustomPages("");

    setPdfUrl("");
    setIsLoading(false);
    setIsProcessing(false);
    setProgress(0);
    setError("");
    setResult(null);
    setResultUrl("");
  }

  return (
    <div className="page-numbers">
      {!file && (
        <div className="page-numbers-upload">
          <div className="page-numbers-upload-icon">
            #
          </div>

          <h2>
            Add page numbers
          </h2>

          <p>
            Number your PDF pages with
            flexible positioning, formatting,
            and page selection.
          </p>

          <label className="page-numbers-upload-button">
            Choose PDF

            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => {
                const selectedFile =
                  event.target.files?.[0];

                if (selectedFile) {
                  handleFile(
                    selectedFile
                  );
                }

                event.target.value =
                  "";
              }}
            />
          </label>

          <span className="page-numbers-upload-hint">
            or drag and drop a PDF
          </span>

          {error && (
            <div className="page-numbers-upload-error">
              {error}
            </div>
          )}
        </div>
      )}

      {file && (
        <>
          <div className="page-numbers-toolbar">
            <div className="page-numbers-file">
              <div className="page-numbers-file-icon">
                PDF
              </div>

              <div className="page-numbers-file-details">
                <strong>
                  {file.name}
                </strong>

                <span>
                  {formatFileSize(
                    file.size
                  )}
                </span>
              </div>
            </div>

            <div className="page-numbers-toolbar-stats">
              <div>
                <strong>
                  {pdfInfo?.pageCount ??
                    "—"}
                </strong>

                <span>
                  {pdfInfo?.pageCount ===
                  1
                    ? "page"
                    : "pages"}
                </span>
              </div>

              <div>
                <strong>
                  {previewLabel}
                </strong>

                <span>
                  preview
                </span>
              </div>
            </div>

            <button
              type="button"
              className="page-numbers-change-button"
              onClick={
                resetTool
              }
              disabled={
                isLoading ||
                isProcessing
              }
            >
              Change PDF
            </button>
          </div>

          {isLoading ? (
            <div className="page-numbers-loading">
              <div className="page-numbers-spinner" />

              <h3>
                Preparing document
              </h3>

              <p>
                Loading your PDF...
              </p>
            </div>
          ) : (
            <div className="page-numbers-editor">
              <aside className="page-numbers-sidebar">
                <section className="page-numbers-section">
                  <span className="page-numbers-label">
                    POSITION
                  </span>

                  <div className="page-numbers-position-grid">
                    {[
                      [
                        "top-left",
                        "↖",
                      ],
                      [
                        "top-center",
                        "↑",
                      ],
                      [
                        "top-right",
                        "↗",
                      ],
                      [
                        "middle-left",
                        "←",
                      ],
                      [
                        "center",
                        "•",
                      ],
                      [
                        "middle-right",
                        "→",
                      ],
                      [
                        "bottom-left",
                        "↙",
                      ],
                      [
                        "bottom-center",
                        "↓",
                      ],
                      [
                        "bottom-right",
                        "↘",
                      ],
                    ].map(
                      ([
                        value,
                        icon,
                      ]) => (
                        <button
                          key={value}
                          type="button"
                          className={
                            position ===
                            value
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            setPosition(
                              value
                            )
                          }
                          disabled={
                            isProcessing
                          }
                          aria-label={
                            value
                          }
                          title={
                            value
                          }
                        >
                          {icon}
                        </button>
                      )
                    )}
                  </div>
                </section>

                <section className="page-numbers-section">
                  <span className="page-numbers-label">
                    FORMAT
                  </span>

                  <div className="page-numbers-format-options">
                    <button
                      type="button"
                      className={
                        format ===
                        "number"
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setFormat(
                          "number"
                        )
                      }
                      disabled={
                        isProcessing
                      }
                    >
                      1
                    </button>

                    <button
                      type="button"
                      className={
                        format ===
                        "page-of-total"
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setFormat(
                          "page-of-total"
                        )
                      }
                      disabled={
                        isProcessing
                      }
                    >
                      1 of 10
                    </button>

                    <button
                      type="button"
                      className={
                        format ===
                        "page-total"
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setFormat(
                          "page-total"
                        )
                      }
                      disabled={
                        isProcessing
                      }
                    >
                      1/10
                    </button>
                  </div>
                </section>

                <section className="page-numbers-section">
                  <span className="page-numbers-label">
                    STYLE
                  </span>

                  <label className="page-numbers-field">
                    <span>
                      Font
                    </span>

                    <select
                      value={font}
                      onChange={(
                        event
                      ) =>
                        setFont(
                          event.target
                            .value
                        )
                      }
                      disabled={
                        isProcessing
                      }
                    >
                      <option value="helvetica">
                        Helvetica
                      </option>

                      <option value="helvetica-bold">
                        Helvetica Bold
                      </option>

                      <option value="times">
                        Times
                      </option>

                      <option value="times-bold">
                        Times Bold
                      </option>

                      <option value="courier">
                        Courier
                      </option>
                    </select>
                  </label>

                  <label className="page-numbers-field">
                    <span>
                      Size
                    </span>

                    <input
                      type="number"
                      min="4"
                      max="72"
                      value={
                        fontSize
                      }
                      onChange={(
                        event
                      ) =>
                        setFontSize(
                          clamp(
                            Number(
                              event.target
                                .value
                            ) ||
                              11,
                            4,
                            72
                          )
                        )
                      }
                      disabled={
                        isProcessing
                      }
                    />
                  </label>

                  <label className="page-numbers-field">
                    <span>
                      Start at
                    </span>

                    <input
                      type="number"
                      min="1"
                      max="999999"
                      value={
                        startNumber
                      }
                      onChange={(
                        event
                      ) =>
                        setStartNumber(
                          clamp(
                            Math.floor(
                              Number(
                                event.target
                                  .value
                              ) ||
                                1
                            ),
                            1,
                            999999
                          )
                        )
                      }
                      disabled={
                        isProcessing
                      }
                    />
                  </label>
                </section>

                <section className="page-numbers-section">
                  <span className="page-numbers-label">
                    SPACING
                  </span>

                  <label className="page-numbers-range">
                    <div>
                      <span>
                        Margin
                      </span>

                      <strong>
                        {margin} pt
                      </strong>
                    </div>

                    <input
                      type="range"
                      min="5"
                      max="80"
                      value={
                        margin
                      }
                      onChange={(
                        event
                      ) =>
                        setMargin(
                          Number(
                            event.target
                              .value
                          )
                        )
                      }
                      disabled={
                        isProcessing
                      }
                    />
                  </label>

                  <label className="page-numbers-range">
                    <div>
                      <span>
                        Opacity
                      </span>

                      <strong>
                        {opacity}%
                      </strong>
                    </div>

                    <input
                      type="range"
                      min="20"
                      max="100"
                      value={
                        opacity
                      }
                      onChange={(
                        event
                      ) =>
                        setOpacity(
                          Number(
                            event.target
                              .value
                          )
                        )
                      }
                      disabled={
                        isProcessing
                      }
                    />
                  </label>
                </section>

                <section className="page-numbers-section">
                  <span className="page-numbers-label">
                    PAGES
                  </span>

                  <div className="page-numbers-page-options">
                    <button
                      type="button"
                      className={
                        pageSelection ===
                        "all"
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setPageSelection(
                          "all"
                        )
                      }
                      disabled={
                        isProcessing
                      }
                    >
                      All
                    </button>

                    <button
                      type="button"
                      className={
                        pageSelection ===
                        "odd"
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setPageSelection(
                          "odd"
                        )
                      }
                      disabled={
                        isProcessing
                      }
                    >
                      Odd
                    </button>

                    <button
                      type="button"
                      className={
                        pageSelection ===
                        "even"
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setPageSelection(
                          "even"
                        )
                      }
                      disabled={
                        isProcessing
                      }
                    >
                      Even
                    </button>

                    <button
                      type="button"
                      className={
                        pageSelection ===
                        "custom"
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setPageSelection(
                          "custom"
                        )
                      }
                      disabled={
                        isProcessing
                      }
                    >
                      Custom
                    </button>
                  </div>

                  {pageSelection ===
                    "custom" && (
                    <input
                      className="page-numbers-custom-pages"
                      type="text"
                      value={
                        customPages
                      }
                      onChange={(
                        event
                      ) =>
                        setCustomPages(
                          event.target
                            .value
                        )
                      }
                      placeholder="1, 3, 5-8"
                      disabled={
                        isProcessing
                      }
                    />
                  )}

                  <div className="page-numbers-selection-summary">
                    {pageSelectionLabel}
                  </div>
                </section>

                {error && (
                  <div className="page-numbers-error">
                    {error}
                  </div>
                )}
              </aside>

              <main className="page-numbers-workspace">
                <div className="page-numbers-preview-header">
                  <div>
                    <span className="page-numbers-label">
                      DOCUMENT PREVIEW
                    </span>

                    <p>
                      Preview the page number
                      position and style.
                    </p>
                  </div>

                  <div className="page-numbers-page-controls">
                    <button
                      type="button"
                      onClick={() =>
                        goToPage(
                          pageNumber -
                            1
                        )
                      }
                      disabled={
                        isProcessing ||
                        pageNumber <=
                          1
                      }
                    >
                      ←
                    </button>

                    <span>
                      {pageNumber} /{" "}
                      {
                        pdfInfo?.pageCount
                      }
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        goToPage(
                          pageNumber +
                            1
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
                </div>

                <div className="page-numbers-page-stage">
                  <div className="page-numbers-page-shell">
                    {pdfUrl && (
                      <iframe
                        title="PDF page number preview"
                        src={`${pdfUrl}#page=${pageNumber}&toolbar=0&navpanes=0&scrollbar=0`}
                        className="page-numbers-pdf-preview"
                      />
                    )}

                    <div className="page-numbers-preview-overlay">
                      <div
                        className={`page-numbers-preview-number page-position-${position}`}
                        style={{
                          fontSize:
                            `${Math.max(
                              9,
                              fontSize *
                                0.8
                            )}px`,
                          opacity:
                            opacity /
                            100,
                          margin:
                            `${Math.max(
                              3,
                              margin /
                                4
                            )}px`,
                        }}
                      >
                        {previewLabel}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="page-numbers-preview-hint">
                  Page numbers will be added directly
                  to the PDF.
                </div>
              </main>
            </div>
          )}

          {!isLoading && (
            <div className="page-numbers-bottom">
              <div className="page-numbers-summary">
                <span>
                  {pageSelectionLabel}
                </span>

                <span>•</span>

                <span>
                  {position}
                </span>
              </div>

              {isProcessing ? (
                <div className="page-numbers-progress">
                  <div className="page-numbers-progress-header">
                    <span>
                      Adding page numbers
                    </span>

                    <strong>
                      {progress}%
                    </strong>
                  </div>

                  <div className="page-numbers-progress-track">
                    <div
                      className="page-numbers-progress-fill"
                      style={{
                        width:
                          `${progress}%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="page-numbers-process-button"
                  onClick={
                    handleApplyPageNumbers
                  }
                  disabled={
                    !file ||
                    !pdfInfo
                  }
                >
                  Add Page Numbers
                  <span>→</span>
                </button>
              )}
            </div>
          )}

          {result && resultUrl && (
            <div className="page-numbers-result">
              <div>
                <span className="page-numbers-result-label">
                  COMPLETE
                </span>

                <h3>
                  Your numbered PDF is ready.
                </h3>

                <p>
                  {result.numberedPages}{" "}
                  {result.numberedPages ===
                  1
                    ? "page"
                    : "pages"}{" "}
                  numbered starting at{" "}
                  {result.startNumber}.
                </p>
              </div>

              <a
                href={resultUrl}
                download={`numbered-${file.name}`}
                className="page-numbers-download-button"
              >
                Download PDF
                <span>↓</span>
              </a>
            </div>
          )}
        </>
      )}

      <style>{`
        .page-numbers {
          width: 100%;
          min-width: 0;
          color: rgba(255,255,255,0.94);
        }

        .page-numbers-upload {
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

        .page-numbers-upload-icon {
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
          font-size: 28px;
          font-weight: 800;
          margin-bottom: 20px;
        }

        .page-numbers-upload h2 {
          margin: 0;
          font-size: 28px;
          letter-spacing: -0.03em;
        }

        .page-numbers-upload p {
          max-width: 510px;
          margin: 10px 0 26px;
          color: rgba(255,255,255,0.52);
          font-size: 14px;
          line-height: 1.55;
        }

        .page-numbers-upload-button {
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

        .page-numbers-upload-button input {
          display: none;
        }

        .page-numbers-upload-hint {
          margin-top: 13px;
          color: rgba(255,255,255,0.28);
          font-size: 11px;
        }

        .page-numbers-upload-error {
          margin-top: 17px;
          padding: 9px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255,80,55,0.18);
          background: rgba(255,70,50,0.07);
          color: #ff9b84;
          font-size: 10px;
        }

        .page-numbers-toolbar {
          width: 100%;
          min-width: 0;
          min-height: 72px;
          box-sizing: border-box;
          display: grid;
          grid-template-columns:
            minmax(180px,1fr)
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

        .page-numbers-file {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .page-numbers-file-icon {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ff8b47;
          background: rgba(255,112,37,0.11);
          border: 1px solid rgba(255,123,54,0.18);
          font-size: 10px;
          font-weight: 800;
        }

        .page-numbers-file-details {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .page-numbers-file-details strong {
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
        }

        .page-numbers-file-details span {
          color: rgba(255,255,255,0.35);
          font-size: 10px;
        }

        .page-numbers-toolbar-stats {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 25px;
        }

        .page-numbers-toolbar-stats div {
          display: flex;
          align-items: baseline;
          gap: 5px;
        }

        .page-numbers-toolbar-stats strong {
          max-width: 90px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #ff9658;
          font-size: 18px;
        }

        .page-numbers-toolbar-stats span {
          color: rgba(255,255,255,0.32);
          font-size: 9px;
        }

        .page-numbers-change-button {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
          color: rgba(255,255,255,0.68);
          border-radius: 11px;
          padding: 10px 13px;
          white-space: nowrap;
          cursor: pointer;
          font-size: 11px;
        }

        .page-numbers-change-button:hover {
          color: white;
          background: rgba(255,255,255,0.07);
        }

        .page-numbers-loading {
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

        .page-numbers-spinner {
          width: 34px;
          height: 34px;
          margin-bottom: 18px;
          border: 2px solid rgba(255,255,255,0.08);
          border-top-color: #ff7530;
          border-radius: 50%;
          animation:
            pageNumbersSpin 0.85s linear infinite;
        }

        @keyframes pageNumbersSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .page-numbers-loading h3 {
          margin: 0;
          font-size: 16px;
        }

        .page-numbers-loading p {
          margin: 7px 0 0;
          color: rgba(255,255,255,0.35);
          font-size: 11px;
        }

        .page-numbers-editor {
          width: 100%;
          min-width: 0;
          min-height: 650px;
          box-sizing: border-box;
          display: grid;
          grid-template-columns:
            minmax(290px,330px)
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

        .page-numbers-sidebar {
          min-width: 0;
          box-sizing: border-box;
          padding: 22px;
          overflow-x: hidden;
          overflow-y: auto;
          border-right: 1px solid rgba(255,255,255,0.07);
          background: rgba(7,7,7,0.24);
        }

        .page-numbers-section {
          min-width: 0;
          padding-bottom: 20px;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .page-numbers-section:last-of-type {
          margin-bottom: 18px;
        }

        .page-numbers-label {
          display: block;
          margin-bottom: 10px;
          color: rgba(255,255,255,0.32);
          font-size: 9px;
          letter-spacing: 0.18em;
          font-weight: 800;
        }

        .page-numbers-position-grid {
          display: grid;
          grid-template-columns:
            repeat(3,1fr);
          gap: 6px;
          max-width: 170px;
        }

        .page-numbers-position-grid button {
          width: 100%;
          aspect-ratio: 1;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 9px;
          background: rgba(255,255,255,0.025);
          color: rgba(255,255,255,0.45);
          cursor: pointer;
          font-size: 15px;
        }

        .page-numbers-position-grid button:hover {
          color: white;
          background: rgba(255,255,255,0.06);
        }

        .page-numbers-position-grid button.active {
          color: white;
          border-color: rgba(255,112,37,0.33);
          background: rgba(255,104,28,0.11);
        }

        .page-numbers-format-options {
          display: flex;
          gap: 6px;
        }

        .page-numbers-format-options button {
          min-width: 0;
          flex: 1;
          padding: 9px 6px;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 8px;
          background: rgba(255,255,255,0.025);
          color: rgba(255,255,255,0.43);
          cursor: pointer;
          font-size: 9px;
        }

        .page-numbers-format-options button:hover {
          color: white;
          background: rgba(255,255,255,0.055);
        }

        .page-numbers-format-options button.active {
          color: white;
          border-color: rgba(255,112,37,0.28);
          background: rgba(255,104,28,0.1);
        }

        .page-numbers-field {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 11px;
        }

        .page-numbers-field span {
          color: rgba(255,255,255,0.5);
          font-size: 10px;
        }

        .page-numbers-field input,
        .page-numbers-field select {
          width: 120px;
          min-width: 0;
          box-sizing: border-box;
          padding: 8px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 9px;
          outline: 0;
          background: rgba(0,0,0,0.2);
          color: white;
          font-size: 10px;
        }

        .page-numbers-field input:focus,
        .page-numbers-field select:focus,
        .page-numbers-custom-pages:focus {
          border-color: rgba(255,114,42,0.38);
        }

        .page-numbers-range {
          display: block;
          margin-top: 14px;
        }

        .page-numbers-range > div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 7px;
        }

        .page-numbers-range span {
          color: rgba(255,255,255,0.5);
          font-size: 10px;
        }

        .page-numbers-range strong {
          color: rgba(255,255,255,0.62);
          font-size: 10px;
        }

        .page-numbers-range input[type="range"] {
          width: 100%;
          accent-color: #ff6f2b;
          cursor: pointer;
        }

        .page-numbers-page-options {
          display: grid;
          grid-template-columns:
            repeat(4,minmax(0,1fr));
          gap: 6px;
        }

        .page-numbers-page-options button {
          min-width: 0;
          padding: 8px 4px;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 8px;
          background: rgba(255,255,255,0.025);
          color: rgba(255,255,255,0.42);
          cursor: pointer;
          font-size: 9px;
        }

        .page-numbers-page-options button:hover {
          color: white;
          background: rgba(255,255,255,0.055);
        }

        .page-numbers-page-options button.active {
          color: white;
          border-color: rgba(255,112,37,0.28);
          background: rgba(255,104,28,0.1);
        }

        .page-numbers-custom-pages {
          width: 100%;
          box-sizing: border-box;
          margin-top: 9px;
          padding: 8px 9px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 9px;
          outline: 0;
          background: rgba(0,0,0,0.2);
          color: white;
          font-size: 10px;
        }

        .page-numbers-selection-summary {
          margin-top: 8px;
          color: rgba(255,255,255,0.25);
          font-size: 9px;
        }

        .page-numbers-error {
          padding: 10px 11px;
          border: 1px solid rgba(255,80,55,0.18);
          border-radius: 10px;
          background: rgba(255,70,50,0.07);
          color: #ff9b84;
          font-size: 10px;
          line-height: 1.45;
        }

        .page-numbers-workspace {
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

        .page-numbers-preview-header {
          min-width: 0;
          padding: 18px 20px 0;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
        }

        .page-numbers-preview-header > div:first-child {
          min-width: 0;
        }

        .page-numbers-preview-header .page-numbers-label {
          margin-bottom: 4px;
        }

        .page-numbers-preview-header p {
          margin: 0;
          color: rgba(255,255,255,0.28);
          font-size: 9px;
        }

        .page-numbers-page-controls {
          flex: 0 0 auto;
          display: grid;
          grid-template-columns: 30px auto 30px;
          align-items: center;
          gap: 6px;
        }

        .page-numbers-page-controls button {
          width: 30px;
          height: 30px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          background: rgba(255,255,255,0.035);
          color: rgba(255,255,255,0.65);
          cursor: pointer;
        }

        .page-numbers-page-controls button:hover:not(:disabled) {
          background: rgba(255,255,255,0.07);
        }

        .page-numbers-page-controls button:disabled {
          opacity: 0.25;
          cursor: not-allowed;
        }

        .page-numbers-page-controls span {
          color: rgba(255,255,255,0.48);
          font-size: 10px;
          white-space: nowrap;
        }

        .page-numbers-page-stage {
          flex: 1;
          min-height: 540px;
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 30px;
          overflow: auto;
        }

        .page-numbers-page-shell {
          position: relative;
          width: min(100%,740px);
          aspect-ratio: 0.707;
          flex: 0 0 auto;
          background: white;
          border-radius: 2px;
          overflow: hidden;
          box-shadow:
            0 24px 60px rgba(0,0,0,0.45);
        }

        .page-numbers-pdf-preview {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: 0;
          background: white;
        }

        .page-numbers-preview-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .page-numbers-preview-number {
          position: absolute;
          z-index: 2;
          padding: 2px 4px;
          box-sizing: border-box;
          min-width: 16px;
          color: #444;
          font-family: Arial, sans-serif;
          font-weight: 500;
          white-space: nowrap;
        }

        .page-position-top-left {
          top: 0;
          left: 0;
        }

        .page-position-top-center {
          top: 0;
          left: 50%;
          transform: translateX(-50%);
        }

        .page-position-top-right {
          top: 0;
          right: 0;
        }

        .page-position-middle-left {
          top: 50%;
          left: 0;
          transform: translateY(-50%);
        }

        .page-position-center {
          top: 50%;
          left: 50%;
          transform: translate(-50%,-50%);
        }

        .page-position-middle-right {
          top: 50%;
          right: 0;
          transform: translateY(-50%);
        }

        .page-position-bottom-left {
          bottom: 0;
          left: 0;
        }

        .page-position-bottom-center {
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
        }

        .page-position-bottom-right {
          bottom: 0;
          right: 0;
        }

        .page-numbers-preview-hint {
          padding: 11px 18px 14px;
          text-align: center;
          color: rgba(255,255,255,0.28);
          font-size: 10px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .page-numbers-bottom {
          width: 100%;
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-top: 16px;
          padding: 15px 2px 0;
        }

        .page-numbers-summary {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 9px;
          flex-wrap: wrap;
          color: rgba(255,255,255,0.38);
          font-size: 11px;
        }

        .page-numbers-process-button,
        .page-numbers-download-button {
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

        .page-numbers-process-button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
          box-shadow: none;
        }

        .page-numbers-progress {
          width: min(380px,45%);
          min-width: 180px;
        }

        .page-numbers-progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 7px;
          color: rgba(255,255,255,0.45);
          font-size: 10px;
        }

        .page-numbers-progress-header strong {
          color: #ff985b;
        }

        .page-numbers-progress-track {
          height: 5px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
        }

        .page-numbers-progress-fill {
          height: 100%;
          border-radius: inherit;
          background:
            linear-gradient(
              90deg,
              #ff5310,
              #ff9b5b
            );
          transition: width 0.2s ease;
        }

        .page-numbers-result {
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

        .page-numbers-result > div:first-child {
          min-width: 0;
        }

        .page-numbers-result-label {
          color: #8de0ad;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.16em;
        }

        .page-numbers-result h3 {
          margin: 6px 0 4px;
          font-size: 15px;
        }

        .page-numbers-result p {
          margin: 0;
          color: rgba(255,255,255,0.42);
          font-size: 10px;
          line-height: 1.4;
        }

        @media (max-width: 900px) {
          .page-numbers-toolbar {
            grid-template-columns:
              minmax(0,1fr)
              auto;
          }

          .page-numbers-change-button {
            grid-column: 2;
          }

          .page-numbers-editor {
            grid-template-columns: 1fr;
          }

          .page-numbers-sidebar {
            border-right: 0;
            border-bottom: 1px solid rgba(255,255,255,0.07);
          }
        }

        @media (max-width: 650px) {
          .page-numbers-upload {
            min-height: 400px;
            padding: 28px 20px;
          }

          .page-numbers-toolbar {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .page-numbers-change-button {
            grid-column: auto;
            justify-self: start;
          }

          .page-numbers-toolbar-stats {
            justify-content: flex-start;
          }

          .page-numbers-sidebar {
            padding: 17px;
          }

          .page-numbers-page-stage {
            min-height: 420px;
            padding: 14px;
          }

          .page-numbers-preview-header {
            padding: 15px 15px 0;
          }

          .page-numbers-bottom,
          .page-numbers-result {
            align-items: stretch;
            flex-direction: column;
          }

          .page-numbers-progress {
            width: 100%;
            min-width: 0;
          }

          .page-numbers-process-button,
          .page-numbers-download-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default PageNumbers;