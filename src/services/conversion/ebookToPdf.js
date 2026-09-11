import JSZip from "jszip";
import DOMPurify from "dompurify";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

function normalizePath(path) {
  const parts = path.split("/");
  const output = [];

  for (const part of parts) {
    if (!part || part === ".") {
      continue;
    }

    if (part === "..") {
      output.pop();
    } else {
      output.push(part);
    }
  }

  return output.join("/");
}

function getDirectory(path) {
  const index = path.lastIndexOf("/");

  if (index === -1) {
    return "";
  }

  return path.slice(0, index);
}

function resolvePath(basePath, relativePath) {
  const cleanRelative = relativePath
    .replace(/^\/+/, "")
    .split("#")[0];

  return normalizePath(
    `${getDirectory(basePath)}/${cleanRelative}`
  );
}

function getAttribute(element, attribute) {
  return element?.getAttribute(attribute) || "";
}

function getXmlDocument(text) {
  return new DOMParser().parseFromString(
    text,
    "application/xml"
  );
}

function getHtmlDocument(text) {
  return new DOMParser().parseFromString(
    text,
    "text/html"
  );
}

function getMimeType(path) {
  const extension =
    path
      .split(".")
      .pop()
      ?.toLowerCase();

  const types = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    avif: "image/avif",
    css: "text/css",
    xhtml: "application/xhtml+xml",
    html: "text/html",
    htm: "text/html",
    xml: "application/xml",
  };

  return (
    types[extension] ||
    "application/octet-stream"
  );
}

function uint8ArrayToBlob(
  data,
  type
) {
  return new Blob([data], {
    type,
  });
}

function createResourceUrl(
  data,
  type
) {
  return URL.createObjectURL(
    uint8ArrayToBlob(data, type)
  );
}

async function readTextFile(
  zip,
  path
) {
  const entry = zip.file(path);

  if (!entry) {
    throw new Error(
      `Missing EPUB resource: ${path}`
    );
  }

  return entry.async("text");
}

async function readBinaryFile(
  zip,
  path
) {
  const entry = zip.file(path);

  if (!entry) {
    return null;
  }

  return entry.async("uint8array");
}

async function readContainer(
  zip
) {
  const text =
    await readTextFile(
      zip,
      "META-INF/container.xml"
    );

  const document =
    getXmlDocument(text);

  const rootfile =
    document.querySelector(
      "rootfile"
    );

  if (!rootfile) {
    throw new Error(
      "This EPUB does not contain a valid rootfile."
    );
  }

  const fullPath =
    getAttribute(
      rootfile,
      "full-path"
    );

  if (!fullPath) {
    throw new Error(
      "Unable to locate the EPUB package document."
    );
  }

  return normalizePath(
    fullPath
  );
}

function findManifestItems(
  document
) {
  const manifest =
    new Map();

  document
    .querySelectorAll(
      "manifest > item"
    )
    .forEach((item) => {
      const id =
        getAttribute(
          item,
          "id"
        );

      const href =
        getAttribute(
          item,
          "href"
        );

      const mediaType =
        getAttribute(
          item,
          "media-type"
        );

      const properties =
        getAttribute(
          item,
          "properties"
        );

      if (id && href) {
        manifest.set(id, {
          id,
          href,
          mediaType,
          properties,
        });
      }
    });

  return manifest;
}

function findSpineItems(
  document,
  manifest
) {
  const spine = [];

  document
    .querySelectorAll(
      "spine > itemref"
    )
    .forEach((itemref) => {
      const idref =
        getAttribute(
          itemref,
          "idref"
        );

      if (!idref) {
        return;
      }

      const item =
        manifest.get(idref);

      if (!item) {
        return;
      }

      const linear =
        getAttribute(
          itemref,
          "linear"
        );

      if (
        linear &&
        linear.toLowerCase() ===
          "no"
      ) {
        return;
      }

      spine.push(item);
    });

  return spine;
}

function extractMetadata(
  document
) {
  const title =
    document.querySelector(
      "metadata > dc\\:title, metadata > title"
    )?.textContent?.trim();

  const creator =
    document.querySelector(
      "metadata > dc\\:creator, metadata > creator"
    )?.textContent?.trim();

  const language =
    document.querySelector(
      "metadata > dc\\:language, metadata > language"
    )?.textContent?.trim();

  const identifier =
    document.querySelector(
      "metadata > dc\\:identifier, metadata > identifier"
    )?.textContent?.trim();

  return {
    title:
      title || "Untitled eBook",
    creator:
      creator || "",
    language:
      language || "",
    identifier:
      identifier || "",
  };
}

