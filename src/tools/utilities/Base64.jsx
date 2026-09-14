import React, { useState } from "react";
import {
  encodeBase64,
  decodeBase64,
} from "../../services/utilities/base64.js";

function Base64() {
  const [mode, setMode] =
    useState("encode");
  const [input, setInput] = useState("");
  const [output, setOutput] =
    useState("");
  const [error, setError] =
    useState("");

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
      console.error(
        "Base64 processing error:",
        err
      );

      setOutput("");

      setError(
        err?.message ||
          "Failed to process the Base64 data."
      );
    }
  };

  const handleModeChange = (
    newMode
  ) => {
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
      await navigator.clipboard.writeText(
        output
      );

      setError("");
    } catch (err) {
      console.error(
        "Copy failed:",
        err
      );

      setError(
        "Could not copy the result."
      );
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
      (event.ctrlKey ||
        event.metaKey) &&
      event.key === "Enter"
    ) {
      handleProcess();
    }
  };

  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "20px 24px 30px",
        color:
          "rgba(255,255,255,.94)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "13px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: "5px",
            padding: "4px",
            border:
              "1px solid rgba(255,255,255,.08)",
            borderRadius: "11px",
            background:
              "rgba(255,255,255,.022)",
          }}
        >
          <button
            type="button"
            onClick={() =>
              handleModeChange(
                "encode"
              )
            }
            style={{
              minHeight: "38px",
              border:
                mode === "encode"
                  ? "1px solid rgba(255,106,0,.32)"
                  : "1px solid transparent",
              borderRadius: "8px",
              background:
                mode === "encode"
                  ? "rgba(255,100,0,.09)"
                  : "transparent",
              color:
                mode === "encode"
                  ? "#ff9a4d"
                  : "rgba(255,255,255,.4)",
              font:
                "inherit",
              fontSize:
                "11px",
              fontWeight:
                700,
              cursor:
                "pointer",
            }}
          >
            Encode
          </button>

          <button
            type="button"
            onClick={() =>
              handleModeChange(
                "decode"
              )
            }
            style={{
              minHeight: "38px",
              border:
                mode === "decode"
                  ? "1px solid rgba(255,106,0,.32)"
                  : "1px solid transparent",
              borderRadius: "8px",
              background:
                mode === "decode"
                  ? "rgba(255,100,0,.09)"
                  : "transparent",
              color:
                mode === "decode"
                  ? "#ff9a4d"
                  : "rgba(255,255,255,.4)",
              font:
                "inherit",
              fontSize:
                "11px",
              fontWeight:
                700,
              cursor:
                "pointer",
            }}
          >
            Decode
          </button>
        </div>

        <div
          style={{
            border:
              "1px solid rgba(255,255,255,.08)",
            borderRadius: "15px",
            padding: "15px",
            background:
              "rgba(255,255,255,.022)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent:
                "space-between",
              gap: "10px",
              marginBottom: "9px",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing:
                  ".13em",
                color:
                  "rgba(255,153,82,.72)",
              }}
            >
              {mode === "encode"
                ? "INPUT TEXT"
                : "BASE64 INPUT"}
            </span>

            <span
              style={{
                fontSize: "10px",
                color:
                  "rgba(255,255,255,.24)",
              }}
            >
              {input.length.toLocaleString()}{" "}
              characters
            </span>
          </div>

          <textarea
            value={input}
            onChange={(event) => {
              setInput(
                event.target.value
              );
              setOutput("");
              setError("");
            }}
            onKeyDown={
              handleKeyDown
            }
            placeholder={
              mode === "encode"
                ? "Enter text to encode..."
                : "Paste Base64 data to decode..."
            }
            style={{
              width: "100%",
              minHeight: "185px",
              boxSizing: "border-box",
              resize: "vertical",
              padding: "13px",
              border:
                "1px solid rgba(255,255,255,.08)",
              borderRadius:
                "11px",
              outline: "none",
              background:
                "rgba(0,0,0,.12)",
              color: "#fff",
              fontFamily:
                "Consolas, 'Courier New', monospace",
              fontSize: "12px",
              lineHeight: 1.6,
            }}
          />
        </div>

        {error && (
          <div
            style={{
              padding:
                "10px 12px",
              border:
                "1px solid rgba(255,70,70,.22)",
              borderRadius:
                "9px",
              background:
                "rgba(255,50,50,.06)",
              color:
                "#ff9c9c",
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
            gap: "8px",
          }}
        >
          <button
            type="button"
            onClick={
              handleProcess
            }
            style={{
              flex: 1,
              minHeight: "42px",
              border:
                "1px solid rgba(255,106,0,.35)",
              borderRadius:
                "10px",
              background:
                "linear-gradient(135deg, rgba(255,118,0,.18), rgba(255,77,0,.1))",
              color:
                "#ff9a4d",
              font:
                "inherit",
              fontSize:
                "11px",
              fontWeight:
                700,
              cursor:
                "pointer",
            }}
          >
            {mode === "encode"
              ? "Encode to Base64"
              : "Decode Base64"}
          </button>

          {input && (
            <button
              type="button"
              onClick={
                handleClear
              }
              style={{
                minHeight:
                  "42px",
                padding:
                  "0 14px",
                border:
                  "1px solid rgba(255,255,255,.08)",
                borderRadius:
                  "10px",
                background:
                  "rgba(255,255,255,.04)",
                color:
                  "rgba(255,255,255,.62)",
                font:
                  "inherit",
                fontSize:
                  "11px",
                fontWeight:
                  600,
                cursor:
                  "pointer",
              }}
            >
              Clear
            </button>
          )}
        </div>

        {output && (
          <div
            style={{
              border:
                "1px solid rgba(255,255,255,.08)",
              borderRadius:
                "15px",
              padding:
                "15px",
              background:
                "rgba(255,255,255,.022)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
                gap: "10px",
                marginBottom:
                  "9px",
              }}
            >
              <span
                style={{
                  fontSize:
                    "10px",
                  fontWeight:
                    700,
                  letterSpacing:
                    ".13em",
                  color:
                    "rgba(255,153,82,.72)",
                }}
              >
                {mode === "encode"
                  ? "ENCODED RESULT"
                  : "DECODED RESULT"}
              </span>

              <span
                style={{
                  fontSize:
                    "10px",
                  color:
                    "rgba(255,255,255,.24)",
                }}
              >
                {output.length.toLocaleString()}{" "}
                characters
              </span>
            </div>

            <textarea
              value={output}
              readOnly
              style={{
                width: "100%",
                minHeight: "155px",
                boxSizing:
                  "border-box",
                resize:
                  "vertical",
                padding:
                  "13px",
                border:
                  "1px solid rgba(255,255,255,.06)",
                borderRadius:
                  "11px",
                outline:
                  "none",
                background:
                  "rgba(0,0,0,.18)",
                color:
                  "#ffb06d",
                fontFamily:
                  "Consolas, 'Courier New', monospace",
                fontSize:
                  "12px",
                lineHeight:
                  1.6,
              }}
            />

            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop:
                  "9px",
              }}
            >
              <button
                type="button"
                onClick={
                  handleCopy
                }
                style={{
                  flex: 1,
                  minHeight:
                    "40px",
                  border:
                    "1px solid rgba(255,106,0,.28)",
                  borderRadius:
                    "9px",
                  background:
                    "rgba(255,100,0,.08)",
                  color:
                    "#ff9a4d",
                  font:
                    "inherit",
                  fontSize:
                    "11px",
                  fontWeight:
                    700,
                  cursor:
                    "pointer",
                }}
              >
                Copy Result
              </button>

              <button
                type="button"
                onClick={
                  handleSwap
                }
                style={{
                  flex: 1,
                  minHeight:
                    "40px",
                  border:
                    "1px solid rgba(255,255,255,.08)",
                  borderRadius:
                    "9px",
                  background:
                    "rgba(255,255,255,.04)",
                  color:
                    "rgba(255,255,255,.68)",
                  font:
                    "inherit",
                  fontSize:
                    "11px",
                  fontWeight:
                    600,
                  cursor:
                    "pointer",
                }}
              >
                Use as{" "}
                {mode === "encode"
                  ? "Decode"
                  : "Encode"}{" "}
                Input
              </button>
            </div>
          </div>
        )}

        <div
          style={{
            textAlign: "center",
            fontSize: "10px",
            color:
              "rgba(255,255,255,.22)",
          }}
        >
          Supports Unicode text · Ctrl +
          Enter to process
        </div>
      </div>

      <style>{`
        textarea:focus {
          border-color: rgba(255,106,0,.45) !important;
          background: rgba(255,255,255,.035) !important;
        }

        @media (max-width: 600px) {
          .base64-actions-responsive {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}

export default Base64;