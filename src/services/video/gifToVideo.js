import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const CORE_BASE_URL =
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";

let ffmpegInstance = null;
let ffmpegLoadingPromise = null;

const getFFmpeg = async () => {
  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg();
  }

  if (ffmpegInstance.loaded) {
    return ffmpegInstance;
  }

  if (!ffmpegLoadingPromise) {
    ffmpegLoadingPromise = (async () => {
      await ffmpegInstance.load({
        coreURL: await toBlobURL(
          `${CORE_BASE_URL}/ffmpeg-core.js`,
          "text/javascript"
        ),
        wasmURL: await toBlobURL(
          `${CORE_BASE_URL}/ffmpeg-core.wasm`,
          "application/wasm"
        ),
        workerURL: await toBlobURL(
          `${CORE_BASE_URL}/ffmpeg-core.worker.js`,
          "text/javascript"
        ),
      });
    })().finally(() => {
      ffmpegLoadingPromise = null;
    });
  }

  await ffmpegLoadingPromise;

  return ffmpegInstance;
};

const OUTPUTS = {
  mp4: {
    extension: "mp4",
    mimeType: "video/mp4",
    codec: "libx264",
    extraArgs: ["-pix_fmt", "yuv420p"],
  },
  webm: {
    extension: "webm",
    mimeType: "video/webm",
    codec: "libvpx-vp9",
    extraArgs: ["-b:v", "0", "-crf", "30"],
  },
  mov: {
    extension: "mov",
    mimeType: "video/quicktime",
    codec: "libx264",
    extraArgs: ["-pix_fmt", "yuv420p"],
  },
};

const sanitizeBaseName = (name) => {
  const withoutExtension = name.replace(/\.[^/.]+$/, "");

  const cleaned = withoutExtension
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  return cleaned || "kaizen-gif-video";
};

export const gifToVideo = async ({
  file,
  format = "mp4",
  fps = 24,
  width = "original",
  onProgress,
  signal,
}) => {
  if (!(file instanceof File)) {
    throw new Error("Please provide a valid GIF file.");
  }

  if (!file.type.includes("gif") && !file.name.toLowerCase().endsWith(".gif")) {
    throw new Error("Only GIF files are supported.");
  }

  const outputConfig = OUTPUTS[format];

  if (!outputConfig) {
    throw new Error("Unsupported output format.");
  }

  const parsedFps = Number(fps);

  if (!Number.isFinite(parsedFps) || parsedFps < 5 || parsedFps > 60) {
    throw new Error("FPS must be between 5 and 60.");
  }

  if (signal?.aborted) {
    throw new DOMException("Conversion cancelled.", "AbortError");
  }

  const ffmpeg = await getFFmpeg();

  if (signal?.aborted) {
    throw new DOMException("Conversion cancelled.", "AbortError");
  }

  const inputName = "input.gif";
  const outputName = `output.${outputConfig.extension}`;

  const inputData = await fetchFile(file);

  await ffmpeg.writeFile(inputName, inputData);

  if (signal?.aborted) {
    throw new DOMException("Conversion cancelled.", "AbortError");
  }

  let progressHandler;

  try {
    progressHandler = ({ progress }) => {
      if (typeof onProgress === "function") {
        const percent = Math.max(
          0,
          Math.min(100, Math.round(progress * 100))
        );

        onProgress(percent);
      }
    };

    ffmpeg.on("progress", progressHandler);

    const args = [
      "-i",
      inputName,
      "-r",
      String(parsedFps),
    ];

    if (width !== "original") {
      const parsedWidth = Number(width);

      if (!Number.isFinite(parsedWidth) || parsedWidth < 64) {
        throw new Error("Invalid output width.");
      }

      args.push(
        "-vf",
        `scale=${parsedWidth}:-2:flags=lanczos`
      );
    }

    args.push(
      "-an",
      "-c:v",
      outputConfig.codec,
      ...outputConfig.extraArgs,
      "-movflags",
      "+faststart",
      outputName
    );

    const exitCode = await ffmpeg.exec(args);

    if (signal?.aborted) {
      throw new DOMException("Conversion cancelled.", "AbortError");
    }

    if (exitCode !== 0) {
      throw new Error("GIF conversion failed.");
    }

    const outputData = await ffmpeg.readFile(outputName);

    const outputBytes =
      outputData instanceof Uint8Array
        ? outputData
        : new Uint8Array(outputData);

    const blob = new Blob([outputBytes], {
      type: outputConfig.mimeType,
    });

    const outputUrl = URL.createObjectURL(blob);

    if (typeof onProgress === "function") {
      onProgress(100);
    }

    return {
      blob,
      url: outputUrl,
      fileName: `${sanitizeBaseName(file.name)}.${outputConfig.extension}`,
      size: blob.size,
      mimeType: outputConfig.mimeType,
      format: outputConfig.extension,
    };
  } finally {
    if (progressHandler) {
      ffmpeg.off("progress", progressHandler);
    }

    try {
      await ffmpeg.deleteFile(inputName);
    } catch {
      // Ignore cleanup failure.
    }

    try {
      await ffmpeg.deleteFile(outputName);
    } catch {
      // Ignore cleanup failure.
    }
  }
};