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

const COMPRESSION_PRESETS = {
  high: {
    label: "Maximum compression",
    description:
      "Smallest file with stronger quality reduction.",
    crf: 30,
    preset: "veryfast",
    audioBitrate: "96k",
  },

  balanced: {
    label: "Balanced",
    description:
      "Good size reduction with a sensible quality balance.",
    crf: 26,
    preset: "veryfast",
    audioBitrate: "128k",
  },

  quality: {
    label: "Quality priority",
    description:
      "Better visual quality with a larger output file.",
    crf: 22,
    preset: "fast",
    audioBitrate: "160k",
  },
};

const RESOLUTION_OPTIONS = {
  original: {
    label: "Original",
    height: null,
  },

  "1080": {
    label: "1080p",
    height: 1080,
  },

  "720": {
    label: "720p",
    height: 720,
  },

  "480": {
    label: "480p",
    height: 480,
  },
};

async function getFFmpeg(
  onProgress
) {
  if (
    ffmpegInstance &&
    ffmpegLoaded
  ) {
    return ffmpegInstance;
  }

  if (ffmpegLoadPromise) {
    return ffmpegLoadPromise;
  }

  ffmpegLoadPromise =
    (async () => {
      const ffmpeg =
        new FFmpeg();

      ffmpeg.on(
        "progress",
        ({ progress }) => {
          const safeProgress =
            Number.isFinite(
              progress
            )
              ? Math.max(
                  0,
                  Math.min(
                    1,
                    progress
                  )
                )
              : 0;

          onProgress?.({
            stage:
              "encoding",

            progress:
              15 +
              Math.round(
                safeProgress *
                  78
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
        stage:
          "loading",

        progress:
          4,

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

      ffmpegInstance =
        ffmpeg;

      ffmpegLoaded =
        true;

      onProgress?.({
        stage:
          "ready",

        progress:
          10,

        message:
          "Video engine ready.",
      });

      return ffmpeg;
    })();

  try {
    return await ffmpegLoadPromise;
  } catch (error) {
    ffmpegLoadPromise =
      null;

    ffmpegInstance =
      null;

    ffmpegLoaded =
      false;

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
  const safe =
    Math.max(
      0,
      Number(seconds) || 0
    );

  const hours =
    Math.floor(
      safe / 3600
    );

  const minutes =
    Math.floor(
      (safe % 3600) / 60
    );

  const remaining =
    Math.floor(
      safe % 60
    );

  if (hours > 0) {
    return [
      String(hours).padStart(
        2,
        "0"
      ),

      String(
        minutes
      ).padStart(2, "0"),

      String(
        remaining
      ).padStart(2, "0"),
    ].join(":");
  }

  return [
    String(
      minutes
    ).padStart(2, "0"),

    String(
      remaining
    ).padStart(2, "0"),
  ].join(":");
}

async function readVideoMetadata(
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
      (
        resolve,
        reject
      ) => {
        const video =
          document.createElement(
            "video"
          );

        video.preload =
          "metadata";

        video.muted =
          true;

        video.onloadedmetadata =
          () => {
            const duration =
              Number.isFinite(
                video.duration
              )
                ? video.duration
                : 0;

            resolve({
              duration,

              width:
                video.videoWidth,

              height:
                video.videoHeight,

              aspectRatio:
                video.videoHeight
                  ? video.videoWidth /
                    video.videoHeight
                  : 0,
            });
          };

        video.onerror =
          () => {
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

function buildScaleFilter(
  maxHeight
) {
  if (!maxHeight) {
    return null;
  }

  /*
   * -2 lets FFmpeg choose a width that
   * preserves aspect ratio while keeping
   * the resulting dimension encoder-safe.
   *
   * force_original_aspect_ratio=decrease
   * prevents upscaling smaller source videos.
   */
  return `scale=-2:${maxHeight}:force_original_aspect_ratio=decrease`;
}

function calculateEstimatedScale(
  sourceWidth,
  sourceHeight,
  targetHeight
) {
  if (
    !targetHeight ||
    !sourceHeight
  ) {
    return {
      width: sourceWidth,
      height: sourceHeight,
    };
  }

  if (
    sourceHeight <=
    targetHeight
  ) {
    return {
      width: sourceWidth,
      height: sourceHeight,
    };
  }

  const ratio =
    targetHeight /
    sourceHeight;

  return {
    width:
      Math.max(
        2,
        Math.round(
          (sourceWidth *
            ratio) /
            2
        ) * 2
      ),

    height:
      Math.max(
        2,
        Math.round(
          targetHeight /
            2
        ) * 2
      ),
  };
}

export async function getCompressVideoInfo(
  file
) {
  const metadata =
    await readVideoMetadata(
      file
    );

  return {
    fileName:
      file.name,

    fileSize:
      file.size,

    mimeType:
      file.type ||
      "video/mp4",

    extension:
      getExtension(
        file.name
      ),

    ...metadata,
  };
}

export function getCompressionPresets() {
  return {
    ...COMPRESSION_PRESETS,
  };
}

export function getResolutionOptions() {
  return {
    ...RESOLUTION_OPTIONS,
  };
}

export async function compressVideo(
  file,
  {
    compression = "balanced",
    resolution = "original",
    outputFormat = "mp4",
    onProgress,
  } = {}
) {
  if (!(file instanceof File)) {
    throw new Error(
      "Please select a valid video file."
    );
  }

  if (
    !file.type.startsWith(
      "video/"
    )
  ) {
    throw new Error(
      "Please select a video file."
    );
  }

  const preset =
    COMPRESSION_PRESETS[
      compression
    ];

  if (!preset) {
    throw new Error(
      "Invalid compression preset."
    );
  }

  const resolutionOption =
    RESOLUTION_OPTIONS[
      resolution
    ];

  if (!resolutionOption) {
    throw new Error(
      "Invalid resolution option."
    );
  }

  const outputExtension =
    outputFormat ===
    "webm"
      ? "webm"
      : "mp4";

  /*
   * Current browser UI is designed around
   * MP4. WebM is retained as an optional
   * output path for the future-compatible
   * service API.
   */
  if (
    outputExtension ===
    "webm"
  ) {
    throw new Error(
      "WebM compression is not enabled yet. Please choose MP4."
    );
  }

  onProgress?.({
    stage:
      "reading",

    progress:
      2,

    message:
      "Reading video...",
  });

  const metadata =
    await getCompressVideoInfo(
      file
    );

  if (
    !metadata.duration ||
    metadata.duration <=
      0
  ) {
    throw new Error(
      "This video has no readable duration."
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
    `kaizen-compress-input.${inputExtension}`;

  const outputName =
    `kaizen-compressed-${Date.now()}.mp4`;

  onProgress?.({
    stage:
      "reading",

    progress:
      12,

    message:
      "Preparing video...",
  });

  await ffmpeg.writeFile(
    inputName,
    await fetchFile(file)
  );

  const scaleFilter =
    buildScaleFilter(
      resolutionOption.height
    );

  const videoFilters = [];

  if (scaleFilter) {
    videoFilters.push(
      scaleFilter
    );
  }

  /*
   * The output is encoded using:
   * - H.264 video
   * - AAC audio
   * - CRF quality control
   * - selected preset
   * - yuv420p for broad playback compatibility
   *
   * FFmpeg documents CRF as the quality
   * control for constant-quality mode.
   */

  const args = [
    "-i",
    inputName,

    "-map",
    "0:v:0",

    "-map",
    "0:a:0?",

    "-c:v",
    "libx264",

    "-preset",
    preset.preset,

    "-crf",
    String(preset.crf),

    "-pix_fmt",
    "yuv420p",

    "-c:a",
    "aac",

    "-b:a",
    preset.audioBitrate,

    "-movflags",
    "+faststart",
  ];

  if (videoFilters.length) {
    args.push(
      "-vf",
      videoFilters.join(",")
    );
  }

  args.push(
    outputName
  );

  onProgress?.({
    stage:
      "encoding",

    progress:
      15,

    message:
      "Compressing video...",
  });

  await ffmpeg.exec(
    args
  );

  onProgress?.({
    stage:
      "reading-output",

    progress:
      95,

    message:
      "Preparing compressed video...",
  });

  const output =
    await ffmpeg.readFile(
      outputName
    );

  const blob =
    new Blob(
      [
        output.buffer,
      ],
      {
        type:
          "video/mp4",
      }
    );

  /*
   * Estimate the actual encoded
   * dimensions from the requested
   * resolution.
   */
  const estimatedDimensions =
    calculateEstimatedScale(
      metadata.width,
      metadata.height,
      resolutionOption.height
    );

  try {
    await ffmpeg.deleteFile(
      inputName
    );
  } catch {
    // Ignore cleanup errors.
  }

  try {
    await ffmpeg.deleteFile(
      outputName
    );
  } catch {
    // Ignore cleanup errors.
  }

  const originalSize =
    file.size;

  const compressedSize =
    blob.size;

  const savedBytes =
    Math.max(
      0,
      originalSize -
        compressedSize
    );

  const savedPercent =
    originalSize > 0
      ? Math.max(
          0,
          (savedBytes /
            originalSize) *
            100
        )
      : 0;

  const baseName =
    file.name.replace(
      /\.[^/.]+$/,
      ""
    );

  onProgress?.({
    stage:
      "complete",

    progress:
      100,

    message:
      "Compressed video ready.",
  });

  return {
    blob,

    fileName:
      `${baseName}-compressed.mp4`,

    originalSize,

    compressedSize,

    savedBytes,

    savedPercent,

    duration:
      metadata.duration,

    originalWidth:
      metadata.width,

    originalHeight:
      metadata.height,

    outputWidth:
      estimatedDimensions.width,

    outputHeight:
      estimatedDimensions.height,

    compression,

    resolution,

    outputFormat:
      "mp4",
  };
}

export {
  formatTime,
};