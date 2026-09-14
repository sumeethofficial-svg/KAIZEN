import React, { useState } from "react";
import { generateQRCode } from "../../services/utilities/qrCodeGenerator.js";

function QRCodeGenerator() {
  const [text, setText] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [isGenerating, setIsGenerating] =
    useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError(
        "Please enter some text or a link."
      );
      setQrCode("");
      return;
    }

    setError("");
    setIsGenerating(true);

    try {
      const result =
        await generateQRCode(text, {
          width: 320,
          margin: 2,
          errorCorrectionLevel: "M",
        });

      setQrCode(result.dataUrl);
    } catch (err) {
      console.error(
        "QR code generation failed:",
        err
      );

      setError(
        err?.message ||
          "Failed to generate the QR code."
      );

      setQrCode("");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClear = () => {
    setText("");
    setQrCode("");
    setError("");
  };

  const handleDownload = () => {
    if (!qrCode) {
      return;
    }

    const link =
      document.createElement("a");

    link.href = qrCode;
    link.download = "kaizen-qr-code.png";

    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      (event.ctrlKey || event.metaKey)
    ) {
      handleGenerate();
    }
  };

  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "20px 24px 30px",
        color: "rgba(255,255,255,.94)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            qrCode
              ? "minmax(0, 1fr) 320px"
              : "1fr",
          gap: "16px",
          alignItems: "start",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: ".14em",
              color: "rgba(255,153,82,.72)",
              textTransform: "uppercase",
            }}
          >
            QR CONTENT
          </div>

          <textarea
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setError("");
            }}
            onKeyDown={handleKeyDown}
            placeholder="Enter text, URL, email, phone number, or any other content..."
            rows={7}
            style={{
              width: "100%",
              minHeight: "180px",
              boxSizing: "border-box",
              resize: "vertical",
              padding: "14px",
              border:
                "1px solid rgba(255,255,255,.09)",
              borderRadius: "13px",
              outline: "none",
              background:
                "rgba(255,255,255,.025)",
              color: "#fff",
              font: "inherit",
              fontSize: "12px",
              lineHeight: 1.6,
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent:
                "space-between",
              gap: "10px",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                color:
                  "rgba(255,255,255,.25)",
              }}
            >
              {text.length.toLocaleString()}{" "}
              characters
            </span>

            <span
              style={{
                fontSize: "10px",
                color:
                  "rgba(255,255,255,.22)",
              }}
            >
              Ctrl + Enter to generate
            </span>
          </div>

          {error && (
            <div
              style={{
                padding: "11px 13px",
                border:
                  "1px solid rgba(255,70,70,.22)",
                borderRadius: "10px",
                background:
                  "rgba(255,50,50,.06)",
                color: "#ff9c9c",
                fontSize: "11px",
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: "9px",
              marginTop: "2px",
            }}
          >
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              style={{
                flex: 1,
                minHeight: "42px",
                border:
                  "1px solid rgba(255,106,0,.35)",
                borderRadius: "10px",
                background:
                  "linear-gradient(135deg, rgba(255,118,0,.18), rgba(255,77,0,.1))",
                color: "#ff9a4d",
                font: "inherit",
                fontSize: "12px",
                fontWeight: 700,
                cursor: isGenerating
                  ? "not-allowed"
                  : "pointer",
                opacity: isGenerating
                  ? 0.55
                  : 1,
              }}
            >
              {isGenerating
                ? "Generating..."
                : "Generate QR Code"}
            </button>

            {text && (
              <button
                type="button"
                onClick={handleClear}
                style={{
                  minHeight: "42px",
                  padding: "0 16px",
                  border:
                    "1px solid rgba(255,255,255,.08)",
                  borderRadius: "10px",
                  background:
                    "rgba(255,255,255,.04)",
                  color:
                    "rgba(255,255,255,.64)",
                  font: "inherit",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {qrCode && (
          <div
            style={{
              border:
                "1px solid rgba(255,255,255,.08)",
              borderRadius: "16px",
              padding: "15px",
              background:
                "rgba(255,255,255,.025)",
            }}
          >
            <div
              style={{
                marginBottom: "11px",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: ".13em",
                color:
                  "rgba(255,153,82,.72)",
              }}
            >
              PREVIEW
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "center",
                padding: "12px",
                borderRadius: "11px",
                background: "#fff",
              }}
            >
              <img
                src={qrCode}
                alt="Generated QR code"
                style={{
                  display: "block",
                  width: "100%",
                  maxWidth: "280px",
                  height: "auto",
                  aspectRatio: "1 / 1",
                  objectFit: "contain",
                }}
              />
            </div>

            <div
              style={{
                marginTop: "10px",
                padding: "9px 10px",
                border:
                  "1px solid rgba(255,255,255,.06)",
                borderRadius: "9px",
                background:
                  "rgba(255,255,255,.02)",
                color:
                  "rgba(255,255,255,.38)",
                fontSize: "10px",
                lineHeight: 1.45,
                wordBreak: "break-word",
              }}
            >
              {text}
            </div>

            <button
              type="button"
              onClick={handleDownload}
              style={{
                width: "100%",
                minHeight: "40px",
                marginTop: "10px",
                border:
                  "1px solid rgba(255,106,0,.35)",
                borderRadius: "10px",
                background:
                  "rgba(255,100,0,.1)",
                color: "#ff9a4d",
                font: "inherit",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ↓ Download PNG
            </button>
          </div>
        )}
      </div>

      <style>{`
        textarea:focus {
          border-color: rgba(255,106,0,.45) !important;
          background: rgba(255,255,255,.04) !important;
        }

        @media (max-width: 760px) {
          .qr-responsive-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default QRCodeGenerator;