import React, { useRef, useState } from "react";
import {
  extractZip,
  extractZipFile,
} from "../../services/utilities/extractZip.js";

function ExtractZip() {
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [zip, setZip] = useState(null);
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (selectedFile) => {
    if (!selectedFile) return;

    setError("");
    setIsLoading(true);
    setFile(null);
    setZip(null);
    setEntries([]);

    try {
      const result = await extractZip(selectedFile);

      setFile(selectedFile);
      setZip(result.zip);
      setEntries(result.entries);
    } catch (err) {
      setError(
        err?.message || "Unable to open the ZIP archive."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const downloadEntry = async (entry) => {
    if (entry.directory || !zip) return;

    setError("");
    setIsExtracting(true);

    try {
      const blob = await extractZipFile(
        zip,
        entry.name
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = entry.name.split("/").pop();

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err?.message || "Unable to extract this file."
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const downloadAll = async () => {
    if (!zip) return;

    setError("");
    setIsExtracting(true);

    try {
      for (const entry of entries) {
        if (!entry.directory) {
          const blob = await extractZipFile(
            zip,
            entry.name
          );

          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");

          link.href = url;
          link.download = entry.name
            .split("/")
            .pop();

          document.body.appendChild(link);
          link.click();
          link.remove();

          URL.revokeObjectURL(url);

          await new Promise((resolve) =>
            setTimeout(resolve, 100)
          );
        }
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
      inputRef.current.value = "";
    }
  };

  return (
    <div className="extract-zip-tool">
      {!file && !isLoading && (
        <div
          className="extract-zip-dropzone"
          onClick={() =>
            inputRef.current?.click()
          }
          onDrop={(event) => {
            event.preventDefault();
            handleFile(
              event.dataTransfer.files?.[0]
            );
          }}
          onDragOver={(event) =>
            event.preventDefault()
          }
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

          <div className="extract-zip-icon">
            ↓
          </div>

          <div className="extract-zip-title">
            Drop your ZIP file here
          </div>

          <div className="extract-zip-subtitle">
            or click to browse
          </div>
        </div>
      )}

      {isLoading && (
        <div className="extract-zip-status">
          Reading ZIP archive...
        </div>
      )}

      {error && (
        <div className="extract-zip-error">
          {error}
        </div>
      )}

      {file && !isLoading && (
        <>
          <div className="extract-zip-file">
            <div>
              <div className="extract-zip-name">
                {file.name}
              </div>

              <div className="extract-zip-meta">
                {entries.filter(
                  (entry) => !entry.directory
                ).length}{" "}
                files
              </div>
            </div>

            <button
              type="button"
              onClick={clearFile}
            >
              Remove
            </button>
          </div>

          <div className="extract-zip-list">
            {entries.map((entry) => (
              <div
                className="extract-zip-entry"
                key={entry.name}
              >
                <div className="extract-zip-entry-name">
                  {entry.directory
                    ? `📁 ${entry.name}`
                    : entry.name}
                </div>

                {!entry.directory && (
                  <button
                    type="button"
                    onClick={() =>
                      downloadEntry(entry)
                    }
                    disabled={isExtracting}
                  >
                    Extract
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            className="extract-zip-all"
            onClick={downloadAll}
            disabled={isExtracting}
          >
            {isExtracting
              ? "Extracting..."
              : "Extract All"}
          </button>
        </>
      )}

      <style>{`
        .extract-zip-tool {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          color: #fff;
        }

        .extract-zip-dropzone {
          min-height: 260px;
          border: 1px dashed rgba(255,255,255,.22);
          border-radius: 16px;
          background: rgba(255,255,255,.025);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .extract-zip-dropzone:hover {
          border-color: rgba(255,120,0,.65);
        }

        .extract-zip-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,120,0,.3);
          border-radius: 12px;
          color: #ff8a3d;
          font-size: 24px;
          margin-bottom: 17px;
        }

        .extract-zip-title {
          font-size: 17px;
          font-weight: 600;
        }

        .extract-zip-subtitle {
          margin-top: 7px;
          color: rgba(255,255,255,.5);
          font-size: 13px;
        }

        .extract-zip-status {
          padding: 14px;
          border-radius: 10px;
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.6);
          text-align: center;
          font-size: 13px;
        }

        .extract-zip-error {
          padding: 13px 15px;
          border: 1px solid rgba(255,70,70,.3);
          border-radius: 10px;
          background: rgba(255,50,50,.06);
          color: #ff9292;
          font-size: 13px;
        }

        .extract-zip-file {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 13px 15px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 12px;
          background: rgba(255,255,255,.025);
        }

        .extract-zip-name {
          font-size: 13px;
          font-weight: 600;
        }

        .extract-zip-meta {
          margin-top: 4px;
          color: rgba(255,255,255,.4);
          font-size: 11px;
        }

        .extract-zip-file button {
          padding: 8px 12px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 8px;
          background: transparent;
          color: rgba(255,255,255,.55);
          cursor: pointer;
        }

        .extract-zip-list {
          max-height: 360px;
          overflow: auto;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .extract-zip-entry {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 9px;
          background: rgba(255,255,255,.02);
        }

        .extract-zip-entry-name {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: rgba(255,255,255,.65);
          font-size: 12px;
        }

        .extract-zip-entry button {
          flex-shrink: 0;
          padding: 7px 10px;
          border: 1px solid rgba(255,120,0,.3);
          border-radius: 7px;
          background: transparent;
          color: #ff9a4d;
          cursor: pointer;
          font-size: 10px;
        }

        .extract-zip-entry button:disabled {
          opacity: .4;
        }

        .extract-zip-all {
          padding: 13px;
          border: 1px solid rgba(255,120,0,.55);
          border-radius: 10px;
          background: rgba(255,100,0,.12);
          color: #ff9a4d;
          font-weight: 600;
          cursor: pointer;
        }

        .extract-zip-all:disabled {
          opacity: .45;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

export default ExtractZip;