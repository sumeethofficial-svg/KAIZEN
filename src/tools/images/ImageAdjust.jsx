import React, { useEffect, useRef, useState } from "react";

const ImageAdjust = () => {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [imageLoaded, setImageLoaded] = useState(false);

  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [hue, setHue] = useState(0);
  const [blur, setBlur] = useState(0);
  const [grayscale, setGrayscale] = useState(0);
  const [sepia, setSepia] = useState(0);

  const drawImage = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;

    if (!canvas || !image) return;

    const ctx = canvas.getContext("2d");

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.filter = `
      brightness(${brightness}%)
      contrast(${contrast}%)
      saturate(${saturation}%)
      hue-rotate(${hue}deg)
      blur(${blur}px)
      grayscale(${grayscale}%)
      sepia(${sepia}%)
    `;

    ctx.drawImage(image, 0, 0);

    ctx.filter = "none";
  };

  useEffect(() => {
    if (imageLoaded) drawImage();
  }, [
    imageLoaded,
    brightness,
    contrast,
    saturation,
    hue,
    blur,
    grayscale,
    sepia,
  ]);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      imageRef.current = img;
      setFileName(file.name);
      setImageLoaded(true);
      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  const reset = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setHue(0);
    setBlur(0);
    setGrayscale(0);
    setSepia(0);
  };

  const changeImage = (e) => {
    handleFile(e.target.files?.[0]);
    e.target.value = "";
  };

  const download = (format) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const mime =
      format === "jpg"
        ? "image/jpeg"
        : `image/${format}`;

    const link = document.createElement("a");

    link.download = `kaizen-adjusted.${format}`;
    link.href = canvas.toDataURL(mime, 0.95);

    link.click();
  };

  const controls = [
    {
      label: "Brightness",
      value: brightness,
      setValue: setBrightness,
      min: 0,
      max: 200,
      suffix: "%",
    },
    {
      label: "Contrast",
      value: contrast,
      setValue: setContrast,
      min: 0,
      max: 200,
      suffix: "%",
    },
    {
      label: "Saturation",
      value: saturation,
      setValue: setSaturation,
      min: 0,
      max: 200,
      suffix: "%",
    },
    {
      label: "Hue",
      value: hue,
      setValue: setHue,
      min: -180,
      max: 180,
      suffix: "°",
    },
    {
      label: "Blur",
      value: blur,
      setValue: setBlur,
      min: 0,
      max: 10,
      suffix: "px",
    },
    {
      label: "Grayscale",
      value: grayscale,
      setValue: setGrayscale,
      min: 0,
      max: 100,
      suffix: "%",
    },
    {
      label: "Sepia",
      value: sepia,
      setValue: setSepia,
      min: 0,
      max: 100,
      suffix: "%",
    },
  ];

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      {!imageLoaded ? (
        <label
          style={{
            minHeight: "260px",
            border: "1px dashed rgba(255,255,255,0.22)",
            borderRadius: "18px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            background: "rgba(255,255,255,0.025)",
            transition: "all 0.2s ease",
          }}
        >
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.16)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              marginBottom: "16px",
            }}
          >
            ↑
          </div>

          <div
            style={{
              fontSize: "18px",
              fontWeight: 600,
              marginBottom: "7px",
            }}
          >
            Upload an image
          </div>

          <div
            style={{
              fontSize: "14px",
              opacity: 0.55,
            }}
          >
            Drag & drop or click to browse
          </div>

          <div
            style={{
              fontSize: "12px",
              opacity: 0.35,
              marginTop: "8px",
            }}
          >
            JPG · PNG · WebP
          </div>
        </label>
      ) : (
        <>
          {/* Preview */}
          <div
            style={{
              position: "relative",
              minHeight: "360px",
              maxHeight: "600px",
              borderRadius: "18px",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.28)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
              overflow: "hidden",
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                maxWidth: "100%",
                maxHeight: "550px",
                width: "auto",
                height: "auto",
                objectFit: "contain",
                borderRadius: "8px",
              }}
            />
          </div>

          {/* File row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              padding: "14px 16px",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.025)",
            }}
          >
            <div
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: "14px",
                opacity: 0.75,
              }}
            >
              {fileName}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                flexShrink: 0,
                padding: "8px 13px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.14)",
                background: "transparent",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              Change
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={changeImage}
            />
          </div>

          {/* Adjustments */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "12px",
            }}
          >
            {controls.map((control) => (
              <div
                key={control.label}
                style={{
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.025)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                    fontSize: "13px",
                  }}
                >
                  <span>{control.label}</span>

                  <span style={{ opacity: 0.5 }}>
                    {control.value}
                    {control.suffix}
                  </span>
                </div>

                <input
                  type="range"
                  min={control.min}
                  max={control.max}
                  value={control.value}
                  onChange={(e) =>
                    control.setValue(Number(e.target.value))
                  }
                  style={{
                    width: "100%",
                    cursor: "pointer",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              alignItems: "center",
              paddingTop: "4px",
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                padding: "11px 16px",
                borderRadius: "9px",
                border: "1px solid rgba(255,255,255,0.14)",
                background: "transparent",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              Reset
            </button>

            <div style={{ flex: 1 }} />

            <button
              type="button"
              onClick={() => download("png")}
              style={{
                padding: "11px 16px",
                borderRadius: "9px",
                border: "1px solid rgba(255,255,255,0.14)",
                background: "transparent",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              PNG
            </button>

            <button
              type="button"
              onClick={() => download("jpg")}
              style={{
                padding: "11px 16px",
                borderRadius: "9px",
                border: "1px solid rgba(255,255,255,0.14)",
                background: "transparent",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              JPG
            </button>

            <button
              type="button"
              onClick={() => download("webp")}
              style={{
                padding: "11px 16px",
                borderRadius: "9px",
                border: "none",
                background: "rgba(255,255,255,0.92)",
                color: "#111",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Download WebP
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ImageAdjust;