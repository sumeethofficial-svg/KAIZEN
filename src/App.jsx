import {
  useEffect,
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

/*
|--------------------------------------------------------------------------
| SEARCH HELPERS
|--------------------------------------------------------------------------
*/

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .trim();
}

function getWords(value) {
  return normalizeSearchText(value)
    .split(/[\s\-_/]+/)
    .filter(Boolean);
}

function getSearchScore(
  tool,
  group,
  category,
  query
) {
  const normalizedQuery =
    normalizeSearchText(query);

  if (!normalizedQuery) {
    return 1;
  }

  const title =
    normalizeSearchText(
      tool.title
    );

  const description =
    normalizeSearchText(
      tool.description
    );

  const groupTitle =
    normalizeSearchText(
      group.title
    );

  const categoryTitle =
    normalizeSearchText(
      category.title
    );

  const words =
    getWords(tool.title);

  /*
   * Exact title
   */
  if (
    title === normalizedQuery
  ) {
    return 1000;
  }

  /*
   * Title begins with query
   *
   * "im" → Image Enhancer
   * "pdf" → PDF to Word
   */
  if (
    title.startsWith(
      normalizedQuery
    )
  ) {
    return 900;
  }

  /*
   * Any word in title begins
   * with query
   *
   * "image" → Images to PDF
   * "pdf" → PDF to JPG
   */
  if (
    words.some((word) =>
      word.startsWith(
        normalizedQuery
      )
    )
  ) {
    return 800;
  }

  /*
   * Query appears anywhere in title
   */
  if (
    title.includes(
      normalizedQuery
    )
  ) {
    return 700;
  }

  /*
   * Group
   */
  if (
    groupTitle.includes(
      normalizedQuery
    )
  ) {
    return 500;
  }

  /*
   * Category
   */
  if (
    categoryTitle.includes(
      normalizedQuery
    )
  ) {
    return 400;
  }

  /*
   * Description
   */
  if (
    description.includes(
      normalizedQuery
    )
  ) {
    return 200;
  }

  return 0;
}

/*
|--------------------------------------------------------------------------
| APP
|--------------------------------------------------------------------------
*/

