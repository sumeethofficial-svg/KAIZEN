// src/tools/images/EnhanceImage.jsx

import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  detectImageFormat,
  enhanceImage,
  formatFileSize,
  downloadEnhancedImage,
} from "../../services/image/enhanceImage";


const DEFAULT_SETTINGS = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  clarity: 0,
  sharpness: 0,
};


export default function EnhanceImage() {
  const fileInputRef =
    useRef(null);

  const originalUrlRef =
    useRef("");

  const enhancedUrlRef =
    useRef("");

  const previewTimerRef =
    useRef(null);

  const [file, setFile] =
    useState(null);

  const [originalPreview, setOriginalPreview] =
    useState("");

  const [enhancedPreview, setEnhancedPreview] =
    useState("");

  const [format, setFormat] =
    useState("");

  const [settings, setSettings] =
    useState(
      DEFAULT_SETTINGS
    );

  const [resultBlob, setResultBlob] =
    useState(null);

  const [processing, setProcessing] =
    useState(false);

  const [dragging, setDragging] =
    useState(false);

  const [error, setError] =
    useState("");

  const [showEnhanced, setShowEnhanced] =
    useState(true);


  /*
   * Cleanup object URLs.
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
        originalUrlRef.current
      ) {
        URL.revokeObjectURL(
          originalUrlRef.current
        );
      }

      if (
        enhancedUrlRef.current
      ) {
        URL.revokeObjectURL(
          enhancedUrlRef.current
        );
      }
    };
  }, []);


  /*
   * Generate the enhanced
   * preview.
   *
   * Debounced slightly so that
   * dragging a slider doesn't
   * launch hundreds of canvas
   * operations simultaneously.
   */
  const generatePreview = async (
    selectedFile,
    currentSettings
  ) => {
    if (!selectedFile) {
      return;
    }

    setProcessing(true);

    setError("");

    try {
      const result =
        await enhanceImage(
          selectedFile,
          currentSettings
        );


      if (
        enhancedUrlRef.current
      ) {
        URL.revokeObjectURL(
          enhancedUrlRef.current
        );
      }


      const url =
        URL.createObjectURL(
          result.blob
        );

      enhancedUrlRef.current =
        url;

      setEnhancedPreview(
        url
      );

      setResultBlob(
        result.blob
      );
    } catch (enhanceError) {
      console.error(
        enhanceError
      );

      setError(
        enhanceError?.message ||
          "Could not enhance this image."
      );

      setResultBlob(
        null
      );
    } finally {
      setProcessing(false);
    }
  };


  /*
   * Handle uploaded file.
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
      originalUrlRef.current
    ) {
      URL.revokeObjectURL(
        originalUrlRef.current
      );
    }


    if (
      enhancedUrlRef.current
    ) {
      URL.revokeObjectURL(
        enhancedUrlRef.current
      );
    }


    const url =
      URL.createObjectURL(
        selectedFile
      );


    originalUrlRef.current =
      url;


    setFile(
      selectedFile
    );

    setOriginalPreview(
      url
    );

    setEnhancedPreview("");

    setResultBlob(null);

    setFormat(
      detectImageFormat(
        selectedFile
      )
    );

    setSettings(
      DEFAULT_SETTINGS
    );

    setError("");


    /*
     * Initial preview.
     */
    generatePreview(
      selectedFile,
      DEFAULT_SETTINGS
    );
  };


  /*
   * File input.
   */
  const handleInputChange = (
    event
  ) => {
    handleFile(
      event.target.files?.[0]
    );
  };


  /*
   * Drag events.
   */
  const handleDragOver = (
    event
  ) => {
    event.preventDefault();

    setDragging(true);
  };


  const handleDragLeave = () => {
    setDragging(false);
  };


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
   * Open file browser.
   */
  const openPicker = () => {
    fileInputRef.current?.click();
  };


  /*
   * Update a slider.
   */
  const updateSetting = (
    key,
    value
  ) => {
    const nextSettings = {
      ...settings,
      [key]:
        Number(value),
    };


    setSettings(
      nextSettings
    );


    /*
     * Live preview.
     */
    if (
      previewTimerRef.current
    ) {
      clearTimeout(
        previewTimerRef.current
      );
    }


    previewTimerRef.current =
      setTimeout(() => {
        generatePreview(
          file,
          nextSettings
        );
      }, 80);
  };


  /*
   * Reset adjustments.
   */
  const resetAdjustments = () => {
    setSettings(
      DEFAULT_SETTINGS
    );

    if (
      file
    ) {
      generatePreview(
        file,
        DEFAULT_SETTINGS
      );
    }
  };


  /*
   * Download.
   */
  const handleDownload = () => {
    if (
      !resultBlob ||
      !file
    ) {
      return;
    }

    downloadEnhancedImage(
      resultBlob,
      file.name,
      format
    );
  };


  /*
   * Clear image.
   */
  const handleClear = () => {
    if (
      previewTimerRef.current
    ) {
      clearTimeout(
        previewTimerRef.current
      );
    }


    if (
      originalUrlRef.current
    ) {
      URL.revokeObjectURL(
        originalUrlRef.current
      );

      originalUrlRef.current =
        "";
    }


    if (
      enhancedUrlRef.current
    ) {
      URL.revokeObjectURL(
        enhancedUrlRef.current
      );

      enhancedUrlRef.current =
        "";
    }


    setFile(null);

    setOriginalPreview("");

    setEnhancedPreview("");

    setResultBlob(null);

    setFormat("");

    setSettings(
      DEFAULT_SETTINGS
    );

    setProcessing(false);

    setDragging(false);

    setError("");

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  };


  /*
   * Slider component.
   */
  const AdjustmentSlider = ({
    label,
    value,
    min,
    max,
    description,
  }) => {
    return (
      <div
        style={{
          marginBottom:
            "22px",
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

          <div>

            <div
              style={{
                fontSize:
                  "14px",
                fontWeight:
                  600,
                color:
                  "#ffffff",
              }}
            >
              {label}
            </div>

            <div
              style={{
                marginTop:
                  "3px",
                fontSize:
                  "11px",
                color:
                  "rgba(255,255,255,0.42)",
              }}
            >
              {description}
            </div>

          </div>


          <div
            style={{
              minWidth:
                "48px",
              textAlign:
                "right",
              fontSize:
                "13px",
              fontWeight:
                700,
              color:
                "#ffffff",
            }}
          >
            {value > 0
              ? `+${value}`
              : value}
          </div>

        </div>


        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(
            event
          ) =>
            updateSetting(
              label
                .toLowerCase()
                .replace(
                  " ",
                  ""
                ),
              event.target.value
            )
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
              "5px",
            fontSize:
              "10px",
            color:
              "rgba(255,255,255,0.35)",
          }}
        >
          <span>
            {min}
          </span>

          <span>
            0
          </span>

          <span>
            +{max}
          </span>
        </div>

      </div>
    );
  };


  /*
   * We use explicit keys instead
   * of relying on the label text.
   */
  const renderSlider = (
    key,
    label,
    description,
    min,
    max
  ) => (
    <div
      style={{
        marginBottom:
          "22px",
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
            "8px",
        }}
      >

        <div>

          <div
            style={{
              fontSize:
                "14px",
              fontWeight:
                600,
              color:
                "#ffffff",
            }}
          >
            {label}
          </div>

          <div
            style={{
              marginTop:
                "3px",
              fontSize:
                "11px",
              color:
                "rgba(255,255,255,0.42)",
            }}
          >
            {description}
          </div>

        </div>


        <div
          style={{
            minWidth:
              "45px",
            textAlign:
              "right",
            fontSize:
              "13px",
            fontWeight:
              700,
            color:
              "#ffffff",
          }}
        >
          {settings[key] > 0
            ? `+${settings[key]}`
            : settings[key]}
        </div>

      </div>


      <input
        type="range"
        min={min}
        max={max}
        value={
          settings[key]
        }
        onChange={(
          event
        ) =>
          updateSetting(
            key,
            event.target.value
          )
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
            "5px",
          fontSize:
            "10px",
          color:
            "rgba(255,255,255,0.35)",
        }}
      >
        <span>
          {min}
        </span>

        <span>
          0
        </span>

        <span>
          +{max}
        </span>
      </div>

    </div>
  );


  return (
    <div
      style={{
        width:
          "100%",
        maxWidth:
          "1100px",
        margin:
          "0 auto",
        padding:
          "32px",
        color:
          "#ffffff",
      }}
    >

      {/* HEADER */}

      <div
        style={{
          display:
            "flex",
          alignItems:
            "flex-start",
          justifyContent:
            "space-between",
          gap:
            "20px",
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
              margin:
                0,
              fontSize:
                "32px",
              fontWeight:
                700,
              color:
                "#ffffff",
            }}
          >
            Image Enhancer
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
            Improve image clarity,
            contrast and appearance.
          </p>

        </div>


        {file && (
          <button
            type="button"
            onClick={
              handleClear
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
              openPicker
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
                  "27px",
                color:
                  "#ffffff",
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
              JPG · PNG · WebP · AVIF
            </div>

          </div>
        </>
      ) : (

        <div>

          {/* FILE INFO */}

          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              gap:
                "16px",
              padding:
                "14px 16px",
              border:
                "1px solid rgba(255,255,255,0.15)",
              borderRadius:
                "12px",
              background:
                "rgba(255,255,255,0.035)",
              marginBottom:
                "16px",
            }}
          >

            <div
              style={{
                minWidth:
                  0,
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
                    "4px",
                  fontSize:
                    "12px",
                  color:
                    "rgba(255,255,255,0.50)",
                }}
              >
                {format.toUpperCase()}
                {" · "}
                {formatFileSize(
                  file.size
                )}
              </div>

            </div>


            <div
              style={{
                padding:
                  "7px 12px",
                borderRadius:
                  "8px",
                background:
                  "rgba(255,255,255,0.08)",
                fontSize:
                  "12px",
                fontWeight:
                  700,
                flexShrink:
                  0,
              }}
            >
              {format.toUpperCase()}
            </div>

          </div>


          {/* PREVIEW */}

          <div
            style={{
              border:
                "1px solid rgba(255,255,255,0.16)",
              borderRadius:
                "16px",
              overflow:
                "hidden",
              background:
                "rgba(0,0,0,0.25)",
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
                padding:
                  "13px 16px",
                borderBottom:
                  "1px solid rgba(255,255,255,0.10)",
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
                }}
              >
                LIVE PREVIEW
              </div>


              <button
                type="button"
                onClick={() =>
                  setShowEnhanced(
                    !showEnhanced
                  )
                }
                style={{
                  border:
                    "1px solid rgba(255,255,255,0.20)",
                  background:
                    "rgba(255,255,255,0.06)",
                  color:
                    "#ffffff",
                  borderRadius:
                    "8px",
                  padding:
                    "6px 11px",
                  cursor:
                    "pointer",
                  fontSize:
                    "11px",
                }}
              >
                {showEnhanced
                  ? "Enhanced"
                  : "Original"}
              </button>

            </div>


            <div
              style={{
                minHeight:
                  "360px",
                padding:
                  "20px",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                position:
                  "relative",
              }}
            >

              <img
                src={
                  showEnhanced
                    ? enhancedPreview ||
                      originalPreview
                    : originalPreview
                }
                alt="Preview"
                style={{
                  maxWidth:
                    "100%",
                  maxHeight:
                    "520px",
                  objectFit:
                    "contain",
                  display:
                    "block",
                  opacity:
                    processing
                      ? 0.55
                      : 1,
                  transition:
                    "opacity 0.15s ease",
                }}
              />


              {processing && (
                <div
                  style={{
                    position:
                      "absolute",
                    left:
                      "50%",
                    bottom:
                      "18px",
                    transform:
                      "translateX(-50%)",
                    padding:
                      "8px 13px",
                    borderRadius:
                      "8px",
                    background:
                      "rgba(0,0,0,0.65)",
                    border:
                      "1px solid rgba(255,255,255,0.15)",
                    fontSize:
                      "12px",
                    color:
                      "#ffffff",
                  }}
                >
                  Updating preview...
                </div>
              )}

            </div>


            {/* PREVIEW SWITCH */}

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "center",
                gap:
                  "8px",
                padding:
                  "12px 16px 16px",
              }}
            >

              <button
                type="button"
                onClick={() =>
                  setShowEnhanced(
                    false
                  )
                }
                style={{
                  padding:
                    "8px 15px",
                  borderRadius:
                    "8px",
                  border:
                    !showEnhanced
                      ? "1px solid #ffffff"
                      : "1px solid rgba(255,255,255,0.15)",
                  background:
                    !showEnhanced
                      ? "rgba(255,255,255,0.12)"
                      : "transparent",
                  color:
                    "#ffffff",
                  cursor:
                    "pointer",
                  fontSize:
                    "12px",
                  fontWeight:
                    600,
                }}
              >
                Original
              </button>


              <button
                type="button"
                onClick={() =>
                  setShowEnhanced(
                    true
                  )
                }
                style={{
                  padding:
                    "8px 15px",
                  borderRadius:
                    "8px",
                  border:
                    showEnhanced
                      ? "1px solid #ffffff"
                      : "1px solid rgba(255,255,255,0.15)",
                  background:
                    showEnhanced
                      ? "rgba(255,255,255,0.12)"
                      : "transparent",
                  color:
                    "#ffffff",
                  cursor:
                    "pointer",
                  fontSize:
                    "12px",
                  fontWeight:
                    600,
                }}
              >
                Enhanced
              </button>

            </div>

          </div>


          {/* ADJUSTMENTS */}

          <div
            style={{
              border:
                "1px solid rgba(255,255,255,0.16)",
              borderRadius:
                "16px",
              padding:
                "22px",
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
                  "24px",
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
                      "6px",
                  }}
                >
                  ENHANCEMENT
                </div>

                <div
                  style={{
                    fontSize:
                      "18px",
                    fontWeight:
                      650,
                  }}
                >
                  Adjust appearance
                </div>

              </div>


              <button
                type="button"
                onClick={
                  resetAdjustments
                }
                style={{
                  border:
                    "1px solid rgba(255,255,255,0.20)",
                  background:
                    "rgba(255,255,255,0.05)",
                  color:
                    "#ffffff",
                  borderRadius:
                    "8px",
                  padding:
                    "7px 12px",
                  cursor:
                    "pointer",
                  fontSize:
                    "12px",
                }}
              >
                Reset
              </button>

            </div>


            {renderSlider(
              "brightness",
              "Brightness",
              "Adjust overall lightness",
              -100,
              100
            )}


            {renderSlider(
              "contrast",
              "Contrast",
              "Increase or soften tonal difference",
              -100,
              100
            )}


            {renderSlider(
              "saturation",
              "Saturation",
              "Control color intensity",
              -100,
              100
            )}


            {renderSlider(
              "clarity",
              "Clarity",
              "Enhance local image detail",
              0,
              100
            )}


            {renderSlider(
              "sharpness",
              "Sharpness",
              "Bring out fine edges and details",
              0,
              100
            )}

          </div>


          {/* RESULT INFO */}

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
                  "15px",
                border:
                  "1px solid rgba(255,255,255,0.12)",
                borderRadius:
                  "11px",
                background:
                  "rgba(255,255,255,0.035)",
              }}
            >

              <div
                style={{
                  fontSize:
                    "10px",
                  color:
                    "rgba(255,255,255,0.45)",
                  marginBottom:
                    "6px",
                }}
              >
                FORMAT
              </div>

              <div
                style={{
                  fontSize:
                    "15px",
                  fontWeight:
                    700,
                }}
              >
                {format.toUpperCase()}
              </div>

            </div>


            <div
              style={{
                padding:
                  "15px",
                border:
                  "1px solid rgba(255,255,255,0.12)",
                borderRadius:
                  "11px",
                background:
                  "rgba(255,255,255,0.035)",
              }}
            >

              <div
                style={{
                  fontSize:
                    "10px",
                  color:
                    "rgba(255,255,255,0.45)",
                  marginBottom:
                    "6px",
                }}
              >
                ORIGINAL
              </div>

              <div
                style={{
                  fontSize:
                    "15px",
                  fontWeight:
                    700,
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
                  "15px",
                border:
                  "1px solid rgba(255,255,255,0.12)",
                borderRadius:
                  "11px",
                background:
                  "rgba(255,255,255,0.035)",
              }}
            >

              <div
                style={{
                  fontSize:
                    "10px",
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
                    "15px",
                  fontWeight:
                    700,
                }}
              >
                {resultBlob
                  ? formatFileSize(
                      resultBlob.size
                    )
                  : "—"}
              </div>

            </div>

          </div>


          {/* DOWNLOAD */}

          <button
            type="button"
            onClick={
              handleDownload
            }
            disabled={
              !resultBlob ||
              processing
            }
            style={{
              width:
                "100%",
              minHeight:
                "52px",
              marginTop:
                "18px",
              border:
                "1px solid rgba(255,255,255,0.80)",
              borderRadius:
                "12px",
              background:
                "#ffffff",
              color:
                "#111111",
              cursor:
                resultBlob &&
                !processing
                  ? "pointer"
                  : "not-allowed",
              fontSize:
                "14px",
              fontWeight:
                700,
              opacity:
                resultBlob &&
                !processing
                  ? 1
                  : 0.5,
            }}
          >
            Download Enhanced Image
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
            ● Your image is processed
            locally in your browser.
            Nothing is uploaded.
          </div>

        </div>
      )}

    </div>
  );
}