async function buildResourceMap(
  zip
) {
  const resourceMap = new Map();
  const objectUrls = [];

  for (const entry of Object.values(
    zip.files
  )) {
    if (entry.dir) {
      continue;
    }

    const path =
      normalizePath(
        entry.name
      );

    const binary =
      await entry.async(
        "uint8array"
      );

    const mime =
      getMimeType(path);

    const url =
      createResourceUrl(
        binary,
        mime
      );

    resourceMap.set(
      path,
      url
    );

    objectUrls.push(url);
  }

  return {
    resourceMap,
    objectUrls,
  };
}

function sanitizeStylesheet(
  cssText,
  chapterPath,
  resourceMap
) {
  return cssText.replace(
    /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi,
    (match, quote, rawPath) => {
      const cleanPath =
        resolvePath(
          chapterPath,
          rawPath
        );

      const resourceUrl =
        resourceMap.get(
          cleanPath
        );

      if (!resourceUrl) {
        return "url()";
      }

      return `url("${resourceUrl}")`;
    }
  );
}

async function extractChapter(
  zip,
  chapterPath,
  resourceMap
) {
  const chapterText =
    await readTextFile(
      zip,
      chapterPath
    );

  const document =
    getHtmlDocument(
      chapterText
    );

  /*
   * Remove scripts and unsupported
   * interactive content.
   */
  document
    .querySelectorAll(
      "script, iframe, object, embed, video, audio, form"
    )
    .forEach((element) =>
      element.remove()
    );

  /*
   * Rewrite linked images.
   */
  document
    .querySelectorAll(
      "img"
    )
    .forEach((image) => {
      const src =
        image.getAttribute(
          "src"
        );

      if (!src) {
        return;
      }

      const resolved =
        resolvePath(
          chapterPath,
          src
        );

      const resourceUrl =
        resourceMap.get(
          resolved
        );

      if (resourceUrl) {
        image.setAttribute(
          "src",
          resourceUrl
        );
      } else {
        image.removeAttribute(
          "src"
        );
      }
    });

  /*
   * Rewrite image sources used by
   * SVG / xlink.
   */
  document
    .querySelectorAll(
      "[xlink\\:href], [href]"
    )
    .forEach((element) => {
      const tagName =
        element.tagName.toLowerCase();

      if (
        tagName !== "image" &&
        tagName !== "use"
      ) {
        return;
      }

      const attribute =
        element.hasAttribute(
          "xlink:href"
        )
          ? "xlink:href"
          : "href";

      const value =
        element.getAttribute(
          attribute
        );

      if (!value) {
        return;
      }

      const resolved =
        resolvePath(
          chapterPath,
          value
        );

      const resourceUrl =
        resourceMap.get(
          resolved
        );

      if (resourceUrl) {
        element.setAttribute(
          attribute,
          resourceUrl
        );
      }
    });

  /*
   * Collect chapter-local styles.
   */
  const styleBlocks = [];

  document
    .querySelectorAll(
      "style"
    )
    .forEach((style) => {
      if (style.textContent) {
        styleBlocks.push(
          style.textContent
        );
      }
    });

  /*
   * Load linked CSS files.
   */
  const linkedStyles =
    Array.from(
      document.querySelectorAll(
        'link[rel~="stylesheet"]'
      )
    );

  for (const link of linkedStyles) {
    const href =
      link.getAttribute(
        "href"
      );

    if (!href) {
      continue;
    }

    const cssPath =
      resolvePath(
        chapterPath,
        href
      );

    const cssEntry =
      zip.file(cssPath);

    if (!cssEntry) {
      continue;
    }

    const cssText =
      await cssEntry.async(
        "text"
      );

    styleBlocks.push(
      sanitizeStylesheet(
        cssText,
        cssPath,
        resourceMap
      )
    );
  }

  const body =
    document.body;

  if (!body) {
    return {
      html: "",
      styles: styleBlocks.join("\n"),
    };
  }

  /*
   * Sanitize body HTML.
   */
  const safeHtml =
    DOMPurify.sanitize(
      body.innerHTML,
      {
        USE_PROFILES: {
          html: true,
        },
        ADD_ATTR: [
          "epub:type",
        ],
      }
    );

  return {
    html: safeHtml,
    styles: styleBlocks.join(
      "\n"
    ),
  };
}

