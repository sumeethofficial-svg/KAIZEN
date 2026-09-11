// src/tools/images/CompressImage.jsx

import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  compressImage,
  detectImageFormat,
  downloadCompressedImage,
  estimateCompressedSize,
  formatFileSize,
  getCompressionPercentage,
} from "../../services/image/compressImage";

export default function CompressImage() {
  const fileInputRef =
    useRef(null);

  const estimateTimerRef =
    useRef(null);

  const [file, setFile] =
    useState(null);

  const [preview, setPreview] =
    useState("");

  const [sourceFormat, setSourceFormat] =
    useState("");

  const [quality, setQuality] =
    useState(0.5);

  const [estimatedSize, setEstimatedSize] =
    useState(null);

  const [compressedSize, setCompressedSize] =
    useState(null);

  const [compressedBlob, setCompressedBlob] =
    useState(null);

  const [outputFormat, setOutputFormat] =
    useState("");

  const [dragging, setDragging] =
    useState(false);

  const [estimating, setEstimating] =
    useState(false);

  const [compressing, setCompressing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  /**
   * Clean up preview.
   */
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(
          preview
        );
      }

      if (
        estimateTimerRef.current
      ) {
        clearTimeout(
          estimateTimerRef.current
        );
      }
    };
  }, [preview]);


  /**
   * Calculate live size.
   */
  const updateEstimate = async (
    selectedFile,
    selectedQuality
  ) => {
    if (!selectedFile) {
      return;
    }

    setEstimating(true);

    try {
      const result =
        await estimateCompressedSize(
          selectedFile,
          selectedQuality
        );

      setEstimatedSize(
        result.size
      );

      setOutputFormat(
        result.outputFormat
      );
    } catch (estimateError) {
      console.error(
        estimateError
      );

      setEstimatedSize(null);
    } finally {
      setEstimating(false);
    }
  };


  /**
   * Handle selected image.
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

    setFile(
      selectedFile
    );

    setSourceFormat(
      detected
    );

    setPreview(
      URL.createObjectURL(
        selectedFile
      )
    );

    setEstimatedSize(null);

    setCompressedSize(null);

    setCompressedBlob(null);

    setOutputFormat("");

    setError("");

    setSuccess("");

    /*
     * Generate initial estimate.
     */
    updateEstimate(
      selectedFile,
      quality
    );
  };


  /**
   * File picker.
   */
  const handleInputChange = (
    event
  ) => {
    handleFile(
      event.target.files?.[0]
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


  /**
   * Open file picker.
   */
  const openFilePicker = () => {
    fileInputRef.current?.click();
  };


  /**
   * Quality slider.
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

    setCompressedSize(
      null
    );

    setCompressedBlob(
      null
    );

    setSuccess("");

    setError("");

    if (
      estimateTimerRef.current
    ) {
      clearTimeout(
        estimateTimerRef.current
      );
    }

    /*
     * Small debounce so we don't
     * encode the image hundreds
     * of times while dragging.
     */
    estimateTimerRef.current =
      setTimeout(() => {
        updateEstimate(
          file,
          newQuality
        );
      }, 120);
  };


  /**
   * Compress image.
   */
  const handleCompress = async () => {
    if (!file) {
      setError(
        "Please select an image first."
      );

      return;
    }

    setCompressing(true);

    setError("");

    setSuccess("");

    try {
      const result =
        await compressImage(
          file,
          quality
        );

      setCompressedBlob(
        result.blob
      );

      setCompressedSize(
        result.blob.size
      );

      setOutputFormat(
        result.outputFormat
      );

      const saved =
        getCompressionPercentage(
          file.size,
          result.blob.size
        );

      if (saved > 0) {
        setSuccess(
          `${saved}% smaller • ${formatFileSize(
            result.blob.size
          )}`
        );
      } else {
        setSuccess(
          "Compression completed."
        );
      }
    } catch (compressionError) {
      console.error(
        compressionError
      );

      setError(
        compressionError?.message ||
          "Image compression failed."
      );
    } finally {
      setCompressing(false);
    }
  };


  /**
   * Download compressed image.
   */
  const handleDownload = () => {
    if (
      !compressedBlob ||
      !file ||
      !outputFormat
    ) {
      return;
    }

    downloadCompressedImage(
      compressedBlob,
      file.name,
      outputFormat
    );
  };


  /**
   * Reset.
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

    setQuality(0.5);

    setEstimatedSize(null);

    setCompressedSize(null);

    setCompressedBlob(null);

    setOutputFormat("");

    setDragging(false);

    setEstimating(false);

    setCompressing(false);

    setError("");

    setSuccess("");

    if (fileInputRef.current) {
      fileInputRef.current.value =
        "";
    }
  };


  const displayedSize =
    compressedSize ||
    estimatedSize;

  const displayedSaved =
    file &&
    displayedSize
      ? getCompressionPercentage(
          file.size,
          displayedSize
        )
      : 0;


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
            Compress Image
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
            Reduce image file
            size with controlled
            quality.
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
              transition:
                "all 0.2s ease",
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
              ↓
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

        /* WORKSPACE */

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


          {/* LIVE SIZE */}

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap:
                "10px",
              marginBottom:
                "16px",
            }}
          >

            <div
              style={{
                padding:
                  "18px",
                borderRadius:
                  "14px",
                background:
                  "rgba(255,255,255,0.045)",
                border:
                  "1px solid rgba(255,255,255,0.13)",
              }}
            >

              <div
                style={{
                  fontSize:
                    "11px",
                  fontWeight:
                    700,
                  letterSpacing:
                    "0.08em",
                  color:
                    "rgba(255,255,255,0.45)",
                  marginBottom:
                    "8px",
                }}
              >
                ORIGINAL SIZE
              </div>

              <div
                style={{
                  fontSize:
                    "22px",
                  fontWeight:
                    700,
                  color:
                    "#ffffff",
                }}
              >
                {formatFileSize(
                  file.size
                )}
              </div>

            </div>


            <div
              style={{
                padding:
                  "18px",
                borderRadius:
                  "14px",
                background:
                  "rgba(255,255,255,0.045)",
                border:
                  "1px solid rgba(255,255,255,0.13)",
              }}
            >

              <div
                style={{
                  fontSize:
                    "11px",
                  fontWeight:
                    700,
                  letterSpacing:
                    "0.08em",
                  color:
                    "rgba(255,255,255,0.45)",
                  marginBottom:
                    "8px",
                }}
              >
                {compressedSize
                  ? "COMPRESSED SIZE"
                  : "ESTIMATED SIZE"}
              </div>

              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap:
                    "8px",
                }}
              >

                <div
                  style={{
                    fontSize:
                      "22px",
                    fontWeight:
                      700,
                    color:
                      "#ffffff",
                  }}
                >
                  {estimating
                    ? "Calculating..."
                    : displayedSize
                      ? formatFileSize(
                          displayedSize
                        )
                      : "—"}
                </div>

              </div>

            </div>

          </div>


          {/* SAVINGS */}

          {displayedSize &&
            !estimating && (
              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "space-between",
                  padding:
                    "13px 16px",
                  marginBottom:
                    "16px",
                  borderRadius:
                    "11px",
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
                    color:
                      "rgba(255,255,255,0.60)",
                  }}
                >
                  {compressedSize
                    ? "File size reduced"
                    : "Estimated reduction"}
                </span>

                <strong
                  style={{
                    fontSize:
                      "14px",
                    color:
                      "#ffffff",
                  }}
                >
                  {displayedSaved}%
                  {" smaller"}
                </strong>

              </div>
            )}


          {/* QUALITY */}

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
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
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
                  COMPRESSION QUALITY
                </div>

                <div
                  style={{
                    fontSize:
                      "17px",
                    fontWeight:
                      600,
                    color:
                      "#ffffff",
                  }}
                >
                  Choose quality
                </div>

              </div>

              <div
                style={{
                  minWidth:
                    "52px",
                  padding:
                    "7px 10px",
                  borderRadius:
                    "8px",
                  textAlign:
                    "center",
                  background:
                    "rgba(255,255,255,0.10)",
                  color:
                    "#ffffff",
                  fontSize:
                    "13px",
                  fontWeight:
                    700,
                }}
              >
                {Math.round(
                  quality * 100
                )}
                %
              </div>

            </div>


            {/* SLIDER */}

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


            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                marginTop:
                  "8px",
                fontSize:
                  "11px",
                color:
                  "rgba(255,255,255,0.45)",
              }}
            >
              <span>
                Smaller file
              </span>

              <span>
                Better quality
              </span>
            </div>

          </div>


          {/* OUTPUT FORMAT INFO */}

          {outputFormat && (
            <div
              style={{
                marginTop:
                  "14px",
                textAlign:
                  "center",
                fontSize:
                  "12px",
                color:
                  "rgba(255,255,255,0.50)",
              }}
            >
              Output format:{" "}
              <strong
                style={{
                  color:
                    "#ffffff",
                }}
              >
                {outputFormat.toUpperCase()}
              </strong>

              {sourceFormat ===
                "png" && (
                <span>
                  {" "}
                  • PNG is converted
                  to JPG for
                  effective compression
                </span>
              )}
            </div>
          )}


          {/* COMPRESS */}

          <button
            type="button"
            onClick={
              handleCompress
            }
            disabled={
              compressing ||
              estimating
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
                compressing ||
                estimating
                  ? "wait"
                  : "pointer",
              fontSize:
                "14px",
              fontWeight:
                700,
              opacity:
                compressing ||
                estimating
                  ? 0.6
                  : 1,
            }}
          >
            {compressing
              ? "Compressing..."
              : "Compress Image"}
          </button>


          {/* DOWNLOAD */}

          {compressedBlob && (
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
              Download Compressed Image
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