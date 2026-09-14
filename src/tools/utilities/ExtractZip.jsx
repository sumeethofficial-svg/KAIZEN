import React, {
  useRef,
  useState,
} from "react";

import {
  extractZip,
  extractZipFile,
} from "../../services/utilities/extractZip.js";

function ExtractZip() {
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [zip, setZip] = useState(null);
  const [entries, setEntries] =
    useState([]);
  const [isLoading, setIsLoading] =
    useState(false);
  const [isExtracting, setIsExtracting] =
    useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] =
    useState(false);

  const handleFile = async (
    selectedFile
  ) => {
    if (!selectedFile) {
      return;
    }

    setError("");
    setIsLoading(true);
    setFile(null);
    setZip(null);
    setEntries([]);

    try {
      const result =
        await extractZip(
          selectedFile
        );

      setFile(selectedFile);
      setZip(result.zip);
      setEntries(result.entries);
    } catch (err) {
      setError(
        err?.message ||
          "Unable to open the ZIP archive."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const downloadEntry = async (
    entry
  ) => {
    if (
      entry.directory ||
      !zip
    ) {
      return;
    }

    setError("");
    setIsExtracting(true);

    try {
      const blob =
        await extractZipFile(
          zip,
          entry.name
        );

      const url =
        URL.createObjectURL(
          blob
        );

      const link =
        document.createElement("a");

      link.href = url;
      link.download =
        entry.name
          .split("/")
          .pop();

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(
          url
        );
      }, 500);
    } catch (err) {
      setError(
        err?.message ||
          "Unable to extract this file."
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const downloadAll = async () => {
    if (!zip) {
      return;
    }

    setError("");
    setIsExtracting(true);

    try {
      for (const entry of entries) {
        if (entry.directory) {
          continue;
        }

        const blob =
          await extractZipFile(
            zip,
            entry.name
          );

        const url =
          URL.createObjectURL(
            blob
          );

        const link =
          document.createElement(
            "a"
          );

        link.href = url;
        link.download =
          entry.name
            .split("/")
            .pop();

        document.body.appendChild(
          link
        );

        link.click();
        link.remove();

        window.setTimeout(() => {
          URL.revokeObjectURL(
            url
          );
        }, 500);

        await new Promise(
          (resolve) =>
            window.setTimeout(
              resolve,
              120
            )
        );
      }
    } catch (err) {
      setError(
        err?.message ||
          "Unable to extract the ZIP archive."
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setZip(null);
    setEntries([]);
    setError("");

    if (inputRef.current) {
      inputRef.current.value =
        "";
    }
  };

  const fileEntries =
    entries.filter(
      (entry) => !entry.directory
    );

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
      {!file && !isLoading && (
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
            accept=".zip,application/zip"
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
              fontSize: "23px",
            }}
          >
            ↓
          </div>

          <strong
            style={{
              fontSize: "15px",
            }}
          >
            Drop your ZIP file here
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

      {isLoading && (
        <div
          style={{
            minHeight: "110px",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
            border:
              "1px solid rgba(255,255,255,.07)",
            borderRadius: "14px",
            background:
              "rgba(255,255,255,.022)",
            color:
              "rgba(255,255,255,.55)",
            fontSize: "12px",
          }}
        >
          Reading ZIP archive...
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
          }}
        >
          {error}
        </div>
      )}

      {file && !isLoading && (
        <div
          style={{
            display: "flex",
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
              display: "flex",
              alignItems: "center",
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
                minWidth: 0,
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
                  fontWeight: 700,
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
                {fileEntries.length}{" "}
                {fileEntries.length ===
                1
                  ? "file"
                  : "files"}{" "}
                inside
              </div>
            </div>

            <button
              type="button"
              onClick={clearFile}
              style={{
                flexShrink: 0,
                minHeight: "32px",
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
              border:
                "1px solid rgba(255,255,255,.07)",
              borderRadius:
                "14px",
              overflow:
                "hidden",
              background:
                "rgba(255,255,255,.018)",
            }}
          >
            <div
              style={{
                padding:
                  "11px 13px",
                borderBottom:
                  "1px solid rgba(255,255,255,.05)",
                fontSize:
                  "9px",
                fontWeight:
                  700,
                letterSpacing:
                  ".13em",
                color:
                  "rgba(255,153,82,.72)",
              }}
            >
              ARCHIVE CONTENT
            </div>

            <div
              style={{
                maxHeight: "280px",
                overflowY:
                  "auto",
              }}
            >
              {entries.map(
                (entry) => (
                  <div
                    key={
                      entry.name
                    }
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "minmax(0,1fr) auto",
                      alignItems:
                        "center",
                      gap: "10px",
                      padding:
                        "9px 12px",
                      borderBottom:
                        "1px solid rgba(255,255,255,.035)",
                    }}
                  >
                    <div
                      style={{
                        minWidth:
                          0,
                        overflow:
                          "hidden",
                        textOverflow:
                          "ellipsis",
                        whiteSpace:
                          "nowrap",
                        color:
                          "rgba(255,255,255,.58)",
                        fontSize:
                          "10px",
                      }}
                    >
                      {entry.directory
                        ? `📁 ${entry.name}`
                        : entry.name}
                    </div>

                    {!entry.directory && (
                      <button
                        type="button"
                        onClick={() =>
                          downloadEntry(
                            entry
                          )
                        }
                        disabled={
                          isExtracting
                        }
                        style={{
                          minHeight:
                            "30px",
                          padding:
                            "0 10px",
                          border:
                            "1px solid rgba(255,106,0,.25)",
                          borderRadius:
                            "8px",
                          background:
                            "rgba(255,100,0,.06)",
                          color:
                            "#ff9a4d",
                          font:
                            "inherit",
                          fontSize:
                            "9px",
                          fontWeight:
                            700,
                          cursor:
                            isExtracting
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            isExtracting
                              ? 0.4
                              : 1,
                        }}
                      >
                        Extract
                      </button>
                    )}
                  </div>
                )
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={
              downloadAll
            }
            disabled={
              isExtracting
            }
            style={{
              minHeight:
                "42px",
              border:
                "1px solid rgba(255,106,0,.38)",
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
                isExtracting
                  ? "not-allowed"
                  : "pointer",
              opacity:
                isExtracting
                  ? 0.55
                  : 1,
            }}
          >
            {isExtracting
              ? "Extracting..."
              : "Extract All"}
          </button>
        </div>
      )}
    </div>
  );
}

export default ExtractZip;