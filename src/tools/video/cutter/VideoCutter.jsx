import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  cutVideo,
  getCutVideoInfo,
} from "../../../services/video/cutVideo.js";

function formatTime(
  seconds
) {
  const safe =
    Math.max(
      0,
      Number(seconds) || 0
    );

  const minutes =
    Math.floor(
      safe / 60
    );

  const secs =
    Math.floor(
      safe % 60
    );

  const hours =
    Math.floor(
      safe / 3600
    );

  if (hours > 0) {
    return [
      String(hours).padStart(
        2,
        "0"
      ),
      String(
        minutes % 60
      ).padStart(2, "0"),
      String(secs).padStart(
        2,
        "0"
      ),
    ].join(":");
  }

  return [
    String(minutes).padStart(
      2,
      "0"
    ),
    String(secs).padStart(
      2,
      "0"
    ),
  ].join(":");
}

function formatBytes(
  bytes
) {
  if (!bytes) {
    return "0 B";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
  ];

  let value = bytes;
  let index = 0;

  while (
    value >= 1024 &&
    index <
      units.length - 1
  ) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(
    value >= 10 ? 0 : 1
  )} ${units[index]}`;
}

function downloadBlob(
  blob,
  fileName
) {
  const url =
    URL.createObjectURL(
      blob
    );

  const anchor =
    document.createElement(
      "a"
    );

  anchor.href = url;
  anchor.download =
    fileName;

  document.body.appendChild(
    anchor
  );

  anchor.click();

  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(
      url
    );
  }, 1000);
}

export default function VideoCutter() {
  const fileInputRef =
    useRef(null);

  const videoRef =
    useRef(null);

  const previewURLRef =
    useRef(null);

  const [
    videoFile,
    setVideoFile,
  ] = useState(null);

  const [
    videoInfo,
    setVideoInfo,
  ] = useState(null);

  const [
    cuts,
    setCuts,
  ] = useState([]);

  const [
    draftStart,
    setDraftStart,
  ] = useState(0);

  const [
    draftEnd,
    setDraftEnd,
  ] = useState(0);

  const [
    currentTime,
    setCurrentTime,
  ] = useState(0);

  const [
    outputFormat,
    setOutputFormat,
  ] = useState("mp4");

  const [
    isProcessing,
    setIsProcessing,
  ] = useState(false);

  const [
    progress,
    setProgress,
  ] = useState(0);

  const [
    status,
    setStatus,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    result,
    setResult,
  ] = useState(null);

  useEffect(() => {
    return () => {
      if (
        previewURLRef.current
      ) {
        URL.revokeObjectURL(
          previewURLRef.current
        );
      }
    };
  }, []);

  function clearPreviewURL() {
    if (
      previewURLRef.current
    ) {
      URL.revokeObjectURL(
        previewURLRef.current
      );

      previewURLRef.current =
        null;
    }
  }

  async function loadVideo(
    file
  ) {
    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "video/"
      )
    ) {
      setError(
        "Please select a video file."
      );

      return;
    }

    setError("");
    setResult(null);
    setVideoInfo(null);
    setCuts([]);
    setProgress(0);

    setStatus(
      "Reading video..."
    );

    clearPreviewURL();

    try {
      const info =
        await getCutVideoInfo(
          file
        );

      const previewURL =
        URL.createObjectURL(
          file
        );

      previewURLRef.current =
        previewURL;

      setVideoFile(file);
      setVideoInfo(info);

      setDraftStart(0);

      setDraftEnd(
        info.duration
      );

      setCurrentTime(0);

      setStatus(
        "Video ready."
      );
    } catch (loadError) {
      setError(
        loadError?.message ||
          "Unable to read this video."
      );

      setStatus("");
    }
  }

  async function handleFileChange(
    event
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    await loadVideo(file);

    event.target.value =
      "";
  }

  function handleDrop(
    event
  ) {
    event.preventDefault();

    const file =
      event.dataTransfer.files?.[0];

    if (file) {
      loadVideo(file);
    }
  }

  function handleDragOver(
    event
  ) {
    event.preventDefault();
  }

  function seekTo(
    time
  ) {
    const video =
      videoRef.current;

    if (!video) {
      return;
    }

    const safeTime =
      Math.max(
        0,
        Math.min(
          Number(time) || 0,
          videoInfo?.duration ||
            0
        )
      );

    video.currentTime =
      safeTime;

    setCurrentTime(
      safeTime
    );
  }

  function handleTimeUpdate(
    event
  ) {
    setCurrentTime(
      event.currentTarget
        .currentTime
    );
  }

  function handleTimelineClick(
    event
  ) {
    if (!videoInfo) {
      return;
    }

    const rect =
      event.currentTarget.getBoundingClientRect();

    const ratio =
      Math.max(
        0,
        Math.min(
          1,
          (event.clientX -
            rect.left) /
            rect.width
        )
      );

    seekTo(
      ratio *
        videoInfo.duration
    );
  }

  function handleDraftStartChange(
    event
  ) {
    const next =
      Number(
        event.target.value
      );

    setDraftStart(
      Math.min(
        next,
        draftEnd - 0.05
      )
    );
  }

  function handleDraftEndChange(
    event
  ) {
    const next =
      Number(
        event.target.value
      );

    setDraftEnd(
      Math.max(
        next,
        draftStart + 0.05
      )
    );
  }

  function addCut() {
    if (!videoInfo) {
      return;
    }

    const start =
      Math.max(
        0,
        Math.min(
          draftStart,
          videoInfo.duration
        )
      );

    const end =
      Math.max(
        start,
        Math.min(
          draftEnd,
          videoInfo.duration
        )
      );

    if (
      end - start <
      0.05
    ) {
      setError(
        "The cut section is too short."
      );

      return;
    }

    const nextCuts =
      [
        ...cuts,
        {
          start,
          end,
          id:
            `${Date.now()}-${Math.random()}`,
        },
      ].sort(
        (a, b) =>
          a.start -
          b.start
      );

    /*
     * Merge overlapping cut ranges
     * in the UI so the list remains
     * clean.
     */
    const merged = [];

    for (
      const cut of nextCuts
    ) {
      const previous =
        merged[
          merged.length - 1
        ];

      if (
        previous &&
        cut.start <=
          previous.end + 0.05
      ) {
        previous.end =
          Math.max(
            previous.end,
            cut.end
          );
      } else {
        merged.push({
          ...cut,
        });
      }
    }

    setCuts(
      merged
    );

    setError("");

    /*
     * Reset drafting range to a
     * small next region.
     */
    const nextStart =
      Math.min(
        end + 0.05,
        videoInfo.duration
      );

    setDraftStart(
      nextStart
    );

    setDraftEnd(
      Math.min(
        nextStart + 5,
        videoInfo.duration
      )
    );
  }

  function removeCut(
    index
  ) {
    setCuts(
      (current) =>
        current.filter(
          (_, cutIndex) =>
            cutIndex !==
            index
        )
    );
  }

  function clearCuts() {
    setCuts([]);

    if (videoInfo) {
      setDraftStart(0);
      setDraftEnd(
        Math.min(
          5,
          videoInfo.duration
        )
      );
    }
  }

  function resetDraft() {
    if (!videoInfo) {
      return;
    }

    setDraftStart(0);

    setDraftEnd(
      Math.min(
        5,
        videoInfo.duration
      )
    );
  }

  function clearVideo() {
    clearPreviewURL();

    setVideoFile(null);
    setVideoInfo(null);
    setCuts([]);
    setResult(null);
    setProgress(0);
    setStatus("");
    setError("");
    setCurrentTime(0);
    setDraftStart(0);
    setDraftEnd(0);
  }

  async function handleCutVideo() {
    if (!videoFile) {
      setError(
        "Select a video first."
      );

      return;
    }

    if (!cuts.length) {
      setError(
        "Add at least one section to remove."
      );

      return;
    }

    setError("");
    setResult(null);
    setProgress(0);
    setIsProcessing(true);

    try {
      const output =
        await cutVideo(
          videoFile,
          {
            cuts,
            outputFormat,

            onProgress: ({
              progress:
                nextProgress,
              message,
            }) => {
              if (
                Number.isFinite(
                  nextProgress
                )
              ) {
                setProgress(
                  nextProgress
                );
              }

              if (message) {
                setStatus(
                  message
                );
              }
            },
          }
        );

      setResult(
        output
      );

      setProgress(100);

      setStatus(
        "Video ready."
      );
    } catch (cutError) {
      setError(
        cutError?.message ||
          "Unable to cut this video."
      );

      setStatus("");
      setProgress(0);
    } finally {
      setIsProcessing(
        false
      );
    }
  }

  const duration =
    videoInfo?.duration ||
    0;

  const removedDuration =
    cuts.reduce(
      (total, cut) =>
        total +
        Math.max(
          0,
          cut.end -
            cut.start
        ),
      0
    );

  const remainingDuration =
    Math.max(
      0,
      duration -
        removedDuration
    );

  return (
    <div className="video-cutter-tool">
      <style>{`
        .video-cutter-tool {
          width: 100%;
          box-sizing: border-box;

          padding:
            26px
            30px
            38px;

          color:
            rgba(255,255,255,.94);
        }

        /*
         * =====================================================
         * GRID
         * =====================================================
         */

        .video-cutter-layout {
          display:
            grid;

          grid-template-columns:
            minmax(0,1.25fr)
            minmax(320px,.75fr);

          gap:
            20px;
        }

        .video-cutter-panel,
        .video-cutter-settings,
        .video-cutter-result {
          border:
            1px solid
            rgba(255,255,255,.09);

          border-radius:
            18px;

          background:
            rgba(255,255,255,.035);

          backdrop-filter:
            blur(16px);

          box-shadow:
            0 16px 50px
            rgba(0,0,0,.2);
        }

        /*
         * =====================================================
         * HEADER
         * =====================================================
         */

        .video-cutter-header {
          min-height:
            55px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          gap:
            12px;

          padding:
            11px
            17px;

          border-bottom:
            1px solid
            rgba(255,255,255,.07);
        }

        .video-cutter-title {
          margin: 0;

          color:
            rgba(255,255,255,.72);

          font-size:
            12px;

          font-weight:
            700;

          letter-spacing:
            .1em;

          text-transform:
            uppercase;
        }

        .video-cutter-meta {
          color:
            rgba(255,255,255,.34);

          font-size:
            10px;
        }

        /*
         * =====================================================
         * DROPZONE
         * =====================================================
         */

        .video-cutter-upload {
          min-height:
            420px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          padding:
            26px;
        }

        .video-cutter-dropzone {
          width:
            100%;

          min-height:
            320px;

          display:
            flex;

          flex-direction:
            column;

          align-items:
            center;

          justify-content:
            center;

          text-align:
            center;

          border:
            1px dashed
            rgba(255,255,255,.15);

          border-radius:
            17px;

          background:
            rgba(0,0,0,.13);

          transition:
            border-color .2s ease,
            background .2s ease;
        }

        .video-cutter-dropzone:hover {
          border-color:
            rgba(249,115,22,.38);

          background:
            rgba(249,115,22,.035);
        }

        .video-cutter-icon {
          width:
            60px;

          height:
            60px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          margin-bottom:
            15px;

          border:
            1px solid
            rgba(249,115,22,.22);

          border-radius:
            17px;

          background:
            rgba(249,115,22,.09);

          color:
            #fb923c;

          font-size:
            25px;
        }

        .video-cutter-drop-title {
          margin:
            0
            0
            7px;

          font-size:
            16px;

          font-weight:
            700;
        }

        .video-cutter-drop-description {
          margin:
            0
            0
            17px;

          color:
            rgba(255,255,255,.4);

          font-size:
            12px;
        }

        .video-cutter-file-input {
          display:
            none;
        }

        .video-cutter-browse {
          display:
            inline-flex;

          align-items:
            center;

          justify-content:
            center;

          padding:
            10px
            15px;

          border:
            1px solid
            rgba(249,115,22,.35);

          border-radius:
            10px;

          background:
            rgba(249,115,22,.1);

          color:
            #fdba74;

          font-size:
            12px;

          font-weight:
            700;

          cursor:
            pointer;
        }

        /*
         * =====================================================
         * VIDEO
         * =====================================================
         */

        .video-cutter-preview {
          padding:
            18px;
        }

        .video-cutter-video-wrap {
          width:
            100%;

          overflow:
            hidden;

          border:
            1px solid
            rgba(255,255,255,.07);

          border-radius:
            13px;

          background:
            #050505;
        }

        .video-cutter-video {
          display:
            block;

          width:
            100%;

          max-height:
            470px;

          object-fit:
            contain;

          background:
            #050505;
        }

        /*
         * =====================================================
         * TIMELINE
         * =====================================================
         */

        .video-cutter-timeline-section {
          padding:
            4px
            18px
            20px;
        }

        .video-cutter-timeline {
          position:
            relative;

          height:
            66px;

          overflow:
            hidden;

          border:
            1px solid
            rgba(255,255,255,.08);

          border-radius:
            11px;

          background:
            rgba(255,255,255,.04);

          cursor:
            pointer;
        }

        .video-cutter-keep {
          position:
            absolute;

          top:
            0;

          bottom:
            0;

          background:
            rgba(255,255,255,.045);

          pointer-events:
            none;
        }

        .video-cutter-cut-region {
          position:
            absolute;

          top:
            4px;

          bottom:
            4px;

          background:
            rgba(249,115,22,.28);

          border:
            1px solid
            rgba(249,115,22,.65);

          border-radius:
            7px;

          pointer-events:
            none;

          box-shadow:
            inset 0
            0
            20px
            rgba(249,115,22,.08);
        }

        .video-cutter-cut-label {
          position:
            absolute;

          top:
            50%;

          left:
            50%;

          transform:
            translate(
              -50%,
              -50%
            );

          color:
            rgba(255,255,255,.7);

          font-size:
            7px;

          font-weight:
            800;

          letter-spacing:
            .12em;

          text-transform:
            uppercase;

          white-space:
            nowrap;
        }

        .video-cutter-playhead {
          position:
            absolute;

          top:
            -2px;

          bottom:
            -2px;

          width:
            2px;

          background:
            #ffffff;

          box-shadow:
            0
            0
            10px
            rgba(255,255,255,.75);

          pointer-events:
            none;
        }

        .video-cutter-time-row {
          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          margin-top:
            7px;

          color:
            rgba(255,255,255,.34);

          font-size:
            9px;
        }

        /*
         * =====================================================
         * DRAFT RANGE
         * =====================================================
         */

        .video-cutter-range-block {
          margin-top:
            16px;

          padding:
            13px;

          border:
            1px solid
            rgba(255,255,255,.07);

          border-radius:
            12px;

          background:
            rgba(0,0,0,.12);
        }

        .video-cutter-range-header {
          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          margin-bottom:
            11px;
        }

        .video-cutter-range-title {
          color:
            rgba(255,255,255,.62);

          font-size:
            9px;

          font-weight:
            700;

          letter-spacing:
            .1em;

          text-transform:
            uppercase;
        }

        .video-cutter-range-values {
          color:
            #fdba74;

          font-size:
            10px;

          font-weight:
            700;
        }

        .video-cutter-range-control {
          width:
            100%;

          height:
            5px;

          margin:
            4px 0;

          appearance:
            none;

          -webkit-appearance:
            none;

          border-radius:
            999px;

          background:
            rgba(255,255,255,.1);

          outline:
            none;
        }

        .video-cutter-range-control::-webkit-slider-thumb {
          appearance:
            none;

          -webkit-appearance:
            none;

          width:
            17px;

          height:
            17px;

          border:
            2px solid
            #111;

          border-radius:
            50%;

          background:
            #fb923c;

          box-shadow:
            0
            0
            12px
            rgba(249,115,22,.45);

          cursor:
            grab;
        }

        .video-cutter-range-control::-moz-range-thumb {
          width:
            17px;

          height:
            17px;

          border:
            2px solid
            #111;

          border-radius:
            50%;

          background:
            #fb923c;

          cursor:
            grab;
        }

        /*
         * =====================================================
         * CUT LIST
         * =====================================================
         */

        .video-cutter-cut-list {
          margin-top:
            16px;
        }

        .video-cutter-cut-list-header {
          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          margin-bottom:
            8px;
        }

        .video-cutter-cut-list-title {
          color:
            rgba(255,255,255,.52);

          font-size:
            9px;

          font-weight:
            700;

          letter-spacing:
            .1em;

          text-transform:
            uppercase;
        }

        .video-cutter-clear-cuts {
          padding: 0;

          border: 0;

          background:
            transparent;

          color:
            rgba(255,255,255,.34);

          font-size:
            8px;

          font-weight:
            700;

          cursor:
            pointer;
        }

        .video-cutter-clear-cuts:hover {
          color:
            #fb923c;
        }

        .video-cutter-cut-item {
          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          gap:
            10px;

          padding:
            9px
            11px;

          margin-bottom:
            6px;

          border:
            1px solid
            rgba(249,115,22,.14);

          border-radius:
            9px;

          background:
            rgba(249,115,22,.035);
        }

        .video-cutter-cut-item-info {
          min-width:
            0;
        }

        .video-cutter-cut-item-title {
          color:
            rgba(255,255,255,.68);

          font-size:
            10px;

          font-weight:
            700;
        }

        .video-cutter-cut-item-time {
          margin-top:
            3px;

          color:
            rgba(255,255,255,.34);

          font-size:
            9px;
        }

        .video-cutter-remove-cut {
          flex-shrink:
            0;

          width:
            25px;

          height:
            25px;

          border:
            1px solid
            rgba(255,255,255,.08);

          border-radius:
            7px;

          background:
            rgba(255,255,255,.04);

          color:
            rgba(255,255,255,.45);

          cursor:
            pointer;
        }

        .video-cutter-remove-cut:hover {
          background:
            rgba(239,68,68,.12);

          border-color:
            rgba(239,68,68,.25);

          color:
            #fecaca;
        }

        /*
         * =====================================================
         * SETTINGS
         * =====================================================
         */

        .video-cutter-settings {
          padding:
            18px;
        }

        .video-cutter-setting {
          display:
            flex;

          flex-direction:
            column;

          gap:
            7px;

          margin-top:
            15px;
        }

        .video-cutter-setting label {
          color:
            rgba(255,255,255,.43);

          font-size:
            9px;

          font-weight:
            700;

          letter-spacing:
            .08em;

          text-transform:
            uppercase;
        }

        .video-cutter-setting select {
          width:
            100%;

          box-sizing:
            border-box;

          padding:
            10px
            11px;

          border:
            1px solid
            rgba(255,255,255,.1);

          border-radius:
            10px;

          outline:
            none;

          background:
            rgba(0,0,0,.2);

          color:
            rgba(255,255,255,.9);

          font:
            inherit;
        }

        .video-cutter-summary {
          margin-top:
            17px;

          padding:
            13px;

          border:
            1px solid
            rgba(255,255,255,.07);

          border-radius:
            11px;

          background:
            rgba(0,0,0,.12);
        }

        .video-cutter-summary-row {
          display:
            flex;

          justify-content:
            space-between;

          gap:
            10px;

          padding:
            5px 0;

          color:
            rgba(255,255,255,.42);

          font-size:
            10px;
        }

        .video-cutter-summary-row strong {
          color:
            rgba(255,255,255,.82);
        }

        /*
         * =====================================================
         * BUTTONS
         * =====================================================
         */

        .video-cutter-actions {
          display:
            flex;

          gap:
            8px;

          margin-top:
            16px;
        }

        .video-cutter-button {
          flex:
            1;

          min-height:
            40px;

          padding:
            9px
            12px;

          border:
            1px solid
            rgba(255,255,255,.1);

          border-radius:
            10px;

          background:
            rgba(255,255,255,.05);

          color:
            rgba(255,255,255,.8);

          font-size:
            10px;

          font-weight:
            700;

          cursor:
            pointer;
        }

        .video-cutter-button.primary {
          border-color:
            rgba(249,115,22,.42);

          background:
            linear-gradient(
              135deg,
              rgba(249,115,22,.95),
              rgba(234,88,12,.78)
            );

          color:
            #ffffff;

          box-shadow:
            0
            10px
            28px
            rgba(249,115,22,.13);
        }

        .video-cutter-button:disabled {
          opacity:
            .45;

          cursor:
            not-allowed;
        }

        /*
         * =====================================================
         * PROGRESS
         * =====================================================
         */

        .video-cutter-progress {
          margin-top:
            15px;
        }

        .video-cutter-progress-track {
          height:
            6px;

          overflow:
            hidden;

          border-radius:
            999px;

          background:
            rgba(255,255,255,.08);
        }

        .video-cutter-progress-fill {
          height:
            100%;

          background:
            linear-gradient(
              90deg,
              #f97316,
              #fb923c
            );

          border-radius:
            inherit;

          transition:
            width .2s ease;
        }

        .video-cutter-progress-text {
          margin-top:
            7px;

          color:
            rgba(255,255,255,.4);

          font-size:
            9px;
        }

        /*
         * =====================================================
         * ERROR
         * =====================================================
         */

        .video-cutter-error {
          margin-top:
            13px;

          padding:
            11px
            13px;

          border:
            1px solid
            rgba(248,113,113,.24);

          border-radius:
            10px;

          background:
            rgba(127,29,29,.18);

          color:
            #fecaca;

          font-size:
            10px;
        }

        /*
         * =====================================================
         * RESULT
         * =====================================================
         */

        .video-cutter-result {
          grid-column:
            1 / -1;

          padding:
            18px;
        }

        .video-cutter-result-title {
          margin:
            0
            0
            7px;

          color:
            rgba(255,255,255,.88);

          font-size:
            14px;

          font-weight:
            700;
        }

        .video-cutter-result-meta {
          display:
            flex;

          flex-wrap:
            wrap;

          gap:
            15px;

          color:
            rgba(255,255,255,.4);

          font-size:
            10px;
        }

        @media (max-width: 1000px) {
          .video-cutter-layout {
            grid-template-columns:
              1fr;
          }

          .video-cutter-result {
            grid-column:
              auto;
          }
        }

        @media (max-width: 650px) {
          .video-cutter-tool {
            padding:
              22px
              18px
              30px;
          }
        }
      `}</style>

      <div className="video-cutter-layout">
        {/* ==================================================
            LEFT / PREVIEW
        ================================================== */}

        <section className="video-cutter-panel">
          <div className="video-cutter-header">
            <h2 className="video-cutter-title">
              Video Cutter
            </h2>

            <span className="video-cutter-meta">
              Remove unwanted sections
            </span>
          </div>

          {!videoFile ? (
            <div className="video-cutter-upload">
              <div
                className="video-cutter-dropzone"
                onDrop={handleDrop}
                onDragOver={
                  handleDragOver
                }
              >
                <div className="video-cutter-icon">
                  ✂
                </div>

                <h3 className="video-cutter-drop-title">
                  Drop a video here
                </h3>

                <p className="video-cutter-drop-description">
                  Mark the sections you want to
                  remove, then export the remaining
                  video.
                </p>

                <input
                  ref={fileInputRef}
                  id="kaizen-video-cutter-input"
                  className="video-cutter-file-input"
                  type="file"
                  accept="video/*"
                  onChange={
                    handleFileChange
                  }
                />

                <label
                  htmlFor="kaizen-video-cutter-input"
                  className="video-cutter-browse"
                >
                  Choose Video
                </label>
              </div>
            </div>
          ) : (
            <>
              <div className="video-cutter-preview">
                <div className="video-cutter-video-wrap">
                  <video
                    ref={videoRef}
                    className="video-cutter-video"
                    src={
                      previewURLRef.current ||
                      undefined
                    }
                    controls
                    preload="metadata"
                    onTimeUpdate={
                      handleTimeUpdate
                    }
                  />
                </div>
              </div>

              <div className="video-cutter-timeline-section">
                <div
                  className="video-cutter-timeline"
                  onClick={
                    handleTimelineClick
                  }
                >
                  {cuts.map(
                    (
                      cut,
                      index
                    ) => {
                      const left =
                        duration
                          ? (cut.start /
                              duration) *
                            100
                          : 0;

                      const width =
                        duration
                          ? ((cut.end -
                              cut.start) /
                              duration) *
                            100
                          : 0;

                      return (
                        <div
                          key={
                            `${cut.start}-${cut.end}-${index}`
                          }
                          className="video-cutter-cut-region"
                          style={{
                            left:
                              `${left}%`,
                            width:
                              `${width}%`,
                          }}
                        >
                          <span className="video-cutter-cut-label">
                            CUT
                          </span>
                        </div>
                      );
                    }
                  )}

                  <div
                    className="video-cutter-playhead"
                    style={{
                      left:
                        `${
                          duration
                            ? (currentTime /
                                duration) *
                              100
                            : 0
                        }%`,
                    }}
                  />
                </div>

                <div className="video-cutter-time-row">
                  <span>
                    00:00
                  </span>

                  <span>
                    Current{" "}
                    {formatTime(
                      currentTime
                    )}
                  </span>

                  <span>
                    {formatTime(
                      duration
                    )}
                  </span>
                </div>

                {/* Draft cut range */}
                <div className="video-cutter-range-block">
                  <div className="video-cutter-range-header">
                    <span className="video-cutter-range-title">
                      New cut
                    </span>

                    <span className="video-cutter-range-values">
                      {formatTime(
                        draftStart
                      )}
                      {" — "}
                      {formatTime(
                        draftEnd
                      )}
                    </span>
                  </div>

                  <input
                    className="video-cutter-range-control"
                    type="range"
                    min="0"
                    max={
                      duration
                    }
                    step="0.01"
                    value={
                      draftStart
                    }
                    onChange={
                      handleDraftStartChange
                    }
                    disabled={
                      isProcessing
                    }
                    aria-label="Cut start"
                  />

                  <input
                    className="video-cutter-range-control"
                    type="range"
                    min="0"
                    max={
                      duration
                    }
                    step="0.01"
                    value={
                      draftEnd
                    }
                    onChange={
                      handleDraftEndChange
                    }
                    disabled={
                      isProcessing
                    }
                    aria-label="Cut end"
                  />

                  <div className="video-cutter-actions">
                    <button
                      type="button"
                      className="video-cutter-button"
                      onClick={
                        resetDraft
                      }
                      disabled={
                        isProcessing
                      }
                    >
                      Reset Range
                    </button>

                    <button
                      type="button"
                      className="video-cutter-button primary"
                      onClick={
                        addCut
                      }
                      disabled={
                        isProcessing
                      }
                    >
                      + Add Cut
                    </button>
                  </div>
                </div>

                {/* Cut list */}
                <div className="video-cutter-cut-list">
                  <div className="video-cutter-cut-list-header">
                    <span className="video-cutter-cut-list-title">
                      Sections to remove
                    </span>

                    {cuts.length > 0 && (
                      <button
                        type="button"
                        className="video-cutter-clear-cuts"
                        onClick={
                          clearCuts
                        }
                        disabled={
                          isProcessing
                        }
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  {cuts.length ===
                  0 ? (
                    <div
                      style={{
                        padding:
                          "13px",
                        border:
                          "1px solid rgba(255,255,255,.06)",
                        borderRadius:
                          "9px",
                        color:
                          "rgba(255,255,255,.3)",
                        fontSize:
                          "9px",
                        textAlign:
                          "center",
                      }}
                    >
                      No cuts added yet.
                    </div>
                  ) : (
                    cuts.map(
                      (
                        cut,
                        index
                      ) => (
                        <div
                          className="video-cutter-cut-item"
                          key={`${cut.start}-${cut.end}-${index}`}
                        >
                          <div className="video-cutter-cut-item-info">
                            <div className="video-cutter-cut-item-title">
                              Section{" "}
                              {index +
                                1}
                            </div>

                            <div className="video-cutter-cut-item-time">
                              {formatTime(
                                cut.start
                              )}
                              {" — "}
                              {formatTime(
                                cut.end
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            className="video-cutter-remove-cut"
                            onClick={() =>
                              removeCut(
                                index
                              )
                            }
                            disabled={
                              isProcessing
                            }
                            aria-label={`Remove cut ${index + 1}`}
                          >
                            ×
                          </button>
                        </div>
                      )
                    )
                  )}
                </div>
              </div>
            </>
          )}
        </section>

        {/* ==================================================
            RIGHT / SETTINGS
        ================================================== */}

        <section className="video-cutter-settings">
          <div
            className="video-cutter-header"
            style={{
              padding: 0,
              border: 0,
              minHeight:
                0,
            }}
          >
            <h2 className="video-cutter-title">
              Export
            </h2>
          </div>

          <div className="video-cutter-setting">
            <label>
              Output format
            </label>

            <select
              value={
                outputFormat
              }
              onChange={(event) =>
                setOutputFormat(
                  event.target
                    .value
                )
              }
              disabled={
                isProcessing
              }
            >
              <option value="mp4">
                MP4
              </option>

              <option value="webm">
                WebM
              </option>
            </select>
          </div>

          {videoFile &&
            videoInfo && (
              <>
                <div className="video-cutter-summary">
                  <div className="video-cutter-summary-row">
                    <span>
                      File
                    </span>

                    <strong
                      style={{
                        maxWidth:
                          "150px",
                        overflow:
                          "hidden",
                        textOverflow:
                          "ellipsis",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {
                        videoFile.name
                      }
                    </strong>
                  </div>

                  <div className="video-cutter-summary-row">
                    <span>
                      Original
                    </span>

                    <strong>
                      {formatTime(
                        duration
                      )}
                    </strong>
                  </div>

                  <div className="video-cutter-summary-row">
                    <span>
                      Removed
                    </span>

                    <strong>
                      {formatTime(
                        removedDuration
                      )}
                    </strong>
                  </div>

                  <div className="video-cutter-summary-row">
                    <span>
                      Remaining
                    </span>

                    <strong>
                      {formatTime(
                        remainingDuration
                      )}
                    </strong>
                  </div>

                  <div className="video-cutter-summary-row">
                    <span>
                      Cuts
                    </span>

                    <strong>
                      {cuts.length}
                    </strong>
                  </div>
                </div>

                <div className="video-cutter-actions">
                  <button
                    type="button"
                    className="video-cutter-button"
                    onClick={
                      clearVideo
                    }
                    disabled={
                      isProcessing
                    }
                  >
                    Replace Video
                  </button>
                </div>

                <div className="video-cutter-actions">
                  <button
                    type="button"
                    className="video-cutter-button primary"
                    onClick={
                      handleCutVideo
                    }
                    disabled={
                      isProcessing ||
                      !cuts.length
                    }
                  >
                    {isProcessing
                      ? "Processing..."
                      : "Cut Video"}
                  </button>
                </div>
              </>
            )}

          {(isProcessing ||
            progress > 0) && (
            <div className="video-cutter-progress">
              <div className="video-cutter-progress-track">
                <div
                  className="video-cutter-progress-fill"
                  style={{
                    width:
                      `${progress}%`,
                  }}
                />
              </div>

              <div className="video-cutter-progress-text">
                {status ||
                  `${progress}%`}
              </div>
            </div>
          )}

          {error && (
            <div className="video-cutter-error">
              {error}
            </div>
          )}
        </section>

        {/* ==================================================
            RESULT
        ================================================== */}

        {result && (
          <section className="video-cutter-result">
            <h3 className="video-cutter-result-title">
              Cut video ready
            </h3>

            <div className="video-cutter-result-meta">
              <span>
                {result.fileName}
              </span>

              <span>
                Remaining{" "}
                {formatTime(
                  result.remainingDuration
                )}
              </span>

              <span>
                Removed{" "}
                {formatTime(
                  result.removedDuration
                )}
              </span>

              <span>
                {formatBytes(
                  result.byteSize
                )}
              </span>
            </div>

            <div className="video-cutter-actions">
              <button
                type="button"
                className="video-cutter-button primary"
                onClick={() =>
                  downloadBlob(
                    result.blob,
                    result.fileName
                  )
                }
              >
                Download Video
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}