const toolRegistry = {
  /* =========================================================
     PDF
  ========================================================= */

  pdf: {
    id: "pdf",
    number: "01",
    title: "PDF",
    description:
      "Manage, edit, convert and secure your PDF documents.",

    groups: [
      {
        id: "pdf-page-management",
        title: "Page Management",
        description:
          "Organize and transform PDF pages.",

        tools: [
          {
            id: "merge-pdf",
            title: "Merge PDF",
            description:
              "Combine multiple PDF files into one document.",
            icon: "↗",
          },
          {
            id: "compress-pdf",
            title: "Compress PDF",
            description:
              "Reduce PDF file size while keeping quality.",
            icon: "◌",
          },
          {
            id: "split-pdf",
            title: "Split PDF",
            description:
              "Split a PDF into separate files or page ranges.",
            icon: "⌗",
          },
          {
            id: "alternate-mix",
            title: "Alternate & Mix",
            description:
              "Combine pages from multiple PDFs in alternating order.",
            icon: "⇄",
          },
          {
            id: "pages-per-sheet",
            title: "Pages Per Sheet",
            description:
              "Place multiple PDF pages onto a single sheet.",
            icon: "⊞",
          },
          {
            id: "flip-mirror-pdf",
            title: "Flip / Mirror",
            description:
              "Flip PDF pages horizontally or vertically.",
            icon: "↔",
          },
          {
            id: "organize-pages",
            title: "Organize Pages",
            description:
              "Reorder, duplicate or remove PDF pages.",
            icon: "☷",
          },
          {
            id: "rotate-pdf",
            title: "Rotate PDF",
            description:
              "Rotate individual pages or the entire document.",
            icon: "⟳",
          },
          {
            id: "crop-resize-pdf",
            title: "Crop & Resize",
            description:
              "Adjust PDF page boundaries and dimensions.",
            icon: "⌑",
          },
          {
            id: "pdf-to-zip",
            title: "PDF to ZIP",
            description:
              "Package PDF files into a ZIP archive.",
            icon: "↓",
          },
        ],
      },

      {
        id: "pdf-edit-annotate",
        title: "Edit & Annotate",
        description:
          "Edit, mark up and prepare PDFs.",

        tools: [
          {
            id: "edit-pdf",
            title: "Edit PDF",
            description:
              "Edit text, elements and content inside a PDF.",
            icon: "✎",
          },
          {
            id: "sign-pdf",
            title: "Sign PDF",
            description:
              "Add your signature to a PDF document.",
            icon: "✓",
          },
          {
            id: "fill-pdf-form",
            title: "Fill PDF Form",
            description:
              "Fill in interactive PDF forms.",
            icon: "▣",
          },
          {
            id: "redact-pdf",
            title: "Redact PDF",
            description:
              "Permanently remove sensitive information.",
            icon: "■",
          },
          {
            id: "add-watermark",
            title: "Add Watermark",
            description:
              "Add text or image watermarks to PDF pages.",
            icon: "◇",
          },
          {
            id: "page-numbers",
            title: "Page Numbers",
            description:
              "Add customizable page numbers to your PDF.",
            icon: "#",
          },
          {
            id: "bates-numbering",
            title: "Bates Numbering",
            description:
              "Apply sequential identification numbers.",
            icon: "01",
          },
          {
            id: "headers-footers",
            title: "Headers & Footers",
            description:
              "Add headers and footers to PDF pages.",
            icon: "≡",
          },
          {
            id: "flatten-pdf",
            title: "Flatten PDF",
            description:
              "Flatten annotations and form elements.",
            icon: "▤",
          },
          {
            id: "edit-metadata",
            title: "Edit Metadata",
            description:
              "View and modify PDF metadata.",
            icon: "ⓘ",
          },
          {
            id: "invert-pdf-colours",
            title: "Invert PDF Colours",
            description:
              "Invert the colours throughout a PDF.",
            icon: "◐",
          },
          {
            id: "pdf-to-handwriting",
            title: "PDF to Handwriting",
            description:
              "Transform PDF content into handwriting style.",
            icon: "✍",
          },
          {
            id: "handwriting-to-pdf",
            title: "Handwriting to PDF",
            description:
              "Turn handwritten content into a PDF.",
            icon: "⌁",
          },
        ],
      },

      {
        id: "pdf-create-convert",
        title: "Create & Convert",
        description:
          "Create PDFs from documents, data and media.",

        tools: [
          {
            id: "resume-builder",
            title: "Resume Builder",
            description:
              "Create a professional resume as a PDF.",
            icon: "▤",
          },
          {
            id: "word-to-pdf",
            title: "Word to PDF",
            description:
              "Convert Word documents into PDF.",
            icon: "W",
          },
          {
            id: "images-to-pdf",
            title: "Images to PDF",
            description:
              "Combine images into a PDF document.",
            icon: "▧",
          },
          {
            id: "excel-to-pdf",
            title: "Excel to PDF",
            description:
              "Convert spreadsheets into PDF documents.",
            icon: "X",
          },
          {
            id: "powerpoint-to-pdf",
            title: "PowerPoint to PDF",
            description:
              "Convert presentations into PDF files.",
            icon: "P",
          },
          {
            id: "html-to-pdf",
            title: "HTML to PDF",
            description:
              "Convert HTML content into a PDF.",
            icon: "<>",
          },
          {
            id: "create-pdf",
            title: "Create PDF",
            description:
              "Create a PDF document from scratch.",
            icon: "+",
          },
          {
            id: "markdown-to-pdf",
            title: "Markdown to PDF",
            description:
              "Convert Markdown into a polished PDF.",
            icon: "M",
          },
          {
            id: "csv-to-pdf",
            title: "CSV to PDF",
            description:
              "Turn structured CSV data into a PDF.",
            icon: "↔",
          },
          {
            id: "audio-to-pdf",
            title: "Audio to PDF",
            description:
              "Turn audio content into a structured PDF.",
            icon: "♪",
          },
          {
            id: "ebook-to-pdf",
            title: "eBook to PDF",
            description:
              "Convert supported eBooks into PDF.",
            icon: "▥",
          },
        ],
      },

      {
        id: "pdf-to-other",
        title: "Convert to Other",
        description:
          "Turn PDFs into useful formats.",

        tools: [
          {
            id: "pdf-to-word",
            title: "PDF to Word",
            description:
              "Convert PDF documents into editable Word files.",
            icon: "W",
          },
          {
            id: "pdf-to-jpg",
            title: "PDF to JPG",
            description:
              "Convert PDF pages into JPG images.",
            icon: "▧",
          },
          {
            id: "extract-images",
            title: "Extract Images",
            description:
              "Extract embedded images from a PDF.",
            icon: "▣",
          },
          {
            id: "pdf-to-excel",
            title: "PDF to Excel",
            description:
              "Extract tables and data into Excel.",
            icon: "X",
          },
          {
            id: "pdf-to-powerpoint",
            title: "PDF to PowerPoint",
            description:
              "Convert PDF content into PowerPoint slides.",
            icon: "P",
          },
          {
            id: "extract-text",
            title: "Extract Text",
            description:
              "Extract readable text from PDF documents.",
            icon: "T",
          },
          {
            id: "pdf-to-html",
            title: "PDF to HTML",
            description:
              "Convert PDF content into HTML.",
            icon: "<>",
          },
          {
            id: "pdf-to-audio",
            title: "PDF to Audio",
            description:
              "Convert PDF text into spoken audio.",
            icon: "♪",
          },
          {
            id: "pdf-to-epub",
            title: "PDF to EPUB",
            description:
              "Convert PDF documents into EPUB eBooks.",
            icon: "▥",
          },
        ],
      },

      {
        id: "pdf-security",
        title: "Security & Privacy",
        description:
          "Protect and manage access to PDF files.",

        tools: [
          {
            id: "encrypt-pdf",
            title: "Encrypt PDF",
            description:
              "Protect a PDF with password-based encryption.",
            icon: "◆",
          },
          {
            id: "remove-pdf-password",
            title: "Remove Password",
            description:
              "Remove password protection from authorized files.",
            icon: "◇",
          },
          {
            id: "unlock-pdf",
            title: "Unlock PDF",
            description:
              "Unlock a PDF when you have the required credentials.",
            icon: "⌑",
          },
        ],
      },
    ],
  },


  /* =========================================================
     IMAGES
  ========================================================= */

  images: {
    id: "images",
    number: "02",
    title: "Images",
    description:
      "Convert, compress, resize and enhance your images.",

    groups: [
      {
        id: "image-essentials",
        title: "Image Essentials",
        description:
          "Everyday tools for working with image files.",

        tools: [
          {
            id: "convert-image",
            title: "Convert Image",
            description:
              "Convert images between common file formats.",
            icon: "↗",
          },
          {
            id: "compress-image",
            title: "Compress Image",
            description:
              "Reduce image file size with controlled quality.",
            icon: "◌",
          },
          {
            id: "resize-image",
            title: "Resize Image",
            description:
              "Change image dimensions while preserving quality.",
            icon: "⌗",
          },
          {
            id: "fixed-size-image",
            title: "Fixed Size",
            description:
              "Compress an image toward a target file size.",
            icon: "↓",
          },
          {
            id: "enhance-image",
            title: "Image Enhancer",
            description:
              "Improve image clarity, contrast and appearance.",
            icon: "✦",
          },
          {
            id: "upscale-image",
            title: "Image Upscaler",
            description:
              "Increase image resolution while preserving detail.",
            icon: "↗",
          },
          {
            id: "crop-image",
            title: "Crop Image",
            description:
              "Crop images to the dimensions you need.",
            icon: "⌑",
          },
          {
            id: "rotate-image",
            title: "Rotate / Flip",
            description:
              "Rotate or flip images in different directions.",
            icon: "⟳",
          },
          {
            id: "image-to-pdf",
            title: "Image to PDF",
            description:
              "Create PDF documents from one or more images.",
            icon: "▤",
          },
          {
            id: "remove-image-metadata",
            title: "Remove Metadata",
            description:
              "Remove embedded metadata from image files.",
            icon: "ⓘ",
          },
        ],
      },

      {
        id: "image-enhancement",
        title: "Enhancement",
        description:
          "Fine-tune and improve your images.",

        tools: [
          {
            id: "image-adjust",
            title: "Color Adjuster",
            description:
              "Adjust brightness, contrast, saturation and more.",
            icon: "◐",
          },
          {
            id: "image-sharpen",
            title: "Sharpen Image",
            description:
              "Improve perceived detail and image sharpness.",
            icon: "✦",
          },
          {
            id: "image-denoise",
            title: "Denoise Image",
            description:
              "Reduce visual noise while preserving important detail.",
            icon: "◌",
          },
          {
            id: "image-background-remover",
            title: "Background Remover",
            description:
              "Remove the background from supported images.",
            icon: "□",
          },
        ],
      },
    ],
  },


  /* =========================================================
     VIDEO
  ========================================================= */

  video: {
    id: "video",
    number: "03",
    title: "Video",
    description:
      "Trim, compress, enhance and transform your videos.",

    groups: [
      {
        id: "video-editing",
        title: "Video Editing",
        description:
          "Simple tools for everyday video editing.",

        tools: [
          {
            id: "video-trimmer",
            title: "Video Trimmer",
            description:
              "Trim a video between precise start and end points.",
            icon: "✂",
          },
          {
            id: "video-cutter",
            title: "Video Cutter",
            description:
              "Remove unwanted sections from a video.",
            icon: "⌁",
          },
          {
            id: "join-videos",
            title: "Join Videos",
            description:
              "Combine multiple video clips into one.",
            icon: "↗",
          },
          {
            id: "video-snapshot",
            title: "Video Snapshot",
            description:
              "Capture a frame from your video as an image.",
            icon: "▧",
          },
          {
            id: "video-thumbnail",
            title: "Video Thumbnail",
            description:
              "Extract and create a thumbnail from a video.",
            icon: "▣",
          },
        ],
      },

      {
        id: "video-optimization",
        title: "Optimization",
        description:
          "Reduce file size and improve video output.",

        tools: [
          {
            id: "compress-video",
            title: "Video Compressor",
            description:
              "Reduce video file size with adjustable quality.",
            icon: "◌",
          },
          {
            id: "enhance-video",
            title: "Video Enhancer",
            description:
              "Improve brightness, contrast, sharpness and more.",
            icon: "✦",
          },
          {
            id: "resize-video",
            title: "Video Resizer",
            description:
              "Resize videos for different screens and platforms.",
            icon: "⌗",
          },
          {
            id: "change-video-fps",
            title: "Change FPS",
            description:
              "Convert video frame rates to your desired FPS.",
            icon: "◉",
          },
        ],
      },

      {
        id: "video-conversion",
        title: "Conversion",
        description:
          "Convert videos into practical formats.",

        tools: [
          {
            id: "convert-video",
            title: "Video Converter",
            description:
              "Convert videos between supported formats.",
            icon: "⇄",
          },
          {
            id: "video-to-gif",
            title: "Video to GIF",
            description:
              "Turn a video segment into an animated GIF.",
            icon: "GIF",
          },
          {
            id: "gif-to-video",
            title: "GIF to Video",
            description:
              "Convert animated GIF files into video.",
            icon: "▶",
          },
        ],
      },

      {
        id: "video-audio",
        title: "Audio & Playback",
        description:
          "Control video audio and playback behaviour.",

        tools: [
          {
            id: "extract-video-audio",
            title: "Extract Audio",
            description:
              "Extract the audio track from a video.",
            icon: "♪",
          },
          {
            id: "mute-video",
            title: "Mute Video",
            description:
              "Remove the audio track from a video.",
            icon: "⌁",
          },
          {
            id: "change-video-speed",
            title: "Change Speed",
            description:
              "Slow down or speed up video playback.",
            icon: "↯",
          },
          {
            id: "rotate-video",
            title: "Rotate / Flip",
            description:
              "Rotate or mirror your video.",
            icon: "⟳",
          },
        ],
      },
    ],
  },


  /* =========================================================
     AUDIO
  ========================================================= */

  audio: {
    id: "audio",
    number: "04",
    title: "Audio",
    description:
      "Convert, trim, compress and work with audio files.",

    groups: [
      {
        id: "audio-essentials",
        title: "Audio Essentials",
        description:
          "Everyday tools for working with audio.",

        tools: [
          {
            id: "convert-audio",
            title: "Audio Converter",
            description:
              "Convert audio between supported formats.",
            icon: "⇄",
          },
          {
            id: "compress-audio",
            title: "Audio Compressor",
            description:
              "Reduce audio file size while maintaining quality.",
            icon: "◌",
          },
          {
            id: "trim-audio",
            title: "Audio Trimmer",
            description:
              "Cut an audio file between precise points.",
            icon: "✂",
          },
          {
            id: "join-audio",
            title: "Join Audio",
            description:
              "Combine multiple audio files into one.",
            icon: "↗",
          },
          {
            id: "change-audio-speed",
            title: "Change Speed",
            description:
              "Speed up or slow down audio playback.",
            icon: "↯",
          },
          {
            id: "audio-to-video",
            title: "Audio to Video",
            description:
              "Create a video from audio and an image.",
            icon: "▶",
          },
        ],
      },

      {
        id: "audio-extraction",
        title: "Extraction",
        description:
          "Extract and prepare audio from media files.",

        tools: [
          {
            id: "extract-audio-video",
            title: "Video to Audio",
            description:
              "Extract an audio track from a video file.",
            icon: "♪",
          },
          {
            id: "audio-recorder",
            title: "Audio Recorder",
            description:
              "Record audio directly from your device.",
            icon: "●",
          },
        ],
      },
    ],
  },


  /* =========================================================
     DOCUMENTS
  ========================================================= */

  documents: {
    id: "documents",
    number: "05",
    title: "Documents",
    description:
      "Work with documents, text and structured files.",

    groups: [
      {
        id: "document-conversion",
        title: "Document Conversion",
        description:
          "Convert documents between useful formats.",

        tools: [
          {
            id: "document-to-pdf",
            title: "Document to PDF",
            description:
              "Convert supported documents into PDF files.",
            icon: "▤",
          },
          {
            id: "pdf-to-document",
            title: "PDF to Document",
            description:
              "Convert supported PDFs into editable documents.",
            icon: "W",
          },
          {
            id: "text-to-pdf",
            title: "Text to PDF",
            description:
              "Turn plain text into a formatted PDF.",
            icon: "T",
          },
          {
            id: "markdown-to-document",
            title: "Markdown Converter",
            description:
              "Convert Markdown into useful document formats.",
            icon: "M",
          },
        ],
      },

      {
        id: "document-tools",
        title: "Document Utilities",
        description:
          "Useful tools for everyday document workflows.",

        tools: [
          {
            id: "extract-document-text",
            title: "Extract Text",
            description:
              "Extract readable text from supported documents.",
            icon: "T",
          },
          {
            id: "document-word-counter",
            title: "Word Counter",
            description:
              "Count words, characters and lines in text.",
            icon: "#",
          },
          {
            id: "document-cleaner",
            title: "Text Cleaner",
            description:
              "Clean and normalize pasted text.",
            icon: "✦",
          },
        ],
      },
    ],
  },


  /* =========================================================
     UTILITIES
  ========================================================= */

  utilities: {
    id: "utilities",
    number: "06",
    title: "Utilities",
    description:
      "Small tools that make everyday file work easier.",

    groups: [
      {
        id: "file-utilities",
        title: "File Utilities",
        description:
          "Simple utilities for handling files.",

        tools: [
          {
            id: "create-zip",
            title: "Create ZIP",
            description:
              "Create a ZIP archive from selected files.",
            icon: "▥",
          },
          {
            id: "extract-zip",
            title: "Extract ZIP",
            description:
              "Extract files from supported ZIP archives.",
            icon: "↓",
          },
          {
            id: "file-metadata",
            title: "File Metadata",
            description:
              "Inspect basic metadata and properties of files.",
            icon: "ⓘ",
          },
          {
            id: "file-renamer",
            title: "Batch Rename",
            description:
              "Rename multiple files using simple patterns.",
            icon: "✎",
          },
        ],
      },

      {
        id: "quick-tools",
        title: "Quick Tools",
        description:
          "Small utilities for common digital tasks.",

        tools: [
          {
            id: "qr-code-generator",
            title: "QR Code Generator",
            description:
              "Create QR codes from text or links.",
            icon: "▦",
          },
          {
            id: "text-to-file",
            title: "Text to File",
            description:
              "Turn text into a downloadable file.",
            icon: "T",
          },
          {
            id: "base64-tool",
            title: "Base64 Encoder",
            description:
              "Encode and decode supported text data.",
            icon: "01",
          },
        ],
      },
    ],
  },
};

export default toolRegistry;