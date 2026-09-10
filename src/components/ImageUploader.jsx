function ImageUploader({ onFileSelected }) {
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (file) {
      onFileSelected(file);
    }

    event.target.value = "";
  };

  return (
    <label
      style={{
        width: "100%",
        minHeight: "330px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px",
        textAlign: "center",
        cursor: "pointer",
        border: "1px dashed rgba(255, 153, 72, 0.48)",
        borderRadius: "22px",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012))",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.045), 0 18px 45px rgba(0,0,0,0.14)",
      }}
    >
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        style={{
          display: "none",
        }}
      />

      <div
        style={{
          width: "68px",
          height: "68px",
          borderRadius: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "22px",
          fontSize: "31px",
          fontWeight: "700",
          color: "#ffffff",
          background:
            "radial-gradient(circle at 50% 35%, rgba(255,168,77,0.98), rgba(235,91,22,0.88) 55%, rgba(150,42,10,0.72))",
          boxShadow:
            "0 0 35px rgba(255,119,45,0.22), inset 0 1px 0 rgba(255,255,255,0.2)",
        }}
      >
        ↓
      </div>

      <h3
        style={{
          margin: 0,
          fontSize: "24px",
          fontWeight: "700",
          letterSpacing: "-0.025em",
          color: "rgba(255,255,255,0.96)",
        }}
      >
        Drop your image here
      </h3>

      <p
        style={{
          margin: "9px 0 0",
          fontSize: "15px",
          color: "rgba(255,255,255,0.52)",
        }}
      >
        or click to browse
      </p>

      <span
        style={{
          marginTop: "15px",
          fontSize: "11px",
          fontWeight: "500",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(255,159,84,0.82)",
        }}
      >
        JPG, PNG OR WEBP
      </span>
    </label>
  );
}

export default ImageUploader;