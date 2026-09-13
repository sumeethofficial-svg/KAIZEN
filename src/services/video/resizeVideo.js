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

function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(max, value)
  );
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

  return `${baseName}-resized.mp4`;
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
  const rounded =
    Math.max(
      2,
      Math.round(value)
    );

  return rounded % 2 === 0
    ? rounded
    : rounded - 1;
}

function calculateFitDimensions(
  sourceWidth,
  sourceHeight,
  targetWidth,
  targetHeight
) {
  if (
    !sourceWidth ||
    !sourceHeight ||
    !targetWidth ||
    !targetHeight
  ) {
    return {
      width: sourceWidth,
      height: sourceHeight,
    };
  }

  const ratio = Math.min(
    targetWidth / sourceWidth,
    targetHeight / sourceHeight
  );

  return {
    width: makeEven(
      sourceWidth * ratio
    ),
    height: makeEven(
      sourceHeight * ratio
    ),
  };
}

function calculateFillCrop(
  sourceWidth,
  sourceHeight,
  targetWidth,
  targetHeight
) {
  if (
    !sourceWidth ||
    !sourceHeight ||
    !targetWidth ||
    !targetHeight
  ) {
    return {
      width: sourceWidth,
      height: sourceHeight,
    };
  }

  const ratio = Math.max(
    targetWidth / sourceWidth,
    targetHeight / sourceHeight
  );

  return {
    width: makeEven(
      sourceWidth * ratio
    ),
    height: makeEven(
      sourceHeight * ratio
    ),
  };
}

function buildResizeFilter({
  sourceWidth,
  sourceHeight,
  targetWidth,
  targetHeight,
  mode,
}) {
  const width = makeEven(
    targetWidth
  );

  const height = makeEven(
    targetHeight
  );

  if (mode === "stretch") {
    return `scale=${width}:${height}`;
  }

  if (mode === "cover") {
    const filled =
      calculateFillCrop(
        sourceWidth,
        sourceHeight,
        width,
        height
      );

    const cropX =
      Math.max(
        0,
        Math.floor(
          (filled.width - width) /
            2
        )
      );

    const cropY =
      Math.max(
        0,
        Math.floor(
          (filled.height - height) /
            2
        )
      );

    return [
      `scale=${filled.width}:${filled.height}`,
      `crop=${width}:${height}:${cropX}:${cropY}`,
    ].join(",");
  }

  /*
   * Default = contain.
   *
   * The video keeps its aspect ratio and
   * gets padded into the requested frame.
   */
  const fitted =
    calculateFitDimensions(
      sourceWidth,
      sourceHeight,
      width,
      height
    );

  return [
    `scale=${fitted.width}:${fitted.height}`,
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
  ].join(",");
}

export async function getVideoResizeInfo(
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

export async function resizeVideo(
  file,
  {
    width,
    height,
    mode = "contain",
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

  const safeWidth = makeEven(
    clamp(
      Number(width),
      2,
      7680
    )
  );

  const safeHeight = makeEven(
    clamp(
      Number(height),
      2,
      4320
    )
  );

  if (
    safeWidth < 2 ||
    safeHeight < 2
  ) {
    throw new Error(
      "Please enter valid video dimensions."
    );
  }

  if (
    ![
      "contain",
      "cover",
      "stretch",
    ].includes(mode)
  ) {
    throw new Error(
      "Invalid resize mode."
    );
  }

  const metadata =
    await loadVideoMetadata(
      file
    );

  const ffmpeg =
    await loadFFmpeg();

  const inputName =
    createInputName(file);

  const outputName =
    "kaizen-resized.mp4";

  const filter =
    buildResizeFilter({
      sourceWidth:
        metadata.width,

      sourceHeight:
        metadata.height,

      targetWidth:
        safeWidth,

      targetHeight:
        safeHeight,

      mode,
    });

  const progressHandler =
    ({ progress }) => {
      const safeProgress =
        clamp(
          Number(progress) || 0,
          0,
          1
        );

      onProgress?.({
        phase: "resizing",
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

    onProgress?.({
      phase: "resizing",
      progress: 0.02,
    });

    await ffmpeg.exec([
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

      outputSize:
        outputFile.size,

      originalSizeLabel:
        formatBytes(
          file.size
        ),

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

      originalWidth:
        metadata.width,

      originalHeight:
        metadata.height,

      outputWidth:
        safeWidth,

      outputHeight:
        safeHeight,

      duration:
        metadata.duration,

      durationLabel:
        formatDuration(
          metadata.duration
        ),

      mode,
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
        outputName
      );
    } catch {
      // Ignore cleanup errors.
    }
  }
}

export {
  buildResizeFilter,
  calculateFitDimensions,
};