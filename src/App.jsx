import {
  useMemo,
  useRef,
  useState,
} from "react";

import ToolCard from "./components/ToolCard";
import RadialGlowButton from "./components/RadialGlowButton";
import TeamSection from "./components/TeamSection";

import toolRegistry from "./tools/registry";
import toolComponents from "./tools/toolComponents";

import "./App.css";

function App() {
  const [activeTool, setActiveTool] =
    useState(null);

  const [searchQuery, setSearchQuery] =
    useState("");

  const previousScrollPosition =
    useRef(0);

  const categories =
    Object.values(toolRegistry);

  /*
   * =========================================================
   * SEARCH RESULTS
   * =========================================================
   */

  const filteredCategories = useMemo(() => {
    const query = searchQuery
      .trim()
      .toLowerCase();

    if (!query) {
      return categories;
    }

    return categories
      .map((category) => {
        const categoryText = [
          category.title,
          category.description,
          category.id,
          category.number,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const categoryMatches =
          categoryText.includes(query);

        const filteredGroups =
          category.groups
            .map((group) => {
              const groupText = [
                group.title,
                group.description,
                group.id,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

              const groupMatches =
                groupText.includes(query);

              const filteredTools =
                group.tools.filter((tool) => {
                  const toolText = [
                    tool.title,
                    tool.description,
                    tool.id,
                  ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                  return (
                    categoryMatches ||
                    groupMatches ||
                    toolText.includes(query)
                  );
                });

              return {
                ...group,
                tools: filteredTools,
              };
            })
            .filter(
              (group) =>
                group.tools.length > 0
            );

        return {
          ...category,
          groups: filteredGroups,
        };
      })
      .filter(
        (category) =>
          category.groups.length > 0
      );
  }, [categories, searchQuery]);

  /*
   * =========================================================
   * SEARCH RESULT COUNT
   * =========================================================
   */

  const searchResultCount =
    filteredCategories.reduce(
      (total, category) =>
        total +
        category.groups.reduce(
          (groupTotal, group) =>
            groupTotal +
            group.tools.length,
          0
        ),
      0
    );

  /*
   * =========================================================
   * OPEN TOOL
   * =========================================================
   */

  function handleToolClick(
    tool,
    category
  ) {
    previousScrollPosition.current =
      window.scrollY;

    setActiveTool({
      ...tool,
      categoryTitle:
        category.title,
    });

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }

  /*
   * =========================================================
   * BACK TO TOOLKIT
   * =========================================================
   */

  function handleBack() {
    const restorePosition =
      previousScrollPosition.current;

    setActiveTool(null);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({
          top: restorePosition,
          left: 0,
          behavior: "instant",
        });
      });
    });
  }

  /*
   * =========================================================
   * ACTIVE TOOL PAGE
   * =========================================================
   */

  if (activeTool) {
    const ActiveToolComponent =
      toolComponents[
        activeTool.id
      ];

    return (
      <main className="app">
        <div className="glass-background">
          <div className="glass-orange-light" />
          <div className="glass-ridges" />
          <div className="glass-reflections" />
          <div className="glass-darkness" />
        </div>

        <div className="tool-page">
          <div className="tool-page-shell">
            <header className="tool-navbar">
              <button
                type="button"
                className="tool-back-button"
                onClick={handleBack}
              >
                ← Back
              </button>

              <span className="tool-page-category">
                {activeTool.categoryTitle}
              </span>
            </header>

            <div className="tool-workspace">
              <div className="tool-intro">
                <span className="tool-number">
                  {activeTool.number ||
                    "01"}
                </span>

                <h1>
                  {activeTool.title}
                </h1>

                <p>
                  {activeTool.description}
                </p>
              </div>

              <div className="tool-workspace-box">
                {ActiveToolComponent ? (
                  <ActiveToolComponent />
                ) : (
                  <div className="tool-workspace-content">
                    <span className="tool-placeholder-label">
                      TOOL WORKSPACE
                    </span>

                    <strong>
                      Coming next.
                    </strong>

                    <p>
                      The workspace for this
                      tool will be connected
                      here.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="tool-benefits">
              <div className="tool-benefit">
                <span className="benefit-icon">
                  ◆
                </span>

                <div>
                  <strong>
                    Private
                  </strong>

                  <span>
                    Your files stay on your
                    device.
                  </span>
                </div>
              </div>

              <div className="tool-benefit">
                <span className="benefit-icon">
                  ↯
                </span>

                <div>
                  <strong>
                    Fast
                  </strong>

                  <span>
                    Process files in seconds.
                  </span>
                </div>
              </div>

              <div className="tool-benefit">
                <span className="benefit-icon">
                  ✓
                </span>

                <div>
                  <strong>
                    Simple
                  </strong>

                  <span>
                    No complicated setup.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /*
   * =========================================================
   * HOMEPAGE
   * =========================================================
   */

  return (
    <main className="app">
      <style>{`
        .kaizen-search-area {
          width: 100%;
          display: flex;
          justify-content: center;
          margin: -20px 0 68px;
        }

        .kaizen-search-box {
          position: relative;
          width: min(720px, 100%);
        }

        .kaizen-search-input {
          width: 100%;
          box-sizing: border-box;

          padding:
            17px
            54px
            17px
            50px;

          border:
            1px solid
            rgba(255,255,255,.1);

          border-radius: 16px;

          outline: none;

          background:
            rgba(255,255,255,.045);

          color:
            rgba(255,255,255,.92);

          font-size: 14px;

          backdrop-filter: blur(18px);

          transition:
            border-color .2s ease,
            background .2s ease,
            box-shadow .2s ease;
        }

        .kaizen-search-input::placeholder {
          color:
            rgba(255,255,255,.33);
        }

        .kaizen-search-input:focus {
          border-color:
            rgba(249,115,22,.35);

          background:
            rgba(255,255,255,.06);

          box-shadow:
            0 0 0 4px
            rgba(249,115,22,.055);
        }

        .kaizen-search-icon {
          position: absolute;
          left: 19px;
          top: 50%;

          transform:
            translateY(-52%);

          color:
            rgba(255,255,255,.38);

          font-size: 19px;

          pointer-events: none;
        }

        .kaizen-search-clear {
          position: absolute;

          right: 15px;
          top: 50%;

          transform:
            translateY(-50%);

          width: 30px;
          height: 30px;

          border: 0;
          border-radius: 50%;

          background:
            rgba(255,255,255,.07);

          color:
            rgba(255,255,255,.55);

          cursor: pointer;
        }

        .kaizen-search-clear:hover {
          background:
            rgba(255,255,255,.11);

          color:
            rgba(255,255,255,.85);
        }

        .kaizen-search-meta {
          margin-top: 10px;

          color:
            rgba(255,255,255,.28);

          font-size: 10px;

          text-align: center;

          letter-spacing: .08em;

          text-transform: uppercase;
        }

        .kaizen-search-empty {
          padding:
            80px
            20px;

          text-align: center;

          color:
            rgba(255,255,255,.4);
        }

        .kaizen-search-empty strong {
          display: block;

          margin-bottom: 8px;

          color:
            rgba(255,255,255,.76);

          font-size: 18px;
        }

        @media (max-width: 700px) {
          .kaizen-search-area {
            margin:
              -5px
              0
              45px;
          }

          .kaizen-search-input {
            padding:
              15px
              48px
              15px
              45px;
          }
        }
      `}</style>

      {/* ======================================================
          BACKGROUND
      ====================================================== */}

      <div className="glass-background">
        <div className="glass-orange-light" />
        <div className="glass-ridges" />
        <div className="glass-reflections" />
        <div className="glass-darkness" />
      </div>

      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}

      <div className="app-content">

        {/* ====================================================
            HERO GLASS SHELL
        ==================================================== */}

        <div className="glass-shell">

          {/* ==================================================
              NAVIGATION
          ================================================== */}

          <nav className="navbar">
            <div className="brand">
              <div className="brand-mark">
                改
              </div>

              <div
                className="brand-name"
                style={{
                  display: "flex",
                  flexDirection:
                    "column",
                  justifyContent:
                    "center",
                  gap: "3px",
                }}
              >
                <span
                  style={{
                    fontSize: "25px",
                    fontWeight: "700",
                    letterSpacing:
                      "3px",
                    lineHeight: "1",
                    color:
                      "rgba(255,255,255,.96)",
                  }}
                >
                  KAIZEN
                </span>

                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: "500",
                    letterSpacing:
                      "5px",
                    lineHeight: "1",
                    color:
                      "rgba(255,255,255,.42)",
                  }}
                >
                  改善
                </span>
              </div>
            </div>

            <div className="nav-status">
              <span className="status-dot" />

              <span
                style={{
                  letterSpacing:
                    "2px",
                }}
              >
                カイゼンツール
              </span>
            </div>
          </nav>

          {/* ==================================================
              HERO
          ================================================== */}

          <section className="hero">
            <div className="hero-content">
              <h1>
                <span>
                  Your documents.
                </span>

                <span className="hero-muted">
                  Made simpler.
                </span>
              </h1>

              <p className="hero-description">
                Simple tools for managing,
                editing and converting your
                documents — directly in your
                browser.
              </p>

              <div className="hero-action">
                <span className="hero-label">
                  PRIVATE · FAST · SIMPLE
                </span>

                <RadialGlowButton
                  onClick={() => {
                    document
                      .getElementById(
                        "toolkit"
                      )
                      ?.scrollIntoView({
                        behavior:
                          "smooth",
                      });
                  }}
                >
                  Explore Tools
                </RadialGlowButton>
              </div>
            </div>
          </section>
        </div>

        {/* ====================================================
            TOOLKIT
        ==================================================== */}

        <div
          className="toolkit"
          id="toolkit"
        >

          {/* ==================================================
              TOOLKIT INTRO
          ================================================== */}

          <section className="toolkit-intro">
            <div>
              <span className="section-label">
                KAIZEN TOOLKIT
              </span>

              <h2>
                {searchQuery.trim()
                  ? "Search"
                  : "Everything"}

                <br />

                <span>
                  {searchQuery.trim()
                    ? "results."
                    : "you need."}
                </span>
              </h2>
            </div>

            <p>
              {searchQuery.trim()
                ? `${searchResultCount} matching tools found.`
                : "A focused collection of simple utilities for documents, PDFs, images and more."}
            </p>
          </section>

          {/* ==================================================
              SEARCH
          ================================================== */}

          <div className="kaizen-search-area">
            <div className="kaizen-search-box">
              <span className="kaizen-search-icon">
                ⌕
              </span>

              <input
                type="search"
                className="kaizen-search-input"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
                placeholder="Search tools..."
                aria-label="Search tools"
              />

              {searchQuery && (
                <button
                  type="button"
                  className="kaizen-search-clear"
                  onClick={() =>
                    setSearchQuery("")
                  }
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}

              {searchQuery && (
                <div className="kaizen-search-meta">
                  {searchResultCount} result
                  {searchResultCount ===
                  1
                    ? ""
                    : "s"}{" "}
                  · press Enter to open
                </div>
              )}
            </div>
          </div>

          {/* ==================================================
              SEARCH EMPTY STATE
          ================================================== */}

          {searchQuery.trim() &&
          filteredCategories.length ===
            0 ? (
            <div className="kaizen-search-empty">
              <strong>
                No tools found.
              </strong>

              Try another search term.
            </div>
          ) : (
            /* ==================================================
               CATEGORY SECTIONS
            ================================================== */

            filteredCategories.map(
              (category) => (
                <section
                  className="category-section"
                  id={category.id}
                  key={category.id}
                >

                  {/* ==========================================
                      CATEGORY HEADER
                  ========================================== */}

                  <div className="category-header">
                    <div className="category-title-group">
                      <span className="category-number">
                        {category.number}
                      </span>

                      <div>
                        <h2>
                          {category.title}
                        </h2>

                        <p>
                          {
                            category.description
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ==========================================
                      CATEGORY GROUPS
                  ========================================== */}

                  <div className="category-groups">
                    {category.groups.map(
                      (group) => (
                        <div
                          className="tool-group"
                          key={group.id}
                        >

                          {/* ================================
                              GROUP HEADER
                          ================================= */}

                          <div className="section-heading">
                            <div>
                              <span className="section-label">
                                {
                                  group.title
                                }
                              </span>
                            </div>

                            <p>
                              {
                                group.description
                              }
                            </p>
                          </div>

                          {/* ================================
                              TOOL CARDS
                          ================================= */}

                          <div className="tool-grid">
                            {group.tools.map(
                              (
                                tool,
                                index
                              ) => (
                                <ToolCard
                                  key={
                                    tool.id
                                  }
                                  number={String(
                                    index +
                                      1
                                  ).padStart(
                                    2,
                                    "0"
                                  )}
                                  title={
                                    tool.title
                                  }
                                  description={
                                    tool.description
                                  }
                                  icon={
                                    tool.icon
                                  }
                                  onClick={() =>
                                    handleToolClick(
                                      tool,
                                      category
                                    )
                                  }
                                />
                              )
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </section>
              )
            )
          )}

          {/* ==================================================
              TEAM SECTION
          ================================================== */}

          {!searchQuery.trim() && (
            <TeamSection />
          )}

          {/* ==================================================
              PRIVACY PANEL
          ================================================== */}

          {!searchQuery.trim() && (
            <section className="bottom-panel">
              <div>
                <span className="small-label">
                  BUILT FOR THE WEB
                </span>

                <h3>
                  Your files stay
                  <br />
                  <span>
                    with you.
                  </span>
                </h3>
              </div>

              <div className="bottom-description">
                <p>
                  KAIZEN is designed to
                  process files directly on
                  your device whenever possible,
                  keeping your documents private
                  and your workflow simple.
                </p>

                <div className="bottom-arrow">
                  ↗
                </div>
              </div>
            </section>
          )}

          {/* ==================================================
              FOOTER
          ================================================== */}

          {!searchQuery.trim() && (
            <footer>
              <span>
                KAIZEN
              </span>

              <span>
                DIGITAL UTILITIES / 2026
              </span>
            </footer>
          )}
        </div>
      </div>
    </main>
  );
}

export default App;