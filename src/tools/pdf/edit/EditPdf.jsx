import { useEffect, useMemo, useRef, useState } from "react";
import {
  createLineEdit,
  createRectangleEdit,
  createTextEdit,
  editPdf,
  getPdfInfo,
} from "../../../services/pdf/editPdf.js";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function EditPdf() {
  const [file, setFile] = useState(null);
  const [pdfInfo, setPdfInfo] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  const [tool, setTool] = useState("text");

  const [text, setText] = useState("");
  const [fontSize, setFontSize] = useState(18);

  const [edits, setEdits] = useState([]);

  const [selectedEditIndex, setSelectedEditIndex] = useState(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const [pdfUrl, setPdfUrl] = useState("");
  const [resultUrl, setResultUrl] = useState("");

  const canvasRef = useRef(null);
  const previewContainerRef = useRef(null);

  const currentPageEdits = useMemo(
    () =>
      edits
        .map((edit, index) => ({
          ...edit,
          originalIndex: index,
        }))
        .filter(
          (edit) =>
            edit.pageNumber === pageNumber
        ),
    [edits, pageNumber]
  );

  useEffect(() => {
    if (!file) {
      setPdfInfo(null);
      setPdfUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    setPdfUrl(url);

    let cancelled = false;

    async function loadInfo() {
      try {
        const info = await getPdfInfo(file);

        if (!cancelled) {
          setPdfInfo(info);
          setPageNumber(1);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError?.message ||
              "Unable to read this PDF."
          );
        }
      }
    }

    loadInfo();

    return () => {
      cancelled = true;
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

  function handleFile(selectedFile) {
    setError("");
    setResult(null);
    setProgress(0);
    setEdits([]);
    setSelectedEditIndex(null);

    if (
      selectedFile &&
      selectedFile.type === "application/pdf"
    ) {
      setFile(selectedFile);
      return;
    }

    if (selectedFile) {
      setFile(null);
      setError("Please select a valid PDF file.");
    }
  }

  function getNormalizedPoint(event) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return null;
    }

    const rect =
      canvas.getBoundingClientRect();

    if (!rect.width || !rect.height) {
      return null;
    }

    return {
      x: clamp(
        (event.clientX - rect.left) /
          rect.width,
        0,
        1
      ),
      y: clamp(
        (event.clientY - rect.top) /
          rect.height,
        0,
        1
      ),
    };
  }

  function createRectFromDrag(start, end) {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);

    const width = Math.abs(
      end.x - start.x
    );

    const height = Math.abs(
      end.y - start.y
    );

    return {
      x,
      y,
      width,
      height,
    };
  }

  function handleCanvasPointerDown(event) {
    if (
      isProcessing ||
      !pdfInfo ||
      !canvasRef.current
    ) {
      return;
    }

    const point =
      getNormalizedPoint(event);

    if (!point) {
      return;
    }

    setError("");
    setSelectedEditIndex(null);
    setIsDragging(true);
    setDragStart(point);

    canvasRef.current.setPointerCapture?.(
      event.pointerId
    );
  }

  function handleCanvasPointerMove(event) {
    if (
      !isDragging ||
      !dragStart
    ) {
      return;
    }

    const point =
      getNormalizedPoint(event);

    if (!point) {
      return;
    }

    setDragPreview({
      ...createRectFromDrag(
        dragStart,
        point
      ),
    });
  }

  function handleCanvasPointerUp(event) {
    if (
      !isDragging ||
      !dragStart
    ) {
      return;
    }

    const point =
      getNormalizedPoint(event);

    setIsDragging(false);
    setDragStart(null);
    setDragPreview(null);

    canvasRef.current?.releasePointerCapture?.(
      event.pointerId
    );

    if (!point) {
      return;
    }

    const rect =
      createRectFromDrag(
        dragStart,
        point
      );

    const minimumSize = 0.025;

    if (
      rect.width < minimumSize ||
      rect.height < minimumSize
    ) {
      return;
    }

    addEdit(rect);
  }

  const [dragPreview, setDragPreview] =
    useState(null);

  function addEdit(rect) {
    let newEdit = null;

    if (tool === "text") {
      if (!text.trim()) {
        setError(
          "Enter some text before placing it on the PDF."
        );
        return;
      }

      newEdit = createTextEdit(
        pageNumber,
        rect,
        text.trim(),
        {
          fontSize,
          color: [0, 0, 0],
          background: [1, 1, 1],
          padding: 5,
        }
      );
    }

    if (tool === "rectangle") {
      newEdit =
        createRectangleEdit(
          pageNumber,
          rect,
          {
            fill: null,
            border: [0, 0, 0],
            borderWidth: 1.5,
          }
        );
    }

    if (tool === "line") {
      const start = {
        x: rect.x,
        y: rect.y,
      };

      const end = {
        x: rect.x + rect.width,
        y: rect.y + rect.height,
      };

      newEdit =
        createLineEdit(
          pageNumber,
          start,
          end,
          {
            color: [0, 0, 0],
            thickness: 1.5,
          }
        );
    }

    if (!newEdit) {
      return;
    }

    setEdits((previous) => [
      ...previous,
      newEdit,
    ]);

    setSelectedEditIndex(
      edits.length
    );
  }

  function removeEdit(index) {
    setEdits((previous) =>
      previous.filter(
        (_, editIndex) =>
          editIndex !== index
      )
    );

    setSelectedEditIndex(null);
  }

  function updateTextEdit(
    index,
    updates
  ) {
    setEdits((previous) =>
      previous.map(
        (edit, editIndex) =>
          editIndex === index
            ? {
                ...edit,
                ...updates,
              }
            : edit
      )
    );
  }

  async function handleProcess() {
    if (!file) {
      setError(
        "Please select a PDF file first."
      );
      return;
    }

    if (edits.length === 0) {
      setError(
        "Please add at least one edit."
      );
      return;
    }

    setError("");
    setResult(null);
    setIsProcessing(true);
    setProgress(0);

    try {
      const processed =
        await editPdf(
          file,
          edits,
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
        blob: processed.blob,
        pageCount:
          processed.pageCount,
        editCount:
          processed.editCount,
      });
    } catch (processError) {
      setError(
        processError?.message ||
          "Unable to edit this PDF."
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
    setTool("text");
    setText("");
    setFontSize(18);
    setEdits([]);
    setSelectedEditIndex(null);
    setDragPreview(null);
    setIsDragging(false);
    setDragStart(null);
    setIsProcessing(false);
    setProgress(0);
    setResult(null);
    setResultUrl("");
    setError("");
  }

  function previousPage() {
    setSelectedEditIndex(null);
    setPageNumber((current) =>
      Math.max(1, current - 1)
    );
  }

  function nextPage() {
    setSelectedEditIndex(null);

    setPageNumber((current) =>
      Math.min(
        pdfInfo?.pageCount || 1,
        current + 1
      )
    );
  }

  return (
    <div className="edit-pdf">
      {!file && (
        <div className="edit-pdf-upload">
          <div className="edit-pdf-upload-icon">
            ✦
          </div>

          <h2>Edit your PDF</h2>

          <p>
            Add text, shapes and lines
            directly onto your PDF.
          </p>

          <label className="edit-pdf-upload-button">
            Choose PDF
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => {
                const selected =
                  event.target.files?.[0];

                if (selected) {
                  handleFile(selected);
                }

                event.target.value = "";
              }}
            />
          </label>

          <span className="edit-pdf-upload-hint">
            or drag and drop a PDF here
          </span>
        </div>
      )}

      {file && (
        <>
          <div className="edit-pdf-toolbar">
            <div className="edit-pdf-file">
              <div className="edit-pdf-file-icon">
                PDF
              </div>

              <div>
                <strong>{file.name}</strong>
                <span>
                  {formatFileSize(
                    file.size
                  )}
                </span>
              </div>
            </div>

            <div className="edit-pdf-tools">
              <button
                type="button"
                className={
                  tool === "text"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setTool("text")
                }
                disabled={isProcessing}
              >
                T&nbsp; Text
              </button>

              <button
                type="button"
                className={
                  tool === "rectangle"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setTool(
                    "rectangle"
                  )
                }
                disabled={isProcessing}
              >
                □ Rectangle
              </button>

              <button
                type="button"
                className={
                  tool === "line"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setTool("line")
                }
                disabled={isProcessing}
              >
                ／ Line
              </button>
            </div>

            <button
              type="button"
              className="edit-pdf-reset-button"
              onClick={resetTool}
              disabled={isProcessing}
            >
              Change PDF
            </button>
          </div>

          <div className="edit-pdf-editor-layout">
            <aside className="edit-pdf-sidebar">
              <div className="edit-pdf-sidebar-section">
                <span className="edit-pdf-label">
                  TOOL
                </span>

                <div className="edit-pdf-tool-description">
                  {tool === "text" &&
                    "Drag on the page to place a text box."}

                  {tool === "rectangle" &&
                    "Drag on the page to draw a rectangle."}

                  {tool === "line" &&
                    "Drag on the page to draw a line."}
                </div>
              </div>

              {tool === "text" && (
                <div className="edit-pdf-sidebar-section">
                  <span className="edit-pdf-label">
                    TEXT
                  </span>

                  <textarea
                    value={text}
                    onChange={(event) =>
                      setText(
                        event.target.value
                      )
                    }
                    placeholder="Enter text..."
                    disabled={isProcessing}
                  />

                  <label className="edit-pdf-field">
                    <span>Font size</span>

                    <input
                      type="number"
                      min="6"
                      max="120"
                      value={fontSize}
                      onChange={(event) =>
                        setFontSize(
                          clamp(
                            Number(
                              event.target.value
                            ) || 18,
                            6,
                            120
                          )
                        )
                      }
                      disabled={
                        isProcessing
                      }
                    />
                  </label>
                </div>
              )}

              <div className="edit-pdf-sidebar-section">
                <span className="edit-pdf-label">
                  PAGE
                </span>

                <div className="edit-pdf-page-controls">
                  <button
                    type="button"
                    onClick={previousPage}
                    disabled={
                      isProcessing ||
                      pageNumber <= 1
                    }
                  >
                    ←
                  </button>

                  <span>
                    {pageNumber} /{" "}
                    {pdfInfo?.pageCount ||
                      "—"}
                  </span>

                  <button
                    type="button"
                    onClick={nextPage}
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

              <div className="edit-pdf-sidebar-section">
                <span className="edit-pdf-label">
                  EDITS
                </span>

                <div className="edit-pdf-edit-count">
                  <strong>
                    {edits.length}
                  </strong>
                  <span>
                    {edits.length === 1
                      ? " edit"
                      : " edits"}
                  </span>
                </div>

                <div className="edit-pdf-edit-list">
                  {edits.length === 0 && (
                    <span className="edit-pdf-empty">
                      No edits added yet.
                    </span>
                  )}

                  {edits.map(
                    (edit, index) => (
                      <button
                        type="button"
                        key={`${edit.type}-${index}`}
                        className={
                          selectedEditIndex ===
                          index
                            ? "selected"
                            : ""
                        }
                        onClick={() => {
                          setPageNumber(
                            edit.pageNumber
                          );
                          setSelectedEditIndex(
                            index
                          );
                        }}
                        disabled={
                          isProcessing
                        }
                      >
                        <span>
                          {edit.type ===
                            "text" &&
                            "T"}

                          {edit.type ===
                            "rectangle" &&
                            "□"}

                          {edit.type ===
                            "line" &&
                            "／"}
                        </span>

                        <div>
                          <strong>
                            {edit.type ===
                            "text"
                              ? edit.text
                              : edit.type}
                          </strong>

                          <small>
                            Page{" "}
                            {
                              edit.pageNumber
                            }
                          </small>
                        </div>

                        <span
                          className="edit-pdf-remove-edit"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeEdit(
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
              </div>

              {error && (
                <div className="edit-pdf-error">
                  {error}
                </div>
              )}
            </aside>

            <main className="edit-pdf-canvas-area">
              <div
                ref={
                  previewContainerRef
                }
                className="edit-pdf-page-stage"
              >
                <div className="edit-pdf-page-shell">
                  {pdfUrl && (
                    <iframe
                      title="PDF preview"
                      src={`${pdfUrl}#page=${pageNumber}&toolbar=0&navpanes=0&scrollbar=0`}
                      className="edit-pdf-preview"
                    />
                  )}

                  <div
                    ref={canvasRef}
                    className="edit-pdf-interaction-layer"
                    onPointerDown={
                      handleCanvasPointerDown
                    }
                    onPointerMove={
                      handleCanvasPointerMove
                    }
                    onPointerUp={
                      handleCanvasPointerUp
                    }
                    onPointerCancel={
                      handleCanvasPointerUp
                    }
                  >
                    {currentPageEdits.map(
                      (edit) => {
                        if (
                          edit.type ===
                          "line"
                        ) {
                          return (
                            <div
                              key={
                                edit.originalIndex
                              }
                              className={`edit-pdf-line-overlay ${
                                selectedEditIndex ===
                                edit.originalIndex
                                  ? "selected"
                                  : ""
                              }`}
                              style={{
                                left:
                                  `${edit.start.x * 100}%`,
                                top:
                                  `${edit.start.y * 100}%`,
                                width:
                                  `${Math.sqrt(
                                    Math.pow(
                                      (edit.end.x -
                                        edit.start.x) *
                                        100,
                                      2
                                    ) +
                                      Math.pow(
                                        (edit.end.y -
                                          edit.start.y) *
                                          100,
                                        2
                                      )
                                  )}%`,
                                transform:
                                  `rotate(${Math.atan2(
                                    edit.end.y -
                                      edit.start.y,
                                    edit.end.x -
                                      edit.start.x
                                  ) * 180 / Math.PI}deg)`,
                              }}
                              onPointerDown={(
                                event
                              ) => {
                                event.stopPropagation();
                                setSelectedEditIndex(
                                  edit.originalIndex
                                );
                              }}
                            />
                          );
                        }

                        return (
                          <div
                            key={
                              edit.originalIndex
                            }
                            className={`edit-pdf-overlay edit-pdf-${edit.type}-overlay ${
                              selectedEditIndex ===
                              edit.originalIndex
                                ? "selected"
                                : ""
                            }`}
                            style={{
                              left:
                                `${edit.x * 100}%`,
                              top:
                                `${edit.y * 100}%`,
                              width:
                                `${edit.width * 100}%`,
                              height:
                                `${edit.height * 100}%`,
                              fontSize:
                                edit.type ===
                                "text"
                                  ? `${Math.max(
                                      8,
                                      edit.fontSize *
                                        0.8
                                    )}px`
                                  : undefined,
                            }}
                            onPointerDown={(
                              event
                            ) => {
                              event.stopPropagation();
                              setSelectedEditIndex(
                                edit.originalIndex
                              );
                            }}
                          >
                            {edit.type ===
                              "text" &&
                              edit.text}

                            {selectedEditIndex ===
                              edit.originalIndex && (
                              <button
                                type="button"
                                className="edit-pdf-overlay-delete"
                                onClick={(
                                  event
                                ) => {
                                  event.stopPropagation();
                                  removeEdit(
                                    edit.originalIndex
                                  );
                                }}
                                aria-label="Delete edit"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        );
                      }
                    )}

                    {dragPreview && (
                      <div
                        className="edit-pdf-drag-preview"
                        style={{
                          left:
                            `${dragPreview.x * 100}%`,
                          top:
                            `${dragPreview.y * 100}%`,
                          width:
                            `${dragPreview.width * 100}%`,
                          height:
                            `${dragPreview.height * 100}%`,
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="edit-pdf-canvas-hint">
                {tool === "text"
                  ? "Enter text, then drag on the page to place it."
                  : tool ===
                    "rectangle"
                  ? "Drag on the page to create a rectangle."
                  : "Drag on the page to draw a line."}
              </div>
            </main>
          </div>

          <div className="edit-pdf-bottom-bar">
            <div className="edit-pdf-summary">
              <span>
                Page {pageNumber} of{" "}
                {pdfInfo?.pageCount || "—"}
              </span>

              <span>•</span>

              <span>
                {edits.length}{" "}
                {edits.length === 1
                  ? "edit"
                  : "edits"}
              </span>
            </div>

            {isProcessing ? (
              <div className="edit-pdf-progress">
                <div className="edit-pdf-progress-header">
                  <span>
                    Processing PDF
                  </span>

                  <strong>
                    {progress}%
                  </strong>
                </div>

                <div className="edit-pdf-progress-track">
                  <div
                    className="edit-pdf-progress-fill"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="edit-pdf-process-button"
                onClick={handleProcess}
                disabled={
                  !file ||
                  edits.length === 0
                }
              >
                Apply Edits
                <span>→</span>
              </button>
            )}
          </div>

          {result && resultUrl && (
            <div className="edit-pdf-result">
              <div>
                <span className="edit-pdf-result-label">
                  COMPLETE
                </span>

                <h3>
                  Your edited PDF is ready.
                </h3>

                <p>
                  {result.editCount}{" "}
                  {result.editCount ===
                  1
                    ? "edit"
                    : "edits"}{" "}
                  applied across{" "}
                  {result.pageCount}{" "}
                  {result.pageCount === 1
                    ? "page"
                    : "pages"}.
                </p>
              </div>

              <a
                className="edit-pdf-download-button"
                href={resultUrl}
                download={`edited-${file.name}`}
              >
                Download PDF
                <span>↓</span>
              </a>
            </div>
          )}
        </>
      )}

      <style>{`
        .edit-pdf {
          width: 100%;
          color: rgba(255, 255, 255, 0.94);
        }

        .edit-pdf-upload {
          min-height: 520px;
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

        .edit-pdf-upload-icon {
          width: 74px;
          height: 74px;
          border-radius: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(
              circle at center,
              rgba(255,115,35,0.38),
              rgba(255,115,35,0.08) 65%,
              transparent 75%
            );
          color: #ff8d4a;
          font-size: 32px;
          margin-bottom: 22px;
        }

        .edit-pdf-upload h2 {
          margin: 0;
          font-size: 28px;
          letter-spacing: -0.03em;
        }

        .edit-pdf-upload p {
          margin: 10px 0 28px;
          color: rgba(255,255,255,0.56);
          font-size: 14px;
        }

        .edit-pdf-upload-button {
          cursor: pointer;
          padding: 13px 22px;
          border-radius: 14px;
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

        .edit-pdf-upload-button input {
          display: none;
        }

        .edit-pdf-upload-hint {
          margin-top: 14px;
          font-size: 12px;
          color: rgba(255,255,255,0.3);
        }

        .edit-pdf-toolbar {
          display: flex;
          align-items: center;
          gap: 18px;
          min-height: 72px;
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

        .edit-pdf-file {
          min-width: 220px;
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .edit-pdf-file-icon {
          width: 38px;
          height: 38px;
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

        .edit-pdf-file > div:last-child {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .edit-pdf-file strong {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
        }

        .edit-pdf-file span {
          font-size: 10px;
          color: rgba(255,255,255,0.38);
        }

        .edit-pdf-tools {
          display: flex;
          gap: 8px;
          flex: 1;
          justify-content: center;
        }

        .edit-pdf-tools button,
        .edit-pdf-reset-button {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
          color: rgba(255,255,255,0.7);
          border-radius: 11px;
          padding: 10px 13px;
          font-size: 12px;
          cursor: pointer;
          transition:
            background 0.18s ease,
            border-color 0.18s ease,
            color 0.18s ease;
        }

        .edit-pdf-tools button:hover,
        .edit-pdf-reset-button:hover {
          background: rgba(255,255,255,0.07);
          color: white;
        }

        .edit-pdf-tools button.active {
          color: white;
          border-color: rgba(255,120,42,0.35);
          background:
            rgba(255,105,28,0.12);
        }

        .edit-pdf-reset-button {
          white-space: nowrap;
        }

        .edit-pdf-editor-layout {
          display: grid;
          grid-template-columns: 270px minmax(0, 1fr);
          min-height: 650px;
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

        .edit-pdf-sidebar {
          padding: 22px;
          border-right: 1px solid rgba(255,255,255,0.07);
          background: rgba(7,7,7,0.24);
        }

        .edit-pdf-sidebar-section {
          padding-bottom: 20px;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .edit-pdf-sidebar-section:last-child {
          border-bottom: 0;
          margin-bottom: 0;
        }

        .edit-pdf-label {
          display: block;
          margin-bottom: 10px;
          color: rgba(255,255,255,0.32);
          font-size: 9px;
          letter-spacing: 0.18em;
          font-weight: 800;
        }

        .edit-pdf-tool-description {
          color: rgba(255,255,255,0.58);
          line-height: 1.5;
          font-size: 12px;
        }

        .edit-pdf-sidebar textarea {
          width: 100%;
          min-height: 100px;
          box-sizing: border-box;
          resize: vertical;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          background: rgba(0,0,0,0.2);
          color: white;
          padding: 11px;
          font: inherit;
          font-size: 12px;
          outline: none;
        }

        .edit-pdf-sidebar textarea:focus,
        .edit-pdf-field input:focus {
          border-color: rgba(255,116,37,0.4);
        }

        .edit-pdf-field {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 12px;
        }

        .edit-pdf-field span {
          color: rgba(255,255,255,0.52);
          font-size: 11px;
        }

        .edit-pdf-field input {
          width: 72px;
          box-sizing: border-box;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 9px;
          background: rgba(0,0,0,0.2);
          color: white;
          padding: 8px;
          outline: none;
          font-size: 11px;
        }

        .edit-pdf-page-controls {
          display: grid;
          grid-template-columns: 36px 1fr 36px;
          gap: 7px;
          align-items: center;
        }

        .edit-pdf-page-controls button {
          height: 34px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
          color: rgba(255,255,255,0.72);
          border-radius: 9px;
          cursor: pointer;
        }

        .edit-pdf-page-controls button:disabled {
          opacity: 0.28;
          cursor: not-allowed;
        }

        .edit-pdf-page-controls span {
          text-align: center;
          color: rgba(255,255,255,0.6);
          font-size: 11px;
        }

        .edit-pdf-edit-count {
          display: flex;
          align-items: baseline;
          gap: 5px;
          margin-bottom: 11px;
        }

        .edit-pdf-edit-count strong {
          font-size: 24px;
          color: #ff9658;
        }

        .edit-pdf-edit-count span {
          color: rgba(255,255,255,0.38);
          font-size: 10px;
        }

        .edit-pdf-edit-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 250px;
          overflow-y: auto;
        }

        .edit-pdf-edit-list button {
          width: 100%;
          min-width: 0;
          display: grid;
          grid-template-columns: 26px minmax(0, 1fr) 20px;
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

        .edit-pdf-edit-list button:hover,
        .edit-pdf-edit-list button.selected {
          background: rgba(255,105,28,0.08);
          border-color: rgba(255,111,33,0.2);
        }

        .edit-pdf-edit-list button > span:first-child {
          width: 24px;
          height: 24px;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.05);
          font-size: 10px;
          color: #ff9558;
        }

        .edit-pdf-edit-list button > div {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .edit-pdf-edit-list strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 10px;
        }

        .edit-pdf-edit-list small {
          color: rgba(255,255,255,0.3);
          font-size: 8px;
        }

        .edit-pdf-remove-edit {
          color: rgba(255,255,255,0.3);
          cursor: pointer;
          font-size: 16px;
        }

        .edit-pdf-remove-edit:hover {
          color: #ff8a52;
        }

        .edit-pdf-empty {
          color: rgba(255,255,255,0.27);
          font-size: 10px;
        }

        .edit-pdf-error {
          padding: 10px 11px;
          border: 1px solid rgba(255,80,55,0.18);
          border-radius: 10px;
          background: rgba(255,70,50,0.07);
          color: #ff9b84;
          font-size: 10px;
          line-height: 1.45;
        }

        .edit-pdf-canvas-area {
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

        .edit-pdf-page-stage {
          flex: 1;
          min-height: 600px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 28px;
          overflow: auto;
        }

        .edit-pdf-page-shell {
          position: relative;
          width: min(100%, 760px);
          aspect-ratio: 0.707;
          background: white;
          border-radius: 2px;
          overflow: hidden;
          box-shadow:
            0 24px 60px rgba(0,0,0,0.45);
        }

        .edit-pdf-preview {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: 0;
          background: white;
          pointer-events: none;
        }

        .edit-pdf-interaction-layer {
          position: absolute;
          inset: 0;
          cursor: crosshair;
          touch-action: none;
        }

        .edit-pdf-overlay {
          position: absolute;
          box-sizing: border-box;
          border: 1px dashed transparent;
          display: flex;
          align-items: flex-start;
          justify-content: flex-start;
          overflow: visible;
          user-select: none;
        }

        .edit-pdf-text-overlay {
          padding: 0;
          color: #111;
          white-space: pre-wrap;
          word-break: break-word;
          background: rgba(255,255,255,0.82);
        }

        .edit-pdf-rectangle-overlay {
          border: 2px solid rgba(255,105,28,0.75);
          background: rgba(255,105,28,0.04);
        }

        .edit-pdf-overlay.selected {
          border-color: #ff722b;
          box-shadow:
            0 0 0 2px rgba(255,114,43,0.12);
        }

        .edit-pdf-overlay-delete {
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

        .edit-pdf-line-overlay {
          position: absolute;
          height: 2px;
          transform-origin: 0 50%;
          background: rgba(255,105,28,0.9);
          pointer-events: auto;
          cursor: pointer;
        }

        .edit-pdf-line-overlay.selected {
          box-shadow:
            0 0 0 2px rgba(255,105,28,0.2);
        }

        .edit-pdf-drag-preview {
          position: absolute;
          border: 1px dashed #ff7d38;
          background: rgba(255,105,28,0.08);
          pointer-events: none;
        }

        .edit-pdf-canvas-hint {
          padding: 11px 18px 14px;
          text-align: center;
          color: rgba(255,255,255,0.28);
          font-size: 10px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .edit-pdf-bottom-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-top: 16px;
          padding: 15px 2px 0;
        }

        .edit-pdf-summary {
          display: flex;
          align-items: center;
          gap: 9px;
          color: rgba(255,255,255,0.38);
          font-size: 11px;
        }

        .edit-pdf-process-button,
        .edit-pdf-download-button {
          border: 0;
          border-radius: 13px;
          padding: 12px 17px;
          display: inline-flex;
          align-items: center;
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

        .edit-pdf-process-button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
          box-shadow: none;
        }

        .edit-pdf-progress {
          width: min(380px, 45%);
        }

        .edit-pdf-progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 7px;
          color: rgba(255,255,255,0.45);
          font-size: 10px;
        }

        .edit-pdf-progress-header strong {
          color: #ff985b;
        }

        .edit-pdf-progress-track {
          height: 5px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
        }

        .edit-pdf-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #ff5310,
            #ff9b5b
          );
          transition: width 0.2s ease;
        }

        .edit-pdf-result {
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

        .edit-pdf-result-label {
          color: #8de0ad;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.16em;
        }

        .edit-pdf-result h3 {
          margin: 6px 0 4px;
          font-size: 15px;
        }

        .edit-pdf-result p {
          margin: 0;
          color: rgba(255,255,255,0.42);
          font-size: 10px;
        }

        @media (max-width: 900px) {
          .edit-pdf-editor-layout {
            grid-template-columns: 1fr;
          }

          .edit-pdf-sidebar {
            border-right: 0;
            border-bottom: 1px solid rgba(255,255,255,0.07);
          }

          .edit-pdf-toolbar {
            flex-wrap: wrap;
          }

          .edit-pdf-tools {
            order: 3;
            width: 100%;
            justify-content: flex-start;
          }
        }

        @media (max-width: 640px) {
          .edit-pdf-upload {
            min-height: 400px;
            padding: 28px;
          }

          .edit-pdf-page-stage {
            padding: 12px;
            min-height: 450px;
          }

          .edit-pdf-bottom-bar,
          .edit-pdf-result {
            align-items: flex-start;
            flex-direction: column;
          }

          .edit-pdf-progress {
            width: 100%;
          }

          .edit-pdf-process-button,
          .edit-pdf-download-button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

export default EditPdf;