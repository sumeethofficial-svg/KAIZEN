import React, {
  useEffect,
  useState,
} from "react";

import {
  createImagePdf,
  getSupportedImageTypes,
} from "../../services/image/imageToPdf.js";

const ImageToPdf = () => {
  const [files, setFiles] = useState([]);

  const [pageSize, setPageSize] =
    useState("A4");

  const [orientation, setOrientation] =
    useState("Auto");

  const [margin, setMargin] =
    useState(20);

  const [processing, setProcessing] =
    useState(false);

  const [result, setResult] =
    useState(null);

  const [error, setError] =
    useState("");

  const [dragOver, setDragOver] =
    useState(false);

  const [draggedIndex, setDraggedIndex] =
    useState(null);

  const [dropTargetIndex, setDropTargetIndex] =
    useState(null);

  const [previews, setPreviews] =
    useState({});

  const supportedTypes =
    getSupportedImageTypes();

  /* --------------------------------
     ADD FILES
  -------------------------------- */

  const addFiles = (selectedFiles) => {
    if (!selectedFiles?.length) {
      return;
    }

    const incomingFiles =
      Array.from(selectedFiles);

    const invalidFiles =
      incomingFiles.filter(
        (file) =>
          !supportedTypes.includes(
            file.type
          )
      );

    if (invalidFiles.length > 0) {
      setError(
        "Only JPG, PNG, WebP and AVIF images are supported."
      );
      return;
    }

    setError("");
    setResult(null);

    setFiles((current) => [
      ...current,
      ...incomingFiles,
    ]);
  };

  const handleFileChange = (event) => {
    addFiles(event.target.files);
    event.target.value = "";
  };

  const handleDropUpload = (event) => {
    event.preventDefault();

    setDragOver(false);

    addFiles(
      event.dataTransfer.files
    );
  };

  /* --------------------------------
     PREVIEWS
  -------------------------------- */

  useEffect(() => {
    const urls = {};

    files.forEach((file) => {
      const key =
        `${file.name}-${file.size}-${file.lastModified}`;

      urls[key] =
        URL.createObjectURL(file);
    });

    setPreviews(urls);

    return () => {
      Object.values(urls).forEach(
        (url) => URL.revokeObjectURL(url)
      );
    };
  }, [files]);

  const getPreview = (file) => {
    const key =
      `${file.name}-${file.size}-${file.lastModified}`;

    return previews[key];
  };

  /* --------------------------------
     REMOVE
  -------------------------------- */

  const removeFile = (index) => {
    setFiles((current) =>
      current.filter(
        (_, i) => i !== index
      )
    );

    setResult(null);
  };

  /* --------------------------------
     MOVE WITH BUTTON
  -------------------------------- */

  const moveFile = (
    index,
    direction
  ) => {
    setFiles((current) => {
      const updated = [...current];

      const targetIndex =
        direction === "up"
          ? index - 1
          : index + 1;

      if (
        targetIndex < 0 ||
        targetIndex >= updated.length
      ) {
        return current;
      }

      [
        updated[index],
        updated[targetIndex],
      ] = [
        updated[targetIndex],
        updated[index],
      ];

      return updated;
    });

    setResult(null);
  };

  /* --------------------------------
     DRAG REORDER
  -------------------------------- */

  const handleDragStart = (
    event,
    index
  ) => {
    setDraggedIndex(index);

    event.dataTransfer.effectAllowed =
      "move";

    event.dataTransfer.setData(
      "text/plain",
      String(index)
    );
  };

  const handleDragOverItem = (
    event,
    index
  ) => {
    event.preventDefault();

    if (
      draggedIndex === null ||
      draggedIndex === index
    ) {
      return;
    }

    setDropTargetIndex(index);
  };

  const handleDropItem = (
    event,
    targetIndex
  ) => {
    event.preventDefault();

    const sourceIndex =
      draggedIndex;

    if (
      sourceIndex === null ||
      sourceIndex === targetIndex
    ) {
      setDraggedIndex(null);
      setDropTargetIndex(null);
      return;
    }

    setFiles((current) => {
      const updated = [...current];

      const [
        movedFile,
      ] = updated.splice(
        sourceIndex,
        1
      );

      updated.splice(
        targetIndex,
        0,
        movedFile
      );

      return updated;
    });

    setResult(null);

    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  /* --------------------------------
     CREATE PDF
  -------------------------------- */

  const handleCreatePdf =
    async () => {
      if (files.length === 0) {
        setError(
          "Please add at least one image."
        );
        return;
      }

      try {
        setProcessing(true);
        setError("");
        setResult(null);

        const blob =
          await createImagePdf({
            files,
            pageSize,
            orientation,
            margin,
          });

        const url =
          URL.createObjectURL(blob);

        setResult({
          blob,
          url,
        });
      } catch (err) {
        setError(
          err.message ||
            "Unable to create the PDF."
        );
      } finally {
        setProcessing(false);
      }
    };

  /* --------------------------------
     DOWNLOAD
  -------------------------------- */

  const handleDownload = () => {
    if (!result?.url) {
      return;
    }

    const link =
      document.createElement("a");

    link.href = result.url;

    link.download =
      "images.pdf";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  };

  /* --------------------------------
     HELPERS
  -------------------------------- */

  const formatSize = (bytes) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (
      bytes <
      1024 * 1024
    ) {
      return `${(
        bytes / 1024
      ).toFixed(0)} KB`;
    }

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(2)} MB`;
  };

  const getPageRatio = () => {
    if (pageSize === "Letter") {
      return 612 / 792;
    }

    if (pageSize === "Original") {
      return 0.707;
    }

    return 595.28 / 841.89;
  };

  const getPageStyle = () => {
    const ratio =
      getPageRatio();

    let width = 100;

    let height =
      width / ratio;

    if (
      orientation ===
      "Landscape"
    ) {
      height = width * ratio;
    }

    if (
      orientation === "Auto" &&
      files.length > 0
    ) {
      const first =
        files[0];

      const image =
        document.querySelector(
          `[data-preview-file="${CSS.escape(
            first.name
          )}"]`
        );

      if (
        image?.naturalWidth &&
        image?.naturalHeight
      ) {
        if (
          image.naturalWidth >
          image.naturalHeight
        ) {
          height =
            width * ratio;
        }
      }
    }

    return {
      width: `${width}%`,
      aspectRatio:
        orientation ===
          "Landscape"
          ? `${1 / ratio}`
          : `${ratio}`,
      maxHeight: "620px",
    };
  };

  return (
    <div
      style={{
        width: "100%",
        color: "#ffffff",
        boxSizing: "border-box",
      }}
    >
      <input
        id="image-to-pdf-file"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        onChange={handleFileChange}
        style={{
          display: "none",
        }}
      />

      {/* ==================================
          EMPTY STATE
      ================================== */}

      {files.length === 0 && (
        <label
          htmlFor="image-to-pdf-file"
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => {
            setDragOver(false);
          }}
          onDrop={handleDropUpload}
          style={{
            width: "100%",
            minHeight: "300px",
            border: dragOver
              ? "1px solid rgba(255,145,0,0.8)"
              : "1px dashed rgba(255,255,255,0.20)",
            borderRadius: "14px",
            background: dragOver
              ? "rgba(255,120,0,0.06)"
              : "rgba(255,255,255,0.025)",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              width: "68px",
              height: "68px",
              borderRadius: "18px",
              background:
                "linear-gradient(145deg, #ff7a00, #d94b00)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "31px",
              marginBottom: "18px",
            }}
          >
            ↑
          </div>

          <div
            style={{
              color: "#ffffff",
              fontSize: "20px",
              fontWeight: 600,
              marginBottom: "8px",
            }}
          >
            Drop your images here
          </div>

          <div
            style={{
              color: "#999999",
              fontSize: "15px",
              marginBottom: "12px",
            }}
          >
            or click to browse
          </div>

          <div
            style={{
              color: "#e28a00",
              fontSize: "12px",
              letterSpacing: "2px",
            }}
          >
            JPG · PNG · WEBP · AVIF
          </div>
        </label>
      )}

      {/* ==================================
          MAIN WORKSPACE
      ================================== */}

      {files.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1.08fr) minmax(0, 0.92fr)",
            gap: "18px",
            width: "100%",
            alignItems: "start",
          }}
        >
          {/* ==================================
              LEFT PANEL
          ================================== */}

          <div
            style={{
              minWidth: 0,
            }}
          >
            {/* HEADER */}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "space-between",
                marginBottom: "12px",
              }}
            >
              <div>
                <div
                  style={{
                    color: "#ffffff",
                    fontSize: "12px",
                    fontWeight: 600,
                    letterSpacing:
                      "1.5px",
                  }}
                >
                  IMAGES
                </div>

                <div
                  style={{
                    color: "#777777",
                    fontSize: "11px",
                    marginTop: "5px",
                  }}
                >
                  {files.length}{" "}
                  {files.length ===
                  1
                    ? "image"
                    : "images"}{" "}
                  · one image per page
                </div>
              </div>

              <label
                htmlFor="image-to-pdf-file"
                style={{
                  padding:
                    "9px 14px",
                  border:
                    "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "8px",
                  background:
                    "rgba(255,255,255,0.035)",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                + Add images
              </label>
            </div>

            {/* DRAG HINT */}

            <div
              style={{
                padding:
                  "9px 12px",
                marginBottom:
                  "10px",
                borderRadius:
                  "8px",
                background:
                  "rgba(255,255,255,0.025)",
                border:
                  "1px solid rgba(255,255,255,0.06)",
                color: "#777777",
                fontSize: "11px",
              }}
            >
              Hold and drag an image to
              change the PDF page order.
            </div>

            {/* IMAGE LIST */}

            <div
              style={{
                display: "flex",
                flexDirection:
                  "column",
                gap: "8px",
                marginBottom:
                  "22px",
              }}
            >
              {files.map(
                (file, index) => {
                  const isDragging =
                    draggedIndex ===
                    index;

                  const isTarget =
                    dropTargetIndex ===
                    index;

                  return (
                    <div
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      draggable
                      onDragStart={(event) =>
                        handleDragStart(
                          event,
                          index
                        )
                      }
                      onDragOver={(event) =>
                        handleDragOverItem(
                          event,
                          index
                        )
                      }
                      onDrop={(event) =>
                        handleDropItem(
                          event,
                          index
                        )
                      }
                      onDragEnd={
                        handleDragEnd
                      }
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: "10px",
                        padding:
                          "10px",
                        border:
                          isTarget
                            ? "1px solid rgba(255,140,0,0.85)"
                            : "1px solid rgba(255,255,255,0.08)",
                        borderRadius:
                          "10px",
                        background:
                          isDragging
                            ? "rgba(255,120,0,0.08)"
                            : "rgba(255,255,255,0.025)",
                        opacity:
                          isDragging
                            ? 0.45
                            : 1,
                        cursor:
                          "grab",
                        transition:
                          "border 0.12s, background 0.12s",
                        userSelect:
                          "none",
                      }}
                    >
                      {/* PAGE NUMBER */}

                      <div
                        style={{
                          width:
                            "25px",
                          color:
                            isTarget
                              ? "#ff9b24"
                              : "#777777",
                          fontSize:
                            "11px",
                          textAlign:
                            "center",
                          flexShrink:
                            0,
                        }}
                      >
                        {String(
                          index + 1
                        ).padStart(
                          2,
                          "0"
                        )}
                      </div>

                      {/* DRAG HANDLE */}

                      <div
                        title="Drag to reorder"
                        style={{
                          color:
                            "#555555",
                          fontSize:
                            "16px",
                          width:
                            "14px",
                          textAlign:
                            "center",
                          flexShrink:
                            0,
                          cursor:
                            "grab",
                        }}
                      >
                        ⋮⋮
                      </div>

                      {/* THUMBNAIL */}

                      <div
                        style={{
                          width:
                            "58px",
                          height:
                            "58px",
                          borderRadius:
                            "7px",
                          overflow:
                            "hidden",
                          background:
                            "#111111",
                          border:
                            "1px solid rgba(255,255,255,0.08)",
                          flexShrink:
                            0,
                        }}
                      >
                        {getPreview(
                          file
                        ) && (
                          <img
                            src={getPreview(
                              file
                            )}
                            alt=""
                            style={{
                              width:
                                "100%",
                              height:
                                "100%",
                              objectFit:
                                "cover",
                              display:
                                "block",
                            }}
                          />
                        )}
                      </div>

                      {/* FILE DETAILS */}

                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            color:
                              "#ffffff",
                            fontSize:
                              "13px",
                            fontWeight:
                              600,
                            overflow:
                              "hidden",
                            textOverflow:
                              "ellipsis",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {file.name}
                        </div>

                        <div
                          style={{
                            color:
                              "#777777",
                            fontSize:
                              "11px",
                            marginTop:
                              "5px",
                          }}
                        >
                          {formatSize(
                            file.size
                          )}
                        </div>
                      </div>

                      {/* BUTTONS */}

                      <div
                        style={{
                          display:
                            "flex",
                          gap: "5px",
                          flexShrink:
                            0,
                        }}
                      >
                        <button
                          onClick={() =>
                            moveFile(
                              index,
                              "up"
                            )
                          }
                          disabled={
                            index ===
                            0
                          }
                          title="Move up"
                          style={{
                            width:
                              "30px",
                            height:
                              "30px",
                            border:
                              "1px solid rgba(255,255,255,0.10)",
                            borderRadius:
                              "7px",
                            background:
                              "rgba(255,255,255,0.03)",
                            color:
                              index ===
                              0
                                ? "#444444"
                                : "#ffffff",
                            cursor:
                              index ===
                              0
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          ↑
                        </button>

                        <button
                          onClick={() =>
                            moveFile(
                              index,
                              "down"
                            )
                          }
                          disabled={
                            index ===
                            files.length -
                              1
                          }
                          title="Move down"
                          style={{
                            width:
                              "30px",
                            height:
                              "30px",
                            border:
                              "1px solid rgba(255,255,255,0.10)",
                            borderRadius:
                              "7px",
                            background:
                              "rgba(255,255,255,0.03)",
                            color:
                              index ===
                              files.length -
                                1
                                ? "#444444"
                                : "#ffffff",
                            cursor:
                              index ===
                              files.length -
                                1
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          ↓
                        </button>

                        <button
                          onClick={() =>
                            removeFile(
                              index
                            )
                          }
                          title="Remove image"
                          style={{
                            width:
                              "30px",
                            height:
                              "30px",
                            border:
                              "1px solid rgba(255,80,80,0.15)",
                            borderRadius:
                              "7px",
                            background:
                              "rgba(255,60,60,0.04)",
                            color:
                              "#ff8585",
                            cursor:
                              "pointer",
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            {/* ==================================
                PDF SETTINGS
            ================================== */}

            <div
              style={{
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing:
                  "1.5px",
                marginBottom:
                  "12px",
              }}
            >
              PDF SETTINGS
            </div>

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: "10px",
                marginBottom:
                  "12px",
              }}
            >
              {/* PAGE SIZE */}

              <div>
                <div
                  style={{
                    color:
                      "#777777",
                    fontSize:
                      "10px",
                    letterSpacing:
                      "1px",
                    marginBottom:
                      "7px",
                  }}
                >
                  PAGE SIZE
                </div>

                <select
                  value={
                    pageSize
                  }
                  onChange={(
                    event
                  ) => {
                    setPageSize(
                      event.target
                        .value
                    );
                    setResult(
                      null
                    );
                  }}
                  style={{
                    width:
                      "100%",
                    padding:
                      "12px",
                    border:
                      "1px solid rgba(255,255,255,0.12)",
                    borderRadius:
                      "8px",
                    background:
                      "#171717",
                    color:
                      "#ffffff",
                    outline:
                      "none",
                    fontSize:
                      "13px",
                  }}
                >
                  <option value="A4">
                    A4
                  </option>

                  <option value="Letter">
                    Letter
                  </option>

                  <option value="Original">
                    Original
                  </option>
                </select>
              </div>

              {/* ORIENTATION */}

              <div>
                <div
                  style={{
                    color:
                      "#777777",
                    fontSize:
                      "10px",
                    letterSpacing:
                      "1px",
                    marginBottom:
                      "7px",
                  }}
                >
                  ORIENTATION
                </div>

                <select
                  value={
                    orientation
                  }
                  onChange={(
                    event
                  ) => {
                    setOrientation(
                      event.target
                        .value
                    );
                    setResult(
                      null
                    );
                  }}
                  style={{
                    width:
                      "100%",
                    padding:
                      "12px",
                    border:
                      "1px solid rgba(255,255,255,0.12)",
                    borderRadius:
                      "8px",
                    background:
                      "#171717",
                    color:
                      "#ffffff",
                    outline:
                      "none",
                    fontSize:
                      "13px",
                  }}
                >
                  <option value="Auto">
                    Auto
                  </option>

                  <option value="Portrait">
                    Portrait
                  </option>

                  <option value="Landscape">
                    Landscape
                  </option>
                </select>
              </div>
            </div>

            {/* MARGIN */}

            <div
              style={{
                padding:
                  "13px 15px",
                borderRadius:
                  "9px",
                border:
                  "1px solid rgba(255,255,255,0.08)",
                background:
                  "rgba(255,255,255,0.025)",
                marginBottom:
                  "14px",
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  marginBottom:
                    "9px",
                }}
              >
                <span
                  style={{
                    color:
                      "#ffffff",
                    fontSize:
                      "11px",
                    fontWeight:
                      600,
                  }}
                >
                  MARGIN
                </span>

                <span
                  style={{
                    color:
                      "#ffffff",
                    fontSize:
                      "11px",
                    fontWeight:
                      600,
                  }}
                >
                  {margin} pt
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="60"
                step="5"
                value={margin}
                onChange={(
                  event
                ) => {
                  setMargin(
                    Number(
                      event.target
                        .value
                    )
                  );
                  setResult(
                    null
                  );
                }}
                style={{
                  width:
                    "100%",
                  accentColor:
                    "#7c4dff",
                  cursor:
                    "pointer",
                }}
              />

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  color:
                    "#666666",
                  fontSize:
                    "10px",
                  marginTop:
                    "5px",
                }}
              >
                <span>
                  Edge to edge
                </span>

                <span>
                  Wide margin
                </span>
              </div>
            </div>

            {/* ERROR */}

            {error && (
              <div
                style={{
                  padding:
                    "11px 13px",
                  marginBottom:
                    "12px",
                  borderRadius:
                    "8px",
                  background:
                    "rgba(255,60,60,0.08)",
                  border:
                    "1px solid rgba(255,60,60,0.14)",
                  color:
                    "#ff8585",
                  fontSize:
                    "12px",
                }}
              >
                {error}
              </div>
            )}

            {/* CREATE BUTTON */}

            <button
              onClick={
                handleCreatePdf
              }
              disabled={
                processing ||
                files.length ===
                  0
              }
              style={{
                width:
                  "100%",
                padding:
                  "14px 18px",
                borderRadius:
                  "9px",
                border:
                  "none",
                background:
                  processing
                    ? "rgba(255,255,255,0.10)"
                    : "#ffffff",
                color:
                  processing
                    ? "#666666"
                    : "#111111",
                cursor:
                  processing
                    ? "not-allowed"
                    : "pointer",
                fontSize:
                  "13px",
                fontWeight:
                  700,
              }}
            >
              {processing
                ? "Creating PDF..."
                : `Create PDF · ${files.length} ${
                    files.length ===
                    1
                      ? "Page"
                      : "Pages"
                  }`}
            </button>

            {/* RESULT */}

            {result && (
              <div
                style={{
                  marginTop:
                    "12px",
                  padding:
                    "13px",
                  borderRadius:
                    "9px",
                  background:
                    "rgba(255,255,255,0.035)",
                  border:
                    "1px solid rgba(255,255,255,0.08)",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "space-between",
                  gap: "12px",
                }}
              >
                <div>
                  <div
                    style={{
                      color:
                        "#ffffff",
                      fontSize:
                        "13px",
                      fontWeight:
                        600,
                    }}
                  >
                    PDF ready
                  </div>

                  <div
                    style={{
                      color:
                        "#777777",
                      fontSize:
                        "10px",
                      marginTop:
                        "4px",
                    }}
                  >
                    {files.length}{" "}
                    {files.length ===
                    1
                      ? "page"
                      : "pages"}{" "}
                    ·{" "}
                    {formatSize(
                      result.blob
                        .size
                    )}
                  </div>
                </div>

                <button
                  onClick={
                    handleDownload
                  }
                  style={{
                    padding:
                      "10px 16px",
                    borderRadius:
                      "8px",
                    border:
                      "none",
                    background:
                      "#ffffff",
                    color:
                      "#111111",
                    cursor:
                      "pointer",
                    fontSize:
                      "12px",
                    fontWeight:
                      700,
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  Download PDF
                </button>
              </div>
            )}
          </div>

          {/* ==================================
              RIGHT PANEL — LIVE PREVIEW
          ================================== */}

          <div
            style={{
              minWidth: 0,
              position:
                "sticky",
              top: "10px",
            }}
          >
            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                marginBottom:
                  "12px",
              }}
            >
              <div>
                <div
                  style={{
                    color:
                      "#ffffff",
                    fontSize:
                      "12px",
                    fontWeight:
                      600,
                    letterSpacing:
                      "1.5px",
                  }}
                >
                  PDF PREVIEW
                </div>

                <div
                  style={{
                    color:
                      "#777777",
                    fontSize:
                      "11px",
                    marginTop:
                      "5px",
                  }}
                >
                  {files.length}{" "}
                  {files.length ===
                  1
                    ? "page"
                    : "pages"}
                </div>
              </div>

              <div
                style={{
                  color:
                    "#777777",
                  fontSize:
                    "11px",
                }}
              >
                {pageSize}
              </div>
            </div>

            <div
              style={{
                height:
                  "640px",
                overflowY:
                  "auto",
                padding:
                  "14px",
                borderRadius:
                  "12px",
                border:
                  "1px solid rgba(255,255,255,0.08)",
                background:
                  "rgba(0,0,0,0.24)",
                boxSizing:
                  "border-box",
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  flexDirection:
                    "column",
                  alignItems:
                    "center",
                  gap:
                    "18px",
                }}
              >
                {files.map(
                  (
                    file,
                    index
                  ) => (
                    <div
                      key={`${file.name}-${file.size}-${file.lastModified}-preview`}
                      style={{
                        width:
                          "100%",
                        maxWidth:
                          "420px",
                      }}
                    >
                      {/* PAGE LABEL */}

                      <div
                        style={{
                          display:
                            "flex",
                          justifyContent:
                            "space-between",
                          alignItems:
                            "center",
                          marginBottom:
                            "7px",
                        }}
                      >
                        <span
                          style={{
                            color:
                              "#ffffff",
                            fontSize:
                              "10px",
                            fontWeight:
                              600,
                            letterSpacing:
                              "1px",
                          }}
                        >
                          PAGE{" "}
                          {String(
                            index +
                              1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </span>

                        <span
                          style={{
                            color:
                              "#666666",
                            fontSize:
                              "10px",
                          }}
                        >
                          {file.name}
                        </span>
                      </div>

                      {/* PDF PAGE */}

                      <div
                        style={{
                          width:
                            "100%",
                          aspectRatio:
                            pageSize ===
                              "Letter"
                              ? orientation ===
                                "Landscape"
                                ? "792 / 612"
                                : "612 / 792"
                              : orientation ===
                                "Landscape"
                              ? "841.89 / 595.28"
                              : "595.28 / 841.89",
                          background:
                            "#ffffff",
                          borderRadius:
                            "3px",
                          boxShadow:
                            "0 8px 25px rgba(0,0,0,0.45)",
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          padding:
                            `${Math.max(
                              4,
                              margin /
                                4
                            )}px`,
                          boxSizing:
                            "border-box",
                          overflow:
                            "hidden",
                        }}
                      >
                        {getPreview(
                          file
                        ) && (
                          <img
                            data-preview-file={
                              file.name
                            }
                            src={getPreview(
                              file
                            )}
                            alt={`Page ${
                              index +
                              1
                            }`}
                            style={{
                              width:
                                "100%",
                              height:
                                "100%",
                              objectFit:
                                "contain",
                              display:
                                "block",
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageToPdf;