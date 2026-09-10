import {
  PDFDocument,
  rgb,
  StandardFonts,
} from "pdf-lib";

/**
 * Load a PDF and inspect its AcroForm fields.
 */
export async function getFillPdfFormInfo(file) {
  if (!file) {
    throw new Error("No PDF file was provided.");
  }

  const fileBuffer = await file.arrayBuffer();

  const pdf = await PDFDocument.load(
    fileBuffer
  );

  const form = pdf.getForm();

  let fields = [];

  try {
    fields = form
      .getFields()
      .map((field, index) => {
        const name = field.getName();

        let type = "unknown";

        if (
          field.constructor?.name
            ?.toLowerCase()
            .includes("textfield")
        ) {
          type = "text";
        } else if (
          field.constructor?.name
            ?.toLowerCase()
            .includes("checkbox")
        ) {
          type = "checkbox";
        } else if (
          field.constructor?.name
            ?.toLowerCase()
            .includes("dropdown")
        ) {
          type = "dropdown";
        } else if (
          field.constructor?.name
            ?.toLowerCase()
            .includes("radiogroup")
        ) {
          type = "radio";
        }

        return {
          index,
          name,
          type,
        };
      });
  } catch (error) {
    throw new Error(
      "Unable to inspect the PDF form fields."
    );
  }

  return {
    pageCount: pdf.getPageCount(),
    fieldCount: fields.length,
    fields,
  };
}

/**
 * Get a single form field by name.
 */
function getField(form, fieldName) {
  if (!fieldName) {
    throw new Error(
      "Form field name is required."
    );
  }

  try {
    return form.getField(
      fieldName
    );
  } catch {
    throw new Error(
      `Form field "${fieldName}" was not found.`
    );
  }
}

/**
 * Determine a pdf-lib field type.
 */
function getFieldType(field) {
  const className =
    field?.constructor?.name
      ?.toLowerCase() || "";

  if (className.includes("textfield")) {
    return "text";
  }

  if (className.includes("checkbox")) {
    return "checkbox";
  }

  if (
    className.includes("dropdown")
  ) {
    return "dropdown";
  }

  if (
    className.includes("radiogroup")
  ) {
    return "radio";
  }

  if (
    className.includes("optionlist")
  ) {
    return "optionlist";
  }

  return "unknown";
}

/**
 * Normalize RGB values.
 */
function normalizeColor(
  color,
  fallback = [0, 0, 0]
) {
  if (
    !Array.isArray(color) ||
    color.length !== 3
  ) {
    return fallback;
  }

  const values = color.map(Number);

  if (
    values.some(
      (value) => !Number.isFinite(value)
    )
  ) {
    return fallback;
  }

  const divisor = values.some(
    (value) => value > 1
  )
    ? 255
    : 1;

  return values.map(
    (value) =>
      Math.max(
        0,
        Math.min(
          1,
          value / divisor
        )
      )
  );
}

/**
 * Safely set a text form field.
 */
function fillTextField(
  field,
  value
) {
  if (
    typeof field.setText !==
    "function"
  ) {
    throw new Error(
      `Field "${field.getName()}" is not a text field.`
    );
  }

  field.setText(
    value == null
      ? ""
      : String(value)
  );
}

/**
 * Safely set a checkbox field.
 */
function fillCheckboxField(
  field,
  value
) {
  if (
    typeof field.check !==
      "function" ||
    typeof field.uncheck !==
      "function"
  ) {
    throw new Error(
      `Field "${field.getName()}" is not a checkbox.`
    );
  }

  if (
    value === true ||
    value === "true" ||
    value === 1 ||
    value === "1" ||
    value === "on"
  ) {
    field.check();
  } else {
    field.uncheck();
  }
}

/**
 * Safely set a dropdown/select field.
 */
function fillDropdownField(
  field,
  value
) {
  if (
    typeof field.select !==
    "function"
  ) {
    throw new Error(
      `Field "${field.getName()}" does not support selection.`
    );
  }

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return;
  }

  field.select(
    String(value)
  );
}

/**
 * Safely set a radio group field.
 */
function fillRadioField(
  field,
  value
) {
  if (
    typeof field.select !==
    "function"
  ) {
    throw new Error(
      `Field "${field.getName()}" does not support radio selection.`
    );
  }

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return;
  }

  field.select(
    String(value)
  );
}

