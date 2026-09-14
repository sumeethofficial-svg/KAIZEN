import React, {
  useRef,
  useState,
} from "react";

import {
  getFileMetadata,
} from "../../services/utilities/fileMetadata.js";

function FileMetadata() {
  const inputRef = useRef(null);

  const [file, setFile] =
    useState(null);
  const [metadata, setMetadata] =
    useState(null);
  const [error, setError] =
    useState("");
  const [dragActive, setDragActive] =
    useState(false);

  const handleFile = (
    selectedFile
  ) => {
    if (!selectedFile) {
      return;
    }

    setError("");

    try {
      const result =
        getFileMetadata(
          selectedFile
        );

      setFile(selectedFile);
      setMetadata(result);
    } catch (err) {
      setError(
        err?.message ||
          "Unable to inspect this file."
      );
    }
  };

  const clearFile = () => {
    setFile(null);
    setMetadata(null);
    setError("");

    if (inputRef.current) {
      inputRef.current.value =
        "";
    }
  };

  const metadataItems = metadata
    ? [
        [
          "File Name",
          metadata.name,
        ],
        [
          "Extension",
          metadata.extension,
        ],
        [
          "File Type",
          metadata.type,
        ],
        [
          "Size",
          metadata.formattedSize,
        ],
        [
          "Last Modified",
          metadata.lastModifiedDate,
        ],
        [
          "Raw Size",
          `${metadata.size.toLocaleString()} bytes`,
        ],
      ]
    : [];

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
      {!file && (
        <div
          onClick={() =>
            inputRef.current?.click()
          }
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);

            handleFile(
              event.dataTransfer?.files?.[0]
            );
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() =>
            setDragActive(false)
          }
          style={{
            minHeight: "190px",
            display: "flex",
            flexDirection:
              "column",
            alignItems: "center",
            justifyContent:
              "center",
            gap: "9px",
            padding: "24px",
            boxSizing:
              "border-box",
            border:
              `1px dashed ${
                dragActive
                  ? "rgba(255,106,0,.65)"
                  : "rgba(255,255,255,.12)"
              }`,
            borderRadius: "17px",
            background:
              dragActive
                ? "rgba(255,106,0,.065)"
                : "rgba(255,255,255,.022)",
            cursor: "pointer",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            hidden
            onChange={(event) =>
              handleFile(
                event.target.files?.[0]
              )
            }
          />

          <div
            style={{
              width: "46px",
              height: "46px",
              display: "flex",
              alignItems: "center",
              justifyContent:
                "center",
              border:
                "1px solid rgba(255,106,0,.28)",
              borderRadius: "13px",
              background:
                "rgba(255,106,0,.05)",
              color: "#ff8a3d",
              fontSize: "21px",
            }}
          >
            ⓘ
          </div>

          <strong
            style={{
              fontSize: "15px",
            }}
          >
            Drop your file here
          </strong>

          <span
            style={{
              fontSize: "11px",
              color:
                "rgba(255,255,255,.34)",
            }}
          >
            or click to browse
          </span>
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: "10px",
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
            fontSize:
              "11px",
            lineHeight:
              1.5,
          }}
        >
          {error}
        </div>
      )}

      {file && metadata && (
        <div
          style={{
            display:
              "flex",
            flexDirection:
              "column",
            gap: "10px",
            marginTop:
              error
                ? "10px"
                : "0",
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
              gap: "12px",
              padding:
                "12px 14px",
              border:
                "1px solid rgba(255,255,255,.08)",
              borderRadius:
                "13px",
              background:
                "rgba(255,255,255,.022)",
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
                  overflow:
                    "hidden",
                  textOverflow:
                    "ellipsis",
                  whiteSpace:
                    "nowrap",
                  fontSize:
                    "12px",
                  fontWeight:
                    700,
                }}
              >
                {file.name}
              </div>

              <div
                style={{
                  marginTop:
                    "3px",
                  fontSize:
                    "9px",
                  color:
                    "rgba(255,255,255,.3)",
                }}
              >
                {metadata.type}
              </div>
            </div>

            <button
              type="button"
              onClick={
                clearFile
              }
              style={{
                flexShrink:
                  0,
                minHeight:
                  "32px",
                padding:
                  "0 11px",
                border:
                  "1px solid rgba(255,255,255,.08)",
                borderRadius:
                  "8px",
                background:
                  "rgba(255,255,255,.035)",
                color:
                  "rgba(255,255,255,.58)",
                font:
                  "inherit",
                fontSize:
                  "10px",
                cursor:
                  "pointer",
              }}
            >
              Remove
            </button>
          </div>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(2, minmax(0,1fr))",
              gap:
                "9px",
            }}
          >
            {metadataItems.map(
              ([label, value]) => (
                <div
                  key={label}
                  style={{
                    minWidth:
                      0,
                    padding:
                      "13px",
                    border:
                      "1px solid rgba(255,255,255,.07)",
                    borderRadius:
                      "11px",
                    background:
                      "rgba(255,255,255,.018)",
                  }}
                >
                  <span
                    style={{
                      display:
                        "block",
                      fontSize:
                        "8px",
                      fontWeight:
                        700,
                      letterSpacing:
                        ".11em",
                      textTransform:
                        "uppercase",
                      color:
                        "rgba(255,153,82,.65)",
                    }}
                  >
                    {label}
                  </span>

                  <strong
                    style={{
                      display:
                        "block",
                      marginTop:
                        "7px",
                      overflow:
                        "hidden",
                      textOverflow:
                        "ellipsis",
                      whiteSpace:
                        "nowrap",
                      color:
                        "rgba(255,255,255,.76)",
                      fontSize:
                        "11px",
                      fontWeight:
                        500,
                    }}
                    title={
                      String(
                        value
                      )
                    }
                  >
                    {value}
                  </strong>
                </div>
              )
            )}
          </div>

          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap:
                "10px",
              padding:
                "11px 13px",
              border:
                "1px solid rgba(255,255,255,.06)",
              borderRadius:
                "10px",
              background:
                "rgba(255,255,255,.015)",
              color:
                "rgba(255,255,255,.28)",
              fontSize:
                "9px",
            }}
          >
            <span>
              Metadata inspected locally
            </span>

            <span>
              {file.type ||
                "Unknown MIME type"}
            </span>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 600px) {
          .metadata-grid-responsive {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default FileMetadata;