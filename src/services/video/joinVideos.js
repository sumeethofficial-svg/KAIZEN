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
              safeProgress * 70
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
      progress: 12,
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

function getExtension(fileName) {
  const match =
    fileName.match(
      /\.([^.]+)$/
    );

  return match
    ? match[1].toLowerCase()
    : "mp4";
}

function formatTime(seconds) {
  const safe =
    Math.max(
      0,
      Number(seconds) || 0
    );

  const hours = Math.floor(
    safe / 3600
  );

  const minutes = Math.floor(
    (safe % 3600) / 60
  );

  const remaining =
    Math.floor(safe % 60);

  return [
    String(hours).padStart(
      2,
      "0"
    ),
    String(minutes).padStart(
      2,
      "0"
    ),
    String(remaining).padStart(
      2,
      "0"
    ),
  ].join(":");
}

export async function getJoinVideoInfo(
  file
) {
  if (!(file instanceof File)) {
    throw new Error(
      "Invalid video file."
    );
  }

  const url =
    URL.createObjectURL(file);

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
            resolve({
              fileName:
                file.name,
              fileSize:
                file.size,
              mimeType:
                file.type ||
                "video/mp4",
              duration:
                Number.isFinite(
                  video.duration
                )
                  ? video.duration
                  : 0,
              width:
                video.videoWidth,
              height:
                video.videoHeight,
            });
          };

        video.onerror = () => {
          reject(
            new Error(
              `Unable to read "${file.name}".`
            )
          );
        };

        video.src = url;
      }
    );
  } finally {
    URL.revokeObjectURL(
      url
    );
  }
}

async function normalizeVideo(
  ffmpeg,
  file,
  index,
  targetWidth,
  targetHeight,
  onProgress
) {
  const extension =
    getExtension(
      file.name
    );

  const inputName =
    `kaizen-join-input-${index}.${extension}`;

  const outputName =
    `kaizen-join-segment-${index}.mp4`;

  await ffmpeg.writeFile(
    inputName,
    await fetchFile(file)
  );

  /*
   * Normalize every clip to the first
   * video's dimensions and common
   * H.264/AAC settings.
   *
   * The aspect ratio is preserved and
   * letterboxed where necessary.
   */

  const scaleFilter =
    `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,` +
    `pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2,` +
    `setsar=1`;

  onProgress?.({
    stage: "normalizing",
    progress:
      15 +
      Math.round(
        (index /
          Math.max(
            1,
            1
          )) *
          1
      ),
    message:
      `Preparing video ${index + 1}...`,
  });

  /*
   * Optional audio mapping means the
   * source can be video-only. For a
   * consistent concat output, the
   * source clips should normally have
   * matching audio structure.
   */

  await ffmpeg.exec([
    "-i",
    inputName,

    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",

    "-vf",
    scaleFilter,

    "-r",
    "30",

    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",

    "-c:a",
    "aac",
    "-ar",
    "48000",
    "-ac",
    "2",

    "-pix_fmt",
    "yuv420p",

    "-movflags",
    "+faststart",

    outputName,
  ]);

  try {
    await ffmpeg.deleteFile(
      inputName
    );
  } catch {
    // Ignore cleanup failure.
  }

  return outputName;
}

export async function joinVideos(
  files,
  {
    onProgress,
  } = {}
) {
  if (
    !Array.isArray(files) ||
    files.length < 2
  ) {
    throw new Error(
      "Select at least two videos to join."
    );
  }

  for (const file of files) {
    if (
      !(file instanceof File) ||
      !file.type.startsWith(
        "video/"
      )
    ) {
      throw new Error(
        "All selected files must be videos."
      );
    }
  }

  const infos = [];

  onProgress?.({
    stage: "reading",
    progress: 2,
    message:
      "Reading video information...",
  });

  for (
    let index = 0;
    index < files.length;
    index += 1
  ) {
    const info =
      await getJoinVideoInfo(
        files[index]
      );

    infos.push(info);
  }

  const firstVideo =
    infos[0];

  let targetWidth =
    firstVideo.width ||
    1280;

  let targetHeight =
    firstVideo.height ||
    720;

  /*
   * Keep dimensions even for H.264.
   */

  targetWidth =
    Math.max(
      2,
      Math.floor(
        targetWidth / 2
      ) * 2
    );

  targetHeight =
    Math.max(
      2,
      Math.floor(
        targetHeight / 2
      ) * 2
    );

  const totalDuration =
    infos.reduce(
      (total, info) =>
        total +
        info.duration,
      0
    );

  const ffmpeg =
    await getFFmpeg(
      onProgress
    );

  const segmentNames = [];

  for (
    let index = 0;
    index < files.length;
    index += 1
  ) {
    const segment =
      await normalizeVideo(
        ffmpeg,
        files[index],
        index,
        targetWidth,
        targetHeight,
        onProgress
      );

    segmentNames.push(
      segment
    );

    onProgress?.({
      stage: "normalizing",
      progress:
        15 +
        Math.round(
          ((index + 1) /
            files.length) *
            60
        ),
      message:
        `Prepared ${index + 1} of ${files.length} videos.`,
    });
  }

  /*
   * FFmpeg concat demuxer list.
   */

  const concatFile =
    segmentNames
      .map(
        (name) =>
          `file '${name}'`
      )
      .join("\n");

  await ffmpeg.writeFile(
    "kaizen-join-list.txt",
    concatFile
  );

  const outputName =
    `kaizen-joined-${Date.now()}.mp4`;

  onProgress?.({
    stage: "joining",
    progress: 82,
    message:
      "Joining videos...",
  });

  await ffmpeg.exec([
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    "kaizen-join-list.txt",
    "-c",
    "copy",
    "-movflags",
    "+faststart",
    outputName,
  ]);

  onProgress?.({
    stage: "reading-output",
    progress: 95,
    message:
      "Preparing joined video...",
  });

  const output =
    await ffmpeg.readFile(
      outputName
    );

  const blob =
    new Blob(
      [output.buffer],
      {
        type:
          "video/mp4",
      }
    );

  /*
   * Cleanup.
   */

  const cleanupFiles = [
    "kaizen-join-list.txt",
    outputName,
    ...segmentNames,
  ];

  for (
    const fileName of cleanupFiles
  ) {
    try {
      await ffmpeg.deleteFile(
        fileName
      );
    } catch {
      // Ignore cleanup failures.
    }
  }

  onProgress?.({
    stage: "complete",
    progress: 100,
    message:
      "Joined video ready.",
  });

  return {
    blob,
    fileName:
      `joined-video-${Date.now()}.mp4`,
    byteSize:
      blob.size,
    duration:
      totalDuration,
    width:
      targetWidth,
    height:
      targetHeight,
    count:
      files.length,
  };
}

export { formatTime };