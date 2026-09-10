import { useEffect, useMemo, useRef, useState } from "react";
import {
  createImageSignature,
  createTypedSignature,
  getSignPdfInfo,
  signPdf,
} from "../../../services/pdf/signPdf.js";

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

function createPreviewFromFile(file) {
  if (!file) return "";

  return URL.createObjectURL(file);
}

function SignPdf() {
  const [file, setFile] = useState(null);
  const [pdfInfo, setPdfInfo] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  const [signatureMode, setSignatureMode] =
    useState("typed");

  const [typedName, setTypedName] =
    useState("");

  const [signatureFont, setSignatureFont] =
    useState("script");

  const [signatureSize, setSignatureSize] =
    useState(30);

  const [signatureImage, setSignatureImage] =
    useState(null);

  const [signatureImageUrl, setSignatureImageUrl] =
    useState("");

  const [signatures, setSignatures] =
    useState([]);

  const [selectedSignatureIndex, setSelectedSignatureIndex] =
    useState(null);

  const [isDrawing, setIsDrawing] =
    useState(false);

  const [drawStart, setDrawStart] =
    useState(null);

  const [drawPreview, setDrawPreview] =
    useState(null);

  const [isProcessing, setIsProcessing] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [result, setResult] =
    useState(null);

  const [pdfUrl, setPdfUrl] =
    useState("");

  const [resultUrl, setResultUrl] =
    useState("");

  const [error, setError] =
    useState("");

  const canvasRef = useRef(null);

  const currentPageSignatures =
    useMemo(() => {
      return signatures
        .map((signature, index) => ({
          ...signature,
          originalIndex: index,
        }))
        .filter(
          (signature) =>
            signature.pageNumber ===
            pageNumber
        );
    }, [signatures, pageNumber]);

  useEffect(() => {
    if (!file) {
      setPdfInfo(null);
      setPdfUrl("");
      return;
    }

    const url =
      createPreviewFromFile(file);

    setPdfUrl(url);

    let cancelled = false;

    async function loadPdfInfo() {
      try {
        const info =
          await getSignPdfInfo(file);

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

    loadPdfInfo();

    return () => {
      cancelled = true;

      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [file]);

  useEffect(() => {
    if (!signatureImage) {
      setSignatureImageUrl("");
      return;
    }

    const url =
      URL.createObjectURL(
        signatureImage
      );

    setSignatureImageUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [signatureImage]);

  useEffect(() => {
    return () => {
      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }
    };
  }, [resultUrl]);

  function handlePdfFile(selectedFile) {
    setError("");
    setResult(null);
    setProgress(0);
    setSignatures([]);
    setSelectedSignatureIndex(null);

    if (
      selectedFile &&
      selectedFile.type ===
        "application/pdf"
    ) {
      setFile(selectedFile);
      return;
    }

    if (selectedFile) {
      setFile(null);
      setError(
        "Please select a valid PDF file."
      );
    }
  }

  function handleSignatureImage(
    selectedFile
  ) {
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
      setSignatureImage(null);

      setError(
        "Please use a PNG or JPEG signature image."
      );

      return;
    }

    setSignatureImage(
      selectedFile
    );

    setSignatureMode("image");
  }

  function getNormalizedPoint(event) {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return null;
    }

    const rect =
      canvas.getBoundingClientRect();

    if (
      !rect.width ||
      !rect.height
    ) {
      return null;
    }

    return {
      x: clamp(
        (event.clientX -
          rect.left) /
          rect.width,
        0,
        1
      ),
      y: clamp(
        (event.clientY -
          rect.top) /
          rect.height,
        0,
        1
      ),
    };
  }

  function createRectFromDrag(
    start,
    end
  ) {
    const x = Math.min(
      start.x,
      end.x
    );

    const y = Math.min(
      start.y,
      end.y
    );

    const width =
      Math.abs(
        end.x -
          start.x
      );

    const height =
      Math.abs(
        end.y -
          start.y
      );

    return {
      x,
      y,
      width,
      height,
    };
  }

  function handlePointerDown(
    event
  ) {
    if (
      isProcessing ||
      !file ||
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
    setSelectedSignatureIndex(
      null
    );

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

  function handlePointerMove(
    event
  ) {
    if (
      !isDrawing ||
      !drawStart
    ) {
      return;
    }

    const point =
      getNormalizedPoint(event);

    if (!point) {
      return;
    }

    setDrawPreview(
      createRectFromDrag(
        drawStart,
        point
      )
    );
  }

  function handlePointerUp(
    event
  ) {
    if (
      !isDrawing ||
      !drawStart
    ) {
      return;
    }

    const point =
      getNormalizedPoint(event);

    setIsDrawing(false);
    setDrawStart(null);
    setDrawPreview(null);

    canvasRef.current?.releasePointerCapture?.(
      event.pointerId
    );

    if (!point) {
      return;
    }

    const rect =
      createRectFromDrag(
        drawStart,
        point
      );

    if (
      rect.width < 0.04 ||
      rect.height < 0.025
    ) {
      return;
    }

    addSignature(rect);
  }

  function addSignature(rect) {
    if (
      signatureMode ===
      "typed"
    ) {
      if (!typedName.trim()) {
        setError(
          "Enter your name before placing the signature."
        );

        return;
      }

      const signature =
        createTypedSignature(
          pageNumber,
          rect,
          typedName.trim(),
          {
            font:
              signatureFont,
            fontSize:
              signatureSize,
            color: [
              20,
              35,
              65,
            ],
            alignment:
              "center",
            showLine: false,
          }
        );

      setSignatures(
        (previous) => [
          ...previous,
          signature,
        ]
      );

      setSelectedSignatureIndex(
        signatures.length
      );

      return;
    }

    if (
      signatureMode ===
      "image"
    ) {
      if (!signatureImage) {
        setError(
          "Upload a signature image first."
        );

        return;
      }

      const signature =
        createImageSignature(
          pageNumber,
          rect,
          signatureImage
        );

      setSignatures(
        (previous) => [
          ...previous,
          signature,
        ]
      );

      setSelectedSignatureIndex(
        signatures.length
      );
    }
  }

  function removeSignature(
    index
  ) {
    setSignatures(
      (previous) =>
        previous.filter(
          (_, signatureIndex) =>
            signatureIndex !==
            index
        )
    );

    setSelectedSignatureIndex(
      null
    );
  }

  function changePage(
    nextPage
  ) {
    setPageNumber(
      clamp(
        nextPage,
        1,
        pdfInfo?.pageCount || 1
      )
    );

    setSelectedSignatureIndex(
      null
    );
  }

  async function handleSignPdf() {
    if (!file) {
      setError(
        "Please select a PDF file first."
      );

      return;
    }

    if (
      signatures.length ===
      0
    ) {
      setError(
        "Please place at least one signature."
      );

      return;
    }

    setError("");
    setResult(null);
    setIsProcessing(true);
    setProgress(0);

    try {
      const processed =
        await signPdf(
          file,
          signatures,
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
        signatureCount:
          processed.signatureCount,
      });
    } catch (signError) {
      setError(
        signError?.message ||
          "Unable to sign this PDF."
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

    setSignatureMode("typed");
    setTypedName("");
    setSignatureFont("script");
    setSignatureSize(30);

    setSignatureImage(null);
    setSignatures([]);
    setSelectedSignatureIndex(
      null
    );

    setIsDrawing(false);
    setDrawStart(null);
    setDrawPreview(null);

    setIsProcessing(false);
    setProgress(0);
    setResult(null);

    setPdfUrl("");
    setResultUrl("");
    setError("");
  }

  return (
    <div className="sign-pdf">
      {!file && (
        <div className="sign-pdf-upload">
          <div className="sign-pdf-upload-icon">
            ✎
          </div>

          <h2>
            Sign your PDF
          </h2>

          <p>
            Add your signature and
            place it exactly where
            you need it.
          </p>

          <label className="sign-pdf-upload-button">
            Choose PDF
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => {
                const selectedFile =
                  event.target
                    .files?.[0];

                if (
                  selectedFile
                ) {
                  handlePdfFile(
                    selectedFile
                  );
                }

                event.target.value =
                  "";
              }}
            />
          </label>

          <span className="sign-pdf-upload-hint">
            or drag and drop a PDF
          </span>

          {error && (
            <div className="sign-pdf-upload-error">
              {error}
            </div>
          )}
        </div>
      )}

      {file && (
        <>
          <div className="sign-pdf-toolbar">
            <div className="sign-pdf-file">
              <div className="sign-pdf-file-icon">
                PDF
              </div>

              <div>
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

            <div className="sign-pdf-mode-switch">
              <button
                type="button"
                className={
                  signatureMode ===
                  "typed"
                    ? "active"
                    : ""
                }
                onClick={() => {
                  setSignatureMode(
                    "typed"
                  );
                  setError("");
                }}
                disabled={
                  isProcessing
                }
              >
                Type Signature
              </button>

              <button
                type="button"
                className={
                  signatureMode ===
                  "image"
                    ? "active"
                    : ""
                }
                onClick={() => {
                  setSignatureMode(
                    "image"
                  );
                  setError("");
                }}
                disabled={
                  isProcessing
                }
              >
                Upload Signature
              </button>
            </div>

            <button
              type="button"
              className="sign-pdf-change-button"
              onClick={resetTool}
              disabled={
                isProcessing
              }
            >
              Change PDF
            </button>
          </div>

          <div className="sign-pdf-editor">
            <aside className="sign-pdf-sidebar">
              <section className="sign-pdf-section">
                <span className="sign-pdf-label">
                  SIGNATURE
                </span>

                {signatureMode ===
                  "typed" && (
                  <>
                    <input
                      className="sign-pdf-text-input"
                      type="text"
                      value={
                        typedName
                      }
                      onChange={(
                        event
                      ) =>
                        setTypedName(
                          event.target
                            .value
                        )
                      }
                      placeholder="Your name"
                      disabled={
                        isProcessing
                      }
                    />

                    <label className="sign-pdf-field">
                      <span>
                        Style
                      </span>

                      <select
                        value={
                          signatureFont
                        }
                        onChange={(
                          event
                        ) =>
                          setSignatureFont(
                            event.target
                              .value
                          )
                        }
                        disabled={
                          isProcessing
                        }
                      >
                        <option value="script">
                          Handwritten
                        </option>

                        <option value="times">
                          Serif Italic
                        </option>
                      </select>
                    </label>

                    <label className="sign-pdf-field">
                      <span>
                        Size
                      </span>

                      <input
                        type="number"
                        min="10"
                        max="80"
                        value={
                          signatureSize
                        }
                        onChange={(
                          event
                        ) =>
                          setSignatureSize(
                            clamp(
                              Number(
                                event.target
                                  .value
                              ) ||
                                30,
                              10,
                              80
                            )
                          )
                        }
                        disabled={
                          isProcessing
                        }
                      />
                    </label>

                    <div className="sign-pdf-signature-sample">
                      {typedName.trim() ||
                        "Your signature"}
                    </div>
                  </>
                )}

                {signatureMode ===
                  "image" && (
                  <>
                    <label className="sign-pdf-image-upload">
                      <span>
                        {signatureImage
                          ? "Replace image"
                          : "Upload signature image"}
                      </span>

                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        onChange={(
                          event
                        ) => {
                          const selectedFile =
                            event.target
                              .files?.[0];

                          if (
                            selectedFile
                          ) {
                            handleSignatureImage(
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

                    {signatureImageUrl && (
                      <div className="sign-pdf-image-preview">
                        <img
                          src={
                            signatureImageUrl
                          }
                          alt="Signature preview"
                        />
                      </div>
                    )}
                  </>
                )}
              </section>

              <section className="sign-pdf-section">
                <span className="sign-pdf-label">
                  PAGE
                </span>

                <div className="sign-pdf-page-controls">
                  <button
                    type="button"
                    onClick={() =>
                      changePage(
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
                    {pdfInfo?.pageCount ||
                      "—"}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      changePage(
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

                <p className="sign-pdf-page-hint">
                  Drag on the page to
                  place your signature.
                </p>
              </section>

              <section className="sign-pdf-section sign-pdf-signatures-section">
                <span className="sign-pdf-label">
                  PLACED SIGNATURES
                </span>

                <div className="sign-pdf-count">
                  <strong>
                    {
                      signatures.length
                    }
                  </strong>

                  <span>
                    {signatures.length ===
                    1
                      ? " signature"
                      : " signatures"}
                  </span>
                </div>

                <div className="sign-pdf-signature-list">
                  {signatures.length ===
                    0 && (
                    <span className="sign-pdf-empty">
                      No signatures placed
                      yet.
                    </span>
                  )}

                  {signatures.map(
                    (
                      signature,
                      index
                    ) => (
                      <button
                        type="button"
                        key={`${signature.type}-${index}`}
                        className={
                          selectedSignatureIndex ===
                          index
                            ? "selected"
                            : ""
                        }
                        onClick={() => {
                          setPageNumber(
                            signature.pageNumber
                          );

                          setSelectedSignatureIndex(
                            index
                          );
                        }}
                        disabled={
                          isProcessing
                        }
                      >
                        <span className="sign-pdf-list-icon">
                          {signature.type ===
                          "typed"
                            ? "T"
                            : "✎"}
                        </span>

                        <div>
                          <strong>
                            {signature.type ===
                            "typed"
                              ? signature.text
                              : "Image signature"}
                          </strong>

                          <small>
                            Page{" "}
                            {
                              signature.pageNumber
                            }
                          </small>
                        </div>

                        <span
                          className="sign-pdf-remove"
                          onClick={(
                            event
                          ) => {
                            event.stopPropagation();

                            removeSignature(
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
              </section>

              {error && (
                <div className="sign-pdf-error">
                  {error}
                </div>
              )}
            </aside>

            <main className="sign-pdf-workspace">
              <div className="sign-pdf-page-stage">
                <div className="sign-pdf-page-shell">
                  {pdfUrl && (
                    <iframe
                      title="PDF preview"
                      src={`${pdfUrl}#page=${pageNumber}&toolbar=0&navpanes=0&scrollbar=0`}
                      className="sign-pdf-preview"
                    />
                  )}

                  <div
                    ref={canvasRef}
                    className="sign-pdf-interaction-layer"
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
                    {currentPageSignatures.map(
                      (signature) => (
                        <div
                          key={
                            signature.originalIndex
                          }
                          className={`sign-pdf-overlay ${
                            selectedSignatureIndex ===
                            signature.originalIndex
                              ? "selected"
                              : ""
                          }`}
                          style={{
                            left:
                              `${
                                signature.x *
                                100
                              }%`,
                            top:
                              `${
                                signature.y *
                                100
                              }%`,
                            width:
                              `${
                                signature.width *
                                100
                              }%`,
                            height:
                              `${
                                signature.height *
                                100
                              }%`,
                          }}
                          onPointerDown={(
                            event
                          ) => {
                            event.stopPropagation();

                            setSelectedSignatureIndex(
                              signature.originalIndex
                            );
                          }}
                        >
                          {signature.type ===
                            "typed" && (
                            <span
                              className={`sign-pdf-typed-preview ${
                                signature.font ===
                                "times"
                                  ? "times"
                                  : "script"
                              }`}
                              style={{
                                fontSize:
                                  `${Math.max(
                                    12,
                                    signature.fontSize *
                                      0.72
                                  )}px`,
                              }}
                            >
                              {
                                signature.text
                              }
                            </span>
                          )}

                          {signature.type ===
                            "image" && (
                            <img
                              src={
                                signatureImageUrl
                              }
                              alt="Placed signature"
                              className="sign-pdf-image-overlay"
                            />
                          )}

                          {selectedSignatureIndex ===
                            signature.originalIndex && (
                            <button
                              type="button"
                              className="sign-pdf-overlay-delete"
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation();

                                removeSignature(
                                  signature.originalIndex
                                );
                              }}
                              aria-label="Delete signature"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      )
                    )}

                    {drawPreview && (
                      <div
                        className="sign-pdf-draw-preview"
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
                          {signatureMode ===
                          "typed"
                            ? typedName.trim() ||
                              "Signature"
                            : "Image signature"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="sign-pdf-hint">
                Drag anywhere on the page to
                place the signature.
              </div>
            </main>
          </div>

          <div className="sign-pdf-bottom">
            <div className="sign-pdf-summary">
              <span>
                {signatures.length}{" "}
                {signatures.length ===
                1
                  ? "signature"
                  : "signatures"}
              </span>

              <span>•</span>

              <span>
                Page{" "}
                {pageNumber} of{" "}
                {pdfInfo?.pageCount ||
                  "—"}
              </span>
            </div>

            {isProcessing ? (
              <div className="sign-pdf-progress">
                <div className="sign-pdf-progress-header">
                  <span>
                    Signing PDF
                  </span>

                  <strong>
                    {progress}%
                  </strong>
                </div>

                <div className="sign-pdf-progress-track">
                  <div
                    className="sign-pdf-progress-fill"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="sign-pdf-process-button"
                onClick={
                  handleSignPdf
                }
                disabled={
                  !file ||
                  signatures.length ===
                    0
                }
              >
                Apply Signature
                <span>→</span>
              </button>
            )}
          </div>

          {result && resultUrl && (
            <div className="sign-pdf-result">
              <div>
                <span className="sign-pdf-result-label">
                  COMPLETE
                </span>

                <h3>
                  Your signed PDF is
                  ready.
                </h3>

                <p>
                  {
                    result.signatureCount
                  }{" "}
                  {result.signatureCount ===
                  1
                    ? "signature"
                    : "signatures"}{" "}
                  applied across{" "}
                  {result.pageCount}{" "}
                  {result.pageCount ===
                  1
                    ? "page"
                    : "pages"}.
                </p>
              </div>

              <a
                href={resultUrl}
                download={`signed-${file.name}`}
                className="sign-pdf-download-button"
              >
                Download PDF
                <span>↓</span>
              </a>
            </div>
          )}
        </>
      )}

      <style>{`
        .sign-pdf {
          width: 100%;
          color: rgba(255,255,255,0.94);
        }

        .sign-pdf-upload {
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

        .sign-pdf-upload-icon {
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

        .sign-pdf-upload h2 {
          margin: 0;
          font-size: 28px;
          letter-spacing: -0.03em;
        }

        .sign-pdf-upload p {
          margin: 10px 0 28px;
          color: rgba(255,255,255,0.56);
          font-size: 14px;
        }

        .sign-pdf-upload-button {
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

        .sign-pdf-upload-button input {
          display: none;
        }

        .sign-pdf-upload-hint {
          margin-top: 14px;
          font-size: 12px;
          color: rgba(255,255,255,0.3);
        }

        .sign-pdf-upload-error {
          margin-top: 18px;
          padding: 9px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255,80,55,0.18);
          color: #ff9b84;
          background: rgba(255,70,50,0.07);
          font-size: 10px;
        }

        .sign-pdf-toolbar {
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

        .sign-pdf-file {
          min-width: 220px;
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .sign-pdf-file-icon {
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

        .sign-pdf-file > div:last-child {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .sign-pdf-file strong {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
        }

        .sign-pdf-file span {
          font-size: 10px;
          color: rgba(255,255,255,0.38);
        }

        .sign-pdf-mode-switch {
          display: flex;
          justify-content: center;
          gap: 7px;
          flex: 1;
        }

        .sign-pdf-mode-switch button,
        .sign-pdf-change-button {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
          color: rgba(255,255,255,0.68);
          border-radius: 11px;
          padding: 10px 13px;
          font-size: 12px;
          cursor: pointer;
          transition:
            background 0.18s ease,
            border-color 0.18s ease,
            color 0.18s ease;
        }

        .sign-pdf-mode-switch button:hover,
        .sign-pdf-change-button:hover {
          background: rgba(255,255,255,0.07);
          color: white;
        }

        .sign-pdf-mode-switch button.active {
          color: white;
          border-color: rgba(255,118,40,0.35);
          background: rgba(255,105,28,0.12);
        }

        .sign-pdf-change-button {
          white-space: nowrap;
        }

        .sign-pdf-editor {
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

        .sign-pdf-sidebar {
          padding: 22px;
          border-right: 1px solid rgba(255,255,255,0.07);
          background: rgba(7,7,7,0.24);
        }

        .sign-pdf-section {
          padding-bottom: 20px;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .sign-pdf-section:last-child {
          border-bottom: 0;
          margin-bottom: 0;
        }

        .sign-pdf-label {
          display: block;
          margin-bottom: 10px;
          color: rgba(255,255,255,0.32);
          font-size: 9px;
          letter-spacing: 0.18em;
          font-weight: 800;
        }

        .sign-pdf-text-input {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 11px;
          background: rgba(0,0,0,0.2);
          color: white;
          padding: 11px;
          font-size: 12px;
          outline: none;
        }

        .sign-pdf-text-input:focus {
          border-color: rgba(255,116,37,0.4);
        }

        .sign-pdf-field {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-top: 12px;
        }

        .sign-pdf-field span {
          color: rgba(255,255,255,0.5);
          font-size: 11px;
        }

        .sign-pdf-field input,
        .sign-pdf-field select {
          width: 105px;
          box-sizing: border-box;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 9px;
          background: rgba(0,0,0,0.2);
          color: white;
          padding: 8px;
          outline: none;
          font-size: 10px;
        }

        .sign-pdf-field input:focus,
        .sign-pdf-field select:focus {
          border-color: rgba(255,116,37,0.4);
        }

        .sign-pdf-signature-sample {
          min-height: 74px;
          margin-top: 16px;
          padding: 14px;
          box-sizing: border-box;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: #162847;
          background: #fff;
          overflow: hidden;
          font-family:
            "Brush Script MT",
            "Segoe Script",
            cursive;
          font-size: 25px;
          transform: rotate(-2deg);
        }

        .sign-pdf-image-upload {
          min-height: 90px;
          border: 1px dashed rgba(255,255,255,0.14);
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: rgba(255,255,255,0.48);
          font-size: 11px;
          cursor: pointer;
          background: rgba(255,255,255,0.018);
        }

        .sign-pdf-image-upload:hover {
          border-color: rgba(255,116,37,0.3);
          color: rgba(255,255,255,0.7);
        }

        .sign-pdf-image-upload input {
          display: none;
        }

        .sign-pdf-image-preview {
          margin-top: 12px;
          height: 90px;
          border-radius: 11px;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .sign-pdf-image-preview img {
          max-width: 90%;
          max-height: 80%;
          object-fit: contain;
        }

        .sign-pdf-page-controls {
          display: grid;
          grid-template-columns: 36px 1fr 36px;
          gap: 7px;
          align-items: center;
        }

        .sign-pdf-page-controls button {
          height: 34px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
          color: rgba(255,255,255,0.72);
          border-radius: 9px;
          cursor: pointer;
        }

        .sign-pdf-page-controls button:disabled {
          opacity: 0.28;
          cursor: not-allowed;
        }

        .sign-pdf-page-controls span {
          text-align: center;
          color: rgba(255,255,255,0.6);
          font-size: 11px;
        }

        .sign-pdf-page-hint {
          margin: 10px 0 0;
          color: rgba(255,255,255,0.28);
          font-size: 9px;
          line-height: 1.5;
        }

        .sign-pdf-count {
          display: flex;
          align-items: baseline;
          gap: 5px;
          margin-bottom: 11px;
        }

        .sign-pdf-count strong {
          font-size: 24px;
          color: #ff9658;
        }

        .sign-pdf-count span {
          color: rgba(255,255,255,0.38);
          font-size: 10px;
        }

        .sign-pdf-signature-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 250px;
          overflow-y: auto;
        }

        .sign-pdf-signature-list button {
          width: 100%;
          min-width: 0;
          display: grid;
          grid-template-columns: 26px minmax(0, 1fr) 20px;
          align-items: center;
          gap: 8px;
          padding: 8px;
          border: 1px solid transparent;
          border-radius: 10px;
          background: rgba(255,255,255,0.025);
          color: rgba(255,255,255,0.7);
          text-align: left;
          cursor: pointer;
        }

        .sign-pdf-signature-list button:hover,
        .sign-pdf-signature-list button.selected {
          background: rgba(255,105,28,0.08);
          border-color: rgba(255,111,33,0.2);
        }

        .sign-pdf-list-icon {
          width: 24px;
          height: 24px;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.05);
          color: #ff9558;
          font-size: 10px;
        }

        .sign-pdf-signature-list button > div {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .sign-pdf-signature-list strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 10px;
        }

        .sign-pdf-signature-list small {
          color: rgba(255,255,255,0.3);
          font-size: 8px;
        }

        .sign-pdf-remove {
          color: rgba(255,255,255,0.3);
          cursor: pointer;
          font-size: 16px;
        }

        .sign-pdf-remove:hover {
          color: #ff8a52;
        }

        .sign-pdf-empty {
          color: rgba(255,255,255,0.27);
          font-size: 10px;
        }

        .sign-pdf-error {
          margin-top: 15px;
          padding: 10px 11px;
          border: 1px solid rgba(255,80,55,0.18);
          border-radius: 10px;
          background: rgba(255,70,50,0.07);
          color: #ff9b84;
          font-size: 10px;
          line-height: 1.45;
        }

        .sign-pdf-workspace {
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

        .sign-pdf-page-stage {
          flex: 1;
          min-height: 600px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 28px;
          overflow: auto;
        }

        .sign-pdf-page-shell {
          position: relative;
          width: min(100%, 760px);
          aspect-ratio: 0.707;
          background: white;
          border-radius: 2px;
          overflow: hidden;
          box-shadow:
            0 24px 60px rgba(0,0,0,0.45);
        }

        .sign-pdf-preview {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: 0;
          background: white;
          pointer-events: none;
        }

        .sign-pdf-interaction-layer {
          position: absolute;
          inset: 0;
          cursor: crosshair;
          touch-action: none;
        }

        .sign-pdf-overlay {
          position: absolute;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: visible;
          border: 1px dashed transparent;
          user-select: none;
        }

        .sign-pdf-overlay.selected {
          border-color: #ff722b;
          box-shadow:
            0 0 0 2px rgba(255,114,43,0.12);
        }

        .sign-pdf-typed-preview {
          max-width: 100%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: #162847;
          transform: rotate(-2deg);
          pointer-events: none;
        }

        .sign-pdf-typed-preview.script {
          font-family:
            "Brush Script MT",
            "Segoe Script",
            cursive;
        }

        .sign-pdf-typed-preview.times {
          font-family:
            Georgia,
            "Times New Roman",
            serif;
          font-style: italic;
        }

        .sign-pdf-image-overlay {
          width: 100%;
          height: 100%;
          object-fit: contain;
          pointer-events: none;
        }

        .sign-pdf-overlay-delete {
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

        .sign-pdf-draw-preview {
          position: absolute;
          border: 1px dashed #ff7d38;
          background: rgba(255,105,28,0.08);
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          color: #162847;
        }

        .sign-pdf-draw-preview span {
          max-width: 90%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-family:
            "Brush Script MT",
            "Segoe Script",
            cursive;
          font-size: 18px;
          transform: rotate(-2deg);
        }

        .sign-pdf-hint {
          padding: 11px 18px 14px;
          text-align: center;
          color: rgba(255,255,255,0.28);
          font-size: 10px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .sign-pdf-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-top: 16px;
          padding: 15px 2px 0;
        }

        .sign-pdf-summary {
          display: flex;
          align-items: center;
          gap: 9px;
          color: rgba(255,255,255,0.38);
          font-size: 11px;
        }

        .sign-pdf-process-button,
        .sign-pdf-download-button {
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

        .sign-pdf-process-button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
          box-shadow: none;
        }

        .sign-pdf-progress {
          width: min(380px, 45%);
        }

        .sign-pdf-progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 7px;
          color: rgba(255,255,255,0.45);
          font-size: 10px;
        }

        .sign-pdf-progress-header strong {
          color: #ff985b;
        }

        .sign-pdf-progress-track {
          height: 5px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
        }

        .sign-pdf-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #ff5310,
            #ff9b5b
          );
          transition:
            width 0.2s ease;
        }

        .sign-pdf-result {
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

        .sign-pdf-result-label {
          color: #8de0ad;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.16em;
        }

        .sign-pdf-result h3 {
          margin: 6px 0 4px;
          font-size: 15px;
        }

        .sign-pdf-result p {
          margin: 0;
          color: rgba(255,255,255,0.42);
          font-size: 10px;
        }

        @media (max-width: 900px) {
          .sign-pdf-editor {
            grid-template-columns: 1fr;
          }

          .sign-pdf-sidebar {
            border-right: 0;
            border-bottom: 1px solid rgba(255,255,255,0.07);
          }

          .sign-pdf-toolbar {
            flex-wrap: wrap;
          }

          .sign-pdf-mode-switch {
            order: 3;
            width: 100%;
            justify-content: flex-start;
          }
        }

        @media (max-width: 640px) {
          .sign-pdf-upload {
            min-height: 400px;
            padding: 28px;
          }

          .sign-pdf-page-stage {
            padding: 12px;
            min-height: 450px;
          }

          .sign-pdf-bottom,
          .sign-pdf-result {
            align-items: flex-start;
            flex-direction: column;
          }

          .sign-pdf-progress {
            width: 100%;
          }

          .sign-pdf-process-button,
          .sign-pdf-download-button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

export default SignPdf;