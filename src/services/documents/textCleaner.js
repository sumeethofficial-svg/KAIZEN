export function cleanText(
  text = "",
  options = {}
) {
  let result = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  if (options.removeExtraSpaces !== false) {
    result = result.replace(/[ \t]+/g, " ");
  }

  if (options.trimLines !== false) {
    result = result
      .split("\n")
      .map((line) => line.trim())
      .join("\n");
  }

  if (options.removeEmptyLines) {
    result = result
      .split("\n")
      .filter((line) => line.trim() !== "")
      .join("\n");
  } else {
    result = result.replace(/\n{3,}/g, "\n\n");
  }

  if (options.normalizeQuotes) {
    result = result
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'");
  }

  if (options.normalizeDashes) {
    result = result
      .replace(/[–—]/g, "-")
      .replace(/…/g, "...");
  }

  if (options.removeExtraPunctuation) {
    result = result
      .replace(/!{2,}/g, "!")
      .replace(/\?{2,}/g, "?")
      .replace(/,{2,}/g, ",")
      .replace(/\.{4,}/g, "...");
  }

  if (options.removeBlankStartEnd !== false) {
    result = result.trim();
  }

  return result;
}

export function cleanTextDefaults(text) {
  return cleanText(text, {
    removeExtraSpaces: true,
    trimLines: true,
    removeEmptyLines: false,
    normalizeQuotes: true,
    normalizeDashes: true,
    removeExtraPunctuation: true,
    removeBlankStartEnd: true,
  });
}