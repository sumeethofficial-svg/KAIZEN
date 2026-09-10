import { useEffect, useMemo, useState } from "react";
import {
  addWatermark,
  createImageWatermark,
  createTextWatermark,
  getWatermarkPdfInfo,
} from "../../../services/pdf/addWatermark.js";

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

function AddWatermark() {
  const [file, setFile] = useState(null);
  const [pdfInfo, setPdfInfo] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  const [watermarkType, setWatermarkType] =
    useState("text");

  const [watermarkText, setWatermarkText] =
    useState("CONFIDENTIAL");

  const [font, setFont] =
    useState("helvetica");

  const [fontSize, setFontSize] =
    useState(44);

  const [opacity, setOpacity] =
    useState(18);

  const [rotation, setRotation] =
    useState(-35);

  const [image, setImage] =
    useState(null);

  const [imageUrl, setImageUrl] =
    useState("");

  const [imageWidth, setImageWidth] =
    useState(180);

  const [pageSelection, setPageSelection] =
    useState("all");

  const [customPages, setCustomPages] =
    useState("");

  const [position, setPosition] =
    useState({
      x: 0.5,
      y: 0.5,
    });

  const [previewDragging, setPreviewDragging] =
    useState(false);

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

  const previewRef = useState(null)[0];

  const selectedPages = useMemo(() => {
    if (
      pageSelection ===
      "all"
    ) {
      return "All pages";
    }

    if (
      pageSelection ===
      "first"
    ) {
      return "First page";
    }

    if (
      pageSelection ===
      "last"
    ) {
      return "Last page";
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
    if (!image) {
      setImageUrl("");
      return;
    }

    const url =
      URL.createObjectURL(image);

    setImageUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [image]);

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
          await getWatermarkPdfInfo(
            file
          );

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

  function handleImage(selectedFile) {
    setError("");

    if (!selectedFile) {
      return;
    }

    const type =
      selectedFile.type.toLowerCase();

    if (
      type !== "image/png" &&
      type !== "image/jpeg"
    ) {
      setImage(null);

      setError(
        "Please use a PNG or JPEG watermark image."
      );

      return;
    }

    setImage(selectedFile);
  }

  function handlePreviewPointerDown(
    event
  ) {
    if (
      watermarkType !==
        "image" &&
      watermarkType !==
        "text"
    ) {
      return;
    }

    if (
      !event.currentTarget
    ) {
      return;
    }

    setPreviewDragging(true);

    event.currentTarget.setPointerCapture?.(
      event.pointerId
    );

    updatePositionFromEvent(
      event
    );
  }

  function handlePreviewPointerMove(
    event
  ) {
    if (!previewDragging) {
      return;
    }

    updatePositionFromEvent(
      event
    );
  }

  function handlePreviewPointerUp(
    event
  ) {
    setPreviewDragging(false);

    event.currentTarget.releasePointerCapture?.(
      event.pointerId
    );
  }

  function updatePositionFromEvent(
    event
  ) {
    const target =
      event.currentTarget;

    const rect =
      target.getBoundingClientRect();

    if (
      !rect.width ||
      !rect.height
    ) {
      return;
    }

    const x =
      clamp(
        (event.clientX -
          rect.left) /
          rect.width,
        0,
        1
      );

    const y =
      clamp(
        (event.clientY -
          rect.top) /
          rect.height,
        0,
        1
      );

    setPosition({
      x,
      y,
    });
  }

  function goToPage(
    nextPage
  ) {
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

  function parseCustomPages() {
    if (
      !customPages.trim()
    ) {
      return [];
    }

    const pages =
      customPages
        .split(",")
        .map((value) =>
          Number(value.trim())
        )
        .filter(
          (value) =>
            Number.isInteger(
              value
            ) &&
            value >= 1 &&
            value <=
              (pdfInfo?.pageCount ||
                1)
        );

    return [
      ...new Set(
        pages
      ),
    ];
  }

  async function handleAddWatermark() {
    if (!file) {
      setError(
        "Please select a PDF file first."
      );

      return;
    }

    if (
      watermarkType ===
        "text" &&
      !watermarkText.trim()
    ) {
      setError(
        "Enter watermark text first."
      );

      return;
    }

    if (
      watermarkType ===
        "image" &&
      !image
    ) {
      setError(
        "Upload a watermark image first."
      );

      return;
    }

    let resolvedPageSelection =
      pageSelection;

    if (
      pageSelection ===
      "custom"
    ) {
      const pages =
        parseCustomPages();

      if (
        pages.length ===
        0
      ) {
        setError(
          "Enter valid page numbers for the custom selection."
        );

        return;
      }

      resolvedPageSelection =
        pages;
    }

    setError("");
    setResult(null);
    setIsProcessing(true);
    setProgress(0);

    try {
      let watermark;

      if (
        watermarkType ===
        "text"
      ) {
        watermark =
          createTextWatermark(
            watermarkText.trim(),
            {
              font,
              fontSize,
              opacity:
                opacity / 100,
              rotation,
              position,
              pageSelection:
                resolvedPageSelection,
            }
          );
      } else {
        const pdfWidth =
          pdfInfo?.pages?.[
            0
          ]?.width || 595;

        const actualWidth =
          clamp(
            Number(
              imageWidth
            ) || 180,
            30,
            pdfWidth
          );

        watermark =
          createImageWatermark(
            image,
            {
              width:
                actualWidth,
              opacity:
                opacity / 100,
              rotation,
              position,
              pageSelection:
                resolvedPageSelection,
            }
          );
      }

      const processed =
        await addWatermark(
          file,
          watermark,
          {},
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

        watermarkedPages:
          processed.watermarkedPages,

        watermarkType:
          processed.watermarkType,
      });
    } catch (processError) {
      setError(
        processError?.message ||
          "Unable to add the watermark."
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

    setWatermarkType(
      "text"
    );
    setWatermarkText(
      "CONFIDENTIAL"
    );
    setFont(
      "helvetica"
    );
    setFontSize(44);
    setOpacity(18);
    setRotation(-35);

    setImage(null);
    setImageUrl("");

    setImageWidth(180);

    setPageSelection(
      "all"
    );

    setCustomPages("");

    setPosition({
      x: 0.5,
      y: 0.5,
    });

    setPreviewDragging(false);

    setPdfUrl("");
    setIsLoading(false);
    setIsProcessing(false);
    setProgress(0);
    setError("");
    setResult(null);
    setResultUrl("");
  }

  return (
    <div className="add-watermark">
      {!file && (
        <div className="add-watermark-upload">
          <div className="add-watermark-upload-icon">
            ◈
          </div>

          <h2>
            Add a watermark
          </h2>

          <p>
            Protect or brand your PDF with a
            custom text or image watermark.
          </p>

          <label className="add-watermark-upload-button">
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

          <span className="add-watermark-upload-hint">
            or drag and drop a PDF
          </span>

          {error && (
            <div className="add-watermark-upload-error">
              {error}
            </div>
          )}
        </div>
      )}

      {file && (
        <>
          <div className="add-watermark-toolbar">
            <div className="add-watermark-file">
              <div className="add-watermark-file-icon">
                PDF
              </div>

              <div className="add-watermark-file-details">
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

            <div className="add-watermark-type-switch">
              <button
                type="button"
                className={
                  watermarkType ===
                  "text"
                    ? "active"
                    : ""
                }
                onClick={() => {
                  setWatermarkType(
                    "text"
                  );
                  setError("");
                }}
                disabled={
                  isProcessing
                }
              >
                Text
              </button>

              <button
                type="button"
                className={
                  watermarkType ===
                  "image"
                    ? "active"
                    : ""
                }
                onClick={() => {
                  setWatermarkType(
                    "image"
                  );
                  setError("");
                }}
                disabled={
                  isProcessing
                }
              >
                Image
              </button>
            </div>

            <button
              type="button"
              className="add-watermark-change-button"
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
            <div className="add-watermark-loading">
              <div className="add-watermark-spinner" />

              <h3>
                Preparing document
              </h3>

              <p>
                Loading your PDF...
              </p>
            </div>
          ) : (
            <div className="add-watermark-editor">
              <aside className="add-watermark-sidebar">
                <section className="add-watermark-section">
                  <span className="add-watermark-label">
                    WATERMARK
                  </span>

                  {watermarkType ===
                    "text" && (
                    <>
                      <input
                        className="add-watermark-text-input"
                        type="text"
                        value={
                          watermarkText
                        }
                        onChange={(
                          event
                        ) =>
                          setWatermarkText(
                            event.target
                              .value
                          )
                        }
                        placeholder="Watermark text"
                        disabled={
                          isProcessing
                        }
                      />

                      <label className="add-watermark-field">
                        <span>
                          Font
                        </span>

                        <select
                          value={
                            font
                          }
                          onChange={(
                            event
                          ) =>
                            setFont(
                              event
                                .target
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

                          <option value="times">
                            Times
                          </option>

                          <option value="courier">
                            Courier
                          </option>
                        </select>
                      </label>

                      <label className="add-watermark-field">
                        <span>
                          Size
                        </span>

                        <input
                          type="number"
                          min="8"
                          max="160"
                          value={
                            fontSize
                          }
                          onChange={(
                            event
                          ) =>
                            setFontSize(
                              clamp(
                                Number(
                                  event
                                    .target
                                    .value
                                ) ||
                                  44,
                                8,
                                160
                              )
                            )
                          }
                          disabled={
                            isProcessing
                          }
                        />
                      </label>
                    </>
                  )}

                  {watermarkType ===
                    "image" && (
                    <>
                      <label className="add-watermark-image-upload">
                        <span>
                          {image
                            ? "Replace image"
                            : "Upload image"}
                        </span>

                        <input
                          type="file"
                          accept="image/png,image/jpeg"
                          onChange={(
                            event
                          ) => {
                            const selectedFile =
                              event
                                .target
                                .files?.[0];

                            if (
                              selectedFile
                            ) {
                              handleImage(
                                selectedFile
                              );
                            }

                            event.target.value =
                              "";
                          }}
                          disabled={
                            isProcessing
                          }
                        />
                      </label>

                      {imageUrl && (
                        <div className="add-watermark-image-preview">
                          <img
                            src={
                              imageUrl
                            }
                            alt="Watermark preview"
                          />
                        </div>
                      )}

                      <label className="add-watermark-field">
                        <span>
                          Width
                        </span>

                        <input
                          type="number"
                          min="30"
                          max="1000"
                          value={
                            imageWidth
                          }
                          onChange={(
                            event
                          ) =>
                            setImageWidth(
                              clamp(
                                Number(
                                  event
                                    .target
                                    .value
                                ) ||
                                  180,
                                30,
                                1000
                              )
                            )
                          }
                          disabled={
                            isProcessing
                          }
                        />
                      </label>
                    </>
                  )}
                </section>

                <section className="add-watermark-section">
                  <span className="add-watermark-label">
                    APPEARANCE
                  </span>

                  <label className="add-watermark-range-field">
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
                      min="5"
                      max="100"
                      value={
                        opacity
                      }
                      onChange={(
                        event
                      ) =>
                        setOpacity(
                          Number(
                            event
                              .target
                              .value
                          )
                        )
                      }
                      disabled={
                        isProcessing
                      }
                    />
                  </label>

                  <label className="add-watermark-range-field">
                    <div>
                      <span>
                        Rotation
                      </span>

                      <strong>
                        {rotation}°
                      </strong>
                    </div>

                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={
                        rotation
                      }
                      onChange={(
                        event
                      ) =>
                        setRotation(
                          Number(
                            event
                              .target
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

                <section className="add-watermark-section">
                  <span className="add-watermark-label">
                    PAGES
                  </span>

                  <div className="add-watermark-page-options">
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
                        "first"
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setPageSelection(
                          "first"
                        )
                      }
                      disabled={
                        isProcessing
                      }
                    >
                      First
                    </button>

                    <button
                      type="button"
                      className={
                        pageSelection ===
                        "last"
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setPageSelection(
                          "last"
                        )
                      }
                      disabled={
                        isProcessing
                      }
                    >
                      Last
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
                      className="add-watermark-custom-pages"
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
                      placeholder="Example: 1, 3, 5"
                      disabled={
                        isProcessing
                      }
                    />
                  )}

                  <div className="add-watermark-selected-pages">
                    {selectedPages}
                  </div>
                </section>

                {error && (
                  <div className="add-watermark-error">
                    {error}
                  </div>
                )}
              </aside>

              <main className="add-watermark-workspace">
                <div className="add-watermark-preview-header">
                  <div>
                    <span className="add-watermark-label">
                      DOCUMENT PREVIEW
                    </span>

                    <p>
                      Drag the watermark anywhere
                      on the page.
                    </p>
                  </div>

                  <div className="add-watermark-page-controls">
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

                <div className="add-watermark-page-stage">
                  <div className="add-watermark-page-shell">
                    {pdfUrl && (
                      <iframe
                        title="PDF watermark preview"
                        src={`${pdfUrl}#page=${pageNumber}&toolbar=0&navpanes=0&scrollbar=0`}
                        className="add-watermark-pdf-preview"
                      />
                    )}

                    <div
                      ref={
                        previewRef
                      }
                      className="add-watermark-interaction-layer"
                      onPointerDown={
                        handlePreviewPointerDown
                      }
                      onPointerMove={
                        handlePreviewPointerMove
                      }
                      onPointerUp={
                        handlePreviewPointerUp
                      }
                      onPointerCancel={
                        handlePreviewPointerUp
                      }
                    >
                      <div
                        className={`add-watermark-preview-item ${
                          previewDragging
                            ? "dragging"
                            : ""
                        }`}
                        style={{
                          left:
                            `${position.x * 100}%`,
                          top:
                            `${position.y * 100}%`,
                          opacity:
                            opacity /
                            100,
                          transform:
                            `translate(-50%, -50%) rotate(${rotation}deg)`,
                        }}
                      >
                        {watermarkType ===
                          "text" && (
                          <span
                            className={`add-watermark-preview-text font-${font}`}
                            style={{
                              fontSize:
                                `clamp(14px, ${Math.max(
                                  1,
                                  fontSize /
                                    7
                                )}vw, 56px)`,
                            }}
                          >
                            {watermarkText ||
                              "CONFIDENTIAL"}
                          </span>
                        )}

                        {watermarkType ===
                          "image" &&
                          imageUrl && (
                            <img
                              src={
                                imageUrl
                              }
                              alt="Watermark"
                              className="add-watermark-preview-image"
                              style={{
                                width:
                                  `${Math.min(
                                    65,
                                    Math.max(
                                      10,
                                      imageWidth /
                                        7
                                    )
                                  )}%`,
                              }}
                            />
                          )}

                        {watermarkType ===
                          "image" &&
                          !imageUrl && (
                            <div className="add-watermark-image-placeholder">
                              IMAGE
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="add-watermark-preview-hint">
                  Drag on the document to position
                  your watermark.
                </div>
              </main>
            </div>
          )}

          {!isLoading && (
            <div className="add-watermark-bottom">
              <div className="add-watermark-summary">
                <span>
                  {selectedPages}
                </span>

                <span>•</span>

                <span>
                  {watermarkType ===
                  "text"
                    ? "Text watermark"
                    : "Image watermark"}
                </span>
              </div>

              {isProcessing ? (
                <div className="add-watermark-progress">
                  <div className="add-watermark-progress-header">
                    <span>
                      Adding watermark
                    </span>

                    <strong>
                      {progress}%
                    </strong>
                  </div>

                  <div className="add-watermark-progress-track">
                    <div
                      className="add-watermark-progress-fill"
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="add-watermark-process-button"
                  onClick={
                    handleAddWatermark
                  }
                  disabled={
                    !file ||
                    (watermarkType ===
                      "text" &&
                      !watermarkText.trim()) ||
                    (watermarkType ===
                      "image" &&
                      !image)
                  }
                >
                  Add Watermark
                  <span>→</span>
                </button>
              )}
            </div>
          )}

          {result && resultUrl && (
            <div className="add-watermark-result">
              <div>
                <span className="add-watermark-result-label">
                  COMPLETE
                </span>

                <h3>
                  Your watermarked PDF is ready.
                </h3>

                <p>
                  {result.watermarkedPages}{" "}
                  {result.watermarkedPages ===
                  1
                    ? "page"
                    : "pages"}{" "}
                  watermarked with a{" "}
                  {result.watermarkType}{" "}
                  watermark.
                </p>
              </div>

              <a
                href={resultUrl}
                download={`watermarked-${file.name}`}
                className="add-watermark-download-button"
              >
                Download PDF
                <span>↓</span>
              </a>
            </div>
          )}
        </>
      )}

      <style>{`
        .add-watermark {
          width: 100%;
          min-width: 0;
          color: rgba(255,255,255,0.94);
        }

        .add-watermark-upload {
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

        .add-watermark-upload-icon {
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
          margin-bottom: 20px;
        }

        .add-watermark-upload h2 {
          margin: 0;
          font-size: 28px;
          letter-spacing: -0.03em;
        }

        .add-watermark-upload p {
          max-width: 510px;
          margin: 10px 0 26px;
          color: rgba(255,255,255,0.52);
          font-size: 14px;
          line-height: 1.55;
        }

        .add-watermark-upload-button {
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

        .add-watermark-upload-button input {
          display: none;
        }

        .add-watermark-upload-hint {
          margin-top: 13px;
          color: rgba(255,255,255,0.28);
          font-size: 11px;
        }

        .add-watermark-upload-error {
          margin-top: 17px;
          padding: 9px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255,80,55,0.18);
          background: rgba(255,70,50,0.07);
          color: #ff9b84;
          font-size: 10px;
        }

        .add-watermark-toolbar {
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

        .add-watermark-file {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .add-watermark-file-icon {
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

        .add-watermark-file-details {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .add-watermark-file-details strong {
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
        }

        .add-watermark-file-details span {
          color: rgba(255,255,255,0.35);
          font-size: 10px;
        }

        .add-watermark-type-switch {
          display: flex;
          gap: 6px;
        }

        .add-watermark-type-switch button,
        .add-watermark-change-button {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
          color: rgba(255,255,255,0.68);
          border-radius: 11px;
          padding: 10px 13px;
          font-size: 11px;
          cursor: pointer;
        }

        .add-watermark-type-switch button:hover,
        .add-watermark-change-button:hover {
          color: white;
          background: rgba(255,255,255,0.07);
        }

        .add-watermark-type-switch button.active {
          color: white;
          border-color: rgba(255,118,40,0.35);
          background: rgba(255,105,28,0.12);
        }

        .add-watermark-change-button {
          white-space: nowrap;
        }

        .add-watermark-loading {
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

        .add-watermark-spinner {
          width: 34px;
          height: 34px;
          margin-bottom: 18px;
          border: 2px solid rgba(255,255,255,0.08);
          border-top-color: #ff7530;
          border-radius: 50%;
          animation:
            addWatermarkSpin 0.85s linear infinite;
        }

        @keyframes addWatermarkSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .add-watermark-loading h3 {
          margin: 0;
          font-size: 16px;
        }

        .add-watermark-loading p {
          margin: 7px 0 0;
          color: rgba(255,255,255,0.35);
          font-size: 11px;
        }

        .add-watermark-editor {
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

        .add-watermark-sidebar {
          min-width: 0;
          box-sizing: border-box;
          padding: 22px;
          overflow-x: hidden;
          overflow-y: auto;
          border-right: 1px solid rgba(255,255,255,0.07);
          background: rgba(7,7,7,0.24);
        }

        .add-watermark-section {
          min-width: 0;
          padding-bottom: 20px;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .add-watermark-section:last-child {
          border-bottom: 0;
          margin-bottom: 0;
        }

        .add-watermark-label {
          display: block;
          margin-bottom: 10px;
          color: rgba(255,255,255,0.32);
          font-size: 9px;
          letter-spacing: 0.18em;
          font-weight: 800;
        }

        .add-watermark-text-input {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          padding: 10px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          background: rgba(0,0,0,0.2);
          color: white;
          outline: 0;
          font-size: 11px;
        }

        .add-watermark-text-input:focus,
        .add-watermark-field input:focus,
        .add-watermark-field select:focus,
        .add-watermark-custom-pages:focus {
          border-color: rgba(255,114,42,0.38);
        }

        .add-watermark-field {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 12px;
        }

        .add-watermark-field > span {
          color: rgba(255,255,255,0.5);
          font-size: 10px;
        }

        .add-watermark-field input,
        .add-watermark-field select {
          width: 105px;
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

        .add-watermark-image-upload {
          min-height: 82px;
          border: 1px dashed rgba(255,255,255,0.14);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: rgba(255,255,255,0.45);
          background: rgba(255,255,255,0.018);
          cursor: pointer;
          font-size: 10px;
        }

        .add-watermark-image-upload:hover {
          border-color: rgba(255,114,42,0.3);
          color: rgba(255,255,255,0.72);
        }

        .add-watermark-image-upload input {
          display: none;
        }

        .add-watermark-image-preview {
          height: 90px;
          margin-top: 10px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: white;
        }

        .add-watermark-image-preview img {
          max-width: 92%;
          max-height: 82%;
          object-fit: contain;
        }

        .add-watermark-range-field {
          display: block;
          margin-top: 15px;
        }

        .add-watermark-range-field > div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .add-watermark-range-field span {
          color: rgba(255,255,255,0.5);
          font-size: 10px;
        }

        .add-watermark-range-field strong {
          color: rgba(255,255,255,0.62);
          font-size: 10px;
        }

        .add-watermark-range-field input[type="range"] {
          width: 100%;
          accent-color: #ff6f2b;
          cursor: pointer;
        }

        .add-watermark-page-options {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0,1fr));
          gap: 6px;
        }

        .add-watermark-page-options button {
          min-width: 0;
          padding: 8px 5px;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 8px;
          background: rgba(255,255,255,0.025);
          color: rgba(255,255,255,0.42);
          font-size: 9px;
          cursor: pointer;
        }

        .add-watermark-page-options button:hover {
          color: white;
          background: rgba(255,255,255,0.055);
        }

        .add-watermark-page-options button.active {
          color: white;
          border-color: rgba(255,115,40,0.28);
          background: rgba(255,105,28,0.1);
        }

        .add-watermark-custom-pages {
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

        .add-watermark-selected-pages {
          margin-top: 8px;
          color: rgba(255,255,255,0.25);
          font-size: 9px;
        }

        .add-watermark-error {
          padding: 10px 11px;
          border: 1px solid rgba(255,80,55,0.18);
          border-radius: 10px;
          background: rgba(255,70,50,0.07);
          color: #ff9b84;
          font-size: 10px;
          line-height: 1.45;
        }

        .add-watermark-workspace {
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

        .add-watermark-preview-header {
          min-width: 0;
          padding: 18px 20px 0;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
        }

        .add-watermark-preview-header > div:first-child {
          min-width: 0;
        }

        .add-watermark-preview-header .add-watermark-label {
          margin-bottom: 4px;
        }

        .add-watermark-preview-header p {
          margin: 0;
          color: rgba(255,255,255,0.28);
          font-size: 9px;
        }

        .add-watermark-page-controls {
          flex: 0 0 auto;
          display: grid;
          grid-template-columns: 30px auto 30px;
          align-items: center;
          gap: 6px;
        }

        .add-watermark-page-controls button {
          width: 30px;
          height: 30px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          background: rgba(255,255,255,0.035);
          color: rgba(255,255,255,0.65);
          cursor: pointer;
        }

        .add-watermark-page-controls button:disabled {
          opacity: 0.25;
          cursor: not-allowed;
        }

        .add-watermark-page-controls span {
          color: rgba(255,255,255,0.48);
          font-size: 10px;
          white-space: nowrap;
        }

        .add-watermark-page-stage {
          flex: 1;
          min-height: 540px;
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 30px;
          overflow: auto;
        }

        .add-watermark-page-shell {
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

        .add-watermark-pdf-preview {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: 0;
          background: white;
          pointer-events: none;
        }

        .add-watermark-interaction-layer {
          position: absolute;
          inset: 0;
          cursor: grab;
          touch-action: none;
        }

        .add-watermark-interaction-layer:active {
          cursor: grabbing;
        }

        .add-watermark-preview-item {
          position: absolute;
          width: max-content;
          max-width: 85%;
          min-width: 90px;
          min-height: 45px;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          user-select: none;
          transform-origin: center;
        }

        .add-watermark-preview-item.dragging {
          filter: drop-shadow(
            0 7px 10px rgba(0,0,0,0.25)
          );
        }

        .add-watermark-preview-text {
          max-width: 100%;
          padding: 8px 13px;
          box-sizing: border-box;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: #555;
          font-weight: 700;
          letter-spacing: 0.03em;
          background: rgba(255,255,255,0.38);
          border: 1px dashed rgba(80,80,80,0.2);
        }

        .add-watermark-preview-text.font-helvetica {
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .add-watermark-preview-text.font-times {
          font-family:
            Georgia,
            "Times New Roman",
            serif;
        }

        .add-watermark-preview-text.font-courier {
          font-family:
            "Courier New",
            monospace;
        }

        .add-watermark-preview-image {
          max-width: 100%;
          max-height: 220px;
          object-fit: contain;
        }

        .add-watermark-image-placeholder {
          width: 130px;
          height: 65px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px dashed rgba(50,50,50,0.3);
          border-radius: 8px;
          color: rgba(40,40,40,0.38);
          background: rgba(255,255,255,0.32);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.13em;
        }

        .add-watermark-preview-hint {
          padding: 11px 18px 14px;
          text-align: center;
          color: rgba(255,255,255,0.28);
          font-size: 10px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .add-watermark-bottom {
          width: 100%;
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-top: 16px;
          padding: 15px 2px 0;
        }

        .add-watermark-summary {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 9px;
          flex-wrap: wrap;
          color: rgba(255,255,255,0.38);
          font-size: 11px;
        }

        .add-watermark-process-button,
        .add-watermark-download-button {
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

        .add-watermark-process-button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
          box-shadow: none;
        }

        .add-watermark-progress {
          width: min(380px, 45%);
          min-width: 180px;
        }

        .add-watermark-progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 7px;
          color: rgba(255,255,255,0.45);
          font-size: 10px;
        }

        .add-watermark-progress-header strong {
          color: #ff985b;
        }

        .add-watermark-progress-track {
          height: 5px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
        }

        .add-watermark-progress-fill {
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

        .add-watermark-result {
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

        .add-watermark-result > div:first-child {
          min-width: 0;
        }

        .add-watermark-result-label {
          color: #8de0ad;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.16em;
        }

        .add-watermark-result h3 {
          margin: 6px 0 4px;
          font-size: 15px;
        }

        .add-watermark-result p {
          margin: 0;
          color: rgba(255,255,255,0.42);
          font-size: 10px;
          line-height: 1.4;
        }

        @media (max-width: 900px) {
          .add-watermark-toolbar {
            grid-template-columns: 1fr auto;
          }

          .add-watermark-change-button {
            grid-column: 2;
          }

          .add-watermark-editor {
            grid-template-columns: 1fr;
          }

          .add-watermark-sidebar {
            border-right: 0;
            border-bottom: 1px solid rgba(255,255,255,0.07);
          }
        }

        @media (max-width: 650px) {
          .add-watermark-upload {
            min-height: 400px;
            padding: 28px 20px;
          }

          .add-watermark-toolbar {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .add-watermark-change-button {
            grid-column: auto;
            justify-self: start;
          }

          .add-watermark-type-switch {
            justify-self: start;
          }

          .add-watermark-sidebar {
            padding: 17px;
          }

          .add-watermark-page-stage {
            min-height: 420px;
            padding: 14px;
          }

          .add-watermark-preview-header {
            padding: 15px 15px 0;
          }

          .add-watermark-bottom,
          .add-watermark-result {
            align-items: stretch;
            flex-direction: column;
          }

          .add-watermark-progress {
            width: 100%;
            min-width: 0;
          }

          .add-watermark-process-button,
          .add-watermark-download-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default AddWatermark;