function escapeHtml(
  value
) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function parseEpub(
  file
) {
  const arrayBuffer =
    await file.arrayBuffer();

  const zip =
    await JSZip.loadAsync(
      arrayBuffer
    );

  const packagePath =
    await readContainer(
      zip
    );

  const packageText =
    await readTextFile(
      zip,
      packagePath
    );

  const packageDocument =
    getXmlDocument(
      packageText
    );

  const metadata =
    extractMetadata(
      packageDocument
    );

  const manifest =
    findManifestItems(
      packageDocument
    );

  const spine =
    findSpineItems(
      packageDocument,
      manifest
    );

  if (!spine.length) {
    throw new Error(
      "The EPUB contains no readable chapters."
    );
  }

  const {
    resourceMap,
    objectUrls,
  } = await buildResourceMap(
    zip
  );

  const chapters = [];

  try {
    for (
      let index = 0;
      index < spine.length;
      index += 1
    ) {
      const item =
        spine[index];

      const chapterPath =
        normalizePath(
          resolvePath(
            packagePath,
            item.href
          )
        );

      const chapter =
        await extractChapter(
          zip,
          chapterPath,
          resourceMap
        );

      chapters.push({
        index,
        path: chapterPath,
        title:
          `Chapter ${index + 1}`,
        ...chapter,
      });
    }
  } catch (error) {
    objectUrls.forEach(
      (url) =>
        URL.revokeObjectURL(
          url
        )
    );

    throw error;
  }

  return {
    metadata,
    chapters,
    objectUrls,
  };
}

function waitForImages(
  container
) {
  const images =
    Array.from(
      container.querySelectorAll(
        "img"
      )
    );

  if (!images.length) {
    return Promise.resolve();
  }

  return Promise.all(
    images.map(
      (image) =>
        new Promise(
          (resolve) => {
            if (
              image.complete
            ) {
              resolve();
              return;
            }

            image.addEventListener(
              "load",
              resolve,
              {
                once: true,
              }
            );

            image.addEventListener(
              "error",
              resolve,
              {
                once: true,
              }
            );
          }
        )
    )
  );
}

function createRenderContainer(
  epub,
  {
    renderWidth,
    backgroundColor,
    textColor,
    fontFamily,
    fontSize,
    lineHeight,
  }
) {
  const container =
    document.createElement(
      "div"
    );

  container.setAttribute(
    "data-kaizen-ebook-render",
    "true"
  );

  container.style.position =
    "fixed";

  container.style.left =
    "-100000px";

  container.style.top = "0";

  container.style.width =
    `${renderWidth}px`;

  container.style.boxSizing =
    "border-box";

  container.style.padding =
    "0";

  container.style.background =
    backgroundColor;

  container.style.color =
    textColor;

  container.style.fontFamily =
    fontFamily;

  container.style.fontSize =
    `${fontSize}px`;

  container.style.lineHeight =
    String(lineHeight);

  container.style.wordBreak =
    "break-word";

  container.style.overflow =
    "visible";

  container.style.zIndex =
    "-1";

  const chaptersHtml =
    epub.chapters
      .map(
        (chapter) => `
          <article
            class="kaizen-ebook-chapter"
            data-chapter-index="${chapter.index}"
          >
            ${chapter.html}
          </article>
        `
      )
      .join("");

  container.innerHTML = `
    <style>
      [data-kaizen-ebook-render],
      [data-kaizen-ebook-render] * {
        box-sizing: border-box;
      }

      [data-kaizen-ebook-render] {
        color: ${textColor};
        background: ${backgroundColor};
      }

      [data-kaizen-ebook-render] .kaizen-ebook-chapter {
        width: 100%;
        margin: 0;
        padding: 0 0 42px;
      }

      [data-kaizen-ebook-render]
        .kaizen-ebook-chapter:not(:first-child) {
        page-break-before: always;
        break-before: page;
      }

      [data-kaizen-ebook-render] h1,
      [data-kaizen-ebook-render] h2,
      [data-kaizen-ebook-render] h3,
      [data-kaizen-ebook-render] h4,
      [data-kaizen-ebook-render] h5,
      [data-kaizen-ebook-render] h6 {
        color: ${textColor};
        line-height: 1.22;
        margin-top: 0;
        margin-bottom: .65em;
        page-break-after: avoid;
        break-after: avoid;
      }

      [data-kaizen-ebook-render] p {
        margin-top: 0;
        margin-bottom: .9em;
      }

      [data-kaizen-ebook-render]
        ul,
      [data-kaizen-ebook-render]
        ol {
        margin-top: 0;
        margin-bottom: 1em;
        padding-left: 1.6em;
      }

      [data-kaizen-ebook-render] li {
        margin-bottom: .3em;
      }

      [data-kaizen-ebook-render] img,
      [data-kaizen-ebook-render] svg {
        max-width: 100%;
        height: auto;
      }

      [data-kaizen-ebook-render] table {
        width: 100%;
        border-collapse: collapse;
        margin: 1em 0;
      }

      [data-kaizen-ebook-render]
        th,
      [data-kaizen-ebook-render]
        td {
        border: 1px solid #d4d4d4;
        padding: .5em .65em;
        vertical-align: top;
      }

      [data-kaizen-ebook-render] th {
        background: #eeeeee;
      }

      [data-kaizen-ebook-render] blockquote {
        margin: 1em 0;
        padding: .8em 1em;
        border-left: 4px solid #f97316;
        background: #f7f7f7;
      }

      [data-kaizen-ebook-render] pre {
        padding: 1em;
        background: #1d1d1d;
        color: #f4f4f4;
        white-space: pre-wrap;
        word-break: break-word;
        border-radius: 7px;
      }

      [data-kaizen-ebook-render] code {
        font-family:
          "Courier New",
          monospace;
      }

      [data-kaizen-ebook-render] hr {
        border: 0;
        border-top: 1px solid #dddddd;
        margin: 1.5em 0;
      }

      [data-kaizen-ebook-render] a {
        color: #c2410c;
      }

      [data-kaizen-ebook-render] figure {
        margin: 1.2em 0;
      }

      [data-kaizen-ebook-render]
        figcaption {
        text-align: center;
        color: #666666;
        font-size: .9em;
      }

      ${epub.chapters
        .map(
          (chapter) =>
            chapter.styles
        )
        .join("\n")}
    </style>

    <main
      class="kaizen-ebook-content"
    >
      ${chaptersHtml}
    </main>
  `;

  document.body.appendChild(
    container
  );

  return container;
}

