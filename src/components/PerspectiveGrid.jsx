import React, { useEffect, useMemo, useState } from "react";

function PerspectiveGrid({
  className = "",
  gridSize = 40,
  showOverlay = true,
  fadeRadius = 80,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const tiles = useMemo(
    () => Array.from({ length: gridSize * gridSize }),
    [gridSize]
  );

  return (
    <div
      className={`perspective-grid-background ${className}`}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "#020305",
        perspective: "2000px",
        transformStyle: "preserve-3d",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {/* Ambient blue light behind the grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(
              ellipse at 50% 18%,
              rgba(54, 91, 135, 0.28),
              rgba(12, 22, 35, 0.12) 38%,
              transparent 68%
            )
          `,
          pointerEvents: "none",
        }}
      />

      {/* Perspective plane */}
      <div
        className="perspective-grid-plane"
        style={{
          position: "absolute",
          width: "80rem",
          height: "80rem",
          left: "50%",
          top: "58%",

          display: "grid",

          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize}, 1fr)`,

          transform:
            "translate(-50%, -50%) rotateX(58deg) rotateZ(0deg) scale(1.65)",

          transformStyle: "preserve-3d",

          opacity: 0.34,
        }}
      >
        {mounted &&
          tiles.map((_, index) => (
            <div
              key={index}
              style={{
                minWidth: "1px",
                minHeight: "1px",

                borderRight:
                  "1px solid rgba(135, 174, 220, 0.09)",

                borderBottom:
                  "1px solid rgba(135, 174, 220, 0.09)",

                background: "transparent",

                transition:
                  "border-color 300ms ease",
              }}
            />
          ))}
      </div>

      {/* Fade into the dark edges */}
      {showOverlay && (
        <div
          style={{
            position: "absolute",
            inset: 0,

            pointerEvents: "none",

            background: `
              radial-gradient(
                ellipse at center,
                transparent 15%,
                rgba(2, 3, 5, 0.08) 38%,
                rgba(2, 3, 5, 0.72) ${fadeRadius}%,
                #020305 100%
              )
            `,
          }}
        />
      )}

      {/* Top darkness */}
      <div
        style={{
          position: "absolute",
          inset: 0,

          pointerEvents: "none",

          background: `
            linear-gradient(
              to bottom,
              rgba(2, 3, 5, 0.25) 0%,
              transparent 35%,
              rgba(2, 3, 5, 0.72) 100%
            )
          `,
        }}
      />
    </div>
  );
}

export default PerspectiveGrid;