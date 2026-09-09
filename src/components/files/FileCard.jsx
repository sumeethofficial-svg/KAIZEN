function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileCard({
  file,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onRemove,
  className = "",
}) {
  return (
    <div className={className}>
      <div className="merge-pdf-file-number">
        {String(index + 1).padStart(2, "0")}
      </div>

      <div className="merge-pdf-file-icon">
        PDF
      </div>

      <div className="merge-pdf-file-info">
        <strong>{file.name}</strong>

        <span>{formatFileSize(file.size)}</span>
      </div>

      <div className="merge-pdf-file-actions">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          aria-label={`Move ${file.name} up`}
        >
          ↑
        </button>

        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          aria-label={`Move ${file.name} down`}
        >
          ↓
        </button>

        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${file.name}`}
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default FileCard;