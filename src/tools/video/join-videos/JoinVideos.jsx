import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  formatTime,
  getJoinVideoInfo,
  joinVideos,
} from "../../../services/video/joinVideos.js";

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

export default function JoinVideos() {
  const fileInputRef =
    useRef(null);

  const previewURLsRef =
    useRef(new Map());

  const [
    videos,
    setVideos,
  ] = useState([]);

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
      for (
        const url of
          previewURLsRef.current.values()
      ) {
        URL.revokeObjectURL(
          url
        );
      }

      previewURLsRef.current.clear();
    };
  }, []);

  function createId() {
    return `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
  }

  async function addFiles(
    files
  ) {
    const incoming =
      Array.from(
        files || []
      ).filter((file) =>
        file.type.startsWith(
          "video/"
        )
      );

    if (!incoming.length) {
      setError(
        "Please select one or more video files."
      );

      return;
    }

    setError("");
    setResult(null);

    const nextVideos = [];

    for (
      const file of incoming
    ) {
      try {
        const info =
          await getJoinVideoInfo(
            file
          );

        const id =
          createId();

        const previewURL =
          URL.createObjectURL(
            file
          );

        previewURLsRef.current.set(
          id,
          previewURL
        );

        nextVideos.push({
          id,
          file,
          ...info,
        });
      } catch (fileError) {
        setError(
          fileError?.message ||
            `Unable to read ${file.name}.`
        );
      }
    }

    setVideos(
      (current) => [
        ...current,
        ...nextVideos,
      ]
    );
  }

  async function handleFileChange(
    event
  ) {
    await addFiles(
      event.target.files
    );

    event.target.value =
      "";
  }

  function handleDrop(
    event
  ) {
    event.preventDefault();

    addFiles(
      event.dataTransfer.files
    );
  }

  function handleDragOver(
    event
  ) {
    event.preventDefault();
  }

  function removeVideo(
    id
  ) {
    const url =
      previewURLsRef.current.get(
        id
      );

    if (url) {
      URL.revokeObjectURL(
        url
      );

      previewURLsRef.current.delete(
        id
      );
    }

    setVideos(
      (current) =>
        current.filter(
          (video) =>
            video.id !== id
        )
    );

    setResult(null);
  }

  function moveVideo(
    index,
    direction
  ) {
    setVideos(
      (current) => {
        const next = [
          ...current,
        ];

        const targetIndex =
          index +
          direction;

        if (
          targetIndex <
            0 ||
          targetIndex >=
            next.length
        ) {
          return current;
        }

        [
          next[index],
          next[targetIndex],
        ] = [
          next[targetIndex],
          next[index],
        ];

        return next;
      }
    );

    setResult(null);
  }

  function clearVideos() {
    for (
      const id of
        previewURLsRef.current.keys()
    ) {
      const url =
        previewURLsRef.current.get(
          id
        );

      if (url) {
        URL.revokeObjectURL(
          url
        );
      }
    }

    previewURLsRef.current.clear();

    setVideos([]);
    setResult(null);
    setError("");
    setProgress(0);
    setStatus("");
  }

  async function handleJoin() {
    if (
      videos.length <
      2
    ) {
      setError(
        "Add at least two videos to join."
      );

      return;
    }

    setError("");
    setResult(null);
    setProgress(0);
    setIsProcessing(true);

    try {
      const output =
        await joinVideos(
          videos.map(
            (video) =>
              video.file
          ),
          {
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
        "Joined video ready."
      );
    } catch (joinError) {
      setError(
        joinError?.message ||
          "Unable to join these videos."
      );

      setProgress(0);
      setStatus("");
    } finally {
      setIsProcessing(
        false
      );
    }
  }

  const totalDuration =
    videos.reduce(
      (total, video) =>
        total +
        video.duration,
      0
    );

  return (
    <div className="join-videos-tool">
      <style>{`
        .join-videos-tool {
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

        .join-videos-layout {
          display:
            grid;

          grid-template-columns:
            minmax(0,1.3fr)
            minmax(300px,.7fr);

          gap:
            20px;
        }

        .join-videos-panel,
        .join-videos-settings,
        .join-videos-result {
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
            0 16px
            50px
            rgba(0,0,0,.2);
        }

        /*
         * =====================================================
         * HEADER
         * =====================================================
         */

        .join-videos-header {
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

        .join-videos-title {
          margin:
            0;

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

        .join-videos-meta {
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

        .join-videos-upload {
          padding:
            18px;
        }

        .join-videos-dropzone {
          min-height:
            190px;

          display:
            flex;

          flex-direction:
            column;

          align-items:
            center;

          justify-content:
            center;

          border:
            1px dashed
            rgba(255,255,255,.14);

          border-radius:
            15px;

          background:
            rgba(0,0,0,.13);

          text-align:
            center;

          transition:
            border-color .2s ease,
            background .2s ease;
        }

        .join-videos-dropzone:hover {
          border-color:
            rgba(249,115,22,.38);

          background:
            rgba(249,115,22,.035);
        }

        .join-videos-icon {
          width:
            52px;

          height:
            52px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          margin-bottom:
            12px;

          border:
            1px solid
            rgba(249,115,22,.22);

          border-radius:
            15px;

          background:
            rgba(249,115,22,.08);

          color:
            #fb923c;

          font-size:
            23px;
        }

        .join-videos-drop-title {
          margin:
            0
            0
            6px;

          font-size:
            15px;

          font-weight:
            700;
        }

        .join-videos-drop-text {
          margin:
            0
            0
            15px;

          color:
            rgba(255,255,255,.36);

          font-size:
            11px;
        }

        .join-videos-input {
          display:
            none;
        }

        .join-videos-browse {
          display:
            inline-flex;

          align-items:
            center;

          justify-content:
            center;

          padding:
            9px
            14px;

          border:
            1px solid
            rgba(249,115,22,.3);

          border-radius:
            9px;

          background:
            rgba(249,115,22,.08);

          color:
            #fdba74;

          font-size:
            11px;

          font-weight:
            700;

          cursor:
            pointer;
        }

        /*
         * =====================================================
         * VIDEO LIST
         * =====================================================
         */

        .join-videos-list {
          padding:
            0
            18px
            18px;
        }

        .join-videos-list-header {
          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          margin-bottom:
            10px;
        }

        .join-videos-list-label {
          color:
            rgba(255,255,255,.45);

          font-size:
            9px;

          font-weight:
            700;

          letter-spacing:
            .1em;

          text-transform:
            uppercase;
        }

        .join-videos-clear {
          padding:
            0;

          border:
            0;

          background:
            transparent;

          color:
            rgba(255,255,255,.32);

          font-size:
            8px;

          font-weight:
            700;

          cursor:
            pointer;
        }

        .join-videos-clear:hover {
          color:
            #fb923c;
        }

        .join-videos-item {
          display:
            grid;

          grid-template-columns:
            92px
            minmax(0,1fr)
            auto;

          gap:
            12px;

          align-items:
            center;

          padding:
            9px;

          margin-bottom:
            7px;

          border:
            1px solid
            rgba(255,255,255,.07);

          border-radius:
            12px;

          background:
            rgba(0,0,0,.12);

          transition:
            border-color .18s ease,
            background .18s ease;
        }

        .join-videos-item:hover {
          border-color:
            rgba(249,115,22,.18);

          background:
            rgba(249,115,22,.025);
        }

        .join-videos-thumb {
          width:
            92px;

          height:
            58px;

          object-fit:
            cover;

          border-radius:
            8px;

          background:
            #080808;

          border:
            1px solid
            rgba(255,255,255,.06);
        }

        .join-videos-item-info {
          min-width:
            0;
        }

        .join-videos-item-number {
          color:
            rgba(249,115,22,.75);

          font-size:
            8px;

          font-weight:
            800;

          letter-spacing:
            .12em;
        }

        .join-videos-item-name {
          margin-top:
            3px;

          overflow:
            hidden;

          text-overflow:
            ellipsis;

          white-space:
            nowrap;

          color:
            rgba(255,255,255,.8);

          font-size:
            11px;

          font-weight:
            700;
        }

        .join-videos-item-duration {
          margin-top:
            4px;

          color:
            rgba(255,255,255,.32);

          font-size:
            9px;
        }

        /*
         * =====================================================
         * REORDER BUTTONS
         * =====================================================
         */

        .join-videos-item-actions {
          display:
            flex;

          align-items:
            center;

          gap:
            5px;
        }

        .join-videos-move,
        .join-videos-remove {
          width:
            26px;

          height:
            26px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          padding:
            0;

          border:
            1px solid
            rgba(255,255,255,.08);

          border-radius:
            7px;

          background:
            rgba(255,255,255,.035);

          color:
            rgba(255,255,255,.46);

          cursor:
            pointer;

          font-size:
            11px;
        }

        .join-videos-move:hover {
          border-color:
            rgba(249,115,22,.28);

          color:
            #fdba74;

          background:
            rgba(249,115,22,.07);
        }

        .join-videos-remove:hover {
          border-color:
            rgba(239,68,68,.28);

          color:
            #fecaca;

          background:
            rgba(239,68,68,.08);
        }

        /*
         * =====================================================
         * SETTINGS
         * =====================================================
         */

        .join-videos-settings {
          padding:
            18px;
        }

        .join-videos-summary {
          margin-top:
            17px;

          padding:
            14px;

          border:
            1px solid
            rgba(255,255,255,.07);

          border-radius:
            11px;

          background:
            rgba(0,0,0,.12);
        }

        .join-videos-summary-row {
          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          gap:
            10px;

          padding:
            5px 0;

          color:
            rgba(255,255,255,.4);

          font-size:
            10px;
        }

        .join-videos-summary-row strong {
          color:
            rgba(255,255,255,.82);
        }

        .join-videos-note {
          margin-top:
            15px;

          padding:
            11px
            12px;

          border:
            1px solid
            rgba(249,115,22,.12);

          border-radius:
            10px;

          background:
            rgba(249,115,22,.025);

          color:
            rgba(255,255,255,.36);

          font-size:
            9px;

          line-height:
            1.55;
        }

        /*
         * =====================================================
         * BUTTONS
         * =====================================================
         */

        .join-videos-actions {
          display:
            flex;

          gap:
            8px;

          margin-top:
            16px;
        }

        .join-videos-button {
          flex:
            1;

          min-height:
            41px;

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

        .join-videos-button.primary {
          border-color:
            rgba(249,115,22,.4);

          background:
            linear-gradient(
              135deg,
              rgba(249,115,22,.95),
              rgba(234,88,12,.78)
            );

          color:
            #ffffff;

          box-shadow:
            0 10px
            28px
            rgba(249,115,22,.13);
        }

        .join-videos-button:disabled {
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

        .join-videos-progress {
          margin-top:
            16px;
        }

        .join-videos-progress-track {
          height:
            6px;

          overflow:
            hidden;

          border-radius:
            999px;

          background:
            rgba(255,255,255,.08);
        }

        .join-videos-progress-fill {
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

        .join-videos-progress-text {
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

        .join-videos-error {
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

          line-height:
            1.5;
        }

        /*
         * =====================================================
         * RESULT
         * =====================================================
         */

        .join-videos-result {
          grid-column:
            1 / -1;

          padding:
            18px;
        }

        .join-videos-result-title {
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

        .join-videos-result-meta {
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

        @media (max-width: 900px) {
          .join-videos-layout {
            grid-template-columns:
              1fr;
          }

          .join-videos-result {
            grid-column:
              auto;
          }
        }

        @media (max-width: 620px) {
          .join-videos-tool {
            padding:
              22px
              18px
              30px;
          }

          .join-videos-item {
            grid-template-columns:
              72px
              minmax(0,1fr);
          }

          .join-videos-thumb {
            width:
              72px;

            height:
              48px;
          }

          .join-videos-item-actions {
            grid-column:
              1 / -1;

            justify-content:
              flex-end;
          }
        }
      `}</style>

      <div className="join-videos-layout">

        {/* ==================================================
            LEFT / VIDEOS
        ================================================== */}

        <section className="join-videos-panel">
          <div className="join-videos-header">
            <h2 className="join-videos-title">
              Join Videos
            </h2>

            <span className="join-videos-meta">
              Arrange clips in order
            </span>
          </div>

          <div className="join-videos-upload">
            <div
              className="join-videos-dropzone"
              onDrop={handleDrop}
              onDragOver={
                handleDragOver
              }
            >
              <div className="join-videos-icon">
                +
              </div>

              <h3 className="join-videos-drop-title">
                Add your videos
              </h3>

              <p className="join-videos-drop-text">
                Drop multiple video files here,
                then arrange them in the order
                you want.
              </p>

              <input
                ref={fileInputRef}
                id="kaizen-join-videos-input"
                className="join-videos-input"
                type="file"
                accept="video/*"
                multiple
                onChange={
                  handleFileChange
                }
              />

              <label
                htmlFor="kaizen-join-videos-input"
                className="join-videos-browse"
              >
                Add Videos
              </label>
            </div>
          </div>

          {videos.length >
            0 && (
            <div className="join-videos-list">
              <div className="join-videos-list-header">
                <span className="join-videos-list-label">
                  {videos.length}{" "}
                  video
                  {videos.length ===
                  1
                    ? ""
                    : "s"}
                </span>

                <button
                  type="button"
                  className="join-videos-clear"
                  onClick={
                    clearVideos
                  }
                  disabled={
                    isProcessing
                  }
                >
                  Clear all
                </button>
              </div>

              {videos.map(
                (
                  video,
                  index
                ) => {
                  const previewURL =
                    previewURLsRef.current.get(
                      video.id
                    );

                  return (
                    <div
                      className="join-videos-item"
                      key={
                        video.id
                      }
                    >
                      {previewURL ? (
                        <video
                          className="join-videos-thumb"
                          src={
                            previewURL
                          }
                          muted
                          preload="metadata"
                        />
                      ) : (
                        <div className="join-videos-thumb" />
                      )}

                      <div className="join-videos-item-info">
                        <div className="join-videos-item-number">
                          VIDEO{" "}
                          {String(
                            index +
                              1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </div>

                        <div className="join-videos-item-name">
                          {
                            video.name
                          }
                        </div>

                        <div className="join-videos-item-duration">
                          {formatTime(
                            video.duration
                          )}
                          {" · "}
                          {
                            video.width
                          }
                          ×
                          {
                            video.height
                          }
                        </div>
                      </div>

                      <div className="join-videos-item-actions">
                        <button
                          type="button"
                          className="join-videos-move"
                          onClick={() =>
                            moveVideo(
                              index,
                              -1
                            )
                          }
                          disabled={
                            index ===
                              0 ||
                            isProcessing
                          }
                          aria-label="Move video up"
                        >
                          ↑
                        </button>

                        <button
                          type="button"
                          className="join-videos-move"
                          onClick={() =>
                            moveVideo(
                              index,
                              1
                            )
                          }
                          disabled={
                            index ===
                              videos.length -
                                1 ||
                            isProcessing
                          }
                          aria-label="Move video down"
                        >
                          ↓
                        </button>

                        <button
                          type="button"
                          className="join-videos-remove"
                          onClick={() =>
                            removeVideo(
                              video.id
                            )
                          }
                          disabled={
                            isProcessing
                          }
                          aria-label="Remove video"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* ==================================================
            RIGHT / SETTINGS
        ================================================== */}

        <section className="join-videos-settings">
          <div
            className="join-videos-header"
            style={{
              padding: 0,
              border: 0,
              minHeight:
                0,
            }}
          >
            <h2 className="join-videos-title">
              Join Settings
            </h2>
          </div>

          <div className="join-videos-summary">
            <div className="join-videos-summary-row">
              <span>
                Videos
              </span>

              <strong>
                {videos.length}
              </strong>
            </div>

            <div className="join-videos-summary-row">
              <span>
                Total duration
              </span>

              <strong>
                {formatTime(
                  totalDuration
                )}
              </strong>
            </div>

            <div className="join-videos-summary-row">
              <span>
                Output
              </span>

              <strong>
                MP4
              </strong>
            </div>
          </div>

          <div className="join-videos-note">
            Videos are normalized to the first
            video's dimensions and joined locally
            in your browser.
          </div>

          <div className="join-videos-actions">
            <button
              type="button"
              className="join-videos-button primary"
              onClick={
                handleJoin
              }
              disabled={
                isProcessing ||
                videos.length <
                  2
              }
            >
              {isProcessing
                ? "Joining..."
                : "Join Videos"}
            </button>
          </div>

          {isProcessing && (
            <div className="join-videos-progress">
              <div className="join-videos-progress-track">
                <div
                  className="join-videos-progress-fill"
                  style={{
                    width:
                      `${progress}%`,
                  }}
                />
              </div>

              <div className="join-videos-progress-text">
                {status ||
                  `${progress}%`}
              </div>
            </div>
          )}

          {error && (
            <div className="join-videos-error">
              {error}
            </div>
          )}
        </section>

        {/* ==================================================
            RESULT
        ================================================== */}

        {result && (
          <section className="join-videos-result">
            <h3 className="join-videos-result-title">
              Joined video ready
            </h3>

            <div className="join-videos-result-meta">
              <span>
                {result.fileName}
              </span>

              <span>
                {result.count} videos
              </span>

              <span>
                {formatTime(
                  result.duration
                )}
              </span>

              <span>
                {
                  result.width
                }
                ×
                {
                  result.height
                }
              </span>

              <span>
                {formatBytes(
                  result.byteSize
                )}
              </span>
            </div>

            <div className="join-videos-actions">
              <button
                type="button"
                className="join-videos-button primary"
                onClick={() =>
                  downloadBlob(
                    result.blob,
                    result.fileName
                  )
                }
              >
                Download Joined Video
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}