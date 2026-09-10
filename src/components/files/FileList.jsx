import FileCard from "./FileCard";

function FileList({
  files,
  onMoveUp,
  onMoveDown,
  onRemove,
}) {
  return (
    <div className="merge-pdf-file-list">
      {files.map((file, index) => (
        <FileCard
          key={`${file.name}-${file.lastModified}-${index}`}
          file={file}
          index={index}
          total={files.length}
          onMoveUp={() => onMoveUp(index)}
          onMoveDown={() => onMoveDown(index)}
          onRemove={() => onRemove(index)}
          className="merge-pdf-file-card"
        />
      ))}
    </div>
  );
}

export default FileList;