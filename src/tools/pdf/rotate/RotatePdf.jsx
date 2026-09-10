import { useEffect, useMemo, useState } from "react";
import FileDropzone from "../../../components/files/FileDropzone";
import {
  getPdfPageCount,
  rotatePdf,
} from "../../../services/pdf/rotatePdf";

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function RotatePdf() {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);

  const [rotation, setRotation] = useState(90);
  const [scope, setScope] = useState("all");

  const [selectedPages, setSelectedPages] = useState([]);

  const [isReading, setIsReading] = useState(false);
  const [isProcessing, setIsProcessing] =
    useState(false);

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  /*
   * Clean generated object URL when the component
   * is unmounted.
   */
  useEffect(() => {
    return () => {
      if (result?.url) {
        URL.revokeObjectURL(result.url);
      }
    };
  }, [result]);

  /*
   * Number of selected pages.
   */
  const selectedCount =
    selectedPages.length;

  /*
   * Whether every page is selected.
   */
  const allPagesSelected = useMemo(() => {
    return (
      pageCount > 0 &&
      selectedPages.length === pageCount
    );
  }, [
    pageCount,
    selectedPages,
  ]);

  /*
   * Read uploaded PDF.
   */
  async function handleFileSelected(files) {
    const selectedFile = files?.[0];

    if (!selectedFile) {
      return;
    }

    setError("");
    setResult(null);
    setFile(null);
    setPageCount(0);
    setSelectedPages([]);
    setIsReading(true);

    try {
      const detectedPageCount =
        await getPdfPageCount(
          selectedFile
        );

      setFile(selectedFile);
      setPageCount(
        detectedPageCount
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to read this PDF."
      );
    } finally {
      setIsReading(false);
    }
  }

  /*
   * Toggle an individual page.
   */
  function togglePage(pageNumber) {
    setSelectedPages(
      (currentPages) => {
        if (
          currentPages.includes(
            pageNumber
          )
        ) {
          return currentPages.filter(
            (page) =>
              page !== pageNumber
          );
        }

        return [
          ...currentPages,
          pageNumber,
        ].sort(
          (a, b) => a - b
        );
      }
    );

    setError("");
  }

  /*
   * Select every page.
   */
  function selectAllPages() {
    setSelectedPages(
      Array.from(
        {
          length: pageCount,
        },
        (_, index) =>
          index + 1
      )
    );

    setError("");
  }

  /*
   * Clear page selection.
   */
  function clearSelection() {
    setSelectedPages([]);
    setError("");
  }

  /*
   * Apply rotation.
   */
  async function handleRotate() {
    if (!file) {
      setError(
        "Please select a PDF first."
      );
      return;
    }

    if (
      scope === "selected" &&
      selectedPages.length === 0
    ) {
      setError(
        "Select at least one page to rotate."
      );
      return;
    }

    setError("");
    setResult(null);
    setIsProcessing(true);

    try {
      const pagesToRotate =
        scope === "all"
          ? null
          : selectedPages;

      const blob = await rotatePdf(
        file,
        rotation,
        pagesToRotate
      );

      const url =
        URL.createObjectURL(blob);

      setResult({
        blob,
        url,
        pageCount:
          scope === "all"
            ? pageCount
            : selectedPages.length,
        scope,
        rotation,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to rotate this PDF."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  /*
   * Reset the complete tool.
   */
  function handleReset() {
    if (result?.url) {
      URL.revokeObjectURL(
        result.url
      );
    }

    setFile(null);
    setPageCount(0);
    setRotation(90);
    setScope("all");
    setSelectedPages([]);
    setResult(null);
    setError("");
    setIsReading(false);
    setIsProcessing(false);
  }

  return (
    <>
      <style>{`
        /*
        =========================================================
        ROTATE PDF WORKSPACE
        =========================================================
        */

        .rotate-pdf-workspace {
          width: 100%;
          max-width: 920px;

          margin: 0 auto;

          padding:
            20px 46px 38px;

          box-sizing: border-box;

          display: flex;
          flex-direction: column;

          gap: 20px;
        }

        /*
        =========================================================
        EMPTY STATE
        =========================================================
        */

        .rotate-pdf-empty {
          width: 100%;
          max-width: none;

          height: 100%;
          min-height: 0;

          margin: 0;

          padding:
            28px 46px 40px;

          box-sizing: border-box;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .rotate-pdf-empty
        .rotate-pdf-upload {
          width: 100%;
          max-width: 920px;
        }

        /*
        =========================================================
        UPLOAD
        =========================================================
        */

        .rotate-pdf-upload {
          width: 100%;
        }

        .rotate-pdf-dropzone {
          position: relative;

          width: 100%;
          min-height: 190px;

          padding: 32px;

          box-sizing: border-box;

          border:
            1px dashed
            rgba(255, 126, 20, 0.25);

          border-radius: 24px;

          background:
            radial-gradient(
              ellipse at 50% 0%,
              rgba(255, 126, 20, 0.085),
              transparent 68%
            ),
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.035),
              rgba(255, 255, 255, 0.012)
            );

          display: flex;
          align-items: center;
          justify-content: center;

          overflow: hidden;

          transition:
            border-color 180ms ease,
            background 180ms ease,
            transform 180ms ease;
        }

        .rotate-pdf-dropzone:hover {
          border-color:
            rgba(255, 126, 20, 0.40);

          background:
            radial-gradient(
              ellipse at 50% 0%,
              rgba(255, 126, 20, 0.11),
              transparent 68%
            ),
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.040),
              rgba(255, 255, 255, 0.012)
            );

          transform:
            translateY(-1px);
        }

        .rotate-pdf-dropzone label {
          width: 100%;
          height: 100%;

          cursor: pointer;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .rotate-pdf-dropzone input {
          position: absolute;
          inset: 0;

          width: 100%;
          height: 100%;

          opacity: 0;
          cursor: pointer;
        }

        .rotate-pdf-upload-content {
          display: flex;
          flex-direction: column;

          align-items: center;

          gap: 8px;

          text-align: center;
        }

        .rotate-pdf-upload-icon {
          width: 56px;
          height: 56px;

          border-radius: 16px;

          border:
            1px solid
            rgba(255, 126, 20, 0.28);

          background:
            rgba(255, 126, 20, 0.075);

          color: #ff9140;

          display: flex;
          align-items: center;
          justify-content: center;

          font-size: 13px;
          font-weight: 800;

          letter-spacing: 0.08em;

          margin-bottom: 4px;
        }

        .rotate-pdf-upload-title {
          color:
            rgba(255, 255, 255, 0.93);

          font-size: 17px;

          font-weight: 650;
        }

        .rotate-pdf-upload-subtitle {
          color:
            rgba(255, 255, 255, 0.40);

          font-size: 12px;
        }

        /*
        =========================================================
        FILE HEADER
        =========================================================
        */

        .rotate-pdf-file {
          width: 100%;
          min-height: 82px;

          padding:
            15px 18px;

          box-sizing: border-box;

          border:
            1px solid
            rgba(255, 255, 255, 0.08);

          border-radius: 20px;

          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.035),
              rgba(255, 255, 255, 0.012)
            );

          display: flex;
          align-items: center;

          gap: 14px;
        }

        .rotate-pdf-file-icon {
          width: 50px;
          height: 50px;

          flex-shrink: 0;

          border-radius: 14px;

          border:
            1px solid
            rgba(255, 126, 20, 0.23);

          background:
            rgba(255, 126, 20, 0.065);

          color: #ff9343;

          display: flex;
          align-items: center;
          justify-content: center;

          font-size: 11px;
          font-weight: 800;

          letter-spacing: 0.04em;
        }

        .rotate-pdf-file-info {
          min-width: 0;
          flex: 1;

          display: flex;
          flex-direction: column;

          gap: 5px;
        }

        .rotate-pdf-file-info strong {
          color:
            rgba(255, 255, 255, 0.91);

          font-size: 14px;
          font-weight: 620;

          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .rotate-pdf-file-info span {
          color:
            rgba(255, 255, 255, 0.36);

          font-size: 11px;
        }

        .rotate-pdf-file-stat {
          flex-shrink: 0;

          padding:
            9px 12px;

          border-radius: 11px;

          border:
            1px solid
            rgba(255, 255, 255, 0.065);

          background:
            rgba(255, 255, 255, 0.025);

          color:
            rgba(255, 255, 255, 0.60);

          font-size: 11px;
          font-weight: 650;
        }

        /*
        =========================================================
        SETTINGS CARD
        =========================================================
        */

        .rotate-pdf-settings {
          width: 100%;

          padding: 22px;

          box-sizing: border-box;

          border-radius: 22px;

          border:
            1px solid
            rgba(255, 255, 255, 0.075);

          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.033),
              rgba(255, 255, 255, 0.012)
            );

          display: flex;
          flex-direction: column;

          gap: 22px;
        }

        .rotate-pdf-section {
          width: 100%;
        }

        .rotate-pdf-section-label {
          margin-bottom: 13px;

          color:
            rgba(255, 255, 255, 0.44);

          font-size: 10px;

          font-weight: 750;

          letter-spacing: 0.14em;

          text-transform: uppercase;
        }

        /*
        =========================================================
        SCOPE SWITCH
        =========================================================
        */

        .rotate-pdf-scope-grid {
          display: grid;

          grid-template-columns:
            repeat(2, minmax(0, 1fr));

          gap: 10px;
        }

        .rotate-pdf-scope-button {
          min-height: 68px;

          padding:
            13px 15px;

          border-radius: 15px;

          border:
            1px solid
            rgba(255, 255, 255, 0.075);

          background:
            rgba(255, 255, 255, 0.022);

          color:
            rgba(255, 255, 255, 0.56);

          text-align: left;

          cursor: pointer;

          transition:
            border-color 180ms ease,
            background 180ms ease,
            color 180ms ease;
        }

        .rotate-pdf-scope-button:hover {
          border-color:
            rgba(255, 126, 20, 0.24);

          color:
            rgba(255, 255, 255, 0.80);
        }

        .rotate-pdf-scope-button.active {
          border-color:
            rgba(255, 126, 20, 0.34);

          background:
            rgba(255, 126, 20, 0.065);

          color:
            rgba(255, 255, 255, 0.94);
        }

        .rotate-pdf-scope-button strong {
          display: block;

          margin-bottom: 4px;

          font-size: 13px;
        }

        .rotate-pdf-scope-button span {
          display: block;

          color: inherit;

          opacity: 0.55;

          font-size: 11px;

          line-height: 1.4;
        }

        /*
        =========================================================
        ROTATION OPTIONS
        =========================================================
        */

        .rotate-pdf-angle-grid {
          display: grid;

          grid-template-columns:
            repeat(3, minmax(0, 1fr));

          gap: 9px;
        }

        .rotate-pdf-angle-button {
          min-height: 58px;

          border-radius: 14px;

          border:
            1px solid
            rgba(255, 255, 255, 0.07);

          background:
            rgba(255, 255, 255, 0.020);

          color:
            rgba(255, 255, 255, 0.54);

          display: flex;
          flex-direction: column;

          align-items: center;
          justify-content: center;

          gap: 5px;

          cursor: pointer;

          transition:
            border-color 180ms ease,
            background 180ms ease,
            color 180ms ease;
        }

        .rotate-pdf-angle-button:hover {
          border-color:
            rgba(255, 126, 20, 0.24);

          color:
            rgba(255, 255, 255, 0.82);
        }

        .rotate-pdf-angle-button.active {
          border-color:
            rgba(255, 126, 20, 0.38);

          background:
            rgba(255, 126, 20, 0.075);

          color:
            #ff9c50;
        }

        .rotate-pdf-angle-symbol {
          font-size: 21px;

          line-height: 1;
        }

        .rotate-pdf-angle-label {
          font-size: 10px;

          font-weight: 700;
        }

        /*
        =========================================================
        PAGE SELECTION
        =========================================================
        */

        .rotate-pdf-selection-header {
          display: flex;

          align-items: center;
          justify-content: space-between;

          gap: 12px;

          margin-bottom: 12px;
        }

        .rotate-pdf-selection-count {
          color:
            rgba(255, 255, 255, 0.36);

          font-size: 11px;
        }

        .rotate-pdf-selection-actions {
          display: flex;

          align-items: center;

          gap: 7px;
        }

        .rotate-pdf-small-button {
          min-height: 32px;

          padding:
            0 10px;

          border-radius: 9px;

          border:
            1px solid
            rgba(255, 255, 255, 0.065);

          background:
            rgba(255, 255, 255, 0.02);

          color:
            rgba(255, 255, 255, 0.48);

          font-size: 10px;

          font-weight: 650;

          cursor: pointer;
        }

        .rotate-pdf-small-button:hover {
          border-color:
            rgba(255, 126, 20, 0.20);

          color:
            rgba(255, 255, 255, 0.78);
        }

        .rotate-pdf-page-grid {
          display: grid;

          grid-template-columns:
            repeat(
              auto-fill,
              minmax(58px, 1fr)
            );

          gap: 7px;

          max-height: 210px;

          overflow-y: auto;

          padding: 2px;

          scrollbar-width: thin;
        }

        .rotate-pdf-page-button {
          min-height: 46px;

          border-radius: 11px;

          border:
            1px solid
            rgba(255, 255, 255, 0.065);

          background:
            rgba(255, 255, 255, 0.018);

          color:
            rgba(255, 255, 255, 0.48);

          font-size: 11px;

          font-weight: 700;

          cursor: pointer;

          transition:
            border-color 160ms ease,
            background 160ms ease,
            color 160ms ease;
        }

        .rotate-pdf-page-button:hover {
          border-color:
            rgba(255, 126, 20, 0.24);

          color:
            rgba(255, 255, 255, 0.82);
        }

        .rotate-pdf-page-button.selected {
          border-color:
            rgba(255, 126, 20, 0.40);

          background:
            rgba(255, 126, 20, 0.095);

          color:
            #ff9f53;
        }

        /*
        =========================================================
        STATS
        =========================================================
        */

        .rotate-pdf-stats {
          display: grid;

          grid-template-columns:
            repeat(3, minmax(0, 1fr));

          gap: 8px;
        }

        .rotate-pdf-stat {
          padding:
            12px 13px;

          border-radius: 12px;

          border:
            1px solid
            rgba(255, 255, 255, 0.055);

          background:
            rgba(255, 255, 255, 0.018);
        }

        .rotate-pdf-stat span {
          display: block;

          margin-bottom: 5px;

          color:
            rgba(255, 255, 255, 0.32);

          font-size: 9px;

          font-weight: 750;

          letter-spacing: 0.10em;

          text-transform: uppercase;
        }

        .rotate-pdf-stat strong {
          color:
            rgba(255, 255, 255, 0.86);

          font-size: 14px;

          font-weight: 650;
        }

        /*
        =========================================================
        ERROR
        =========================================================
        */

        .rotate-pdf-error {
          width: 100%;

          padding:
            12px 14px;

          box-sizing: border-box;

          border-radius: 12px;

          border:
            1px solid
            rgba(255, 92, 92, 0.18);

          background:
            rgba(255, 92, 92, 0.045);

          color:
            rgba(255, 188, 188, 0.90);

          font-size: 12px;

          line-height: 1.5;
        }

        /*
        =========================================================
        ACTIONS
        =========================================================
        */

        .rotate-pdf-actions {
          display: flex;

          align-items: center;

          justify-content: center;

          gap: 10px;
        }

        .rotate-pdf-primary,
        .rotate-pdf-secondary {
          min-height: 45px;

          padding:
            0 20px;

          border-radius: 13px;

          font-size: 13px;

          font-weight: 700;

          cursor: pointer;

          transition:
            transform 180ms ease,
            background 180ms ease,
            opacity 180ms ease;
        }

        .rotate-pdf-primary {
          border:
            1px solid
            rgba(255, 153, 74, 0.36);

          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(255, 196, 130, 0.20),
              transparent 70%
            ),
            linear-gradient(
              180deg,
              rgba(255, 126, 20, 0.90),
              rgba(214, 85, 0, 0.86)
            );

          color:
            #ffffff;

          box-shadow:
            0 12px 30px
              rgba(255, 126, 20, 0.12);
        }

        .rotate-pdf-primary:hover:not(:disabled) {
          transform:
            translateY(-1px);
        }

        .rotate-pdf-secondary {
          border:
            1px solid
            rgba(255, 255, 255, 0.085);

          background:
            rgba(255, 255, 255, 0.025);

          color:
            rgba(255, 255, 255, 0.60);
        }

        .rotate-pdf-secondary:hover:not(:disabled) {
          background:
            rgba(255, 255, 255, 0.045);

          color:
            rgba(255, 255, 255, 0.84);
        }

        .rotate-pdf-primary:disabled,
        .rotate-pdf-secondary:disabled {
          opacity: 0.42;

          cursor: not-allowed;
        }

        /*
        =========================================================
        RESULT
        =========================================================
        */

        .rotate-pdf-result {
          width: 100%;

          padding:
            18px;

          box-sizing: border-box;

          border-radius: 18px;

          border:
            1px solid
            rgba(255, 255, 255, 0.075);

          background:
            linear-gradient(
              180deg,
              rgba(255, 126, 20, 0.035),
              rgba(255, 255, 255, 0.012)
            );

          display: flex;

          align-items: center;

          gap: 13px;
        }

        .rotate-pdf-result-icon {
          width: 44px;
          height: 44px;

          flex-shrink: 0;

          border-radius: 12px;

          border:
            1px solid
            rgba(255, 126, 20, 0.18);

          background:
            rgba(255, 126, 20, 0.075);

          color:
            #ff9846;

          display: flex;
          align-items: center;
          justify-content: center;

          font-size: 11px;
          font-weight: 800;
        }

        .rotate-pdf-result-info {
          min-width: 0;

          flex: 1;

          display: flex;
          flex-direction: column;

          gap: 4px;
        }

        .rotate-pdf-result-info strong {
          color:
            rgba(255, 255, 255, 0.88);

          font-size: 13px;

          font-weight: 650;
        }

        .rotate-pdf-result-info span {
          color:
            rgba(255, 255, 255, 0.34);

          font-size: 11px;
        }

        .rotate-pdf-download {
          flex-shrink: 0;

          min-height: 38px;

          padding:
            0 14px;

          border-radius: 10px;

          border:
            1px solid
            rgba(255, 126, 20, 0.20);

          background:
            rgba(255, 126, 20, 0.05);

          color:
            #ff9d4f;

          text-decoration: none;

          display: inline-flex;

          align-items: center;
          justify-content: center;

          font-size: 11px;

          font-weight: 700;
        }

        /*
        =========================================================
        LOADING
        =========================================================
        */

        .rotate-pdf-loading {
          min-height: 46px;

          display: flex;

          align-items: center;
          justify-content: center;

          color:
            rgba(255, 255, 255, 0.40);

          font-size: 12px;
        }

        /*
        =========================================================
        RESPONSIVE
        =========================================================
        */

        @media (max-width: 900px) {
          .rotate-pdf-workspace {
            padding-left: 28px;
            padding-right: 28px;
          }

          .rotate-pdf-empty {
            padding-left: 28px;
            padding-right: 28px;
          }
        }

        @media (max-width: 600px) {
          .rotate-pdf-workspace {
            padding:
              14px 14px 28px;
          }

          .rotate-pdf-empty {
            padding:
              18px 14px 28px;
          }

          .rotate-pdf-scope-grid {
            grid-template-columns: 1fr;
          }

          .rotate-pdf-angle-grid {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }

          .rotate-pdf-stats {
            grid-template-columns: 1fr;
          }

          .rotate-pdf-actions {
            flex-direction: column;
          }

          .rotate-pdf-primary,
          .rotate-pdf-secondary {
            width: 100%;
          }

          .rotate-pdf-result {
            align-items: flex-start;

            flex-wrap: wrap;
          }

          .rotate-pdf-download {
            width: 100%;
          }
        }
      `}</style>

      <div
        className={
          file
            ? "rotate-pdf-workspace"
            : "rotate-pdf-workspace rotate-pdf-empty"
        }
      >
        {!file ? (
          <div className="rotate-pdf-upload">
            <FileDropzone
              accept="application/pdf,.pdf"
              multiple={false}
              onFiles={
                handleFileSelected
              }
              className="rotate-pdf-dropzone"
            >
              <div className="rotate-pdf-upload-content">
                <div className="rotate-pdf-upload-icon">
                  PDF
                </div>

                <div className="rotate-pdf-upload-title">
                  {isReading
                    ? "Reading PDF…"
                    : "Choose a PDF to rotate"}
                </div>

                <div className="rotate-pdf-upload-subtitle">
                  Rotate every page or only the pages you choose
                </div>
              </div>
            </FileDropzone>
          </div>
        ) : (
          <>
            <div className="rotate-pdf-file">
              <div className="rotate-pdf-file-icon">
                PDF
              </div>

              <div className="rotate-pdf-file-info">
                <strong title={file.name}>
                  {file.name}
                </strong>

                <span>
                  {formatFileSize(
                    file.size
                  )}{" "}
                  ·{" "}
                  {pageCount} page
                  {pageCount === 1
                    ? ""
                    : "s"}
                </span>
              </div>

              <div className="rotate-pdf-file-stat">
                {scope === "all"
                  ? "All pages"
                  : `${selectedCount} selected`}
              </div>
            </div>

            <section className="rotate-pdf-settings">
              <div className="rotate-pdf-section">
                <div className="rotate-pdf-section-label">
                  Pages to rotate
                </div>

                <div className="rotate-pdf-scope-grid">
                  <button
                    type="button"
                    className={
                      scope === "all"
                        ? "rotate-pdf-scope-button active"
                        : "rotate-pdf-scope-button"
                    }
                    onClick={() => {
                      setScope("all");
                      setError("");
                    }}
                    disabled={
                      isProcessing
                    }
                  >
                    <strong>
                      All pages
                    </strong>

                    <span>
                      Apply the rotation to every page in the PDF.
                    </span>
                  </button>

                  <button
                    type="button"
                    className={
                      scope === "selected"
                        ? "rotate-pdf-scope-button active"
                        : "rotate-pdf-scope-button"
                    }
                    onClick={() => {
                      setScope(
                        "selected"
                      );
                      setError("");
                    }}
                    disabled={
                      isProcessing
                    }
                  >
                    <strong>
                      Selected pages
                    </strong>

                    <span>
                      Rotate only the pages you choose below.
                    </span>
                  </button>
                </div>
              </div>

              <div className="rotate-pdf-section">
                <div className="rotate-pdf-section-label">
                  Rotation
                </div>

                <div className="rotate-pdf-angle-grid">
                  <button
                    type="button"
                    className={
                      rotation === 90
                        ? "rotate-pdf-angle-button active"
                        : "rotate-pdf-angle-button"
                    }
                    onClick={() => {
                      setRotation(90);
                      setError("");
                    }}
                    disabled={
                      isProcessing
                    }
                  >
                    <span className="rotate-pdf-angle-symbol">
                      ↻
                    </span>

                    <span className="rotate-pdf-angle-label">
                      90°
                    </span>
                  </button>

                  <button
                    type="button"
                    className={
                      rotation === 180
                        ? "rotate-pdf-angle-button active"
                        : "rotate-pdf-angle-button"
                    }
                    onClick={() => {
                      setRotation(180);
                      setError("");
                    }}
                    disabled={
                      isProcessing
                    }
                  >
                    <span className="rotate-pdf-angle-symbol">
                      ⟳
                    </span>

                    <span className="rotate-pdf-angle-label">
                      180°
                    </span>
                  </button>

                  <button
                    type="button"
                    className={
                      rotation === 270
                        ? "rotate-pdf-angle-button active"
                        : "rotate-pdf-angle-button"
                    }
                    onClick={() => {
                      setRotation(270);
                      setError("");
                    }}
                    disabled={
                      isProcessing
                    }
                  >
                    <span className="rotate-pdf-angle-symbol">
                      ↺
                    </span>

                    <span className="rotate-pdf-angle-label">
                      270°
                    </span>
                  </button>
                </div>
              </div>

              {scope === "selected" && (
                <div className="rotate-pdf-section">
                  <div className="rotate-pdf-selection-header">
                    <div className="rotate-pdf-section-label">
                      Select pages
                    </div>

                    <div className="rotate-pdf-selection-count">
                      {selectedCount} of{" "}
                      {pageCount} selected
                    </div>
                  </div>

                  <div className="rotate-pdf-selection-actions">
                    <button
                      type="button"
                      className="rotate-pdf-small-button"
                      onClick={
                        selectAllPages
                      }
                      disabled={
                        isProcessing ||
                        allPagesSelected
                      }
                    >
                      Select all
                    </button>

                    <button
                      type="button"
                      className="rotate-pdf-small-button"
                      onClick={
                        clearSelection
                      }
                      disabled={
                        isProcessing ||
                        selectedCount === 0
                      }
                    >
                      Clear
                    </button>
                  </div>

                  <div className="rotate-pdf-page-grid">
                    {Array.from(
                      {
                        length:
                          pageCount,
                      },
                      (_, index) => {
                        const pageNumber =
                          index + 1;

                        const isSelected =
                          selectedPages.includes(
                            pageNumber
                          );

                        return (
                          <button
                            type="button"
                            key={
                              pageNumber
                            }
                            className={
                              isSelected
                                ? "rotate-pdf-page-button selected"
                                : "rotate-pdf-page-button"
                            }
                            onClick={() =>
                              togglePage(
                                pageNumber
                              )
                            }
                            disabled={
                              isProcessing
                            }
                            aria-pressed={
                              isSelected
                            }
                          >
                            {String(
                              pageNumber
                            ).padStart(
                              2,
                              "0"
                            )}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              )}

              <div className="rotate-pdf-stats">
                <div className="rotate-pdf-stat">
                  <span>
                    PDF pages
                  </span>

                  <strong>
                    {pageCount}
                  </strong>
                </div>

                <div className="rotate-pdf-stat">
                  <span>
                    Will rotate
                  </span>

                  <strong>
                    {scope === "all"
                      ? pageCount
                      : selectedCount}
                  </strong>
                </div>

                <div className="rotate-pdf-stat">
                  <span>
                    Rotation
                  </span>

                  <strong>
                    {rotation}°
                  </strong>
                </div>
              </div>
            </section>

            {error && (
              <div
                className="rotate-pdf-error"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="rotate-pdf-actions">
              <button
                type="button"
                className="rotate-pdf-secondary"
                onClick={
                  handleReset
                }
                disabled={
                  isProcessing
                }
              >
                Reset
              </button>

              <button
                type="button"
                className="rotate-pdf-primary"
                onClick={
                  handleRotate
                }
                disabled={
                  isProcessing
                }
              >
                {isProcessing
                  ? "Rotating…"
                  : `Rotate ${rotation}°`}
              </button>
            </div>

            {result && (
              <div className="rotate-pdf-result">
                <div className="rotate-pdf-result-icon">
                  PDF
                </div>

                <div className="rotate-pdf-result-info">
                  <strong>
                    Rotated PDF ready
                  </strong>

                  <span>
                    {result.scope ===
                    "all"
                      ? `${pageCount} pages rotated`
                      : `${result.pageCount} selected pages rotated`}{" "}
                    · Rotation{" "}
                    {result.rotation}°
                  </span>
                </div>

                <a
                  href={result.url}
                  download="rotated-pdf.pdf"
                  className="rotate-pdf-download"
                >
                  Download
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

export default RotatePdf;