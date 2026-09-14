import { useEffect, useState } from "react";

const GITHUB_API_URL =
  "https://api.github.com/repos/sumeethofficial-svg/KAIZEN";

export default function GitHubStarsButton({
  variant = "default",
  size = "sm",
}) {
  const [stars, setStars] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStars() {
      try {
        const response = await fetch(
          GITHUB_API_URL,
          {
            headers: {
              Accept:
                "application/vnd.github+json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            "Failed to fetch GitHub stars"
          );
        }

        const data =
          await response.json();

        if (!cancelled) {
          setStars(
            typeof data.stargazers_count ===
              "number"
              ? data.stargazers_count
              : 0
          );
        }
      } catch {
        if (!cancelled) {
          setStars(null);
        }
      }
    }

    loadStars();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleClick() {
    window.open(
      "https://github.com/sumeethofficial-svg/KAIZEN",
      "_blank",
      "noopener,noreferrer"
    );
  }

  const height =
    size === "lg"
      ? "38px"
      : size === "sm"
      ? "30px"
      : "34px";

  const padding =
    size === "lg"
      ? "0 14px"
      : "0 10px";

  const fontSize =
    size === "lg"
      ? "12px"
      : "10px";

  /*
   * Show the number only after
   * KAIZEN reaches 100 stars.
   */
  const showStarCount =
    typeof stars === "number" &&
    stars >= 100;

  return (
    <button
      type="button"
      onClick={handleClick}
      title="KAIZEN on GitHub"
      aria-label="Open KAIZEN GitHub repository"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "7px",
        height,
        padding,
        border:
          "1px solid rgba(255,255,255,.12)",
        borderRadius: "8px",
        background:
          "rgba(255,255,255,.045)",
        color:
          "rgba(255,255,255,.82)",
        fontFamily: "inherit",
        fontSize,
        fontWeight: "600",
        cursor: "pointer",
        backdropFilter:
          "blur(14px)",
        WebkitBackdropFilter:
          "blur(14px)",
        transition:
          "background .2s ease, border-color .2s ease, transform .2s ease",
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background =
          "rgba(255,255,255,.09)";

        event.currentTarget.style.borderColor =
          "rgba(255,255,255,.22)";

        event.currentTarget.style.transform =
          "translateY(-1px)";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background =
          "rgba(255,255,255,.045)";

        event.currentTarget.style.borderColor =
          "rgba(255,255,255,.12)";

        event.currentTarget.style.transform =
          "translateY(0)";
      }}
    >
      {/* GitHub logo */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.38 7.86 10.9.58.1.79-.25.79-.56v-2.17c-3.2.7-3.87-1.54-3.87-1.54-.53-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.26-1.28-5.26-5.69 0-1.26.45-2.29 1.2-3.1-.12-.3-.52-1.47.11-3.06 0 0 .98-.31 3.2 1.18a11.1 11.1 0 0 1 5.82 0c2.22-1.49 3.2-1.18 3.2-1.18.63 1.59.23 2.76.11 3.06.75.81 1.2 1.84 1.2 3.1 0 4.42-2.7 5.4-5.27 5.68.42.36.78 1.08.78 2.18v3.22c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
      </svg>

      <span>
        GitHub
      </span>

      {/* Show star count only at 100+ */}
      {showStarCount && (
        <>
          <span
            style={{
              width: "1px",
              height: "13px",
              background:
                "rgba(255,255,255,.12)",
            }}
          />

          <span>
            {stars}
          </span>
        </>
      )}

      {/* Star icon */}
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="rgba(255,255,255,.7)"
        stroke="rgba(255,255,255,.7)"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <path d="M12 3.5l2.63 5.33 5.88.85-4.25 4.14 1 5.85L12 16.91l-5.26 2.76 1-5.85-4.25-4.14 5.88-.85L12 3.5z" />
      </svg>
    </button>
  );
}