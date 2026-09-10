function ImageUploader({ onFileSelected }) {
  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (file) {
      onFileSelected(file);
    }
  };

  return (
    <label className="upload-box">
      <div className="upload-icon">↑</div>

      <h3>Choose an image</h3>

      <p>JPG, PNG or WebP</p>

      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
      />
    </label>
  );
}

export default ImageUploader;