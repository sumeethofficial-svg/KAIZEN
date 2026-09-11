// src/tools/images/ConvertImage.jsx

import React, {
  useRef,
  useState,
} from "react";

import {
  IMAGE_FORMATS,
  convertImage,
  detectImageFormat,
  downloadConvertedImage,
  formatFileSize,
} from "../../services/image/convertImage";

export default function ConvertImage() {
  const fileInputRef =
    useRef(null);

  const [file, setFile] =
    useState(null);

  const [preview, setPreview] =
    useState("");

  const [sourceFormat, setSourceFormat] =
    useState("");

  const [targetFormat, setTargetFormat] =
    useState("png");

  const [quality, setQuality] =
    useState(0.9);

  const [dragging, setDragging] =
    useState(false);

  const [converting, setConverting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  /**
   * Handle image selection.
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

    if (preview) {
      URL.revokeObjectURL(
        preview
      );
    }

    const detected =
      detectImageFormat(
        selectedFile
      );

    setFile(selectedFile);

    setSourceFormat(
      detected
    );

    setPreview(
      URL.createObjectURL(
        selectedFile
      )
    );

    const firstAvailable =
      IMAGE_FORMATS.find(
        (format) =>
          format.id !== detected
      );

    setTargetFormat(
      firstAvailable
        ? firstAvailable.id
        : "png"
    );

    setError("");
    setSuccess("");
  };

  /**
   * File picker.
   */
  const handleInputChange = (
    event
  ) => {
    const selectedFile =
      event.target.files?.[0];

    handleFile(
      selectedFile
    );
  };

  /**
   * Drag over.
   */
  const handleDragOver = (
    event
  ) => {
    event.preventDefault();

    setDragging(true);
  };

  /**
   * Drag leave.
   */
  const handleDragLeave = () => {
    setDragging(false);
  };

  /**
   * Drop image.
   */
  const handleDrop = (
    event
  ) => {
    event.preventDefault();

    setDragging(false);

    const droppedFile =
      event.dataTransfer.files?.[0];

    handleFile(
      droppedFile
    );
  };

  /**
   * Open file browser.
   */
  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  /**
   * Convert image.
   */
  const handleConvert = async () => {
    if (!file) {
      setError(
        "Please select an image first."
      );

      return;
    }

    if (
      targetFormat ===
      sourceFormat
    ) {
      setError(
        "Please select a different format."
      );

      return;
    }

    setConverting(true);
    setError("");
    setSuccess("");

    try {
      const format =
        IMAGE_FORMATS.find(
          (item) =>
            item.id ===
            targetFormat
        );

      if (!format) {
        throw new Error(
          "Invalid output format."
        );
      }

      const blob =
        await convertImage(
          file,
          format.mime,
          quality
        );

      downloadConvertedImage(
        blob,
        file.name,
        targetFormat
      );

      setSuccess(
        `${sourceFormat.toUpperCase()} → ${targetFormat.toUpperCase()} • ${formatFileSize(
          blob.size
        )}`
      );
    } catch (conversionError) {
      console.error(
        conversionError
      );

      setError(
        conversionError?.message ||
          "Image conversion failed."
      );
    } finally {
      setConverting(false);
    }
  };

  /**
   * Reset converter.
   */
  const handleReset = () => {
    if (preview) {
      URL.revokeObjectURL(
        preview
      );
    }

    setFile(null);
    setPreview("");
    setSourceFormat("");
    setTargetFormat("png");
    setQuality(0.9);
    setDragging(false);
    setError("");
    setSuccess("");

    if (fileInputRef.current) {
      fileInputRef.current.value =
        "";
    }
  };

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
          alignItems: "flex-start",
          justifyContent:
            "space-between",
          gap: "20px",
          marginBottom: "28px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing:
                "0.12em",
              color:
                "rgba(255,255,255,0.65)",
              marginBottom: "8px",
            }}
          >
            IMAGE TOOL
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "32px",
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            Convert Image
          </h1>

          <p
            style={{
              margin:
                "8px 0 0",
              color:
                "rgba(255,255,255,0.60)",
              fontSize: "15px",
            }}
          >
            Convert your image
            to another format
            directly in your
            browser.
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
              color: "#ffffff",
              borderRadius: "10px",
              padding:
                "9px 16px",
              cursor: "pointer",
              fontSize: "14px",
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
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={
              handleInputChange
            }
            style={{
              display: "none",
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
              border: dragging
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
              transition:
                "all 0.2s ease",
              background:
                dragging
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(255,255,255,0.025)",
            }}
          >
            <div
              style={{
                width: "58px",
                height: "58px",
                margin:
                  "0 auto 18px",
                borderRadius:
                  "16px",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                fontSize: "28px",
                color: "#ffffff",
                background:
                  "rgba(255,255,255,0.10)",
              }}
            >
              ↑
            </div>

            <h2
              style={{
                margin:
                  "0 0 8px",
                fontSize: "21px",
                color: "#ffffff",
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
                fontSize: "12px",
                color:
                  "rgba(255,255,255,0.45)",
              }}
            >
              PNG · JPG · WebP ·
              AVIF · BMP · SVG ·
              ICO · TIFF
            </div>
          </div>
        </>
      ) : (

        /* WORKSPACE */

        <div>

          {/* FILE INFORMATION */}

          <div
            style={{
              display: "flex",
              alignItems:
                "center",
              gap: "18px",
              padding:
                "16px",
              border:
                "1px solid rgba(255,255,255,0.18)",
              borderRadius:
                "14px",
              marginBottom:
                "26px",
              background:
                "rgba(255,255,255,0.035)",
            }}
          >
            <div
              style={{
                width: "72px",
                height: "72px",
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
                  width: "100%",
                  height: "100%",
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
                  fontWeight: 600,
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


          {/* FORMAT HEADER */}

          <div
            style={{
              display: "flex",
              alignItems:
                "flex-end",
              justifyContent:
                "space-between",
              marginBottom:
                "14px",
              gap: "15px",
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
                CONVERT TO
              </div>

              <div
                style={{
                  fontSize:
                    "16px",
                  fontWeight:
                    600,
                  color:
                    "#ffffff",
                }}
              >
                Choose output
                format
              </div>
            </div>

            <div
              style={{
                fontSize:
                  "12px",
                color:
                  "rgba(255,255,255,0.50)",
              }}
            >
              {
                IMAGE_FORMATS.length -
                1
              }{" "}
              formats available
            </div>
          </div>


          {/* FORMAT GRID */}

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "10px",
            }}
          >
            {IMAGE_FORMATS.map(
              (format) => {
                const isSource =
                  format.id ===
                  sourceFormat;

                const isSelected =
                  format.id ===
                  targetFormat;

                return (
                  <button
                    key={
                      format.id
                    }
                    type="button"
                    disabled={
                      isSource
                    }
                    onClick={() => {
                      if (
                        isSource
                      ) {
                        return;
                      }

                      setTargetFormat(
                        format.id
                      );

                      setError("");
                      setSuccess("");
                    }}
                    style={{
                      position:
                        "relative",
                      minHeight:
                        "78px",
                      padding:
                        "14px",
                      borderRadius:
                        "12px",

                      border:
                        isSelected
                          ? "2px solid #ffffff"
                          : "1px solid rgba(255,255,255,0.22)",

                      background:
                        isSelected
                          ? "rgba(255,255,255,0.12)"
                          : "rgba(255,255,255,0.035)",

                      color:
                        "#ffffff",

                      opacity:
                        isSource
                          ? 0.35
                          : 1,

                      cursor:
                        isSource
                          ? "not-allowed"
                          : "pointer",

                      textAlign:
                        "left",

                      transition:
                        "all 0.15s ease",
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
                          "8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize:
                            "15px",
                          fontWeight:
                            700,
                          color:
                            "#ffffff",
                        }}
                      >
                        {
                          format.name
                        }
                      </span>

                      {isSelected &&
                        !isSource && (
                          <span
                            style={{
                              fontSize:
                                "14px",
                              fontWeight:
                                700,
                              color:
                                "#ffffff",
                            }}
                          >
                            ✓
                          </span>
                        )}
                    </div>

                    <span
                      style={{
                        fontSize:
                          "11px",
                        color:
                          "rgba(255,255,255,0.60)",
                      }}
                    >
                      {isSource
                        ? "Original format"
                        : `Convert to ${format.name}`}
                    </span>
                  </button>
                );
              }
            )}
          </div>


          {/* QUALITY */}

          {(targetFormat ===
            "jpg" ||
            targetFormat ===
              "webp" ||
            targetFormat ===
              "avif") && (
            <div
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                gap: "15px",
                marginTop:
                  "20px",
                padding:
                  "14px 16px",
                borderRadius:
                  "12px",
                background:
                  "rgba(255,255,255,0.06)",
                border:
                  "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <span
                style={{
                  fontSize:
                    "13px",
                  fontWeight:
                    600,
                  color:
                    "#ffffff",
                }}
              >
                Quality
              </span>

              <input
                type="range"
                min="0.4"
                max="1"
                step="0.01"
                value={
                  quality
                }
                onChange={(
                  event
                ) =>
                  setQuality(
                    Number(
                      event
                        .target
                        .value
                    )
                  )
                }
                style={{
                  flex: 1,
                  accentColor:
                    "#ffffff",
                }}
              />

              <span
                style={{
                  minWidth:
                    "42px",
                  textAlign:
                    "right",
                  fontSize:
                    "13px",
                  fontWeight:
                    600,
                  color:
                    "#ffffff",
                }}
              >
                {Math.round(
                  quality *
                    100
                )}
                %
              </span>
            </div>
          )}


          {/* CONVERT BUTTON */}

          <button
            type="button"
            onClick={
              handleConvert
            }
            disabled={
              converting
            }
            style={{
              width: "100%",
              marginTop:
                "20px",
              minHeight:
                "52px",

              border:
                "1px solid rgba(255,255,255,0.80)",

              borderRadius:
                "12px",

              background:
                "#ffffff",

              color:
                "#111111",

              cursor:
                converting
                  ? "wait"
                  : "pointer",

              fontSize:
                "14px",

              fontWeight:
                700,

              opacity:
                converting
                  ? 0.6
                  : 1,

              transition:
                "all 0.2s ease",
            }}
          >
            {converting
              ? "Converting..."
              : `Convert to ${targetFormat.toUpperCase()}`}
          </button>


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