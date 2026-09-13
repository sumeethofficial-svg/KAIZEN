import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  formatVideoTime,
  getVideoInfo,
  trimVideo,
} from "../../../services/video/trimVideo.js";

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

  window.setTimeout(
    () => {
      URL.revokeObjectURL(
        url
      );
    },
    1000
  );
}

export default function VideoTrimmer() {
  const fileInputRef =
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
    startTime,
    setStartTime,
  ] = useState(0);

  const [
    endTime,
    setEndTime,
  ] = useState(0);

  const [
    currentTime,
    setCurrentTime,
  ] = useState(0);

  const [
    isDragging,
    setIsDragging,
  ] = useState(false);

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

  const [
    outputFormat,
    setOutputFormat,
  ] = useState("mp4");

  const videoRef =
    useRef(null);

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
    setProgress(0);
    setStatus(
      "Reading video..."
    );

    clearPreviewURL();

    try {
      const info =
        await getVideoInfo(
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
      setStartTime(0);
      setEndTime(
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

    await loadVideo(
      file
    );

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

  function handleVideoTimeUpdate(
    event
  ) {
    setCurrentTime(
      event.currentTarget
        .currentTime
    );
  }

  function handleVideoLoadedMetadata(
    event
  ) {
    if (!videoInfo) {
      return;
    }

    event.currentTarget.currentTime =
      startTime;
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

  function handleStartChange(
    event
  ) {
    const nextValue =
      Number(
        event.target.value
      );

    const nextStart =
      Math.max(
        0,
        Math.min(
          nextValue,
          endTime - 0.05
        )
      );

    setStartTime(
      nextStart
    );

    if (
      currentTime <
      nextStart
    ) {
      seekTo(
        nextStart
      );
    }
  }

  function handleEndChange(
    event
  ) {
    const nextValue =
      Number(
        event.target.value
      );

    const nextEnd =
      Math.min(
        videoInfo?.duration ||
          nextValue,
        Math.max(
          nextValue,
          startTime + 0.05
        )
      );

    setEndTime(
      nextEnd
    );

    if (
      currentTime >
      nextEnd
    ) {
      seekTo(
        nextEnd
      );
    }
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
      (event.clientX -
        rect.left) /
      rect.width;

    const time =
      ratio *
      videoInfo.duration;

    seekTo(time);
  }

  function handleResetTrim() {
    if (!videoInfo) {
      return;
    }

    setStartTime(0);
    setEndTime(
      videoInfo.duration
    );

    seekTo(0);
  }

  function clearVideo() {
    clearPreviewURL();

    setVideoFile(null);
    setVideoInfo(null);
    setResult(null);
    setError("");
    setStatus("");
    setProgress(0);
    setCurrentTime(0);
    setStartTime(0);
    setEndTime(0);
  }

  async function handleTrim() {
    if (!videoFile) {
      setError(
        "Select a video first."
      );

      return;
    }

    if (
      endTime <=
      startTime
    ) {
      setError(
        "Choose a valid start and end time."
      );

      return;
    }

    setError("");
    setResult(null);
    setIsProcessing(true);
    setProgress(0);

    try {
      const output =
        await trimVideo(
          videoFile,
          {
            startTime,
            endTime,
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

      setStatus(
        "Video ready."
      );

      setProgress(100);
    } catch (trimError) {
      setError(
        trimError?.message ||
          "Unable to trim this video."
      );

      setStatus("");
      setProgress(0);
    } finally {
      setIsProcessing(
        false
      );
    }
  }

  const selectedDuration =
    Math.max(
      0,
      endTime -
        startTime
    );

  const startPercentage =
    videoInfo?.duration
      ? (startTime /
          videoInfo.duration) *
        100
      : 0;

  const endPercentage =
    videoInfo?.duration
      ? (endTime /
          videoInfo.duration) *
        100
      : 100;

  return (
    <div className="video-trimmer-tool">
      <style>{`
        .video-trimmer-tool {
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
         * LAYOUT
         * =====================================================
         */

        .video-trimmer-layout {
          display: grid;

          grid-template-columns:
            minmax(0, 1.35fr)
            minmax(320px, .65fr);

          gap:
            20px;
        }

        .video-trimmer-panel,
        .video-trimmer-settings,
        .video-trimmer-result {
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

        .video-trimmer-header {
          min-height:
            56px;

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

        .video-trimmer-title {
          margin:
            0;

          font-size:
            12px;

          font-weight:
            700;

          letter-spacing:
            .1em;

          text-transform:
            uppercase;

          color:
            rgba(255,255,255,.72);
        }

        .video-trimmer-meta {
          color:
            rgba(255,255,255,.35);

          font-size:
            11px;
        }

        /*
         * =====================================================
         * DROPZONE
         * =====================================================
         */

        .video-trimmer-upload {
          min-height:
            410px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          padding:
            26px;
        }

        .video-trimmer-dropzone {
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

        .video-trimmer-dropzone:hover {
          border-color:
            rgba(249,115,22,.38);

          background:
            rgba(249,115,22,.035);
        }

        .video-trimmer-icon {
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

        .video-trimmer-drop-title {
          margin:
            0
            0
            7px;

          font-size:
            16px;

          font-weight:
            700;
        }

        .video-trimmer-drop-description {
          margin:
            0
            0
            17px;

          color:
            rgba(255,255,255,.4);

          font-size:
            12px;
        }

        .video-trimmer-file-input {
          display:
            none;
        }

        .video-trimmer-browse {
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
         * PREVIEW
         * =====================================================
         */

        .video-trimmer-preview {
          padding:
            18px;
        }

        .video-trimmer-video-wrap {
          position:
            relative;

          width:
            100%;

          overflow:
            hidden;

          border-radius:
            13px;

          background:
            #050505;

          border:
            1px solid
            rgba(255,255,255,.07);
        }

        .video-trimmer-video {
          display:
            block;

          width:
            100%;

          max-height:
            480px;

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

        .video-trimmer-timeline-section {
          padding:
            18px
            18px
            20px;
        }

        .video-trimmer-timeline {
          position:
            relative;

          height:
            54px;

          border-radius:
            10px;

          overflow:
            hidden;

          background:
            rgba(255,255,255,.05);

          border:
            1px solid
            rgba(255,255,255,.08);

          cursor:
            pointer;
        }

        .video-trimmer-selection {
          position:
            absolute;

          top:
            0;

          bottom:
            0;

          background:
            rgba(249,115,22,.2);

          border-left:
            2px solid
            #f97316;

          border-right:
            2px solid
            #f97316;

          pointer-events:
            none;
        }

        .video-trimmer-playhead {
          position:
            absolute;

          top:
            -3px;

          bottom:
            -3px;

          width:
            2px;

          background:
            #ffffff;

          box-shadow:
            0 0 10px
            rgba(255,255,255,.75);

          pointer-events:
            none;
        }

        .video-trimmer-markers {
          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          margin-top:
            7px;

          color:
            rgba(255,255,255,.32);

          font-size:
            9px;
        }

        /*
         * =====================================================
         * RANGE CONTROLS
         * =====================================================
         */

        .video-trimmer-range-area {
          position:
            relative;

          margin-top:
            18px;

          padding:
            6px
            0;
        }

        .video-trimmer-range {
          width:
            100%;

          height:
            5px;

          margin:
            0;

          appearance:
            none;

          -webkit-appearance:
            none;

          background:
            rgba(255,255,255,.1);

          border-radius:
            999px;

          outline:
            none;

          cursor:
            pointer;
        }

        .video-trimmer-range::-webkit-slider-thumb {
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
            0 0 12px
            rgba(249,115,22,.5);

          cursor:
            grab;
        }

        .video-trimmer-range::-moz-range-thumb {
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
            0 0 12px
            rgba(249,115,22,.5);

          cursor:
            grab;
        }

        .video-trimmer-range-end::-webkit-slider-thumb {
          background:
            #ffffff;

          box-shadow:
            0 0 12px
            rgba(255,255,255,.4);
        }

        .video-trimmer-range-end::-moz-range-thumb {
          background:
            #ffffff;

          box-shadow:
            0 0 12px
            rgba(255,255,255,.4);
        }

        /*
         * =====================================================
         * INFO
         * =====================================================
         */

        .video-trimmer-info-grid {
          display:
            grid;

          grid-template-columns:
            repeat(
              2,
              minmax(0,1fr)
            );

          gap:
            10px;

          margin-top:
            17px;
        }

        .video-trimmer-stat {
          padding:
            12px;

          border:
            1px solid
            rgba(255,255,255,.07);

          border-radius:
            11px;

          background:
            rgba(0,0,0,.12);
        }

        .video-trimmer-stat-label {
          margin-bottom:
            6px;

          color:
            rgba(255,255,255,.34);

          font-size:
            9px;

          font-weight:
            700;

          letter-spacing:
            .08em;

          text-transform:
            uppercase;
        }

        .video-trimmer-stat-value {
          color:
            rgba(255,255,255,.85);

          font-size:
            13px;

          font-weight:
            700;
        }

        /*
         * =====================================================
         * SETTINGS
         * =====================================================
         */

        .video-trimmer-settings {
          padding:
            18px;
        }

        .video-trimmer-settings-grid {
          display:
            grid;

          grid-template-columns:
            1fr;

          gap:
            12px;

          margin-top:
            16px;
        }

        .video-trimmer-setting {
          display:
            flex;

          flex-direction:
            column;

          gap:
            7px;
        }

        .video-trimmer-setting label {
          color:
            rgba(255,255,255,.43);

          font-size:
            10px;

          font-weight:
            700;

          letter-spacing:
            .08em;

          text-transform:
            uppercase;
        }

        .video-trimmer-setting input,
        .video-trimmer-setting select {
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

        .video-trimmer-setting input:focus,
        .video-trimmer-setting select:focus {
          border-color:
            rgba(249,115,22,.42);

          box-shadow:
            0
            0
            0
            3px
            rgba(249,115,22,.06);
        }

        .video-trimmer-output-summary {
          margin-top:
            18px;

          padding:
            14px;

          border:
            1px solid
            rgba(249,115,22,.16);

          border-radius:
            12px;

          background:
            rgba(249,115,22,.035);
        }

        .video-trimmer-output-summary-title {
          margin:
            0
            0
            7px;

          color:
            rgba(255,255,255,.78);

          font-size:
            11px;

          font-weight:
            700;

          text-transform:
            uppercase;

          letter-spacing:
            .08em;
        }

        .video-trimmer-output-summary-value {
          color:
            #fdba74;

          font-size:
            18px;

          font-weight:
            800;
        }

        /*
         * =====================================================
         * ACTIONS
         * =====================================================
         */

        .video-trimmer-actions {
          display:
            flex;

          gap:
            9px;

          margin-top:
            17px;
        }

        .video-trimmer-button {
          flex:
            1;

          min-height:
            42px;

          padding:
            10px
            13px;

          border:
            1px solid
            rgba(255,255,255,.1);

          border-radius:
            10px;

          background:
            rgba(255,255,255,.05);

          color:
            rgba(255,255,255,.82);

          font-size:
            11px;

          font-weight:
            700;

          cursor:
            pointer;
        }

        .video-trimmer-button.primary {
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
            0 10px 28px
            rgba(249,115,22,.13);
        }

        .video-trimmer-button:disabled {
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

        .video-trimmer-progress {
          margin-top:
            15px;
        }

        .video-trimmer-progress-track {
          height:
            6px;

          overflow:
            hidden;

          border-radius:
            999px;

          background:
            rgba(255,255,255,.08);
        }

        .video-trimmer-progress-fill {
          height:
            100%;

          border-radius:
            inherit;

          background:
            linear-gradient(
              90deg,
              #f97316,
              #fb923c
            );

          transition:
            width .2s ease;
        }

        .video-trimmer-status {
          margin-top:
            7px;

          color:
            rgba(255,255,255,.43);

          font-size:
            10px;
        }

        /*
         * =====================================================
         * ERROR
         * =====================================================
         */

        .video-trimmer-error {
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
            11px;
        }

        /*
         * =====================================================
         * RESULT
         * =====================================================
         */

        .video-trimmer-result {
          grid-column:
            1 / -1;

          padding:
            18px;
        }

        .video-trimmer-result-title {
          margin:
            0
            0
            7px;

          color:
            rgba(255,255,255,.9);

          font-size:
            14px;

          font-weight:
            700;
        }

        .video-trimmer-result-meta {
          display:
            flex;

          flex-wrap:
            wrap;

          gap:
            16px;

          color:
            rgba(255,255,255,.4);

          font-size:
            10px;
        }

        /*
         * =====================================================
         * MOBILE
         * =====================================================
         */

        @media (max-width: 1000px) {
          .video-trimmer-layout {
            grid-template-columns:
              1fr;
          }

          .video-trimmer-result {
            grid-column:
              auto;
          }
        }

        @media (max-width: 650px) {
          .video-trimmer-tool {
            padding:
              22px
              18px
              30px;
          }

          .video-trimmer-info-grid {
            grid-template-columns:
              1fr;
          }
        }
      `}</style>

      <div className="video-trimmer-layout">
        {/* ==================================================
            VIDEO PREVIEW
        ================================================== */}

        <section className="video-trimmer-panel">
          <div className="video-trimmer-header">
            <h2 className="video-trimmer-title">
              Video Trimmer
            </h2>

            <span className="video-trimmer-meta">
              Local processing
            </span>
          </div>

          {!videoFile ? (
            <div className="video-trimmer-upload">
              <div
                className="video-trimmer-dropzone"
                onDrop={handleDrop}
                onDragOver={
                  handleDragOver
                }
              >
                <div className="video-trimmer-icon">
                  ✂
                </div>

                <h3 className="video-trimmer-drop-title">
                  Drop a video here
                </h3>

                <p className="video-trimmer-drop-description">
                  Select the start and end points,
                  then export the trimmed clip.
                </p>

                <input
                  ref={fileInputRef}
                  id="kaizen-video-trimmer-input"
                  className="video-trimmer-file-input"
                  type="file"
                  accept="video/*"
                  onChange={
                    handleFileChange
                  }
                />

                <label
                  htmlFor="kaizen-video-trimmer-input"
                  className="video-trimmer-browse"
                >
                  Choose Video
                </label>
              </div>
            </div>
          ) : (
            <>
              <div className="video-trimmer-preview">
                <div className="video-trimmer-video-wrap">
                  <video
                    ref={videoRef}
                    className="video-trimmer-video"
                    src={
                      previewURLRef.current ||
                      undefined
                    }
                    controls
                    preload="metadata"
                    onTimeUpdate={
                      handleVideoTimeUpdate
                    }
                    onLoadedMetadata={
                      handleVideoLoadedMetadata
                    }
                  />
                </div>
              </div>

              <div className="video-trimmer-timeline-section">
                <div
                  className="video-trimmer-timeline"
                  onClick={
                    handleTimelineClick
                  }
                >
                  <div
                    className="video-trimmer-selection"
                    style={{
                      left:
                        `${startPercentage}%`,
                      right:
                        `${100 - endPercentage}%`,
                    }}
                  />

                  <div
                    className="video-trimmer-playhead"
                    style={{
                      left:
                        `${
                          videoInfo?.duration
                            ? (currentTime /
                                videoInfo.duration) *
                              100
                            : 0
                        }%`,
                    }}
                  />
                </div>

                <div className="video-trimmer-markers">
                  <span>
                    {formatVideoTime(
                      startTime
                    )}
                  </span>

                  <span>
                    Current{" "}
                    {formatVideoTime(
                      currentTime
                    )}
                  </span>

                  <span>
                    {formatVideoTime(
                      endTime
                    )}
                  </span>
                </div>

                <div className="video-trimmer-range-area">
                  <input
                    className="video-trimmer-range"
                    type="range"
                    min="0"
                    max={
                      videoInfo?.duration ||
                      0
                    }
                    step="0.01"
                    value={
                      startTime
                    }
                    onChange={
                      handleStartChange
                    }
                    disabled={
                      isProcessing
                    }
                    aria-label="Start time"
                  />
                </div>

                <div className="video-trimmer-range-area">
                  <input
                    className="video-trimmer-range video-trimmer-range-end"
                    type="range"
                    min="0"
                    max={
                      videoInfo?.duration ||
                      0
                    }
                    step="0.01"
                    value={
                      endTime
                    }
                    onChange={
                      handleEndChange
                    }
                    disabled={
                      isProcessing
                    }
                    aria-label="End time"
                  />
                </div>

                <div className="video-trimmer-info-grid">
                  <div className="video-trimmer-stat">
                    <div className="video-trimmer-stat-label">
                      Original
                    </div>

                    <div className="video-trimmer-stat-value">
                      {formatVideoTime(
                        videoInfo?.duration ||
                          0
                      )}
                    </div>
                  </div>

                  <div className="video-trimmer-stat">
                    <div className="video-trimmer-stat-label">
                      Selected
                    </div>

                    <div className="video-trimmer-stat-value">
                      {formatVideoTime(
                        selectedDuration
                      )}
                    </div>
                  </div>
                </div>

                <div className="video-trimmer-actions">
                  <button
                    type="button"
                    className="video-trimmer-button"
                    onClick={
                      handleResetTrim
                    }
                    disabled={
                      isProcessing
                    }
                  >
                    Reset
                  </button>

                  <button
                    type="button"
                    className="video-trimmer-button"
                    onClick={
                      clearVideo
                    }
                    disabled={
                      isProcessing
                    }
                  >
                    Replace
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* ==================================================
            SETTINGS
        ================================================== */}

        <section className="video-trimmer-settings">
          <div className="video-trimmer-header" style={{
            padding: 0,
            border: 0,
            minHeight: 0,
          }}>
            <h2 className="video-trimmer-title">
              Export
            </h2>
          </div>

          <div className="video-trimmer-settings-grid">
            <div className="video-trimmer-setting">
              <label>
                Start time
              </label>

              <input
                type="number"
                min="0"
                max={
                  videoInfo?.duration ||
                  0
                }
                step="0.01"
                value={
                  startTime.toFixed(
                    2
                  )
                }
                onChange={
                  handleStartChange
                }
                disabled={
                  !videoInfo ||
                  isProcessing
                }
              />
            </div>

            <div className="video-trimmer-setting">
              <label>
                End time
              </label>

              <input
                type="number"
                min="0"
                max={
                  videoInfo?.duration ||
                  0
                }
                step="0.01"
                value={
                  endTime.toFixed(
                    2
                  )
                }
                onChange={
                  handleEndChange
                }
                disabled={
                  !videoInfo ||
                  isProcessing
                }
              />
            </div>

            <div className="video-trimmer-setting">
              <label>
                Output format
              </label>

              <select
                value={
                  outputFormat
                }
                onChange={(event) =>
                  setOutputFormat(
                    event.target.value
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
          </div>

          {videoInfo && (
            <>
              <div className="video-trimmer-output-summary">
                <div className="video-trimmer-output-summary-title">
                  Clip duration
                </div>

                <div className="video-trimmer-output-summary-value">
                  {formatVideoTime(
                    selectedDuration
                  )}
                </div>
              </div>

              <div className="video-trimmer-stat" style={{
                marginTop: "10px",
              }}>
                <div className="video-trimmer-stat-label">
                  File
                </div>

                <div className="video-trimmer-stat-value" style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {videoFile?.name}
                </div>
              </div>

              <div className="video-trimmer-stat" style={{
                marginTop: "10px",
              }}>
                <div className="video-trimmer-stat-label">
                  Original size
                </div>

                <div className="video-trimmer-stat-value">
                  {formatBytes(
                    videoInfo.fileSize
                  )}
                </div>
              </div>

              <div className="video-trimmer-actions">
                <button
                  type="button"
                  className="video-trimmer-button primary"
                  onClick={
                    handleTrim
                  }
                  disabled={
                    isProcessing ||
                    !videoInfo
                  }
                >
                  {isProcessing
                    ? "Processing..."
                    : "Trim Video"}
                </button>
              </div>
            </>
          )}

          {(isProcessing ||
            progress > 0) && (
            <div className="video-trimmer-progress">
              <div className="video-trimmer-progress-track">
                <div
                  className="video-trimmer-progress-fill"
                  style={{
                    width:
                      `${progress}%`,
                  }}
                />
              </div>

              <div className="video-trimmer-status">
                {status ||
                  `${progress}%`}
              </div>
            </div>
          )}

          {error && (
            <div className="video-trimmer-error">
              {error}
            </div>
          )}
        </section>

        {/* ==================================================
            RESULT
        ================================================== */}

        {result && (
          <section className="video-trimmer-result">
            <h3 className="video-trimmer-result-title">
              Trimmed video ready
            </h3>

            <div className="video-trimmer-result-meta">
              <span>
                {result.fileName}
              </span>

              <span>
                {formatVideoTime(
                  result.duration
                )}
              </span>

              <span>
                {formatBytes(
                  result.byteSize
                )}
              </span>

              <span>
                {result.outputFormat.toUpperCase()}
              </span>
            </div>

            <div className="video-trimmer-actions">
              <button
                type="button"
                className="video-trimmer-button primary"
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