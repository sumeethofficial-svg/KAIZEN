import { useMemo, useRef, useState } from "react";

import ToolCard from "./components/ToolCard";
import RadialGlowButton from "./components/RadialGlowButton";

import toolRegistry from "./tools/registry";
import toolComponents from "./tools/toolComponents";

import "./App.css";

function App() {
  const [activeTool, setActiveTool] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  /*
   * Stores the exact homepage scroll position
   * before entering a tool.
   */
  const previousScrollPosition =
    useRef(0);

  const categories =
    Object.values(toolRegistry);

  /*
   * =========================================================
   * SEARCH
   * =========================================================
   */

  const normalizedSearchQuery =
    searchQuery.trim().toLowerCase();

  const filteredCategories =
    useMemo(() => {
      if (!normalizedSearchQuery) {
        return categories;
      }

      return categories
        .map((category) => {
          const filteredGroups =
            category.groups
              .map((group) => {
                const filteredTools =
                  group.tools.filter(
                    (tool) => {
                      const searchableText = [
                        tool.title,
                        tool.description,
                        group.title,
                        category.title,
                      ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();

                      return searchableText.includes(
                        normalizedSearchQuery
                      );
                    }
                  );

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
    }, [
      categories,
      normalizedSearchQuery,
    ]);

  const searchResultCount =
    useMemo(() => {
      return filteredCategories.reduce(
        (categoryTotal, category) =>
          categoryTotal +
          category.groups.reduce(
            (groupTotal, group) =>
              groupTotal +
              group.tools.length,
            0
          ),
        0
      );
    }, [filteredCategories]);

  /*
   * =========================================================
   * SEARCH HANDLERS
   * =========================================================
   */

  const handleSearchChange = (
    event
  ) => {
    setSearchQuery(event.target.value);
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  /*
   * Enter on a single search result opens it.
   * Escape clears the search.
   */
  const handleSearchKeyDown = (
    event
  ) => {
    if (event.key === "Escape") {
      clearSearch();
      event.currentTarget.blur();
      return;
    }

    if (
      event.key === "Enter" &&
      searchResultCount === 1
    ) {
      const firstCategory =
        filteredCategories[0];

      const firstGroup =
        firstCategory?.groups?.[0];

      const firstTool =
        firstGroup?.tools?.[0];

      if (firstTool) {
        handleToolClick(
          firstTool,
          firstCategory
        );
      }
    }
  };

  /*
   * =========================================================
   * OPEN TOOL
   * =========================================================
   */

  const handleToolClick = (
    tool,
    category
  ) => {
    /*
     * Remember exactly where the user
     * was on the homepage.
     */
    previousScrollPosition.current =
      window.scrollY;

    /*
     * Store the complete tool metadata.
     */
    setActiveTool({
      ...tool,
      categoryTitle:
        category.title,
    });

    /*
     * Start the tool page at the top.
     */
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  };

  /*
   * =========================================================
   * BACK TO TOOLKIT
   * =========================================================
   */

  const handleBack = () => {
    const restorePosition =
      previousScrollPosition.current;

    setActiveTool(null);

    /*
     * Give React time to restore the
     * homepage before restoring scroll.
     */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({
          top: restorePosition,
          left: 0,
          behavior: "instant",
        });
      });
    });
  };

  /*
   * =========================================================
   * ACTIVE TOOL
   * =========================================================
   */

  if (activeTool) {
    const ActiveToolComponent =
      toolComponents[
        activeTool.id
      ];

    return (
      <main className="app">
        {/* ==================================================
            BACKGROUND
        ================================================== */}

        <div className="glass-background">
          <div className="glass-orange-light"></div>

          <div className="glass-ridges"></div>

          <div className="glass-reflections"></div>

          <div className="glass-darkness"></div>
        </div>

        {/* ==================================================
            TOOL PAGE
        ================================================== */}

        <div className="tool-page">
          <div className="tool-page-shell">
            {/* ==================================================
                TOOL NAVBAR
            ================================================== */}

            <header className="tool-navbar">
              <button
                type="button"
                className="tool-back-button"
                onClick={
                  handleBack
                }
              >
                ← Back
              </button>

              <span className="tool-page-category">
                {
                  activeTool.categoryTitle
                }
              </span>
            </header>

            {/* ==================================================
                TOOL CONTENT
            ================================================== */}

            <div className="tool-workspace">
              <div className="tool-intro">
                <span className="tool-number">
                  {activeTool.number ||
                    "01"}
                </span>

                <h1>
                  {
                    activeTool.title
                  }
                </h1>

                <p>
                  {
                    activeTool.description
                  }
                </p>
              </div>

              {/* ==================================================
                  ACTUAL TOOL COMPONENT
              ================================================== */}

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
                      This tool has not been
                      connected to the component
                      registry yet.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ==================================================
                TOOL BENEFITS
            ================================================== */}

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
                    Your files stay on
                    your device.
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
                    Process files in
                    seconds.
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
   * MAIN HOMEPAGE
   * =========================================================
   */

  return (
    <main className="app">
      {/* ==================================================
          BACKGROUND
      ================================================== */}

      <div className="glass-background">
        <div className="glass-orange-light"></div>

        <div className="glass-ridges"></div>

        <div className="glass-reflections"></div>

        <div className="glass-darkness"></div>
      </div>

      {/* ==================================================
          MAIN CONTENT
      ================================================== */}

      <div className="app-content">
        {/* ==================================================
            HERO GLASS SHELL
        ================================================== */}

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
                      "rgba(255, 255, 255, 0.96)",
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
                      "rgba(255, 255, 255, 0.42)",
                  }}
                >
                  改善
                </span>
              </div>
            </div>

            <div className="nav-status">
              <span className="status-dot"></span>

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

              {/* ==================================================
                  SEARCH
              ================================================== */}

              <div className="hero-search">
                <div className="hero-search-box">
                  <span
                    className="hero-search-icon"
                    aria-hidden="true"
                  >
                    ⌕
                  </span>

                  <input
                    type="search"
                    value={
                      searchQuery
                    }
                    onChange={
                      handleSearchChange
                    }
                    onKeyDown={
                      handleSearchKeyDown
                    }
                    placeholder="Search tools..."
                    aria-label="Search KAIZEN tools"
                    autoComplete="off"
                    spellCheck="false"
                  />

                  {searchQuery && (
                    <button
                      type="button"
                      className="hero-search-clear"
                      onClick={
                        clearSearch
                      }
                      aria-label="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="hero-search-meta">
                  <span>
                    {searchQuery
                      ? `${searchResultCount} ${
                          searchResultCount ===
                          1
                            ? "tool"
                            : "tools"
                        } found`
                      : "Search across all KAIZEN tools"}
                  </span>

                  <span className="hero-search-shortcut">
                    ESC to clear
                  </span>
                </div>
              </div>

              {/* ==================================================
                  HERO CTA
              ================================================== */}

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

        {/* ==================================================
            TOOLKIT
        ================================================== */}

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
                {searchQuery
                  ? "Search results."
                  : "Everything"}

                {!searchQuery && (
                  <>
                    <br />

                    <span>
                      you need.
                    </span>
                  </>
                )}
              </h2>
            </div>

            <p>
              {searchQuery
                ? `Showing tools matching "${searchQuery}".`
                : "A focused collection of simple utilities for documents, PDFs, images and more."}
            </p>
          </section>

          {/* ==================================================
              EMPTY SEARCH STATE
          ================================================== */}

          {searchQuery &&
            searchResultCount ===
              0 && (
              <section className="search-empty-state">
                <span className="section-label">
                  NO MATCHES
                </span>

                <h3>
                  Nothing found for{" "}
                  <span>
                    “{searchQuery}”
                  </span>
                </h3>

                <p>
                  Try a broader search such
                  as PDF, image, compress,
                  convert, sign or merge.
                </p>

                <button
                  type="button"
                  onClick={
                    clearSearch
                  }
                >
                  Clear Search
                </button>
              </section>
            )}

          {/* ==================================================
              CATEGORY SECTIONS
          ================================================== */}

          {filteredCategories.map(
            (category) => (
              <section
                className="category-section"
                id={category.id}
                key={category.id}
              >
                {/* ==================================================
                    CATEGORY HEADER
                ================================================== */}

                <div className="category-header">
                  <div className="category-title-group">
                    <span className="category-number">
                      {
                        category.number
                      }
                    </span>

                    <div>
                      <h2>
                        {
                          category.title
                        }
                      </h2>

                      <p>
                        {
                          category.description
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* ==================================================
                    CATEGORY GROUPS
                ================================================== */}

                <div className="category-groups">
                  {category.groups.map(
                    (group) => (
                      <div
                        className="tool-group"
                        key={
                          group.id
                        }
                      >
                        {/* ==================================================
                            GROUP HEADER
                        ================================================== */}

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

                        {/* ==================================================
                            TOOL CARDS
                        ================================================== */}

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
          )}

          {/* ==================================================
              PRIVACY PANEL
          ================================================== */}

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
                KAIZEN is designed to process files
                directly on your device whenever
                possible, keeping your documents
                private and your workflow simple.
              </p>

              <div className="bottom-arrow">
                ↗
              </div>
            </div>
          </section>

          {/* ==================================================
              FOOTER
          ================================================== */}

          <footer>
            <span>
              KAIZEN
            </span>

            <span>
              DIGITAL UTILITIES / 2026
            </span>
          </footer>
        </div>
      </div>
    </main>
  );
}

export default App;