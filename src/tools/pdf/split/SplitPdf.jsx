import { useEffect, useMemo, useState } from "react";
import FileDropzone from "../../../components/files/FileDropzone";
import {
  getPdfPageCount,
  splitPdfByRanges,
  splitPdfEveryNPages,
} from "../../../services/pdf/splitPdf";

function SplitPdf() {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);

  const [mode, setMode] = useState("every");
  const [pagesPerPart, setPagesPerPart] = useState(5);

  const [ranges, setRanges] = useState([
    {
      start: 1,
      end: 5,
    },
  ]);

  const [isReading, setIsReading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      results.forEach((result) => {
        if (result.url) {
          URL.revokeObjectURL(result.url);
        }
      });
    };
  }, [results]);

  const rangeCount = ranges.length;

  const selectedRangePages = useMemo(() => {
    return ranges.reduce((total, range) => {
      const start = Number(range.start);
      const end = Number(range.end);

      if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start < 1 ||
        end < start
      ) {
        return total;
      }

      return total + (end - start + 1);
    }, 0);
  }, [ranges]);

  async function handleFileSelected(files) {
    const selectedFile = files?.[0];

    if (!selectedFile) {
      return;
    }

    setError("");
    setResults([]);
    setFile(null);
    setPageCount(0);
    setIsReading(true);

    try {
      const detectedPageCount =
        await getPdfPageCount(selectedFile);

      setFile(selectedFile);
      setPageCount(detectedPageCount);

      const defaultEnd = Math.min(
        5,
        detectedPageCount
      );

      setRanges([
        {
          start: 1,
          end: defaultEnd,
        },
      ]);

      setPagesPerPart(
        Math.min(5, detectedPageCount)
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

  function updateRange(index, field, value) {
    setRanges((currentRanges) =>
      currentRanges.map((range, rangeIndex) => {
        if (rangeIndex !== index) {
          return range;
        }

        return {
          ...range,
          [field]: value,
        };
      })
    );

    setError("");
  }

  function addRange() {
    if (ranges.length === 0) {
      setRanges([
        {
          start: 1,
          end: Math.min(5, pageCount || 5),
        },
      ]);

      return;
    }

    const lastRange =
      ranges[ranges.length - 1];

    const lastEnd = Number(lastRange.end);

    const nextStart = Number.isInteger(lastEnd)
      ? lastEnd + 1
      : 1;

    if (
      pageCount &&
      nextStart > pageCount
    ) {
      return;
    }

    const nextEnd = pageCount
      ? Math.min(nextStart + 4, pageCount)
      : nextStart + 4;

    setRanges((currentRanges) => [
      ...currentRanges,
      {
        start: nextStart,
        end: nextEnd,
      },
    ]);

    setError("");
  }

  function removeRange(index) {
    setRanges((currentRanges) => {
      if (currentRanges.length === 1) {
        return currentRanges;
      }

      return currentRanges.filter(
        (_, rangeIndex) =>
          rangeIndex !== index
      );
    });

    setError("");
  }

  function validateCustomRanges() {
    if (ranges.length === 0) {
      return "Please add at least one page range.";
    }

    const normalizedRanges = ranges.map(
      (range, index) => {
        const start = Number(range.start);
        const end = Number(range.end);

        if (
          !Number.isInteger(start) ||
          !Number.isInteger(end)
        ) {
          return {
            error:
              `Range ${index + 1} must contain valid whole-number pages.`,
          };
        }

        if (start < 1 || end < 1) {
          return {
            error:
              `Range ${index + 1} must start at page 1 or later.`,
          };
        }

        if (
          pageCount &&
          (start > pageCount ||
            end > pageCount)
        ) {
          return {
            error:
              `Range ${index + 1} exceeds the PDF's ${pageCount} page(s).`,
          };
        }

        if (start > end) {
          return {
            error:
              `Range ${index + 1} has an invalid order. Start must be less than or equal to end.`,
          };
        }

        return {
          start,
          end,
        };
      }
    );

    const firstError =
      normalizedRanges.find(
        (range) => range.error
      );

    if (firstError) {
      return firstError.error;
    }

    const sortedRanges = [
      ...normalizedRanges,
    ].sort(
      (a, b) => a.start - b.start
    );

    for (
      let index = 1;
      index < sortedRanges.length;
      index += 1
    ) {
      const previous =
        sortedRanges[index - 1];

      const current =
        sortedRanges[index];

      if (
        current.start <= previous.end
      ) {
        return `Page ranges overlap: ${previous.start}-${previous.end} and ${current.start}-${current.end}.`;
      }
    }

    return "";
  }

  async function handleSplit() {
    if (!file) {
      setError(
        "Please select a PDF first."
      );
      return;
    }

    setError("");
    setResults([]);
    setIsProcessing(true);

    try {
      let splitResults;

      if (mode === "every") {
        const parsedPagesPerPart =
          Number(pagesPerPart);

        if (
          !Number.isInteger(
            parsedPagesPerPart
          ) ||
          parsedPagesPerPart < 1
        ) {
          throw new Error(
            "Pages per part must be a positive whole number."
          );
        }

        if (
          pageCount &&
          parsedPagesPerPart > pageCount
        ) {
          throw new Error(
            `Pages per part cannot exceed the PDF's ${pageCount} page(s).`
          );
        }

        splitResults =
          await splitPdfEveryNPages(
            file,
            parsedPagesPerPart
          );
      } else {
        const validationError =
          validateCustomRanges();

        if (validationError) {
          throw new Error(
            validationError
          );
        }

        splitResults =
          await splitPdfByRanges(
            file,
            ranges.map((range) => ({
              start: Number(range.start),
              end: Number(range.end),
            }))
          );
      }

      const resultsWithUrls =
        splitResults.map((result) => ({
          ...result,
          url: URL.createObjectURL(
            result.blob
          ),
        }));

      setResults(resultsWithUrls);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to split this PDF."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  function handleReset() {
    results.forEach((result) => {
      if (result.url) {
        URL.revokeObjectURL(result.url);
      }
    });

    setFile(null);
    setPageCount(0);

    setRanges([
      {
        start: 1,
        end: 5,
      },
    ]);

    setPagesPerPart(5);
    setMode("every");
    setResults([]);
    setError("");
    setIsReading(false);
    setIsProcessing(false);
  }

  const canAddRange =
    !pageCount ||
    ranges.length === 0 ||
    Number(
      ranges[ranges.length - 1].end
    ) < pageCount;

  return (
    <>
      <style>{`
        /*
        =========================================================
        SPLIT PDF WORKSPACE
        =========================================================
        */

        .split-pdf-workspace {
          width: 100%;
          max-width: 920px;
          margin: 0 auto;
          padding: 18px 0 34px;
          display: flex;
          flex-direction: column;
          gap: 22px;
          box-sizing: border-box;
        }

        /*
        Empty state is centered inside the available tool shell.
        */

        .split-pdf-workspace-empty {
          width: 100%;
          max-width: none;
          height: 100%;
          min-height: 0;
          margin: 0;
          padding: 28px 46px 40px;
          box-sizing: border-box;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .split-pdf-workspace-empty
        .split-pdf-upload {
          width: 100%;
          max-width: 920px;
          flex: 0 0 auto;
        }

        /*
        =========================================================
        UPLOAD
        =========================================================
        */

        .split-pdf-upload {
          width: 100%;
        }

        .split-pdf-dropzone {
          position: relative;
          width: 100%;
          min-height: 174px;
          padding: 30px;
          box-sizing: border-box;

          border: 1px dashed
            rgba(255, 126, 20, 0.25);

          border-radius: 22px;

          background:
            radial-gradient(
              ellipse at 50% 0%,
              rgba(255, 126, 20, 0.08),
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

        .split-pdf-dropzone:hover {
          border-color:
            rgba(255, 126, 20, 0.36);

          background:
            radial-gradient(
              ellipse at 50% 0%,
              rgba(255, 126, 20, 0.11),
              transparent 68%
            ),
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.04),
              rgba(255, 255, 255, 0.012)
            );

          transform: translateY(-1px);
        }

        .split-pdf-dropzone label {
          width: 100%;
          height: 100%;

          cursor: pointer;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .split-pdf-dropzone input {
          position: absolute;
          inset: 0;

          width: 100%;
          height: 100%;

          opacity: 0;
          cursor: pointer;
        }

        .split-pdf-upload-content {
          text-align: center;

          display: flex;
          flex-direction: column;
          align-items: center;

          gap: 8px;
        }

        .split-pdf-upload-icon {
          width: 52px;
          height: 52px;

          border-radius: 15px;

          border: 1px solid
            rgba(255, 126, 20, 0.25);

          background:
            rgba(255, 126, 20, 0.075);

          display: flex;
          align-items: center;
          justify-content: center;

          color: #ff8b2c;

          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.08em;

          margin-bottom: 3px;
        }

        .split-pdf-upload-title {
          color:
            rgba(255, 255, 255, 0.92);

          font-size: 16px;
          font-weight: 650;
        }

        .split-pdf-upload-subtitle {
          color:
            rgba(255, 255, 255, 0.40);

          font-size: 12px;
        }

        /*
        =========================================================
        FILE CARD
        =========================================================
        */

        .split-pdf-file-card {
          width: 100%;
          min-height: 104px;

          padding: 20px 22px;

          box-sizing: border-box;

          display: flex;
          align-items: center;

          gap: 16px;

          border-radius: 22px;

          border: 1px solid
            rgba(255, 255, 255, 0.085);

          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.035),
              rgba(255, 255, 255, 0.012)
            );

          box-shadow:
            inset 0 1px 0
              rgba(255, 255, 255, 0.025),
            0 18px 42px
              rgba(0, 0, 0, 0.14);
        }

        .split-pdf-file-icon {
          width: 62px;
          height: 62px;

          flex-shrink: 0;

          border-radius: 17px;

          display: flex;
          align-items: center;
          justify-content: center;

          background:
            rgba(255, 126, 20, 0.075);

          border: 1px solid
            rgba(255, 126, 20, 0.24);

          color: #ff9140;

          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.04em;

          box-shadow:
            inset 0 1px 0
              rgba(255, 255, 255, 0.035);
        }

        .split-pdf-file-info {
          min-width: 0;
          flex: 1;

          display: flex;
          flex-direction: column;

          gap: 7px;
        }

        .split-pdf-file-info strong {
          color:
            rgba(255, 255, 255, 0.91);

          font-size: 15px;
          line-height: 1.35;
          font-weight: 620;

          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .split-pdf-file-info span {
          color:
            rgba(255, 255, 255, 0.36);

          font-size: 12px;
        }

        .split-pdf-file-pages {
          flex-shrink: 0;

          padding: 10px 14px;

          border-radius: 12px;

          background:
            rgba(255, 255, 255, 0.035);

          border: 1px solid
            rgba(255, 255, 255, 0.065);

          color:
            rgba(255, 255, 255, 0.62);

          font-size: 12px;
          font-weight: 650;
        }

        /*
        =========================================================
        OPTIONS
        =========================================================
        */

        .split-pdf-options {
          width: 100%;

          padding: 22px;

          box-sizing: border-box;

          border-radius: 22px;

          border: 1px solid
            rgba(255, 255, 255, 0.075);

          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.033),
              rgba(255, 255, 255, 0.012)
            );
        }

        .split-pdf-section-label {
          margin-bottom: 14px;

          color:
            rgba(255, 255, 255, 0.46);

          font-size: 11px;
          font-weight: 700;

          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .split-pdf-mode-switch {
          display: grid;

          grid-template-columns:
            repeat(2, minmax(0, 1fr));

          gap: 10px;
        }

        .split-pdf-mode-button {
          min-height: 72px;

          padding: 13px 15px;

          border-radius: 15px;

          border: 1px solid
            rgba(255, 255, 255, 0.075);

          background:
            rgba(255, 255, 255, 0.022);

          color:
            rgba(255, 255, 255, 0.56);

          text-align: left;

          cursor: pointer;

          transition:
            background 180ms ease,
            border-color 180ms ease,
            color 180ms ease;
        }

        .split-pdf-mode-button:hover {
          border-color:
            rgba(255, 126, 20, 0.25);

          color:
            rgba(255, 255, 255, 0.80);
        }

        .split-pdf-mode-button.active {
          border-color:
            rgba(255, 126, 20, 0.35);

          background:
            rgba(255, 126, 20, 0.07);

          color:
            rgba(255, 255, 255, 0.94);
        }

        .split-pdf-mode-button strong {
          display: block;

          margin-bottom: 5px;

          font-size: 13px;
        }

        .split-pdf-mode-button span {
          display: block;

          color: inherit;

          opacity: 0.56;

          font-size: 11px;
          line-height: 1.4;
        }

        /*
        =========================================================
        CONTROLS
        =========================================================
        */

        .split-pdf-control {
          margin-top: 20px;
        }

        .split-pdf-control label {
          display: block;

          margin-bottom: 8px;

          color:
            rgba(255, 255, 255, 0.66);

          font-size: 13px;
          font-weight: 600;
        }

        .split-pdf-number-input {
          width: 100%;
          height: 46px;

          padding: 0 13px;

          box-sizing: border-box;

          border-radius: 12px;

          border: 1px solid
            rgba(255, 255, 255, 0.09);

          outline: none;

          background:
            rgba(0, 0, 0, 0.18);

          color:
            rgba(255, 255, 255, 0.94);

          font-size: 14px;

          transition:
            border-color 180ms ease,
            box-shadow 180ms ease;
        }

        .split-pdf-number-input:focus {
          border-color:
            rgba(255, 126, 20, 0.48);

          box-shadow:
            0 0 0 3px
              rgba(255, 126, 20, 0.08);
        }

        /*
        =========================================================
        RANGE ROWS
        =========================================================
        */

        .split-pdf-range-list {
          display: flex;
          flex-direction: column;

          gap: 9px;
        }

        .split-pdf-range-row {
          display: grid;

          grid-template-columns:
            minmax(0, 1fr)
            auto
            minmax(0, 1fr)
            auto;

          align-items: end;

          gap: 10px;

          padding: 11px;

          border-radius: 15px;

          border: 1px solid
            rgba(255, 255, 255, 0.065);

          background:
            rgba(255, 255, 255, 0.018);
        }

        .split-pdf-range-field {
          min-width: 0;
        }

        .split-pdf-range-field label {
          display: block;

          margin-bottom: 7px;

          color:
            rgba(255, 255, 255, 0.40);

          font-size: 10px;
          font-weight: 700;

          letter-spacing: 0.10em;
          text-transform: uppercase;
        }

        .split-pdf-range-separator {
          padding-bottom: 12px;

          color:
            rgba(255, 255, 255, 0.26);

          font-size: 14px;
          font-weight: 700;
        }

        .split-pdf-remove-range {
          width: 40px;
          height: 40px;

          padding: 0;

          border-radius: 11px;

          border: 1px solid
            rgba(255, 255, 255, 0.065);

          background:
            rgba(255, 255, 255, 0.022);

          color:
            rgba(255, 255, 255, 0.44);

          cursor: pointer;

          font-size: 17px;
          line-height: 1;

          transition:
            background 180ms ease,
            color 180ms ease,
            border-color 180ms ease;
        }

        .split-pdf-remove-range:hover:not(:disabled) {
          border-color:
            rgba(255, 126, 20, 0.28);

          background:
            rgba(255, 126, 20, 0.065);

          color: #ff9845;
        }

        .split-pdf-remove-range:disabled {
          opacity: 0.24;
          cursor: not-allowed;
        }

        .split-pdf-add-range {
          margin-top: 11px;

          min-height: 40px;

          padding: 0 14px;

          border-radius: 11px;

          border: 1px solid
            rgba(255, 126, 20, 0.18);

          background:
            rgba(255, 126, 20, 0.045);

          color: #ff9848;

          font-size: 12px;
          font-weight: 650;

          cursor: pointer;
        }

        .split-pdf-add-range:hover:not(:disabled) {
          background:
            rgba(255, 126, 20, 0.08);

          border-color:
            rgba(255, 126, 20, 0.30);
        }

        .split-pdf-add-range:disabled {
          opacity: 0.30;
          cursor: not-allowed;
        }

        .split-pdf-range-summary {
          margin-top: 13px;

          color:
            rgba(255, 255, 255, 0.34);

          font-size: 12px;
        }

        .split-pdf-range-summary strong {
          color:
            rgba(255, 255, 255, 0.70);
        }

        /*
        =========================================================
        STATS
        =========================================================
        */

        .split-pdf-stats {
          display: grid;

          grid-template-columns:
            repeat(3, minmax(0, 1fr));

          gap: 9px;

          margin-top: 17px;
        }

        .split-pdf-stat {
          padding: 13px 14px;

          border-radius: 13px;

          background:
            rgba(255, 255, 255, 0.021);

          border: 1px solid
            rgba(255, 255, 255, 0.055);
        }

        .split-pdf-stat span {
          display: block;

          margin-bottom: 5px;

          color:
            rgba(255, 255, 255, 0.34);

          font-size: 10px;
          font-weight: 700;

          letter-spacing: 0.10em;
          text-transform: uppercase;
        }

        .split-pdf-stat strong {
          color:
            rgba(255, 255, 255, 0.88);

          font-size: 16px;
          font-weight: 650;
        }

        /*
        =========================================================
        ERROR
        =========================================================
        */

        .split-pdf-error {
          width: 100%;

          box-sizing: border-box;

          padding: 12px 14px;

          border-radius: 12px;

          border: 1px solid
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

        .split-pdf-actions {
          display: flex;

          justify-content: center;

          gap: 10px;

          padding-top: 2px;
        }

        .split-pdf-primary-button,
        .split-pdf-secondary-button {
          min-height: 45px;

          padding: 0 20px;

          border-radius: 13px;

          font-size: 13px;
          font-weight: 700;

          cursor: pointer;

          transition:
            transform 180ms ease,
            background 180ms ease,
            border-color 180ms ease,
            opacity 180ms ease;
        }

        .split-pdf-primary-button {
          border: 1px solid
            rgba(255, 153, 74, 0.34);

          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(255, 196, 130, 0.20),
              transparent 70%
            ),
            linear-gradient(
              180deg,
              rgba(255, 126, 20, 0.88),
              rgba(214, 85, 0, 0.84)
            );

          color: #ffffff;

          box-shadow:
            0 12px 30px
              rgba(255, 126, 20, 0.12);
        }

        .split-pdf-primary-button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .split-pdf-secondary-button {
          border: 1px solid
            rgba(255, 255, 255, 0.085);

          background:
            rgba(255, 255, 255, 0.025);

          color:
            rgba(255, 255, 255, 0.62);
        }

        .split-pdf-secondary-button:hover:not(:disabled) {
          background:
            rgba(255, 255, 255, 0.045);

          color:
            rgba(255, 255, 255, 0.82);
        }

        .split-pdf-primary-button:disabled,
        .split-pdf-secondary-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        /*
        =========================================================
        RESULTS
        =========================================================
        */

        .split-pdf-results {
          width: 100%;

          box-sizing: border-box;

          padding: 22px;

          border-radius: 22px;

          border: 1px solid
            rgba(255, 255, 255, 0.075);

          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.033),
              rgba(255, 255, 255, 0.012)
            );
        }

        .split-pdf-results-heading {
          display: flex;

          align-items: flex-end;
          justify-content: space-between;

          gap: 16px;

          margin-bottom: 14px;
        }

        .split-pdf-results-heading h2 {
          margin: 0;

          color:
            rgba(255, 255, 255, 0.90);

          font-size: 17px;
          font-weight: 650;
        }

        .split-pdf-results-heading span {
          color:
            rgba(255, 255, 255, 0.34);

          font-size: 11px;
        }

        .split-pdf-result-list {
          display: flex;

          flex-direction: column;

          gap: 9px;
        }

        .split-pdf-result-card {
          display: flex;

          align-items: center;

          gap: 12px;

          padding: 12px;

          border-radius: 15px;

          border: 1px solid
            rgba(255, 255, 255, 0.055);

          background:
            rgba(255, 255, 255, 0.020);
        }

        .split-pdf-result-number {
          width: 40px;
          height: 40px;

          flex-shrink: 0;

          border-radius: 11px;

          display: flex;

          align-items: center;
          justify-content: center;

          background:
            rgba(255, 126, 20, 0.075);

          border: 1px solid
            rgba(255, 126, 20, 0.16);

          color: #ff9948;

          font-size: 11px;
          font-weight: 800;
        }

        .split-pdf-result-info {
          min-width: 0;
          flex: 1;

          display: flex;
          flex-direction: column;

          gap: 4px;
        }

        .split-pdf-result-info strong {
          color:
            rgba(255, 255, 255, 0.88);

          font-size: 13px;
          font-weight: 600;
        }

        .split-pdf-result-info span {
          color:
            rgba(255, 255, 255, 0.34);

          font-size: 11px;
        }

        .split-pdf-download {
          flex-shrink: 0;

          min-height: 37px;

          padding: 0 13px;

          border-radius: 10px;

          border: 1px solid
            rgba(255, 126, 20, 0.19);

          background:
            rgba(255, 126, 20, 0.05);

          color: #ff9d4f;

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

        .split-pdf-loading {
          min-height: 46px;

          display: flex;

          align-items: center;
          justify-content: center;

          color:
            rgba(255, 255, 255, 0.42);

          font-size: 12px;
        }

        /*
        =========================================================
        RESPONSIVE
        =========================================================
        */

        @media (max-width: 720px) {
          .split-pdf-workspace {
            padding:
              10px 0 24px;
          }

          .split-pdf-workspace-empty {
            padding:
              20px 14px 28px;
          }

          .split-pdf-options,
          .split-pdf-results {
            padding: 17px;
          }

          .split-pdf-file-card {
            padding: 16px;
          }

          .split-pdf-mode-switch {
            grid-template-columns: 1fr;
          }

          .split-pdf-stats {
            grid-template-columns: 1fr;
          }

          .split-pdf-range-row {
            grid-template-columns:
              minmax(0, 1fr)
              auto
              minmax(0, 1fr);
          }

          .split-pdf-remove-range {
            grid-column: 1 / -1;

            width: 100%;
          }

          .split-pdf-actions {
            flex-direction: column;
          }

          .split-pdf-primary-button,
          .split-pdf-secondary-button {
            width: 100%;
          }

          .split-pdf-result-card {
            align-items: flex-start;

            flex-wrap: wrap;
          }

          .split-pdf-download {
            width: 100%;
          }
        }
      `}</style>

      <div
        className={
          file
            ? "split-pdf-workspace"
            : "split-pdf-workspace split-pdf-workspace-empty"
        }
      >
        <div className="split-pdf-upload">
          {!file ? (
            <FileDropzone
              accept="application/pdf,.pdf"
              multiple={false}
              onFiles={handleFileSelected}
              className="split-pdf-dropzone"
            >
              <div className="split-pdf-upload-content">
                <div className="split-pdf-upload-icon">
                  PDF
                </div>

                <div className="split-pdf-upload-title">
                  {isReading
                    ? "Reading PDF…"
                    : "Choose a PDF to split"}
                </div>

                <div className="split-pdf-upload-subtitle">
                  Select one PDF file from your device
                </div>
              </div>
            </FileDropzone>
          ) : (
            <div className="split-pdf-file-card">
              <div className="split-pdf-file-icon">
                PDF
              </div>

              <div className="split-pdf-file-info">
                <strong title={file.name}>
                  {file.name}
                </strong>

                <span>
                  {(
                    file.size /
                    (1024 * 1024)
                  ).toFixed(2)}{" "}
                  MB
                </span>
              </div>

              <div className="split-pdf-file-pages">
                {pageCount} page
                {pageCount === 1
                  ? ""
                  : "s"}
              </div>
            </div>
          )}
        </div>

        {file && !isReading && (
          <>
            <section className="split-pdf-options">
              <div className="split-pdf-section-label">
                Split method
              </div>

              <div className="split-pdf-mode-switch">
                <button
                  type="button"
                  className={
                    mode === "every"
                      ? "split-pdf-mode-button active"
                      : "split-pdf-mode-button"
                  }
                  onClick={() => {
                    setMode("every");
                    setError("");
                  }}
                  disabled={isProcessing}
                >
                  <strong>
                    Every N pages
                  </strong>

                  <span>
                    Automatically divide the PDF into equal-sized parts.
                  </span>
                </button>

                <button
                  type="button"
                  className={
                    mode === "custom"
                      ? "split-pdf-mode-button active"
                      : "split-pdf-mode-button"
                  }
                  onClick={() => {
                    setMode("custom");
                    setError("");
                  }}
                  disabled={isProcessing}
                >
                  <strong>
                    Custom page ranges
                  </strong>

                  <span>
                    Choose exactly which pages go into each part.
                  </span>
                </button>
              </div>

              {mode === "every" ? (
                <div className="split-pdf-control">
                  <label htmlFor="pages-per-part">
                    Pages per part
                  </label>

                  <input
                    id="pages-per-part"
                    className="split-pdf-number-input"
                    type="number"
                    min="1"
                    max={
                      pageCount || undefined
                    }
                    value={pagesPerPart}
                    onChange={(event) => {
                      setPagesPerPart(
                        event.target.value
                      );
                      setError("");
                    }}
                    disabled={isProcessing}
                  />
                </div>
              ) : (
                <div className="split-pdf-control">
                  <div className="split-pdf-range-list">
                    {ranges.map(
                      (range, index) => (
                        <div
                          className="split-pdf-range-row"
                          key={`range-${index}`}
                        >
                          <div className="split-pdf-range-field">
                            <label
                              htmlFor={`range-start-${index}`}
                            >
                              Start
                            </label>

                            <input
                              id={`range-start-${index}`}
                              className="split-pdf-number-input"
                              type="number"
                              min="1"
                              max={
                                pageCount ||
                                undefined
                              }
                              value={
                                range.start
                              }
                              onChange={(
                                event
                              ) =>
                                updateRange(
                                  index,
                                  "start",
                                  event.target.value
                                )
                              }
                              disabled={
                                isProcessing
                              }
                            />
                          </div>

                          <div className="split-pdf-range-separator">
                            →
                          </div>

                          <div className="split-pdf-range-field">
                            <label
                              htmlFor={`range-end-${index}`}
                            >
                              End
                            </label>

                            <input
                              id={`range-end-${index}`}
                              className="split-pdf-number-input"
                              type="number"
                              min="1"
                              max={
                                pageCount ||
                                undefined
                              }
                              value={
                                range.end
                              }
                              onChange={(
                                event
                              ) =>
                                updateRange(
                                  index,
                                  "end",
                                  event.target.value
                                )
                              }
                              disabled={
                                isProcessing
                              }
                            />
                          </div>

                          <button
                            type="button"
                            className="split-pdf-remove-range"
                            onClick={() =>
                              removeRange(
                                index
                              )
                            }
                            disabled={
                              isProcessing ||
                              ranges.length ===
                                1
                            }
                            aria-label={`Remove range ${index + 1}`}
                          >
                            ×
                          </button>
                        </div>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    className="split-pdf-add-range"
                    onClick={addRange}
                    disabled={
                      isProcessing ||
                      !canAddRange
                    }
                  >
                    + Add page range
                  </button>

                  <div className="split-pdf-range-summary">
                    Selected{" "}
                    <strong>
                      {
                        selectedRangePages
                      }
                    </strong>{" "}
                    page
                    {selectedRangePages ===
                    1
                      ? ""
                      : "s"}{" "}
                    across{" "}
                    <strong>
                      {rangeCount}
                    </strong>{" "}
                    part
                    {rangeCount === 1
                      ? ""
                      : "s"}
                  </div>
                </div>
              )}

              <div className="split-pdf-stats">
                <div className="split-pdf-stat">
                  <span>
                    Source pages
                  </span>

                  <strong>
                    {pageCount}
                  </strong>
                </div>

                <div className="split-pdf-stat">
                  <span>
                    Output parts
                  </span>

                  <strong>
                    {mode === "every"
                      ? Math.ceil(
                          pageCount /
                            Math.max(
                              1,
                              Number(
                                pagesPerPart
                              ) || 1
                            )
                        )
                      : rangeCount}
                  </strong>
                </div>

                <div className="split-pdf-stat">
                  <span>
                    Mode
                  </span>

                  <strong>
                    {mode === "every"
                      ? "Every N"
                      : "Ranges"}
                  </strong>
                </div>
              </div>
            </section>

            {error && (
              <div
                className="split-pdf-error"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="split-pdf-actions">
              <button
                type="button"
                className="split-pdf-secondary-button"
                onClick={handleReset}
                disabled={isProcessing}
              >
                Reset
              </button>

              <button
                type="button"
                className="split-pdf-primary-button"
                onClick={handleSplit}
                disabled={isProcessing}
              >
                {isProcessing
                  ? "Splitting…"
                  : "Split PDF"}
              </button>
            </div>
          </>
        )}

        {isReading && (
          <div className="split-pdf-loading">
            Reading PDF and detecting pages…
          </div>
        )}

        {results.length > 0 && (
          <section className="split-pdf-results">
            <div className="split-pdf-results-heading">
              <h2>
                Split complete
              </h2>

              <span>
                {results.length} file
                {results.length === 1
                  ? ""
                  : "s"} generated
              </span>
            </div>

            <div className="split-pdf-result-list">
              {results.map(
                (result) => (
                  <div
                    className="split-pdf-result-card"
                    key={`${result.partNumber}-${result.startPage}-${result.endPage}`}
                  >
                    <div className="split-pdf-result-number">
                      {String(
                        result.partNumber
                      ).padStart(2, "0")}
                    </div>

                    <div className="split-pdf-result-info">
                      <strong>
                        Part{" "}
                        {String(
                          result.partNumber
                        ).padStart(
                          2,
                          "0"
                        )}
                      </strong>

                      <span>
                        Pages{" "}
                        {
                          result.startPage
                        }
                        –
                        {
                          result.endPage
                        }{" "}
                        ·{" "}
                        {
                          result.pageCount
                        }{" "}
                        page
                        {result.pageCount ===
                        1
                          ? ""
                          : "s"}
                      </span>
                    </div>

                    <a
                      className="split-pdf-download"
                      href={result.url}
                      download={`split-part-${String(
                        result.partNumber
                      ).padStart(
                        2,
                        "0"
                      )}.pdf`}
                    >
                      Download
                    </a>
                  </div>
                )
              )}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

export default SplitPdf;