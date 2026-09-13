import React, { useState } from "react";
import { generateQRCode } from "../../services/utilities/qrCodeGenerator.js";

function QRCodeGenerator() {
  const [text, setText] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError("Please enter some text or a link.");
      setQrCode("");
      return;
    }

    setError("");
    setIsGenerating(true);

    try {
      const result = await generateQRCode(text, {
        width: 320,
        margin: 2,
        errorCorrectionLevel: "M",
      });

      setQrCode(result.dataUrl);
    } catch (err) {
      console.error("QR code generation failed:", err);

      setError(
        err?.message || "Failed to generate the QR code."
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

    const link = document.createElement("a");

    link.href = qrCode;
    link.download = "kaizen-qr-code.png";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      handleGenerate();
    }
  };

  return (
    <div className="qr-generator-tool">
      <div className="qr-input-section">
        <label className="qr-label">
          Text or link
        </label>

        <textarea
          className="qr-input"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setError("");
          }}
          onKeyDown={handleKeyDown}
          placeholder="Enter text, URL, email, phone number, or any other content..."
          rows={5}
        />

        <div className="qr-input-hint">
          Press Ctrl + Enter to generate
        </div>
      </div>

      {error && (
        <div className="qr-error">
          {error}
        </div>
      )}

      <div className="qr-actions">
        <button
          type="button"
          className="qr-generate-button"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating
            ? "Generating..."
            : "Generate QR Code"}
        </button>

        {text && (
          <button
            type="button"
            className="qr-clear-button"
            onClick={handleClear}
          >
            Clear
          </button>
        )}
      </div>

      {qrCode && (
        <div className="qr-result">
          <div className="qr-result-header">
            <span>Generated QR Code</span>
          </div>

          <div className="qr-preview">
            <img
              src={qrCode}
              alt="Generated QR code"
              className="qr-image"
            />
          </div>

          <div className="qr-result-text">
            {text}
          </div>

          <button
            type="button"
            className="qr-download-button"
            onClick={handleDownload}
          >
            Download PNG
          </button>
        </div>
      )}

      <style>{`
        .qr-generator-tool {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          color: #fff;
        }

        .qr-input-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .qr-label {
          color: rgba(255,255,255,.5);
          font-size: 11px;
        }

        .qr-input {
          width: 100%;
          min-height: 130px;
          box-sizing: border-box;
          resize: vertical;
          padding: 13px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 10px;
          outline: none;
          background: rgba(255,255,255,.04);
          color: #fff;
          font-family: inherit;
          font-size: 13px;
          line-height: 1.5;
        }

        .qr-input::placeholder {
          color: rgba(255,255,255,.28);
        }

        .qr-input:focus {
          border-color: rgba(255,120,0,.55);
          background: rgba(255,255,255,.05);
        }

        .qr-input-hint {
          color: rgba(255,255,255,.25);
          font-size: 10px;
        }

        .qr-error {
          padding: 13px 15px;
          border: 1px solid rgba(255,70,70,.3);
          border-radius: 10px;
          background: rgba(255,50,50,.06);
          color: #ff9292;
          font-size: 13px;
        }

        .qr-actions {
          display: flex;
          gap: 10px;
        }

        .qr-generate-button {
          flex: 1;
          padding: 13px;
          border: 1px solid rgba(255,120,0,.55);
          border-radius: 10px;
          background: rgba(255,100,0,.12);
          color: #ff9a4d;
          font-weight: 600;
          cursor: pointer;
          transition:
            background .2s ease,
            border-color .2s ease;
        }

        .qr-generate-button:hover:not(:disabled) {
          background: rgba(255,100,0,.18);
          border-color: rgba(255,120,0,.75);
        }

        .qr-generate-button:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .qr-clear-button {
          padding: 13px 22px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 10px;
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.65);
          cursor: pointer;
        }

        .qr-clear-button:hover {
          background: rgba(255,255,255,.07);
          color: #fff;
        }

        .qr-result {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          padding: 20px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 14px;
          background: rgba(255,255,255,.025);
        }

        .qr-result-header {
          align-self: stretch;
          color: rgba(255,255,255,.55);
          font-size: 11px;
        }

        .qr-preview {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          border-radius: 10px;
          background: #fff;
        }

        .qr-image {
          display: block;
          width: 320px;
          height: 320px;
          max-width: 100%;
          object-fit: contain;
        }

        .qr-result-text {
          width: 100%;
          box-sizing: border-box;
          padding: 10px 12px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 8px;
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.45);
          font-size: 11px;
          line-height: 1.5;
          word-break: break-word;
          text-align: center;
        }

        .qr-download-button {
          width: 100%;
          padding: 12px;
          border: 1px solid rgba(255,120,0,.45);
          border-radius: 9px;
          background: rgba(255,100,0,.1);
          color: #ff9a4d;
          font-weight: 600;
          cursor: pointer;
        }

        .qr-download-button:hover {
          background: rgba(255,100,0,.17);
          border-color: rgba(255,120,0,.7);
        }

        @media (max-width: 600px) {
          .qr-actions {
            flex-direction: column;
          }

          .qr-clear-button {
            width: 100%;
          }

          .qr-image {
            width: 260px;
            height: 260px;
          }
        }
      `}</style>
    </div>
  );
}

export default QRCodeGenerator;