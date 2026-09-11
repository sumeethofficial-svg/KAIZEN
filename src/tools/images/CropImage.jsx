import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  cropImage,
} from "../../services/image/cropImage.js";

const CropImage = () => {
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const editorRef = useRef(null);

  const [file, setFile] = useState(null);
  const [imageUrl, setImageUrl] =
    useState(null);

  const [imageInfo, setImageInfo] =
    useState(null);

  const [crop, setCrop] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const [displayCrop, setDisplayCrop] =
    useState(null);

  const [aspectRatio, setAspectRatio] =
    useState("free");

  const [customWidth, setCustomWidth] =
    useState("");

  const [customHeight, setCustomHeight] =
    useState("");

  const [dragging, setDragging] =
    useState(false);

  const dragDataRef = useRef(null);

  const [processing, setProcessing] =
    useState(false);

  const [result, setResult] =
    useState(null);

  const [error, setError] =
    useState("");

  /* --------------------------------
     FILE PICKER
  -------------------------------- */

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  /* --------------------------------
     INITIAL CROP
  -------------------------------- */

  const createInitialCrop = (
    width,
    height
  ) => {
    const padding = 0.08;

    const cropWidth =
      width * (1 - padding * 2);

    const cropHeight =
      height * (1 - padding * 2);

    return {
      x: width * padding,
      y: height * padding,
      width: cropWidth,
      height: cropHeight,
    };
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

    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }

    const url =
      URL.createObjectURL(selectedFile);

    const image = new Image();

    image.onload = () => {
      const width =
        image.naturalWidth;

      const height =
        image.naturalHeight;

      setFile(selectedFile);
      setImageUrl(url);

      setImageInfo({
        width,
        height,
        type: selectedFile.type,
        name: selectedFile.name,
        size: selectedFile.size,
      });

      setCrop(
        createInitialCrop(
          width,
          height
        )
      );

      setAspectRatio("free");

      setCustomWidth("");
      setCustomHeight("");
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);

      setError(
        "Unable to read this image."
      );
    };

    image.src = url;
  };

  /* --------------------------------
     DISPLAY CROP
  -------------------------------- */

  useEffect(() => {
    const updateDisplayCrop = () => {
      if (
        !imageRef.current ||
        !imageInfo ||
        !crop.width ||
        !crop.height
      ) {
        return;
      }

      const rect =
        imageRef.current.getBoundingClientRect();

      const scaleX =
        rect.width / imageInfo.width;

      const scaleY =
        rect.height / imageInfo.height;

      setDisplayCrop({
        left: crop.x * scaleX,
        top: crop.y * scaleY,
        width: crop.width * scaleX,
        height: crop.height * scaleY,
      });
    };

    updateDisplayCrop();

    window.addEventListener(
      "resize",
      updateDisplayCrop
    );

    return () => {
      window.removeEventListener(
        "resize",
        updateDisplayCrop
      );
    };
  }, [
    crop,
    imageInfo,
  ]);

  /* --------------------------------
     ASPECT RATIO
  -------------------------------- */

  const getRatioValue = () => {
    if (aspectRatio === "1:1") {
      return 1;
    }

    if (aspectRatio === "4:3") {
      return 4 / 3;
    }

    if (aspectRatio === "16:9") {
      return 16 / 9;
    }

    return null;
  };

  const applyAspectRatio = (
    ratioName
  ) => {
    if (!imageInfo) {
      return;
    }

    setAspectRatio(ratioName);
    setResult(null);

    if (ratioName === "free") {
      return;
    }

    const ratio =
      ratioName === "1:1"
        ? 1
        : ratioName === "4:3"
        ? 4 / 3
        : 16 / 9;

    let width = crop.width;
    let height =
      width / ratio;

    if (height > imageInfo.height) {
      height = imageInfo.height;
      width = height * ratio;
    }

    if (width > imageInfo.width) {
      width = imageInfo.width;
      height = width / ratio;
    }

    setCrop({
      x:
        (imageInfo.width - width) /
        2,
      y:
        (imageInfo.height - height) /
        2,
      width,
      height,
    });
  };

  /* --------------------------------
     POINTER POSITION
  -------------------------------- */

  const getImageCoordinates = (
    event
  ) => {
    if (
      !imageRef.current ||
      !imageInfo
    ) {
      return null;
    }

    const rect =
      imageRef.current.getBoundingClientRect();

    const scaleX =
      imageInfo.width / rect.width;

    const scaleY =
      imageInfo.height / rect.height;

    const clientX =
      event.clientX;

    const clientY =
      event.clientY;

    return {
      x:
        (clientX - rect.left) *
        scaleX,

      y:
        (clientY - rect.top) *
        scaleY,
    };
  };

  /* --------------------------------
     START DRAG
  -------------------------------- */

  const handlePointerDown = (
    event
  ) => {
    if (!imageInfo || !displayCrop) {
      return;
    }

    event.preventDefault();

    const point =
      getImageCoordinates(event);

    if (!point) {
      return;
    }

    const inside =
      point.x >= crop.x &&
      point.x <=
        crop.x + crop.width &&
      point.y >= crop.y &&
      point.y <=
        crop.y + crop.height;

    if (!inside) {
      return;
    }

    setDragging(true);

    dragDataRef.current = {
      startX: point.x,
      startY: point.y,
      cropX: crop.x,
      cropY: crop.y,
    };

    event.currentTarget.setPointerCapture?.(
      event.pointerId
    );
  };

  /* --------------------------------
     MOVE CROP
  -------------------------------- */

  const handlePointerMove = (
    event
  ) => {
    if (
      !dragging ||
      !dragDataRef.current ||
      !imageInfo
    ) {
      return;
    }

    const point =
      getImageCoordinates(event);

    if (!point) {
      return;
    }

    const data =
      dragDataRef.current;

    let newX =
      data.cropX +
      (point.x - data.startX);

    let newY =
      data.cropY +
      (point.y - data.startY);

    newX = Math.max(
      0,
      Math.min(
        newX,
        imageInfo.width -
          crop.width
      )
    );

    newY = Math.max(
      0,
      Math.min(
        newY,
        imageInfo.height -
          crop.height
      )
    );

    setCrop((current) => ({
      ...current,
      x: newX,
      y: newY,
    }));

    setResult(null);
  };

  /* --------------------------------
     END DRAG
  -------------------------------- */

  const handlePointerUp = () => {
    setDragging(false);
    dragDataRef.current = null;
  };

  /* --------------------------------
     CROP DIMENSION INPUTS
  -------------------------------- */

  const handleWidthChange = (
    event
  ) => {
    if (!imageInfo) {
      return;
    }

    const value =
      Number(event.target.value);

    if (!value || value <= 0) {
      setCustomWidth(
        event.target.value
      );
      return;
    }

    const ratio =
      getRatioValue();

    let width = Math.min(
      value,
      imageInfo.width
    );

    let height;

    if (ratio) {
      height = width / ratio;

      if (height > imageInfo.height) {
        height =
          imageInfo.height;
        width =
          height * ratio;
      }
    } else {
      height = Math.min(
        crop.height,
        imageInfo.height
      );
    }

    setCustomWidth(
      Math.round(width)
    );

    if (ratio) {
      setCustomHeight(
        Math.round(height)
      );
    }

    setCrop((current) => ({
      x: Math.min(
        current.x,
        imageInfo.width -
          width
      ),
      y: Math.min(
        current.y,
        imageInfo.height -
          height
      ),
      width,
      height,
    }));

    setResult(null);
  };

  const handleHeightChange = (
    event
  ) => {
    if (!imageInfo) {
      return;
    }

    const value =
      Number(event.target.value);

    if (!value || value <= 0) {
      setCustomHeight(
        event.target.value
      );
      return;
    }

    const ratio =
      getRatioValue();

    let height = Math.min(
      value,
      imageInfo.height
    );

    let width;

    if (ratio) {
      width = height * ratio;

      if (width > imageInfo.width) {
        width =
          imageInfo.width;
        height =
          width / ratio;
      }
    } else {
      width = Math.min(
        crop.width,
        imageInfo.width
      );
    }

    setCustomHeight(
      Math.round(height)
    );

    if (ratio) {
      setCustomWidth(
        Math.round(width)
      );
    }

    setCrop((current) => ({
      x: Math.min(
        current.x,
        imageInfo.width -
          width
      ),
      y: Math.min(
        current.y,
        imageInfo.height -
          height
      ),
      width,
      height,
    }));

    setResult(null);
  };

  /* --------------------------------
     CROP
  -------------------------------- */

  const handleCrop = async () => {
    if (
      !file ||
      !imageInfo ||
      !crop.width ||
      !crop.height
    ) {
      return;
    }

    try {
      setProcessing(true);
      setError("");
      setResult(null);

      const output =
        await cropImage(
          file,
          crop,
          Math.round(crop.width),
          Math.round(crop.height)
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
          "Unable to crop the image."
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
      `${name}-cropped.${extension}`;

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

      {/* UPLOAD */}

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

      {/* EDITOR */}

      {file && imageInfo && (
        <>
          {/* IMAGE INFORMATION */}

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

          {/* CROP EDITOR */}

          <div
            ref={editorRef}
            style={{
              position: "relative",
              width: "100%",
              maxHeight: "550px",
              borderRadius: "12px",
              overflow: "hidden",
              background:
                "rgba(0,0,0,0.45)",
              border:
                "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                position: "relative",
                display: "inline-block",
                maxWidth: "100%",
                maxHeight: "550px",
                lineHeight: 0,
              }}
            >
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Crop source"
                draggable={false}
                style={{
                  display: "block",
                  maxWidth: "100%",
                  maxHeight: "550px",
                  width: "auto",
                  height: "auto",
                  userSelect: "none",
                }}
              />

              {displayCrop && (
                <>
                  {/* DARK OVERLAY */}

                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      pointerEvents:
                        "none",
                      background:
                        "rgba(0,0,0,0.48)",
                      clipPath: `polygon(
                        0% 0%,
                        100% 0%,
                        100% 100%,
                        0% 100%,
                        0% 0%,
                        ${displayCrop.left}px ${displayCrop.top}px,
                        ${displayCrop.left}px ${displayCrop.top + displayCrop.height}px,
                        ${displayCrop.left + displayCrop.width}px ${displayCrop.top + displayCrop.height}px,
                        ${displayCrop.left + displayCrop.width}px ${displayCrop.top}px,
                        ${displayCrop.left}px ${displayCrop.top}px
                      )`,
                    }}
                  />

                  {/* CROP BOX */}

                  <div
                    onPointerDown={
                      handlePointerDown
                    }
                    onPointerMove={
                      handlePointerMove
                    }
                    onPointerUp={
                      handlePointerUp
                    }
                    onPointerCancel={
                      handlePointerUp
                    }
                    style={{
                      position:
                        "absolute",
                      left:
                        displayCrop.left,
                      top:
                        displayCrop.top,
                      width:
                        displayCrop.width,
                      height:
                        displayCrop.height,
                      border:
                        "1px solid rgba(255,255,255,0.95)",
                      boxSizing:
                        "border-box",
                      cursor:
                        dragging
                          ? "grabbing"
                          : "grab",
                      touchAction:
                        "none",
                    }}
                  >
                    {/* GRID */}

                    <div
                      style={{
                        position:
                          "absolute",
                        inset: 0,
                        pointerEvents:
                          "none",
                        backgroundImage:
                          `
                            linear-gradient(
                              to right,
                              transparent 33.33%,
                              rgba(255,255,255,0.30) 33.33%,
                              rgba(255,255,255,0.30) 33.6%,
                              transparent 33.6%,
                              transparent 66.66%,
                              rgba(255,255,255,0.30) 66.66%,
                              rgba(255,255,255,0.30) 67%,
                              transparent 67%
                            ),
                            linear-gradient(
                              to bottom,
                              transparent 33.33%,
                              rgba(255,255,255,0.30) 33.33%,
                              rgba(255,255,255,0.30) 33.6%,
                              transparent 33.6%,
                              transparent 66.66%,
                              rgba(255,255,255,0.30) 66.66%,
                              rgba(255,255,255,0.30) 67%,
                              transparent 67%
                            )
                          `,
                      }}
                    />

                    {/* DIMENSIONS */}

                    <div
                      style={{
                        position:
                          "absolute",
                        left: "50%",
                        bottom: "-32px",
                        transform:
                          "translateX(-50%)",
                        padding:
                          "5px 9px",
                        borderRadius:
                          "5px",
                        background:
                          "rgba(0,0,0,0.75)",
                        color:
                          "#ffffff",
                        fontSize:
                          "10px",
                        whiteSpace:
                          "nowrap",
                        pointerEvents:
                          "none",
                      }}
                    >
                      {Math.round(
                        crop.width
                      )}{" "}
                      ×{" "}
                      {Math.round(
                        crop.height
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ASPECT RATIO */}

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
                letterSpacing: "1.5px",
                marginBottom: "10px",
              }}
            >
              ASPECT RATIO
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              {[
                "free",
                "1:1",
                "4:3",
                "16:9",
              ].map((ratio) => {
                const selected =
                  aspectRatio === ratio;

                return (
                  <button
                    key={ratio}
                    onClick={() =>
                      applyAspectRatio(
                        ratio
                      )
                    }
                    style={{
                      padding:
                        "9px 16px",
                      borderRadius:
                        "8px",
                      border: selected
                        ? "1px solid rgba(255,255,255,0.85)"
                        : "1px solid rgba(255,255,255,0.12)",
                      background:
                        selected
                          ? "rgba(255,255,255,0.09)"
                          : "rgba(255,255,255,0.025)",
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
                    {ratio ===
                    "free"
                      ? "Free"
                      : ratio}
                  </button>
                );
              })}
            </div>
          </div>

          {/* DIMENSIONS */}

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
                letterSpacing: "1.5px",
                marginBottom: "10px",
              }}
            >
              CROP DIMENSIONS
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: "10px",
              }}
            >
              <div
                style={{
                  position:
                    "relative",
                }}
              >
                <span
                  style={{
                    position:
                      "absolute",
                    left: "12px",
                    top: "50%",
                    transform:
                      "translateY(-50%)",
                    color: "#666666",
                    fontSize:
                      "10px",
                    pointerEvents:
                      "none",
                  }}
                >
                  WIDTH
                </span>

                <input
                  type="number"
                  min="1"
                  max={
                    imageInfo.width
                  }
                  value={
                    customWidth ||
                    Math.round(
                      crop.width
                    )
                  }
                  onChange={
                    handleWidthChange
                  }
                  style={{
                    width: "100%",
                    boxSizing:
                      "border-box",
                    padding:
                      "12px 12px 12px 65px",
                    borderRadius:
                      "8px",
                    border:
                      "1px solid rgba(255,255,255,0.12)",
                    background:
                      "rgba(255,255,255,0.035)",
                    color: "#ffffff",
                    outline: "none",
                    fontSize:
                      "13px",
                  }}
                />
              </div>

              <div
                style={{
                  position:
                    "relative",
                }}
              >
                <span
                  style={{
                    position:
                      "absolute",
                    left: "12px",
                    top: "50%",
                    transform:
                      "translateY(-50%)",
                    color: "#666666",
                    fontSize:
                      "10px",
                    pointerEvents:
                      "none",
                  }}
                >
                  HEIGHT
                </span>

                <input
                  type="number"
                  min="1"
                  max={
                    imageInfo.height
                  }
                  value={
                    customHeight ||
                    Math.round(
                      crop.height
                    )
                  }
                  onChange={
                    handleHeightChange
                  }
                  style={{
                    width: "100%",
                    boxSizing:
                      "border-box",
                    padding:
                      "12px 12px 12px 65px",
                    borderRadius:
                      "8px",
                    border:
                      "1px solid rgba(255,255,255,0.12)",
                    background:
                      "rgba(255,255,255,0.035)",
                    color: "#ffffff",
                    outline: "none",
                    fontSize:
                      "13px",
                  }}
                />
              </div>
            </div>
          </div>

          {/* CURRENT CROP INFO */}

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              padding:
                "13px 15px",
              marginBottom:
                "18px",
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
                color: "#777777",
                fontSize: "11px",
                letterSpacing:
                  "0.8px",
              }}
            >
              OUTPUT
            </span>

            <span
              style={{
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              {Math.round(
                crop.width
              )}{" "}
              ×{" "}
              {Math.round(
                crop.height
              )}
            </span>
          </div>

          {/* ERROR */}

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
                openFilePicker
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
              Change Image
            </button>

            <button
              onClick={
                handleCrop
              }
              disabled={
                processing
              }
              style={{
                flex: 2,
                padding:
                  "13px 18px",
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
                ? "Cropping..."
                : "Crop Image"}
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
                  Crop complete
                </div>

                <div
                  style={{
                    color:
                      "#777777",
                    fontSize:
                      "11px",
                  }}
                >
                  {
                    result.width
                  }{" "}
                  ×{" "}
                  {
                    result.height
                  }{" "}
                  ·{" "}
                  {getFormat()}{" "}
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

export default CropImage;