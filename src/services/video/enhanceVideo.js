import { FFmpeg } from "@ffmpeg/ffmpeg";
import {
  fetchFile,
  toBlobURL,
} from "@ffmpeg/util";

const CORE_VERSION = "0.12.10";

const CORE_BASE_URL =
  `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`;

let ffmpegInstance = null;
let ffmpegLoadPromise = null;

function getFFmpeg() {
  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg();
  }

  return ffmpegInstance;
}

async function loadFFmpeg() {
  const ffmpeg = getFFmpeg();

  if (ffmpeg.loaded) {
    return ffmpeg;
  }

  if (ffmpegLoadPromise) {
    return ffmpegLoadPromise;
  }

  ffmpegLoadPromise = (async () => {
    await ffmpeg.load({
      coreURL: await toBlobURL(
        `${CORE_BASE_URL}/ffmpeg-core.js`,
        "text/javascript"
      ),

      wasmURL: await toBlobURL(
        `${CORE_BASE_URL}/ffmpeg-core.wasm`,
        "application/wasm"
      ),
    });

    return ffmpeg;
  })();

  try {
    return await ffmpegLoadPromise;
  } catch (error) {
    ffmpegLoadPromise = null;
    throw error;
  }
}

function getExtension(fileName) {
  const match =
    fileName.match(/\.([a-z0-9]+)$/i);

  return match
    ? match[1].toLowerCase()
    : "mp4";
}

function createInputName(file) {
  return `input.${getExtension(
    file.name
  )}`;
}

function createOutputName(fileName) {
  const dotIndex =
    fileName.lastIndexOf(".");

  const baseName =
    dotIndex > 0
      ? fileName.slice(0, dotIndex)
      : fileName;

  return `${baseName}-enhanced.mp4`;
}

function formatBytes(bytes) {
  if (
    !Number.isFinite(bytes) ||
    bytes < 0
  ) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  if (
    bytes <
    1024 * 1024 * 1024
  ) {
    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }

  return `${(
    bytes /
    (1024 * 1024 * 1024)
  ).toFixed(2)} GB`;
}

function clamp(
  value,
  min,
  max
) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

function normalizeAdjustments(
  adjustments = {}
) {
  return {
    brightness: clamp(
      Number(
        adjustments.brightness ?? 0
      ),
      -100,
      100
    ),

    contrast: clamp(
      Number(
        adjustments.contrast ?? 0
      ),
      -100,
      100
    ),

    saturation: clamp(
      Number(
        adjustments.saturation ?? 0
      ),
      -100,
      100
    ),

    sharpness: clamp(
      Number(
        adjustments.sharpness ?? 0
      ),
      0,
      100
    ),
  };
}

function buildVideoFilter(
  adjustments
) {
  const normalized =
    normalizeAdjustments(
      adjustments
    );

  /*
   * UI ranges
   *
   * brightness: -100 → 100
   * contrast:   -100 → 100
   * saturation: -100 → 100
   * sharpness:     0 → 100
   *
   * FFmpeg mappings
   *
   * brightness: -1 → 1
   * contrast:    0 → 2
   * saturation:  0 → 3
   * sharpness:   0 → ~2
   */

  const brightness =
    normalized.brightness / 200;

  const contrast =
    1 +
    normalized.contrast / 100;

  const saturation =
    1 +
    normalized.saturation / 100;

  const sharpness =
    normalized.sharpness / 50;

  const filters = [
    [
      "eq",
      `brightness=${brightness.toFixed(
        3
      )}`,
      `contrast=${contrast.toFixed(
        3
      )}`,
      `saturation=${saturation.toFixed(
        3
      )}`,
    ].join("="),
  ];

  if (
    normalized.sharpness > 0
  ) {
    filters.push(
      `unsharp=5:5:${sharpness.toFixed(
        2
      )}:5:5:0`
    );
  }

  return filters.join(",");
}

function loadVideoMetadata(file) {
  return new Promise(
    (resolve, reject) => {
      const url =
        URL.createObjectURL(file);

      const video =
        document.createElement(
          "video"
        );

      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;

      const cleanup = () => {
        URL.revokeObjectURL(
          url
        );

        video.removeAttribute(
          "src"
        );

        video.load();
      };

      video.onloadedmetadata =
        () => {
          const metadata = {
            width:
              video.videoWidth,
            height:
              video.videoHeight,
            duration:
              Number.isFinite(
                video.duration
              )
                ? video.duration
                : 0,
          };

          cleanup();

          resolve(metadata);
        };

      video.onerror = () => {
        cleanup();

        reject(
          new Error(
            "Unable to read the video metadata."
          )
        );
      };

      video.src = url;
    }
  );
}

