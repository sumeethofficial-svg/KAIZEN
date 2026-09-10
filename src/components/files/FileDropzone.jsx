function FileDropzone({
  accept,
  multiple = false,
  onFiles,
  children,
  className = "",
}) {
  function handleChange(event) {
    const selectedFiles = Array.from(event.target.files || []);

    if (selectedFiles.length > 0) {
      onFiles(selectedFiles);
    }

    event.target.value = "";
  }

  return (
    <div className={className}>
      <label>
        {children}

        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
        />
      </label>
    </div>
  );
}

export default FileDropzone;