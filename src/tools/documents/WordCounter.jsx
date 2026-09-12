import React, { useRef, useState } from "react";
import {
  countDocumentWords,
} from "../../services/documents/wordCounter.js";

function WordCounter() {
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [stats, setStats] = useState({
    words: 0,
    characters: 0,
    charactersWithoutSpaces: 0,
    lines: 0,
    sentences: 0,
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (selectedFile) => {
    if (!selectedFile) return;

    setError("");
    setFile(null);
    setText("");
    setStats({
      words: 0,
      characters: 0,
      charactersWithoutSpaces: 0,
      lines: 0,
      sentences: 0,
    });

    setIsProcessing(true);

    try {
      const result = await countDocumentWords(
        selectedFile
      );

      setFile(selectedFile);
      setText(result.text);
      setStats(result.stats);
    } catch (err) {
      setError(
        err?.message ||
          "Unable to read this file."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (event) => {
    const selectedFile =
      event.target.files?.[0];

    if (selectedFile) {
      handleFile(selectedFile);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();

    const droppedFile =
      event.dataTransfer.files?.[0];

    if (droppedFile) {
      handleFile(droppedFile);
    }
  };

  const clearFile = () => {
    setFile(null);
    setText("");
    setError("");

    setStats({
      words: 0,
      characters: 0,
      charactersWithoutSpaces: 0,
      lines: 0,
      sentences: 0,
    });

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const copyText = async () => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError(
        "Unable to copy the extracted text."
      );
    }
  };

  return (
    <div className="word-counter-tool">
      {!file && !isProcessing && (
        <div
          className="word-counter-dropzone"
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
            accept="
              .pdf,
              .docx,
              .pptx,
              .txt,
              .md,
              .html,
              .htm,
              .csv,
              .json,
              .xml,
              .rtf
            "
            hidden
            onChange={handleInputChange}
          />

          <div className="word-counter-upload-icon">
            #
          </div>

          <div className="word-counter-upload-title">
            Drop your file here
          </div>

          <div className="word-counter-upload-subtitle">
            or click to browse
          </div>

          <div className="word-counter-upload-formats">
            PDF · DOCX · PPTX · TXT · MD · HTML · CSV · JSON · XML · RTF
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="word-counter-processing">
          Reading file and counting words...
        </div>
      )}

      {error && (
        <div className="word-counter-error">
          {error}
        </div>
      )}

      {file && !isProcessing && (
        <>
          <div className="word-counter-file">
            <div className="word-counter-file-info">
              <div className="word-counter-file-icon">
                {file.name
                  .split(".")
                  .pop()
                  ?.toUpperCase()}
              </div>

              <div>
                <div className="word-counter-file-name">
                  {file.name}
                </div>

                <div className="word-counter-file-meta">
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={clearFile}
              className="word-counter-remove"
            >
              Remove
            </button>
          </div>

          <div className="word-counter-stats">
            <div className="word-counter-stat">
              <span>Words</span>
              <strong>
                {stats.words.toLocaleString()}
              </strong>
            </div>

            <div className="word-counter-stat">
              <span>Characters</span>
              <strong>
                {stats.characters.toLocaleString()}
              </strong>
            </div>

            <div className="word-counter-stat">
              <span>No Spaces</span>
              <strong>
                {stats.charactersWithoutSpaces.toLocaleString()}
              </strong>
            </div>

            <div className="word-counter-stat">
              <span>Lines</span>
              <strong>
                {stats.lines.toLocaleString()}
              </strong>
            </div>

            <div className="word-counter-stat">
              <span>Sentences</span>
              <strong>
                {stats.sentences.toLocaleString()}
              </strong>
            </div>
          </div>

          <div className="word-counter-preview">
            <div className="word-counter-preview-header">
              <span>Extracted Text</span>

              <button
                type="button"
                onClick={copyText}
                disabled={!text}
              >
                Copy
              </button>
            </div>

            <textarea
              value={text}
              onChange={(event) =>
                setText(event.target.value)
              }
              spellCheck={false}
            />
          </div>

          <button
            type="button"
            className="word-counter-new"
            onClick={clearFile}
          >
            Analyze Another File
          </button>
        </>
      )}

      <style>{`
        .word-counter-tool {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          color: #fff;
        }

        .word-counter-dropzone {
          min-height: 280px;
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

        .word-counter-dropzone:hover {
          border-color: rgba(255,120,0,.65);
          background: rgba(255,120,0,.035);
        }

        .word-counter-upload-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,120,0,.3);
          border-radius: 12px;
          color: #ff8a3d;
          font-size: 21px;
          font-weight: 700;
          margin-bottom: 17px;
        }

        .word-counter-upload-title {
          font-size: 17px;
          font-weight: 600;
        }

        .word-counter-upload-subtitle {
          margin-top: 7px;
          color: rgba(255,255,255,.5);
          font-size: 13px;
        }

        .word-counter-upload-formats {
          max-width: 650px;
          margin-top: 15px;
          padding: 0 20px;
          color: rgba(255,255,255,.3);
          font-size: 10px;
          line-height: 1.6;
          letter-spacing: .04em;
        }

        .word-counter-processing {
          padding: 14px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 10px;
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.6);
          text-align: center;
          font-size: 13px;
        }

        .word-counter-error {
          padding: 13px 15px;
          border: 1px solid rgba(255,70,70,.3);
          border-radius: 10px;
          background: rgba(255,50,50,.06);
          color: #ff9292;
          font-size: 13px;
        }

        .word-counter-file {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 13px 15px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 12px;
          background: rgba(255,255,255,.025);
        }

        .word-counter-file-info {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .word-counter-file-icon {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,120,0,.3);
          border-radius: 9px;
          color: #ff8a3d;
          font-size: 9px;
          font-weight: 700;
        }

        .word-counter-file-name {
          max-width: 500px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
          font-weight: 600;
        }

        .word-counter-file-meta {
          margin-top: 4px;
          color: rgba(255,255,255,.4);
          font-size: 11px;
        }

        .word-counter-remove {
          flex-shrink: 0;
          padding: 8px 12px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 8px;
          background: transparent;
          color: rgba(255,255,255,.55);
          cursor: pointer;
          font-size: 11px;
        }

        .word-counter-stats {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
        }

        .word-counter-stat {
          padding: 15px 12px;
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 10px;
          background: rgba(255,255,255,.025);
        }

        .word-counter-stat span {
          display: block;
          color: rgba(255,255,255,.4);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .06em;
        }

        .word-counter-stat strong {
          display: block;
          margin-top: 8px;
          color: #fff;
          font-size: 20px;
          font-weight: 600;
        }

        .word-counter-preview {
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 12px;
          background: rgba(255,255,255,.025);
        }

        .word-counter-preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 11px 14px;
          border-bottom: 1px solid rgba(255,255,255,.08);
          color: rgba(255,255,255,.45);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .07em;
        }

        .word-counter-preview-header button {
          border: 0;
          background: transparent;
          color: #ff9a4d;
          cursor: pointer;
          font-size: 11px;
        }

        .word-counter-preview-header button:disabled {
          opacity: .4;
          cursor: not-allowed;
        }

        .word-counter-preview textarea {
          display: block;
          width: 100%;
          min-height: 300px;
          box-sizing: border-box;
          padding: 18px;
          border: 0;
          outline: 0;
          resize: vertical;
          background: transparent;
          color: rgba(255,255,255,.75);
          font-family: inherit;
          font-size: 13px;
          line-height: 1.7;
        }

        .word-counter-new {
          width: 100%;
          padding: 12px;
          border: 1px solid rgba(255,120,0,.4);
          border-radius: 9px;
          background: rgba(255,100,0,.08);
          color: #ff9a4d;
          font-weight: 600;
          cursor: pointer;
        }

        @media (max-width: 850px) {
          .word-counter-stats {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 550px) {
          .word-counter-stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .word-counter-file {
            align-items: flex-start;
          }

          .word-counter-file-name {
            max-width: 220px;
          }
        }
      `}</style>
    </div>
  );
}

export default WordCounter;