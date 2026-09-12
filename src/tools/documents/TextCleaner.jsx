import React, { useMemo, useState } from "react";
import {
  cleanText,
} from "../../services/documents/textCleaner.js";

function TextCleaner() {
  const [text, setText] = useState("");

  const [options, setOptions] = useState({
    removeExtraSpaces: true,
    trimLines: true,
    removeEmptyLines: false,
    normalizeQuotes: true,
    normalizeDashes: true,
    removeExtraPunctuation: true,
  });

  const cleanedText = useMemo(() => {
    return cleanText(text, options);
  }, [text, options]);

  const updateOption = (key) => {
    setOptions((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const copyCleanedText = async () => {
    if (!cleanedText) return;

    try {
      await navigator.clipboard.writeText(
        cleanedText
      );
    } catch {
      // Clipboard may be unavailable in some browsers.
    }
  };

  const useCleanedText = () => {
    setText(cleanedText);
  };

  const clearText = () => {
    setText("");
  };

  return (
    <div className="text-cleaner-tool">
      <div className="cleaner-editor">
        <div className="cleaner-editor-header">
          <span>Input Text</span>

          <button
            type="button"
            onClick={clearText}
            disabled={!text}
          >
            Clear
          </button>
        </div>

        <textarea
          value={text}
          onChange={(event) =>
            setText(event.target.value)
          }
          placeholder="Paste text here to clean and normalize it..."
          spellCheck={true}
        />
      </div>

      <div className="cleaner-options">
        <div className="cleaner-options-title">
          Cleaning Options
        </div>

        <div className="cleaner-option-grid">
          <label>
            <input
              type="checkbox"
              checked={options.removeExtraSpaces}
              onChange={() =>
                updateOption("removeExtraSpaces")
              }
            />
            <span>Remove extra spaces</span>
          </label>

          <label>
            <input
              type="checkbox"
              checked={options.trimLines}
              onChange={() =>
                updateOption("trimLines")
              }
            />
            <span>Trim line spaces</span>
          </label>

          <label>
            <input
              type="checkbox"
              checked={options.removeEmptyLines}
              onChange={() =>
                updateOption("removeEmptyLines")
              }
            />
            <span>Remove empty lines</span>
          </label>

          <label>
            <input
              type="checkbox"
              checked={options.normalizeQuotes}
              onChange={() =>
                updateOption("normalizeQuotes")
              }
            />
            <span>Normalize quotes</span>
          </label>

          <label>
            <input
              type="checkbox"
              checked={options.normalizeDashes}
              onChange={() =>
                updateOption("normalizeDashes")
              }
            />
            <span>Normalize dashes</span>
          </label>

          <label>
            <input
              type="checkbox"
              checked={options.removeExtraPunctuation}
              onChange={() =>
                updateOption(
                  "removeExtraPunctuation"
                )
              }
            />
            <span>Normalize punctuation</span>
          </label>
        </div>
      </div>

      <div className="cleaner-result">
        <div className="cleaner-result-header">
          <span>Cleaned Text</span>

          <span>
            {cleanedText.length.toLocaleString()} characters
          </span>
        </div>

        <textarea
          value={cleanedText}
          readOnly
          placeholder="Your cleaned text will appear here..."
        />
      </div>

      <div className="cleaner-actions">
        <button
          type="button"
          onClick={useCleanedText}
          disabled={!cleanedText}
        >
          Use Cleaned Text
        </button>

        <button
          type="button"
          onClick={copyCleanedText}
          disabled={!cleanedText}
        >
          Copy Cleaned Text
        </button>
      </div>

      <style>{`
        .text-cleaner-tool {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          color: #fff;
        }

        .cleaner-editor,
        .cleaner-result,
        .cleaner-options {
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 12px;
          background: rgba(255,255,255,.025);
          overflow: hidden;
        }

        .cleaner-editor-header,
        .cleaner-result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 11px 14px;
          border-bottom: 1px solid rgba(255,255,255,.08);
          color: rgba(255,255,255,.45);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .07em;
        }

        .cleaner-editor-header button {
          border: 0;
          background: transparent;
          color: rgba(255,255,255,.4);
          cursor: pointer;
          font-size: 11px;
        }

        .cleaner-editor-header button:disabled {
          opacity: .35;
          cursor: not-allowed;
        }

        .cleaner-editor textarea,
        .cleaner-result textarea {
          display: block;
          width: 100%;
          min-height: 260px;
          box-sizing: border-box;
          padding: 18px;
          border: 0;
          outline: 0;
          resize: vertical;
          background: transparent;
          color: rgba(255,255,255,.8);
          font-family: inherit;
          font-size: 13px;
          line-height: 1.7;
        }

        .cleaner-result textarea {
          color: rgba(255,255,255,.7);
        }

        .cleaner-options {
          padding: 15px;
        }

        .cleaner-options-title {
          margin-bottom: 13px;
          color: rgba(255,255,255,.5);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .07em;
        }

        .cleaner-option-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .cleaner-option-grid label {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 10px 11px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 8px;
          background: rgba(255,255,255,.02);
          color: rgba(255,255,255,.62);
          font-size: 12px;
          cursor: pointer;
        }

        .cleaner-option-grid input {
          accent-color: #ff7a00;
        }

        .cleaner-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .cleaner-actions button {
          padding: 12px;
          border: 1px solid rgba(255,120,0,.4);
          border-radius: 9px;
          background: rgba(255,100,0,.08);
          color: #ff9a4d;
          font-weight: 600;
          cursor: pointer;
        }

        .cleaner-actions button:disabled {
          opacity: .4;
          cursor: not-allowed;
        }

        @media (max-width: 600px) {
          .cleaner-option-grid,
          .cleaner-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default TextCleaner;