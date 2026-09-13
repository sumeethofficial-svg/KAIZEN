import React, { useRef, useState } from "react";
import { createZip } from "../../services/utilities/createZip.js";

function CreateZip() {
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [zipName, setZipName] = useState("kaizen-files");

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) {
      return "0 Bytes";
    }

    const units = [
      "Bytes",
      "KB",
      "MB",
      "GB",
      "TB",
    ];

    const index = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1
    );

    return `${(
      bytes / Math.pow(1024, index)
    ).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  };

  const normalizeFiles = (fileList) => {
    if (!fileList || fileList.length === 0) {
      return [];
    }

    return Array.from(fileList).map((file) => ({
      file,
      relativePath:
        file.webkitRelativePath || file.name,
    }));
  };

  const addFiles = (fileList) => {
    const newFiles = normalizeFiles(fileList);

    if (newFiles.length === 0) {
      return;
    }

    setFiles((currentFiles) => [
      ...currentFiles,
      ...newFiles,
    ]);

    setError("");
  };

  const handleFileInput = (event) => {
    addFiles(event.target.files);

    event.target.value = "";
  };

  const handleFolderInput = (event) => {
    addFiles(event.target.files);

    event.target.value = "";
  };

  const handleDrop = async (event) => {
    event.preventDefault();

    setError("");

    const items =
      event.dataTransfer?.items;

    if (!items) {
      addFiles(event.dataTransfer?.files);
      return;
    }

    const droppedFiles = [];

    for (const item of Array.from(items)) {
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

    if (droppedFiles.length > 0) {
      setFiles((currentFiles) => [
        ...currentFiles,
        ...droppedFiles,
      ]);
    }
  };

  const collectEntry = async (
    entry,
    parentPath,
    output
  ) => {
    if (entry.isFile) {
      await new Promise((resolve) => {
        entry.file(
          (file) => {
            output.push({
              file,
              relativePath:
                parentPath + file.name,
            });

            resolve();
          },
          () => {
            resolve();
          }
        );
      });

      return;
    }

    if (entry.isDirectory) {
      const reader =
        entry.createReader();

      const directoryPath =
        `${parentPath}${entry.name}/`;

      const readEntries = () => {
        return new Promise((resolve) => {
          reader.readEntries(
            (entries) => {
              resolve(entries);
            },
            () => {
              resolve([]);
            }
          );
        });
      };

      let entries = [];

      while (true) {
        const batch =
          await readEntries();

        if (batch.length === 0) {
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

  const removeFile = (index) => {
    setFiles((currentFiles) =>
      currentFiles.filter(
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
    if (files.length === 0) {
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

      const result = await createZip(
        files,
        {
          filename: `${cleanName}.zip`,
        }
      );

      const url =
        URL.createObjectURL(
          result.blob
        );

      const link =
        document.createElement("a");

      link.href = url;
      link.download =
        result.filename;
      link.style.display = "none";

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      setTimeout(() => {
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

  return (
    <div className="create-zip-tool">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={handleFileInput}
      />

      <input
        ref={folderInputRef}
        type="file"
        multiple
        webkitdirectory=""
        directory=""
        hidden
        onChange={handleFolderInput}
      />

      <div
        className="zip-dropzone"
        onDrop={handleDrop}
        onDragOver={(event) => {
          event.preventDefault();

          if (event.dataTransfer) {
            event.dataTransfer.dropEffect =
              "copy";
          }
        }}
      >
        <div className="zip-icon">
          ▥
        </div>

        <div className="zip-title">
          Drop files or folders here
        </div>

        <div className="zip-subtitle">
          or choose files or a folder
        </div>

        <div className="zip-buttons">
          <button
            type="button"
            onClick={() =>
              fileInputRef.current?.click()
            }
          >
            Choose Files
          </button>

          <button
            type="button"
            onClick={() =>
              folderInputRef.current?.click()
            }
          >
            Choose Folder
          </button>
        </div>

        <div className="zip-format">
          All file types supported
        </div>
      </div>

      {error && (
        <div className="zip-error">
          {error}
        </div>
      )}

      {files.length > 0 && (
        <>
          <div className="zip-file-header">
            <span>
              {files.length}{" "}
              {files.length === 1
                ? "file"
                : "files"}{" "}
              selected
            </span>

            <button
              type="button"
              onClick={clearFiles}
            >
              Clear all
            </button>
          </div>

          <div className="zip-file-list">
            {files.map(
              (item, index) => (
                <div
                  className="zip-file-item"
                  key={`${item.relativePath}-${index}`}
                >
                  <div className="zip-file-info">
                    <div className="zip-file-symbol">
                      FILE
                    </div>

                    <div className="zip-file-details">
                      <div className="zip-file-name">
                        {item.relativePath}
                      </div>

                      <div className="zip-file-size">
                        {formatFileSize(
                          item.file.size
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      removeFile(index)
                    }
                    aria-label={`Remove ${item.file.name}`}
                  >
                    ×
                  </button>
                </div>
              )
            )}
          </div>

          <div className="zip-settings">
            <label>
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
              />
            </label>
          </div>

          <button
            type="button"
            className="zip-create-button"
            onClick={handleCreate}
            disabled={isCreating}
          >
            {isCreating
              ? "Creating ZIP..."
              : "Create ZIP"}
          </button>
        </>
      )}

      <style>{`
        .create-zip-tool {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          color: #fff;
        }

        .zip-dropzone {
          min-height: 260px;
          border: 1px dashed rgba(255,255,255,.22);
          border-radius: 16px;
          background: rgba(255,255,255,.025);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: default;
          text-align: center;
        }

        .zip-dropzone:hover {
          border-color: rgba(255,120,0,.65);
          background: rgba(255,120,0,.035);
        }

        .zip-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,120,0,.3);
          border-radius: 12px;
          color: #ff8a3d;
          font-size: 22px;
          margin-bottom: 17px;
        }

        .zip-title {
          font-size: 17px;
          font-weight: 600;
        }

        .zip-subtitle {
          margin-top: 7px;
          color: rgba(255,255,255,.5);
          font-size: 13px;
        }

        .zip-buttons {
          display: flex;
          gap: 8px;
          margin-top: 16px;
        }

        .zip-buttons button {
          padding: 9px 14px;
          border: 1px solid rgba(255,120,0,.4);
          border-radius: 8px;
          background: rgba(255,100,0,.08);
          color: #ff9a4d;
          font-size: 11px;
          cursor: pointer;
        }

        .zip-buttons button:hover {
          background: rgba(255,100,0,.16);
          border-color: rgba(255,120,0,.7);
        }

        .zip-format {
          margin-top: 13px;
          color: rgba(255,255,255,.3);
          font-size: 11px;
        }

        .zip-error {
          padding: 13px 15px;
          border: 1px solid rgba(255,70,70,.3);
          border-radius: 10px;
          background: rgba(255,50,50,.06);
          color: #ff9292;
          font-size: 13px;
        }

        .zip-file-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 14px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 10px;
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.55);
          font-size: 12px;
        }

        .zip-file-header button {
          border: 0;
          background: transparent;
          color: #ff9a4d;
          cursor: pointer;
          font-size: 11px;
        }

        .zip-file-list {
          max-height: 300px;
          overflow: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .zip-file-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 11px 13px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 10px;
          background: rgba(255,255,255,.02);
        }

        .zip-file-info {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .zip-file-symbol {
          flex-shrink: 0;
          font-size: 8px;
          color: #ff8a3d;
          border: 1px solid rgba(255,120,0,.25);
          border-radius: 6px;
          padding: 7px 6px;
        }

        .zip-file-details {
          min-width: 0;
        }

        .zip-file-name {
          max-width: 650px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
        }

        .zip-file-size {
          margin-top: 3px;
          color: rgba(255,255,255,.35);
          font-size: 10px;
        }

        .zip-file-item > button {
          flex-shrink: 0;
          border: 0;
          background: transparent;
          color: rgba(255,255,255,.4);
          font-size: 18px;
          cursor: pointer;
        }

        .zip-file-item > button:hover {
          color: #ff8a3d;
        }

        .zip-settings label {
          display: flex;
          flex-direction: column;
          gap: 7px;
          color: rgba(255,255,255,.45);
          font-size: 11px;
        }

        .zip-settings input {
          padding: 11px 12px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 9px;
          outline: none;
          background: rgba(255,255,255,.04);
          color: #fff;
          font-size: 12px;
        }

        .zip-settings input:focus {
          border-color: rgba(255,120,0,.5);
        }

        .zip-create-button {
          padding: 13px;
          border: 1px solid rgba(255,120,0,.55);
          border-radius: 10px;
          background: rgba(255,100,0,.12);
          color: #ff9a4d;
          font-weight: 600;
          cursor: pointer;
        }

        .zip-create-button:hover:not(:disabled) {
          background: rgba(255,100,0,.18);
          border-color: rgba(255,120,0,.75);
        }

        .zip-create-button:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        @media (max-width: 600px) {
          .zip-buttons {
            flex-direction: column;
          }

          .zip-file-name {
            max-width: 250px;
          }
        }
      `}</style>
    </div>
  );
}

export default CreateZip;