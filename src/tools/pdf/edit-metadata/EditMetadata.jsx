import { useEffect, useState } from "react";
import {
  editMetadata,
  getEditMetadataPdfInfo,
} from "../../../services/pdf/editMetadata.js";

function EditMetadata() {
  const [file, setFile] = useState(null);
  const [pdfInfo, setPdfInfo] = useState(null);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [subject, setSubject] = useState("");
  const [keywords, setKeywords] = useState("");
  const [creator, setCreator] = useState("");
  const [producer, setProducer] = useState("");

  const [creationDate, setCreationDate] = useState("");
  const [modificationDate, setModificationDate] = useState("");

  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const [resultUrl, setResultUrl] = useState("");
  const [resultName, setResultName] = useState("");

  useEffect(() => {
    return () => {
      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }
    };
  }, [resultUrl]);

  function formatDateForInput(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return "";
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function loadMetadata(info) {
    const metadata = info.metadata || {};

    setTitle(metadata.title || "");
    setAuthor(metadata.author || "");
    setSubject(metadata.subject || "");
    setKeywords(metadata.keywords || "");
    setCreator(metadata.creator || "");
    setProducer(metadata.producer || "");

    setCreationDate(
      formatDateForInput(metadata.creationDate)
    );

    setModificationDate(
      formatDateForInput(metadata.modificationDate)
    );
  }

  async function loadFile(selectedFile) {
    if (!selectedFile) {
      return;
    }

    setError("");
    setStatus("loading");
    setProgress(0);

    try {
      if (
        selectedFile.type !== "application/pdf" &&
        !selectedFile.name.toLowerCase().endsWith(".pdf")
      ) {
        throw new Error("Please select a PDF file.");
      }

      const info = await getEditMetadataPdfInfo(
        selectedFile
      );

      loadMetadata(info);

      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }

      setFile(selectedFile);
      setPdfInfo(info);
      setResultUrl("");
      setResultName("");
      setProgress(0);
      setStatus("ready");
    } catch (err) {
      setFile(null);
      setPdfInfo(null);
      setStatus("error");
      setError(
        err.message || "Unable to read the PDF metadata."
      );
    }
  }

  function handleFileInput(event) {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      loadFile(selectedFile);
    }

    event.target.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragActive(false);

    const droppedFile = event.dataTransfer.files?.[0];

    if (droppedFile) {
      loadFile(droppedFile);
    }
  }

  function removeFile() {
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
    }

    setFile(null);
    setPdfInfo(null);
    setResultUrl("");
    setResultName("");
    setProgress(0);
    setError("");
    setStatus("idle");

    setTitle("");
    setAuthor("");
    setSubject("");
    setKeywords("");
    setCreator("");
    setProducer("");
    setCreationDate("");
    setModificationDate("");
  }

  function resetMetadata() {
    if (!pdfInfo?.metadata) {
      return;
    }

    loadMetadata(pdfInfo);
    setError("");
    setStatus("ready");
    setProgress(0);
    setResultUrl("");
    setResultName("");
  }

  function clearMetadata() {
    setTitle("");
    setAuthor("");
    setSubject("");
    setKeywords("");
    setCreator("");
    setProducer("");
    setCreationDate("");
    setModificationDate("");
    setError("");
    setStatus("ready");
    setProgress(0);
  }

  function resetTool() {
    removeFile();
  }

  function buildDate(value) {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new Error(
        "Please enter valid creation and modification dates."
      );
    }

    return date;
  }

  async function handleProcess() {
    if (!file) {
      setError("Please select a PDF first.");
      return;
    }

    try {
      setError("");
      setStatus("processing");
      setProgress(0);

      const output = await editMetadata(
        file,
        {
          title,
          author,
          subject,
          keywords,
          creator,
          producer,
          creationDate: buildDate(creationDate),
          modificationDate: buildDate(modificationDate),
        },
        ({ percent }) => {
          setProgress(percent);
        }
      );

      if (!(output instanceof Blob) || output.size === 0) {
        throw new Error(
          "The generated PDF is empty."
        );
      }

      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }

      const url = URL.createObjectURL(output);
      const baseName = file.name.replace(/\.pdf$/i, "");

      setResultUrl(url);
      setResultName(`${baseName}-metadata.pdf`);
      setProgress(100);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(
        err.message || "Failed to update PDF metadata."
      );
    }
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function formatStoredDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return "Not set";
    }

    return date.toLocaleString();
  }

  const metadataCount = [
    title,
    author,
    subject,
    keywords,
    creator,
    producer,
    creationDate,
    modificationDate,
  ].filter((value) => String(value || "").trim()).length;

  return (
    <div className="edit-metadata-tool">
      <style>{`
        .edit-metadata-tool {
          width: 100%;
          color: #f5f5f5;
        }

        .edit-metadata-shell {
          width: min(1060px, 100%);
          margin: 0 auto;
          padding: 28px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 26px;
          background:
            linear-gradient(
              180deg,
              rgba(255,255,255,0.055),
              rgba(255,255,255,0.025)
            );
          backdrop-filter: blur(22px);
          box-shadow:
            0 24px 80px rgba(0,0,0,0.35),
            inset 0 1px 0 rgba(255,255,255,0.05);
        }

        .edit-metadata-upload {
          min-height: 330px;
          padding: 42px 30px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1px dashed rgba(255,145,60,0.35);
          border-radius: 22px;
          background:
            radial-gradient(
              circle at center,
              rgba(255,110,30,0.08),
              transparent 62%
            ),
            rgba(255,255,255,0.02);
          text-align: center;
          transition: 0.2s ease;
        }

        .edit-metadata-upload.active {
          border-color: rgba(255,145,60,0.75);
          background:
            radial-gradient(
              circle at center,
              rgba(255,110,30,0.15),
              transparent 65%
            ),
            rgba(255,255,255,0.035);
          transform: translateY(-1px);
        }

        .edit-metadata-upload-icon {
          width: 66px;
          height: 66px;
          margin-bottom: 18px;
          display: grid;
          place-items: center;
          border-radius: 18px;
          border: 1px solid rgba(255,145,60,0.18);
          background: rgba(255,100,30,0.1);
          color: #ff8a3d;
          font-size: 21px;
          font-weight: 900;
        }

        .edit-metadata-upload h3 {
          margin: 0 0 8px;
          font-size: 21px;
        }

        .edit-metadata-upload p {
          max-width: 560px;
          margin: 0 0 22px;
          color: rgba(255,255,255,0.5);
          font-size: 14px;
          line-height: 1.6;
        }

        .edit-metadata-upload-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 17px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.07);
          color: #fff;
          cursor: pointer;
          font-size: 13px;
          font-weight: 800;
          transition: 0.2s ease;
        }

        .edit-metadata-upload-button:hover {
          background: rgba(255,255,255,0.11);
          border-color: rgba(255,145,60,0.3);
        }

        .edit-metadata-upload input {
          display: none;
        }

        .edit-metadata-file {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          margin-bottom: 20px;
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
        }

        .edit-metadata-file-icon {
          width: 44px;
          height: 44px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: rgba(255,100,30,0.12);
          color: #ff8a3d;
          font-size: 11px;
          font-weight: 900;
        }

        .edit-metadata-file-info {
          flex: 1;
          min-width: 0;
        }

        .edit-metadata-file-info strong {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
        }

        .edit-metadata-file-info span {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,0.43);
          font-size: 12px;
        }

        .edit-metadata-remove {
          width: 35px;
          height: 35px;
          flex: 0 0 auto;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.09);
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.72);
          cursor: pointer;
          font-size: 18px;
        }

        .edit-metadata-remove:hover {
          color: #fff;
          border-color: rgba(255,100,30,0.35);
        }

        .edit-metadata-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 310px;
          gap: 18px;
          align-items: start;
        }

        .edit-metadata-card {
          padding: 21px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.025);
        }

        .edit-metadata-section + .edit-metadata-section {
          margin-top: 22px;
          padding-top: 22px;
          border-top: 1px solid rgba(255,255,255,0.07);
        }

        .edit-metadata-section-title {
          margin: 0 0 15px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1.7px;
          color: rgba(255,255,255,0.43);
        }

        .edit-metadata-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 13px;
        }

        .edit-metadata-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .edit-metadata-field.full {
          grid-column: 1 / -1;
        }

        .edit-metadata-field label {
          font-size: 11px;
          font-weight: 700;
          color: rgba(255,255,255,0.43);
        }

        .edit-metadata-field input,
        .edit-metadata-field textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 11px;
          background: rgba(255,255,255,0.045);
          color: #fff;
          outline: none;
          font: inherit;
          font-size: 13px;
        }

        .edit-metadata-field input {
          min-height: 42px;
          padding: 10px 11px;
        }

        .edit-metadata-field textarea {
          min-height: 86px;
          padding: 11px;
          resize: vertical;
          line-height: 1.5;
        }

        .edit-metadata-field input:focus,
        .edit-metadata-field textarea:focus {
          border-color: rgba(255,135,55,0.55);
          box-shadow: 0 0 0 3px rgba(255,110,30,0.08);
        }

        .edit-metadata-field input::placeholder,
        .edit-metadata-field textarea::placeholder {
          color: rgba(255,255,255,0.22);
        }

        .edit-metadata-date-help {
          margin-top: 5px;
          color: rgba(255,255,255,0.31);
          font-size: 10px;
          line-height: 1.4;
        }

        .edit-metadata-side-title {
          margin: 0 0 14px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1.7px;
          color: rgba(255,255,255,0.43);
        }

        .edit-metadata-stat-list {
          display: grid;
          gap: 9px;
        }

        .edit-metadata-stat {
          padding: 12px;
          border-radius: 12px;
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.055);
        }

        .edit-metadata-stat span {
          display: block;
          color: rgba(255,255,255,0.4);
          font-size: 11px;
        }

        .edit-metadata-stat strong {
          display: block;
          margin-top: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
          font-weight: 700;
        }

        .edit-metadata-side-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
          margin-top: 14px;
        }

        .edit-metadata-small-button {
          min-height: 39px;
          border-radius: 11px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.045);
          color: rgba(255,255,255,0.72);
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .edit-metadata-small-button:hover {
          background: rgba(255,255,255,0.08);
          color: #fff;
        }

        .edit-metadata-info {
          margin-top: 14px;
          padding: 13px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255,145,60,0.12);
          background: rgba(255,110,30,0.045);
          color: rgba(255,255,255,0.49);
          font-size: 11px;
          line-height: 1.6;
        }

        .edit-metadata-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .edit-metadata-primary,
        .edit-metadata-secondary {
          min-height: 46px;
          padding: 0 18px;
          border-radius: 13px;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .edit-metadata-primary {
          flex: 1;
          border: 1px solid rgba(255,145,60,0.28);
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(255,165,90,0.35),
              transparent 58%
            ),
            linear-gradient(
              180deg,
              rgba(255,110,30,0.9),
              rgba(220,72,14,0.9)
            );
          color: #fff;
          box-shadow:
            0 10px 28px rgba(255,90,20,0.14),
            inset 0 1px 0 rgba(255,255,255,0.16);
        }

        .edit-metadata-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 14px 32px rgba(255,90,20,0.2),
            inset 0 1px 0 rgba(255,255,255,0.18);
        }

        .edit-metadata-primary:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
        }

        .edit-metadata-secondary {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.045);
          color: rgba(255,255,255,0.75);
        }

        .edit-metadata-secondary:hover:not(:disabled) {
          background: rgba(255,255,255,0.08);
          color: #fff;
        }

        .edit-metadata-progress {
          margin-top: 16px;
          padding: 14px;
          border-radius: 13px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
        }

        .edit-metadata-progress-head {
          display: flex;
          justify-content: space-between;
          margin-bottom: 9px;
          color: rgba(255,255,255,0.58);
          font-size: 12px;
        }

        .edit-metadata-progress-track {
          height: 6px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,0.07);
        }

        .edit-metadata-progress-bar {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #ff6420,
            #ff9b57
          );
          transition: width 0.2s ease;
        }

        .edit-metadata-result {
          margin-top: 16px;
          padding: 16px;
          border-radius: 15px;
          border: 1px solid rgba(101,209,131,0.15);
          background: rgba(80,190,110,0.045);
        }

        .edit-metadata-result strong {
          display: block;
          font-size: 14px;
        }

        .edit-metadata-result span {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,0.46);
          font-size: 12px;
        }

        .edit-metadata-download {
          display: inline-flex;
          margin-top: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid rgba(255,145,60,0.2);
          background: rgba(255,110,30,0.1);
          color: #ffae78;
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
        }

        .edit-metadata-error {
          margin-top: 16px;
          padding: 13px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255,90,80,0.17);
          background: rgba(255,70,60,0.055);
          color: #ffb1aa;
          font-size: 12px;
          line-height: 1.5;
        }

        .edit-metadata-count {
          margin-top: 13px;
          color: rgba(255,255,255,0.35);
          text-align: right;
          font-size: 11px;
        }

        @media (max-width: 820px) {
          .edit-metadata-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .edit-metadata-shell {
            padding: 17px;
            border-radius: 20px;
          }

          .edit-metadata-form-grid {
            grid-template-columns: 1fr;
          }

          .edit-metadata-field.full {
            grid-column: auto;
          }

          .edit-metadata-actions {
            flex-direction: column;
          }

          .edit-metadata-primary,
          .edit-metadata-secondary {
            width: 100%;
          }
        }
      `}</style>

      <div className="edit-metadata-shell">
        {!file && (
          <div
            className={`edit-metadata-upload ${
              dragActive ? "active" : ""
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            <div className="edit-metadata-upload-icon">
              PDF
            </div>

            <h3>Edit PDF metadata</h3>

            <p>
              Update document information such as title,
              author, subject, keywords, creator, producer,
              and document dates.
            </p>

            <label className="edit-metadata-upload-button">
              Choose PDF
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileInput}
              />
            </label>
          </div>
        )}

        {file && pdfInfo && (
          <>
            <div className="edit-metadata-file">
              <div className="edit-metadata-file-icon">
                PDF
              </div>

              <div className="edit-metadata-file-info">
                <strong>{file.name}</strong>

                <span>
                  {pdfInfo.pageCount}{" "}
                  {pdfInfo.pageCount === 1
                    ? "page"
                    : "pages"}
                  {" · "}
                  {formatFileSize(file.size)}
                </span>
              </div>

              <button
                type="button"
                className="edit-metadata-remove"
                onClick={removeFile}
                aria-label="Remove PDF"
              >
                ×
              </button>
            </div>

            <div className="edit-metadata-grid">
              <div className="edit-metadata-card">
                <div className="edit-metadata-section">
                  <h3 className="edit-metadata-section-title">
                    DOCUMENT
                  </h3>

                  <div className="edit-metadata-form-grid">
                    <div className="edit-metadata-field full">
                      <label htmlFor="metadata-title">
                        TITLE
                      </label>

                      <input
                        id="metadata-title"
                        type="text"
                        value={title}
                        onChange={(event) =>
                          setTitle(event.target.value)
                        }
                        placeholder="Document title"
                      />
                    </div>

                    <div className="edit-metadata-field">
                      <label htmlFor="metadata-author">
                        AUTHOR
                      </label>

                      <input
                        id="metadata-author"
                        type="text"
                        value={author}
                        onChange={(event) =>
                          setAuthor(event.target.value)
                        }
                        placeholder="Author name"
                      />
                    </div>

                    <div className="edit-metadata-field">
                      <label htmlFor="metadata-subject">
                        SUBJECT
                      </label>

                      <input
                        id="metadata-subject"
                        type="text"
                        value={subject}
                        onChange={(event) =>
                          setSubject(event.target.value)
                        }
                        placeholder="Document subject"
                      />
                    </div>

                    <div className="edit-metadata-field full">
                      <label htmlFor="metadata-keywords">
                        KEYWORDS
                      </label>

                      <textarea
                        id="metadata-keywords"
                        value={keywords}
                        onChange={(event) =>
                          setKeywords(event.target.value)
                        }
                        placeholder="keyword one, keyword two, keyword three"
                      />
                    </div>
                  </div>
                </div>

                <div className="edit-metadata-section">
                  <h3 className="edit-metadata-section-title">
                    APPLICATION
                  </h3>

                  <div className="edit-metadata-form-grid">
                    <div className="edit-metadata-field">
                      <label htmlFor="metadata-creator">
                        CREATOR
                      </label>

                      <input
                        id="metadata-creator"
                        type="text"
                        value={creator}
                        onChange={(event) =>
                          setCreator(event.target.value)
                        }
                        placeholder="Application or person"
                      />
                    </div>

                    <div className="edit-metadata-field">
                      <label htmlFor="metadata-producer">
                        PRODUCER
                      </label>

                      <input
                        id="metadata-producer"
                        type="text"
                        value={producer}
                        onChange={(event) =>
                          setProducer(event.target.value)
                        }
                        placeholder="PDF producer"
                      />
                    </div>
                  </div>
                </div>

                <div className="edit-metadata-section">
                  <h3 className="edit-metadata-section-title">
                    DATES
                  </h3>

                  <div className="edit-metadata-form-grid">
                    <div className="edit-metadata-field">
                      <label htmlFor="metadata-creation">
                        CREATION DATE
                      </label>

                      <input
                        id="metadata-creation"
                        type="datetime-local"
                        value={creationDate}
                        onChange={(event) =>
                          setCreationDate(event.target.value)
                        }
                      />

                      <div className="edit-metadata-date-help">
                        Stored as the PDF creation date.
                      </div>
                    </div>

                    <div className="edit-metadata-field">
                      <label htmlFor="metadata-modification">
                        MODIFICATION DATE
                      </label>

                      <input
                        id="metadata-modification"
                        type="datetime-local"
                        value={modificationDate}
                        onChange={(event) =>
                          setModificationDate(
                            event.target.value
                          )
                        }
                      />

                      <div className="edit-metadata-date-help">
                        Stored as the PDF modification date.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="edit-metadata-count">
                  {metadataCount} of 8 metadata fields filled
                </div>
              </div>

              <div className="edit-metadata-card">
                <h3 className="edit-metadata-side-title">
                  CURRENT METADATA
                </h3>

                <div className="edit-metadata-stat-list">
                  <div className="edit-metadata-stat">
                    <span>Title</span>

                    <strong>
                      {pdfInfo.metadata.title || "Not set"}
                    </strong>
                  </div>

                  <div className="edit-metadata-stat">
                    <span>Author</span>

                    <strong>
                      {pdfInfo.metadata.author || "Not set"}
                    </strong>
                  </div>

                  <div className="edit-metadata-stat">
                    <span>Subject</span>

                    <strong>
                      {pdfInfo.metadata.subject || "Not set"}
                    </strong>
                  </div>

                  <div className="edit-metadata-stat">
                    <span>Keywords</span>

                    <strong>
                      {pdfInfo.metadata.keywords ||
                        "Not set"}
                    </strong>
                  </div>

                  <div className="edit-metadata-stat">
                    <span>Creator</span>

                    <strong>
                      {pdfInfo.metadata.creator || "Not set"}
                    </strong>
                  </div>

                  <div className="edit-metadata-stat">
                    <span>Producer</span>

                    <strong>
                      {pdfInfo.metadata.producer || "Not set"}
                    </strong>
                  </div>

                  <div className="edit-metadata-stat">
                    <span>Created</span>

                    <strong>
                      {formatStoredDate(
                        pdfInfo.metadata.creationDate
                      )}
                    </strong>
                  </div>

                  <div className="edit-metadata-stat">
                    <span>Modified</span>

                    <strong>
                      {formatStoredDate(
                        pdfInfo.metadata.modificationDate
                      )}
                    </strong>
                  </div>
                </div>

                <div className="edit-metadata-side-actions">
                  <button
                    type="button"
                    className="edit-metadata-small-button"
                    onClick={resetMetadata}
                    disabled={status === "processing"}
                  >
                    Restore
                  </button>

                  <button
                    type="button"
                    className="edit-metadata-small-button"
                    onClick={clearMetadata}
                    disabled={status === "processing"}
                  >
                    Clear all
                  </button>
                </div>

                <div className="edit-metadata-info">
                  Changes are written into a new PDF. Your
                  original file remains unchanged.
                </div>
              </div>
            </div>

            <div className="edit-metadata-actions">
              <button
                type="button"
                className="edit-metadata-primary"
                onClick={handleProcess}
                disabled={status === "processing"}
              >
                {status === "processing"
                  ? `Updating Metadata · ${progress}%`
                  : "Save Metadata"}
              </button>

              <button
                type="button"
                className="edit-metadata-secondary"
                onClick={resetTool}
                disabled={status === "processing"}
              >
                Reset
              </button>
            </div>

            {status === "processing" && (
              <div className="edit-metadata-progress">
                <div className="edit-metadata-progress-head">
                  <span>Updating PDF</span>
                  <span>{progress}%</span>
                </div>

                <div className="edit-metadata-progress-track">
                  <div
                    className="edit-metadata-progress-bar"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {status === "success" && resultUrl && (
              <div className="edit-metadata-result">
                <strong>
                  PDF metadata updated successfully.
                </strong>

                <span>{resultName}</span>

                <a
                  className="edit-metadata-download"
                  href={resultUrl}
                  download={resultName}
                >
                  Download PDF
                </a>
              </div>
            )}

            {status === "error" && error && (
              <div className="edit-metadata-error">
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default EditMetadata;