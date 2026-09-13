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

export const GIF_FPS_OPTIONS = [
  {
    value: 8,
    label: "8 FPS",
  },
  {
    value: 10,
    label: "10 FPS",
  },
  {
    value: 12,
    label: "12 FPS",
  },
  {
    value: 15,
    label: "15 FPS",
  },
  {
    value: 20,
    label: "20 FPS",
  },
];

export const GIF_SIZE_OPTIONS = [
  {
    value: 360,
    label: "360p",
    width: 640,
  },
  {
    value: 480,
    label: "480p",
    width: 854,
  },
  {
    value: 720,
    label: "720p",
    width: 1280,
  },
];

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

function getExtension(fileName) {
  const match =
    fileName.match(
      /\.([a-z0-9]+)$/i
    );

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

  return `${baseName}.gif`;
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

  if (
    bytes <
    1024 * 1024
  ) {
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

function formatDuration(seconds) {
  if (
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return "0:00";
  }

  const total =
    Math.round(seconds);

  const hours =
    Math.floor(
      total / 3600
    );

  const minutes =
    Math.floor(
      (total % 3600) / 60
    );

  const remaining =
    total % 60;

  if (hours > 0) {
    return `${hours}:${String(
      minutes
    ).padStart(2, "0")}:${String(
      remaining
    ).padStart(2, "0")}`;
  }

  return `${minutes}:${String(
    remaining
  ).padStart(2, "0")}`;
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
        URL.revokeObjectURL(url);

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

function makeEven(value) {
  const number =
    Math.max(
      2,
      Math.round(
        Number(value) || 2
      )
    );

  return number % 2 === 0
    ? number
    : number - 1;
}

function calculateOutputDimensions(
  sourceWidth,
  sourceHeight,
  targetWidth
) {
  if (
    !sourceWidth ||
    !sourceHeight ||
    !targetWidth
  ) {
    return {
      width: targetWidth,
      height: targetWidth,
    };
  }

  const ratio =
    targetWidth /
    sourceWidth;

  return {
    width: makeEven(
      targetWidth
    ),

    height: makeEven(
      sourceHeight * ratio
    ),
  };
}

export async function getVideoToGifInfo(
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
    sizeLabel:
      formatBytes(file.size),

    width:
      metadata.width,

    height:
      metadata.height,

    duration:
      metadata.duration,

    durationLabel:
      formatDuration(
        metadata.duration
      ),
  };
}

export async function convertVideoToGif(
  file,
  {
    fps = 12,
    width = 640,
    startTime = 0,
    endTime = null,
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

  const safeFps =
    clamp(
      Number(fps),
      1,
      30
    );

  const safeWidth =
    makeEven(
      clamp(
        Number(width),
        160,
        1920
      )
    );

  const metadata =
    await loadVideoMetadata(
      file
    );

  const safeStart =
    clamp(
      Number(startTime) || 0,
      0,
      Math.max(
        0,
        metadata.duration -
          0.1
      )
    );

  const requestedEnd =
    endTime === null ||
    endTime === undefined
      ? metadata.duration
      : Number(endTime);

  const safeEnd =
    clamp(
      requestedEnd,
      safeStart + 0.1,
      metadata.duration
    );

  const duration =
    Math.max(
      0.1,
      safeEnd - safeStart
    );

  /*
   * GIFs become very large very quickly.
   * Keep conversion client-side but protect
   * against accidentally processing an
   * enormous section.
   */
  if (duration > 120) {
    throw new Error(
      "GIF conversion is limited to 120 seconds per export. Please select a shorter section."
    );
  }

  const outputDimensions =
    calculateOutputDimensions(
      metadata.width,
      metadata.height,
      safeWidth
    );

  const ffmpeg =
    await loadFFmpeg();

  const inputName =
    createInputName(file);

  const outputName =
    "kaizen-video.gif";

  const paletteName =
    "kaizen-palette.png";

  const inputRange = [
    "-ss",
    safeStart.toFixed(3),

    "-t",
    duration.toFixed(3),
  ];

  const filterBase =
    `fps=${safeFps},scale=${outputDimensions.width}:${outputDimensions.height}:flags=lanczos`;

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
          "converting",
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

    /*
     * First pass:
     * generate an optimized palette.
     */
    onProgress?.({
      phase:
        "palette",
      progress: 0.05,
    });

    await ffmpeg.exec([
      "-ss",
      safeStart.toFixed(3),

      "-t",
      duration.toFixed(3),

      "-i",
      inputName,

      "-vf",
      `${filterBase},palettegen=stats_mode=diff`,

      "-frames:v",
      "1",

      "-y",
      paletteName,
    ]);

    /*
     * Second pass:
     * use the generated palette to create
     * a much cleaner GIF than direct RGB
     * conversion.
     */
    onProgress?.({
      phase:
        "converting",
      progress: 0.15,
    });

    await ffmpeg.exec([
      ...inputRange,

      "-i",
      inputName,

      "-i",
      paletteName,

      "-lavfi",
      `${filterBase} [x]; [x][1:v] paletteuse=dither=sierra2_4a`,

      "-loop",
      "0",

      "-y",
      outputName,
    ]);

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
            "image/gif",
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
            "image/gif",
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

      outputSize:
        outputFile.size,

      originalSizeLabel:
        formatBytes(file.size),

      outputSizeLabel:
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
        outputDimensions.width,

      height:
        outputDimensions.height,

      fps:
        safeFps,

      startTime:
        safeStart,

      endTime:
        safeEnd,

      duration,

      durationLabel:
        formatDuration(
          duration
        ),

      sourceDuration:
        metadata.duration,

      sourceDurationLabel:
        formatDuration(
          metadata.duration
        ),
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
      // Ignore cleanup errors.
    }

    try {
      await ffmpeg.deleteFile(
        paletteName
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
  }
}