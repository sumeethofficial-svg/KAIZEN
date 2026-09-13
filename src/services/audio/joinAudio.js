import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const CORE_BASE_URL =
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";

let ffmpegInstance = null;
let ffmpegLoadingPromise = null;

const OUTPUTS = {
  mp3: {
    extension: "mp3",
    mimeType: "audio/mpeg",
    codec: "libmp3lame",
    args: ["-b:a", "192k"],
  },

  m4a: {
    extension: "m4a",
    mimeType: "audio/mp4",
    codec: "aac",
    args: ["-b:a", "192k"],
  },

  wav: {
    extension: "wav",
    mimeType: "audio/wav",
    codec: "pcm_s16le",
    args: [],
  },

  ogg: {
    extension: "ogg",
    mimeType: "audio/ogg",
    codec: "libvorbis",
    args: ["-q:a", "5"],
  },
};

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

const sanitizeName = (name) => {
  const withoutExtension = name.replace(
    /\.[^/.]+$/,
    ""
  );

  const cleaned = withoutExtension
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  return cleaned || "audio";
};

export const joinAudio = async ({
  files,
  format = "mp3",
  onProgress,
  signal,
}) => {
  if (!Array.isArray(files) || files.length < 2) {
    throw new Error(
      "Please provide at least two audio files."
    );
  }

  if (files.some((file) => !(file instanceof File))) {
    throw new Error(
      "One or more selected files are invalid."
    );
  }

  if (files.some((file) => file.size <= 0)) {
    throw new Error(
      "One or more selected audio files are empty."
    );
  }

  const outputConfig = OUTPUTS[format];

  if (!outputConfig) {
    throw new Error(
      "Unsupported output format."
    );
  }

  if (signal?.aborted) {
    throw new DOMException(
      "Joining cancelled.",
      "AbortError"
    );
  }

  const ffmpeg = await getFFmpeg();

  if (signal?.aborted) {
    throw new DOMException(
      "Joining cancelled.",
      "AbortError"
    );
  }

  const inputNames = files.map(
    (_, index) => `input-${index}`
  );

  const outputName =
    `joined.${outputConfig.extension}`;

  try {
    for (let index = 0; index < files.length; index += 1) {
      if (signal?.aborted) {
        throw new DOMException(
          "Joining cancelled.",
          "AbortError"
        );
      }

      const inputData = await fetchFile(
        files[index]
      );

      await ffmpeg.writeFile(
        inputNames[index],
        inputData
      );

      onProgress?.(
        Math.round(
          ((index + 1) / files.length) * 12
        )
      );
    }

    const inputs = [];

    for (let index = 0; index < files.length; index += 1) {
      inputs.push(
        "-i",
        inputNames[index]
      );
    }

    const concatInputs = files
      .map(
        (_, index) =>
          `[${index}:a:0]`
      )
      .join("");

    const concatFilter =
      `${concatInputs}concat=n=${files.length}:v=0:a=1[outa]`;

    const args = [
      ...inputs,
      "-filter_complex",
      concatFilter,
      "-map",
      "[outa]",
      "-vn",
      "-c:a",
      outputConfig.codec,
      ...outputConfig.args,
      "-y",
      outputName,
    ];

    const progressHandler = ({
      progress,
    }) => {
      const percent = Math.max(
        0,
        Math.min(
          100,
          Math.round(
            12 + progress * 88
          )
        )
      );

      onProgress?.(percent);
    };

    ffmpeg.on(
      "progress",
      progressHandler
    );

    try {
      const exitCode =
        await ffmpeg.exec(args);

      if (signal?.aborted) {
        throw new DOMException(
          "Joining cancelled.",
          "AbortError"
        );
      }

      if (exitCode !== 0) {
        throw new Error(
          "Audio joining failed."
        );
      }
    } finally {
      ffmpeg.off(
        "progress",
        progressHandler
      );
    }

    const outputData =
      await ffmpeg.readFile(
        outputName
      );

    const outputBytes =
      outputData instanceof Uint8Array
        ? outputData
        : new Uint8Array(
            outputData
          );

    const blob = new Blob(
      [outputBytes],
      {
        type:
          outputConfig.mimeType,
      }
    );

    const url =
      URL.createObjectURL(blob);

    const baseName =
      sanitizeName(files[0].name);

    onProgress?.(100);

    return {
      blob,
      url,
      fileName: `${baseName}-joined.${outputConfig.extension}`,
      size: blob.size,
      mimeType:
        outputConfig.mimeType,
      format:
        outputConfig.extension,
      inputCount: files.length,
    };
  } finally {
    for (const inputName of inputNames) {
      try {
        await ffmpeg.deleteFile(
          inputName
        );
      } catch {
        // Ignore cleanup failure.
      }
    }

    try {
      await ffmpeg.deleteFile(
        outputName
      );
    } catch {
      // Ignore cleanup failure.
    }
  }
};