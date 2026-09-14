import React, {
  useRef,
  useState,
} from "react";

import {
  createZip,
} from "../../services/utilities/createZip.js";

function CreateZip() {
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [isCreating, setIsCreating] =
    useState(false);
  const [error, setError] = useState("");
  const [zipName, setZipName] =
    useState("kaizen-files");
  const [dragActive, setDragActive] =
    useState(false);

  const formatFileSize = (bytes) => {
    if (!bytes) {
      return "0 B";
    }

    const units = [
      "B",
      "KB",
      "MB",
      "GB",
      "TB",
    ];

    const index = Math.min(
      Math.floor(
        Math.log(bytes) / Math.log(1024)
      ),
      units.length - 1
    );

    return `${(
      bytes /
      Math.pow(1024, index)
    ).toFixed(
      index === 0 ? 0 : 1
    )} ${units[index]}`;
  };

  const normalizeFiles = (
    fileList
  ) => {
    if (
      !fileList ||
      fileList.length === 0
    ) {
      return [];
    }

    return Array.from(fileList).map(
      (file) => ({
        file,
        relativePath:
          file.webkitRelativePath ||
          file.name,
      })
    );
  };

  const addFiles = (fileList) => {
    const newFiles =
      normalizeFiles(fileList);

    if (!newFiles.length) {
      return;
    }

    setFiles((currentFiles) => {
      const existing = new Set(
        currentFiles.map(
          (item) =>
            `${item.relativePath}-${item.file.size}-${item.file.lastModified}`
        )
      );

      const additions =
        newFiles.filter(
          (item) =>
            !existing.has(
              `${item.relativePath}-${item.file.size}-${item.file.lastModified}`
            )
        );

      return [
        ...currentFiles,
        ...additions,
      ];
    });

    setError("");
  };

  const collectEntry = async (
    entry,
    parentPath,
    output
  ) => {
    if (entry.isFile) {
      await new Promise(
        (resolve) => {
          entry.file(
            (file) => {
              output.push({
                file,
                relativePath:
                  parentPath +
                  file.name,
              });

              resolve();
            },
            () => resolve()
          );
        }
      );

      return;
    }

    if (entry.isDirectory) {
      const reader =
        entry.createReader();

      const directoryPath =
        `${parentPath}${entry.name}/`;

      const readEntries = () =>
        new Promise((resolve) => {
          reader.readEntries(
            (entries) =>
              resolve(entries),
            () => resolve([])
          );
        });

      const entries = [];

      while (true) {
        const batch =
          await readEntries();

        if (!batch.length) {
          break;
        }

        entries.push(...batch);
      }

      for (const child of entries) {
        await collectEntry(
          child,
          directoryPath,
          output
        );
      }
    }
  };

  const handleDrop = async (
    event
  ) => {
    event.preventDefault();
    setDragActive(false);
    setError("");

    const items =
      event.dataTransfer?.items;

    if (!items) {
      addFiles(
        event.dataTransfer?.files
      );
      return;
    }

    const droppedFiles = [];

    for (const item of Array.from(
      items
    )) {
      if (item.kind !== "file") {
        continue;
      }

      const entry =
        item.webkitGetAsEntry?.();

      if (entry) {
        await collectEntry(
          entry,
          "",
          droppedFiles
        );
      } else {
        const file =
          item.getAsFile?.();

        if (file) {
          droppedFiles.push({
            file,
            relativePath: file.name,
          });
        }
      }
    }

    if (droppedFiles.length) {
      addFiles(
        droppedFiles.map(
          (item) => item.file
        )
      );

      setFiles((current) => {
        const existing = new Set(
          current.map(
            (item) =>
              `${item.relativePath}-${item.file.size}-${item.file.lastModified}`
          )
        );

        const additions =
          droppedFiles.filter(
            (item) =>
              !existing.has(
                `${item.relativePath}-${item.file.size}-${item.file.lastModified}`
              )
          );

        return [
          ...current,
          ...additions,
        ];
      });
    }
  };

  const handleFileInput = (
    event
  ) => {
    addFiles(
      event.target.files
    );

    event.target.value = "";
  };

  const handleFolderInput = (
    event
  ) => {
    addFiles(
      event.target.files
    );

    event.target.value = "";
  };

  const removeFile = (index) => {
    setFiles((current) =>
      current.filter(
        (_, fileIndex) =>
          fileIndex !== index
      )
    );

    setError("");
  };

  const clearFiles = () => {
    setFiles([]);
    setError("");
  };

  const handleCreate = async () => {
    if (!files.length) {
      setError(
        "Please select at least one file or folder."
      );
      return;
    }

    setError("");
    setIsCreating(true);

    try {
      const cleanName =
        zipName
          .trim()
          .replace(/\.zip$/i, "") ||
        "kaizen-files";

      const result =
        await createZip(files, {
          filename:
            `${cleanName}.zip`,
        });

      const url =
        URL.createObjectURL(
          result.blob
        );

      const link =
        document.createElement("a");

      link.href = url;
      link.download =
        result.filename;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (err) {
      console.error(
        "Create ZIP failed:",
        err
      );

      setError(
        err?.message ||
          "Failed to create the ZIP archive."
      );
    } finally {
      setIsCreating(false);
    }
  };

  const totalSize = files.reduce(
    (sum, item) =>
      sum + item.file.size,
    0
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
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={
          handleFileInput
        }
      />

      <input
        ref={folderInputRef}
        type="file"
        multiple
        webkitdirectory=""
        directory=""
        hidden
        onChange={
          handleFolderInput
        }
      />

      {files.length === 0 ? (
        <div
          onDrop={handleDrop}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);

            if (event.dataTransfer) {
              event.dataTransfer.dropEffect =
                "copy";
            }
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
            transition:
              "background .18s ease, border-color .18s ease",
          }}
        >
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
            ▥
          </div>

          <strong
            style={{
              fontSize: "15px",
            }}
          >
            Drop files or folders here
          </strong>

          <span
            style={{
              fontSize: "11px",
              color:
                "rgba(255,255,255,.34)",
            }}
          >
            Build a ZIP archive directly
            in your browser
          </span>

          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "5px",
            }}
          >
            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              style={{
                minHeight: "36px",
                padding: "0 13px",
                border:
                  "1px solid rgba(255,106,0,.3)",
                borderRadius: "9px",
                background:
                  "rgba(255,100,0,.08)",
                color: "#ff9a4d",
                font: "inherit",
                fontSize: "10px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Choose Files
            </button>

            <button
              type="button"
              onClick={() =>
                folderInputRef.current?.click()
              }
              style={{
                minHeight: "36px",
                padding: "0 13px",
                border:
                  "1px solid rgba(255,255,255,.08)",
                borderRadius: "9px",
                background:
                  "rgba(255,255,255,.04)",
                color:
                  "rgba(255,255,255,.65)",
                font: "inherit",
                fontSize: "10px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Choose Folder
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            border:
              "1px solid rgba(255,255,255,.08)",
            borderRadius: "16px",
            overflow: "hidden",
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
              padding:
                "12px 14px",
              borderBottom:
                "1px solid rgba(255,255,255,.055)",
            }}
          >
            <div>
              <strong
                style={{
                  fontSize: "12px",
                }}
              >
                {files.length}{" "}
                {files.length === 1
                  ? "file"
                  : "files"}{" "}
                selected
              </strong>

              <div
                style={{
                  marginTop: "3px",
                  fontSize: "9px",
                  color:
                    "rgba(255,255,255,.28)",
                }}
              >
                {formatFileSize(
                  totalSize
                )}
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
                  fileInputRef.current?.click()
                }
                style={{
                  border:
                    "1px solid rgba(255,255,255,.08)",
                  borderRadius: "8px",
                  background:
                    "rgba(255,255,255,.04)",
                  color:
                    "rgba(255,255,255,.68)",
                  padding:
                    "7px 10px",
                  font:
                    "inherit",
                  fontSize:
                    "10px",
                  fontWeight:
                    600,
                  cursor:
                    "pointer",
                }}
              >
                + Files
              </button>

              <button
                type="button"
                onClick={clearFiles}
                style={{
                  border: 0,
                  background:
                    "transparent",
                  color:
                    "rgba(255,153,82,.72)",
                  font:
                    "inherit",
                  fontSize:
                    "10px",
                  cursor:
                    "pointer",
                }}
              >
                Clear
              </button>
            </div>
          </div>

          <div
            style={{
              maxHeight: "235px",
              overflowY:
                "auto",
            }}
          >
            {files.map(
              (item, index) => (
                <div
                  key={`${item.relativePath}-${index}`}
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "30px minmax(0,1fr) auto",
                    alignItems:
                      "center",
                    gap: "10px",
                    padding:
                      "9px 13px",
                    borderBottom:
                      index ===
                      files.length - 1
                        ? "none"
                        : "1px solid rgba(255,255,255,.04)",
                  }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      borderRadius:
                        "8px",
                      background:
                        "rgba(255,106,0,.05)",
                      border:
                        "1px solid rgba(255,106,0,.12)",
                      color:
                        "rgba(255,153,82,.8)",
                      fontSize:
                        "9px",
                      fontWeight:
                        700,
                    }}
                  >
                    {String(
                      index + 1
                    ).padStart(
                      2,
                      "0"
                    )}
                  </div>

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
                          "11px",
                        color:
                          "rgba(255,255,255,.76)",
                      }}
                    >
                      {item.relativePath}
                    </div>

                    <div
                      style={{
                        marginTop:
                          "3px",
                        fontSize:
                          "9px",
                        color:
                          "rgba(255,255,255,.27)",
                      }}
                    >
                      {formatFileSize(
                        item.file.size
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      removeFile(
                        index
                      )
                    }
                    style={{
                      width:
                        "26px",
                      height:
                        "26px",
                      border: 0,
                      borderRadius:
                        "7px",
                      background:
                        "rgba(255,255,255,.035)",
                      color:
                        "rgba(255,255,255,.4)",
                      fontSize:
                        "17px",
                      cursor:
                        "pointer",
                    }}
                  >
                    ×
                  </button>
                </div>
              )
            )}
          </div>
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

      {files.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0,1fr) minmax(190px,.5fr)",
            gap: "10px",
            marginTop: "12px",
          }}
        >
          <label
            style={{
              display:
                "flex",
              flexDirection:
                "column",
              gap: "6px",
              padding:
                "13px",
              border:
                "1px solid rgba(255,255,255,.07)",
              borderRadius:
                "12px",
              background:
                "rgba(255,255,255,.018)",
              fontSize:
                "10px",
              color:
                "rgba(255,255,255,.4)",
            }}
          >
            ZIP file name

            <input
              type="text"
              value={zipName}
              onChange={(event) =>
                setZipName(
                  event.target.value
                )
              }
              placeholder="kaizen-files"
              style={{
                width:
                  "100%",
                height:
                  "39px",
                boxSizing:
                  "border-box",
                padding:
                  "0 10px",
                border:
                  "1px solid rgba(255,255,255,.08)",
                borderRadius:
                  "8px",
                outline:
                  "none",
                background:
                  "rgba(255,255,255,.035)",
                color:
                  "#fff",
                font:
                  "inherit",
                fontSize:
                  "11px",
              }}
            />
          </label>

          <div
            style={{
              display:
                "flex",
              flexDirection:
                "column",
              justifyContent:
                "center",
              padding:
                "13px",
              border:
                "1px solid rgba(255,255,255,.07)",
              borderRadius:
                "12px",
              background:
                "rgba(255,255,255,.018)",
            }}
          >
            <span
              style={{
                fontSize:
                  "9px",
                color:
                  "rgba(255,255,255,.3)",
              }}
            >
              ARCHIVE
            </span>

            <strong
              style={{
                marginTop:
                  "4px",
                fontSize:
                  "11px",
                color:
                  "rgba(255,255,255,.72)",
              }}
            >
              {zipName
                .trim()
                .replace(
                  /\.zip$/i,
                  ""
                ) ||
                "kaizen-files"}
              .zip
            </strong>
          </div>

          <button
            type="button"
            onClick={handleCreate}
            disabled={
              isCreating
            }
            style={{
              gridColumn:
                "1 / -1",
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
                isCreating
                  ? "not-allowed"
                  : "pointer",
              opacity:
                isCreating
                  ? 0.55
                  : 1,
            }}
          >
            {isCreating
              ? "Creating ZIP..."
              : "Create ZIP"}
          </button>
        </div>
      )}

      <style>{`
        input:focus {
          border-color: rgba(255,106,0,.45) !important;
          background: rgba(255,255,255,.045) !important;
        }

        @media (max-width: 650px) {
          .create-zip-settings {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default CreateZip;