function App() {
  const [activeTool, setActiveTool] =
    useState(null);

  const [
    isSearchOpen,
    setIsSearchOpen,
  ] = useState(false);

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const searchInputRef =
    useRef(null);

  const previousScrollPosition =
    useRef(0);

  const categories =
    Object.values(toolRegistry);

  /*
   * =========================================================
   * BUILD GLOBAL TOOL INDEX
   * =========================================================
   */

  const allTools = useMemo(() => {
    return categories.flatMap(
      (category) =>
        category.groups.flatMap(
          (group) =>
            group.tools.map(
              (tool) => ({
                tool,
                group,
                category,
              })
            )
        )
    );
  }, [categories]);

  /*
   * =========================================================
   * SEARCH RESULTS
   *
   * No query = show every tool.
   * Query = intelligently filtered tools.
   * =========================================================
   */

  const searchResults = useMemo(() => {
    const query =
      normalizeSearchText(
        searchQuery
      );

    if (!query) {
      return allTools.map(
        (entry) => ({
          ...entry,
          score: 1,
        })
      );
    }

    return allTools
      .map((entry) => ({
        ...entry,

        score:
          getSearchScore(
            entry.tool,
            entry.group,
            entry.category,
            query
          ),
      }))
      .filter(
        (entry) =>
          entry.score > 0
      )
      .sort((a, b) => {
        if (
          b.score !==
          a.score
        ) {
          return (
            b.score -
            a.score
          );
        }

        return a.tool.title.localeCompare(
          b.tool.title
        );
      });
  }, [
    allTools,
    searchQuery,
  ]);

  /*
   * =========================================================
   * FILTER NORMAL TOOLKIT
   * =========================================================
   */

  const filteredCategories =
    useMemo(() => {
      const query =
        normalizeSearchText(
          searchQuery
        );

      if (!query) {
        return categories;
      }

      return categories
        .map((category) => {
          const groups =
            category.groups
              .map((group) => {
                const tools =
                  group.tools.filter(
                    (tool) =>
                      getSearchScore(
                        tool,
                        group,
                        category,
                        query
                      ) > 0
                  );

                return {
                  ...group,
                  tools,
                };
              })
              .filter(
                (group) =>
                  group.tools
                    .length > 0
              );

          return {
            ...category,
            groups,
          };
        })
        .filter(
          (category) =>
            category.groups
              .length > 0
        );
    }, [
      categories,
      searchQuery,
    ]);

  /*
   * =========================================================
   * SEARCH PAGE OPEN
   * =========================================================
   */

  function openSearchPage() {
    setIsSearchOpen(true);

    setSearchQuery("");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    });
  }

  /*
   * =========================================================
   * SEARCH PAGE CLOSE
   * =========================================================
   */

  function closeSearchPage() {
    setIsSearchOpen(false);

    setSearchQuery("");
  }

  /*
   * =========================================================
   * LOCK BODY SCROLL ON SEARCH PAGE
   * =========================================================
   */

  useEffect(() => {
    if (
      !isSearchOpen
    ) {
      document.body.style.overflow =
        "";
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [
    isSearchOpen,
  ]);

  /*
   * =========================================================
   * SEARCH PAGE ESCAPE
   * =========================================================
   */

  useEffect(() => {
    if (
      !isSearchOpen
    ) {
      return;
    }

    function handleKeyDown(
      event
    ) {
      if (
        event.key === "Escape"
      ) {
        closeSearchPage();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    isSearchOpen,
  ]);

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

    /*
     * Close search if a tool is opened
     * from the search page.
     */
    setIsSearchOpen(false);

    setSearchQuery("");

    window.scrollTo({
      top: 0,
      left: 0,
      behavior:
        "instant",
    });
  }

  /*
   * =========================================================
   * BACK FROM TOOL
   * =========================================================
   */

  function handleBack() {
    const restorePosition =
      previousScrollPosition.current;

    setActiveTool(null);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({
          top:
            restorePosition,
          left: 0,
          behavior:
            "instant",
        });
      });
    });
  }

  /*
   * =========================================================
   * SEARCH ENTER
   *
   * Open highest-ranked result.
   * =========================================================
   */

  function handleSearchKeyDown(
    event
  ) {
    if (
      event.key === "Enter" &&
      searchResults.length >
        0
    ) {
      const result =
        searchResults[0];

      handleToolClick(
        result.tool,
        result.category
      );
    }
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
                      The workspace for
                      this tool will be
                      connected here.
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
                    Your files stay
                    on your device.
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
   * FULL SEARCH PAGE
   * =========================================================
   */

  if (
    isSearchOpen
  ) {
    return (
      <main className="app">
        <style>{`
          .kaizen-search-page {
            position: fixed;
            inset: 0;

            z-index: 99999;

            width: 100vw;
            height: 100vh;

            overflow-y: auto;

            box-sizing: border-box;

            background:
              radial-gradient(
                circle at 50% 0%,
                rgba(249,115,22,.13),
                transparent 34%
              ),
              #070707;

            color:
              rgba(255,255,255,.94);
          }

          .kaizen-search-page-background {
            position: fixed;

            inset: 0;

            pointer-events: none;

            background:
              linear-gradient(
                90deg,
                rgba(255,255,255,.018) 1px,
                transparent 1px
              );

            background-size:
              42px 42px;

            mask-image:
              linear-gradient(
                to bottom,
                black,
                transparent 85%
              );

            opacity:
              .22;
          }

          .kaizen-search-page-inner {
            position: relative;

            width:
              min(
                1320px,
                calc(100% - 48px)
              );

            margin:
              0 auto;

            padding:
              32px
              0
              70px;
          }

          /*
           * HEADER
           */

          .kaizen-search-page-header {
            display:
              flex;

            align-items:
              center;

            justify-content:
              space-between;

            gap:
              20px;

            margin-bottom:
              52px;
          }

          .kaizen-search-back {
            display:
              inline-flex;

            align-items:
              center;

            gap:
              8px;

            border:
              1px solid
              rgba(255,255,255,.1);

            border-radius:
              10px;

            padding:
              9px
              13px;

            background:
              rgba(255,255,255,.045);

            color:
              rgba(255,255,255,.66);

            font-size:
              11px;

            font-weight:
              700;

            cursor:
              pointer;

            transition:
              background .18s ease,
              color .18s ease,
              border-color .18s ease;
          }

          .kaizen-search-back:hover {
            background:
              rgba(255,255,255,.08);

            border-color:
              rgba(255,255,255,.16);

            color:
              #ffffff;
          }

          .kaizen-search-brand {
            color:
              rgba(255,255,255,.3);

            font-size:
              10px;

            font-weight:
              800;

            letter-spacing:
              .2em;

            text-transform:
              uppercase;
          }

          /*
           * HEADING
           */

          .kaizen-search-heading {
            max-width:
              800px;

            margin:
              0
              auto
              30px;

            text-align:
              center;
          }

          .kaizen-search-eyebrow {
            margin:
              0
              0
              12px;

            color:
              rgba(249,115,22,.92);

            font-size:
              10px;

            font-weight:
              800;

            letter-spacing:
              .22em;

            text-transform:
              uppercase;
          }

          .kaizen-search-title {
            margin: 0;

            color:
              rgba(255,255,255,.96);

            font-size:
              clamp(
                34px,
                5vw,
                58px
              );

            line-height:
              .98;

            letter-spacing:
              -.055em;
          }

          .kaizen-search-title span {
            color:
              rgba(255,255,255,.36);
          }

          .kaizen-search-description {
            max-width:
              590px;

            margin:
              17px
              auto
              0;

            color:
              rgba(255,255,255,.4);

            font-size:
              13px;

            line-height:
              1.65;
          }

          /*
           * BIG SEARCH FIELD
           */

          .kaizen-search-page-input-wrap {
            position:
              relative;

            width:
              min(
                820px,
                100%
              );

            margin:
              30px
              auto
              50px;
          }

          .kaizen-search-page-input {
            display:
              block;

            width:
              100%;

            height:
              66px;

            box-sizing:
              border-box;

            padding:
              0
              58px
              0
              56px;

            border:
              1px solid
              rgba(255,255,255,.12);

            border-radius:
              18px;

            outline:
              none;

            background:
              rgba(255,255,255,.055);

            color:
              rgba(255,255,255,.96);

            font-size:
              17px;

            font-family:
              inherit;

            box-shadow:
              0
              20px
              70px
              rgba(0,0,0,.25);

            backdrop-filter:
              blur(22px);

            -webkit-backdrop-filter:
              blur(22px);

            transition:
              border-color .2s ease,
              background .2s ease,
              box-shadow .2s ease;
          }

          .kaizen-search-page-input:focus {
            border-color:
              rgba(249,115,22,.42);

            background:
              rgba(255,255,255,.065);

            box-shadow:
              0
              0
              0
              4px
              rgba(249,115,22,.055),
              0
              22px
              80px
              rgba(0,0,0,.34);
          }

          .kaizen-search-page-input::placeholder {
            color:
              rgba(255,255,255,.25);
          }

          .kaizen-search-page-icon {
            position:
              absolute;

            left:
              21px;

            top:
              50%;

            transform:
              translateY(-50%);

            color:
              rgba(255,255,255,.4);

            font-size:
              21px;

            pointer-events:
              none;
          }

          .kaizen-search-page-clear {
            position:
              absolute;

            right:
              16px;

            top:
              50%;

            transform:
              translateY(-50%);

            width:
              32px;

            height:
              32px;

            border:
              0;

            border-radius:
              50%;

            background:
              rgba(255,255,255,.07);

            color:
              rgba(255,255,255,.55);

            cursor:
              pointer;

            font-size:
              17px;
          }

          /*
           * RESULT INFO
           */

          .kaizen-search-results-header {
            display:
              flex;

            align-items:
              center;

            justify-content:
              space-between;

            gap:
              14px;

            margin-bottom:
              18px;

            padding:
              0
              2px;
          }

          .kaizen-search-results-count {
            color:
              rgba(255,255,255,.48);

            font-size:
              10px;

            font-weight:
              700;

            letter-spacing:
              .14em;

            text-transform:
              uppercase;
          }

          .kaizen-search-results-hint {
            color:
              rgba(255,255,255,.22);

            font-size:
              9px;
          }

          /*
           * SAME KAIZEN TOOL CARDS
           */

          .kaizen-search-results-grid {
            display:
              grid;

            grid-template-columns:
              repeat(
                4,
                minmax(0,1fr)
              );

            gap:
              18px;

            padding-bottom:
              25px;
          }

          /*
           * NO RESULTS
           */

          .kaizen-search-no-results-page {
            padding:
              80px
              20px;

            border:
              1px solid
              rgba(255,255,255,.07);

            border-radius:
              18px;

            background:
              rgba(255,255,255,.025);

            text-align:
              center;
          }

          .kaizen-search-no-results-page strong {
            display:
              block;

            margin-bottom:
              7px;

            color:
              rgba(255,255,255,.78);

            font-size:
              17px;
          }

          .kaizen-search-no-results-page span {
            color:
              rgba(255,255,255,.32);

            font-size:
              12px;
          }

          /*
           * MOBILE
           */

          @media (max-width: 1050px) {
            .kaizen-search-results-grid {
              grid-template-columns:
                repeat(
                  3,
                  minmax(0,1fr)
                );
            }
          }

          @media (max-width: 780px) {
            .kaizen-search-page-inner {
              width:
                min(
                  100% - 32px,
                  680px
                );

              padding:
                20px
                0
                50px;
            }

            .kaizen-search-page-header {
              margin-bottom:
                35px;
            }

            .kaizen-search-results-grid {
              grid-template-columns:
                repeat(
                  2,
                  minmax(0,1fr)
                );

              gap:
                13px;
            }

            .kaizen-search-results-hint {
              display:
                none;
            }
          }

          @media (max-width: 520px) {
            .kaizen-search-results-grid {
              grid-template-columns:
                1fr;
            }

            .kaizen-search-page-input {
              height:
                58px;

              font-size:
                15px;
            }
          }
        `}</style>

        <div className="kaizen-search-page">
          <div className="kaizen-search-page-background" />

          <div className="kaizen-search-page-inner">
            {/* ================================================
                HEADER
            ================================================= */}

            <header className="kaizen-search-page-header">
              <button
                type="button"
                className="kaizen-search-back"
                onClick={
                  closeSearchPage
                }
              >
                ← Back
              </button>

              <span className="kaizen-search-brand">
                KAIZEN · 改善
              </span>
            </header>

            {/* ================================================
                HEADING
            ================================================= */}

            <section className="kaizen-search-heading">
              <p className="kaizen-search-eyebrow">
                KAIZEN TOOL SEARCH
              </p>

              <h1 className="kaizen-search-title">
                Find <span>your tool.</span>
              </h1>

              <p className="kaizen-search-description">
                Search through every KAIZEN
                utility. Results update instantly
                as you type.
              </p>
            </section>

            {/* ================================================
                SEARCH INPUT
            ================================================= */}

            <div className="kaizen-search-page-input-wrap">
              <span className="kaizen-search-page-icon">
                ⌕
              </span>

              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
                onKeyDown={
                  handleSearchKeyDown
                }
                placeholder="Search all tools..."
                className="kaizen-search-page-input"
                autoComplete="off"
                aria-label="Search all KAIZEN tools"
              />

              {searchQuery && (
                <button
                  type="button"
                  className="kaizen-search-page-clear"
                  onClick={() =>
                    setSearchQuery("")
                  }
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            {/* ================================================
                RESULTS HEADER
            ================================================= */}

            <div className="kaizen-search-results-header">
              <span className="kaizen-search-results-count">
                {searchResults.length}{" "}
                tool
                {searchResults.length ===
                1
                  ? ""
                  : "s"}
                {searchQuery
                  ? ` matching "${searchQuery}"`
                  : " available"}
              </span>

              <span className="kaizen-search-results-hint">
                Click a card to open the tool
              </span>
            </div>

            {/* ================================================
                RESULTS
            ================================================= */}

            {searchResults.length ===
            0 ? (
              <div className="kaizen-search-no-results-page">
                <strong>
                  No tools found.
                </strong>

                <span>
                  Try a different keyword.
                </span>
              </div>
            ) : (
              <div className="kaizen-search-results-grid">
                {searchResults.map(
                  (
                    result,
                    index
                  ) => (
                    <ToolCard
                      key={`${result.category.id}-${result.group.id}-${result.tool.id}`}
                      number={String(
                        index + 1
                      ).padStart(
                        2,
                        "0"
                      )}
                      title={
                        result.tool.title
                      }
                      description={
                        result.tool
                          .description
                      }
                      icon={
                        result.tool.icon
                      }
                      onClick={() =>
                        handleToolClick(
                          result.tool,
                          result.category
                        )
                      }
                    />
                  )
                )}
              </div>
            )}
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
        /*
         * =====================================================
         * HERO SEARCH
         * =====================================================
         */

        .kaizen-hero-search-area {
          width:
            100%;

          display:
            flex;

          justify-content:
            center;

          box-sizing:
            border-box;

          margin-top:
            34px;
        }

        .kaizen-hero-search-box {
          position:
            relative;

          width:
            min(
              660px,
              100%
            );
        }

        .kaizen-hero-search-button {
          width:
            100%;

          height:
            58px;

          display:
            flex;

          align-items:
            center;

          gap:
            14px;

          padding:
            0
            20px;

          border:
            1px solid
            rgba(255,255,255,.1);

          border-radius:
            15px;

          background:
            rgba(15,15,15,.42);

          color:
            rgba(255,255,255,.42);

          box-shadow:
            0
            12px
            35px
            rgba(0,0,0,.18);

          backdrop-filter:
            blur(18px);

          -webkit-backdrop-filter:
            blur(18px);

          cursor:
            text;

          text-align:
            left;

          font-family:
            inherit;

          font-size:
            14px;

          transition:
            border-color .2s ease,
            background .2s ease,
            box-shadow .2s ease,
            transform .2s ease;
        }

        .kaizen-hero-search-button:hover {
          border-color:
            rgba(255,255,255,.15);

          background:
            rgba(20,20,20,.5);

          box-shadow:
            0
            14px
            42px
            rgba(0,0,0,.22);

          transform:
            translateY(-1px);
        }

        .kaizen-hero-search-icon {
          color:
            rgba(255,255,255,.42);

          font-size:
            18px;

          line-height:
            1;
        }

        .kaizen-hero-search-placeholder {
          color:
            rgba(255,255,255,.38);
        }

        @media (max-width: 700px) {
          .kaizen-hero-search-area {
            margin-top:
              28px;
          }

          .kaizen-hero-search-button {
            height:
              54px;
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

      <div className="app-content">
        {/* ====================================================
            HERO
        ==================================================== */}

        <div className="glass-shell">
          <nav className="navbar">
            <div className="brand">
              <div className="brand-mark">
                改
              </div>

              <div
                className="brand-name"
                style={{
                  display:
                    "flex",
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
                    lineHeight:
                      "1",
                    color:
                      "rgba(255,255,255,.96)",
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
                    lineHeight:
                      "1",
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

              {/* ==============================================
                  HERO SEARCH BUTTON
                  Clicking this opens the dedicated search page.
              ============================================== */}

              <div className="kaizen-hero-search-area">
                <div className="kaizen-hero-search-box">
                  <button
                    type="button"
                    className="kaizen-hero-search-button"
                    onClick={
                      openSearchPage
                    }
                  >
                    <span className="kaizen-hero-search-icon">
                      ⌕
                    </span>

                    <span className="kaizen-hero-search-placeholder">
                      Search tools...
                    </span>
                  </button>
                </div>
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
          <section className="toolkit-intro">
            <div>
              <span className="section-label">
                KAIZEN TOOLKIT
              </span>

              <h2>
                Everything
                <br />
                <span>
                  you need.
                </span>
              </h2>
            </div>

            <p>
              A focused collection of simple
              utilities for documents, PDFs,
              images and more.
            </p>
          </section>

          {/* ==================================================
              CATEGORIES
          ================================================== */}

          {filteredCategories.map(
            (category) => (
              <section
                className="category-section"
                id={category.id}
                key={category.id}
              >
                <div className="category-header">
                  <div className="category-title-group">
                    <span className="category-number">
                      {category.number}
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
          )}

          {/* ==================================================
              TEAM
          ================================================== */}

          <TeamSection />

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
                KAIZEN is designed to process
                files directly on your device
                whenever possible, keeping your
                documents private and your
                workflow simple.
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