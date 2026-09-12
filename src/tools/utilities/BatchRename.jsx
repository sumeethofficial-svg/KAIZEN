import React, { useMemo, useRef, useState } from "react";
import {
  generateRenamedFiles,
} from "../../services/utilities/batchRename.js";

function BatchRename() {
  const inputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [pattern, setPattern] = useState("file-{n}");
  const [startNumber, setStartNumber] = useState(1);
  const [error, setError] = useState("");

  const renamedFiles = useMemo(() => {
    if (!files.length || !pattern.trim()) {
      return [];
    }

    try {
      return generateRenamedFiles(
        files,
        pattern,
        startNumber
      );
    } catch {
      return [];
    }
  }, [files, pattern, startNumber]);

  const handleFiles = (selectedFiles) => {
    if (!selectedFiles?.length) {
      return;
    }

    setError("");
    setFiles(Array.from(selectedFiles));
  };

  const handleInputChange = (event) => {
    handleFiles(event.target.files);
  };

  const handleDrop = (event) => {
    event.preventDefault();

    handleFiles(event.dataTransfer.files);
  };

  const clearFiles = () => {
    setFiles([]);
    setError("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const downloadFile = (item) => {
    try {
      const url = URL.createObjectURL(item.file);

      const link = document.createElement("a");

      link.href = url;
      link.download = item.newName;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch {
      setError(
        `Unable to download ${item.newName}.`
      );
    }
  };

  const downloadAll = async () => {
    if (!renamedFiles.length) {
      setError(
        "Please select files and enter a rename pattern."
      );
      return;
    }

    setError("");

    for (const item of renamedFiles) {
      downloadFile(item);

      await new Promise((resolve) =>
        setTimeout(resolve, 150)
      );
    }
  };

  return (
    <div className="batch-rename-tool">
      <div
        className="batch-rename-dropzone"
        onClick={() =>
          inputRef.current?.click()
        }
        onDrop={handleDrop}
        onDragOver={(event) =>
          event.preventDefault()
        }
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={handleInputChange}
        />

        <div className="batch-rename-icon">
          ✎
        </div>

        <div className="batch-rename-title">
          Drop files here
        </div>

        <div className="batch-rename-subtitle">
          or click to select multiple files
        </div>

        <div className="batch-rename-format">
          Any file type
        </div>
      </div>

      {error && (
        <div className="batch-rename-error">
          {error}
        </div>
      )}

      {files.length > 0 && (
        <>
          <div className="batch-rename-settings">
            <label>
              Rename pattern

              <input
                type="text"
                value={pattern}
                onChange={(event) =>
                  setPattern(event.target.value)
                }
                placeholder="file-{n}"
              />
            </label>

            <label>
              Starting number

              <input
                type="number"
                min="0"
                value={startNumber}
                onChange={(event) =>
                  setStartNumber(
                    Number(event.target.value) || 0
                  )
                }
              />
            </label>
          </div>

          <div className="batch-rename-help">
            <span>
              {"{n}"} → number
            </span>

            <span>
              {"{name}"} → original name
            </span>

            <span>
              {"{ext}"} → extension
            </span>
          </div>

          <div className="batch-rename-list">
            <div className="batch-rename-list-header">
              <span>
                {files.length}{" "}
                {files.length === 1
                  ? "file"
                  : "files"}
              </span>

              <button
                type="button"
                onClick={clearFiles}
              >
                Clear
              </button>
            </div>

            {renamedFiles.map(
              (item, index) => (
                <div
                  className="batch-rename-row"
                  key={`${item.originalName}-${index}`}
                >
                  <div className="batch-rename-old">
                    {item.originalName}
                  </div>

                  <div className="batch-rename-arrow">
                    →
                  </div>

                  <div className="batch-rename-new">
                    {item.newName}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      downloadFile(item)
                    }
                  >
                    Download
                  </button>
                </div>
              )
            )}
          </div>

          <button
            type="button"
            className="batch-rename-download-all"
            onClick={downloadAll}
          >
            Download All Renamed Files
          </button>
        </>
      )}

      <style>{`
        .batch-rename-tool {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          color: #fff;
        }

        .batch-rename-dropzone {
          min-height: 260px;
          border: 1px dashed rgba(255,255,255,.22);
          border-radius: 16px;
          background: rgba(255,255,255,.025);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          text-align: center;
        }

        .batch-rename-dropzone:hover {
          border-color: rgba(255,120,0,.65);
          background: rgba(255,120,0,.035);
        }

        .batch-rename-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,120,0,.3);
          border-radius: 12px;
          color: #ff8a3d;
          font-size: 21px;
          margin-bottom: 17px;
        }

        .batch-rename-title {
          font-size: 17px;
          font-weight: 600;
        }

        .batch-rename-subtitle {
          margin-top: 7px;
          color: rgba(255,255,255,.5);
          font-size: 13px;
        }

        .batch-rename-format {
          margin-top: 13px;
          color: rgba(255,255,255,.3);
          font-size: 11px;
        }

        .batch-rename-error {
          padding: 13px 15px;
          border: 1px solid rgba(255,70,70,.3);
          border-radius: 10px;
          background: rgba(255,50,50,.06);
          color: #ff9292;
          font-size: 13px;
        }

        .batch-rename-settings {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 12px;
        }

        .batch-rename-settings label {
          display: flex;
          flex-direction: column;
          gap: 7px;
          color: rgba(255,255,255,.45);
          font-size: 11px;
        }

        .batch-rename-settings input {
          padding: 11px 12px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 9px;
          outline: none;
          background: rgba(255,255,255,.04);
          color: #fff;
          font-size: 12px;
        }

        .batch-rename-settings input:focus {
          border-color: rgba(255,120,0,.5);
        }

        .batch-rename-help {
          display: flex;
          gap: 18px;
          flex-wrap: wrap;
          padding: 10px 12px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 9px;
          color: rgba(255,255,255,.35);
          font-size: 10px;
        }

        .batch-rename-list {
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 12px;
          background: rgba(255,255,255,.02);
        }

        .batch-rename-list-header {
          display: flex;
          justify-content: space-between;
          padding: 11px 14px;
          border-bottom: 1px solid rgba(255,255,255,.08);
          color: rgba(255,255,255,.45);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .07em;
        }

        .batch-rename-list-header button {
          border: 0;
          background: transparent;
          color: #ff9a4d;
          cursor: pointer;
          font-size: 11px;
        }

        .batch-rename-row {
          display: grid;
          grid-template-columns: 1fr auto 1fr auto;
          align-items: center;
          gap: 12px;
          padding: 10px 13px;
          border-bottom: 1px solid rgba(255,255,255,.05);
        }

        .batch-rename-row:last-child {
          border-bottom: 0;
        }

        .batch-rename-old,
        .batch-rename-new {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
        }

        .batch-rename-old {
          color: rgba(255,255,255,.4);
        }

        .batch-rename-new {
          color: rgba(255,255,255,.75);
        }

        .batch-rename-arrow {
          color: rgba(255,120,0,.7);
        }

        .batch-rename-row button {
          padding: 7px 10px;
          border: 1px solid rgba(255,120,0,.3);
          border-radius: 7px;
          background: transparent;
          color: #ff9a4d;
          cursor: pointer;
          font-size: 10px;
        }

        .batch-rename-download-all {
          padding: 13px;
          border: 1px solid rgba(255,120,0,.55);
          border-radius: 10px;
          background: rgba(255,100,0,.12);
          color: #ff9a4d;
          font-weight: 600;
          cursor: pointer;
        }

        @media (max-width: 750px) {
          .batch-rename-settings {
            grid-template-columns: 1fr;
          }

          .batch-rename-row {
            grid-template-columns: 1fr;
          }

          .batch-rename-arrow {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

export default BatchRename;