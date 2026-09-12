import React, {
  useEffect,
  useState,
} from "react";

import {
  createTransformPreview,
  calculateOutputDimensions,
  rotateFlipImage,
} from "../../services/image/rotateImage.js";

const RotateImage = () => {
  const [file, setFile] =
    useState(null);

  const [imageInfo, setImageInfo] =
    useState(null);

  const [preview, setPreview] =
    useState(null);

  const [rotation, setRotation] =
    useState(0);

  const [flipHorizontal, setFlipHorizontal] =
    useState(false);

  const [flipVertical, setFlipVertical] =
    useState(false);

  const [processing, setProcessing] =
    useState(false);

  const [previewLoading, setPreviewLoading] =
    useState(false);

  const [result, setResult] =
    useState(null);

  const [error, setError] =
    useState("");

  const [dragOver, setDragOver] =
    useState(false);

  const processFile = (selectedFile) => {
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

    setError("");
    setResult(null);

    setFile(selectedFile);

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

      setRotation(0);
      setFlipHorizontal(false);
      setFlipVertical(false);
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

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }

    let cancelled = false;

    const updatePreview = async () => {
      try {
        setPreviewLoading(true);
        setError("");

        const previewUrl =
          await createTransformPreview(
            file,
            rotation,
            flipHorizontal,
            flipVertical
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

    updatePreview();

    return () => {
      cancelled = true;
    };
  }, [
    file,
    rotation,
    flipHorizontal,
    flipVertical,
  ]);

  const rotateLeft = () => {
    setRotation(
      (current) =>
        (current - 90 + 360) % 360
    );

    setResult(null);
  };

  const rotateRight = () => {
    setRotation(
      (current) =>
        (current + 90) % 360
    );

    setResult(null);
  };

  const rotate180 = () => {
    setRotation(
      (current) =>
        (current + 180) % 360
    );

    setResult(null);
  };

  const toggleHorizontal = () => {
    setFlipHorizontal(
      (current) => !current
    );

    setResult(null);
  };

  const toggleVertical = () => {
    setFlipVertical(
      (current) => !current
    );

    setResult(null);
  };

  const resetTransform = () => {
    setRotation(0);
    setFlipHorizontal(false);
    setFlipVertical(false);
    setResult(null);
    setError("");
  };

  const handleApply = async () => {
    if (!file || !imageInfo) {
      return;
    }

    try {
      setProcessing(true);
      setError("");
      setResult(null);

      const output =
        await rotateFlipImage(
          file,
          rotation,
          flipHorizontal,
          flipVertical
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
          "Unable to transform the image."
      );
    } finally {
      setProcessing(false);
    }
  };

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
      `${name}-edited.${extension}`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  };

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

  const getFormat = () => {
    if (!imageInfo) {
      return "";
    }

    if (
      imageInfo.type ===
      "image/jpeg"
    ) {
      return "JPG";
    }

    if (
      imageInfo.type ===
      "image/png"
    ) {
      return "PNG";
    }

    if (
      imageInfo.type ===
      "image/webp"
    ) {
      return "WebP";
    }

    if (
      imageInfo.type ===
      "image/avif"
    ) {
      return "AVIF";
    }

    return "";
  };

  const outputDimensions =
    imageInfo
      ? calculateOutputDimensions(
          imageInfo.width,
          imageInfo.height,
          rotation
        )
      : null;

  const hasChanges =
    rotation !== 0 ||
    flipHorizontal ||
    flipVertical;

  return (
    <div
      style={{
        width: "100%",
        color: "#ffffff",
        boxSizing: "border-box",
      }}
    >
      <input
        id="rotate-image-file"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={handleFileChange}
        style={{
          display: "none",
        }}
      />

      {!file && (
        <label
          htmlFor="rotate-image-file"
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
            color: "#ffffff",
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

      {file && imageInfo && (
        <>
          {/* IMAGE INFO */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, minmax(0, 1fr))",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            {[
              [
                "ORIGINAL",
                `${imageInfo.width} × ${imageInfo.height}`,
              ],
              [
                "FORMAT",
                getFormat(),
              ],
              [
                "SIZE",
                formatSize(
                  imageInfo.size
                ),
              ],
            ].map(
              ([label, value]) => (
                <div
                  key={label}
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
                        "11px",
                      letterSpacing:
                        "1px",
                      marginBottom:
                        "7px",
                    }}
                  >
                    {label}
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
                    {value}
                  </div>
                </div>
              )
            )}
          </div>

          {/* PREVIEW */}

          <div
            style={{
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                marginBottom:
                  "10px",
              }}
            >
              <span
                style={{
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 600,
                  letterSpacing:
                    "1.5px",
                }}
              >
                PREVIEW
              </span>

              <span
                style={{
                  color: "#777777",
                  fontSize: "11px",
                }}
              >
                {outputDimensions?.width}{" "}
                ×{" "}
                {outputDimensions?.height}
              </span>
            </div>

            <div
              style={{
                width: "100%",
                minHeight: "320px",
                maxHeight: "520px",
                padding: "18px",
                boxSizing: "border-box",
                borderRadius: "12px",
                border:
                  "1px solid rgba(255,255,255,0.08)",
                background:
                  "rgba(0,0,0,0.28)",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                overflow: "hidden",
              }}
            >
              {previewLoading ? (
                <span
                  style={{
                    color: "#777777",
                    fontSize: "13px",
                  }}
                >
                  Updating preview...
                </span>
              ) : preview ? (
                <img
                  src={preview}
                  alt="Edited image preview"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "480px",
                    objectFit:
                      "contain",
                    display:
                      "block",
                  }}
                />
              ) : null}
            </div>
          </div>

          {/* ROTATE */}

          <div
            style={{
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing:
                  "1.5px",
                marginBottom:
                  "10px",
              }}
            >
              ROTATE
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, 1fr)",
                gap: "9px",
              }}
            >
              <button
                onClick={rotateLeft}
                style={{
                  minHeight:
                    "54px",
                  border:
                    "1px solid rgba(255,255,255,0.12)",
                  borderRadius:
                    "9px",
                  background:
                    "rgba(255,255,255,0.035)",
                  color: "#ffffff",
                  cursor:
                    "pointer",
                  fontSize:
                    "13px",
                  fontWeight:
                    600,
                }}
              >
                ↶
                <span
                  style={{
                    marginLeft:
                      "7px",
                  }}
                >
                  90° Left
                </span>
              </button>

              <button
                onClick={rotate180}
                style={{
                  minHeight:
                    "54px",
                  border:
                    "1px solid rgba(255,255,255,0.12)",
                  borderRadius:
                    "9px",
                  background:
                    "rgba(255,255,255,0.035)",
                  color: "#ffffff",
                  cursor:
                    "pointer",
                  fontSize:
                    "13px",
                  fontWeight:
                    600,
                }}
              >
                ↻
                <span
                  style={{
                    marginLeft:
                      "7px",
                  }}
                >
                  180°
                </span>
              </button>

              <button
                onClick={rotateRight}
                style={{
                  minHeight:
                    "54px",
                  border:
                    "1px solid rgba(255,255,255,0.12)",
                  borderRadius:
                    "9px",
                  background:
                    "rgba(255,255,255,0.035)",
                  color: "#ffffff",
                  cursor:
                    "pointer",
                  fontSize:
                    "13px",
                  fontWeight:
                    600,
                }}
              >
                ↷
                <span
                  style={{
                    marginLeft:
                      "7px",
                  }}
                >
                  90° Right
                </span>
              </button>
            </div>
          </div>

          {/* FLIP */}

          <div
            style={{
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing:
                  "1.5px",
                marginBottom:
                  "10px",
              }}
            >
              FLIP
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: "9px",
              }}
            >
              <button
                onClick={
                  toggleHorizontal
                }
                style={{
                  minHeight:
                    "54px",
                  border:
                    flipHorizontal
                      ? "1px solid rgba(255,255,255,0.8)"
                      : "1px solid rgba(255,255,255,0.12)",
                  borderRadius:
                    "9px",
                  background:
                    flipHorizontal
                      ? "rgba(255,255,255,0.09)"
                      : "rgba(255,255,255,0.035)",
                  color:
                    "#ffffff",
                  cursor:
                    "pointer",
                  fontSize:
                    "13px",
                  fontWeight:
                    600,
                }}
              >
                ↔
                <span
                  style={{
                    marginLeft:
                      "8px",
                  }}
                >
                  Horizontal
                </span>
              </button>

              <button
                onClick={
                  toggleVertical
                }
                style={{
                  minHeight:
                    "54px",
                  border:
                    flipVertical
                      ? "1px solid rgba(255,255,255,0.8)"
                      : "1px solid rgba(255,255,255,0.12)",
                  borderRadius:
                    "9px",
                  background:
                    flipVertical
                      ? "rgba(255,255,255,0.09)"
                      : "rgba(255,255,255,0.035)",
                  color:
                    "#ffffff",
                  cursor:
                    "pointer",
                  fontSize:
                    "13px",
                  fontWeight:
                    600,
                }}
              >
                ↕
                <span
                  style={{
                    marginLeft:
                      "8px",
                  }}
                >
                  Vertical
                </span>
              </button>
            </div>
          </div>

          {/* CURRENT TRANSFORM */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, 1fr)",
              gap: "10px",
              marginBottom:
                "18px",
            }}
          >
            <div
              style={{
                padding:
                  "12px 14px",
                borderRadius:
                  "8px",
                background:
                  "rgba(255,255,255,0.025)",
                border:
                  "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  color:
                    "#666666",
                  fontSize:
                    "10px",
                  letterSpacing:
                    "0.8px",
                  marginBottom:
                    "5px",
                }}
              >
                ROTATION
              </div>

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
                {rotation}°
              </div>
            </div>

            <div
              style={{
                padding:
                  "12px 14px",
                borderRadius:
                  "8px",
                background:
                  "rgba(255,255,255,0.025)",
                border:
                  "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  color:
                    "#666666",
                  fontSize:
                    "10px",
                  letterSpacing:
                    "0.8px",
                  marginBottom:
                    "5px",
                }}
              >
                FLIP
              </div>

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
                {flipHorizontal &&
                flipVertical
                  ? "H + V"
                  : flipHorizontal
                  ? "Horizontal"
                  : flipVertical
                  ? "Vertical"
                  : "None"}
              </div>
            </div>

            <div
              style={{
                padding:
                  "12px 14px",
                borderRadius:
                  "8px",
                background:
                  "rgba(255,255,255,0.025)",
                border:
                  "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  color:
                    "#666666",
                  fontSize:
                    "10px",
                  letterSpacing:
                    "0.8px",
                  marginBottom:
                    "5px",
                }}
              >
                OUTPUT
              </div>

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
                {
                  outputDimensions?.width
                }{" "}
                ×{" "}
                {
                  outputDimensions?.height
                }
              </div>
            </div>
          </div>

          {error && (
            <div
              style={{
                padding:
                  "12px 14px",
                marginBottom:
                  "16px",
                borderRadius:
                  "8px",
                background:
                  "rgba(255,60,60,0.08)",
                border:
                  "1px solid rgba(255,60,60,0.14)",
                color:
                  "#ff8585",
                fontSize:
                  "13px",
              }}
            >
              {error}
            </div>
          )}

          {/* ACTIONS */}

          <div
            style={{
              display: "flex",
              gap: "10px",
            }}
          >
            <button
              onClick={
                resetTransform
              }
              disabled={
                !hasChanges
              }
              style={{
                flex: 1,
                padding:
                  "13px 18px",
                borderRadius:
                  "9px",
                border:
                  "1px solid rgba(255,255,255,0.12)",
                background:
                  "rgba(255,255,255,0.035)",
                color: hasChanges
                  ? "#ffffff"
                  : "#555555",
                cursor:
                  hasChanges
                    ? "pointer"
                    : "not-allowed",
                fontSize:
                  "13px",
                fontWeight:
                  600,
              }}
            >
              Reset
            </button>

            <button
              onClick={
                handleApply
              }
              disabled={
                processing ||
                !hasChanges
              }
              style={{
                flex: 2,
                padding:
                  "13px 18px",
                borderRadius:
                  "9px",
                border: "none",
                background:
                  processing ||
                  !hasChanges
                    ? "rgba(255,255,255,0.10)"
                    : "#ffffff",
                color:
                  processing ||
                  !hasChanges
                    ? "#666666"
                    : "#111111",
                cursor:
                  processing ||
                  !hasChanges
                    ? "not-allowed"
                    : "pointer",
                fontSize:
                  "13px",
                fontWeight:
                  700,
              }}
            >
              {processing
                ? "Processing..."
                : "Apply Changes"}
            </button>
          </div>

          {/* RESULT */}

          {result && (
            <div
              style={{
                marginTop:
                  "18px",
                padding:
                  "16px",
                borderRadius:
                  "10px",
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
                gap: "15px",
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
                  Image ready
                </div>

                <div
                  style={{
                    color:
                      "#777777",
                    fontSize:
                      "11px",
                  }}
                >
                  {result.width} ×{" "}
                  {result.height} ·{" "}
                  {getFormat()} ·{" "}
                  {formatSize(
                    result.blob.size
                  )}
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
                  border: "none",
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
          )}
        </>
      )}
    </div>
  );
};

export default RotateImage;