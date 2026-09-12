import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  denoiseImage,
  getImageFormat,
} from "../../services/image/denoiseImage.js";

const DenoiseImage = () => {
  const [file, setFile] =
    useState(null);

  const [imageInfo, setImageInfo] =
    useState(null);

  const [amount, setAmount] =
    useState(45);

  const [preview, setPreview] =
    useState(null);

  const [previewLoading, setPreviewLoading] =
    useState(false);

  const [processing, setProcessing] =
    useState(false);

  const [result, setResult] =
    useState(null);

  const [error, setError] =
    useState("");

  const [dragOver, setDragOver] =
    useState(false);

  const previewRequest =
    useRef(0);

  /* --------------------------------
     FILE
  -------------------------------- */

  const handleFile = (
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
    setPreview(null);
    setError("");

    const url =
      URL.createObjectURL(
        selectedFile
      );

    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);

      setImageInfo({
        width:
          image.naturalWidth,
        height:
          image.naturalHeight,
        size:
          selectedFile.size,
        format:
          getImageFormat(
            selectedFile
          ),
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
    handleFile(
      event.target.files?.[0]
    );

    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();

    setDragOver(false);

    handleFile(
      event.dataTransfer.files?.[0]
    );
  };

  /* --------------------------------
     LIVE PREVIEW
  -------------------------------- */

  useEffect(() => {
    if (!file) {
      return;
    }

    const requestId =
      ++previewRequest.current;

    let cancelled = false;

    const updatePreview =
      async () => {
        try {
          setPreviewLoading(true);

          const output =
            await denoiseImage(
              file,
              amount,
              {
                preview: true,
                maxWidth: 900,
                maxHeight: 620,
              }
            );

          if (
            cancelled ||
            requestId !==
              previewRequest.current
          ) {
            return;
          }

          setPreview(
            output.dataUrl
          );
        } catch (err) {
          if (!cancelled) {
            setError(
              err.message ||
                "Unable to generate preview."
            );
          }
        } finally {
          if (
            !cancelled &&
            requestId ===
              previewRequest.current
          ) {
            setPreviewLoading(
              false
            );
          }
        }
      };

    updatePreview();

    return () => {
      cancelled = true;
    };
  }, [file, amount]);

  /* --------------------------------
     DENOISE
  -------------------------------- */

  const handleDenoise =
    async () => {
      if (!file) {
        return;
      }

      try {
        setProcessing(true);
        setError("");
        setResult(null);

        const output =
          await denoiseImage(
            file,
            amount
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
            "Unable to denoise the image."
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

    const baseName =
      file.name.replace(
        /\.[^/.]+$/,
        ""
      );

    let extension = "jpg";

    switch (file.type) {
      case "image/png":
        extension = "png";
        break;

      case "image/webp":
        extension = "webp";
        break;

      case "image/avif":
        extension = "avif";
        break;

      default:
        extension = "jpg";
    }

    const link =
      document.createElement("a");

    link.href = result.url;

    link.download =
      `${baseName}-denoised.${extension}`;

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
        "denoise-image-file"
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

  const getStrengthLabel = () => {
    if (amount === 0) {
      return "Original";
    }

    if (amount <= 25) {
      return "Subtle";
    }

    if (amount <= 55) {
      return "Balanced";
    }

    if (amount <= 80) {
      return "Strong";
    }

    return "Maximum";
  };

  const sizeDifference =
    result && imageInfo
      ? result.blob.size -
        imageInfo.size
      : 0;

  const sizeChange =
    result
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

  return (
    <div
      style={{
        width: "100%",
        color: "#ffffff",
        boxSizing: "border-box",
      }}
    >
      <input
        id="denoise-image-file"
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
          htmlFor="denoise-image-file"
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
              fontSize: "28px",
              marginBottom: "18px",
            }}
          >
            ◌
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
          WORKSPACE
      ================================== */}

      {file &&
        imageInfo && (
          <>
            {/* IMAGE INFORMATION */}

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
                  ORIGINAL RESOLUTION
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
                  {imageInfo.width} ×{" "}
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
                  {imageInfo.format}
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
                LIVE PREVIEW
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
                  LIVE PREVIEW
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
                  height: "390px",
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
                  position:
                    "relative",
                }}
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="Denoised preview"
                    style={{
                      maxWidth:
                        "100%",
                      maxHeight:
                        "350px",
                      objectFit:
                        "contain",
                      display:
                        "block",
                      opacity:
                        previewLoading
                          ? 0.45
                          : 1,
                      transition:
                        "opacity 0.15s",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      color:
                        "#777777",
                      fontSize:
                        "13px",
                    }}
                  >
                    Processing preview...
                  </div>
                )}

                {previewLoading &&
                  preview && (
                    <div
                      style={{
                        position:
                          "absolute",
                        top:
                          "12px",
                        right:
                          "12px",
                        padding:
                          "6px 9px",
                        borderRadius:
                          "6px",
                        background:
                          "rgba(0,0,0,0.65)",
                        color:
                          "#aaaaaa",
                        fontSize:
                          "10px",
                      }}
                    >
                      Updating...
                    </div>
                  )}
              </div>
            </div>

            {/* ==================================
                DENOISING CONTROL
            ================================== */}

            <div
              style={{
                padding:
                  "16px",
                borderRadius:
                  "10px",
                border:
                  "1px solid rgba(255,255,255,0.08)",
                background:
                  "rgba(255,255,255,0.025)",
                marginBottom:
                  "15px",
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
                    "11px",
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
                        "1.2px",
                    }}
                  >
                    DENOISING
                  </div>

                  <div
                    style={{
                      color:
                        "#666666",
                      fontSize:
                        "10px",
                      marginTop:
                        "4px",
                    }}
                  >
                    Reduce noise while
                    protecting edges and
                    important detail.
                  </div>
                </div>

                <div
                  style={{
                    textAlign:
                      "right",
                  }}
                >
                  <div
                    style={{
                      color:
                        "#ffffff",
                      fontSize:
                        "13px",
                      fontWeight:
                        700,
                    }}
                  >
                    {amount}%
                  </div>

                  <div
                    style={{
                      color:
                        "#777777",
                      fontSize:
                        "10px",
                      marginTop:
                        "2px",
                    }}
                  >
                    {getStrengthLabel()}
                  </div>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={amount}
                onChange={(event) => {
                  setAmount(
                    Number(
                      event.target
                        .value
                    )
                  );

                  setResult(null);
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
                  marginTop:
                    "7px",
                  color:
                    "#666666",
                  fontSize:
                    "10px",
                }}
              >
                <span>
                  Original
                </span>

                <span>
                  Subtle
                </span>

                <span>
                  Balanced
                </span>

                <span>
                  Strong
                </span>

                <span>
                  Maximum
                </span>
              </div>
            </div>

            {/* ==================================
                WHAT IT DOES
            ================================== */}

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(3, 1fr)",
                gap: "9px",
                marginBottom:
                  "15px",
              }}
            >
              {[
                [
                  "NOISE",
                  "Reduced",
                ],
                [
                  "EDGES",
                  "Protected",
                ],
                [
                  "RESOLUTION",
                  "Unchanged",
                ],
              ].map(
                ([label, value]) => (
                  <div
                    key={label}
                    style={{
                      padding:
                        "12px 13px",
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
                          "#777777",
                        fontSize:
                          "9px",
                        letterSpacing:
                          "1px",
                        marginBottom:
                          "5px",
                      }}
                    >
                      {label}
                    </div>

                    <div
                      style={{
                        color:
                          "#ffffff",
                        fontSize:
                          "11px",
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

            {/* ERROR */}

            {error && (
              <div
                style={{
                  padding:
                    "11px 13px",
                  marginBottom:
                    "13px",
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
                handleDenoise
              }
              disabled={
                processing ||
                amount === 0
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
                  processing ||
                  amount === 0
                    ? "rgba(255,255,255,0.10)"
                    : "#ffffff",
                color:
                  processing ||
                  amount === 0
                    ? "#666666"
                    : "#111111",
                cursor:
                  processing ||
                  amount === 0
                    ? "not-allowed"
                    : "pointer",
                fontSize:
                  "13px",
                fontWeight:
                  700,
              }}
            >
              {processing
                ? "Denoising image..."
                : amount === 0
                ? "Increase denoising to continue"
                : `Denoise Image · ${amount}%`}
            </button>

            {/* ==================================
                RESULT
            ================================== */}

            {result && (
              <div
                style={{
                  marginTop:
                    "14px",
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
                      Image denoised
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
                      {result.height}
                      {" · "}
                      {getImageFormat(
                        file
                      )}
                      {" · "}
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
                      {amount}% denoising
                      {" · "}
                      {sizeChange}
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

export default DenoiseImage;