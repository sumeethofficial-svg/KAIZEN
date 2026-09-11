import { jsPDF } from "jspdf";

function formatBytes(bytes) {
  if (!bytes) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];

  let value = bytes;
  let unitIndex = 0;

  while (
    value >= 1024 &&
    unitIndex < units.length - 1
  ) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "Unknown";
  }

  const totalSeconds = Math.floor(seconds);

  const hours = Math.floor(
    totalSeconds / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const remainingSeconds =
    totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(remainingSeconds).padStart(
      2,
      "0"
    )}`;
  }

  return `${minutes}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

function getAudioExtension(fileName) {
  if (!fileName || !fileName.includes(".")) {
    return "Unknown";
  }

  return (
    fileName
      .split(".")
      .pop()
      ?.toUpperCase() || "Unknown"
  );
}

function getAudioMime(file) {
  return (
    file?.type ||
    "application/octet-stream"
  );
}

async function decodeAudioFile(file) {
  const arrayBuffer =
    await file.arrayBuffer();

  const audioContext =
    new (
      window.AudioContext ||
      window.webkitAudioContext
    )();

  try {
    return await audioContext.decodeAudioData(
      arrayBuffer
    );
  } finally {
    await audioContext.close();
  }
}

function extractWaveform(
  audioBuffer,
  sampleCount = 900
) {
  const channelCount =
    audioBuffer.numberOfChannels;

  const length =
    audioBuffer.length;

  const blockSize = Math.max(
    1,
    Math.floor(length / sampleCount)
  );

  const waveform = new Float32Array(
    Math.min(
      sampleCount,
      Math.ceil(length / blockSize)
    )
  );

  let outputIndex = 0;

  for (
    let start = 0;
    start < length &&
    outputIndex < waveform.length;
    start += blockSize
  ) {
    const end = Math.min(
      start + blockSize,
      length
    );

    let peak = 0;

    for (
      let channel = 0;
      channel < channelCount;
      channel += 1
    ) {
      const channelData =
        audioBuffer.getChannelData(
          channel
        );

      for (
        let index = start;
        index < end;
        index += 1
      ) {
        const absolute =
          Math.abs(channelData[index]);

        if (absolute > peak) {
          peak = absolute;
        }
      }
    }

    waveform[outputIndex] = peak;
    outputIndex += 1;
  }

  return Array.from(
    waveform.slice(0, outputIndex)
  );
}

function drawWaveform(
  pdf,
  waveform,
  {
    x,
    y,
    width,
    height,
    color = "#f97316",
    background = "#f5f5f5",
  }
) {
  pdf.setFillColor(background);

  pdf.roundedRect(
    x,
    y,
    width,
    height,
    8,
    8,
    "F"
  );

  pdf.setDrawColor(color);
  pdf.setLineWidth(1);

  const centerY =
    y + height / 2;

  pdf.setDrawColor("#dddddd");
  pdf.setLineWidth(0.6);

  pdf.line(
    x + 8,
    centerY,
    x + width - 8,
    centerY
  );

  pdf.setDrawColor(color);
  pdf.setLineWidth(1.4);

  const usableWidth =
    width - 16;

  const step =
    waveform.length > 1
      ? usableWidth /
        (waveform.length - 1)
      : usableWidth;

  for (
    let index = 0;
    index < waveform.length;
    index += 1
  ) {
    const amplitude =
      Math.max(
        0.02,
        Math.min(
          1,
          waveform[index]
        )
      );

    const barHeight =
      amplitude *
      (height * 0.42);

    const pointX =
      x +
      8 +
      index * step;

    pdf.line(
      pointX,
      centerY - barHeight,
      pointX,
      centerY + barHeight
    );
  }
}

function drawSectionHeader(
  pdf,
  title,
  x,
  y,
  width
) {
  pdf.setFillColor("#161616");

  pdf.roundedRect(
    x,
    y,
    width,
    27,
    6,
    6,
    "F"
  );

  pdf.setFont(
    "helvetica",
    "bold"
  );

  pdf.setFontSize(10);

  pdf.setTextColor("#ffffff");

  pdf.text(
    title,
    x + 10,
    y + 17
  );
}

