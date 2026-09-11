import React, {
  useEffect,
  useState,
} from "react";

import {
  removeImageMetadata,
  createMetadataPreview,
  getImageFormat,
} from "../../services/image/removeImageMetadata.js";

const RemoveImageMetadata = () => {
  const [file, setFile] =
    useState(null);

  const [imageInfo, setImageInfo] =
    useState(null);

  const [preview, setPreview] =
    useState(null);

  const [result, setResult] =
    useState(null);

  const [processing, setProcessing] =
    useState(false);

  const [previewLoading, setPreviewLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [dragOver, setDragOver] =
    useState(false);

  /* --------------------------------
     FILE HANDLING
  -------------------------------- */

  const processFile = (
    selectedFile
  ) => {
    if (!selectedFile) {
      return;
    }

    const supportedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
    ];

    if (
      !supportedTypes.includes(
        selectedFile.type
      )
    ) {
      setError(
        "Please upload a JPG, PNG, WebP or AVIF image."
      );

      return;
    }

    setFile(selectedFile);

    setResult(null);

    setError("");

    const url =
      URL.createObjectURL(
        selectedFile
      );

    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);

      setImageInfo({
        width: image.naturalWidth,
        height: image.naturalHeight,
        size: selectedFile.size,
        type: selectedFile.type,
        name: selectedFile.name,
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);

      setError(
        "Unable to read this image."
      );
    };

    image.src = url;
  };

  const handleFileChange = (
    event
  ) => {
    processFile(
      event.target.files?.[0]
    );

    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();

    setDragOver(false);

    processFile(
      event.dataTransfer.files?.[0]
    );
  };

  /* --------------------------------
     PREVIEW
  -------------------------------- */

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }

    let cancelled = false;

    const generatePreview =
      async () => {
        try {
          setPreviewLoading(true);

          const previewUrl =
            await createMetadataPreview(
              file
            );

          if (!cancelled) {
            setPreview(previewUrl);
          }
        } catch (err) {
          if (!cancelled) {
            setError(
              err.message ||
                "Unable to generate preview."
            );
          }
        } finally {
          if (!cancelled) {
            setPreviewLoading(false);
          }
        }
      };

    generatePreview();

    return () => {
      cancelled = true;
    };
  }, [file]);

  /* --------------------------------
     REMOVE METADATA
  -------------------------------- */

  const handleRemoveMetadata =
    async () => {
      if (!file) {
        return;
      }

      try {
        setProcessing(true);

        setError("");

        setResult(null);

        const output =
          await removeImageMetadata(
            file
          );

        const url =
          URL.createObjectURL(
            output.blob
          );

        setResult({
          ...output,
          url,
        });
      } catch (err) {
        setError(
          err.message ||
            "Unable to remove image metadata."
        );
      } finally {
        setProcessing(false);
      }
    };

  /* --------------------------------
     DOWNLOAD
  -------------------------------- */

  const handleDownload = () => {
    if (!result?.url || !file) {
      return;
    }

    const name =
      file.name.replace(
        /\.[^/.]+$/,
        ""
      );

    let extension = "jpg";

    if (
      file.type === "image/png"
    ) {
      extension = "png";
    } else if (
      file.type === "image/webp"
    ) {
      extension = "webp";
    } else if (
      file.type === "image/avif"
    ) {
      extension = "avif";
    }

    const link =
      document.createElement("a");

    link.href = result.url;

    link.download =
      `${name}-clean.${extension}`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  };

  /* --------------------------------
     CHANGE IMAGE
  -------------------------------- */

  const handleChangeImage = () => {
    document
      .getElementById(
        "remove-metadata-file"
      )
      ?.click();
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

  const sizeDifference =
    result && imageInfo
      ? result.blob.size -
        imageInfo.size
      : 0;

  const sizeChangeText =
    result && imageInfo
      ? sizeDifference <= 0
        ? `${formatSize(
            Math.abs(
              sizeDifference
            )
          )} smaller`
        : `${formatSize(
            sizeDifference
          )} larger`
      : "";

  /* --------------------------------
     UI
  -------------------------------- */

  return (
    <div
      style={{
        width: "100%",
        color: "#ffffff",
        boxSizing: "border-box",
      }}
    >
      <input
        id="remove-metadata-file"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={handleFileChange}
        style={{
          display: "none",
        }}
      />

      {/* ==================================
          UPLOAD
      ================================== */}

      {!file && (
        <label
          htmlFor="remove-metadata-file"
          onDragOver={(event) => {
            event.preventDefault();

            setDragOver(true);
          }}
          onDragLeave={() => {
            setDragOver(false);
          }}
          onDrop={handleDrop}
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
            Drop your image here
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
          EDITOR
      ================================== */}

      {file &&
        imageInfo && (
          <>
            {/* TOP INFO */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, minmax(0, 1fr))",
                gap: "12px",
                marginBottom: "18px",
              }}
            >
              <div
                style={{
                  padding:
                    "15px 17px",
                  borderRadius:
                    "10px",
                  background:
                    "rgba(255,255,255,0.035)",
                  border:
                    "1px solid rgba(255,255,255,0.08)",
                }}
              >
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
                  DIMENSIONS
                </div>

                <div
                  style={{
                    color:
                      "#ffffff",
                    fontSize:
                      "14px",
                    fontWeight:
                      600,
                  }}
                >
                  {imageInfo.width}{" "}
                  ×{" "}
                  {imageInfo.height}
                </div>
              </div>

              <div
                style={{
                  padding:
                    "15px 17px",
                  borderRadius:
                    "10px",
                  background:
                    "rgba(255,255,255,0.035)",
                  border:
                    "1px solid rgba(255,255,255,0.08)",
                }}
              >
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
                  FORMAT
                </div>

                <div
                  style={{
                    color:
                      "#ffffff",
                    fontSize:
                      "14px",
                    fontWeight:
                      600,
                  }}
                >
                  {getImageFormat(
                    file
                  )}
                </div>
              </div>

              <div
                style={{
                  padding:
                    "15px 17px",
                  borderRadius:
                    "10px",
                  background:
                    "rgba(255,255,255,0.035)",
                  border:
                    "1px solid rgba(255,255,255,0.08)",
                }}
              >
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
                  FILE SIZE
                </div>

                <div
                  style={{
                    color:
                      "#ffffff",
                    fontSize:
                      "14px",
                    fontWeight:
                      600,
                  }}
                >
                  {formatSize(
                    imageInfo.size
                  )}
                </div>
              </div>
            </div>

            {/* ==================================
                PREVIEW
            ================================== */}

            <div
              style={{
                marginBottom:
                  "18px",
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "space-between",
                  marginBottom:
                    "9px",
                }}
              >
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
                  PREVIEW
                </div>

                <button
                  onClick={
                    handleChangeImage
                  }
                  style={{
                    padding:
                      "7px 11px",
                    border:
                      "1px solid rgba(255,255,255,0.10)",
                    borderRadius:
                      "7px",
                    background:
                      "rgba(255,255,255,0.025)",
                    color:
                      "#ffffff",
                    cursor:
                      "pointer",
                    fontSize:
                      "11px",
                  }}
                >
                  Change image
                </button>
              </div>

              <div
                style={{
                  width: "100%",
                  minHeight:
                    "300px",
                  maxHeight:
                    "480px",
                  padding:
                    "18px",
                  boxSizing:
                    "border-box",
                  borderRadius:
                    "12px",
                  border:
                    "1px solid rgba(255,255,255,0.08)",
                  background:
                    "rgba(0,0,0,0.28)",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  overflow:
                    "hidden",
                }}
              >
                {previewLoading ? (
                  <span
                    style={{
                      color:
                        "#777777",
                      fontSize:
                        "13px",
                    }}
                  >
                    Loading preview...
                  </span>
                ) : preview ? (
                  <img
                    src={preview}
                    alt="Image preview"
                    style={{
                      maxWidth:
                        "100%",
                      maxHeight:
                        "440px",
                      objectFit:
                        "contain",
                      display:
                        "block",
                    }}
                  />
                ) : null}
              </div>
            </div>

            {/* ==================================
                WHAT WILL BE REMOVED
            ================================== */}

            <div
              style={{
                padding:
                  "16px",
                borderRadius:
                  "10px",
                background:
                  "rgba(255,120,0,0.035)",
                border:
                  "1px solid rgba(255,140,0,0.12)",
                marginBottom:
                  "18px",
              }}
            >
              <div
                style={{
                  color:
                    "#ffffff",
                  fontSize:
                    "12px",
                  fontWeight:
                    600,
                  letterSpacing:
                    "1.2px",
                  marginBottom:
                    "10px",
                }}
              >
                METADATA CLEANUP
              </div>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(3, 1fr)",
                  gap:
                    "8px",
                }}
              >
                {[
                  "EXIF data",
                  "GPS location",
                  "Camera information",
                  "Date & time",
                  "Software tags",
                  "Other embedded data",
                ].map(
                  (item) => (
                    <div
                      key={item}
                      style={{
                        color:
                          "#999999",
                        fontSize:
                          "11px",
                        padding:
                          "7px 9px",
                        borderRadius:
                          "6px",
                        background:
                          "rgba(255,255,255,0.025)",
                      }}
                    >
                      <span
                        style={{
                          color:
                            "#c8c8c8",
                          marginRight:
                            "5px",
                        }}
                      >
                        ✓
                      </span>
                      {item}
                    </div>
                  )
                )}
              </div>
            </div>

            {/* ==================================
                PRIVACY NOTE
            ================================== */}

            <div
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                gap: "10px",
                padding:
                  "11px 13px",
                marginBottom:
                  "14px",
                borderRadius:
                  "8px",
                background:
                  "rgba(255,255,255,0.025)",
                border:
                  "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span
                style={{
                  color:
                    "#e28a00",
                  fontSize:
                    "15px",
                }}
              >
                ◆
              </span>

              <span
                style={{
                  color:
                    "#888888",
                  fontSize:
                    "11px",
                  lineHeight:
                    1.5,
                }}
              >
                The image is decoded and
                re-encoded locally. The
                original metadata container is
                not copied to the output.
              </span>
            </div>

            {/* ERROR */}

            {error && (
              <div
                style={{
                  padding:
                    "12px 14px",
                  marginBottom:
                    "14px",
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

            {/* ==================================
                ACTION
            ================================== */}

            <button
              onClick={
                handleRemoveMetadata
              }
              disabled={
                processing
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
                ? "Removing metadata..."
                : "Remove Metadata"}
            </button>

            {/* ==================================
                RESULT
            ================================== */}

            {result && (
              <div
                style={{
                  marginTop:
                    "15px",
                  padding:
                    "15px",
                  borderRadius:
                    "10px",
                  background:
                    "rgba(255,255,255,0.035)",
                  border:
                    "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "space-between",
                    gap:
                      "15px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color:
                          "#ffffff",
                        fontSize:
                          "14px",
                        fontWeight:
                          600,
                        marginBottom:
                          "5px",
                      }}
                    >
                      Metadata removed
                    </div>

                    <div
                      style={{
                        color:
                          "#777777",
                        fontSize:
                          "11px",
                      }}
                    >
                      {result.width}{" "}
                      ×{" "}
                      {result.height}{" "}
                      ·{" "}
                      {getImageFormat(
                        file
                      )}{" "}
                      ·{" "}
                      {formatSize(
                        result.blob
                          .size
                      )}
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
                      {sizeChangeText}
                    </div>
                  </div>

                  <button
                    onClick={
                      handleDownload
                    }
                    style={{
                      padding:
                        "10px 18px",
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
                    Download
                  </button>
                </div>
              </div>
            )}
          </>
        )}
    </div>
  );
};

export default RemoveImageMetadata;