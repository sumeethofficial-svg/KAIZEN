import {
  useMemo,
  useRef,
  useState,
} from "react";

import ToolCard from "./components/ToolCard";
import RadialGlowButton from "./components/RadialGlowButton";

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

  const normalizedSearch =
    searchQuery
      .trim()
      .toLowerCase();

  const filteredCategories =
    useMemo(() => {
      if (!normalizedSearch) {
        return categories;
      }

      return categories
        .map((category) => {
          const categoryMatches =
            [
              category.title,
              category.description,
            ]
              .join(" ")
              .toLowerCase()
              .includes(
                normalizedSearch
              );

          const filteredGroups =
            category.groups
              .map((group) => {
                const groupMatches =
                  [
                    group.title,
                    group.description,
                  ]
                    .join(" ")
                    .toLowerCase()
                    .includes(
                      normalizedSearch
                    );

                const filteredTools =
                  group.tools.filter(
                    (tool) =>
                      categoryMatches ||
                      groupMatches ||
                      [
                        tool.title,
                        tool.description,
                      ]
                        .join(" ")
                        .toLowerCase()
                        .includes(
                          normalizedSearch
                        )
                  );

                return {
                  ...group,
                  tools:
                    filteredTools,
                };
              })
              .filter(
                (group) =>
                  group.tools.length >
                  0
              );

            return {
              ...category,
              groups:
                filteredGroups,
            };
          })
          .filter(
            (category) =>
              category.groups.length >
              0
          );
        }, [
          categories,
          normalizedSearch,
        ]);

  const searchResultCount =
    filteredCategories.reduce(
      (total, category) =>
        total +
        category.groups.reduce(
          (
            groupTotal,
            group
          ) =>
            groupTotal +
            group.tools.length,
          0
        ),
      0
    );

  function handleToolClick(
    tool,
    category
  ) {
    previousScrollPosition.current =
      window.scrollY;

    setSearchQuery("");

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

  function handleSearchChange(
    event
  ) {
    setSearchQuery(
      event.target.value
    );
  }

  function handleSearchKeyDown(
    event
  ) {
    if (
      event.key === "Escape"
    ) {
      setSearchQuery("");
      return;
    }

    if (
      event.key === "Enter" &&
      searchResultCount === 1
    ) {
      const onlyTool =
        filteredCategories[0]
          ?.groups[0]
          ?.tools[0];

      const onlyCategory =
        filteredCategories[0];

      if (
        onlyTool &&
        onlyCategory
      ) {
        handleToolClick(
          onlyTool,
          onlyCategory
        );
      }
    }
  }

  function clearSearch() {
    setSearchQuery("");
  }

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

        <div className="glass-background">
          <div className="glass-orange-light"></div>
          <div className="glass-ridges"></div>
          <div className="glass-reflections"></div>
          <div className="glass-darkness"></div>
        </div>

        <div className="tool-page">

          <div className="tool-page-shell">

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
                  {
                    activeTool.description
                  }
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
                      The universal
                      file workspace
                      and processing
                      engine will be
                      connected to this
                      tool here.
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
                    No complicated
                    setup.
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

      <div className="glass-background">
        <div className="glass-orange-light"></div>
        <div className="glass-ridges"></div>
        <div className="glass-reflections"></div>
        <div className="glass-darkness"></div>
      </div>

      <div className="app-content">

        <div className="glass-shell">

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
                    fontSize:
                      "25px",
                    fontWeight:
                      "700",
                    letterSpacing:
                      "3px",
                    lineHeight: "1",
                    color:
                      "rgba(255,255,255,0.96)",
                  }}
                >
                  KAIZEN
                </span>

                <span
                  style={{
                    fontSize:
                      "10px",
                    fontWeight:
                      "500",
                    letterSpacing:
                      "5px",
                    lineHeight: "1",
                    color:
                      "rgba(255,255,255,0.42)",
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
                Simple tools for
                managing, editing
                and converting your
                documents — directly
                in your browser.
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

              <div className="hero-search">

                <div className="hero-search-box">

                  <span className="hero-search-icon">
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
                    aria-label="Search tools"
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
                    {normalizedSearch
                      ? `${searchResultCount} ${
                          searchResultCount ===
                          1
                            ? "tool"
                            : "tools"
                        } found`
                      : "Search the entire KAIZEN toolkit"}
                  </span>

                  <span className="hero-search-shortcut">
                    Enter to open
                  </span>

                </div>

              </div>

            </div>

          </section>

        </div>

        <div
          className="toolkit"
          id="toolkit"
        >

          <section className="toolkit-intro">

            <div>

              <span className="section-label">
                KAIZEN TOOLKIT
              </span>

              <h2>

                {normalizedSearch
                  ? "Search"
                  : "Everything"}

                <br />

                <span>
                  {normalizedSearch
                    ? "results."
                    : "you need."}
                </span>

              </h2>

            </div>

            <p>
              {normalizedSearch
                ? `Showing ${searchResultCount} matching ${
                    searchResultCount ===
                    1
                      ? "tool"
                      : "tools"
                  }.`
                : "A focused collection of simple utilities for documents, PDFs, images and more."}
            </p>

          </section>

          {filteredCategories.length ===
          0 ? (

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
                Try another tool name,
                category, or keyword.
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

          ) : (

            filteredCategories.map(
              (category) => (

                <section
                  className="category-section"
                  id={category.id}
                  key={
                    category.id
                  }
                >

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

                  <div className="category-groups">

                    {category.groups.map(
                      (group) => (

                        <div
                          className="tool-group"
                          key={
                            group.id
                          }
                        >

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

          {!normalizedSearch && (
            <>

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
                    KAIZEN is designed
                    to process files
                    directly on your
                    device whenever
                    possible, keeping
                    your documents
                    private and your
                    workflow simple.
                  </p>

                  <div className="bottom-arrow">
                    ↗
                  </div>

                </div>

              </section>

              <footer>

                <span>
                  KAIZEN
                </span>

                <span>
                  DIGITAL UTILITIES / 2026
                </span>

              </footer>

            </>
          )}

        </div>

      </div>

    </main>
  );
}

export default App;