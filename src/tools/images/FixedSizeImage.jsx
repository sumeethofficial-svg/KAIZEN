// src/tools/images/FixedSizeImage.jsx

import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  compressToFixedSize,
  detectImageFormat,
  downloadFixedSizeImage,
  formatFileSize,
  getCompressionPercentage,
} from "../../services/image/fixedSizeImage";

export default function FixedSizeImage() {
  const fileInputRef =
    useRef(null);

  const originalPreviewUrlRef =
    useRef("");

  const resultPreviewUrlRef =
    useRef("");

  const estimateTimerRef =
    useRef(null);

  const [file, setFile] =
    useState(null);

  const [preview, setPreview] =
    useState("");

  const [sourceFormat, setSourceFormat] =
    useState("");

  const [targetValue, setTargetValue] =
    useState(500);

  const [targetUnit, setTargetUnit] =
    useState("KB");

  const [result, setResult] =
    useState(null);

  const [resultPreview, setResultPreview] =
    useState("");

  const [processing, setProcessing] =
    useState(false);

  const [dragging, setDragging] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  /*
   * Convert target input to bytes.
   */
  const getTargetBytes = () => {
    const value =
      Number(targetValue);

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      return 0;
    }

    if (
      targetUnit === "MB"
    ) {
      return (
        value *
        1024 *
        1024
      );
    }

    if (
      targetUnit === "KB"
    ) {
      return (
        value *
        1024
      );
    }

    return value;
  };


  /*
   * Cleanup URLs.
   */
  useEffect(() => {
    return () => {
      if (
        estimateTimerRef.current
      ) {
        clearTimeout(
          estimateTimerRef.current
        );
      }

      if (
        originalPreviewUrlRef.current
      ) {
        URL.revokeObjectURL(
          originalPreviewUrlRef.current
        );
      }

      if (
        resultPreviewUrlRef.current
      ) {
        URL.revokeObjectURL(
          resultPreviewUrlRef.current
        );
      }
    };
  }, []);


  /*
   * Generate actual target-size
   * preview.
   */
  const generatePreview = async (
    selectedFile,
    bytes
  ) => {
    if (
      !selectedFile ||
      !bytes
    ) {
      return;
    }

    setProcessing(true);

    setError("");

    try {
      const output =
        await compressToFixedSize(
          selectedFile,
          bytes
        );

      if (
        resultPreviewUrlRef.current
      ) {
        URL.revokeObjectURL(
          resultPreviewUrlRef.current
        );
      }

      const previewUrl =
        URL.createObjectURL(
          output.blob
        );

      resultPreviewUrlRef.current =
        previewUrl;

      setResultPreview(
        previewUrl
      );

      setResult(
        output
      );
    } catch (previewError) {
      console.error(
        previewError
      );

      setError(
        previewError?.message ||
          "Could not calculate the target size."
      );
    } finally {
      setProcessing(false);
    }
  };


  /*
   * Handle file.
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

    if (
      originalPreviewUrlRef.current
    ) {
      URL.revokeObjectURL(
        originalPreviewUrlRef.current
      );
    }

    if (
      resultPreviewUrlRef.current
    ) {
      URL.revokeObjectURL(
        resultPreviewUrlRef.current
      );
    }

    const url =
      URL.createObjectURL(
        selectedFile
      );

    originalPreviewUrlRef.current =
      url;

    setFile(
      selectedFile
    );

    setPreview(
      url
    );

    setSourceFormat(
      detectImageFormat(
        selectedFile
      )
    );

    setResult(null);

    setResultPreview("");

    setError("");

    setSuccess("");

    /*
     * Generate initial
     * 500 KB estimate.
     */
    generatePreview(
      selectedFile,
      getTargetBytes()
    );
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
   * Change target size.
   */
  const handleTargetChange = (
    value
  ) => {
    const numericValue =
      value === ""
        ? ""
        : Math.max(
            1,
            Number(value) || 1
          );

    setTargetValue(
      numericValue
    );

    setResult(null);

    setSuccess("");

    if (
      estimateTimerRef.current
    ) {
      clearTimeout(
        estimateTimerRef.current
      );
    }

    if (
      numericValue &&
      file
    ) {
      estimateTimerRef.current =
        setTimeout(() => {
          generatePreview(
            file,
            targetUnit ===
              "MB"
              ? numericValue *
                  1024 *
                  1024
              : numericValue *
                  1024
          );
        }, 250);
    }
  };


  /*
   * Change unit.
   */
  const handleUnitChange = (
    event
  ) => {
    const newUnit =
      event.target.value;

    setTargetUnit(
      newUnit
    );

    setResult(null);

    setSuccess("");

    if (
      file &&
      targetValue
    ) {
      let bytes =
        Number(
          targetValue
        ) * 1024;

      if (
        newUnit ===
        "MB"
      ) {
        bytes =
          Number(
            targetValue
          ) *
          1024 *
          1024;
      }

      generatePreview(
        file,
        bytes
      );
    }
  };


  /*
   * Final operation.
   */
  const handleCompress = async () => {
    if (!file) {
      setError(
        "Please select an image first."
      );

      return;
    }

    const targetBytes =
      getTargetBytes();

    if (!targetBytes) {
      setError(
        "Please enter a valid target size."
      );

      return;
    }

    setProcessing(true);

    setError("");

    setSuccess("");

    try {
      const output =
        await compressToFixedSize(
          file,
          targetBytes
        );

      if (
        resultPreviewUrlRef.current
      ) {
        URL.revokeObjectURL(
          resultPreviewUrlRef.current
        );
      }

      const previewUrl =
        URL.createObjectURL(
          output.blob
        );

      resultPreviewUrlRef.current =
        previewUrl;

      setResultPreview(
        previewUrl
      );

      setResult(
        output
      );

      setSuccess(
        `Optimized to ${formatFileSize(
          output.blob.size
        )}`
      );
    } catch (compressionError) {
      console.error(
        compressionError
      );

      setError(
        compressionError?.message ||
          "Fixed-size compression failed."
      );
    } finally {
      setProcessing(false);
    }
  };


  /*
   * Download.
   */
  const handleDownload = () => {
    if (
      !result?.blob ||
      !file
    ) {
      return;
    }

    downloadFixedSizeImage(
      result.blob,
      file.name,
      result.format
    );
  };


  /*
   * Reset.
   */
  const handleReset = () => {
    if (
      estimateTimerRef.current
    ) {
      clearTimeout(
        estimateTimerRef.current
      );
    }

    if (
      originalPreviewUrlRef.current
    ) {
      URL.revokeObjectURL(
        originalPreviewUrlRef.current
      );

      originalPreviewUrlRef.current =
        "";
    }

    if (
      resultPreviewUrlRef.current
    ) {
      URL.revokeObjectURL(
        resultPreviewUrlRef.current
      );

      resultPreviewUrlRef.current =
        "";
    }

    setFile(null);

    setPreview("");

    setSourceFormat("");

    setTargetValue(500);

    setTargetUnit("KB");

    setResult(null);

    setResultPreview("");

    setProcessing(false);

    setDragging(false);

    setError("");

    setSuccess("");

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  };


  const savedPercentage =
    file &&
    result
      ? getCompressionPercentage(
          file.size,
          result.blob.size
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
            Fixed Size
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
            Compress an image
            toward a target file
            size.
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
              AVIF
            </div>

          </div>
        </>
      ) : (

        <div>

          {/* ORIGINAL / RESULT */}

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap:
                "12px",
              marginBottom:
                "16px",
            }}
          >

            {/* ORIGINAL */}

            <div
              style={{
                padding:
                  "16px",
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
                    "rgba(255,255,255,0.50)",
                  marginBottom:
                    "12px",
                }}
              >
                ORIGINAL
              </div>

              <div
                style={{
                  height:
                    "170px",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  borderRadius:
                    "10px",
                  overflow:
                    "hidden",
                  background:
                    "rgba(0,0,0,0.20)",
                }}
              >

                <img
                  src={preview}
                  alt={
                    file.name
                  }
                  style={{
                    maxWidth:
                      "100%",
                    maxHeight:
                      "160px",
                    objectFit:
                      "contain",
                  }}
                />

              </div>

              <div
                style={{
                  marginTop:
                    "12px",
                }}
              >

                <div
                  style={{
                    fontSize:
                      "14px",
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
                    marginTop:
                      "5px",
                    fontSize:
                      "12px",
                    color:
                      "rgba(255,255,255,0.50)",
                  }}
                >
                  {sourceFormat.toUpperCase()}
                  {" · "}
                  {formatFileSize(
                    file.size
                  )}
                </div>

              </div>

            </div>


            {/* RESULT */}

            <div
              style={{
                padding:
                  "16px",
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
                    "rgba(255,255,255,0.50)",
                  marginBottom:
                    "12px",
                }}
              >
                TARGET PREVIEW
              </div>

              <div
                style={{
                  height:
                    "170px",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  borderRadius:
                    "10px",
                  overflow:
                    "hidden",
                  background:
                    "rgba(0,0,0,0.20)",
                  position:
                    "relative",
                }}
              >

                {resultPreview ? (
                  <img
                    src={
                      resultPreview
                    }
                    alt="Target size preview"
                    style={{
                      maxWidth:
                        "100%",
                      maxHeight:
                        "160px",
                      objectFit:
                        "contain",
                      opacity:
                        processing
                          ? 0.45
                          : 1,
                    }}
                  />
                ) : (
                  <span
                    style={{
                      fontSize:
                        "13px",
                      color:
                        "rgba(255,255,255,0.40)",
                    }}
                  >
                    Calculating...
                  </span>
                )}

                {processing && (
                  <div
                    style={{
                      position:
                        "absolute",
                      fontSize:
                        "12px",
                      color:
                        "#ffffff",
                      background:
                        "rgba(0,0,0,0.55)",
                      padding:
                        "7px 11px",
                      borderRadius:
                        "8px",
                    }}
                  >
                    Optimizing...
                  </div>
                )}

              </div>

              <div
                style={{
                  marginTop:
                    "12px",
                  fontSize:
                    "12px",
                  color:
                    "rgba(255,255,255,0.50)",
                }}
              >
                {result
                  ? `${result.width} × ${result.height} · ${result.format.toUpperCase()}`
                  : "Finding optimal output..."}
              </div>

            </div>

          </div>


          {/* TARGET SIZE */}

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
                fontSize:
                  "11px",
                fontWeight:
                  700,
                letterSpacing:
                  "0.1em",
                color:
                  "rgba(255,255,255,0.55)",
                marginBottom:
                  "8px",
              }}
            >
              TARGET FILE SIZE
            </div>

            <div
              style={{
                fontSize:
                  "17px",
                fontWeight:
                  600,
                marginBottom:
                  "16px",
              }}
            >
              Choose maximum file size
            </div>


            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "1fr 120px",
                gap:
                  "10px",
              }}
            >

              <input
                type="number"
                min="1"
                value={
                  targetValue
                }
                onChange={(
                  event
                ) =>
                  handleTargetChange(
                    event.target.value
                  )
                }
                style={{
                  width:
                    "100%",
                  boxSizing:
                    "border-box",
                  padding:
                    "14px",
                  border:
                    "1px solid rgba(255,255,255,0.18)",
                  borderRadius:
                    "10px",
                  outline:
                    "none",
                  background:
                    "rgba(0,0,0,0.20)",
                  color:
                    "#ffffff",
                  fontSize:
                    "16px",
                }}
              />

              <select
                value={
                  targetUnit
                }
                onChange={
                  handleUnitChange
                }
                style={{
                  padding:
                    "14px",
                  border:
                    "1px solid rgba(255,255,255,0.18)",
                  borderRadius:
                    "10px",
                  outline:
                    "none",
                  background:
                    "#171717",
                  color:
                    "#ffffff",
                  fontSize:
                    "14px",
                  cursor:
                    "pointer",
                }}
              >

                <option value="KB">
                  KB
                </option>

                <option value="MB">
                  MB
                </option>

              </select>

            </div>


            {/* QUICK TARGETS */}

            <div
              style={{
                display:
                  "flex",
                gap:
                  "8px",
                flexWrap:
                  "wrap",
                marginTop:
                  "14px",
              }}
            >

              {[
                ["100", "KB"],
                ["250", "KB"],
                ["500", "KB"],
                ["1", "MB"],
                ["2", "MB"],
              ].map(
                ([value, unit]) => (
                  <button
                    key={`${value}-${unit}`}
                    type="button"
                    onClick={() => {
                      setTargetValue(
                        Number(
                          value
                        )
                      );

                      setTargetUnit(
                        unit
                      );

                      if (
                        file
                      ) {
                        const bytes =
                          unit ===
                          "MB"
                            ? Number(
                                value
                              ) *
                              1024 *
                              1024
                            : Number(
                                value
                              ) *
                              1024;

                        generatePreview(
                          file,
                          bytes
                        );
                      }
                    }}
                    style={{
                      padding:
                        "8px 12px",
                      border:
                        "1px solid rgba(255,255,255,0.15)",
                      borderRadius:
                        "8px",
                      background:
                        "rgba(255,255,255,0.045)",
                      color:
                        "#ffffff",
                      cursor:
                        "pointer",
                      fontSize:
                        "12px",
                    }}
                  >
                    {value}{" "}
                    {unit}
                  </button>
                )
              )}

            </div>

          </div>


          {/* RESULT INFO */}

          {result && (
            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(3, 1fr)",
                gap:
                  "10px",
                marginTop:
                  "16px",
              }}
            >

              <div
                style={{
                  padding:
                    "16px",
                  borderRadius:
                    "12px",
                  background:
                    "rgba(255,255,255,0.045)",
                  border:
                    "1px solid rgba(255,255,255,0.12)",
                }}
              >

                <div
                  style={{
                    fontSize:
                      "11px",
                    color:
                      "rgba(255,255,255,0.45)",
                    marginBottom:
                      "6px",
                  }}
                >
                  TARGET
                </div>

                <div
                  style={{
                    fontSize:
                      "16px",
                    fontWeight:
                      700,
                  }}
                >
                  {targetValue}{" "}
                  {targetUnit}
                </div>

              </div>


              <div
                style={{
                  padding:
                    "16px",
                  borderRadius:
                    "12px",
                  background:
                    "rgba(255,255,255,0.045)",
                  border:
                    "1px solid rgba(255,255,255,0.12)",
                }}
              >

                <div
                  style={{
                    fontSize:
                      "11px",
                    color:
                      "rgba(255,255,255,0.45)",
                    marginBottom:
                      "6px",
                  }}
                >
                  OUTPUT
                </div>

                <div
                  style={{
                    fontSize:
                      "16px",
                    fontWeight:
                      700,
                  }}
                >
                  {formatFileSize(
                    result.blob.size
                  )}
                </div>

              </div>


              <div
                style={{
                  padding:
                    "16px",
                  borderRadius:
                    "12px",
                  background:
                    "rgba(255,255,255,0.045)",
                  border:
                    "1px solid rgba(255,255,255,0.12)",
                }}
              >

                <div
                  style={{
                    fontSize:
                      "11px",
                    color:
                      "rgba(255,255,255,0.45)",
                    marginBottom:
                      "6px",
                  }}
                >
                  REDUCED
                </div>

                <div
                  style={{
                    fontSize:
                      "16px",
                    fontWeight:
                      700,
                  }}
                >
                  {savedPercentage}%
                </div>

              </div>

            </div>
          )}


          {/* OPTIMIZATION INFO */}

          {result && (
            <div
              style={{
                marginTop:
                  "14px",
                padding:
                  "14px 16px",
                borderRadius:
                  "11px",
                background:
                  "rgba(255,255,255,0.045)",
                border:
                  "1px solid rgba(255,255,255,0.10)",
                fontSize:
                  "12px",
                color:
                  "rgba(255,255,255,0.55)",
              }}
            >

              <span>
                Optimized output:
              </span>

              {" "}

              <strong
                style={{
                  color:
                    "#ffffff",
                }}
              >
                {result.format.toUpperCase()}
              </strong>

              {" · "}

              {result.width} ×{" "}
              {result.height}

              {" · "}

              Highest quality that
              fits the target size.

            </div>
          )}


          {/* ACTION */}

          <button
            type="button"
            onClick={
              handleCompress
            }
            disabled={
              processing
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
                processing
                  ? "wait"
                  : "pointer",
              fontSize:
                "14px",
              fontWeight:
                700,
              opacity:
                processing
                  ? 0.6
                  : 1,
            }}
          >
            {processing
              ? "Optimizing..."
              : "Compress to Target Size"}
          </button>


          {/* DOWNLOAD */}

          {result && (
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
              Download Image
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