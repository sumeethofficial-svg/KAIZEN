import { useEffect, useRef, useState } from "react";
import {
  createPdf,
  getCreatePdfDefaults,
} from "../../../services/pdf/createPdf";

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

function createBlock(type = "paragraph") {
  const defaults = {
    type,
    text:
      type === "heading"
        ? "New Heading"
        : "",
    fontSize:
      type === "heading"
        ? 20
        : 12,
    fontFamily: "helvetica",
    bold: type === "heading",
    italic: false,
    underline: false,
    alignment: "left",
    color: "#111111",
    headingLevel:
      type === "heading"
        ? 2
        : 0,
    spacingBefore: 0,
    spacingAfter:
      type === "heading"
        ? 7
        : 5,
  };

  return {
    id: `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`,
    ...defaults,
  };
}

function CreatePdf() {
  const defaults = getCreatePdfDefaults();

  const [title, setTitle] = useState(
    defaults.title,
  );

  const [blocks, setBlocks] = useState([
    createBlock("paragraph"),
  ]);

  const [pageSize, setPageSize] = useState(
    defaults.pageSize,
  );

  const [orientation, setOrientation] =
    useState(
      defaults.orientation,
    );

  const [margin, setMargin] = useState(
    defaults.margin,
  );

  const [lineSpacing, setLineSpacing] =
    useState(
      defaults.lineSpacing,
    );

  const [backgroundColor, setBackgroundColor] =
    useState(
      defaults.backgroundColor,
    );

  const [footer, setFooter] =
    useState(defaults.footer);

  const [status, setStatus] =
    useState("idle");

  const [progress, setProgress] =
    useState(0);

  const [progressMessage, setProgressMessage] =
    useState("");

  const [output, setOutput] =
    useState(null);

  const [error, setError] =
    useState("");

  const downloadUrlRef =
    useRef(null);

  useEffect(() => {
    return () => {
      if (downloadUrlRef.current) {
        URL.revokeObjectURL(
          downloadUrlRef.current,
        );
      }
    };
  }, []);

  function updateBlock(id, changes) {
    setBlocks((current) =>
      current.map((block) =>
        block.id === id
          ? {
              ...block,
              ...changes,
            }
          : block,
      ),
    );
  }

  function removeBlock(id) {
    setBlocks((current) => {
      const remaining =
        current.filter(
          (block) =>
            block.id !== id,
        );

      return remaining.length
        ? remaining
        : [createBlock("paragraph")];
    });
  }

  function moveBlock(id, direction) {
    setBlocks((current) => {
      const index =
        current.findIndex(
          (block) =>
            block.id === id,
        );

      if (index === -1) {
        return current;
      }

      const nextIndex =
        index + direction;

      if (
        nextIndex < 0 ||
        nextIndex >=
          current.length
      ) {
        return current;
      }

      const next = [
        ...current,
      ];

      [
        next[index],
        next[nextIndex],
      ] = [
        next[nextIndex],
        next[index],
      ];

      return next;
    });
  }

  function addBlock(type) {
    setBlocks((current) => [
      ...current,
      createBlock(type),
    ]);
  }

  function resetDocument() {
    if (downloadUrlRef.current) {
      URL.revokeObjectURL(
        downloadUrlRef.current,
      );

      downloadUrlRef.current =
        null;
    }

    setTitle("");
    setBlocks([
      createBlock("paragraph"),
    ]);
    setPageSize("A4");
    setOrientation("portrait");
    setMargin(20);
    setLineSpacing(1.5);
    setBackgroundColor("#ffffff");
    setFooter("");
    setStatus("idle");
    setProgress(0);
    setProgressMessage("");
    setOutput(null);
    setError("");
  }

  async function handleCreatePdf() {
    const meaningfulBlocks =
      blocks.filter(
        (block) =>
          block.type ===
            "divider" ||
          block.type ===
            "page-break" ||
          block.type ===
            "spacer" ||
          block.text.trim(),
      );

    if (
      !title.trim() &&
      meaningfulBlocks.length === 0
    ) {
      setError(
        "Add a title or some document content before creating the PDF.",
      );
      setStatus("error");
      return;
    }

    setError("");
    setOutput(null);
    setProgress(0);
    setProgressMessage(
      "Preparing document...",
    );
    setStatus("processing");

    try {
      const result =
        await createPdf(
          {
            title,
            blocks:
              meaningfulBlocks,
            pageSize,
            orientation,
            margin,
            lineSpacing,
            backgroundColor,
            footer,
          },
          ({
            progress:
              currentProgress,
            message,
          }) => {
            setProgress(
              Math.max(
                0,
                Math.min(
                  100,
                  currentProgress ||
                    0,
                ),
              ),
            );

            setProgressMessage(
              message ||
                "Creating PDF...",
            );
          },
        );

      if (downloadUrlRef.current) {
        URL.revokeObjectURL(
          downloadUrlRef.current,
        );
      }

      const url =
        URL.createObjectURL(
          result.blob,
        );

      downloadUrlRef.current =
        url;

      setOutput({
        ...result,
        url,
      });

      setProgress(100);
      setProgressMessage(
        "PDF created successfully.",
      );
      setStatus("success");
    } catch (creationError) {
      console.error(
        "Create PDF error:",
        creationError,
      );

      setStatus("error");
      setError(
        creationError?.message ||
          "The PDF could not be created.",
      );
    }
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

  const populatedBlocks =
    blocks.filter(
      (block) =>
        block.type === "divider" ||
        block.type === "page-break" ||
        block.type === "spacer" ||
        block.text.trim(),
    ).length;

  return (
    <>
      <div className="create-pdf-tool">
        <div className="create-pdf-header">
          <div>
            <div className="create-pdf-kicker">
              DOCUMENT CREATOR · PDF
            </div>

            <h2>
              Create PDF
            </h2>

            <p>
              Build a clean document from scratch
              with headings, formatted text and
              page controls.
            </p>
          </div>

          {populatedBlocks > 0 && (
            <button
              type="button"
              className="create-pdf-reset-button"
              onClick={resetDocument}
              disabled={
                status ===
                "processing"
              }
            >
              Reset
            </button>
          )}
        </div>

        <div className="create-pdf-section">
          <div className="create-pdf-section-heading">
            <div>
              <span>01</span>
              <h3>
                Document
              </h3>
            </div>

            <p>
              Start with a title and add your
              content below.
            </p>
          </div>

          <div className="create-pdf-document-card">
            <input
              type="text"
              className="create-pdf-title-input"
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value,
                )
              }
              placeholder="Document title"
              disabled={
                status ===
                "processing"
              }
            />

            <div className="create-pdf-block-list">
              {blocks.map(
                (
                  block,
                  index,
                ) => {
                  const isDivider =
                    block.type ===
                    "divider";

                  const isPageBreak =
                    block.type ===
                    "page-break";

                  const isSpacer =
                    block.type ===
                    "spacer";

                  return (
                    <div
                      key={
                        block.id
                      }
                      className={`create-pdf-block ${
                        isDivider ||
                        isPageBreak ||
                        isSpacer
                          ? "special"
                          : ""
                      }`}
                    >
                      <div className="create-pdf-block-top">
                        <span>
                          {String(
                            index +
                              1,
                          ).padStart(
                            2,
                            "0",
                          )}
                        </span>

                        <strong>
                          {isDivider
                            ? "Divider"
                            : isPageBreak
                              ? "Page Break"
                              : isSpacer
                                ? "Spacer"
                                : block.type ===
                                    "heading"
                                  ? "Heading"
                                  : "Paragraph"}
                        </strong>

                        <div className="create-pdf-block-actions">
                          <button
                            type="button"
                            onClick={() =>
                              moveBlock(
                                block.id,
                                -1,
                              )
                            }
                            disabled={
                              index ===
                                0 ||
                              status ===
                                "processing"
                            }
                            aria-label="Move block up"
                          >
                            ↑
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              moveBlock(
                                block.id,
                                1,
                              )
                            }
                            disabled={
                              index ===
                                blocks.length -
                                  1 ||
                              status ===
                                "processing"
                            }
                            aria-label="Move block down"
                          >
                            ↓
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              removeBlock(
                                block.id,
                              )
                            }
                            disabled={
                              status ===
                              "processing"
                            }
                            aria-label="Remove block"
                          >
                            ×
                          </button>
                        </div>
                      </div>

                      {!isDivider &&
                        !isPageBreak &&
                        !isSpacer && (
                          <>
                            <textarea
                              className={`create-pdf-textarea ${
                                block.type ===
                                "heading"
                                  ? "heading"
                                  : ""
                              }`}
                              value={
                                block.text
                              }
                              onChange={(
                                event,
                              ) =>
                                updateBlock(
                                  block.id,
                                  {
                                    text:
                                      event
                                        .target
                                        .value,
                                  },
                                )
                              }
                              placeholder={
                                block.type ===
                                "heading"
                                  ? "Enter heading..."
                                  : "Write your paragraph..."
                              }
                              disabled={
                                status ===
                                "processing"
                              }
                            />

                            <div className="create-pdf-block-controls">
                              <label>
                                <span>
                                  Style
                                </span>

                                <select
                                  value={
                                    block.type
                                  }
                                  onChange={(
                                    event,
                                  ) => {
                                    const nextType =
                                      event
                                        .target
                                        .value;

                                    updateBlock(
                                      block.id,
                                      {
                                        type:
                                          nextType,
                                        headingLevel:
                                          nextType ===
                                          "heading"
                                            ? 2
                                            : 0,
                                        fontSize:
                                          nextType ===
                                          "heading"
                                            ? 20
                                            : 12,
                                        bold:
                                          nextType ===
                                          "heading",
                                        spacingAfter:
                                          nextType ===
                                          "heading"
                                            ? 7
                                            : 5,
                                      },
                                    );
                                  }}
                                  disabled={
                                    status ===
                                    "processing"
                                  }
                                >
                                  <option value="paragraph">
                                    Paragraph
                                  </option>

                                  <option value="heading">
                                    Heading
                                  </option>
                                </select>
                              </label>

                              {block.type ===
                                "heading" && (
                                <label>
                                  <span>
                                    Level
                                  </span>

                                  <select
                                    value={
                                      block.headingLevel ||
                                      2
                                    }
                                    onChange={(
                                      event,
                                    ) =>
                                      updateBlock(
                                        block.id,
                                        {
                                          headingLevel:
                                            Number(
                                              event
                                                .target
                                                .value,
                                            ),
                                        },
                                      )
                                    }
                                    disabled={
                                      status ===
                                      "processing"
                                    }
                                  >
                                    <option value={1}>
                                      H1
                                    </option>
                                    <option value={2}>
                                      H2
                                    </option>
                                    <option value={3}>
                                      H3
                                    </option>
                                    <option value={4}>
                                      H4
                                    </option>
                                    <option value={5}>
                                      H5
                                    </option>
                                    <option value={6}>
                                      H6
                                    </option>
                                  </select>
                                </label>
                              )}

                              <label>
                                <span>
                                  Font
                                </span>

                                <select
                                  value={
                                    block.fontFamily
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    updateBlock(
                                      block.id,
                                      {
                                        fontFamily:
                                          event
                                            .target
                                            .value,
                                      },
                                    )
                                  }
                                  disabled={
                                    status ===
                                    "processing"
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

                              <label>
                                <span>
                                  Size
                                </span>

                                <select
                                  value={
                                    block.fontSize
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    updateBlock(
                                      block.id,
                                      {
                                        fontSize:
                                          Number(
                                            event
                                              .target
                                              .value,
                                          ),
                                      },
                                    )
                                  }
                                  disabled={
                                    status ===
                                    "processing"
                                  }
                                >
                                  <option value={8}>
                                    8
                                  </option>
                                  <option value={10}>
                                    10
                                  </option>
                                  <option value={12}>
                                    12
                                  </option>
                                  <option value={14}>
                                    14
                                  </option>
                                  <option value={16}>
                                    16
                                  </option>
                                  <option value={18}>
                                    18
                                  </option>
                                  <option value={20}>
                                    20
                                  </option>
                                  <option value={24}>
                                    24
                                  </option>
                                  <option value={28}>
                                    28
                                  </option>
                                  <option value={32}>
                                    32
                                  </option>
                                </select>
                              </label>

                              <label>
                                <span>
                                  Align
                                </span>

                                <select
                                  value={
                                    block.alignment
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    updateBlock(
                                      block.id,
                                      {
                                        alignment:
                                          event
                                            .target
                                            .value,
                                      },
                                    )
                                  }
                                  disabled={
                                    status ===
                                    "processing"
                                  }
                                >
                                  <option value="left">
                                    Left
                                  </option>

                                  <option value="center">
                                    Center
                                  </option>

                                  <option value="right">
                                    Right
                                  </option>

                                  <option value="justify">
                                    Justify
                                  </option>
                                </select>
                              </label>

                              <label className="create-pdf-color-control">
                                <span>
                                  Color
                                </span>

                                <input
                                  type="color"
                                  value={
                                    block.color
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    updateBlock(
                                      block.id,
                                      {
                                        color:
                                          event
                                            .target
                                            .value,
                                      },
                                    )
                                  }
                                  disabled={
                                    status ===
                                    "processing"
                                  }
                                />
                              </label>
                            </div>

                            <div className="create-pdf-format-buttons">
                              <button
                                type="button"
                                className={
                                  block.bold
                                    ? "active"
                                    : ""
                                }
                                onClick={() =>
                                  updateBlock(
                                    block.id,
                                    {
                                      bold:
                                        !block.bold,
                                    },
                                  )
                                }
                                disabled={
                                  status ===
                                  "processing"
                                }
                              >
                                B
                              </button>

                              <button
                                type="button"
                                className={
                                  block.italic
                                    ? "active italic"
                                    : ""
                                }
                                onClick={() =>
                                  updateBlock(
                                    block.id,
                                    {
                                      italic:
                                        !block.italic,
                                    },
                                  )
                                }
                                disabled={
                                  status ===
                                  "processing"
                                }
                              >
                                I
                              </button>

                              <button
                                type="button"
                                className={
                                  block.underline
                                    ? "active underline"
                                    : ""
                                }
                                onClick={() =>
                                  updateBlock(
                                    block.id,
                                    {
                                      underline:
                                        !block.underline,
                                    },
                                  )
                                }
                                disabled={
                                  status ===
                                  "processing"
                                }
                              >
                                U
                              </button>
                            </div>
                          </>
                        )}

                      {isDivider && (
                        <div className="create-pdf-special-preview">
                          <div />
                        </div>
                      )}

                      {isPageBreak && (
                        <div className="create-pdf-special-preview page-break">
                          <span>
                            NEW PAGE
                          </span>
                        </div>
                      )}

                      {isSpacer && (
                        <div className="create-pdf-special-preview spacer">
                          <span>
                            SPACE
                          </span>
                        </div>
                      )}
                    </div>
                  );
                },
              )}
            </div>

            <div className="create-pdf-add-buttons">
              <button
                type="button"
                onClick={() =>
                  addBlock(
                    "heading",
                  )
                }
                disabled={
                  status ===
                  "processing"
                }
              >
                + Heading
              </button>

              <button
                type="button"
                onClick={() =>
                  addBlock(
                    "paragraph",
                  )
                }
                disabled={
                  status ===
                  "processing"
                }
              >
                + Paragraph
              </button>

              <button
                type="button"
                onClick={() =>
                  addBlock(
                    "divider",
                  )
                }
                disabled={
                  status ===
                  "processing"
                }
              >
                + Divider
              </button>

              <button
                type="button"
                onClick={() =>
                  addBlock(
                    "spacer",
                  )
                }
                disabled={
                  status ===
                  "processing"
                }
              >
                + Spacer
              </button>

              <button
                type="button"
                onClick={() =>
                  addBlock(
                    "page-break",
                  )
                }
                disabled={
                  status ===
                  "processing"
                }
              >
                + Page Break
              </button>
            </div>
          </div>
        </div>

        <div className="create-pdf-section">
          <div className="create-pdf-section-heading">
            <div>
              <span>02</span>
              <h3>
                Page Settings
              </h3>
            </div>

            <p>
              Define the final PDF page appearance.
            </p>
          </div>

          <div className="create-pdf-settings-grid">
            <label className="create-pdf-control">
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

            <label className="create-pdf-control">
              <span>
                Orientation
              </span>

              <select
                value={
                  orientation
                }
                onChange={(event) =>
                  setOrientation(
                    event.target.value,
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

            <label className="create-pdf-control">
              <span>
                Margins
              </span>

              <select
                value={margin}
                onChange={(event) =>
                  setMargin(
                    Number(
                      event.target
                        .value,
                    ),
                  )
                }
                disabled={
                  status ===
                  "processing"
                }
              >
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

                <option value={25}>
                  25 mm
                </option>

                <option value={30}>
                  30 mm
                </option>
              </select>
            </label>

            <label className="create-pdf-control">
              <span>
                Line Spacing
              </span>

              <select
                value={
                  lineSpacing
                }
                onChange={(event) =>
                  setLineSpacing(
                    Number(
                      event.target
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
                  Single
                </option>

                <option value={1.15}>
                  1.15
                </option>

                <option value={1.5}>
                  1.5
                </option>

                <option value={2}>
                  Double
                </option>

                <option value={2.5}>
                  2.5
                </option>
              </select>
            </label>
          </div>

          <div className="create-pdf-secondary-settings">
            <label className="create-pdf-control">
              <span>
                Background
              </span>

              <div className="create-pdf-color-picker">
                <input
                  type="color"
                  value={
                    backgroundColor
                  }
                  onChange={(event) =>
                    setBackgroundColor(
                      event.target
                        .value,
                    )
                  }
                  disabled={
                    status ===
                    "processing"
                  }
                />

                <span>
                  {
                    backgroundColor
                  }
                </span>
              </div>
            </label>

            <label className="create-pdf-footer-control">
              <span>
                Footer
              </span>

              <input
                type="text"
                value={footer}
                onChange={(event) =>
                  setFooter(
                    event.target.value,
                  )
                }
                placeholder="Optional footer text"
                disabled={
                  status ===
                  "processing"
                }
              />
            </label>
          </div>
        </div>

        {status ===
          "processing" && (
          <div className="create-pdf-progress-card">
            <div className="create-pdf-progress-top">
              <div>
                <span>
                  PROCESSING
                </span>

                <strong>
                  {
                    progressMessage
                  }
                </strong>
              </div>

              <b>
                {progress}%
              </b>
            </div>

            <div className="create-pdf-progress-track">
              <div
                className="create-pdf-progress-fill"
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
            <div className="create-pdf-action-area">
              <button
                type="button"
                className="create-pdf-create-button"
                onClick={
                  handleCreatePdf
                }
                disabled={
                  populatedBlocks ===
                    0 &&
                  !title.trim()
                }
              >
                <span>
                  Create PDF
                </span>

                <span>
                  →
                </span>
              </button>

              <p>
                Your document is generated locally in
                your browser.
              </p>
            </div>
          )}

        {status ===
          "success" &&
          output && (
            <div className="create-pdf-success-card">
              <div className="create-pdf-success-icon">
                ✓
              </div>

              <div className="create-pdf-success-content">
                <span>
                  DOCUMENT CREATED
                </span>

                <h3>
                  {
                    output.fileName
                  }
                </h3>

                <p>
                  {output.pageCount}{" "}
                  {output.pageCount ===
                  1
                    ? "page"
                    : "pages"}{" "}
                  ·{" "}
                  {
                    formatFileSize(
                      output.size,
                    )
                  }
                </p>
              </div>

              <button
                type="button"
                className="create-pdf-download-button"
                onClick={
                  handleDownload
                }
              >
                Download PDF
              </button>
            </div>
          )}

        {status ===
          "error" &&
          error && (
            <div className="create-pdf-error-card">
              <div className="create-pdf-error-icon">
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
                onClick={() =>
                  setStatus(
                    "idle",
                  )
                }
              >
                Try Again
              </button>
            </div>
          )}
      </div>

      <style>{`
        .create-pdf-tool {
          width: 100%;
          box-sizing: border-box;
          padding: 26px 30px 38px;
          color: rgba(255, 255, 255, 0.94);
        }

        .create-pdf-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 28px;
        }

        .create-pdf-kicker {
          margin-bottom: 8px;
          color: rgba(255, 139, 61, 0.9);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.2em;
        }

        .create-pdf-header h2 {
          margin: 0;
          font-size: clamp(28px, 3vw, 42px);
          line-height: 1.05;
          letter-spacing: -0.04em;
        }

        .create-pdf-header p {
          margin: 10px 0 0;
          max-width: 650px;
          color: rgba(255, 255, 255, 0.58);
          font-size: 14px;
          line-height: 1.6;
        }

        .create-pdf-reset-button {
          flex: 0 0 auto;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.045);
          color: rgba(255, 255, 255, 0.72);
          padding: 10px 14px;
          cursor: pointer;
          font-size: 12px;
        }

        .create-pdf-reset-button:hover {
          border-color: rgba(255, 138, 58, 0.35);
          background: rgba(255, 138, 58, 0.08);
          color: #fff;
        }

        .create-pdf-section {
          margin-top: 28px;
        }

        .create-pdf-section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 14px;
        }

        .create-pdf-section-heading > div {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .create-pdf-section-heading > div > span {
          color: rgba(255, 138, 58, 0.7);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .create-pdf-section-heading h3 {
          margin: 0;
          font-size: 15px;
        }

        .create-pdf-section-heading p {
          margin: 0;
          color: rgba(255, 255, 255, 0.42);
          font-size: 11px;
          text-align: right;
        }

        .create-pdf-document-card {
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.028);
        }

        .create-pdf-title-input {
          display: block;
          width: 100%;
          box-sizing: border-box;
          padding: 18px 20px;
          border: 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          outline: none;
          background: rgba(255, 255, 255, 0.02);
          color: #fff;
          font-size: 22px;
          font-weight: 700;
        }

        .create-pdf-title-input::placeholder {
          color: rgba(255, 255, 255, 0.24);
        }

        .create-pdf-block-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 14px;
        }

        .create-pdf-block {
          padding: 12px;
          border: 1px solid rgba(255, 255, 255, 0.065);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.022);
        }

        .create-pdf-block.special {
          background: rgba(255, 138, 58, 0.025);
        }

        .create-pdf-block-top {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .create-pdf-block-top > span {
          color: rgba(255, 138, 58, 0.62);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .create-pdf-block-top strong {
          flex: 1;
          font-size: 11px;
        }

        .create-pdf-block-actions {
          display: flex;
          gap: 5px;
        }

        .create-pdf-block-actions button {
          width: 27px;
          height: 27px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 7px;
          background: rgba(255, 255, 255, 0.035);
          color: rgba(255, 255, 255, 0.58);
          cursor: pointer;
          font-size: 11px;
        }

        .create-pdf-block-actions button:hover:not(:disabled) {
          border-color: rgba(255, 138, 58, 0.35);
          background: rgba(255, 138, 58, 0.08);
          color: #fff;
        }

        .create-pdf-block-actions button:disabled {
          cursor: not-allowed;
          opacity: 0.25;
        }

        .create-pdf-textarea {
          display: block;
          width: 100%;
          min-height: 100px;
          box-sizing: border-box;
          resize: vertical;
          padding: 13px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 10px;
          outline: none;
          background: rgba(0, 0, 0, 0.12);
          color: rgba(255, 255, 255, 0.9);
          font-family: inherit;
          font-size: 12px;
          line-height: 1.65;
        }

        .create-pdf-textarea.heading {
          min-height: 58px;
        }

        .create-pdf-textarea:focus {
          border-color: rgba(255, 138, 58, 0.4);
        }

        .create-pdf-block-controls {
          display: grid;
          grid-template-columns:
            1.1fr
            0.65fr
            1fr
            0.7fr
            0.9fr
            0.55fr;
          gap: 8px;
          margin-top: 10px;
        }

        .create-pdf-block-controls label,
        .create-pdf-control,
        .create-pdf-footer-control {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .create-pdf-block-controls label > span,
        .create-pdf-control > span,
        .create-pdf-footer-control > span {
          color: rgba(255, 255, 255, 0.42);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .create-pdf-block-controls select,
        .create-pdf-control select,
        .create-pdf-footer-control input {
          width: 100%;
          height: 38px;
          box-sizing: border-box;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 9px;
          outline: none;
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.8);
          padding: 0 9px;
          font-size: 10px;
        }

        .create-pdf-block-controls select:focus,
        .create-pdf-control select:focus,
        .create-pdf-footer-control input:focus {
          border-color: rgba(255, 138, 58, 0.42);
        }

        .create-pdf-block-controls option,
        .create-pdf-control option {
          background: #1a1512;
          color: #fff;
        }

        .create-pdf-color-control input,
        .create-pdf-color-picker input {
          width: 38px;
          height: 38px;
          padding: 3px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.04);
          cursor: pointer;
        }

        .create-pdf-format-buttons {
          display: flex;
          gap: 6px;
          margin-top: 9px;
        }

        .create-pdf-format-buttons button {
          width: 31px;
          height: 30px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.035);
          color: rgba(255, 255, 255, 0.6);
          font-family: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .create-pdf-format-buttons button:hover {
          border-color: rgba(255, 138, 58, 0.35);
        }

        .create-pdf-format-buttons button.active {
          border-color: rgba(255, 138, 58, 0.35);
          background: rgba(255, 138, 58, 0.1);
          color: #ffae7b;
        }

        .create-pdf-format-buttons button.italic {
          font-style: italic;
        }

        .create-pdf-format-buttons button.underline {
          text-decoration: underline;
        }

        .create-pdf-special-preview {
          min-height: 26px;
          display: grid;
          place-items: center;
        }

        .create-pdf-special-preview > div {
          width: 100%;
          border-top: 1px solid rgba(255, 138, 58, 0.25);
        }

        .create-pdf-special-preview span {
          color: rgba(255, 138, 58, 0.6);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.14em;
        }

        .create-pdf-special-preview.page-break {
          min-height: 48px;
          border: 1px dashed rgba(255, 138, 58, 0.2);
          border-radius: 9px;
          background: rgba(255, 138, 58, 0.025);
        }

        .create-pdf-special-preview.spacer {
          min-height: 32px;
        }

        .create-pdf-add-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          padding: 0 14px 14px;
        }

        .create-pdf-add-buttons button {
          min-height: 34px;
          padding: 0 11px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.035);
          color: rgba(255, 255, 255, 0.64);
          cursor: pointer;
          font-size: 10px;
          font-weight: 700;
        }

        .create-pdf-add-buttons button:hover:not(:disabled) {
          border-color: rgba(255, 138, 58, 0.34);
          background: rgba(255, 138, 58, 0.07);
          color: #fff;
        }

        .create-pdf-add-buttons button:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .create-pdf-settings-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .create-pdf-control select {
          height: 42px;
        }

        .create-pdf-secondary-settings {
          display: grid;
          grid-template-columns: minmax(130px, 0.4fr) minmax(240px, 1fr);
          gap: 12px;
          margin-top: 12px;
        }

        .create-pdf-color-picker {
          height: 42px;
          display: flex;
          align-items: center;
          gap: 9px;
          box-sizing: border-box;
          padding: 0 9px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.04);
        }

        .create-pdf-color-picker input {
          width: 28px;
          height: 28px;
          padding: 2px;
        }

        .create-pdf-color-picker span {
          color: rgba(255, 255, 255, 0.52);
          font-family:
            ui-monospace,
            SFMono-Regular,
            Menlo,
            Monaco,
            Consolas,
            monospace;
          font-size: 10px;
        }

        .create-pdf-footer-control input {
          height: 42px;
        }

        .create-pdf-progress-card {
          margin-top: 24px;
          padding: 17px 18px;
          border: 1px solid rgba(255, 138, 58, 0.15);
          border-radius: 16px;
          background: rgba(255, 138, 58, 0.045);
        }

        .create-pdf-progress-top {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
        }

        .create-pdf-progress-top > div {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 5px;
        }

        .create-pdf-progress-top span {
          color: rgba(255, 138, 58, 0.68);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.14em;
        }

        .create-pdf-progress-top strong {
          font-size: 12px;
        }

        .create-pdf-progress-top b {
          color: #ff9a59;
          font-size: 13px;
        }

        .create-pdf-progress-track {
          height: 5px;
          margin-top: 13px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
        }

        .create-pdf-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #ff6b1a,
            #ffad69
          );
          transition: width 180ms ease;
        }

        .create-pdf-action-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 30px;
        }

        .create-pdf-create-button {
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
        }

        .create-pdf-create-button:hover:not(:disabled) {
          transform: translateY(-2px);
          border-color: rgba(255, 170, 107, 0.5);
          box-shadow:
            0 0 34px rgba(255, 107, 26, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .create-pdf-create-button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .create-pdf-action-area p {
          margin: 11px 0 0;
          color: rgba(255, 255, 255, 0.34);
          font-size: 10px;
        }

        .create-pdf-success-card {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-top: 24px;
          padding: 16px 17px;
          border: 1px solid rgba(126, 255, 186, 0.13);
          border-radius: 17px;
          background: rgba(126, 255, 186, 0.035);
        }

        .create-pdf-success-icon {
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

        .create-pdf-success-content {
          min-width: 0;
          flex: 1;
        }

        .create-pdf-success-content > span {
          color: rgba(164, 255, 202, 0.65);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.14em;
        }

        .create-pdf-success-content h3 {
          margin: 4px 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .create-pdf-success-content p {
          margin: 0;
          color: rgba(255, 255, 255, 0.4);
          font-size: 10px;
        }

        .create-pdf-download-button {
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

        .create-pdf-error-card {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-top: 24px;
          padding: 16px;
          border: 1px solid rgba(255, 86, 86, 0.16);
          border-radius: 16px;
          background: rgba(255, 86, 86, 0.04);
        }

        .create-pdf-error-icon {
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

        .create-pdf-error-card > div:nth-child(2) {
          min-width: 0;
          flex: 1;
        }

        .create-pdf-error-card strong {
          font-size: 12px;
        }

        .create-pdf-error-card p {
          margin: 5px 0 0;
          color: rgba(255, 255, 255, 0.43);
          font-size: 10px;
          line-height: 1.5;
        }

        .create-pdf-error-card button {
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.72);
          padding: 8px 11px;
          cursor: pointer;
          font-size: 10px;
        }

        @media (max-width: 1000px) {
          .create-pdf-block-controls {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }

          .create-pdf-settings-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .create-pdf-tool {
            padding: 24px 24px 32px;
          }

          .create-pdf-block-controls {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .create-pdf-secondary-settings {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 620px) {
          .create-pdf-tool {
            padding: 20px 16px 26px;
          }

          .create-pdf-header {
            flex-direction: column;
          }

          .create-pdf-reset-button {
            align-self: flex-start;
          }

          .create-pdf-section-heading {
            align-items: flex-start;
            flex-direction: column;
            gap: 7px;
          }

          .create-pdf-section-heading p {
            text-align: left;
          }

          .create-pdf-block-controls,
          .create-pdf-settings-grid {
            grid-template-columns: 1fr;
          }

          .create-pdf-success-card {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .create-pdf-download-button {
            width: 100%;
          }

          .create-pdf-error-card {
            align-items: flex-start;
            flex-wrap: wrap;
          }
        }
      `}</style>
    </>
  );
}

export default CreatePdf;