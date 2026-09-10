import { useEffect, useMemo, useState } from "react";
import {
  addBatesNumbers,
  getBatesPdfInfo,
} from "../../../services/pdf/batesNumbering.js";

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function clamp(value, min, max) {
  return Math.min(
    Math.max(value, min),
    max
  );
}

function createPreviewLabel(
  pageNumber,
  startNumber,
  digits,
  prefix,
  suffix
) {
  const number =
    Number(startNumber) +
    pageNumber -
    1;

  const padded =
    String(number).padStart(
      Number(digits) || 6,
      "0"
    );

  return `${prefix}${padded}${suffix}`;
}

function BatesNumbering() {
  const [file, setFile] = useState(null);
  const [pdfInfo, setPdfInfo] = useState(null);

  const [pageNumber, setPageNumber] =
    useState(1);

  const [prefix, setPrefix] =
    useState("CASE-");

  const [suffix, setSuffix] =
    useState("");

  const [startNumber, setStartNumber] =
    useState(1);

  const [digits, setDigits] =
    useState(6);

  const [position, setPosition] =
    useState("bottom-right");

  const [font, setFont] =
    useState("helvetica");

  const [fontSize, setFontSize] =
    useState(10);

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
      return `${prefix}${String(
        startNumber
      ).padStart(digits, "0")}${suffix}`;
    }

    return createPreviewLabel(
      pageNumber,
      startNumber,
      digits,
      prefix,
      suffix
    );
  }, [
    pageNumber,
    pdfInfo,
    startNumber,
    digits,
    prefix,
    suffix,
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
  }, [
    pageSelection,
    customPages,
  ]);

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
          await getBatesPdfInfo(file);

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
            const [rawStart, rawEnd] =
              trimmed
                .split("-")
                .map(Number);

            if (
              Number.isInteger(
                rawStart
              ) &&
              Number.isInteger(
                rawEnd
              )
            ) {
              const start =
                Math.min(
                  rawStart,
                  rawEnd
                );

              const end =
                Math.max(
                  rawStart,
                  rawEnd
                );

              return Array.from(
                {
                  length:
                    end -
                    start +
                    1,
                },
                (_, index) =>
                  start +
                  index
              );
            }

            return [];
          }

          const page =
            Number(trimmed);

          return Number.isInteger(
            page
          )
            ? [page]
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
      (a, b) =>
        a - b
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

  async function handleAddBatesNumbers() {
    if (!file) {
      setError(
        "Please select a PDF file first."
      );

      return;
    }

    if (!pdfInfo?.pageCount) {
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
    }

    if (
      Number(startNumber) < 1
    ) {
      setError(
        "Starting number must be at least 1."
      );

      return;
    }

    if (
      Number(digits) < 1
    ) {
      setError(
        "Bates digit count must be at least 1."
      );

      return;
    }

    setError("");
    setResult(null);
    setIsProcessing(true);
    setProgress(0);

    try {
      const processed =
        await addBatesNumbers(
          file,
          {
            prefix,
            suffix,
            startNumber:
              Number(startNumber),
            digits:
              Number(digits),
            position,
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
              70,
              70,
              70,
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

        digits:
          processed.digits,

        prefix:
          processed.prefix,

        suffix:
          processed.suffix,

        position:
          processed.position,
      });
    } catch (processError) {
      setError(
        processError?.message ||
          "Unable to add Bates numbers."
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

    setPrefix("CASE-");
    setSuffix("");
    setStartNumber(1);
    setDigits(6);

    setPosition(
      "bottom-right"
    );

    setFont("helvetica");
    setFontSize(10);
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
    <div className="bates-numbering">
      {!file && (
        <div className="bates-numbering-upload">
          <div className="bates-numbering-upload-icon">
            #
          </div>

          <h2>
            Add Bates numbering
          </h2>

          <p>
            Add sequential identifiers to your
            PDF for legal, discovery, archival,
            and document-control workflows.
          </p>

          <label className="bates-numbering-upload-button">
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

          <span className="bates-numbering-upload-hint">
            or drag and drop a PDF
          </span>

          {error && (
            <div className="bates-numbering-upload-error">
              {error}
            </div>
          )}
        </div>
      )}

      {file && (
        <>
          <div className="bates-numbering-toolbar">
            <div className="bates-numbering-file">
              <div className="bates-numbering-file-icon">
                PDF
              </div>

              <div className="bates-numbering-file-details">
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

            <div className="bates-numbering-toolbar-preview">
              <span>
                PREVIEW
              </span>

              <strong>
                {previewLabel}
              </strong>
            </div>

            <button
              type="button"
              className="bates-numbering-change-button"
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
            <div className="bates-numbering-loading">
              <div className="bates-numbering-spinner" />

              <h3>
                Preparing document
              </h3>

              <p>
                Loading your PDF...
              </p>
            </div>
          ) : (
            <div className="bates-numbering-editor">
              <aside className="bates-numbering-sidebar">
                <section className="bates-numbering-section">
                  <span className="bates-numbering-label">
                    BATES FORMAT
                  </span>

                  <label className="bates-numbering-field">
                    <span>
                      Prefix
                    </span>

                    <input
                      type="text"
                      value={
                        prefix
                      }
                      onChange={(
                        event
                      ) =>
                        setPrefix(
                          event.target
                            .value
                        )
                      }
                      placeholder="CASE-"
                      maxLength={
                        40
                      }
                      disabled={
                        isProcessing
                      }
                    />
                  </label>

                  <label className="bates-numbering-field">
                    <span>
                      Start at
                    </span>

                    <input
                      type="number"
                      min="1"
                      max="999999999999999999"
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
                            999999999999999999
                          )
                        )
                      }
                      disabled={
                        isProcessing
                      }
                    />
                  </label>

                  <label className="bates-numbering-field">
                    <span>
                      Digits
                    </span>

                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={
                        digits
                      }
                      onChange={(
                        event
                      ) =>
                        setDigits(
                          clamp(
                            Math.floor(
                              Number(
                                event.target
                                  .value
                              ) ||
                                6
                            ),
                            1,
                            20
                          )
                        )
                      }
                      disabled={
                        isProcessing
                      }
                    />
                  </label>

                  <label className="bates-numbering-field">
                    <span>
                      Suffix
                    </span>

                    <input
                      type="text"
                      value={
                        suffix
                      }
                      onChange={(
                        event
                      ) =>
                        setSuffix(
                          event.target
                            .value
                        )
                      }
                      placeholder=""
                      maxLength={
                        40
                      }
                      disabled={
                        isProcessing
                      }
                    />
                  </label>

                  <div className="bates-numbering-format-preview">
                    <span>
                      Example
                    </span>

                    <strong>
                      {prefix}
                      {String(
                        startNumber
                      ).padStart(
                        digits,
                        "0"
                      )}
                      {suffix}
                    </strong>
                  </div>
                </section>

                <section className="bates-numbering-section">
                  <span className="bates-numbering-label">
                    POSITION
                  </span>

                  <div className="bates-numbering-position-grid">
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
                          title={
                            value
                          }
                          aria-label={
                            value
                          }
                        >
                          {icon}
                        </button>
                      )
                    )}
                  </div>
                </section>

                <section className="bates-numbering-section">
                  <span className="bates-numbering-label">
                    STYLE
                  </span>

                  <label className="bates-numbering-field">
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

                      <option value="courier-bold">
                        Courier Bold
                      </option>
                    </select>
                  </label>

                  <label className="bates-numbering-field">
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
                              10,
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
                </section>

                <section className="bates-numbering-section">
                  <span className="bates-numbering-label">
                    SPACING
                  </span>

                  <label className="bates-numbering-range">
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

                  <label className="bates-numbering-range">
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

                <section className="bates-numbering-section">
                  <span className="bates-numbering-label">
                    PAGES
                  </span>

                  <div className="bates-numbering-page-options">
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
                      className="bates-numbering-custom-pages"
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

                  <div className="bates-numbering-selection-summary">
                    {pageSelectionLabel}
                  </div>
                </section>

                {error && (
                  <div className="bates-numbering-error">
                    {error}
                  </div>
                )}
              </aside>

              <main className="bates-numbering-workspace">
                <div className="bates-numbering-preview-header">
                  <div>
                    <span className="bates-numbering-label">
                      DOCUMENT PREVIEW
                    </span>

                    <p>
                      Preview the Bates identifier
                      placement and format.
                    </p>
                  </div>

                  <div className="bates-numbering-page-controls">
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

                <div className="bates-numbering-page-stage">
                  <div className="bates-numbering-page-shell">
                    {pdfUrl && (
                      <iframe
                        title="PDF Bates number preview"
                        src={`${pdfUrl}#page=${pageNumber}&toolbar=0&navpanes=0&scrollbar=0`}
                        className="bates-numbering-pdf-preview"
                      />
                    )}

                    <div className="bates-numbering-preview-overlay">
                      <div
                        className={`bates-numbering-preview-number bates-position-${position}`}
                        style={{
                          fontSize:
                            `${Math.max(
                              8,
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
                                5
                            )}px`,
                        }}
                      >
                        {previewLabel}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bates-numbering-preview-hint">
                  Bates identifiers are added directly
                  to the PDF pages.
                </div>
              </main>
            </div>
          )}

          {!isLoading && (
            <div className="bates-numbering-bottom">
              <div className="bates-numbering-summary">
                <span>
                  {pageSelectionLabel}
                </span>

                <span>•</span>

                <span>
                  Starts at{" "}
                  {prefix}
                  {String(
                    startNumber
                  ).padStart(
                    digits,
                    "0"
                  )}
                  {suffix}
                </span>
              </div>

              {isProcessing ? (
                <div className="bates-numbering-progress">
                  <div className="bates-numbering-progress-header">
                    <span>
                      Adding Bates numbers
                    </span>

                    <strong>
                      {progress}%
                    </strong>
                  </div>

                  <div className="bates-numbering-progress-track">
                    <div
                      className="bates-numbering-progress-fill"
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
                  className="bates-numbering-process-button"
                  onClick={
                    handleAddBatesNumbers
                  }
                  disabled={
                    !file ||
                    !pdfInfo
                  }
                >
                  Add Bates Numbers
                  <span>→</span>
                </button>
              )}
            </div>
          )}

          {result && resultUrl && (
            <div className="bates-numbering-result">
              <div>
                <span className="bates-numbering-result-label">
                  COMPLETE
                </span>

                <h3>
                  Your Bates-numbered PDF is ready.
                </h3>

                <p>
                  {result.numberedPages}{" "}
                  {result.numberedPages ===
                  1
                    ? "page"
                    : "pages"}{" "}
                  numbered from{" "}
                  {result.prefix}
                  {String(
                    result.startNumber
                  ).padStart(
                    result.digits,
                    "0"
                  )}
                  {result.suffix}.
                </p>
              </div>

              <a
                href={resultUrl}
                download={`bates-numbered-${file.name}`}
                className="bates-numbering-download-button"
              >
                Download PDF
                <span>↓</span>
              </a>
            </div>
          )}
        </>
      )}

      <style>{`
        .bates-numbering {
          width: 100%;
          min-width: 0;
          color: rgba(255,255,255,0.94);
        }

        .bates-numbering-upload {
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

        .bates-numbering-upload-icon {
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

        .bates-numbering-upload h2 {
          margin: 0;
          font-size: 28px;
          letter-spacing: -0.03em;
        }

        .bates-numbering-upload p {
          max-width: 540px;
          margin: 10px 0 26px;
          color: rgba(255,255,255,0.52);
          font-size: 14px;
          line-height: 1.55;
        }

        .bates-numbering-upload-button {
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

        .bates-numbering-upload-button input {
          display: none;
        }

        .bates-numbering-upload-hint {
          margin-top: 13px;
          color: rgba(255,255,255,0.28);
          font-size: 11px;
        }

        .bates-numbering-upload-error {
          margin-top: 17px;
          padding: 9px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255,80,55,0.18);
          background: rgba(255,70,50,0.07);
          color: #ff9b84;
          font-size: 10px;
        }

        .bates-numbering-toolbar {
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

        .bates-numbering-file {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .bates-numbering-file-icon {
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

        .bates-numbering-file-details {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .bates-numbering-file-details strong {
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
        }

        .bates-numbering-file-details span {
          color: rgba(255,255,255,0.35);
          font-size: 10px;
        }

        .bates-numbering-toolbar-preview {
          min-width: 0;
          display: flex;
          align-items: baseline;
          gap: 8px;
          padding: 8px 12px;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px;
          background: rgba(255,255,255,0.025);
        }

        .bates-numbering-toolbar-preview span {
          color: rgba(255,255,255,0.26);
          font-size: 8px;
          letter-spacing: 0.1em;
          font-weight: 800;
        }

        .bates-numbering-toolbar-preview strong {
          max-width: 170px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #ff9658;
          font-size: 11px;
          font-family: monospace;
        }

        .bates-numbering-change-button {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
          color: rgba(255,255,255,0.68);
          border-radius: 11px;
          padding: 10px 13px;
          white-space: nowrap;
          cursor: pointer;
          font-size: 11px;
        }

        .bates-numbering-change-button:hover {
          color: white;
          background: rgba(255,255,255,0.07);
        }

        .bates-numbering-loading {
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

        .bates-numbering-spinner {
          width: 34px;
          height: 34px;
          margin-bottom: 18px;
          border: 2px solid rgba(255,255,255,0.08);
          border-top-color: #ff7530;
          border-radius: 50%;
          animation:
            batesNumberingSpin 0.85s linear infinite;
        }

        @keyframes batesNumberingSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .bates-numbering-loading h3 {
          margin: 0;
          font-size: 16px;
        }

        .bates-numbering-loading p {
          margin: 7px 0 0;
          color: rgba(255,255,255,0.35);
          font-size: 11px;
        }

        .bates-numbering-editor {
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

        .bates-numbering-sidebar {
          min-width: 0;
          box-sizing: border-box;
          padding: 22px;
          overflow-x: hidden;
          overflow-y: auto;
          border-right: 1px solid rgba(255,255,255,0.07);
          background: rgba(7,7,7,0.24);
        }

        .bates-numbering-section {
          min-width: 0;
          padding-bottom: 20px;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .bates-numbering-section:last-of-type {
          margin-bottom: 18px;
        }

        .bates-numbering-label {
          display: block;
          margin-bottom: 10px;
          color: rgba(255,255,255,0.32);
          font-size: 9px;
          letter-spacing: 0.18em;
          font-weight: 800;
        }

        .bates-numbering-field {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 11px;
        }

        .bates-numbering-field > span {
          color: rgba(255,255,255,0.5);
          font-size: 10px;
        }

        .bates-numbering-field input,
        .bates-numbering-field select {
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

        .bates-numbering-field input:focus,
        .bates-numbering-field select:focus,
        .bates-numbering-custom-pages:focus {
          border-color: rgba(255,114,42,0.38);
        }

        .bates-numbering-format-preview {
          margin-top: 14px;
          padding: 11px 12px;
          border: 1px solid rgba(255,111,33,0.1);
          border-radius: 10px;
          background: rgba(255,105,28,0.035);
        }

        .bates-numbering-format-preview span {
          display: block;
          margin-bottom: 5px;
          color: rgba(255,255,255,0.26);
          font-size: 8px;
        }

        .bates-numbering-format-preview strong {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #ff9658;
          font-family: monospace;
          font-size: 12px;
        }

        .bates-numbering-position-grid {
          max-width: 170px;
          display: grid;
          grid-template-columns:
            repeat(3,1fr);
          gap: 6px;
        }

        .bates-numbering-position-grid button {
          width: 100%;
          aspect-ratio: 1;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 9px;
          background: rgba(255,255,255,0.025);
          color: rgba(255,255,255,0.45);
          cursor: pointer;
          font-size: 15px;
        }

        .bates-numbering-position-grid button:hover {
          color: white;
          background: rgba(255,255,255,0.06);
        }

        .bates-numbering-position-grid button.active {
          color: white;
          border-color: rgba(255,112,37,0.33);
          background: rgba(255,104,28,0.11);
        }

        .bates-numbering-range {
          display: block;
          margin-top: 14px;
        }

        .bates-numbering-range > div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 7px;
        }

        .bates-numbering-range span {
          color: rgba(255,255,255,0.5);
          font-size: 10px;
        }

        .bates-numbering-range strong {
          color: rgba(255,255,255,0.62);
          font-size: 10px;
        }

        .bates-numbering-range input[type="range"] {
          width: 100%;
          accent-color: #ff6f2b;
          cursor: pointer;
        }

        .bates-numbering-page-options {
          display: grid;
          grid-template-columns:
            repeat(4,minmax(0,1fr));
          gap: 6px;
        }

        .bates-numbering-page-options button {
          min-width: 0;
          padding: 8px 4px;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 8px;
          background: rgba(255,255,255,0.025);
          color: rgba(255,255,255,0.42);
          cursor: pointer;
          font-size: 9px;
        }

        .bates-numbering-page-options button:hover {
          color: white;
          background: rgba(255,255,255,0.055);
        }

        .bates-numbering-page-options button.active {
          color: white;
          border-color: rgba(255,112,37,0.28);
          background: rgba(255,104,28,0.1);
        }

        .bates-numbering-custom-pages {
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

        .bates-numbering-selection-summary {
          margin-top: 8px;
          color: rgba(255,255,255,0.25);
          font-size: 9px;
        }

        .bates-numbering-error {
          padding: 10px 11px;
          border: 1px solid rgba(255,80,55,0.18);
          border-radius: 10px;
          background: rgba(255,70,50,0.07);
          color: #ff9b84;
          font-size: 10px;
          line-height: 1.45;
        }

        .bates-numbering-workspace {
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

        .bates-numbering-preview-header {
          min-width: 0;
          padding: 18px 20px 0;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
        }

        .bates-numbering-preview-header > div:first-child {
          min-width: 0;
        }

        .bates-numbering-preview-header .bates-numbering-label {
          margin-bottom: 4px;
        }

        .bates-numbering-preview-header p {
          margin: 0;
          color: rgba(255,255,255,0.28);
          font-size: 9px;
          line-height: 1.45;
        }

        .bates-numbering-page-controls {
          flex: 0 0 auto;
          display: grid;
          grid-template-columns:
            30px
            auto
            30px;
          align-items: center;
          gap: 6px;
        }

        .bates-numbering-page-controls button {
          width: 30px;
          height: 30px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          background: rgba(255,255,255,0.035);
          color: rgba(255,255,255,0.65);
          cursor: pointer;
        }

        .bates-numbering-page-controls button:hover:not(:disabled) {
          background: rgba(255,255,255,0.07);
        }

        .bates-numbering-page-controls button:disabled {
          opacity: 0.25;
          cursor: not-allowed;
        }

        .bates-numbering-page-controls span {
          color: rgba(255,255,255,0.48);
          font-size: 10px;
          white-space: nowrap;
        }

        .bates-numbering-page-stage {
          flex: 1;
          min-height: 540px;
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 30px;
          overflow: auto;
        }

        .bates-numbering-page-shell {
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

        .bates-numbering-pdf-preview {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: 0;
          background: white;
        }

        .bates-numbering-preview-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .bates-numbering-preview-number {
          position: absolute;
          z-index: 2;
          padding: 2px 4px;
          box-sizing: border-box;
          min-width: 16px;
          color: #4b4b4b;
          font-family: monospace;
          font-weight: 500;
          white-space: nowrap;
          background: rgba(255,255,255,0.5);
          border-radius: 2px;
        }

        .bates-position-top-left {
          top: 0;
          left: 0;
        }

        .bates-position-top-center {
          top: 0;
          left: 50%;
          transform: translateX(-50%);
        }

        .bates-position-top-right {
          top: 0;
          right: 0;
        }

        .bates-position-bottom-left {
          bottom: 0;
          left: 0;
        }

        .bates-position-bottom-center {
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
        }

        .bates-position-bottom-right {
          bottom: 0;
          right: 0;
        }

        .bates-numbering-preview-hint {
          padding: 11px 18px 14px;
          text-align: center;
          color: rgba(255,255,255,0.28);
          font-size: 10px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .bates-numbering-bottom {
          width: 100%;
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-top: 16px;
          padding: 15px 2px 0;
        }

        .bates-numbering-summary {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 9px;
          flex-wrap: wrap;
          color: rgba(255,255,255,0.38);
          font-size: 11px;
        }

        .bates-numbering-process-button,
        .bates-numbering-download-button {
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

        .bates-numbering-process-button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
          box-shadow: none;
        }

        .bates-numbering-progress {
          width: min(380px,45%);
          min-width: 180px;
        }

        .bates-numbering-progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 7px;
          color: rgba(255,255,255,0.45);
          font-size: 10px;
        }

        .bates-numbering-progress-header strong {
          color: #ff985b;
        }

        .bates-numbering-progress-track {
          height: 5px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
        }

        .bates-numbering-progress-fill {
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

        .bates-numbering-result {
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

        .bates-numbering-result > div:first-child {
          min-width: 0;
        }

        .bates-numbering-result-label {
          color: #8de0ad;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.16em;
        }

        .bates-numbering-result h3 {
          margin: 6px 0 4px;
          font-size: 15px;
        }

        .bates-numbering-result p {
          margin: 0;
          color: rgba(255,255,255,0.42);
          font-size: 10px;
          line-height: 1.4;
        }

        @media (max-width: 950px) {
          .bates-numbering-toolbar {
            grid-template-columns:
              minmax(0,1fr)
              auto;
          }

          .bates-numbering-change-button {
            grid-column: 2;
          }

          .bates-numbering-editor {
            grid-template-columns: 1fr;
          }

          .bates-numbering-sidebar {
            border-right: 0;
            border-bottom: 1px solid rgba(255,255,255,0.07);
          }
        }

        @media (max-width: 650px) {
          .bates-numbering-upload {
            min-height: 400px;
            padding: 28px 20px;
          }

          .bates-numbering-toolbar {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .bates-numbering-change-button {
            grid-column: auto;
            justify-self: start;
          }

          .bates-numbering-toolbar-preview {
            justify-self: start;
          }

          .bates-numbering-sidebar {
            padding: 17px;
          }

          .bates-numbering-page-stage {
            min-height: 420px;
            padding: 14px;
          }

          .bates-numbering-preview-header {
            padding: 15px 15px 0;
          }

          .bates-numbering-bottom,
          .bates-numbering-result {
            align-items: stretch;
            flex-direction: column;
          }

          .bates-numbering-progress {
            width: 100%;
            min-width: 0;
          }

          .bates-numbering-process-button,
          .bates-numbering-download-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default BatesNumbering;