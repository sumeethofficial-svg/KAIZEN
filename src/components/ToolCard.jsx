function ToolCard({
  number,
  title,
  description,
  icon,
  onClick,
}) {
  return (
    <button className="tool-card" onClick={onClick}>
      <div className="card-glow"></div>

      <div className="card-top">
        <span className="card-number">{number}</span>

        <span className="card-icon">{icon}</span>
      </div>

      <div className="card-bottom">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>

        <div className="card-arrow">
          ↗
        </div>
      </div>
    </button>
  );
}

export default ToolCard;