import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  resizeImage,
  detectImageFormat,
  downloadResizedImage,
  formatDimensions,
  formatFileSize,
  getResizePercentage,
} from "../../services/image/resizeImage";

export default function ResizeImage() {
  const fileInputRef =
    useRef(null);

  const previewUrlRef =
    useRef("");

  const resizedPreviewUrlRef =
    useRef("");

  const previewTimerRef =
    useRef(null);

  const [file, setFile] =
    useState(null);

  const [preview, setPreview] =
    useState("");

  const [sourceFormat, setSourceFormat] =
    useState("");

  const [originalWidth, setOriginalWidth] =
    useState(0);

  const [originalHeight, setOriginalHeight] =
    useState(0);

  const [width, setWidth] =
    useState(0);

  const [height, setHeight] =
    useState(0);

  const [lockRatio, setLockRatio] =
    useState(true);

  const [quality, setQuality] =
    useState(0.92);

  const [outputFormat, setOutputFormat] =
    useState("jpg");

  const [resizedBlob, setResizedBlob] =
    useState(null);

  const [resizedSize, setResizedSize] =
    useState(null);

  const [resizedPreview, setResizedPreview] =
    useState("");

  const [previewLoading, setPreviewLoading] =
    useState(false);

  const [dragging, setDragging] =
    useState(false);

  const [resizing, setResizing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  /*
   * Cleanup everything when component
   * is removed.
   */
  useEffect(() => {
    return () => {
      if (
        previewTimerRef.current
      ) {
        clearTimeout(
          previewTimerRef.current
        );
      }

      if (
        previewUrlRef.current
      ) {
        URL.revokeObjectURL(
          previewUrlRef.current
        );
      }

      if (
        resizedPreviewUrlRef.current
      ) {
        URL.revokeObjectURL(
          resizedPreviewUrlRef.current
        );
      }
    };
  }, []);


  /*
   * Generate live preview.
   *
   * This runs whenever dimensions,
   * quality or format change.
   */
  const generateLivePreview = (
    selectedFile,
    newWidth,
    newHeight,
    newQuality,
    newFormat
  ) => {
    if (
      !selectedFile ||
      !newWidth ||
      !newHeight
    ) {
      return;
    }

    if (
      previewTimerRef.current
    ) {
      clearTimeout(
        previewTimerRef.current
      );
    }

    previewTimerRef.current =
      setTimeout(
        async () => {
          setPreviewLoading(
            true
          );

          try {
            const result =
              await resizeImage(
                selectedFile,
                newWidth,
                newHeight,
                newQuality,
                newFormat
              );

            /*
             * Remove old resized
             * preview URL.
             */
            if (
              resizedPreviewUrlRef.current
            ) {
              URL.revokeObjectURL(
                resizedPreviewUrlRef.current
              );
            }

            const newUrl =
              URL.createObjectURL(
                result.blob
              );

            resizedPreviewUrlRef.current =
              newUrl;

            setResizedPreview(
              newUrl
            );

            setResizedSize(
              result.blob.size
            );

            setResizedBlob(
              result.blob
            );

            setOutputFormat(
              result.format
            );

            setError("");
          } catch (previewError) {
            console.error(
              previewError
            );

            setError(
              "Could not generate live preview."
            );
          } finally {
            setPreviewLoading(
              false
            );
          }
        },
        180
      );
  };


  /*
   * Load selected image.
   */
  const handleFile = (
    selectedFile
  ) => {
    if (!selectedFile) {
      return;
    }

    if (
      !selectedFile.type.startsWith(
        "image/"
      )
    ) {
      setError(
        "Please select a valid image file."
      );

      return;
    }

    /*
     * Clean old URLs.
     */
    if (
      previewUrlRef.current
    ) {
      URL.revokeObjectURL(
        previewUrlRef.current
      );

      previewUrlRef.current =
        "";
    }

    if (
      resizedPreviewUrlRef.current
    ) {
      URL.revokeObjectURL(
        resizedPreviewUrlRef.current
      );

      resizedPreviewUrlRef.current =
        "";
    }

    const detected =
      detectImageFormat(
        selectedFile
      );

    const image =
      new Image();

    const objectUrl =
      URL.createObjectURL(
        selectedFile
      );

    image.onload = () => {
      const imageWidth =
        image.naturalWidth;

      const imageHeight =
        image.naturalHeight;

      /*
       * IMPORTANT:
       * Keep this URL alive.
       *
       * Previously it was being
       * revoked immediately, which
       * caused the broken thumbnail.
       */
      previewUrlRef.current =
        objectUrl;

      setFile(
        selectedFile
      );

      setSourceFormat(
        detected
      );

      setOriginalWidth(
        imageWidth
      );

      setOriginalHeight(
        imageHeight
      );

      setWidth(
        imageWidth
      );

      setHeight(
        imageHeight
      );

      const defaultFormat =
        [
          "jpg",
          "png",
          "webp",
          "avif",
          "bmp",
        ].includes(
          detected
        )
          ? detected
          : "jpg";

      setOutputFormat(
        defaultFormat
      );

      setPreview(
        objectUrl
      );

      setResizedPreview(
        ""
      );

      setResizedBlob(
        null
      );

      setResizedSize(
        null
      );

      setError("");

      setSuccess("");

      /*
       * Generate initial
       * live preview.
       */
      generateLivePreview(
        selectedFile,
        imageWidth,
        imageHeight,
        quality,
        defaultFormat
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(
        objectUrl
      );

      setError(
        "This image could not be loaded."
      );
    };

    image.src =
      objectUrl;
  };


  /*
   * File picker.
   */
  const handleInputChange = (
    event
  ) => {
    handleFile(
      event.target.files?.[0]
    );
  };


  /*
   * Drag over.
   */
  const handleDragOver = (
    event
  ) => {
    event.preventDefault();

    setDragging(true);
  };


  /*
   * Drag leave.
   */
  const handleDragLeave = () => {
    setDragging(false);
  };


  /*
   * Drop.
   */
  const handleDrop = (
    event
  ) => {
    event.preventDefault();

    setDragging(false);

    handleFile(
      event.dataTransfer.files?.[0]
    );
  };


  /*
   * Open picker.
   */
  const openFilePicker = () => {
    fileInputRef.current?.click();
  };


  /*
   * Change width.
   */
  const handleWidthChange = (
    value
  ) => {
    const newWidth =
      Math.max(
        1,
        Math.round(
          Number(value) || 1
        )
      );

    let newHeight =
      height;

    if (
      lockRatio &&
      originalWidth &&
      originalHeight
    ) {
      const ratio =
        originalHeight /
        originalWidth;

      newHeight =
        Math.max(
          1,
          Math.round(
            newWidth *
              ratio
          )
        );

      setHeight(
        newHeight
      );
    }

    setWidth(
      newWidth
    );

    setResizedBlob(
      null
    );

    setSuccess("");

    setError("");

    generateLivePreview(
      file,
      newWidth,
      newHeight,
      quality,
      outputFormat
    );
  };


  /*
   * Change height.
   */
  const handleHeightChange = (
    value
  ) => {
    const newHeight =
      Math.max(
        1,
        Math.round(
          Number(value) || 1
        )
      );

    let newWidth =
      width;

    if (
      lockRatio &&
      originalWidth &&
      originalHeight
    ) {
      const ratio =
        originalWidth /
        originalHeight;

      newWidth =
        Math.max(
          1,
          Math.round(
            newHeight *
              ratio
          )
        );

      setWidth(
        newWidth
      );
    }

    setHeight(
      newHeight
    );

    setResizedBlob(
      null
    );

    setSuccess("");

    setError("");

    generateLivePreview(
      file,
      newWidth,
      newHeight,
      quality,
      outputFormat
    );
  };


  /*
   * Quick scale.
   */
  const applyScale = (
    percentage
  ) => {
    if (
      !originalWidth ||
      !originalHeight
    ) {
      return;
    }

    const scale =
      percentage / 100;

    const newWidth =
      Math.max(
        1,
        Math.round(
          originalWidth *
            scale
        )
      );

    const newHeight =
      Math.max(
        1,
        Math.round(
          originalHeight *
            scale
        )
      );

    setWidth(
      newWidth
    );

    setHeight(
      newHeight
    );

    setResizedBlob(
      null
    );

    setSuccess("");

    setError("");

    generateLivePreview(
      file,
      newWidth,
      newHeight,
      quality,
      outputFormat
    );
  };


  /*
   * Change output format.
   */
  const handleFormatChange = (
    format
  ) => {
    setOutputFormat(
      format
    );

    setResizedBlob(
      null
    );

    setSuccess("");

    generateLivePreview(
      file,
      width,
      height,
      quality,
      format
    );
  };


  /*
   * Change quality.
   */
  const handleQualityChange = (
    event
  ) => {
    const newQuality =
      Number(
        event.target.value
      );

    setQuality(
      newQuality
    );

    setResizedBlob(
      null
    );

    setSuccess("");

    generateLivePreview(
      file,
      width,
      height,
      newQuality,
      outputFormat
    );
  };


  /*
   * Final resize.
   *
   * The live preview has already
   * generated the image, but this
   * performs the final operation.
   */
  const handleResize = async () => {
    if (!file) {
      setError(
        "Please select an image first."
      );

      return;
    }

    if (
      width < 1 ||
      height < 1
    ) {
      setError(
        "Please enter valid dimensions."
      );

      return;
    }

    setResizing(true);

    setError("");

    setSuccess("");

    try {
      const result =
        await resizeImage(
          file,
          width,
          height,
          quality,
          outputFormat
        );

      if (
        resizedPreviewUrlRef.current
      ) {
        URL.revokeObjectURL(
          resizedPreviewUrlRef.current
        );
      }

      const newUrl =
        URL.createObjectURL(
          result.blob
        );

      resizedPreviewUrlRef.current =
        newUrl;

      setResizedPreview(
        newUrl
      );

      setResizedBlob(
        result.blob
      );

      setResizedSize(
        result.blob.size
      );

      setOutputFormat(
        result.format
      );

      setSuccess(
        `${formatDimensions(
          result.width,
          result.height
        )} • ${formatFileSize(
          result.blob.size
        )}`
      );
    } catch (resizeError) {
      console.error(
        resizeError
      );

      setError(
        resizeError?.message ||
          "Image resizing failed."
      );
    } finally {
      setResizing(false);
    }
  };


  /*
   * Download.
   */
  const handleDownload = () => {
    if (
      !resizedBlob ||
      !file
    ) {
      return;
    }

    downloadResizedImage(
      resizedBlob,
      file.name,
      outputFormat
    );
  };


  /*
   * Reset.
   */
  const handleReset = () => {
    if (
      previewTimerRef.current
    ) {
      clearTimeout(
        previewTimerRef.current
      );
    }

    if (
      previewUrlRef.current
    ) {
      URL.revokeObjectURL(
        previewUrlRef.current
      );

      previewUrlRef.current =
        "";
    }

    if (
      resizedPreviewUrlRef.current
    ) {
      URL.revokeObjectURL(
        resizedPreviewUrlRef.current
      );

      resizedPreviewUrlRef.current =
        "";
    }

    setFile(null);

    setPreview("");

    setResizedPreview("");

    setSourceFormat("");

    setOriginalWidth(0);

    setOriginalHeight(0);

    setWidth(0);

    setHeight(0);

    setLockRatio(true);

    setQuality(0.92);

    setOutputFormat("jpg");

    setResizedBlob(null);

    setResizedSize(null);

    setPreviewLoading(false);

    setDragging(false);

    setResizing(false);

    setError("");

    setSuccess("");

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  };


  const areaPercentage =
    originalWidth &&
    originalHeight &&
    width &&
    height
      ? getResizePercentage(
          originalWidth,
          originalHeight,
          width,
          height
        )
      : 100;


  return (
    <div
      style={{
        width: "100%",
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "32px",
        color: "#ffffff",
      }}
    >

      {/* HEADER */}

      <div
        style={{
          display: "flex",
          alignItems:
            "flex-start",
          justifyContent:
            "space-between",
          gap: "20px",
          marginBottom:
            "28px",
        }}
      >

        <div>

          <div
            style={{
              fontSize:
                "12px",
              fontWeight:
                700,
              letterSpacing:
                "0.12em",
              color:
                "rgba(255,255,255,0.65)",
              marginBottom:
                "8px",
            }}
          >
            IMAGE TOOL
          </div>

          <h1
            style={{
              margin: 0,
              fontSize:
                "32px",
              fontWeight:
                700,
              color:
                "#ffffff",
            }}
          >
            Resize Image
          </h1>

          <p
            style={{
              margin:
                "8px 0 0",
              fontSize:
                "15px",
              color:
                "rgba(255,255,255,0.60)",
            }}
          >
            Change image
            dimensions while
            preserving quality.
          </p>

        </div>

        {file && (
          <button
            type="button"
            onClick={
              handleReset
            }
            style={{
              border:
                "1px solid rgba(255,255,255,0.30)",
              background:
                "rgba(255,255,255,0.06)",
              color:
                "#ffffff",
              borderRadius:
                "10px",
              padding:
                "9px 16px",
              cursor:
                "pointer",
              fontSize:
                "14px",
            }}
          >
            Clear
          </button>
        )}

      </div>


      {/* UPLOAD */}

      {!file ? (
        <>
          <input
            ref={
              fileInputRef
            }
            type="file"
            accept="image/*"
            onChange={
              handleInputChange
            }
            style={{
              display:
                "none",
            }}
          />

          <div
            onClick={
              openFilePicker
            }
            onDragOver={
              handleDragOver
            }
            onDragLeave={
              handleDragLeave
            }
            onDrop={
              handleDrop
            }
            style={{
              border:
                dragging
                  ? "2px solid #ffffff"
                  : "2px dashed rgba(255,255,255,0.30)",
              borderRadius:
                "18px",
              padding:
                "80px 30px",
              textAlign:
                "center",
              cursor:
                "pointer",
              background:
                dragging
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(255,255,255,0.025)",
            }}
          >

            <div
              style={{
                width:
                  "58px",
                height:
                  "58px",
                margin:
                  "0 auto 18px",
                borderRadius:
                  "16px",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                fontSize:
                  "28px",
                color:
                  "#ffffff",
                background:
                  "rgba(255,255,255,0.10)",
              }}
            >
              ↗
            </div>

            <h2
              style={{
                margin:
                  "0 0 8px",
                fontSize:
                  "21px",
                color:
                  "#ffffff",
              }}
            >
              Drop your image here
            </h2>

            <p
              style={{
                margin:
                  "0 0 18px",
                color:
                  "rgba(255,255,255,0.60)",
              }}
            >
              or click to browse
              from your device
            </p>

            <div
              style={{
                fontSize:
                  "12px",
                color:
                  "rgba(255,255,255,0.45)",
              }}
            >
              JPG · PNG · WebP ·
              AVIF · BMP
            </div>

          </div>
        </>
      ) : (

        <div>

          {/* FILE CARD */}

          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap:
                "18px",
              padding:
                "16px",
              border:
                "1px solid rgba(255,255,255,0.18)",
              borderRadius:
                "14px",
              marginBottom:
                "20px",
              background:
                "rgba(255,255,255,0.035)",
            }}
          >

            <div
              style={{
                width:
                  "72px",
                height:
                  "72px",
                borderRadius:
                  "10px",
                overflow:
                  "hidden",
                background:
                  "rgba(255,255,255,0.06)",
                flexShrink: 0,
              }}
            >
              <img
                src={preview}
                alt={
                  file.name
                }
                style={{
                  width:
                    "100%",
                  height:
                    "100%",
                  objectFit:
                    "contain",
                }}
              />
            </div>

            <div
              style={{
                minWidth: 0,
                flex: 1,
              }}
            >

              <div
                style={{
                  fontWeight:
                    600,
                  marginBottom:
                    "5px",
                  color:
                    "#ffffff",
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
                  fontSize:
                    "13px",
                  color:
                    "rgba(255,255,255,0.55)",
                }}
              >
                {sourceFormat.toUpperCase()}
                {" · "}
                {formatFileSize(
                  file.size
                )}
              </div>

            </div>

            <div
              style={{
                padding:
                  "7px 11px",
                borderRadius:
                  "8px",
                background:
                  "rgba(255,255,255,0.10)",
                color:
                  "#ffffff",
                fontSize:
                  "12px",
                fontWeight:
                  700,
              }}
            >
              {sourceFormat.toUpperCase()}
            </div>

          </div>


          {/* LIVE PREVIEW */}

          <div
            style={{
              padding:
                "20px",
              border:
                "1px solid rgba(255,255,255,0.16)",
              borderRadius:
                "14px",
              background:
                "rgba(255,255,255,0.035)",
              marginBottom:
                "16px",
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
                  "14px",
              }}
            >

              <div>

                <div
                  style={{
                    fontSize:
                      "11px",
                    fontWeight:
                      700,
                    letterSpacing:
                      "0.1em",
                    color:
                      "rgba(255,255,255,0.55)",
                    marginBottom:
                      "5px",
                  }}
                >
                  LIVE PREVIEW
                </div>

                <div
                  style={{
                    fontSize:
                      "15px",
                    fontWeight:
                      600,
                  }}
                >
                  {formatDimensions(
                    width,
                    height
                  )}
                </div>

              </div>

              {previewLoading && (
                <div
                  style={{
                    fontSize:
                      "12px",
                    color:
                      "rgba(255,255,255,0.50)",
                  }}
                >
                  Updating...
                </div>
              )}

            </div>


            <div
              style={{
                width:
                  "100%",
                minHeight:
                  "260px",
                maxHeight:
                  "440px",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                overflow:
                  "hidden",
                borderRadius:
                  "10px",
                background:
                  "rgba(0,0,0,0.25)",
                position:
                  "relative",
              }}
            >

              {resizedPreview ? (
                <img
                  src={
                    resizedPreview
                  }
                  alt="Live resized preview"
                  style={{
                    maxWidth:
                      "100%",
                    maxHeight:
                      "400px",
                    objectFit:
                      "contain",
                    opacity:
                      previewLoading
                        ? 0.5
                        : 1,
                    transition:
                      "opacity 0.15s ease",
                  }}
                />
              ) : (
                <img
                  src={preview}
                  alt={
                    file.name
                  }
                  style={{
                    maxWidth:
                      "100%",
                    maxHeight:
                      "400px",
                    objectFit:
                      "contain",
                  }}
                />
              )}

            </div>

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                marginTop:
                  "12px",
                fontSize:
                  "12px",
                color:
                  "rgba(255,255,255,0.50)",
              }}
            >

              <span>
                Original:{" "}
                {formatDimensions(
                  originalWidth,
                  originalHeight
                )}
              </span>

              <span>
                New:{" "}
                {formatDimensions(
                  width,
                  height
                )}
              </span>

            </div>

          </div>


          {/* QUICK SCALE */}

          <div
            style={{
              padding:
                "18px",
              border:
                "1px solid rgba(255,255,255,0.16)",
              borderRadius:
                "14px",
              background:
                "rgba(255,255,255,0.035)",
              marginBottom:
                "16px",
            }}
          >

            <div
              style={{
                fontSize:
                  "11px",
                fontWeight:
                  700,
                letterSpacing:
                  "0.1em",
                color:
                  "rgba(255,255,255,0.55)",
                marginBottom:
                  "12px",
              }}
            >
              QUICK SCALE
            </div>

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(4, 1fr)",
                gap:
                  "8px",
              }}
            >

              {[25, 50, 75, 100].map(
                (percentage) => (
                  <button
                    key={
                      percentage
                    }
                    type="button"
                    onClick={() =>
                      applyScale(
                        percentage
                      )
                    }
                    style={{
                      padding:
                        "11px 8px",
                      border:
                        "1px solid rgba(255,255,255,0.15)",
                      borderRadius:
                        "9px",
                      background:
                        "rgba(255,255,255,0.045)",
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
                    {percentage}%
                  </button>
                )
              )}

            </div>

          </div>


          {/* DIMENSIONS */}

          <div
            style={{
              padding:
                "22px",
              border:
                "1px solid rgba(255,255,255,0.16)",
              borderRadius:
                "14px",
              background:
                "rgba(255,255,255,0.035)",
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
                  "18px",
              }}
            >

              <div>

                <div
                  style={{
                    fontSize:
                      "11px",
                    fontWeight:
                      700,
                    letterSpacing:
                      "0.1em",
                    color:
                      "rgba(255,255,255,0.55)",
                    marginBottom:
                      "5px",
                  }}
                >
                  DIMENSIONS
                </div>

                <div
                  style={{
                    fontSize:
                      "17px",
                    fontWeight:
                      600,
                  }}
                >
                  Set image size
                </div>

              </div>


              <button
                type="button"
                onClick={() =>
                  setLockRatio(
                    !lockRatio
                  )
                }
                style={{
                  border:
                    "1px solid rgba(255,255,255,0.20)",
                  background:
                    lockRatio
                      ? "rgba(255,255,255,0.12)"
                      : "rgba(255,255,255,0.04)",
                  color:
                    "#ffffff",
                  borderRadius:
                    "9px",
                  padding:
                    "8px 12px",
                  cursor:
                    "pointer",
                  fontSize:
                    "12px",
                  fontWeight:
                    600,
                }}
              >
                {lockRatio
                  ? "🔒 Ratio locked"
                  : "🔓 Ratio unlocked"}
              </button>

            </div>


            {/* WIDTH / HEIGHT */}

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap:
                  "12px",
              }}
            >

              <div>

                <label
                  style={{
                    display:
                      "block",
                    fontSize:
                      "12px",
                    color:
                      "rgba(255,255,255,0.55)",
                    marginBottom:
                      "7px",
                  }}
                >
                  Width
                </label>

                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    border:
                      "1px solid rgba(255,255,255,0.18)",
                    borderRadius:
                      "10px",
                    overflow:
                      "hidden",
                    background:
                      "rgba(0,0,0,0.15)",
                  }}
                >

                  <input
                    type="number"
                    min="1"
                    value={
                      width
                    }
                    onChange={(
                      event
                    ) =>
                      handleWidthChange(
                        event
                          .target
                          .value
                      )
                    }
                    style={{
                      width:
                        "100%",
                      padding:
                        "13px",
                      border:
                        "none",
                      outline:
                        "none",
                      background:
                        "transparent",
                      color:
                        "#ffffff",
                      fontSize:
                        "15px",
                    }}
                  />

                  <span
                    style={{
                      padding:
                        "0 12px",
                      color:
                        "rgba(255,255,255,0.40)",
                      fontSize:
                        "12px",
                    }}
                  >
                    px
                  </span>

                </div>

              </div>


              <div>

                <label
                  style={{
                    display:
                      "block",
                    fontSize:
                      "12px",
                    color:
                      "rgba(255,255,255,0.55)",
                    marginBottom:
                      "7px",
                  }}
                >
                  Height
                </label>

                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    border:
                      "1px solid rgba(255,255,255,0.18)",
                    borderRadius:
                      "10px",
                    overflow:
                      "hidden",
                    background:
                      "rgba(0,0,0,0.15)",
                  }}
                >

                  <input
                    type="number"
                    min="1"
                    value={
                      height
                    }
                    onChange={(
                      event
                    ) =>
                      handleHeightChange(
                        event
                          .target
                          .value
                      )
                    }
                    style={{
                      width:
                        "100%",
                      padding:
                        "13px",
                      border:
                        "none",
                      outline:
                        "none",
                      background:
                        "transparent",
                      color:
                        "#ffffff",
                      fontSize:
                        "15px",
                    }}
                  />

                  <span
                    style={{
                      padding:
                        "0 12px",
                      color:
                        "rgba(255,255,255,0.40)",
                      fontSize:
                        "12px",
                    }}
                  >
                    px
                  </span>

                </div>

              </div>

            </div>


            <div
              style={{
                marginTop:
                  "16px",
                fontSize:
                  "12px",
                color:
                  "rgba(255,255,255,0.50)",
              }}
            >
              Image area:{" "}
              <strong
                style={{
                  color:
                    "#ffffff",
                }}
              >
                {areaPercentage}%
              </strong>
              {" of original"}
            </div>

          </div>


          {/* OUTPUT */}

          <div
            style={{
              marginTop:
                "16px",
              padding:
                "22px",
              border:
                "1px solid rgba(255,255,255,0.16)",
              borderRadius:
                "14px",
              background:
                "rgba(255,255,255,0.035)",
            }}
          >

            <div
              style={{
                fontSize:
                  "11px",
                fontWeight:
                  700,
                letterSpacing:
                  "0.1em",
                color:
                  "rgba(255,255,255,0.55)",
                marginBottom:
                  "14px",
              }}
            >
              OUTPUT
            </div>


            <div
              style={{
                fontSize:
                  "13px",
                color:
                  "rgba(255,255,255,0.60)",
                marginBottom:
                  "9px",
              }}
            >
              Format
            </div>

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(3, 1fr)",
                gap:
                  "8px",
                marginBottom:
                  "20px",
              }}
            >

              {[
                "jpg",
                "png",
                "webp",
              ].map(
                (format) => (
                  <button
                    key={
                      format
                    }
                    type="button"
                    onClick={() =>
                      handleFormatChange(
                        format
                      )
                    }
                    style={{
                      padding:
                        "11px",
                      border:
                        outputFormat ===
                        format
                          ? "1px solid #ffffff"
                          : "1px solid rgba(255,255,255,0.15)",
                      borderRadius:
                        "9px",
                      background:
                        outputFormat ===
                        format
                          ? "rgba(255,255,255,0.12)"
                          : "rgba(255,255,255,0.04)",
                      color:
                        "#ffffff",
                      cursor:
                        "pointer",
                      fontSize:
                        "13px",
                      fontWeight:
                        700,
                    }}
                  >
                    {format.toUpperCase()}
                  </button>
                )
              )}

            </div>


            {/* QUALITY */}

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                marginBottom:
                  "10px",
              }}
            >

              <span
                style={{
                  fontSize:
                    "13px",
                  color:
                    "rgba(255,255,255,0.60)",
                }}
              >
                Quality
              </span>

              <strong
                style={{
                  fontSize:
                    "13px",
                  color:
                    "#ffffff",
                }}
              >
                {Math.round(
                  quality *
                    100
                )}
                %
              </strong>

            </div>

            <input
              type="range"
              min="0.1"
              max="1"
              step="0.01"
              value={
                quality
              }
              onChange={
                handleQualityChange
              }
              style={{
                width:
                  "100%",
                accentColor:
                  "#ffffff",
                cursor:
                  "pointer",
              }}
            />

          </div>


          {/* LIVE SIZE */}

          {resizedSize && (
            <div
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
                marginTop:
                  "14px",
                padding:
                  "14px 16px",
                borderRadius:
                  "11px",
                background:
                  "rgba(255,255,255,0.05)",
                border:
                  "1px solid rgba(255,255,255,0.10)",
              }}
            >

              <span
                style={{
                  fontSize:
                    "13px",
                  color:
                    "rgba(255,255,255,0.55)",
                }}
              >
                Estimated output size
              </span>

              <strong
                style={{
                  fontSize:
                    "14px",
                  color:
                    "#ffffff",
                }}
              >
                {formatFileSize(
                  resizedSize
                )}
              </strong>

            </div>
          )}


          {/* RESIZE */}

          <button
            type="button"
            onClick={
              handleResize
            }
            disabled={
              resizing
            }
            style={{
              width:
                "100%",
              minHeight:
                "52px",
              marginTop:
                "20px",
              border:
                "1px solid rgba(255,255,255,0.80)",
              borderRadius:
                "12px",
              background:
                "#ffffff",
              color:
                "#111111",
              cursor:
                resizing
                  ? "wait"
                  : "pointer",
              fontSize:
                "14px",
              fontWeight:
                700,
              opacity:
                resizing
                  ? 0.6
                  : 1,
            }}
          >
            {resizing
              ? "Resizing..."
              : "Resize Image"}
          </button>


          {/* DOWNLOAD */}

          {resizedBlob && (
            <button
              type="button"
              onClick={
                handleDownload
              }
              style={{
                width:
                  "100%",
                minHeight:
                  "52px",
                marginTop:
                  "10px",
                border:
                  "1px solid rgba(255,255,255,0.25)",
                borderRadius:
                  "12px",
                background:
                  "rgba(255,255,255,0.08)",
                color:
                  "#ffffff",
                cursor:
                  "pointer",
                fontSize:
                  "14px",
                fontWeight:
                  700,
              }}
            >
              Download Resized Image
            </button>
          )}


          {/* ERROR */}

          {error && (
            <div
              style={{
                marginTop:
                  "14px",
                padding:
                  "12px 14px",
                borderRadius:
                  "10px",
                background:
                  "rgba(220,70,70,0.10)",
                border:
                  "1px solid rgba(255,100,100,0.20)",
                color:
                  "#ffffff",
                fontSize:
                  "13px",
              }}
            >
              {error}
            </div>
          )}


          {/* SUCCESS */}

          {success && (
            <div
              style={{
                marginTop:
                  "14px",
                padding:
                  "12px 14px",
                borderRadius:
                  "10px",
                background:
                  "rgba(70,180,110,0.10)",
                border:
                  "1px solid rgba(100,220,140,0.20)",
                color:
                  "#ffffff",
                fontSize:
                  "13px",
              }}
            >
              ✓ {success}
            </div>
          )}


          {/* PRIVACY */}

          <div
            style={{
              marginTop:
                "24px",
              textAlign:
                "center",
              fontSize:
                "12px",
              color:
                "rgba(255,255,255,0.50)",
            }}
          >
            ● Your image is
            processed locally
            in your browser.
            Nothing is uploaded.
          </div>

        </div>
      )}

    </div>
  );
}