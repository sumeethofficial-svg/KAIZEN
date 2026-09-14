import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import ToolCard from "./components/ToolCard";
import RadialGlowButton from "./components/RadialGlowButton";
import TeamSection from "./components/TeamSection";
import GitHubStarsButton from "./components/GitHubStarsButton";

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
   */
  if (
    title.startsWith(
      normalizedQuery
    )
  ) {
    return 900;
  }

  /*
   * Any title word begins with query
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
   * Group match
   */
  if (
    groupTitle.includes(
      normalizedQuery
    )
  ) {
    return 500;
  }

  /*
   * Category match
   */
  if (
    categoryTitle.includes(
      normalizedQuery
    )
  ) {
    return 400;
  }

  /*
   * Description match
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

  const [activeCategoryId, setActiveCategoryId] =
    useState(null);

  const [showScrollTop, setShowScrollTop] =
    useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 520);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const categories =
    Object.values(toolRegistry);

  /*
   * =========================================================
   * CATEGORY NAVIGATION
   * =========================================================
   */

  function scrollToCategory(categoryId) {
    setActiveCategoryId(categoryId);

    const element =
      document.getElementById(categoryId);

    if (!element) {
      return;
    }

    const offset = 118;
    const targetTop =
      element.getBoundingClientRect().top +
      window.scrollY -
      offset;

    window.scrollTo({
      top: Math.max(0, targetTop),
      left: 0,
      behavior: "smooth",
    });
  }

  /*
   * =========================================================
   * GLOBAL TOOL INDEX
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
   * TOOLKIT CATEGORIES
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
   * OPEN SEARCH PAGE
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
   * CLOSE SEARCH PAGE
   * =========================================================
   */

  function closeSearchPage() {
    setIsSearchOpen(false);
    setSearchQuery("");
  }

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

    setIsSearchOpen(false);
    setSearchQuery("");

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
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
   * SEARCH KEYBOARD
   * =========================================================
   */

  function handleSearchKeyDown(
    event
  ) {
    if (
      event.key === "Enter" &&
      searchResults.length > 0
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

            pointer-events:
              none;

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

          /*
           * SEARCH INPUT
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

          .kaizen-search-page-input::-webkit-search-decoration,
          .kaizen-search-page-input::-webkit-search-cancel-button,
          .kaizen-search-page-input::-webkit-search-results-button,
          .kaizen-search-page-input::-webkit-search-results-decoration {
            -webkit-appearance:
              none;

            appearance:
              none;

            display:
              none;
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

            display:
              flex;

            align-items:
              center;

            justify-content:
              center;

            padding:
              0;

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

          .kaizen-search-page-clear:hover {
            background:
              rgba(255,255,255,.12);

            color:
              #ffffff;
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
           * RESULTS GRID
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
           * RESPONSIVE
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
                  calc(100% - 32px),
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
            </section>

            {/* ================================================
                SEARCH
            ================================================= */}

            <div className="kaizen-search-page-input-wrap">
              <span className="kaizen-search-page-icon">
                ⌕
              </span>

              <input
                ref={searchInputRef}
                type="text"
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
                RESULT COUNT
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
        /* ======================================================
           CATEGORY NAVIGATION
        ====================================================== */

        .toolkit-intro {
          position: relative;
        }

        .kaizen-category-nav {
          position: absolute;
          left: 50%;
          right: auto;
          bottom: -27px;
          z-index: 20;
          width: min(920px, calc(100% - 20px));
          transform: translateX(-50%);
          box-sizing: border-box;
          padding: 0;
          background: transparent;
        }

        .kaizen-category-nav-track {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: clamp(15px, 2.8vw, 34px);
          width: 100%;
          min-height: 54px;
          margin: 0 auto;
          box-sizing: border-box;
          padding: 7px 16px;
          overflow-x: auto;
          scrollbar-width: none;
          overscroll-behavior-inline: contain;
          border: 1px solid rgba(255,255,255,.11);
          border-radius: 18px;
          background:
            linear-gradient(180deg, rgba(255,255,255,.075), rgba(255,255,255,.028)),
            rgba(10,10,10,.36);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.08),
            inset 0 -1px 0 rgba(255,255,255,.025),
            0 14px 38px rgba(0,0,0,.16);
          backdrop-filter: blur(22px) saturate(125%);
          -webkit-backdrop-filter: blur(22px) saturate(125%);
        }

        .kaizen-category-nav-track::before {
          content: "";
          position: absolute;
          inset: 1px;
          border-radius: 17px;
          pointer-events: none;
          background:
            linear-gradient(180deg, rgba(255,255,255,.055), transparent 28%, transparent 72%, rgba(255,255,255,.02));
        }

        .kaizen-category-nav-track::-webkit-scrollbar {
          display: none;
        }

        .kaizen-category-nav-item {
          position: relative;
          flex: 0 0 auto;
          border: 0;
          background: transparent;
          color: rgba(255,255,255,.38);
          padding: 10px 2px 16px;
          font: inherit;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: .12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: color .24s ease, transform .24s ease;
        }

        .kaizen-category-nav-item:hover {
          color: rgba(255,255,255,.82);
          transform: translateY(-1px);
        }

        .kaizen-category-nav-item.active {
          color: rgba(255,255,255,.98);
        }

        .kaizen-category-nav-label {
          position: relative;
          z-index: 2;
          display: inline-block;
        }

        .kaizen-category-nav-glow {
          position: absolute;
          left: 50%;
          bottom: 3px;
          width: 30px;
          height: 4px;
          transform: translateX(-50%) scale(.35);
          transform-origin: center;
          opacity: 0;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(255,153,64,.95) 22%, rgba(255,240,214,1) 50%, rgba(255,132,38,.9) 78%, transparent);
          box-shadow:
            0 0 6px rgba(255,196,125,.95),
            0 0 15px rgba(255,101,0,.62),
            0 0 28px rgba(255,67,0,.26);
          filter: blur(.35px);
          pointer-events: none;
        }

        .kaizen-category-nav-glow::before {
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          width: 7px;
          height: 7px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: #fff4de;
          box-shadow:
            0 0 7px rgba(255,247,232,.98),
            0 0 16px rgba(255,140,37,.88);
        }

        .kaizen-category-nav-item.active .kaizen-category-nav-glow {
          opacity: 1;
          transform: translateX(-50%) scale(1);
        }

        @media (max-width: 700px) {
          .kaizen-category-nav {
            position: relative;
            left: auto;
            right: auto;
            bottom: auto;
            width: calc(100% - 24px);
            transform: none;
            margin: 0 12px;
            padding: 0;
          }

          .kaizen-category-nav-track {
            justify-content: flex-start;
            gap: 20px;
            min-height: 50px;
            padding: 6px 14px;
            border-radius: 16px;
          }

          .kaizen-category-nav-item {
            font-size: 10px;
            letter-spacing: .1em;
          }
        }

        .kaizen-scroll-top {
          position: fixed;
          right: 24px;
          bottom: 24px;
          z-index: 9990;
          width: 46px;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: 1px solid rgba(255,255,255,.14);
          border-radius: 14px;
          background: rgba(12,12,12,.58);
          color: rgba(255,255,255,.82);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.08),
            0 10px 28px rgba(0,0,0,.24);
          backdrop-filter: blur(14px) saturate(120%);
          -webkit-backdrop-filter: blur(14px) saturate(120%);
          cursor: pointer;
          opacity: 0;
          visibility: hidden;
          transform: translateY(10px);
          transition:
            opacity .22s ease,
            visibility .22s ease,
            transform .22s ease,
            background .2s ease,
            border-color .2s ease,
            color .2s ease;
        }

        .kaizen-scroll-top.visible {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }

        .kaizen-scroll-top:hover {
          border-color: rgba(255,145,65,.34);
          background: rgba(30,17,10,.72);
          color: #fff;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.1),
            0 0 18px rgba(255,100,0,.14),
            0 12px 32px rgba(0,0,0,.28);
        }

        .kaizen-scroll-top-icon {
          font-size: 17px;
          line-height: 1;
          transform: translateY(-1px);
        }

        @media (max-width: 700px) {
          .kaizen-scroll-top {
            right: 16px;
            bottom: 16px;
            width: 42px;
            height: 42px;
            border-radius: 13px;
          }
        }

        /* =====================================================
           MINIMAL GLASS KAIZEN NAVBAR
        ====================================================== */

        .kaizen-main-navbar {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          min-height: 96px;
          box-sizing: border-box;
          padding: 16px 28px;
          background:
            linear-gradient(180deg,
              rgba(255,255,255,.028),
              rgba(255,255,255,.008)
            );
          border-bottom: 1px solid rgba(255,255,255,.075);
          box-shadow:
            inset 0 -1px 0 rgba(255,116,28,.045);
        }

        .kaizen-navbar-left,
        .kaizen-navbar-right {
          display: flex;
          align-items: center;
          min-width: 0;
        }

        .kaizen-navbar-left {
          justify-content: flex-start;
          flex: 1 1 auto;
        }

        .kaizen-navbar-right {
          justify-content: flex-end;
          flex: 0 0 auto;
        }

        .kaizen-navbar-wordmark {
          display: inline-block;
          color: rgba(255,248,235,.98);
          font-family:
            Impact,
            "Arial Black",
            "Noto Sans JP",
            "Yu Gothic",
            sans-serif;
          font-size: clamp(34px, 4vw, 54px);
          font-weight: 900;
          line-height: .86;
          letter-spacing: .04em;
          white-space: nowrap;
          transform: scaleX(.92);
          transform-origin: left center;
          text-shadow:
            0 1px 0 rgba(0,0,0,.28),
            0 0 22px rgba(255,137,48,.08);
        }

        .kaizen-main-navbar .kaizen-github-button {
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }

        @media (max-width: 700px) {
          .kaizen-main-navbar {
            min-height: 78px;
            padding: 12px 14px;
          }

          .kaizen-navbar-wordmark {
            font-size: clamp(28px, 10vw, 40px);
            letter-spacing: .03em;
            transform: scaleX(.9);
          }
        }

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

        /*
         * GitHub button
         */

        .kaizen-github-button {
          display:
            flex;

          align-items:
            center;

          justify-content:
            flex-end;

          flex-shrink:
            0;
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
          <nav className="navbar kaizen-main-navbar">
            <div className="kaizen-navbar-left">
              <div className="kaizen-navbar-wordmark" aria-label="KAIZEN">
                KAIZEN
              </div>
            </div>

            <div className="kaizen-navbar-right">
              <div className="kaizen-github-button">
                <GitHubStarsButton
                  variant="default"
                  size="sm"
                />
              </div>
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
            <nav
              className="kaizen-category-nav"
            aria-label="Tool categories"
          >
            <div className="kaizen-category-nav-track">
              {categories.map((category) => {
                const isActive =
                  activeCategoryId === category.id;

                return (
                  <button
                    key={category.id}
                    type="button"
                    className={
                      `kaizen-category-nav-item${
                        isActive ? " active" : ""
                      }`
                    }
                    onClick={() =>
                      scrollToCategory(category.id)
                    }
                    aria-current={
                      isActive ? "location" : undefined
                    }
                  >
                    <span className="kaizen-category-nav-label">
                      {category.title}
                    </span>
                    <span
                      className="kaizen-category-nav-glow"
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
            </nav>
          </section>

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

          <button
            type="button"
            className={`kaizen-scroll-top${
              showScrollTop ? " visible" : ""
            }`}
            onClick={() =>
              window.scrollTo({
                top: 0,
                left: 0,
                behavior: "smooth",
              })
            }
            aria-label="Back to top"
            title="Back to top"
          >
            <span
              className="kaizen-scroll-top-icon"
              aria-hidden="true"
            >
              ↑
            </span>
          </button>

          {/* ==================================================
              TEAM
          ================================================== */}

          <TeamSection />

          {/* ==================================================
              PRIVACY
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