function drawMetadataRow(
  pdf,
  label,
  value,
  x,
  y,
  labelWidth,
  valueWidth
) {
  pdf.setFont(
    "helvetica",
    "bold"
  );

  pdf.setFontSize(9);

  pdf.setTextColor("#555555");

  pdf.text(
    label,
    x,
    y
  );

  pdf.setFont(
    "helvetica",
    "normal"
  );

  pdf.setTextColor("#1d1d1d");

  const lines =
    pdf.splitTextToSize(
      String(value || "Unknown"),
      valueWidth
    );

  pdf.text(
    lines,
    x + labelWidth,
    y
  );

  return (
    lines.length * 12
  );
}

export async function getAudioInfo(file) {
  if (!(file instanceof File)) {
    throw new Error(
      "Please provide a valid audio file."
    );
  }

  const audioBuffer =
    await decodeAudioFile(file);

  return {
    fileName: file.name,
    mimeType: getAudioMime(file),
    format: getAudioExtension(
      file.name
    ),
    fileSize: file.size,
    duration: audioBuffer.duration,
    sampleRate:
      audioBuffer.sampleRate,
    channelCount:
      audioBuffer.numberOfChannels,
    channelLabel:
      audioBuffer.numberOfChannels ===
      1
        ? "Mono"
        : audioBuffer.numberOfChannels ===
          2
        ? "Stereo"
        : `${audioBuffer.numberOfChannels} channels`,
    waveform: extractWaveform(
      audioBuffer
    ),
  };
}

