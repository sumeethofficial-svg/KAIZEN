import {
  useMemo,
  useRef,
  useState,
} from "react";

function formatBytes(bytes) {
  if (!bytes) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );

  return `${(
    bytes / Math.pow(1024, index)
  ).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function getFileExtension(name) {
  const lastDot = name.lastIndexOf(".");

  if (lastDot <= 0) {
    return "";
  }

  return name.slice(lastDot);
}

function getBaseName(name) {
  const extension = getFileExtension(name);

  return extension
    ? name.slice(0, -extension.length)
    : name;
}

function BatchRename() {
  const inputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] =
    useState("");
  const [startNumber, setStartNumber] =
    useState(1);
  const [step, setStep] = useState(1);
  const [numberDigits, setNumberDigits] =
    useState(2);

  const [dragActive, setDragActive] =
    useState(false);
  const [copied, setCopied] = useState(false);

  const addFiles = (selectedFiles) => {
    const incoming = Array.from(
      selectedFiles || []
    );

    if (!incoming.length) {
      return;
    }

    setFiles((current) => {
      const existingKeys = new Set(
        current.map(
          (file) =>
            `${file.name}-${file.size}-${file.lastModified}`
        )
      );

      const additions = incoming.filter(
        (file) =>
          !existingKeys.has(
            `${file.name}-${file.size}-${file.lastModified}`
          )
      );

      return [...current, ...additions];
    });
  };

  const handleFileInput = (event) => {
    addFiles(event.target.files);
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);

    addFiles(event.dataTransfer.files);
  };

  const removeFile = (index) => {
    setFiles((current) =>
      current.filter(
        (_, fileIndex) => fileIndex !== index
      )
    );
  };

  const clearFiles = () => {
    setFiles([]);
  };

  const previewNames = useMemo(() => {
    return files.map((file, index) => {
      let baseName = getBaseName(file.name);

      if (findText) {
        baseName = baseName.replaceAll(
          findText,
          replaceText
        );
      }

      const number =
        startNumber + index * step;

      const paddedNumber = String(
        number
      ).padStart(
        Math.max(1, Number(numberDigits) || 1),
        "0"
      );

      const renamed =
        `${prefix}${paddedNumber}${suffix}${getFileExtension(
          file.name
        )}`;

      return {
        original: file.name,
        renamed,
      };
    });
  }, [
    files,
    prefix,
    suffix,
    findText,
    replaceText,
    startNumber,
    step,
    numberDigits,
  ]);

  const copyPreview = async () => {
    if (!previewNames.length) {
      return;
    }

    const text = previewNames
      .map(
        (item) =>
          `${item.original} → ${item.renamed}`
      )
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      setCopied(false);
    }
  };

  const resetAll = () => {
    setFiles([]);
    setPrefix("");
    setSuffix("");
    setFindText("");
    setReplaceText("");
    setStartNumber(1);
    setStep(1);
    setNumberDigits(2);
  };

  const inputStyle = {
    width: "100%",
    height: "42px",
    boxSizing: "border-box",
    borderRadius: "10px",
    border:
      "1px solid rgba(255,255,255,.09)",
    background:
      "rgba(255,255,255,.035)",
    color: "rgba(255,255,255,.9)",
    padding: "0 12px",
    outline: "none",
    font: "inherit",
    fontSize: "12px",
  };

  const smallButtonStyle = {
    border:
      "1px solid rgba(255,255,255,.08)",
    background:
      "rgba(255,255,255,.045)",
    color:
      "rgba(255,255,255,.76)",
    borderRadius: "9px",
    padding: "8px 11px",
    font: "inherit",
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer",
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
      {files.length === 0 ? (
        <div
          onClick={() =>
            inputRef.current?.click()
          }
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() =>
            setDragActive(false)
          }
          onDrop={handleDrop}
          style={{
            minHeight: "190px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: "10px",
            padding: "28px",
            boxSizing: "border-box",
            border:
              `1px dashed ${
                dragActive
                  ? "rgba(255,106,0,.65)"
                  : "rgba(255,255,255,.12)"
              }`,
            borderRadius: "18px",
            background:
              dragActive
                ? "rgba(255,106,0,.07)"
                : "rgba(255,255,255,.025)",
            cursor: "pointer",
            transition:
              "border-color .18s ease, background .18s ease",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border:
                "1px solid rgba(255,106,0,.28)",
              borderRadius: "14px",
              background:
                "rgba(255,106,0,.06)",
              color: "#ff7a18",
              fontSize: "22px",
            }}
          >
            ✎
          </div>

          <strong
            style={{
              fontSize: "15px",
              color:
                "rgba(255,255,255,.9)",
            }}
          >
            Drop files here
          </strong>

          <span
            style={{
              fontSize: "12px",
              color:
                "rgba(255,255,255,.38)",
            }}
          >
            or click to select multiple
            files
          </span>

          <span
            style={{
              marginTop: "2px",
              fontSize: "10px",
              color:
                "rgba(255,255,255,.22)",
            }}
          >
            Any file type
          </span>
        </div>
      ) : (
        <div
          style={{
            border:
              "1px solid rgba(255,255,255,.08)",
            borderRadius: "16px",
            background:
              "rgba(255,255,255,.025)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent:
                "space-between",
              gap: "12px",
              padding: "13px 15px",
              borderBottom:
                "1px solid rgba(255,255,255,.06)",
            }}
          >
            <div>
              <strong
                style={{
                  fontSize: "12px",
                }}
              >
                {files.length} file
                {files.length === 1
                  ? ""
                  : "s"} selected
              </strong>

              <div
                style={{
                  marginTop: "3px",
                  fontSize: "10px",
                  color:
                    "rgba(255,255,255,.32)",
                }}
              >
                {formatBytes(
                  files.reduce(
                    (sum, file) =>
                      sum + file.size,
                    0
                  )
                )}{" "}
                total
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "7px",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  inputRef.current?.click()
                }
                style={smallButtonStyle}
              >
                + Add Files
              </button>

              <button
                type="button"
                onClick={clearFiles}
                style={{
                  ...smallButtonStyle,
                  color:
                    "rgba(255,150,130,.8)",
                }}
              >
                Clear
              </button>
            </div>
          </div>

          <div
            style={{
              maxHeight: "220px",
              overflowY: "auto",
            }}
          >
            {files.map((file, index) => (
              <div
                key={`${file.name}-${file.lastModified}-${index}`}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "34px minmax(0,1fr) auto",
                  alignItems: "center",
                  gap: "10px",
                  padding:
                    "10px 14px",
                  borderBottom:
                    index === files.length - 1
                      ? "none"
                      : "1px solid rgba(255,255,255,.045)",
                }}
              >
                <div
                  style={{
                    width: "30px",
                    height: "30px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "center",
                    borderRadius: "8px",
                    background:
                      "rgba(255,255,255,.045)",
                    color:
                      "rgba(255,255,255,.4)",
                    fontSize: "10px",
                    fontWeight: 700,
                  }}
                >
                  {String(
                    index + 1
                  ).padStart(2, "0")}
                </div>

                <div
                  style={{
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      overflow: "hidden",
                      textOverflow:
                        "ellipsis",
                      whiteSpace:
                        "nowrap",
                      fontSize: "12px",
                      color:
                        "rgba(255,255,255,.78)",
                    }}
                  >
                    {file.name}
                  </div>

                  <div
                    style={{
                      marginTop: "3px",
                      fontSize: "9px",
                      color:
                        "rgba(255,255,255,.28)",
                    }}
                  >
                    {formatBytes(
                      file.size
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    removeFile(index)
                  }
                  aria-label={`Remove ${file.name}`}
                  style={{
                    width: "28px",
                    height: "28px",
                    border: 0,
                    borderRadius:
                      "7px",
                    background:
                      "rgba(255,255,255,.045)",
                    color:
                      "rgba(255,255,255,.38)",
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleFileInput}
        style={{
          display: "none",
        }}
      />

      {files.length > 0 && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2, minmax(0, 1fr))",
              gap: "12px",
              marginTop: "14px",
            }}
          >
            <div
              style={{
                border:
                  "1px solid rgba(255,255,255,.07)",
                borderRadius: "14px",
                padding: "15px",
                background:
                  "rgba(255,255,255,.022)",
              }}
            >
              <div
                style={{
                  marginBottom: "12px",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing:
                    ".12em",
                  textTransform:
                    "uppercase",
                  color:
                    "rgba(255,153,82,.7)",
                }}
              >
                Rename Pattern
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: "10px",
                }}
              >
                <label
                  style={{
                    fontSize: "10px",
                    color:
                      "rgba(255,255,255,.4)",
                  }}
                >
                  Prefix
                  <input
                    value={prefix}
                    onChange={(event) =>
                      setPrefix(
                        event.target.value
                      )
                    }
                    placeholder="IMG_"
                    style={{
                      ...inputStyle,
                      marginTop: "6px",
                    }}
                  />
                </label>

                <label
                  style={{
                    fontSize: "10px",
                    color:
                      "rgba(255,255,255,.4)",
                  }}
                >
                  Suffix
                  <input
                    value={suffix}
                    onChange={(event) =>
                      setSuffix(
                        event.target.value
                      )
                    }
                    placeholder="_final"
                    style={{
                      ...inputStyle,
                      marginTop: "6px",
                    }}
                  />
                </label>
              </div>
            </div>

            <div
              style={{
                border:
                  "1px solid rgba(255,255,255,.07)",
                borderRadius: "14px",
                padding: "15px",
                background:
                  "rgba(255,255,255,.022)",
              }}
            >
              <div
                style={{
                  marginBottom: "12px",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing:
                    ".12em",
                  textTransform:
                    "uppercase",
                  color:
                    "rgba(255,153,82,.7)",
                }}
              >
                Replace Text
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: "10px",
                }}
              >
                <input
                  value={findText}
                  onChange={(event) =>
                    setFindText(
                      event.target.value
                    )
                  }
                  placeholder="Find"
                  style={inputStyle}
                />

                <input
                  value={replaceText}
                  onChange={(event) =>
                    setReplaceText(
                      event.target.value
                    )
                  }
                  placeholder="Replace"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, minmax(0, 1fr))",
              gap: "12px",
              marginTop: "12px",
            }}
          >
            <label
              style={{
                border:
                  "1px solid rgba(255,255,255,.07)",
                borderRadius: "14px",
                padding: "14px",
                background:
                  "rgba(255,255,255,.022)",
                fontSize: "10px",
                color:
                  "rgba(255,255,255,.4)",
              }}
            >
              Start Number
              <input
                type="number"
                min="0"
                value={startNumber}
                onChange={(event) =>
                  setStartNumber(
                    Number(
                      event.target.value
                    ) || 0
                  )
                }
                style={{
                  ...inputStyle,
                  marginTop: "6px",
                }}
              />
            </label>

            <label
              style={{
                border:
                  "1px solid rgba(255,255,255,.07)",
                borderRadius: "14px",
                padding: "14px",
                background:
                  "rgba(255,255,255,.022)",
                fontSize: "10px",
                color:
                  "rgba(255,255,255,.4)",
              }}
            >
              Step
              <input
                type="number"
                min="1"
                value={step}
                onChange={(event) =>
                  setStep(
                    Math.max(
                      1,
                      Number(
                        event.target.value
                      ) || 1
                    )
                  )
                }
                style={{
                  ...inputStyle,
                  marginTop: "6px",
                }}
              />
            </label>

            <label
              style={{
                border:
                  "1px solid rgba(255,255,255,.07)",
                borderRadius: "14px",
                padding: "14px",
                background:
                  "rgba(255,255,255,.022)",
                fontSize: "10px",
                color:
                  "rgba(255,255,255,.4)",
              }}
            >
              Number Digits
              <input
                type="number"
                min="1"
                max="8"
                value={numberDigits}
                onChange={(event) =>
                  setNumberDigits(
                    Math.min(
                      8,
                      Math.max(
                        1,
                        Number(
                          event.target
                            .value
                        ) || 1
                      )
                    )
                  )
                }
                style={{
                  ...inputStyle,
                  marginTop: "6px",
                }}
              />
            </label>
          </div>

          <div
            style={{
              marginTop: "14px",
              border:
                "1px solid rgba(255,255,255,.07)",
              borderRadius: "14px",
              background:
                "rgba(255,255,255,.022)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "space-between",
                padding:
                  "13px 15px",
                borderBottom:
                  "1px solid rgba(255,255,255,.055)",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing:
                      ".12em",
                    color:
                      "rgba(255,153,82,.7)",
                  }}
                >
                  PREVIEW
                </div>

                <div
                  style={{
                    marginTop: "4px",
                    fontSize: "11px",
                    color:
                      "rgba(255,255,255,.32)",
                  }}
                >
                  Review the new filenames
                  before downloading.
                </div>
              </div>

              <button
                type="button"
                onClick={copyPreview}
                style={smallButtonStyle}
              >
                {copied
                  ? "✓ Copied"
                  : "Copy Preview"}
              </button>
            </div>

            <div
              style={{
                maxHeight: "250px",
                overflowY: "auto",
              }}
            >
              {previewNames.map(
                (item, index) => (
                  <div
                    key={`${item.original}-${index}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "1fr auto 1fr",
                      alignItems: "center",
                      gap: "12px",
                      padding:
                        "10px 15px",
                      borderBottom:
                        index ===
                        previewNames.length - 1
                          ? "none"
                          : "1px solid rgba(255,255,255,.04)",
                    }}
                  >
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow:
                          "ellipsis",
                        whiteSpace:
                          "nowrap",
                        fontSize: "11px",
                        color:
                          "rgba(255,255,255,.43)",
                      }}
                    >
                      {item.original}
                    </span>

                    <span
                      style={{
                        color:
                          "rgba(255,153,82,.65)",
                        fontSize:
                          "12px",
                      }}
                    >
                      →
                    </span>

                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow:
                          "ellipsis",
                        whiteSpace:
                          "nowrap",
                        fontSize: "11px",
                        color:
                          "rgba(255,255,255,.82)",
                      }}
                    >
                      {item.renamed}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent:
                "flex-end",
              gap: "9px",
              marginTop: "14px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={resetAll}
              style={{
                ...smallButtonStyle,
                padding:
                  "10px 15px",
              }}
            >
              Reset
            </button>

            <button
              type="button"
              onClick={
                copyPreview
              }
              style={{
                minHeight: "40px",
                padding:
                  "0 16px",
                border: 0,
                borderRadius:
                  "10px",
                background:
                  "linear-gradient(135deg,#ff7600,#ff4d00)",
                color: "#fff",
                font: "inherit",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow:
                  "0 8px 24px rgba(255,91,0,.18)",
              }}
            >
              {copied
                ? "✓ Preview Copied"
                : "Copy Renaming Plan"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default BatchRename;