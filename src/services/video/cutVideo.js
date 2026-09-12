import { FFmpeg } from "@ffmpeg/ffmpeg";
import {
  fetchFile,
  toBlobURL,
} from "@ffmpeg/util";

let ffmpegInstance = null;
let ffmpegLoaded = false;
let ffmpegLoadPromise = null;

const CORE_VERSION = "0.12.10";

const CORE_BASE_URL =
  `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

async function getFFmpeg(onProgress) {
  if (
    ffmpegInstance &&
    ffmpegLoaded
  ) {
    return ffmpegInstance;
  }

  if (ffmpegLoadPromise) {
    return ffmpegLoadPromise;
  }

  ffmpegLoadPromise = (async () => {
    const ffmpeg = new FFmpeg();

    ffmpeg.on(
      "progress",
      ({ progress }) => {
        const safeProgress =
          Number.isFinite(progress)
            ? Math.max(
                0,
                Math.min(
                  1,
                  progress
                )
              )
            : 0;

        onProgress?.({
          stage: "processing",
          progress:
            20 +
            Math.round(
              safeProgress * 65
            ),
        });
      }
    );

    ffmpeg.on(
      "log",
      ({ message }) => {
        console.debug(
          "[KAIZEN FFmpeg]",
          message
        );
      }
    );

    onProgress?.({
      stage: "loading",
      progress: 5,
      message:
        "Loading video engine...",
    });

    const coreURL =
      await toBlobURL(
        `${CORE_BASE_URL}/ffmpeg-core.js`,
        "text/javascript"
      );

    const wasmURL =
      await toBlobURL(
        `${CORE_BASE_URL}/ffmpeg-core.wasm`,
        "application/wasm"
      );

    const workerURL =
      await toBlobURL(
        `${CORE_BASE_URL}/ffmpeg-core.worker.js`,
        "text/javascript"
      );

    await ffmpeg.load({
      coreURL,
      wasmURL,
      workerURL,
    });

    ffmpegInstance = ffmpeg;
    ffmpegLoaded = true;

    onProgress?.({
      stage: "ready",
      progress: 15,
      message:
        "Video engine ready.",
    });

    return ffmpeg;
  })();

  try {
    return await ffmpegLoadPromise;
  } catch (error) {
    ffmpegLoadPromise = null;
    ffmpegInstance = null;
    ffmpegLoaded = false;

    throw error;
  }
}

function getExtension(
  fileName
) {
  const match =
    fileName.match(
      /\.([^.]+)$/
    );

  return match
    ? match[1].toLowerCase()
    : "mp4";
}

function formatTime(
  seconds
) {
  const safeSeconds =
    Math.max(
      0,
      Number(seconds) || 0
    );

  const hours = Math.floor(
    safeSeconds / 3600
  );

  const minutes = Math.floor(
    (safeSeconds % 3600) / 60
  );

  const remaining =
    safeSeconds % 60;

  return [
    String(hours).padStart(
      2,
      "0"
    ),
    String(minutes).padStart(
      2,
      "0"
    ),
    String(
      Math.floor(
        remaining
      )
    ).padStart(2, "0"),
  ].join(":");
}

function normalizeCuts(
  cuts,
  duration
) {
  return cuts
    .map((cut) => {
      const start = Math.max(
        0,
        Math.min(
          Number(cut.start) || 0,
          duration
        )
      );

      const end = Math.max(
        start,
        Math.min(
          Number(cut.end) || 0,
          duration
        )
      );

      return {
        start,
        end,
      };
    })
    .filter(
      (cut) =>
        cut.end -
          cut.start >
        0.05
    )
    .sort(
      (a, b) =>
        a.start -
        b.start
    );
}

function mergeOverlappingCuts(
  cuts
) {
  if (!cuts.length) {
    return [];
  }

  const merged = [
    {
      ...cuts[0],
    },
  ];

  for (
    let index = 1;
    index <
    cuts.length;
    index += 1
  ) {
    const current =
      cuts[index];

    const previous =
      merged[
        merged.length - 1
      ];

    if (
      current.start <=
      previous.end + 0.05
    ) {
      previous.end =
        Math.max(
          previous.end,
          current.end
        );
    } else {
      merged.push({
        ...current,
      });
    }
  }

  return merged;
}

function buildKeepSegments(
  cuts,
  duration
) {
  const keepSegments = [];

  let cursor = 0;

  for (const cut of cuts) {
    if (
      cut.start >
      cursor + 0.05
    ) {
      keepSegments.push({
        start: cursor,
        end: cut.start,
      });
    }

    cursor =
      Math.max(
        cursor,
        cut.end
      );
  }

  if (
    duration >
    cursor + 0.05
  ) {
    keepSegments.push({
      start: cursor,
      end: duration,
    });
  }

  return keepSegments;
}

export async function getCutVideoInfo(
  file
) {
  if (!(file instanceof File)) {
    throw new Error(
      "Please select a valid video file."
    );
  }

  const previewURL =
    URL.createObjectURL(
      file
    );

  try {
    return await new Promise(
      (resolve, reject) => {
        const video =
          document.createElement(
            "video"
          );

        video.preload =
          "metadata";

        video.muted = true;

        video.onloadedmetadata =
          () => {
            const duration =
              Number.isFinite(
                video.duration
              )
                ? video.duration
                : 0;

            resolve({
              fileName:
                file.name,
              fileSize:
                file.size,
              mimeType:
                file.type ||
                "video/mp4",
              duration,
              width:
                video.videoWidth,
              height:
                video.videoHeight,
            });
          };

        video.onerror = () => {
          reject(
            new Error(
              "Unable to read this video file."
            )
          );
        };

        video.src =
          previewURL;
      }
    );
  } finally {
    URL.revokeObjectURL(
      previewURL
    );
  }
}

export async function cutVideo(
  file,
  {
    cuts = [],
    outputFormat = "mp4",
    onProgress,
  } = {}
) {
  if (!(file instanceof File)) {
    throw new Error(
      "Please select a valid video file."
    );
  }

  const info =
    await getCutVideoInfo(
      file
    );

  const duration =
    info.duration;

  if (
    !duration ||
    duration <= 0
  ) {
    throw new Error(
      "This video has no readable duration."
    );
  }

  const normalizedCuts =
    mergeOverlappingCuts(
      normalizeCuts(
        cuts,
        duration
      )
    );

  if (!normalizedCuts.length) {
    throw new Error(
      "Add at least one section to remove."
    );
  }

  const keepSegments =
    buildKeepSegments(
      normalizedCuts,
      duration
    );

  if (!keepSegments.length) {
    throw new Error(
      "The selected cuts remove the entire video."
    );
  }

  if (
    keepSegments.reduce(
      (total, segment) =>
        total +
        (segment.end -
          segment.start),
      0
    ) < 0.05
  ) {
    throw new Error(
      "The remaining video is too short."
    );
  }

  const ffmpeg =
    await getFFmpeg(
      onProgress
    );

  const inputExtension =
    getExtension(
      file.name
    );

  const inputName =
    `kaizen-cutter-input.${inputExtension}`;

  const segmentNames =
    [];

  const outputExtension =
    outputFormat === "webm"
      ? "webm"
      : "mp4";

  const outputName =
    `kaizen-cut-${Date.now()}.${outputExtension}`;

  onProgress?.({
    stage: "reading",
    progress: 17,
    message:
      "Preparing video...",
  });

  await ffmpeg.writeFile(
    inputName,
    await fetchFile(file)
  );

  /*
   * Encode every kept segment using
   * identical settings.
   *
   * This gives us compatible files for
   * the final concat step.
   */

  for (
    let index = 0;
    index <
    keepSegments.length;
    index += 1
  ) {
    const segment =
      keepSegments[index];

    const segmentName =
      `kaizen-cutter-segment-${index}.${outputExtension}`;

    segmentNames.push(
      segmentName
    );

    const segmentDuration =
      segment.end -
      segment.start;

    onProgress?.({
      stage: "cutting",
      progress:
        20 +
        Math.round(
          (index /
            keepSegments.length) *
            55
        ),
      message:
        `Creating clip ${index + 1} of ${keepSegments.length}...`,
    });

    const commonArgs = [
      "-ss",
      formatTime(
        segment.start
      ),
      "-i",
      inputName,
      "-t",
      formatTime(
        segmentDuration
      ),
    ];

    if (
      outputExtension ===
      "webm"
    ) {
      await ffmpeg.exec([
        ...commonArgs,
        "-c:v",
        "libvpx",
        "-c:a",
        "libvorbis",
        "-deadline",
        "good",
        segmentName,
      ]);
    } else {
      await ffmpeg.exec([
        ...commonArgs,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-movflags",
        "+faststart",
        segmentName,
      ]);
    }
  }

  /*
   * Build concat list.
   */

  const concatFile =
    segmentNames
      .map(
        (name) =>
          `file '${name}'`
      )
      .join("\n");

  await ffmpeg.writeFile(
    "kaizen-cutter-concat.txt",
    concatFile
  );

  onProgress?.({
    stage: "joining",
    progress: 80,
    message:
      "Joining remaining video...",
  });

  /*
   * The segments were encoded with the
   * same video/audio parameters, so the
   * concat demuxer can join them.
   */
  await ffmpeg.exec([
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    "kaizen-cutter-concat.txt",
    "-c",
    "copy",
    "-movflags",
    "+faststart",
    outputName,
  ]);

  onProgress?.({
    stage: "reading-output",
    progress: 94,
    message:
      "Preparing final video...",
  });

  const output =
    await ffmpeg.readFile(
      outputName
    );

  const outputType =
    outputExtension === "webm"
      ? "video/webm"
      : "video/mp4";

  const blob =
    new Blob(
      [output.buffer],
      {
        type:
          outputType,
      }
    );

  /*
   * Cleanup virtual filesystem.
   */

  const cleanupFiles = [
    inputName,
    "kaizen-cutter-concat.txt",
    outputName,
    ...segmentNames,
  ];

  for (
    const path of cleanupFiles
  ) {
    try {
      await ffmpeg.deleteFile(
        path
      );
    } catch {
      // Ignore cleanup failure.
    }
  }

  const removedDuration =
    normalizedCuts.reduce(
      (total, cut) =>
        total +
        (cut.end -
          cut.start),
      0
    );

  const remainingDuration =
    Math.max(
      0,
      duration -
        removedDuration
    );

  const baseName =
    file.name.replace(
      /\.[^/.]+$/,
      ""
    );

  onProgress?.({
    stage: "complete",
    progress: 100,
    message:
      "Video ready.",
  });

  return {
    blob,
    fileName:
      `${baseName}-cut.${outputExtension}`,
    byteSize:
      blob.size,
    originalDuration:
      duration,
    removedDuration,
    remainingDuration,
    cuts:
      normalizedCuts,
    outputFormat:
      outputExtension,
  };
}