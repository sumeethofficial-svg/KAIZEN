import { useEffect, useMemo, useState } from "react";
import FileDropzone from "../../../components/files/FileDropzone";
import {
  loadPageOrder,
  organizePdf,
} from "../../../services/pdf/organizePages";

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function OrganizePages() {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]);
  const [originalPages, setOriginalPages] = useState([]);

  const [isReading, setIsReading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (result?.url) {
        URL.revokeObjectURL(result.url);
      }
    };
  }, [result]);

  const pageCount = pages.length;

  const hasChanges = useMemo(() => {
    if (pages.length !== originalPages.length) {
      return true;
    }

    return pages.some((page, index) => {
      const originalPage = originalPages[index];

      if (!originalPage) {
        return true;
      }

      return (
        page.sourceIndex !== originalPage.sourceIndex ||
        page.rotation !== originalPage.rotation ||
        page.id !== originalPage.id
      );
    });
  }, [pages, originalPages]);

  async function handleFileSelected(files) {
    const selectedFile = files?.[0];

    if (!selectedFile) {
      return;
    }

    setError("");
    setResult(null);
    setFile(null);
    setPages([]);
    setOriginalPages([]);
    setIsReading(true);

    try {
      const loaded = await loadPageOrder(
        selectedFile
      );

      const initialPages = loaded.pages.map(
        (page) => ({
          ...page,
        })
      );

      setFile(selectedFile);
      setPages(initialPages);
      setOriginalPages(initialPages);
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

  function movePage(fromIndex, toIndex) {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= pages.length ||
      toIndex >= pages.length
    ) {
      return;
    }

    setPages((currentPages) => {
      const updatedPages = [...currentPages];

      const [movedPage] =
        updatedPages.splice(
          fromIndex,
          1
        );

      updatedPages.splice(
        toIndex,
        0,
        movedPage
      );

      return updatedPages;
    });

    setError("");
  }

  function handleDragStart(event, index) {
    setDraggedIndex(index);

    event.dataTransfer.effectAllowed =
      "move";

    event.dataTransfer.setData(
      "text/plain",
      String(index)
    );
  }

  function handleDragOver(event, index) {
    event.preventDefault();

    event.dataTransfer.dropEffect =
      "move";

    setDragOverIndex(index);
  }

  function handleDrop(event, targetIndex) {
    event.preventDefault();

    const sourceIndex = Number(
      event.dataTransfer.getData(
        "text/plain"
      )
    );

    const validSourceIndex =
      Number.isInteger(sourceIndex)
        ? sourceIndex
        : draggedIndex;

    if (
      validSourceIndex !== null &&
      validSourceIndex !== undefined
    ) {
      movePage(
        validSourceIndex,
        targetIndex
      );
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function rotatePage(index) {
    setPages((currentPages) =>
      currentPages.map(
        (page, pageIndex) => {
          if (pageIndex !== index) {
            return page;
          }

          return {
            ...page,
            rotation:
              (page.rotation + 90) % 360,
          };
        }
      )
    );

    setError("");
  }

  function duplicatePage(index) {
    setPages((currentPages) => {
      const sourcePage =
        currentPages[index];

      if (!sourcePage) {
        return currentPages;
      }

      const duplicate = {
        ...sourcePage,
        id: `${sourcePage.id}-copy-${Date.now()}`,
      };

      return [
        ...currentPages.slice(
          0,
          index + 1
        ),
        duplicate,
        ...currentPages.slice(
          index + 1
        ),
      ];
    });

    setError("");
  }

  function deletePage(index) {
    if (pages.length <= 1) {
      setError(
        "At least one page must remain in the PDF."
      );

      return;
    }

    setPages((currentPages) =>
      currentPages.filter(
        (_, pageIndex) =>
          pageIndex !== index
      )
    );

    setError("");
  }

  function movePageUp(index) {
    if (index === 0) {
      return;
    }

    movePage(
      index,
      index - 1
    );
  }

  function movePageDown(index) {
    if (
      index === pages.length - 1
    ) {
      return;
    }

    movePage(
      index,
      index + 1
    );
  }

  function restoreOriginal() {
    const restoredPages =
      originalPages.map(
        (page) => ({
          ...page,
        })
      );

    setPages(restoredPages);
    setError("");
  }

  async function handleOrganize() {
    if (!file) {
      setError(
        "Please select a PDF first."
      );

      return;
    }

    if (pages.length === 0) {
      setError(
        "At least one page must remain."
      );

      return;
    }

    setError("");
    setIsProcessing(true);

    try {
      const pageOrder =
        pages.map((page) => ({
          sourceIndex:
            page.sourceIndex,
          rotation:
            page.rotation,
        }));

      const blob =
        await organizePdf(
          file,
          pageOrder
        );

      if (result?.url) {
        URL.revokeObjectURL(
          result.url
        );
      }

      const url =
        URL.createObjectURL(blob);

      setResult({
        blob,
        url,
        pageCount:
          pages.length,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to organize this PDF."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  function handleReset() {
    if (result?.url) {
      URL.revokeObjectURL(
        result.url
      );
    }

    setFile(null);
    setPages([]);
    setOriginalPages([]);
    setResult(null);
    setError("");
    setDraggedIndex(null);
    setDragOverIndex(null);
    setIsReading(false);
    setIsProcessing(false);
  }

  return (
    <>
      <style>{`
        /*
        =========================================================
        ORGANIZE PAGES WORKSPACE
        =========================================================
        */

        .organize-pages-workspace {
          width: 100%;
          max-width: 1080px;

          margin: 0 auto;

          /*
           * Important:
           * This horizontal padding keeps every inner card away
           * from the outer KAIZEN tool-shell border.
           */
          padding: 20px 46px 38px;

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

        .organize-pages-empty {
          width: 100%;
          max-width: none;

          height: 100%;
          min-height: 0;

          margin: 0;

          padding: 28px 46px 40px;

          box-sizing: border-box;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .organize-pages-empty
        .organize-pages-upload {
          width: 100%;
          max-width: 920px;
        }

        /*
        =========================================================
        UPLOAD
        =========================================================
        */

        .organize-pages-upload {
          width: 100%;
        }

        .organize-pages-dropzone {
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

        .organize-pages-dropzone:hover {
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

        .organize-pages-dropzone label {
          width: 100%;
          height: 100%;

          cursor: pointer;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .organize-pages-dropzone input {
          position: absolute;
          inset: 0;

          width: 100%;
          height: 100%;

          opacity: 0;
          cursor: pointer;
        }

        .organize-pages-upload-content {
          display: flex;
          flex-direction: column;

          align-items: center;

          gap: 8px;

          text-align: center;
        }

        .organize-pages-upload-icon {
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

        .organize-pages-upload-title {
          color:
            rgba(255, 255, 255, 0.93);

          font-size: 17px;
          font-weight: 650;
        }

        .organize-pages-upload-subtitle {
          color:
            rgba(255, 255, 255, 0.40);

          font-size: 12px;
        }

        /*
        =========================================================
        FILE HEADER
        =========================================================
        */

        .organize-pages-file-header {
          width: 100%;
          min-height: 82px;

          padding: 15px 18px;

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

        .organize-pages-file-icon {
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

        .organize-pages-file-info {
          min-width: 0;
          flex: 1;

          display: flex;
          flex-direction: column;

          gap: 5px;
        }

        .organize-pages-file-info strong {
          color:
            rgba(255, 255, 255, 0.91);

          font-size: 14px;
          font-weight: 620;

          white-space: nowrap;

          overflow: hidden;

          text-overflow: ellipsis;
        }

        .organize-pages-file-info span {
          color:
            rgba(255, 255, 255, 0.36);

          font-size: 11px;
        }

        .organize-pages-file-stat {
          flex-shrink: 0;

          padding: 9px 12px;

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
        TOOLBAR
        =========================================================
        */

        .organize-pages-toolbar {
          width: 100%;

          padding: 15px 17px;

          box-sizing: border-box;

          border:
            1px solid
            rgba(255, 255, 255, 0.075);

          border-radius: 18px;

          background:
            rgba(255, 255, 255, 0.020);

          display: flex;
          align-items: center;

          justify-content: space-between;

          gap: 12px;
        }

        .organize-pages-toolbar-info {
          display: flex;
          flex-direction: column;

          gap: 4px;
        }

        .organize-pages-toolbar-info strong {
          color:
            rgba(255, 255, 255, 0.86);

          font-size: 13px;
          font-weight: 650;
        }

        .organize-pages-toolbar-info span {
          color:
            rgba(255, 255, 255, 0.34);

          font-size: 11px;
        }

        .organize-pages-toolbar-actions {
          display: flex;
          align-items: center;

          gap: 8px;
        }

        .organize-pages-tool-button {
          min-height: 38px;

          padding: 0 13px;

          border-radius: 11px;

          border:
            1px solid
            rgba(255, 255, 255, 0.075);

          background:
            rgba(255, 255, 255, 0.022);

          color:
            rgba(255, 255, 255, 0.58);

          font-size: 11px;
          font-weight: 650;

          cursor: pointer;

          transition:
            background 180ms ease,
            border-color 180ms ease,
            color 180ms ease;
        }

        .organize-pages-tool-button:hover:not(:disabled) {
          background:
            rgba(255, 255, 255, 0.045);

          border-color:
            rgba(255, 126, 20, 0.22);

          color:
            rgba(255, 255, 255, 0.82);
        }

        .organize-pages-tool-button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        /*
        =========================================================
        PAGE GRID
        =========================================================
        */

        .organize-pages-grid {
          width: 100%;

          display: grid;

          grid-template-columns:
            repeat(
              auto-fill,
              minmax(210px, 1fr)
            );

          gap: 14px;
        }

        /*
        =========================================================
        PAGE CARD
        =========================================================
        */

        .organize-pages-card {
          position: relative;

          min-width: 0;

          padding: 12px;

          border-radius: 18px;

          border:
            1px solid
            rgba(255, 255, 255, 0.075);

          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.032),
              rgba(255, 255, 255, 0.014)
            );

          cursor: grab;

          transition:
            transform 180ms ease,
            border-color 180ms ease,
            background 180ms ease,
            opacity 180ms ease;
        }

        .organize-pages-card:hover {
          transform:
            translateY(-2px);

          border-color:
            rgba(255, 126, 20, 0.22);

          background:
            linear-gradient(
              180deg,
              rgba(255, 126, 20, 0.040),
              rgba(255, 255, 255, 0.014)
            );
        }

        .organize-pages-card:active {
          cursor: grabbing;
        }

        .organize-pages-card.dragging {
          opacity: 0.35;
        }

        .organize-pages-card.drag-over {
          border-color:
            rgba(255, 126, 20, 0.52);

          box-shadow:
            0 0 0 2px
              rgba(255, 126, 20, 0.08);
        }

        /*
        =========================================================
        PAGE PREVIEW
        =========================================================
        */

        .organize-pages-preview {
          position: relative;

          width: 100%;

          aspect-ratio:
            0.707 / 1;

          border-radius: 12px;

          overflow: hidden;

          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.97),
              rgba(238, 238, 238, 0.94)
            );

          box-shadow:
            0 12px 22px
              rgba(0, 0, 0, 0.18);

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .organize-pages-paper {
          width: 82%;
          height: 84%;

          display: flex;
          flex-direction: column;

          align-items: center;
          justify-content: center;

          gap: 8px;

          transform-origin: center;
        }

        .organize-pages-paper-number {
          color: #222222;

          font-size: 30px;

          font-weight: 800;

          letter-spacing: -0.03em;
        }

        .organize-pages-paper-label {
          color:
            rgba(25, 25, 25, 0.43);

          font-size: 9px;

          font-weight: 700;

          letter-spacing: 0.18em;
        }

        .organize-pages-paper-lines {
          width: 64%;

          display: flex;
          flex-direction: column;

          gap: 5px;

          opacity: 0.35;
        }

        .organize-pages-paper-line {
          height: 3px;

          border-radius: 5px;

          background:
            rgba(25, 25, 25, 0.30);
        }

        .organize-pages-paper-line:nth-child(2) {
          width: 88%;
        }

        .organize-pages-paper-line:nth-child(3) {
          width: 76%;
        }

        .organize-pages-paper-line:nth-child(4) {
          width: 91%;
        }

        /*
        =========================================================
        PAGE BADGES
        =========================================================
        */

        .organize-pages-number-badge {
          position: absolute;

          top: 8px;
          left: 8px;

          min-width: 30px;
          height: 26px;

          padding: 0 8px;

          border-radius: 9px;

          background:
            rgba(9, 9, 10, 0.84);

          border:
            1px solid
            rgba(255, 255, 255, 0.10);

          color:
            rgba(255, 255, 255, 0.78);

          display: flex;
          align-items: center;
          justify-content: center;

          font-size: 10px;
          font-weight: 750;
        }

        .organize-pages-rotation-badge {
          position: absolute;

          top: 8px;
          right: 8px;

          width: 28px;
          height: 26px;

          border-radius: 9px;

          background:
            rgba(255, 126, 20, 0.88);

          color: #ffffff;

          display: flex;
          align-items: center;
          justify-content: center;

          font-size: 10px;
          font-weight: 800;
        }

        /*
        =========================================================
        PAGE INFO
        =========================================================
        */

        .organize-pages-card-info {
          padding:
            10px 2px 8px;

          display: flex;
          flex-direction: column;

          gap: 4px;
        }

        .organize-pages-card-info strong {
          color:
            rgba(255, 255, 255, 0.83);

          font-size: 12px;

          font-weight: 650;
        }

        .organize-pages-card-info span {
          color:
            rgba(255, 255, 255, 0.32);

          font-size: 10px;
        }

        /*
        =========================================================
        PAGE ACTIONS
        =========================================================
        */

        .organize-pages-card-actions {
          display: grid;

          grid-template-columns:
            repeat(5, 1fr);

          gap: 5px;
        }

        .organize-pages-card-button {
          height: 32px;

          padding: 0;

          border-radius: 9px;

          border:
            1px solid
            rgba(255, 255, 255, 0.065);

          background:
            rgba(255, 255, 255, 0.020);

          color:
            rgba(255, 255, 255, 0.46);

          font-size: 12px;

          cursor: pointer;

          transition:
            background 160ms ease,
            color 160ms ease,
            border-color 160ms ease;
        }

        .organize-pages-card-button:hover:not(:disabled) {
          background:
            rgba(255, 126, 20, 0.065);

          border-color:
            rgba(255, 126, 20, 0.22);

          color:
            rgba(255, 255, 255, 0.86);
        }

        .organize-pages-card-button.delete:hover:not(:disabled) {
          background:
            rgba(255, 70, 70, 0.07);

          border-color:
            rgba(255, 90, 90, 0.24);

          color:
            rgba(255, 190, 190, 0.90);
        }

        .organize-pages-card-button:disabled {
          opacity: 0.24;
          cursor: not-allowed;
        }

        /*
        =========================================================
        ERROR
        =========================================================
        */

        .organize-pages-error {
          width: 100%;

          box-sizing: border-box;

          padding:
            12px 14px;

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
        BOTTOM ACTIONS
        =========================================================
        */

        .organize-pages-actions {
          width: 100%;

          display: flex;

          align-items: center;
          justify-content: center;

          gap: 10px;

          padding-top: 2px;
        }

        .organize-pages-primary {
          min-height: 46px;

          padding: 0 22px;

          border-radius: 13px;

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

          color: #ffffff;

          font-size: 13px;
          font-weight: 700;

          cursor: pointer;

          box-shadow:
            0 12px 30px
              rgba(255, 126, 20, 0.12);

          transition:
            transform 180ms ease,
            opacity 180ms ease;
        }

        .organize-pages-primary:hover:not(:disabled) {
          transform:
            translateY(-1px);
        }

        .organize-pages-secondary {
          min-height: 46px;

          padding: 0 19px;

          border-radius: 13px;

          border:
            1px solid
            rgba(255, 255, 255, 0.085);

          background:
            rgba(255, 255, 255, 0.025);

          color:
            rgba(255, 255, 255, 0.60);

          font-size: 13px;
          font-weight: 700;

          cursor: pointer;

          transition:
            background 180ms ease,
            color 180ms ease;
        }

        .organize-pages-secondary:hover:not(:disabled) {
          background:
            rgba(255, 255, 255, 0.045);

          color:
            rgba(255, 255, 255, 0.84);
        }

        .organize-pages-primary:disabled,
        .organize-pages-secondary:disabled {
          opacity: 0.42;
          cursor: not-allowed;
        }

        /*
        =========================================================
        RESULT
        =========================================================
        */

        .organize-pages-result {
          width: 100%;

          padding: 19px;

          box-sizing: border-box;

          border-radius: 19px;

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

          gap: 14px;
        }

        .organize-pages-result-icon {
          width: 44px;
          height: 44px;

          flex-shrink: 0;

          border-radius: 12px;

          background:
            rgba(255, 126, 20, 0.08);

          border:
            1px solid
            rgba(255, 126, 20, 0.18);

          color:
            #ff9846;

          display: flex;
          align-items: center;
          justify-content: center;

          font-size: 11px;
          font-weight: 800;
        }

        .organize-pages-result-info {
          flex: 1;
          min-width: 0;

          display: flex;
          flex-direction: column;

          gap: 4px;
        }

        .organize-pages-result-info strong {
          color:
            rgba(255, 255, 255, 0.88);

          font-size: 13px;
          font-weight: 650;
        }

        .organize-pages-result-info span {
          color:
            rgba(255, 255, 255, 0.34);

          font-size: 11px;
        }

        .organize-pages-download {
          min-height: 39px;

          padding: 0 14px;

          flex-shrink: 0;

          border-radius: 11px;

          border:
            1px solid
            rgba(255, 126, 20, 0.20);

          background:
            rgba(255, 126, 20, 0.055);

          color:
            #ff9e50;

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

        .organize-pages-loading {
          min-height: 48px;

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
          .organize-pages-workspace {
            padding-left: 28px;
            padding-right: 28px;
          }

          .organize-pages-empty {
            padding-left: 28px;
            padding-right: 28px;
          }

          .organize-pages-grid {
            grid-template-columns:
              repeat(
                auto-fill,
                minmax(190px, 1fr)
              );
          }
        }

        @media (max-width: 600px) {
          .organize-pages-workspace {
            padding:
              14px 14px 28px;
          }

          .organize-pages-empty {
            padding:
              18px 14px 28px;
          }

          .organize-pages-toolbar {
            align-items: flex-start;
            flex-direction: column;
          }

          .organize-pages-toolbar-actions {
            width: 100%;
          }

          .organize-pages-toolbar-actions
          .organize-pages-tool-button {
            flex: 1;
          }

          .organize-pages-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );

            gap: 9px;
          }

          .organize-pages-file-header {
            align-items: flex-start;
          }

          .organize-pages-file-stat {
            display: none;
          }

          .organize-pages-actions {
            flex-direction: column;
          }

          .organize-pages-primary,
          .organize-pages-secondary {
            width: 100%;
          }

          .organize-pages-result {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .organize-pages-download {
            width: 100%;
          }
        }
      `}</style>

      <div
        className={
          file
            ? "organize-pages-workspace"
            : "organize-pages-workspace organize-pages-empty"
        }
      >
        {!file ? (
          <div className="organize-pages-upload">
            <FileDropzone
              accept="application/pdf,.pdf"
              multiple={false}
              onFiles={
                handleFileSelected
              }
              className="organize-pages-dropzone"
            >
              <div className="organize-pages-upload-content">
                <div className="organize-pages-upload-icon">
                  PDF
                </div>

                <div className="organize-pages-upload-title">
                  {isReading
                    ? "Reading PDF…"
                    : "Choose a PDF to organize"}
                </div>

                <div className="organize-pages-upload-subtitle">
                  Rearrange, rotate, duplicate or delete pages
                </div>
              </div>
            </FileDropzone>
          </div>
        ) : (
          <>
            <div className="organize-pages-file-header">
              <div className="organize-pages-file-icon">
                PDF
              </div>

              <div className="organize-pages-file-info">
                <strong
                  title={file.name}
                >
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

              <div className="organize-pages-file-stat">
                {hasChanges
                  ? "Modified"
                  : "Original order"}
              </div>
            </div>

            <div className="organize-pages-toolbar">
              <div className="organize-pages-toolbar-info">
                <strong>
                  Organize your pages
                </strong>

                <span>
                  Drag pages into a new order or use the page controls.
                </span>
              </div>

              <div className="organize-pages-toolbar-actions">
                <button
                  type="button"
                  className="organize-pages-tool-button"
                  onClick={
                    restoreOriginal
                  }
                  disabled={
                    isProcessing ||
                    !hasChanges
                  }
                >
                  Restore original
                </button>

                <button
                  type="button"
                  className="organize-pages-tool-button"
                  onClick={
                    handleReset
                  }
                  disabled={
                    isProcessing
                  }
                >
                  Replace PDF
                </button>
              </div>
            </div>

            <div className="organize-pages-grid">
              {pages.map(
                (page, index) => {
                  const isDragging =
                    draggedIndex ===
                    index;

                  const isDragOver =
                    dragOverIndex ===
                      index &&
                    draggedIndex !==
                      index;

                  return (
                    <div
                      key={page.id}
                      className={[
                        "organize-pages-card",
                        isDragging
                          ? "dragging"
                          : "",
                        isDragOver
                          ? "drag-over"
                          : "",
                      ]
                        .filter(
                          Boolean
                        )
                        .join(" ")}
                      draggable={
                        !isProcessing
                      }
                      onDragStart={(
                        event
                      ) =>
                        handleDragStart(
                          event,
                          index
                        )
                      }
                      onDragOver={(
                        event
                      ) =>
                        handleDragOver(
                          event,
                          index
                        )
                      }
                      onDrop={(event) =>
                        handleDrop(
                          event,
                          index
                        )
                      }
                      onDragEnd={
                        handleDragEnd
                      }
                    >
                      <div className="organize-pages-preview">
                        <div className="organize-pages-number-badge">
                          {String(
                            index + 1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </div>

                        {page.rotation !==
                          0 && (
                          <div className="organize-pages-rotation-badge">
                            {
                              page.rotation
                            }°
                          </div>
                        )}

                        <div
                          className="organize-pages-paper"
                          style={{
                            transform:
                              `rotate(${page.rotation}deg)`,
                          }}
                        >
                          <div className="organize-pages-paper-label">
                            ORIGINAL PAGE
                          </div>

                          <div className="organize-pages-paper-number">
                            {
                              page.pageNumber
                            }
                          </div>

                          <div className="organize-pages-paper-lines">
                            <div className="organize-pages-paper-line" />
                            <div className="organize-pages-paper-line" />
                            <div className="organize-pages-paper-line" />
                            <div className="organize-pages-paper-line" />
                          </div>
                        </div>
                      </div>

                      <div className="organize-pages-card-info">
                        <strong>
                          Page{" "}
                          {
                            page.pageNumber
                          }
                        </strong>

                        <span>
                          Position{" "}
                          {index + 1}
                          {page.rotation !==
                            0
                            ? ` · ${page.rotation}° rotation`
                            : ""}
                        </span>
                      </div>

                      <div className="organize-pages-card-actions">
                        <button
                          type="button"
                          className="organize-pages-card-button"
                          onClick={() =>
                            movePageUp(
                              index
                            )
                          }
                          disabled={
                            isProcessing ||
                            index === 0
                          }
                          title="Move left"
                          aria-label="Move page left"
                        >
                          ←
                        </button>

                        <button
                          type="button"
                          className="organize-pages-card-button"
                          onClick={() =>
                            movePageDown(
                              index
                            )
                          }
                          disabled={
                            isProcessing ||
                            index ===
                              pages.length -
                                1
                          }
                          title="Move right"
                          aria-label="Move page right"
                        >
                          →
                        </button>

                        <button
                          type="button"
                          className="organize-pages-card-button"
                          onClick={() =>
                            rotatePage(
                              index
                            )
                          }
                          disabled={
                            isProcessing
                          }
                          title="Rotate 90 degrees"
                          aria-label="Rotate page"
                        >
                          ↻
                        </button>

                        <button
                          type="button"
                          className="organize-pages-card-button"
                          onClick={() =>
                            duplicatePage(
                              index
                            )
                          }
                          disabled={
                            isProcessing
                          }
                          title="Duplicate page"
                          aria-label="Duplicate page"
                        >
                          ＋
                        </button>

                        <button
                          type="button"
                          className="organize-pages-card-button delete"
                          onClick={() =>
                            deletePage(
                              index
                            )
                          }
                          disabled={
                            isProcessing ||
                            pages.length <=
                              1
                          }
                          title="Delete page"
                          aria-label="Delete page"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            {error && (
              <div
                className="organize-pages-error"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="organize-pages-actions">
              <button
                type="button"
                className="organize-pages-secondary"
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
                className="organize-pages-primary"
                onClick={
                  handleOrganize
                }
                disabled={
                  isProcessing
                }
              >
                {isProcessing
                  ? "Creating PDF…"
                  : "Organize PDF"}
              </button>
            </div>

            {result && (
              <div className="organize-pages-result">
                <div className="organize-pages-result-icon">
                  PDF
                </div>

                <div className="organize-pages-result-info">
                  <strong>
                    Organized PDF ready
                  </strong>

                  <span>
                    {result.pageCount} page
                    {result.pageCount ===
                    1
                      ? ""
                      : "s"}{" "}
                    · Your page arrangement has been applied
                  </span>
                </div>

                <a
                  href={result.url}
                  download="organized-pdf.pdf"
                  className="organize-pages-download"
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

export default OrganizePages;