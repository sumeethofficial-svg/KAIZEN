import React, { useRef, useState } from "react";
import { getFileMetadata } from "../../services/utilities/fileMetadata.js";

function FileMetadata() {
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState("");

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;

    setError("");

    try {
      const result = getFileMetadata(selectedFile);

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
      inputRef.current.value = "";
    }
  };

  return (
    <div className="file-metadata-tool">
      {!file && (
        <div
          className="metadata-dropzone"
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
            hidden
            onChange={(event) =>
              handleFile(
                event.target.files?.[0]
              )
            }
          />

          <div className="metadata-icon">
            ⓘ
          </div>

          <div className="metadata-title">
            Drop your file here
          </div>

          <div className="metadata-subtitle">
            or click to browse
          </div>
        </div>
      )}

      {error && (
        <div className="metadata-error">
          {error}
        </div>
      )}

      {file && metadata && (
        <>
          <div className="metadata-file">
            <div>
              <div className="metadata-file-name">
                {file.name}
              </div>

              <div className="metadata-file-type">
                {metadata.type}
              </div>
            </div>

            <button
              type="button"
              onClick={clearFile}
            >
              Remove
            </button>
          </div>

          <div className="metadata-grid">
            <div className="metadata-card">
              <span>File Name</span>
              <strong>{metadata.name}</strong>
            </div>

            <div className="metadata-card">
              <span>Extension</span>
              <strong>
                {metadata.extension}
              </strong>
            </div>

            <div className="metadata-card">
              <span>File Type</span>
              <strong>{metadata.type}</strong>
            </div>

            <div className="metadata-card">
              <span>Size</span>
              <strong>
                {metadata.formattedSize}
              </strong>
            </div>

            <div className="metadata-card">
              <span>Last Modified</span>
              <strong>
                {metadata.lastModifiedDate}
              </strong>
            </div>

            <div className="metadata-card">
              <span>Raw Size</span>
              <strong>
                {metadata.size.toLocaleString()} bytes
              </strong>
            </div>
          </div>
        </>
      )}

      <style>{`
        .file-metadata-tool {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          color: #fff;
        }

        .metadata-dropzone {
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

        .metadata-dropzone:hover {
          border-color: rgba(255,120,0,.65);
        }

        .metadata-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,120,0,.3);
          border-radius: 12px;
          color: #ff8a3d;
          font-size: 23px;
          margin-bottom: 17px;
        }

        .metadata-title {
          font-size: 17px;
          font-weight: 600;
        }

        .metadata-subtitle {
          margin-top: 7px;
          color: rgba(255,255,255,.5);
          font-size: 13px;
        }

        .metadata-error {
          padding: 13px 15px;
          border: 1px solid rgba(255,70,70,.3);
          border-radius: 10px;
          background: rgba(255,50,50,.06);
          color: #ff9292;
          font-size: 13px;
        }

        .metadata-file {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 13px 15px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 12px;
          background: rgba(255,255,255,.025);
        }

        .metadata-file-name {
          font-size: 13px;
          font-weight: 600;
        }

        .metadata-file-type {
          margin-top: 4px;
          color: rgba(255,255,255,.4);
          font-size: 11px;
        }

        .metadata-file button {
          padding: 8px 12px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 8px;
          background: transparent;
          color: rgba(255,255,255,.55);
          cursor: pointer;
        }

        .metadata-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .metadata-card {
          min-width: 0;
          padding: 15px;
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 10px;
          background: rgba(255,255,255,.025);
        }

        .metadata-card span {
          display: block;
          color: rgba(255,255,255,.4);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .06em;
        }

        .metadata-card strong {
          display: block;
          margin-top: 8px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: rgba(255,255,255,.8);
          font-size: 13px;
          font-weight: 500;
        }

        @media (max-width: 600px) {
          .metadata-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default FileMetadata;