export async function getVideoEnhancementInfo(
  file
) {
  if (!(file instanceof File)) {
    throw new Error(
      "Please provide a valid video file."
    );
  }

  if (
    !file.type.startsWith(
      "video/"
    )
  ) {
    throw new Error(
      "The selected file is not a supported video."
    );
  }

  const metadata =
    await loadVideoMetadata(
      file
    );

  return {
    name: file.name,
    size: file.size,
    sizeLabel: formatBytes(
      file.size
    ),
    width: metadata.width,
    height: metadata.height,
    duration:
      metadata.duration,
  };
}

export async function enhanceVideo(
  file,
  {
    adjustments = {},
    onProgress,
  } = {}
) {
  if (!(file instanceof File)) {
    throw new Error(
      "Please provide a valid video file."
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

  const normalized =
    normalizeAdjustments(
      adjustments
    );

  const metadata =
    await loadVideoMetadata(
      file
    );

  const ffmpeg =
    await loadFFmpeg();

  const inputName =
    createInputName(file);

  const outputName =
    "kaizen-enhanced.mp4";

  const progressHandler =
    ({ progress }) => {
      const safeProgress =
        clamp(
          Number(progress) || 0,
          0,
          1
        );

      onProgress?.({
        phase:
          "enhancing",
        progress:
          safeProgress,
      });
    };

  ffmpeg.on(
    "progress",
    progressHandler
  );

  try {
    onProgress?.({
      phase: "loading",
      progress: 0,
    });

    await ffmpeg.writeFile(
      inputName,
      await fetchFile(file)
    );

    const filter =
      buildVideoFilter(
        normalized
      );

    onProgress?.({
      phase:
        "enhancing",
      progress: 0.02,
    });

    const command = [
      "-i",
      inputName,

      "-map",
      "0:v:0",

      "-map",
      "0:a?",

      "-vf",
      filter,

      "-c:v",
      "libx264",

      "-preset",
      "veryfast",

      "-crf",
      "20",

      "-pix_fmt",
      "yuv420p",

      "-c:a",
      "aac",

      "-b:a",
      "160k",

      "-movflags",
      "+faststart",

      "-y",
      outputName,
    ];

    await ffmpeg.exec(
      command
    );

    onProgress?.({
      phase:
        "finalizing",
      progress: 0.98,
    });

    const outputData =
      await ffmpeg.readFile(
        outputName
      );

    const outputBytes =
      outputData instanceof
      Uint8Array
        ? outputData
        : new Uint8Array(
            outputData
          );

    const outputBlob =
      new Blob(
        [outputBytes.buffer],
        {
          type:
            "video/mp4",
        }
      );

    const outputFile =
      new File(
        [outputBlob],
        createOutputName(
          file.name
        ),
        {
          type:
            "video/mp4",
        }
      );

    const savedBytes =
      Math.max(
        file.size -
          outputFile.size,
        0
      );

    const savedPercent =
      file.size > 0
        ? Math.max(
            0,
            (
              savedBytes /
              file.size
            ) *
              100
          )
        : 0;

    onProgress?.({
      phase:
        "complete",
      progress: 1,
    });

    return {
      file: outputFile,

      originalSize:
        file.size,

      enhancedSize:
        outputFile.size,

      originalSizeLabel:
        formatBytes(
          file.size
        ),

      enhancedSizeLabel:
        formatBytes(
          outputFile.size
        ),

      savedBytes,

      savedBytesLabel:
        formatBytes(
          savedBytes
        ),

      savedPercent,

      savedPercentLabel:
        `${savedPercent.toFixed(
          1
        )}%`,

      width:
        metadata.width,

      height:
        metadata.height,

      duration:
        metadata.duration,

      adjustments:
        normalized,
    };
  } finally {
    ffmpeg.off(
      "progress",
      progressHandler
    );

    try {
      await ffmpeg.deleteFile(
        inputName
      );
    } catch {
      // Temporary cleanup failure
      // does not invalidate the result.
    }

    try {
      await ffmpeg.deleteFile(
        outputName
      );
    } catch {
      // Temporary cleanup failure
      // does not invalidate the result.
    }
  }
}

export {
  buildVideoFilter,
  normalizeAdjustments,
};