function splitCanvasToPdf(
  pdf,
  canvas,
  {
    margin,
    onProgress,
  }
) {
  const pageWidth =
    pdf.internal.pageSize.getWidth();

  const pageHeight =
    pdf.internal.pageSize.getHeight();

  const contentWidth =
    pageWidth -
    margin * 2;

  const contentHeight =
    pageHeight -
    margin * 2;

  const renderedHeight =
    (canvas.height *
      contentWidth) /
    canvas.width;

  let remainingHeight =
    renderedHeight;

  let sourceY = 0;

  let pageIndex = 0;

  while (
    remainingHeight > 0.5
  ) {
    if (pageIndex > 0) {
      pdf.addPage();
    }

    const visibleHeight =
      Math.min(
        contentHeight,
        remainingHeight
      );

    const sourceRatio =
      sourceY / renderedHeight;

    pdf.addImage(
      canvas.toDataURL(
        "image/jpeg",
        0.94
      ),
      "JPEG",
      margin,
      margin -
        sourceRatio *
          renderedHeight,
      contentWidth,
      renderedHeight
    );

    remainingHeight -=
      visibleHeight;

    sourceY +=
      visibleHeight;

    pageIndex += 1;

    const completed =
      Math.min(
        1,
        sourceY /
          renderedHeight
      );

    onProgress?.(
      58 +
        Math.round(
          completed * 34
        )
    );
  }

  return pageIndex;
}

export async function getEbookInfo(
  file
) {
  if (!(file instanceof File)) {
    throw new Error(
      "Please provide a valid EPUB file."
    );
  }

  const ebook =
    await parseEpub(file);

  const totalText =
    ebook.chapters.reduce(
      (total, chapter) =>
        total +
        chapter.html.replace(
          /<[^>]+>/g,
          " "
        ).length,
      0
    );

  const result = {
    fileName: file.name,
    fileSize: file.size,
    title:
      ebook.metadata.title,
    author:
      ebook.metadata.creator,
    language:
      ebook.metadata.language,
    chapterCount:
      ebook.chapters.length,
    characterCount:
      totalText,
  };

  ebook.objectUrls.forEach(
    (url) =>
      URL.revokeObjectURL(
        url
      )
  );

  return result;
}

