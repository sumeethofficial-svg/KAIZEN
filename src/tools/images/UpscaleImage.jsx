import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createUpscalePreview,
  getResolutionOptions,
  getTargetResolution,
  upscaleImage,
} from "../../services/image/upscaleImage.js";

const UpscaleImage = () => {
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [imageInfo, setImageInfo] = useState(null);

  const [selectedResolution, setSelectedResolution] =
    useState("1080p");

  const [sharpening, setSharpening] = useState(30);

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] =
    useState(false);

  const [processing, setProcessing] = useState(false);

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const resolutions = getResolutionOptions();

  const selectedOption =
    resolutions.find(
      (option) =>
        option.id === selectedResolution
    ) || resolutions[1];

  const targetResolution =
    imageInfo && selectedOption
      ? getTargetResolution(
          imageInfo.width,
          imageInfo.height,
          selectedOption.height
        )
      : null;

  /* --------------------------------
     OPEN FILE PICKER
  -------------------------------- */

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  /* --------------------------------
     FILE UPLOAD
  -------------------------------- */

  const handleFileChange = (event) => {
    const selectedFile =
      event.target.files?.[0];

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

    const image = new Image();

    const objectUrl =
      URL.createObjectURL(selectedFile);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const width = image.naturalWidth;
      const height = image.naturalHeight;

      setFile(selectedFile);

      setImageInfo({
        width,
        height,
        size: selectedFile.size,
        type: selectedFile.type,
        name: selectedFile.name,
      });

      if (height < 720) {
        setSelectedResolution("720p");
      } else if (height < 1080) {
        setSelectedResolution("1080p");
      } else if (height < 1440) {
        setSelectedResolution("1440p");
      } else {
        setSelectedResolution("4k");
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);

      setError(
        "Unable to read this image."
      );
    };

    image.src = objectUrl;
  };

  /* --------------------------------
     LIVE PREVIEW
  -------------------------------- */

  useEffect(() => {
    if (!file || !selectedOption) {
      setPreview(null);
      return;
    }

    let cancelled = false;

    const updatePreview = async () => {
      try {
        setPreviewLoading(true);
        setError("");

        const previewUrl =
          await createUpscalePreview(
            file,
            selectedOption.height,
            sharpening
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
    selectedOption,
    sharpening,
  ]);

  /* --------------------------------
     RESOLUTION SELECTION
  -------------------------------- */

  const selectResolution = (option) => {
    if (!imageInfo) {
      return;
    }

    const target =
      getTargetResolution(
        imageInfo.width,
        imageInfo.height,
        option.height
      );

    if (target.isOriginal) {
      return;
    }

    setSelectedResolution(option.id);
    setResult(null);
  };

  /* --------------------------------
     UPSCALE
  -------------------------------- */

  const handleUpscale = async () => {
    if (
      !file ||
      !selectedOption ||
      !targetResolution
    ) {
      return;
    }

    try {
      setProcessing(true);
      setError("");
      setResult(null);

      const output =
        await upscaleImage(
          file,
          selectedOption.height,
          sharpening
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
          "Unable to upscale the image."
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
      `${name}-upscaled-${selectedResolution}.${extension}`;

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

    if (bytes < 1024 * 1024) {
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
      imageInfo.type === "image/jpeg"
    ) {
      return "JPG";
    }

    if (
      imageInfo.type === "image/png"
    ) {
      return "PNG";
    }

    if (
      imageInfo.type === "image/webp"
    ) {
      return "WebP";
    }

    if (
      imageInfo.type === "image/avif"
    ) {
      return "AVIF";
    }

    return "";
  };

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
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={handleFileChange}
        style={{
          display: "none",
        }}
      />

      {/* --------------------------
          UPLOAD STATE
      -------------------------- */}

      {!file && (
        <button
          onClick={openFilePicker}
          style={{
            width: "100%",
            minHeight: "300px",
            border:
              "1px dashed rgba(255,255,255,0.20)",
            borderRadius: "14px",
            background:
              "rgba(255,255,255,0.025)",
            color: "#ffffff",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            transition:
              "background 0.2s ease",
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
              boxShadow:
                "0 8px 30px rgba(255,100,0,0.18)",
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
        </button>
      )}

      {/* --------------------------
          IMAGE SELECTED
      -------------------------- */}

      {file && imageInfo && (
        <>
          {/* IMAGE INFO */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, minmax(0, 1fr))",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                padding: "16px",
                borderRadius: "10px",
                background:
                  "rgba(255,255,255,0.035)",
                border:
                  "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  color: "#777777",
                  fontSize: "11px",
                  letterSpacing: "1px",
                  marginBottom: "7px",
                }}
              >
                ORIGINAL
              </div>

              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#ffffff",
                }}
              >
                {imageInfo.width} ×{" "}
                {imageInfo.height}
              </div>
            </div>

            <div
              style={{
                padding: "16px",
                borderRadius: "10px",
                background:
                  "rgba(255,255,255,0.035)",
                border:
                  "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  color: "#777777",
                  fontSize: "11px",
                  letterSpacing: "1px",
                  marginBottom: "7px",
                }}
              >
                FORMAT
              </div>

              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#ffffff",
                }}
              >
                {getFormat()}
              </div>
            </div>

            <div
              style={{
                padding: "16px",
                borderRadius: "10px",
                background:
                  "rgba(255,255,255,0.035)",
                border:
                  "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  color: "#777777",
                  fontSize: "11px",
                  letterSpacing: "1px",
                  marginBottom: "7px",
                }}
              >
                SIZE
              </div>

              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#ffffff",
                }}
              >
                {formatSize(
                  imageInfo.size
                )}
              </div>
            </div>
          </div>

          {/* RESOLUTION */}

          <div
            style={{
              marginBottom: "25px",
            }}
          >
            <div
              style={{
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "1.5px",
                marginBottom: "11px",
              }}
            >
              OUTPUT RESOLUTION
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(4, 1fr)",
                gap: "10px",
              }}
            >
              {resolutions.map(
                (option) => {
                  const target =
                    getTargetResolution(
                      imageInfo.width,
                      imageInfo.height,
                      option.height
                    );

                  const disabled =
                    target.isOriginal;

                  const selected =
                    selectedResolution ===
                    option.id;

                  return (
                    <button
                      key={option.id}
                      disabled={disabled}
                      onClick={() =>
                        selectResolution(
                          option
                        )
                      }
                      style={{
                        minHeight: "72px",
                        border: selected
                          ? "1px solid rgba(255,255,255,0.8)"
                          : "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "9px",
                        background:
                          selected
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(255,255,255,0.025)",
                        color: disabled
                          ? "#444444"
                          : "#ffffff",
                        cursor: disabled
                          ? "not-allowed"
                          : "pointer",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "16px",
                          fontWeight: 600,
                        }}
                      >
                        {option.label}
                      </div>

                      <div
                        style={{
                          color: disabled
                            ? "#444444"
                            : "#777777",
                          fontSize: "11px",
                          marginTop: "5px",
                        }}
                      >
                        {target.width} ×{" "}
                        {target.height}
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* SHARPENING */}

          <div
            style={{
              marginBottom: "25px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                marginBottom: "10px",
              }}
            >
              <span
                style={{
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 600,
                  letterSpacing: "1.5px",
                }}
              >
                SHARPENING
              </span>

              <span
                style={{
                  color: "#ffffff",
                  fontSize: "12px",
                }}
              >
                {sharpening}%
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={sharpening}
              onChange={(event) => {
                setSharpening(
                  Number(
                    event.target.value
                  )
                );

                setResult(null);
              }}
              style={{
                width: "100%",
                accentColor: "#7657ff",
                cursor: "pointer",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                color: "#666666",
                fontSize: "10px",
                marginTop: "5px",
              }}
            >
              <span>Soft</span>
              <span>Balanced</span>
              <span>Sharp</span>
            </div>
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
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <span
                style={{
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 600,
                  letterSpacing: "1.5px",
                }}
              >
                PREVIEW
              </span>

              {targetResolution && (
                <span
                  style={{
                    color: "#777777",
                    fontSize: "11px",
                  }}
                >
                  {targetResolution.width} ×{" "}
                  {targetResolution.height}
                </span>
              )}
            </div>

            <div
              style={{
                width: "100%",
                minHeight: "300px",
                maxHeight: "500px",
                padding: "18px",
                boxSizing: "border-box",
                borderRadius: "12px",
                border:
                  "1px solid rgba(255,255,255,0.08)",
                background:
                  "rgba(255,255,255,0.02)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
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
                  alt="Upscaled preview"
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    maxHeight: "460px",
                    objectFit: "contain",
                    borderRadius: "5px",
                  }}
                />
              ) : null}
            </div>
          </div>

          {/* ERROR */}

          {error && (
            <div
              style={{
                padding: "12px 14px",
                marginBottom: "16px",
                borderRadius: "8px",
                background:
                  "rgba(255,60,60,0.08)",
                border:
                  "1px solid rgba(255,60,60,0.14)",
                color: "#ff8585",
                fontSize: "13px",
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
              onClick={openFilePicker}
              style={{
                flex: 1,
                padding: "13px 18px",
                borderRadius: "9px",
                border:
                  "1px solid rgba(255,255,255,0.12)",
                background:
                  "rgba(255,255,255,0.035)",
                color: "#ffffff",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              Change Image
            </button>

            <button
              onClick={handleUpscale}
              disabled={
                processing ||
                !targetResolution ||
                targetResolution.isOriginal
              }
              style={{
                flex: 2,
                padding: "13px 18px",
                borderRadius: "9px",
                border: "none",
                background:
                  processing ||
                  targetResolution?.isOriginal
                    ? "rgba(255,255,255,0.10)"
                    : "#ffffff",
                color:
                  processing ||
                  targetResolution?.isOriginal
                    ? "#666666"
                    : "#111111",
                cursor:
                  processing ||
                  targetResolution?.isOriginal
                    ? "not-allowed"
                    : "pointer",
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              {processing
                ? "Upscaling..."
                : `Upscale to ${selectedOption.label}`}
            </button>
          </div>

          {/* RESULT */}

          {result && (
            <div
              style={{
                marginTop: "18px",
                padding: "16px",
                borderRadius: "10px",
                background:
                  "rgba(255,255,255,0.035)",
                border:
                  "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "space-between",
                gap: "15px",
              }}
            >
              <div>
                <div
                  style={{
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 600,
                    marginBottom: "5px",
                  }}
                >
                  Upscaling complete
                </div>

                <div
                  style={{
                    color: "#777777",
                    fontSize: "11px",
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
                onClick={handleDownload}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#ffffff",
                  color: "#111111",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
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

export default UpscaleImage;