/**
 * Apply values to AcroForm fields.
 *
 * Expected values object:
 *
 * {
 *   "Full Name": "John Doe",
 *   "Email": "john@example.com",
 *   "Subscribe": true,
 *   "Country": "India"
 * }
 */
export async function fillPdfForm(
  file,
  values = {},
  options = {},
  onProgress
) {
  if (!file) {
    throw new Error(
      "No PDF file was provided."
    );
  }

  if (
    !values ||
    typeof values !== "object" ||
    Array.isArray(values)
  ) {
    throw new Error(
      "Form values must be provided as an object."
    );
  }

  const fileBuffer =
    await file.arrayBuffer();

  if (
    typeof onProgress ===
    "function"
  ) {
    onProgress(5);
  }

  const pdf =
    await PDFDocument.load(
      fileBuffer
    );

  if (
    typeof onProgress ===
    "function"
  ) {
    onProgress(12);
  }

  const form = pdf.getForm();

  const fields =
    form.getFields();

  if (fields.length === 0) {
    throw new Error(
      "This PDF does not contain fillable form fields."
    );
  }

  const fieldMap =
    new Map();

  fields.forEach(
    (field) => {
      fieldMap.set(
        field.getName(),
        field
      );
    }
  );

  const valueEntries =
    Object.entries(values);

  if (
    valueEntries.length === 0
  ) {
    throw new Error(
      "Please provide at least one form value."
    );
  }

  let processed = 0;

  for (
    const [
      fieldName,
      value,
    ] of valueEntries
  ) {
    const field =
      fieldMap.get(fieldName);

    if (!field) {
      throw new Error(
        `Form field "${fieldName}" was not found.`
      );
    }

    const type =
      getFieldType(field);

    switch (type) {
      case "text":
        fillTextField(
          field,
          value
        );
        break;

      case "checkbox":
        fillCheckboxField(
          field,
          value
        );
        break;

      case "dropdown":
      case "optionlist":
        fillDropdownField(
          field,
          value
        );
        break;

      case "radio":
        fillRadioField(
          field,
          value
        );
        break;

      default:
        throw new Error(
          `Field "${fieldName}" uses an unsupported PDF form field type.`
        );
    }

    processed += 1;

    if (
      typeof onProgress ===
      "function"
    ) {
      const percentage =
        15 +
        Math.round(
          (processed /
            valueEntries.length) *
            65
        );

      onProgress(
        Math.min(
          80,
          percentage
        )
      );
    }
  }

  /*
   * pdf-lib can regenerate form appearances
   * so entered values display correctly in
   * viewers that rely on the generated widgets.
   */
  if (
    options.updateFieldAppearances !==
      false
  ) {
    const font =
      await pdf.embedFont(
        StandardFonts.Helvetica
      );

    const color =
      normalizeColor(
        options.textColor,
        [0, 0, 0]
      );

    try {
      form.updateFieldAppearances(
        font,
        {
          color: rgb(
            color[0],
            color[1],
            color[2]
          ),
        }
      );
    } catch {
      /*
       * Some PDFs contain unusual field
       * appearance structures. The values have
       * already been written, so saving the PDF
       * is still preferable to failing here.
       */
    }
  }

  if (
    typeof onProgress ===
    "function"
  ) {
    onProgress(88);
  }

  if (
    options.flatten === true
  ) {
    try {
      form.flatten();
    } catch {
      throw new Error(
        "The form was filled, but the PDF could not be flattened."
      );
    }
  }

  if (
    typeof onProgress ===
    "function"
  ) {
    onProgress(94);
  }

  const pdfBytes =
    await pdf.save({
      useObjectStreams: true,
    });

  if (
    typeof onProgress ===
    "function"
  ) {
    onProgress(100);
  }

  return {
    blob: new Blob(
      [pdfBytes],
      {
        type: "application/pdf",
      }
    ),
    pageCount:
      pdf.getPageCount(),
    fieldCount:
      fields.length,
    filledFieldCount:
      valueEntries.length,
    flattened:
      options.flatten === true,
  };
}

/**
 * Create an empty values object from
 * the detected fields.
 */
export function createEmptyFormValues(
  fields = []
) {
  return fields.reduce(
    (result, field) => {
      if (!field?.name) {
        return result;
      }

      if (field.type === "checkbox") {
        result[field.name] = false;
      } else {
        result[field.name] = "";
      }

      return result;
    },
    {}
  );
}