export async function ebookToPdf(
  file,
  {
    fileName = "ebook.pdf",
    title = "",
    pageSize = "a4",
    orientation = "portrait",
    margin = 34,
    fontFamily = "Georgia",
    fontSize = 16,
    lineHeight = 1.65,
    backgroundColor = "#ffffff",
    textColor = "#171717",
    onProgress,
  } = {}
) {
  if (!(file instanceof File)) {
    throw new Error(
      "Please select an EPUB file."
    );
  }

  if (
    !file.name
      .toLowerCase()
      .endsWith(".epub")
  ) {
    throw new Error(
      "Only EPUB files are supported."
    );
  }

  onProgress?.({
    stage: "reading",
    progress: 8,
    message: "Reading EPUB...",
  });

  const epub =
    await parseEpub(file);

  onProgress?.({
    stage: "extracting",
    progress: 22,
    message: `Extracting ${epub.chapters.length} chapters...`,
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

  const safeMargin =
    Math.max(
      24,
      Number(margin) || 34
    );

  const renderWidth =
    Math.max(
      320,
      Math.floor(
        pageWidth -
          safeMargin * 2
      )
    );

  const renderContainer =
    createRenderContainer(
      epub,
      {
        renderWidth,
        backgroundColor,
        textColor,
        fontFamily,
        fontSize,
        lineHeight,
      }
    );

  try {
    onProgress?.({
      stage: "rendering",
      progress: 36,
      message: "Preparing ebook layout...",
    });

    await waitForImages(
      renderContainer
    );

    const canvas =
      await html2canvas(
        renderContainer,
        {
          backgroundColor,
          scale: Math.min(
            window.devicePixelRatio ||
              1,
            2
          ),
          useCORS: true,
          allowTaint: false,
          logging: false,

          windowWidth:
            renderContainer.scrollWidth,

          windowHeight:
            renderContainer.scrollHeight,

          onclone: (
            clonedDocument
          ) => {
            const clone =
              clonedDocument.querySelector(
                '[data-kaizen-ebook-render="true"]'
              );

            if (clone) {
              clone.style.left =
                "0";

              clone.style.top =
                "0";

              clone.style.position =
                "relative";
            }
          },
        }
      );

    if (
      !canvas.width ||
      !canvas.height
    ) {
      throw new Error(
        "Unable to render the EPUB."
      );
    }

    onProgress?.({
      stage: "building",
      progress: 55,
      message: "Building PDF...",
    });

    /*
     * Add a cover/title page.
     */
    const bookTitle =
      title.trim() ||
      epub.metadata.title ||
      file.name.replace(
        /\.epub$/i,
        ""
      );

    pdf.setFillColor(
      "#111111"
    );

    pdf.rect(
      0,
      0,
      pdf.internal.pageSize.getWidth(),
      pdf.internal.pageSize.getHeight(),
      "F"
    );

    pdf.setTextColor(
      "#ffffff"
    );

    pdf.setFont(
      "helvetica",
      "bold"
    );

    pdf.setFontSize(28);

    const titleLines =
      pdf.splitTextToSize(
        bookTitle,
        pageWidth -
          safeMargin * 2
      );

    pdf.text(
      titleLines,
      safeMargin,
      170
    );

    if (
      epub.metadata.creator
    ) {
      pdf.setFont(
        "helvetica",
        "normal"
      );

      pdf.setFontSize(13);

      pdf.setTextColor(
        "#bcbcbc"
      );

      pdf.text(
        epub.metadata.creator,
        safeMargin,
        170 +
          titleLines.length *
            34 +
          20
      );
    }

    pdf.setFillColor(
      "#f97316"
    );

    pdf.roundedRect(
      safeMargin,
      100,
      74,
      5,
      2,
      2,
      "F"
    );

    const pageCount =
      splitCanvasToPdf(
        pdf,
        canvas,
        {
          margin:
            safeMargin,
          onProgress,
        }
      );

    /*
     * Footer.
     */
    const totalPages =
      pdf.internal.getNumberOfPages();

    const pageHeight =
      pdf.internal.pageSize.getHeight();

    for (
      let page = 1;
      page <= totalPages;
      page += 1
    ) {
      pdf.setPage(page);

      pdf.setFont(
        "helvetica",
        "normal"
      );

      pdf.setFontSize(7);

      pdf.setTextColor(
        "#999999"
      );

      pdf.text(
        "Generated locally with KAIZEN",
        safeMargin,
        pageHeight - 18
      );

      pdf.text(
        `Page ${page} of ${totalPages}`,
        pageWidth -
          safeMargin,
        pageHeight - 18,
        {
          align: "right",
        }
      );
    }

    onProgress?.({
      stage: "finalizing",
      progress: 97,
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
      pageCount: totalPages,
      byteSize: blob.size,
      ebookInfo: {
        title:
          epub.metadata.title,
        author:
          epub.metadata.creator,
        chapterCount:
          epub.chapters.length,
      },
      renderedPageCount:
        pageCount,
    };
  } finally {
    renderContainer.remove();

    epub.objectUrls.forEach(
      (url) =>
        URL.revokeObjectURL(
          url
        )
    );
  }
}