export async function audioToPdf(
  file,
  {
    fileName = "audio-report.pdf",
    title = "Audio Report",
    pageSize = "a4",
    orientation = "portrait",
    margin = 34,
    accentColor = "#f97316",
    includeMetadata = true,
    includeWaveform = true,
    showTechnicalDetails = true,
    onProgress,
  } = {}
) {
  if (!(file instanceof File)) {
    throw new Error(
      "Please select an audio file."
    );
  }

  onProgress?.({
    stage: "reading",
    progress: 8,
    message: "Reading audio file...",
  });

  const info =
    await getAudioInfo(file);

  onProgress?.({
    stage: "analyzing",
    progress: 28,
    message: "Analyzing audio...",
  });

  const pdf =
    new jsPDF({
      orientation,
      unit: "pt",
      format: pageSize,
      compress: true,
    });

  const pageWidth =
    pdf.internal.pageSize.getWidth();

  const pageHeight =
    pdf.internal.pageSize.getHeight();

  const safeMargin = Math.max(
    24,
    Number(margin) || 34
  );

  const contentWidth =
    pageWidth -
    safeMargin * 2;

  /*
   * Header
   */
  pdf.setFillColor("#111111");

  pdf.roundedRect(
    safeMargin,
    safeMargin,
    contentWidth,
    82,
    12,
    12,
    "F"
  );

  pdf.setFont(
    "helvetica",
    "bold"
  );

  pdf.setFontSize(22);

  pdf.setTextColor("#ffffff");

  pdf.text(
    title || "Audio Report",
    safeMargin + 18,
    safeMargin + 31
  );

  pdf.setFont(
    "helvetica",
    "normal"
  );

  pdf.setFontSize(10);

  pdf.setTextColor("#bbbbbb");

  const fileNameLines =
    pdf.splitTextToSize(
      info.fileName,
      contentWidth - 36
    );

  pdf.text(
    fileNameLines,
    safeMargin + 18,
    safeMargin + 51
  );

  pdf.setFillColor(
    accentColor
  );

  pdf.roundedRect(
    safeMargin + 18,
    safeMargin + 65,
    65,
    4,
    2,
    2,
    "F"
  );

  let cursorY =
    safeMargin + 108;

  /*
   * Summary cards
   */
  const cardGap = 10;

  const cardWidth =
    (contentWidth -
      cardGap * 3) /
    4;

  const cards = [
    {
      label: "Duration",
      value: formatDuration(
        info.duration
      ),
    },
    {
      label: "Format",
      value: info.format,
    },
    {
      label: "Size",
      value: formatBytes(
        info.fileSize
      ),
    },
    {
      label: "Channels",
      value: info.channelLabel,
    },
  ];

  cards.forEach(
    (card, index) => {
      const x =
        safeMargin +
        index *
          (cardWidth + cardGap);

      pdf.setFillColor("#f6f6f6");

      pdf.roundedRect(
        x,
        cursorY,
        cardWidth,
        58,
        9,
        9,
        "F"
      );

      pdf.setFont(
        "helvetica",
        "normal"
      );

      pdf.setFontSize(8);

      pdf.setTextColor("#777777");

      pdf.text(
        card.label.toUpperCase(),
        x + 10,
        cursorY + 17
      );

      pdf.setFont(
        "helvetica",
        "bold"
      );

      pdf.setFontSize(12);

      pdf.setTextColor("#171717");

      pdf.text(
        String(card.value),
        x + 10,
        cursorY + 38
      );
    }
  );

  cursorY += 82;

  /*
   * Waveform
   */
  if (includeWaveform) {
    drawSectionHeader(
      pdf,
      "WAVEFORM",
      safeMargin,
      cursorY,
      contentWidth
    );

    cursorY += 38;

    drawWaveform(
      pdf,
      info.waveform,
      {
        x: safeMargin,
        y: cursorY,
        width: contentWidth,
        height: 145,
        color: accentColor,
        background: "#f7f7f7",
      }
    );

    cursorY += 170;

    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.setFontSize(8);

    pdf.setTextColor("#888888");

    pdf.text(
      "Amplitude overview",
      safeMargin,
      cursorY
    );

    cursorY += 28;
  }

  /*
   * Metadata
   */
  if (includeMetadata) {
    drawSectionHeader(
      pdf,
      "AUDIO INFORMATION",
      safeMargin,
      cursorY,
      contentWidth
    );

    cursorY += 42;

    const labelWidth = 95;

    const valueWidth =
      contentWidth -
      labelWidth;

    const rows = [
      ["File Name", info.fileName],
      ["File Type", info.mimeType],
      ["Format", info.format],
      [
        "Duration",
        formatDuration(
          info.duration
        ),
      ],
      [
        "File Size",
        formatBytes(
          info.fileSize
        ),
      ],
      [
        "Sample Rate",
        `${info.sampleRate.toLocaleString()} Hz`,
      ],
      [
        "Channels",
        info.channelLabel,
      ],
    ];

    rows.forEach(
      ([label, value]) => {
        const usedHeight =
          drawMetadataRow(
            pdf,
            label,
            value,
            safeMargin,
            cursorY,
            labelWidth,
            valueWidth
          );

        cursorY +=
          Math.max(
            usedHeight,
            18
          );

        pdf.setDrawColor(
          "#eeeeee"
        );

        pdf.setLineWidth(
          0.5
        );

        pdf.line(
          safeMargin,
          cursorY - 6,
          safeMargin +
            contentWidth,
          cursorY - 6
        );
      }
    );

    cursorY += 12;
  }

  /*
   * Technical details
   */
  if (showTechnicalDetails) {
    if (
      cursorY >
      pageHeight - 130
    ) {
      pdf.addPage();
      cursorY = safeMargin;
    }

    drawSectionHeader(
      pdf,
      "TECHNICAL DETAILS",
      safeMargin,
      cursorY,
      contentWidth
    );

    cursorY += 40;

    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.setFontSize(9);

    pdf.setTextColor("#555555");

    const technicalText = [
      `Sample rate: ${info.sampleRate.toLocaleString()} Hz`,
      `Channels: ${info.numberOfChannels || info.channelLabel}`,
      `Channel layout: ${info.channelLabel}`,
      `Duration: ${formatDuration(info.duration)}`,
      `File type: ${info.mimeType}`,
    ].join("\n");

    pdf.text(
      technicalText,
      safeMargin,
      cursorY
    );
  }

  /*
   * Footer
   */
  const pageCount =
    pdf.internal.getNumberOfPages();

  for (
    let page = 1;
    page <= pageCount;
    page += 1
  ) {
    pdf.setPage(page);

    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.setFontSize(7);

    pdf.setTextColor("#999999");

    pdf.text(
      "Generated locally with KAIZEN",
      safeMargin,
      pageHeight - 18
    );

    pdf.text(
      `Page ${page} of ${pageCount}`,
      pageWidth - safeMargin,
      pageHeight - 18,
      {
        align: "right",
      }
    );
  }

  onProgress?.({
    stage: "finalizing",
    progress: 94,
    message: "Finalizing PDF...",
  });

  const outputName =
    fileName
      .toLowerCase()
      .endsWith(".pdf")
      ? fileName
      : `${fileName}.pdf`;

  const blob =
    pdf.output("blob");

  onProgress?.({
    stage: "complete",
    progress: 100,
    message: "PDF ready.",
  });

  return {
    blob,
    fileName: outputName,
    pageCount: pageCount,
    byteSize: blob.size,
    audioInfo: info,
  };
}