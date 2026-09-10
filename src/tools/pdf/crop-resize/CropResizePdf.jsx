import {
  useEffect,
  useRef,
  useState,
} from "react";
import * as pdfjsLib from "pdfjs-dist";
import FileDropzone from "../../../components/files/FileDropzone";
import {
  cropResizePdf,
  getPdfInfo,
} from "../../../services/pdf/cropResizePdf";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).toString();

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CropResizePdf() {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);

  const [currentPage, setCurrentPage] =
    useState(1);

  const [pageInfo, setPageInfo] = useState([]);

  const [cropRect, setCropRect] = useState({
    x: 0.08,
    y: 0.08,
    width: 0.84,
    height: 0.84,
  });

  const [scope, setScope] = useState("all");
  const [selectedPages, setSelectedPages] =
    useState([]);

  const [resizeEnabled, setResizeEnabled] =
    useState(false);

  const [resizeWidth, setResizeWidth] =
    useState("");

  const [resizeHeight, setResizeHeight] =
    useState("");

  const [
    preserveAspectRatio,
    setPreserveAspectRatio,
  ] = useState(true);

  const [status, setStatus] =
    useState("idle");

  const [progress, setProgress] =
    useState(0);

  const [result, setResult] =
    useState(null);

  const [error, setError] =
    useState("");

  const [
    previewData,
    setPreviewData,
  ] = useState(null);

  const canvasRef = useRef(null);

  const cropInteractionRef =
    useRef(null);

  const selectedCount =
    selectedPages.length;

  const affectedPages =
    scope === "all"
      ? pageCount
      : selectedCount;

  const currentPageDetails =
    pageInfo[currentPage - 1];

  /*
   * Render the current PDF page into a canvas.
   */
  useEffect(() => {
    if (!file || !pageCount) {
      return;
    }

    let cancelled = false;

    async function renderPage() {
      try {
        const buffer =
          await file.arrayBuffer();

        const loadingTask =
          pdfjsLib.getDocument({
            data: new Uint8Array(
              buffer
            ),
          });

        const pdf =
          await loadingTask.promise;

        const page =
          await pdf.getPage(
            currentPage
          );

        const baseViewport =
          page.getViewport({
            scale: 1,
          });

        const maxWidth = 760;
        const maxHeight = 520;

        const scale = Math.min(
          maxWidth /
            baseViewport.width,
          maxHeight /
            baseViewport.height,
          1.4
        );

        const viewport =
          page.getViewport({
            scale,
          });

        const canvas =
          canvasRef.current;

        if (!canvas || cancelled) {
          await pdf.destroy();
          return;
        }

        const context =
          canvas.getContext("2d");

        if (!context) {
          await pdf.destroy();
          throw new Error(
            "Unable to create PDF preview."
          );
        }

        canvas.width =
          Math.ceil(viewport.width);

        canvas.height =
          Math.ceil(viewport.height);

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        if (!cancelled) {
          setPreviewData({
            width:
              viewport.width,
            height:
              viewport.height,
          });
        }

        page.cleanup();
        await pdf.destroy();
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to render the PDF preview."
          );
        }
      }
    }

    renderPage();

    return () => {
      cancelled = true;
    };
  }, [file, pageCount, currentPage]);

  function resetCrop() {
    setCropRect({
      x: 0.08,
      y: 0.08,
      width: 0.84,
      height: 0.84,
    });

    setError("");
  }

  function cropToFullPage() {
    setCropRect({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });

    setError("");
  }

  async function handleFiles(files) {
    const selectedFile = files?.[0];

    if (!selectedFile) {
      return;
    }

    const isPdf =
      selectedFile.type ===
        "application/pdf" ||
      selectedFile.name
        .toLowerCase()
        .endsWith(".pdf");

    if (!isPdf) {
      setStatus("error");
      setError(
        "Please select a valid PDF file."
      );
      return;
    }

    setFile(null);
    setPageCount(0);
    setPageInfo([]);
    setCurrentPage(1);
    setSelectedPages([]);
    setResult(null);
    setPreviewData(null);
    setProgress(0);
    setError("");
    setStatus("loading");

    try {
      const info =
        await getPdfInfo(
          selectedFile
        );

      if (
        !info.pageCount ||
        info.pageCount < 1
      ) {
        throw new Error(
          "The PDF does not contain any pages."
        );
      }

      setFile(selectedFile);
      setPageCount(
        info.pageCount
      );
      setPageInfo(
        info.pages
      );

      setScope("all");

      setCropRect({
        x: 0.08,
        y: 0.08,
        width: 0.84,
        height: 0.84,
      });

      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setError(
        err?.message ||
          "Unable to read this PDF file."
      );
    }
  }

  function getPointerPosition(
    event
  ) {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return null;
    }

    const rect =
      canvas.getBoundingClientRect();

    const clientX =
      event.touches?.[0]?.clientX ??
      event.clientX;

    const clientY =
      event.touches?.[0]?.clientY ??
      event.clientY;

    const x =
      (clientX - rect.left) /
      rect.width;

    const y =
      (clientY - rect.top) /
      rect.height;

    return {
      x: Math.max(
        0,
        Math.min(1, x)
      ),
      y: Math.max(
        0,
        Math.min(1, y)
      ),
    };
  }

  function startCropInteraction(
    event,
    type
  ) {
    event.preventDefault();

    const position =
      getPointerPosition(event);

    if (!position) {
      return;
    }

    cropInteractionRef.current =
      {
        type,
        startX: position.x,
        startY: position.y,
        initialCrop: {
          ...cropRect,
        },
      };

    window.addEventListener(
      "mousemove",
      handleCropMove
    );

    window.addEventListener(
      "mouseup",
      endCropInteraction
    );

    window.addEventListener(
      "touchmove",
      handleCropMove,
      {
        passive: false,
      }
    );

    window.addEventListener(
      "touchend",
      endCropInteraction
    );
  }

  function handleCropMove(
    event
  ) {
    event.preventDefault();

    const interaction =
      cropInteractionRef.current;

    if (!interaction) {
      return;
    }

    const position =
      getPointerPosition(event);

    if (!position) {
      return;
    }

    const {
      type,
      startX,
      startY,
      initialCrop,
    } = interaction;

    const dx =
      position.x - startX;

    const dy =
      position.y - startY;

    const minimumSize = 0.04;

    let nextCrop = {
      ...initialCrop,
    };

    if (type === "move") {
      nextCrop.x =
        clamp(
          initialCrop.x + dx,
          0,
          1 -
            initialCrop.width
        );

      nextCrop.y =
        clamp(
          initialCrop.y + dy,
          0,
          1 -
            initialCrop.height
        );
    }

    if (type === "nw") {
      const right =
        initialCrop.x +
        initialCrop.width;

      const bottom =
        initialCrop.y +
        initialCrop.height;

      const newX =
        clamp(
          initialCrop.x + dx,
          0,
          right - minimumSize
        );

      const newY =
        clamp(
          initialCrop.y + dy,
          0,
          bottom - minimumSize
        );

      nextCrop.x = newX;
      nextCrop.y = newY;
      nextCrop.width =
        right - newX;
      nextCrop.height =
        bottom - newY;
    }

    if (type === "ne") {
      const bottom =
        initialCrop.y +
        initialCrop.height;

      const newY =
        clamp(
          initialCrop.y + dy,
          0,
          bottom - minimumSize
        );

      const newRight =
        clamp(
          initialCrop.x +
            initialCrop.width +
            dx,
          initialCrop.x +
            minimumSize,
          1
        );

      nextCrop.y = newY;
      nextCrop.width =
        newRight -
        initialCrop.x;
      nextCrop.height =
        bottom - newY;
    }

    if (type === "sw") {
      const right =
        initialCrop.x +
        initialCrop.width;

      const newX =
        clamp(
          initialCrop.x + dx,
          0,
          right - minimumSize
        );

      const newBottom =
        clamp(
          initialCrop.y +
            initialCrop.height +
            dy,
          initialCrop.y +
            minimumSize,
          1
        );

      nextCrop.x = newX;
      nextCrop.width =
        right - newX;
      nextCrop.height =
        newBottom -
        initialCrop.y;
    }

    if (type === "se") {
      const newRight =
        clamp(
          initialCrop.x +
            initialCrop.width +
            dx,
          initialCrop.x +
            minimumSize,
          1
        );

      const newBottom =
        clamp(
          initialCrop.y +
            initialCrop.height +
            dy,
          initialCrop.y +
            minimumSize,
          1
        );

      nextCrop.width =
        newRight -
        initialCrop.x;

      nextCrop.height =
        newBottom -
        initialCrop.y;
    }

    if (type === "n") {
      const bottom =
        initialCrop.y +
        initialCrop.height;

      const newY =
        clamp(
          initialCrop.y + dy,
          0,
          bottom - minimumSize
        );

      nextCrop.y = newY;
      nextCrop.height =
        bottom - newY;
    }

    if (type === "s") {
      const newBottom =
        clamp(
          initialCrop.y +
            initialCrop.height +
            dy,
          initialCrop.y +
            minimumSize,
          1
        );

      nextCrop.height =
        newBottom -
        initialCrop.y;
    }

    if (type === "w") {
      const right =
        initialCrop.x +
        initialCrop.width;

      const newX =
        clamp(
          initialCrop.x + dx,
          0,
          right - minimumSize
        );

      nextCrop.x = newX;
      nextCrop.width =
        right - newX;
    }

    if (type === "e") {
      const newRight =
        clamp(
          initialCrop.x +
            initialCrop.width +
            dx,
          initialCrop.x +
            minimumSize,
          1
        );

      nextCrop.width =
        newRight -
        initialCrop.x;
    }

    setCropRect(nextCrop);
  }

  function endCropInteraction() {
    cropInteractionRef.current =
      null;

    window.removeEventListener(
      "mousemove",
      handleCropMove
    );

    window.removeEventListener(
      "mouseup",
      endCropInteraction
    );

    window.removeEventListener(
      "touchmove",
      handleCropMove
    );

    window.removeEventListener(
      "touchend",
      endCropInteraction
    );
  }

  function goToPreviousPage() {
    setCurrentPage(
      (current) =>
        Math.max(
          1,
          current - 1
        )
    );

    resetCrop();
  }

  function goToNextPage() {
    setCurrentPage(
      (current) =>
        Math.min(
          pageCount,
          current + 1
        )
    );

    resetCrop();
  }

  function togglePage(pageNumber) {
    setSelectedPages(
      (current) => {
        if (
          current.includes(
            pageNumber
          )
        ) {
          return current.filter(
            (page) =>
              page !== pageNumber
          );
        }

        return [
          ...current,
          pageNumber,
        ].sort(
          (a, b) => a - b
        );
      }
    );

    setError("");
  }

  function selectAllPages() {
    setSelectedPages(
      Array.from(
        {
          length: pageCount,
        },
        (_, index) => index + 1
      )
    );

    setError("");
  }

  function clearSelectedPages() {
    setSelectedPages([]);
    setError("");
  }

  async function handleProcess() {
    if (!file) {
      return;
    }

    if (
      scope === "selected" &&
      selectedPages.length === 0
    ) {
      setError(
        "Select at least one page."
      );
      setStatus("error");
      return;
    }

    const hasResize =
      resizeEnabled &&
      (String(
        resizeWidth
      ).trim() !== "" ||
        String(
          resizeHeight
        ).trim() !== "");

    if (
      !hasResize &&
      cropRect.width >= 0.999 &&
      cropRect.height >= 0.999 &&
      cropRect.x <= 0 &&
      cropRect.y <= 0
    ) {
      setError(
        "Adjust the crop area or enable resize before applying changes."
      );
      setStatus("error");
      return;
    }

    setError("");
    setResult(null);
    setProgress(0);
    setStatus("processing");

    try {
      const output =
        await cropResizePdf(
          file,
          {
            cropRect,
            resize: hasResize
              ? {
                  width:
                    resizeWidth === ""
                      ? null
                      : Number(
                          resizeWidth
                        ),
                  height:
                    resizeHeight === ""
                      ? null
                      : Number(
                          resizeHeight
                        ),
                  preserveAspectRatio,
                }
              : null,
          },
          scope === "all"
            ? null
            : selectedPages,
          (percentage) => {
            setProgress(
              Math.max(
                0,
                Math.min(
                  100,
                  percentage
                )
              )
            );
          }
        );

      setResult(output);
      setProgress(100);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(
        err?.message ||
          "Unable to crop or resize the PDF."
      );
    }
  }

  function handleDownload() {
    if (!result?.blob) {
      return;
    }

    const url =
      URL.createObjectURL(
        result.blob
      );

    const anchor =
      document.createElement("a");

    anchor.href = url;
    anchor.download =
      getOutputFileName(
        file?.name
      );

    document.body.appendChild(
      anchor
    );

    anchor.click();
    anchor.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function handleReset() {
    endCropInteraction();

    setFile(null);
    setPageCount(0);
    setPageInfo([]);
    setCurrentPage(1);

    setCropRect({
      x: 0.08,
      y: 0.08,
      width: 0.84,
      height: 0.84,
    });

    setScope("all");
    setSelectedPages([]);

    setResizeEnabled(false);
    setResizeWidth("");
    setResizeHeight("");
    setPreserveAspectRatio(true);

    setStatus("idle");
    setProgress(0);
    setResult(null);
    setPreviewData(null);
    setError("");
  }

  const cropWidthPercent =
    cropRect.width * 100;

  const cropHeightPercent =
    cropRect.height * 100;

  const cropLeftPercent =
    cropRect.x * 100;

  const cropTopPercent =
    cropRect.y * 100;

  return (
    <>
      <style>{`
        .crop-resize-workspace {
          width: 100%;
          max-width: 1080px;
          margin: 0 auto;
          padding: 22px 46px 38px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 18px;
          color: rgba(255, 255, 255, 0.95);
        }

        .crop-resize-workspace-empty {
          min-height: 420px;
          justify-content: center;
        }

        .crop-resize-upload {
          width: 100%;
        }

        .crop-resize-upload label {
          display: block;
          width: 100%;
          cursor: pointer;
        }

        .crop-resize-upload input {
          display: none;
        }

        .crop-resize-upload-box {
          min-height: 280px;
          border: 1px dashed rgba(255, 153, 72, 0.42);
          border-radius: 22px;
          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.045),
              rgba(255, 255, 255, 0.02)
            );
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.055),
            0 18px 48px rgba(0, 0, 0, 0.16);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 32px;
          box-sizing: border-box;
          transition:
            border-color 180ms ease,
            background 180ms ease,
            transform 180ms ease;
        }

        .crop-resize-upload-box:hover {
          border-color: rgba(255, 153, 72, 0.72);
          background:
            linear-gradient(
              180deg,
              rgba(255, 153, 72, 0.055),
              rgba(255, 255, 255, 0.025)
            );
          transform: translateY(-1px);
        }

        .crop-resize-upload-icon {
          width: 58px;
          height: 58px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 25px;
          font-weight: 700;
          background:
            radial-gradient(
              circle at 50% 40%,
              rgba(255, 151, 67, 0.95),
              rgba(237, 91, 26, 0.82) 55%,
              rgba(163, 47, 12, 0.7)
            );
          box-shadow:
            0 0 34px rgba(255, 119, 45, 0.24),
            inset 0 1px 0 rgba(255, 255, 255, 0.18);
          margin-bottom: 18px;
        }

        .crop-resize-upload-title {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .crop-resize-upload-subtitle {
          margin-top: 8px;
          color: rgba(255, 255, 255, 0.56);
          font-size: 14px;
        }

        .crop-resize-upload-meta {
          margin-top: 12px;
          color: rgba(255, 159, 84, 0.8);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.16em;
        }

        .crop-resize-file-card {
          min-height: 76px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.035);
          padding: 14px 17px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-sizing: border-box;
        }

        .crop-resize-file-icon {
          width: 46px;
          height: 46px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          background:
            linear-gradient(
              145deg,
              rgba(255, 133, 51, 0.9),
              rgba(184, 57, 16, 0.8)
            );
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          flex: 0 0 auto;
        }

        .crop-resize-file-info {
          min-width: 0;
          flex: 1;
        }

        .crop-resize-file-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
          font-weight: 650;
        }

        .crop-resize-file-meta {
          margin-top: 5px;
          color: rgba(255, 255, 255, 0.45);
          font-size: 11px;
        }

        .crop-resize-file-remove {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.035);
          color: rgba(255, 255, 255, 0.68);
          cursor: pointer;
          font-size: 18px;
        }

        .crop-resize-file-remove:hover {
          border-color: rgba(255, 123, 48, 0.34);
          background: rgba(255, 123, 48, 0.1);
          color: #ffffff;
        }

        .crop-resize-editor {
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.03),
              rgba(255, 255, 255, 0.018)
            );
          padding: 18px;
          box-sizing: border-box;
        }

        .crop-resize-editor-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 14px;
        }

        .crop-resize-editor-title {
          font-size: 13px;
          font-weight: 700;
        }

        .crop-resize-editor-subtitle {
          margin-top: 4px;
          color: rgba(255, 255, 255, 0.4);
          font-size: 10px;
        }

        .crop-resize-page-nav {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .crop-resize-nav-button,
        .crop-resize-tool-button {
          height: 34px;
          padding: 0 11px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.035);
          color: rgba(255, 255, 255, 0.68);
          cursor: pointer;
          font-size: 11px;
        }

        .crop-resize-nav-button:hover:not(:disabled),
        .crop-resize-tool-button:hover:not(:disabled) {
          color: #ffffff;
          border-color: rgba(255, 139, 56, 0.3);
          background: rgba(255, 139, 56, 0.07);
        }

        .crop-resize-nav-button:disabled,
        .crop-resize-tool-button:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .crop-resize-page-indicator {
          min-width: 72px;
          text-align: center;
          color: rgba(255, 255, 255, 0.56);
          font-size: 11px;
        }

        .crop-resize-canvas-shell {
          width: 100%;
          min-height: 430px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background:
            radial-gradient(
              circle at 50% 35%,
              rgba(255, 255, 255, 0.045),
              rgba(0, 0, 0, 0.16)
            );
          padding: 24px;
          box-sizing: border-box;
          overflow: hidden;
        }

        .crop-resize-canvas-wrap {
          position: relative;
          display: inline-block;
          max-width: 100%;
          line-height: 0;
          user-select: none;
        }

        .crop-resize-canvas {
          display: block;
          max-width: 100%;
          height: auto;
          background: #ffffff;
          box-shadow:
            0 18px 40px rgba(0, 0, 0, 0.32);
        }

        .crop-resize-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .crop-resize-dim {
          position: absolute;
          background: rgba(0, 0, 0, 0.54);
          pointer-events: none;
        }

        .crop-resize-dim-top {
          left: 0;
          right: 0;
          top: 0;
        }

        .crop-resize-dim-bottom {
          left: 0;
          right: 0;
          bottom: 0;
        }

        .crop-resize-dim-left {
          left: 0;
        }

        .crop-resize-dim-right {
          right: 0;
        }

        .crop-resize-selection {
          position: absolute;
          border: 2px solid rgba(255, 155, 82, 0.95);
          box-shadow:
            0 0 0 1px rgba(0, 0, 0, 0.35),
            0 0 28px rgba(255, 112, 35, 0.16);
          cursor: move;
          pointer-events: auto;
          box-sizing: border-box;
        }

        .crop-resize-grid-line {
          position: absolute;
          background: rgba(255, 255, 255, 0.28);
          pointer-events: none;
        }

        .crop-resize-grid-vertical {
          top: 0;
          bottom: 0;
          width: 1px;
        }

        .crop-resize-grid-horizontal {
          left: 0;
          right: 0;
          height: 1px;
        }

        .crop-resize-handle {
          position: absolute;
          width: 11px;
          height: 11px;
          border-radius: 3px;
          border: 2px solid #ffffff;
          background: #ff8b42;
          box-shadow:
            0 3px 10px rgba(0, 0, 0, 0.35);
          pointer-events: auto;
        }

        .crop-resize-handle-nw {
          top: -7px;
          left: -7px;
          cursor: nwse-resize;
        }

        .crop-resize-handle-ne {
          top: -7px;
          right: -7px;
          cursor: nesw-resize;
        }

        .crop-resize-handle-sw {
          bottom: -7px;
          left: -7px;
          cursor: nesw-resize;
        }

        .crop-resize-handle-se {
          bottom: -7px;
          right: -7px;
          cursor: nwse-resize;
        }

        .crop-resize-handle-n {
          top: -7px;
          left: calc(50% - 5px);
          cursor: ns-resize;
        }

        .crop-resize-handle-s {
          bottom: -7px;
          left: calc(50% - 5px);
          cursor: ns-resize;
        }

        .crop-resize-handle-w {
          left: -7px;
          top: calc(50% - 5px);
          cursor: ew-resize;
        }

        .crop-resize-handle-e {
          right: -7px;
          top: calc(50% - 5px);
          cursor: ew-resize;
        }

        .crop-resize-editor-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 13px;
        }

        .crop-resize-live-size {
          color: rgba(255, 255, 255, 0.5);
          font-size: 10px;
        }

        .crop-resize-editor-tools {
          display: flex;
          gap: 8px;
        }

        .crop-resize-controls {
          display: grid;
          grid-template-columns: repeat(
            2,
            minmax(0, 1fr)
          );
          gap: 14px;
        }

        .crop-resize-panel {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(255, 255, 255, 0.025);
          padding: 17px;
          box-sizing: border-box;
        }

        .crop-resize-panel-title {
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 13px;
        }

        .crop-resize-scope-row {
          display: grid;
          grid-template-columns: repeat(
            2,
            minmax(0, 1fr)
          );
          gap: 8px;
        }

        .crop-resize-scope-button {
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.025);
          color: rgba(255, 255, 255, 0.65);
          padding: 11px;
          cursor: pointer;
          text-align: left;
          font-size: 11px;
        }

        .crop-resize-scope-button.active {
          color: #ffffff;
          border-color: rgba(255, 145, 63, 0.45);
          background: rgba(255, 125, 45, 0.08);
        }

        .crop-resize-page-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
        }

        .crop-resize-page-count {
          color: rgba(255, 255, 255, 0.42);
          font-size: 10px;
        }

        .crop-resize-page-actions {
          display: flex;
          gap: 7px;
        }

        .crop-resize-page-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fill,
            minmax(54px, 1fr)
          );
          gap: 7px;
          margin-top: 10px;
          max-height: 140px;
          overflow-y: auto;
        }

        .crop-resize-page-button {
          min-height: 42px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(255, 255, 255, 0.02);
          color: rgba(255, 255, 255, 0.55);
          cursor: pointer;
          font-size: 10px;
        }

        .crop-resize-page-button.active {
          color: #ffffff;
          border-color: rgba(255, 144, 59, 0.52);
          background: rgba(255, 130, 45, 0.11);
        }

        .crop-resize-resize-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .crop-resize-resize-copy strong {
          display: block;
          font-size: 12px;
        }

        .crop-resize-resize-copy span {
          display: block;
          margin-top: 4px;
          color: rgba(255, 255, 255, 0.4);
          font-size: 10px;
        }

        .crop-resize-switch {
          width: 44px;
          height: 24px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.06);
          padding: 2px;
          cursor: pointer;
        }

        .crop-resize-switch span {
          display: block;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.62);
          transition: transform 160ms ease;
        }

        .crop-resize-switch.active {
          background: rgba(255, 128, 43, 0.15);
          border-color: rgba(255, 142, 55, 0.4);
        }

        .crop-resize-switch.active span {
          transform: translateX(18px);
          background: #ff9b59;
        }

        .crop-resize-resize-fields {
          display: grid;
          grid-template-columns: repeat(
            2,
            minmax(0, 1fr)
          );
          gap: 10px;
          margin-top: 13px;
        }

        .crop-resize-field {
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(255, 255, 255, 0.018);
          padding: 11px;
        }

        .crop-resize-field-label {
          display: block;
          color: rgba(255, 255, 255, 0.42);
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 7px;
        }

        .crop-resize-input {
          width: 100%;
          box-sizing: border-box;
          border-radius: 9px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.13);
          color: #ffffff;
          padding: 9px 10px;
          font-size: 11px;
          outline: none;
        }

        .crop-resize-input:focus {
          border-color: rgba(255, 145, 63, 0.48);
        }

        .crop-resize-aspect {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 11px;
          color: rgba(255, 255, 255, 0.5);
          font-size: 10px;
        }

        .crop-resize-aspect input {
          accent-color: #ff873d;
        }

        .crop-resize-summary {
          display: grid;
          grid-template-columns: repeat(
            3,
            minmax(0, 1fr)
          );
          gap: 9px;
          margin-top: 14px;
        }

        .crop-resize-summary-card {
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.018);
          padding: 11px;
        }

        .crop-resize-summary-label {
          color: rgba(255, 255, 255, 0.36);
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.09em;
        }

        .crop-resize-summary-value {
          margin-top: 5px;
          color: rgba(255, 255, 255, 0.86);
          font-size: 13px;
          font-weight: 700;
        }

        .crop-resize-progress {
          margin-top: 14px;
          padding: 13px;
          border-radius: 13px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.018);
        }

        .crop-resize-progress-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 9px;
        }

        .crop-resize-progress-label {
          color: rgba(255, 255, 255, 0.5);
          font-size: 11px;
        }

        .crop-resize-progress-value {
          color: rgba(255, 255, 255, 0.84);
          font-size: 11px;
          font-weight: 700;
        }

        .crop-resize-progress-track {
          height: 6px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.06);
        }

        .crop-resize-progress-fill {
          height: 100%;
          border-radius: inherit;
          background:
            linear-gradient(
              90deg,
              rgba(221, 75, 15, 0.95),
              rgba(255, 154, 76, 0.98)
            );
          transition: width 180ms ease;
        }

        .crop-resize-error {
          margin-top: 13px;
          padding: 12px 13px;
          border-radius: 12px;
          border: 1px solid rgba(255, 89, 69, 0.2);
          background: rgba(255, 73, 52, 0.06);
          color: rgba(255, 185, 175, 0.95);
          font-size: 11px;
          line-height: 1.5;
        }

        .crop-resize-actions {
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          margin-top: 14px;
        }

        .crop-resize-primary,
        .crop-resize-secondary {
          border-radius: 12px;
          padding: 11px 17px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .crop-resize-primary {
          border: 1px solid rgba(255, 174, 113, 0.22);
          color: #ffffff;
          background:
            radial-gradient(
              circle at 50% 30%,
              rgba(255, 157, 82, 0.98),
              rgba(232, 89, 24, 0.9) 60%,
              rgba(172, 53, 13, 0.86)
            );
          box-shadow:
            0 9px 26px rgba(255, 103, 32, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.17);
        }

        .crop-resize-primary:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .crop-resize-secondary {
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.68);
          background: rgba(255, 255, 255, 0.035);
        }

        .crop-resize-primary:disabled,
        .crop-resize-secondary:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .crop-resize-success {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          border-radius: 16px;
          border: 1px solid rgba(121, 255, 178, 0.12);
          background: rgba(95, 255, 160, 0.035);
          padding: 14px;
        }

        .crop-resize-success-title {
          font-size: 13px;
          font-weight: 700;
        }

        .crop-resize-success-meta {
          margin-top: 4px;
          color: rgba(255, 255, 255, 0.42);
          font-size: 11px;
        }

        @media (max-width: 850px) {
          .crop-resize-workspace {
            padding-left: 28px;
            padding-right: 28px;
          }

          .crop-resize-controls {
            grid-template-columns: 1fr;
          }

          .crop-resize-canvas-shell {
            min-height: 360px;
          }
        }

        @media (max-width: 640px) {
          .crop-resize-workspace {
            padding-left: 18px;
            padding-right: 18px;
          }

          .crop-resize-editor-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .crop-resize-canvas-shell {
            min-height: 300px;
            padding: 12px;
          }

          .crop-resize-scope-row,
          .crop-resize-resize-fields,
          .crop-resize-summary {
            grid-template-columns: 1fr;
          }

          .crop-resize-editor-footer,
          .crop-resize-success {
            align-items: flex-start;
            flex-direction: column;
          }

          .crop-resize-actions {
            flex-direction: column;
          }

          .crop-resize-primary,
          .crop-resize-secondary {
            width: 100%;
          }
        }
      `}</style>

      <div
        className={`crop-resize-workspace ${
          !file
            ? "crop-resize-workspace-empty"
            : ""
        }`}
      >
        {!file ? (
          <div className="crop-resize-upload">
            <FileDropzone
              accept="application/pdf,.pdf"
              onFiles={handleFiles}
            >
              <div className="crop-resize-upload-box">
                <div className="crop-resize-upload-icon">
                  ⌑
                </div>

                <div className="crop-resize-upload-title">
                  Drop your PDF here
                </div>

                <div className="crop-resize-upload-subtitle">
                  or click to browse
                </div>

                <div className="crop-resize-upload-meta">
                  PDF files only
                </div>
              </div>
            </FileDropzone>
          </div>
        ) : (
          <>
            <div className="crop-resize-file-card">
              <div className="crop-resize-file-icon">
                PDF
              </div>

              <div className="crop-resize-file-info">
                <div className="crop-resize-file-name">
                  {file.name}
                </div>

                <div className="crop-resize-file-meta">
                  {formatFileSize(
                    file.size
                  )}{" "}
                  ·{" "}
                  {pageCount}{" "}
                  {pageCount === 1
                    ? "page"
                    : "pages"}
                </div>
              </div>

              <button
                type="button"
                className="crop-resize-file-remove"
                onClick={
                  handleReset
                }
                disabled={
                  status ===
                  "processing"
                }
                aria-label="Remove PDF"
              >
                ×
              </button>
            </div>

            <div className="crop-resize-editor">
              <div className="crop-resize-editor-header">
                <div>
                  <div className="crop-resize-editor-title">
                    Crop page
                  </div>

                  <div className="crop-resize-editor-subtitle">
                    Drag the box or its handles to
                    choose the exact area
                  </div>
                </div>

                <div className="crop-resize-page-nav">
                  <button
                    type="button"
                    className="crop-resize-nav-button"
                    onClick={
                      goToPreviousPage
                    }
                    disabled={
                      currentPage ===
                        1 ||
                      status ===
                        "processing"
                    }
                  >
                    ←
                  </button>

                  <div className="crop-resize-page-indicator">
                    Page{" "}
                    {currentPage} /{" "}
                    {pageCount}
                  </div>

                  <button
                    type="button"
                    className="crop-resize-nav-button"
                    onClick={
                      goToNextPage
                    }
                    disabled={
                      currentPage ===
                        pageCount ||
                      status ===
                        "processing"
                    }
                  >
                    →
                  </button>
                </div>
              </div>

              <div className="crop-resize-canvas-shell">
                <div className="crop-resize-canvas-wrap">
                  <canvas
                    ref={canvasRef}
                    className="crop-resize-canvas"
                  />

                  {previewData && (
                    <div className="crop-resize-overlay">
                      <div
                        className="crop-resize-dim crop-resize-dim-top"
                        style={{
                          height: `${cropTopPercent}%`,
                        }}
                      />

                      <div
                        className="crop-resize-dim crop-resize-dim-bottom"
                        style={{
                          height: `${
                            100 -
                            cropTopPercent -
                            cropHeightPercent
                          }%`,
                        }}
                      />

                      <div
                        className="crop-resize-dim crop-resize-dim-left"
                        style={{
                          top: `${cropTopPercent}%`,
                          bottom: `${
                            100 -
                            cropTopPercent -
                            cropHeightPercent
                          }%`,
                          width: `${cropLeftPercent}%`,
                        }}
                      />

                      <div
                        className="crop-resize-dim crop-resize-dim-right"
                        style={{
                          top: `${cropTopPercent}%`,
                          bottom: `${
                            100 -
                            cropTopPercent -
                            cropHeightPercent
                          }%`,
                          width: `${
                            100 -
                            cropLeftPercent -
                            cropWidthPercent
                          }%`,
                        }}
                      />

                      <div
                        className="crop-resize-selection"
                        style={{
                          left: `${cropLeftPercent}%`,
                          top: `${cropTopPercent}%`,
                          width: `${cropWidthPercent}%`,
                          height: `${cropHeightPercent}%`,
                        }}
                        onMouseDown={(event) =>
                          startCropInteraction(
                            event,
                            "move"
                          )
                        }
                        onTouchStart={(event) =>
                          startCropInteraction(
                            event,
                            "move"
                          )
                        }
                      >
                        <div
                          className="crop-resize-grid-line crop-resize-grid-vertical"
                          style={{
                            left: "33.33%",
                          }}
                        />

                        <div
                          className="crop-resize-grid-line crop-resize-grid-vertical"
                          style={{
                            left: "66.66%",
                          }}
                        />

                        <div
                          className="crop-resize-grid-line crop-resize-grid-horizontal"
                          style={{
                            top: "33.33%",
                          }}
                        />

                        <div
                          className="crop-resize-grid-line crop-resize-grid-horizontal"
                          style={{
                            top: "66.66%",
                          }}
                        />

                        {[
                          "nw",
                          "n",
                          "ne",
                          "w",
                          "e",
                          "sw",
                          "s",
                          "se",
                        ].map((position) => (
                          <span
                            key={
                              position
                            }
                            className={`crop-resize-handle crop-resize-handle-${position}`}
                            onMouseDown={(event) => {
                              event.stopPropagation();

                              startCropInteraction(
                                event,
                                position
                              );
                            }}
                            onTouchStart={(event) => {
                              event.stopPropagation();

                              startCropInteraction(
                                event,
                                position
                              );
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="crop-resize-editor-footer">
                <div className="crop-resize-live-size">
                  Crop area:{" "}
                  <strong>
                    {Math.round(
                      cropWidthPercent
                    )}
                    %
                  </strong>{" "}
                  ×{" "}
                  <strong>
                    {Math.round(
                      cropHeightPercent
                    )}
                    %
                  </strong>
                  {currentPageDetails && (
                    <>
                      {" "}
                      · Page{" "}
                      {Math.round(
                        currentPageDetails.width *
                          cropRect.width
                      )}{" "}
                      ×{" "}
                      {Math.round(
                        currentPageDetails.height *
                          cropRect.height
                      )}{" "}
                      pt
                    </>
                  )}
                </div>

                <div className="crop-resize-editor-tools">
                  <button
                    type="button"
                    className="crop-resize-tool-button"
                    onClick={
                      resetCrop
                    }
                    disabled={
                      status ===
                      "processing"
                    }
                  >
                    Reset crop
                  </button>

                  <button
                    type="button"
                    className="crop-resize-tool-button"
                    onClick={
                      cropToFullPage
                    }
                    disabled={
                      status ===
                      "processing"
                    }
                  >
                    Full page
                  </button>
                </div>
              </div>
            </div>

            <div className="crop-resize-controls">
              <div className="crop-resize-panel">
                <div className="crop-resize-panel-title">
                  Apply to
                </div>

                <div className="crop-resize-scope-row">
                  <button
                    type="button"
                    className={`crop-resize-scope-button ${
                      scope ===
                      "all"
                        ? "active"
                        : ""
                    }`}
                    onClick={() => {
                      setScope("all");
                      setError("");
                    }}
                    disabled={
                      status ===
                      "processing"
                    }
                  >
                    All pages
                  </button>

                  <button
                    type="button"
                    className={`crop-resize-scope-button ${
                      scope ===
                      "selected"
                        ? "active"
                        : ""
                    }`}
                    onClick={() => {
                      setScope(
                        "selected"
                      );
                      setError("");
                    }}
                    disabled={
                      status ===
                      "processing"
                    }
                  >
                    Selected pages
                  </button>
                </div>

                {scope ===
                  "selected" && (
                  <>
                    <div className="crop-resize-page-toolbar">
                      <div className="crop-resize-page-count">
                        {selectedCount}{" "}
                        of{" "}
                        {pageCount}{" "}
                        selected
                      </div>

                      <div className="crop-resize-page-actions">
                        <button
                          type="button"
                          className="crop-resize-tool-button"
                          onClick={
                            selectAllPages
                          }
                          disabled={
                            status ===
                            "processing"
                          }
                        >
                          All
                        </button>

                        <button
                          type="button"
                          className="crop-resize-tool-button"
                          onClick={
                            clearSelectedPages
                          }
                          disabled={
                            selectedCount ===
                              0 ||
                            status ===
                              "processing"
                          }
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="crop-resize-page-grid">
                      {Array.from(
                        {
                          length:
                            pageCount,
                        },
                        (
                          _,
                          index
                        ) => {
                          const pageNumber =
                            index +
                            1;

                          const active =
                            selectedPages.includes(
                              pageNumber
                            );

                          return (
                            <button
                              key={
                                pageNumber
                              }
                              type="button"
                              className={`crop-resize-page-button ${
                                active
                                  ? "active"
                                  : ""
                              }`}
                              onClick={() =>
                                togglePage(
                                  pageNumber
                                )
                              }
                              disabled={
                                status ===
                                "processing"
                              }
                              aria-pressed={
                                active
                              }
                            >
                              {pageNumber}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="crop-resize-panel">
                <div className="crop-resize-resize-toggle">
                  <div className="crop-resize-resize-copy">
                    <strong>
                      Resize after crop
                    </strong>

                    <span>
                      Set a final page size after
                      cropping
                    </span>
                  </div>

                  <button
                    type="button"
                    className={`crop-resize-switch ${
                      resizeEnabled
                        ? "active"
                        : ""
                    }`}
                    onClick={() => {
                      setResizeEnabled(
                        (current) =>
                          !current
                      );
                      setError("");
                    }}
                    disabled={
                      status ===
                      "processing"
                    }
                    aria-pressed={
                      resizeEnabled
                    }
                    aria-label="Toggle resize"
                  >
                    <span />
                  </button>
                </div>

                {resizeEnabled && (
                  <>
                    <div className="crop-resize-resize-fields">
                      <div className="crop-resize-field">
                        <label className="crop-resize-field-label">
                          Width
                        </label>

                        <input
                          className="crop-resize-input"
                          type="number"
                          min="1"
                          step="1"
                          placeholder="Auto"
                          value={
                            resizeWidth
                          }
                          onChange={(
                            event
                          ) =>
                            setResizeWidth(
                              event.target
                                .value
                            )
                          }
                          disabled={
                            status ===
                            "processing"
                          }
                        />
                      </div>

                      <div className="crop-resize-field">
                        <label className="crop-resize-field-label">
                          Height
                        </label>

                        <input
                          className="crop-resize-input"
                          type="number"
                          min="1"
                          step="1"
                          placeholder="Auto"
                          value={
                            resizeHeight
                          }
                          onChange={(
                            event
                          ) =>
                            setResizeHeight(
                              event.target
                                .value
                            )
                          }
                          disabled={
                            status ===
                            "processing"
                          }
                        />
                      </div>
                    </div>

                    <label className="crop-resize-aspect">
                      <input
                        type="checkbox"
                        checked={
                          preserveAspectRatio
                        }
                        onChange={(
                          event
                        ) =>
                          setPreserveAspectRatio(
                            event.target
                              .checked
                          )
                        }
                        disabled={
                          status ===
                          "processing"
                        }
                      />

                      Preserve aspect ratio
                    </label>
                  </>
                )}

                <div className="crop-resize-summary">
                  <div className="crop-resize-summary-card">
                    <div className="crop-resize-summary-label">
                      Pages
                    </div>

                    <div className="crop-resize-summary-value">
                      {affectedPages}
                    </div>
                  </div>

                  <div className="crop-resize-summary-card">
                    <div className="crop-resize-summary-label">
                      Crop
                    </div>

                    <div className="crop-resize-summary-value">
                      {Math.round(
                        cropWidthPercent
                      )}
                      % ×{" "}
                      {Math.round(
                        cropHeightPercent
                      )}
                      %
                    </div>
                  </div>

                  <div className="crop-resize-summary-card">
                    <div className="crop-resize-summary-label">
                      Resize
                    </div>

                    <div className="crop-resize-summary-value">
                      {resizeEnabled
                        ? "Enabled"
                        : "Off"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {status ===
              "processing" && (
              <div className="crop-resize-progress">
                <div className="crop-resize-progress-top">
                  <span className="crop-resize-progress-label">
                    Processing PDF…
                  </span>

                  <span className="crop-resize-progress-value">
                    {progress}%
                  </span>
                </div>

                <div className="crop-resize-progress-track">
                  <div
                    className="crop-resize-progress-fill"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="crop-resize-error">
                {error}
              </div>
            )}

            <div className="crop-resize-actions">
              <button
                type="button"
                className="crop-resize-secondary"
                onClick={
                  handleReset
                }
                disabled={
                  status ===
                  "processing"
                }
              >
                Reset
              </button>

              <button
                type="button"
                className="crop-resize-primary"
                onClick={
                  handleProcess
                }
                disabled={
                  status ===
                    "processing" ||
                  (scope ===
                    "selected" &&
                    selectedCount ===
                      0)
                }
              >
                {status ===
                "processing"
                  ? "Processing…"
                  : "Apply Crop"}
              </button>
            </div>
          </>
        )}

        {status ===
          "success" &&
          result && (
          <div className="crop-resize-success">
            <div>
              <div className="crop-resize-success-title">
                Crop & Resize complete
              </div>

              <div className="crop-resize-success-meta">
                {result.processedPages}{" "}
                {result.processedPages ===
                1
                  ? "page"
                  : "pages"}{" "}
                processed successfully.
              </div>
            </div>

            <button
              type="button"
              className="crop-resize-primary"
              onClick={
                handleDownload
              }
            >
              Download PDF
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function clamp(
  value,
  min,
  max
) {
  return Math.min(
    max,
    Math.max(min, value)
  );
}

function getOutputFileName(
  fileName
) {
  const baseName =
    fileName?.replace(
      /\.pdf$/i,
      ""
    ) || "document";

  return `${baseName}-cropped.pdf`;
}

export default CropResizePdf;