import React, { useState } from "react";
import {
  encodeBase64,
  decodeBase64,
} from "../../services/utilities/base64.js";

function Base64() {
  const [mode, setMode] = useState("encode");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const handleProcess = () => {
    if (!input.trim()) {
      setError(
        mode === "encode"
          ? "Please enter some text to encode."
          : "Please enter Base64 data to decode."
      );

      setOutput("");
      return;
    }

    setError("");

    try {
      const result =
        mode === "encode"
          ? encodeBase64(input)
          : decodeBase64(input);

      setOutput(result);
    } catch (err) {
      console.error("Base64 processing error:", err);

      setOutput("");
      setError(
        err?.message || "Failed to process the Base64 data."
      );
    }
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setInput("");
    setOutput("");
    setError("");
  };

  const handleClear = () => {
    setInput("");
    setOutput("");
    setError("");
  };

  const handleCopy = async () => {
    if (!output) {
      return;
    }

    try {
      await navigator.clipboard.writeText(output);

      setError("");
    } catch (err) {
      console.error("Copy failed:", err);
      setError("Could not copy the result.");
    }
  };

  const handleSwap = () => {
    if (!output) {
      return;
    }

    setInput(output);
    setOutput("");
    setError("");

    setMode(
      mode === "encode"
        ? "decode"
        : "encode"
    );
  };

  const handleKeyDown = (event) => {
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key === "Enter"
    ) {
      handleProcess();
    }
  };

  return (
    <div className="base64-tool">
      <div className="base64-mode-switch">
        <button
          type="button"
          className={
            mode === "encode"
              ? "base64-mode active"
              : "base64-mode"
          }
          onClick={() => handleModeChange("encode")}
        >
          Encode
        </button>

        <button
          type="button"
          className={
            mode === "decode"
              ? "base64-mode active"
              : "base64-mode"
          }
          onClick={() => handleModeChange("decode")}
        >
          Decode
        </button>
      </div>

      <div className="base64-input-section">
        <div className="base64-label-row">
          <label className="base64-label">
            {mode === "encode"
              ? "Text"
              : "Base64 data"}
          </label>

          <span className="base64-count">
            {input.length.toLocaleString()} characters
          </span>
        </div>

        <textarea
          className="base64-textarea"
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setOutput("");
            setError("");
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            mode === "encode"
              ? "Enter text to encode..."
              : "Paste Base64 data to decode..."
          }
        />
      </div>

      {error && (
        <div className="base64-error">
          {error}
        </div>
      )}

      <div className="base64-actions">
        <button
          type="button"
          className="base64-process-button"
          onClick={handleProcess}
        >
          {mode === "encode"
            ? "Encode to Base64"
            : "Decode Base64"}
        </button>

        {input && (
          <button
            type="button"
            className="base64-clear-button"
            onClick={handleClear}
          >
            Clear
          </button>
        )}
      </div>

      {output && (
        <div className="base64-result">
          <div className="base64-result-header">
            <span>
              {mode === "encode"
                ? "Encoded Result"
                : "Decoded Result"}
            </span>

            <span className="base64-result-count">
              {output.length.toLocaleString()} characters
            </span>
          </div>

          <textarea
            className="base64-result-textarea"
            value={output}
            readOnly
          />

          <div className="base64-result-actions">
            <button
              type="button"
              className="base64-copy-button"
              onClick={handleCopy}
            >
              Copy Result
            </button>

            <button
              type="button"
              className="base64-swap-button"
              onClick={handleSwap}
            >
              Use as {mode === "encode" ? "Decode" : "Encode"} Input
            </button>
          </div>
        </div>
      )}

      <div className="base64-hint">
        Supports Unicode text. Press Ctrl + Enter to process.
      </div>

      <style>{`
        .base64-tool {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          color: #fff;
        }

        .base64-mode-switch {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          padding: 4px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 11px;
          background: rgba(255,255,255,.025);
        }

        .base64-mode {
          padding: 10px;
          border: 1px solid transparent;
          border-radius: 8px;
          background: transparent;
          color: rgba(255,255,255,.4);
          font-size: 12px;
          cursor: pointer;
          transition:
            background .2s ease,
            color .2s ease,
            border-color .2s ease;
        }

        .base64-mode:hover {
          color: rgba(255,255,255,.75);
        }

        .base64-mode.active {
          border-color: rgba(255,120,0,.35);
          background: rgba(255,100,0,.1);
          color: #ff9a4d;
        }

        .base64-input-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .base64-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .base64-label {
          color: rgba(255,255,255,.5);
          font-size: 11px;
        }

        .base64-count {
          color: rgba(255,255,255,.25);
          font-size: 10px;
        }

        .base64-textarea,
        .base64-result-textarea {
          width: 100%;
          box-sizing: border-box;
          min-height: 220px;
          resize: vertical;
          padding: 14px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 11px;
          outline: none;
          background: rgba(255,255,255,.035);
          color: #fff;
          font-family: "Consolas", "Courier New", monospace;
          font-size: 12px;
          line-height: 1.6;
        }

        .base64-textarea::placeholder {
          color: rgba(255,255,255,.25);
        }

        .base64-textarea:focus {
          border-color: rgba(255,120,0,.55);
          background: rgba(255,255,255,.045);
        }

        .base64-error {
          padding: 13px 15px;
          border: 1px solid rgba(255,70,70,.3);
          border-radius: 10px;
          background: rgba(255,50,50,.06);
          color: #ff9292;
          font-size: 13px;
        }

        .base64-actions {
          display: flex;
          gap: 10px;
        }

        .base64-process-button {
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

        .base64-process-button:hover {
          background: rgba(255,100,0,.18);
          border-color: rgba(255,120,0,.75);
        }

        .base64-clear-button {
          padding: 13px 22px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 10px;
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.65);
          cursor: pointer;
        }

        .base64-clear-button:hover {
          background: rgba(255,255,255,.07);
          color: #fff;
        }

        .base64-result {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 16px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 12px;
          background: rgba(255,255,255,.025);
        }

        .base64-result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: rgba(255,255,255,.55);
          font-size: 11px;
        }

        .base64-result-count {
          color: rgba(255,255,255,.25);
          font-size: 10px;
        }

        .base64-result-textarea {
          min-height: 180px;
          background: rgba(0,0,0,.18);
          color: #ffb06d;
        }

        .base64-result-actions {
          display: flex;
          gap: 10px;
        }

        .base64-copy-button,
        .base64-swap-button {
          flex: 1;
          padding: 11px;
          border: 1px solid rgba(255,120,0,.4);
          border-radius: 9px;
          background: rgba(255,100,0,.08);
          color: #ff9a4d;
          font-size: 11px;
          cursor: pointer;
        }

        .base64-copy-button:hover,
        .base64-swap-button:hover {
          background: rgba(255,100,0,.15);
          border-color: rgba(255,120,0,.65);
        }

        .base64-hint {
          color: rgba(255,255,255,.25);
          font-size: 10px;
          text-align: center;
        }

        @media (max-width: 600px) {
          .base64-actions,
          .base64-result-actions {
            flex-direction: column;
          }

          .base64-clear-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default Base64;