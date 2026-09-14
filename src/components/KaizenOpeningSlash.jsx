const INTRO_DURATION = 4100;

function createParticle(index, total) {
  const particle =
    document.createElement("span");

  particle.className =
    "kaizen-opening-particle";

  const angle =
    (index / total) * Math.PI * 2 +
    (Math.random() - 0.5) * 0.7;

  const distance =
    100 + Math.random() * 520;

  const startX =
    50 + (Math.random() - 0.5) * 9;

  const startY =
    50 + (Math.random() - 0.5) * 7;

  const endX =
    startX +
    (Math.cos(angle) * distance) / 12;

  const endY =
    startY +
    (Math.sin(angle) * distance) / 12;

  const size =
    1.5 + Math.random() * 4;

  particle.style.setProperty(
    "--particle-x",
    `${endX - startX}vw`
  );

  particle.style.setProperty(
    "--particle-y",
    `${endY - startY}vh`
  );

  particle.style.setProperty(
    "--particle-size",
    `${size}px`
  );

  particle.style.setProperty(
    "--particle-delay",
    `${900 + Math.random() * 800}ms`
  );

  particle.style.setProperty(
    "--particle-duration",
    `${900 + Math.random() * 1200}ms`
  );

  particle.style.setProperty(
    "--particle-rotation",
    `${Math.random() * 360}deg`
  );

  return particle;
}

function buildIntro() {
  const root =
    document.createElement("div");

  root.id =
    "kaizen-opening-slash";

  root.setAttribute(
    "aria-hidden",
    "true"
  );

  root.innerHTML = `
    <!-- =====================================================
         BLACK WORLD
    ====================================================== -->

    <div class="kaizen-opening-blackout"></div>

    <!-- =====================================================
         BREATHING FIRE ATMOSPHERE
    ====================================================== -->

    <div class="kaizen-opening-atmosphere">
      <div
        class="kaizen-opening-breath breath-one"
      ></div>

      <div
        class="kaizen-opening-breath breath-two"
      ></div>

      <div
        class="kaizen-opening-breath breath-three"
      ></div>
    </div>

    <!-- =====================================================
         EDGE FLAMES
    ====================================================== -->

    <div class="kaizen-flames">

      <div
        class="flame flame-left flame-a"
      ></div>

      <div
        class="flame flame-left flame-b"
      ></div>

      <div
        class="flame flame-left flame-c"
      ></div>

      <div
        class="flame flame-right flame-a"
      ></div>

      <div
        class="flame flame-right flame-b"
      ></div>

      <div
        class="flame flame-right flame-c"
      ></div>

      <div
        class="flame flame-top flame-a"
      ></div>

      <div
        class="flame flame-top flame-b"
      ></div>

      <div
        class="flame flame-bottom flame-a"
      ></div>

      <div
        class="flame flame-bottom flame-b"
      ></div>

    </div>

    <!-- =====================================================
         EMBERS
    ====================================================== -->

    <div class="kaizen-opening-embers"></div>

    <!-- =====================================================
         KATANA IMPACT FLASH
    ====================================================== -->

    <div class="kaizen-opening-flash"></div>

    <!-- =====================================================
         INVISIBLE KATANA SLASH
    ====================================================== -->

    <div class="kaizen-opening-slash-wrap">

      <svg
        class="kaizen-opening-svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >

        <defs>

          <linearGradient
            id="kaizen-slash-fire"
            x1="0"
            y1="1"
            x2="1"
            y2="0"
          >

            <stop
              offset="0%"
              stop-color="#ff2700"
              stop-opacity="0"
            />

            <stop
              offset="13%"
              stop-color="#ff4500"
              stop-opacity=".8"
            />

            <stop
              offset="31%"
              stop-color="#ff7600"
              stop-opacity="1"
            />

            <stop
              offset="49%"
              stop-color="#fff5d8"
              stop-opacity="1"
            />

            <stop
              offset="66%"
              stop-color="#ffac25"
              stop-opacity="1"
            />

            <stop
              offset="86%"
              stop-color="#ff4b00"
              stop-opacity=".72"
            />

            <stop
              offset="100%"
              stop-color="#cb1800"
              stop-opacity="0"
            />

          </linearGradient>

          <filter
            id="kaizen-slash-glow"
            x="-70%"
            y="-70%"
            width="240%"
            height="240%"
          >

            <feGaussianBlur
              stdDeviation="1.6"
              result="blur"
            />

            <feMerge>

              <feMergeNode
                in="blur"
              />

              <feMergeNode
                in="SourceGraphic"
              />

            </feMerge>

          </filter>

          <filter
            id="kaizen-slash-fire-blur"
            x="-70%"
            y="-70%"
            width="240%"
            height="240%"
          >

            <feGaussianBlur
              stdDeviation="5"
            />

          </filter>

        </defs>

        <!-- Huge fire aura -->

        <path
          class="kaizen-slash-aura"
          d="M -12 88 Q 35 56 112 5"
          pathLength="1"
        />

        <!-- Main fire -->

        <path
          class="kaizen-slash-fireline"
          d="M -12 88 Q 35 56 112 5"
          pathLength="1"
        />

        <!-- White hot center -->

        <path
          class="kaizen-slash-core"
          d="M -12 88 Q 35 56 112 5"
          pathLength="1"
        />

        <!-- trailing fire -->

        <path
          class="kaizen-slash-tail"
          d="M 5 79 Q 42 54 93 18"
          pathLength="1"
        />

        <path
          class="kaizen-slash-tail-second"
          d="M 15 84 Q 45 60 82 34"
          pathLength="1"
        />

      </svg>

    </div>

    <!-- =====================================================
         SLASH FRACTURE
    ====================================================== -->

    <div class="kaizen-slash-fracture">

      <span class="fracture-line fracture-a"></span>

      <span class="fracture-line fracture-b"></span>

      <span class="fracture-line fracture-c"></span>

    </div>

    <!-- =====================================================
         IMPACT
    ====================================================== -->

    <div
      class="kaizen-opening-impact"
    >

      <div
        class="impact-ring ring-one"
      ></div>

      <div
        class="impact-ring ring-two"
      ></div>

      <div
        class="impact-core"
      ></div>

    </div>

    <!-- =====================================================
         LOGO EMERGING FROM SLASH
    ====================================================== -->

    <div
      class="kaizen-opening-logo"
    >

      <div
        class="kaizen-opening-logo-english"
      >

        <span
          class="kaizen-letter"
        >
          K
        </span>

        <span
          class="kaizen-letter"
        >
          A
        </span>

        <span
          class="kaizen-letter"
        >
          I
        </span>

        <span
          class="kaizen-letter"
        >
          Z
        </span>

        <span
          class="kaizen-letter"
        >
          E
        </span>

        <span
          class="kaizen-letter"
        >
          N
        </span>

      </div>

      <div
        class="kaizen-opening-logo-japanese"
      >

        <span
          class="kaizen-jp-letter"
        >
          改
        </span>

        <span
          class="kaizen-jp-letter"
        >
          善
        </span>

      </div>

    </div>

    <!-- =====================================================
         FINAL FIRE RING
    ====================================================== -->

    <div
      class="kaizen-final-fire-ring"
    ></div>

    <div
      class="kaizen-opening-noise"
    />
  `;

  return root;
}

function injectStyles() {
  if (
    document.getElementById(
      "kaizen-opening-slash-styles"
    )
  ) {
    return;
  }

  const style =
    document.createElement("style");

  style.id =
    "kaizen-opening-slash-styles";

  style.textContent = `
    #kaizen-opening-slash {
      position: fixed;
      inset: 0;
      z-index: 2147483647;

      overflow: hidden;

      pointer-events: none;

      background:
        #020202;

      opacity: 1;

      isolation: isolate;

      font-family:
        Inter,
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;
    }

    #kaizen-opening-slash.is-exiting {
      animation:
        kaizen-opening-exit
        900ms
        cubic-bezier(.76,0,.24,1)
        forwards;
    }

    /* ======================================================
       BLACK
    ======================================================= */

    .kaizen-opening-blackout {
      position: absolute;
      inset: 0;

      background:
        radial-gradient(
          circle at 50% 50%,
          rgba(255,72,0,.035),
          transparent 25%
        ),
        #020202;
    }

    /* ======================================================
       FIRE BREATH
    ======================================================= */

    .kaizen-opening-atmosphere {
      position: absolute;
      inset: 0;

      overflow: hidden;
    }

    .kaizen-opening-breath {
      position: absolute;

      left: 50%;
      top: 50%;

      border-radius: 50%;

      opacity: 0;

      mix-blend-mode: screen;
    }

    .breath-one {
      width: 22vw;
      height: 22vw;

      min-width: 180px;
      min-height: 180px;

      transform:
        translate(-50%,-50%)
        scale(.35);

      background:
        radial-gradient(
          circle,
          rgba(255,95,0,.62),
          rgba(255,50,0,.2) 43%,
          transparent 72%
        );

      filter: blur(64px);

      animation:
        kaizen-breath-one
        3200ms
        ease-out
        forwards;
    }

    .breath-two {
      width: 30vw;
      height: 30vw;

      min-width: 250px;
      min-height: 250px;

      transform:
        translate(-50%,-50%)
        scale(.3);

      background:
        radial-gradient(
          circle,
          rgba(255,148,0,.34),
          rgba(255,69,0,.11) 44%,
          transparent 75%
        );

      filter: blur(80px);

      animation:
        kaizen-breath-two
        3500ms
        ease-in-out
        forwards;
    }

    .breath-three {
      width: 65vw;
      height: 18vw;

      min-width: 0;
      min-height: 0;

      background:
        linear-gradient(
          100deg,
          transparent,
          rgba(255,61,0,.12),
          rgba(255,132,0,.16),
          transparent
        );

      filter: blur(44px);

      animation:
        kaizen-breath-three
        3400ms
        ease-out
        forwards;
    }

    /* ======================================================
       FLAMES AROUND EDGES
    ======================================================= */

    .kaizen-flames {
      position: absolute;
      inset: 0;

      overflow: hidden;

      opacity: .9;
    }

    .flame {
      position: absolute;

      width: 78px;
      height: 150px;

      border-radius:
        55% 45% 55% 45%;

      background:
        radial-gradient(
          ellipse at 50% 80%,
          rgba(255,239,194,.98) 0%,
          rgba(255,166,34,.92) 24%,
          rgba(255,76,0,.7) 52%,
          rgba(190,24,0,.08) 78%,
          transparent 100%
        );

      filter:
        blur(1px)
        drop-shadow(
          0 0 22px
          rgba(255,91,0,.72)
        );

      opacity: 0;

      mix-blend-mode: screen;
    }

    .flame::before {
      content: "";

      position: absolute;

      left: 23%;
      top: -22%;

      width: 59%;
      height: 68%;

      border-radius:
        50% 50% 45% 55%;

      background:
        radial-gradient(
          ellipse at 50% 82%,
          rgba(255,248,218,.98),
          rgba(255,165,28,.74) 38%,
          transparent 75%
        );

      transform:
        rotate(-10deg);
    }

    .flame::after {
      content: "";

      position: absolute;

      left: 39%;
      bottom: 7%;

      width: 23%;
      height: 45%;

      border-radius: 50%;

      background:
        linear-gradient(
          to top,
          rgba(255,250,224,.98),
          rgba(255,198,57,.76),
          transparent
        );

      filter: blur(1px);
    }

    .flame-a {
      animation:
        kaizen-flame-rise
        1400ms
        ease-out
        1
        700ms
        forwards;
    }

    .flame-b {
      animation:
        kaizen-flame-rise
        1550ms
        ease-out
        1
        830ms
        forwards;
    }

    .flame-c {
      animation:
        kaizen-flame-rise
        1250ms
        ease-out
        1
        940ms
        forwards;
    }

    .flame-left {
      bottom: -1%;
      transform-origin:
        bottom center;
    }

    .flame-left.flame-a {
      left: 2%;
      transform:
        rotate(-13deg)
        scale(.82);
    }

    .flame-left.flame-b {
      left: 10%;
      transform:
        rotate(8deg)
        scale(.57);
    }

    .flame-left.flame-c {
      left: 18%;
      transform:
        rotate(-8deg)
        scale(.42);
    }

    .flame-right {
      bottom: -1%;
      transform-origin:
        bottom center;
    }

    .flame-right.flame-a {
      right: 2%;
      transform:
        rotate(13deg)
        scale(.82);
    }

    .flame-right.flame-b {
      right: 10%;
      transform:
        rotate(-8deg)
        scale(.57);
    }

    .flame-right.flame-c {
      right: 18%;
      transform:
        rotate(7deg)
        scale(.42);
    }

    .flame-top {
      top: -5%;
    }

    .flame-top.flame-a {
      left: 36%;
      transform:
        rotate(180deg)
        scale(.42);
    }

    .flame-top.flame-b {
      right: 34%;
      transform:
        rotate(180deg)
        scale(.35);
    }

    .flame-bottom {
      bottom: -2%;
    }

    .flame-bottom.flame-a {
      left: 40%;
      transform:
        scale(.6);
    }

    .flame-bottom.flame-b {
      right: 39%;
      transform:
        scale(.48);
    }

    /* ======================================================
       EMBERS
    ======================================================= */

    .kaizen-opening-embers {
      position: absolute;
      inset: 0;

      overflow: hidden;
    }

    .kaizen-opening-particle {
      position: absolute;

      left: 50%;
      top: 50%;

      width:
        var(--particle-size);

      height:
        var(--particle-size);

      border-radius: 50%;

      background:
        radial-gradient(
          circle,
          #fff6d8 0%,
          #ffbd55 36%,
          #ff5a00 68%,
          transparent 100%
        );

      box-shadow:
        0 0
        calc(
          var(--particle-size) * 2.5
        )
        rgba(255,83,0,.65);

      opacity: 0;

      transform:
        translate(-50%,-50%)
        scale(.3)
        rotate(
          var(--particle-rotation)
        );

      animation:
        kaizen-particle-burst
        var(--particle-duration)
        cubic-bezier(.15,.75,.22,1)
        var(--particle-delay)
        forwards;
    }

    /* ======================================================
       IMPACT FLASH
    ======================================================= */

    .kaizen-opening-flash {
      position: absolute;

      left: 50%;
      top: 50%;

      width: 11vw;
      height: 11vw;

      min-width: 110px;
      min-height: 110px;

      transform:
        translate(-50%,-50%);

      border-radius: 50%;

      background:
        radial-gradient(
          circle,
          rgba(255,255,255,.97) 0%,
          rgba(255,228,176,.86) 12%,
          rgba(255,125,0,.5) 30%,
          rgba(255,60,0,.15) 55%,
          transparent 74%
        );

      filter: blur(11px);

      mix-blend-mode: screen;

      opacity: 0;

      animation:
        kaizen-impact-flash
        3200ms
        cubic-bezier(.2,.8,.2,1)
        forwards;
    }

    /* ======================================================
       THE ACTUAL KATANA SLASH
       NO KATANA IS EVER SHOWN.
    ======================================================= */

    .kaizen-opening-slash-wrap {
      position: absolute;
      inset: 0;

      overflow: hidden;

      transform:
        scale(1.04);
    }

    .kaizen-opening-svg {
      position: absolute;

      inset: -8%;

      width: 116%;
      height: 116%;

      overflow: visible;
    }

    .kaizen-slash-aura {
      fill: none;

      stroke:
        rgba(255,74,0,.5);

      stroke-width: 9;

      stroke-linecap: round;

      filter:
        url(#kaizen-slash-fire-blur);

      stroke-dasharray: 1;
      stroke-dashoffset: 1;

      animation:
        kaizen-slash-draw
        600ms
        cubic-bezier(.74,0,.2,1)
        620ms
        forwards;
    }

    .kaizen-slash-fireline {
      fill: none;

      stroke:
        url(#kaizen-slash-fire);

      stroke-width: 4.2;

      stroke-linecap: round;

      filter:
        url(#kaizen-slash-glow);

      stroke-dasharray: 1;
      stroke-dashoffset: 1;

      animation:
        kaizen-slash-draw
        500ms
        cubic-bezier(.74,0,.2,1)
        650ms
        forwards;
    }

    .kaizen-slash-core {
      fill: none;

      stroke:
        rgba(255,249,226,.99);

      stroke-width: 1.05;

      stroke-linecap: round;

      filter:
        drop-shadow(
          0 0 5px
          rgba(255,255,255,.98)
        )
        drop-shadow(
          0 0 16px
          rgba(255,139,24,.95)
        );

      stroke-dasharray: 1;
      stroke-dashoffset: 1;

      animation:
        kaizen-slash-draw
        390ms
        cubic-bezier(.82,0,.14,1)
        680ms
        forwards;
    }

    .kaizen-slash-tail {
      fill: none;

      stroke:
        rgba(255,115,0,.38);

      stroke-width: 1.8;

      stroke-linecap: round;

      filter:
        drop-shadow(
          0 0 8px
          rgba(255,88,0,.75)
        );

      stroke-dasharray: 1;
      stroke-dashoffset: 1;

      animation:
        kaizen-slash-tail
        500ms
        cubic-bezier(.74,0,.2,1)
        760ms
        forwards;
    }

    .kaizen-slash-tail-second {
      fill: none;

      stroke:
        rgba(255,164,70,.3);

      stroke-width: 1.1;

      stroke-linecap: round;

      filter:
        drop-shadow(
          0 0 8px
          rgba(255,103,0,.5)
        );

      stroke-dasharray: 1;
      stroke-dashoffset: 1;

      animation:
        kaizen-slash-tail
        440ms
        cubic-bezier(.74,0,.2,1)
        790ms
        forwards;
    }

    /* ======================================================
       FRACTURE
    ======================================================= */

    .kaizen-slash-fracture {
      position: absolute;
      inset: 0;

      overflow: hidden;

      opacity: 0;
      animation:
        kaizen-fracture-reveal
        900ms
        ease-out
        1180ms
        forwards;
    }

    .fracture-line {
      position: absolute;

      left: 50%;
      top: 50%;

      width: 58vw;
      height: 1px;

      transform-origin:
        center;

      background:
        linear-gradient(
          90deg,
          transparent,
          rgba(255,238,200,.65),
          rgba(255,100,0,.5),
          transparent
        );

      box-shadow:
        0 0 11px
        rgba(255,89,0,.55);
    }

    .fracture-a {
      transform:
        translate(-50%,-50%)
        rotate(-39deg)
        translateY(-2px);
    }

    .fracture-b {
      transform:
        translate(-50%,-50%)
        rotate(-31deg)
        translateY(3px)
        scaleX(.92);
    }

    .fracture-c {
      transform:
        translate(-50%,-50%)
        rotate(-27deg)
        translateY(7px)
        scaleX(.78);
    }

    /* ======================================================
       IMPACT RINGS
    ======================================================= */

    .kaizen-opening-impact {
      position: absolute;

      left: 50%;
      top: 50%;

      width: 1px;
      height: 1px;

      transform:
        translate(-50%,-50%);
    }

    .impact-ring {
      position: absolute;

      left: 50%;
      top: 50%;

      border-radius: 50%;

      border:
        1px solid
        rgba(255,126,22,.52);

      transform:
        translate(-50%,-50%)
        scale(.1);

      opacity: 0;
    }

    .ring-one {
      width: 7vw;
      height: 7vw;

      min-width: 100px;
      min-height: 100px;

      animation:
        kaizen-impact-ring
        1200ms
        cubic-bezier(.12,.7,.22,1)
        900ms
        forwards;
    }

    .ring-two {
      width: 15vw;
      height: 15vw;

      min-width: 220px;
      min-height: 220px;

      border-color:
        rgba(255,73,0,.18);

      animation:
        kaizen-impact-ring
        1500ms
        cubic-bezier(.12,.7,.22,1)
        930ms
        forwards;
    }

    .impact-core {
      position: absolute;

      left: 50%;
      top: 50%;

      width: 16px;
      height: 16px;

      border-radius: 50%;

      transform:
        translate(-50%,-50%)
        scale(.2);

      background:
        #fff7da;

      box-shadow:
        0 0 9px #fff,
        0 0 30px
        rgba(255,164,65,.98),
        0 0 90px
        rgba(255,71,0,.75);

      opacity: 0;

      animation:
        kaizen-impact-core
        700ms
        cubic-bezier(.12,.7,.22,1)
        900ms
        forwards;
    }

    /* ======================================================
       KAIZEN
       COMES OUT OF THE SLASH
    ======================================================= */

    .kaizen-opening-logo {
      position: absolute;

      left: 50%;
      top: 50%;

      display: flex;

      flex-direction: column;

      align-items: center;

      justify-content: center;

      transform:
        translate(-50%,-50%)
        scale(.92);

      opacity: 0;

      /*
       * The logo itself waits for the slash
       * to open before beginning.
       */

      animation:
        kaizen-logo-container
        2900ms
        cubic-bezier(.16,.78,.2,1)
        1450ms
        forwards;
    }

    .kaizen-opening-logo-english {
      display: flex;

      align-items: center;

      justify-content: center;

      gap:
        clamp(
          3px,
          .5vw,
          9px
        );

      white-space: nowrap;

      /*
       * Keep the English word visible while each
       * letter performs its own emergence animation.
       */

      overflow: visible;
    }

    .kaizen-letter {
      display: inline-block;

      color:
        rgba(255,248,233,.99);

      font-size:
        clamp(
          48px,
          7.4vw,
          100px
        );

      font-weight: 800;

      letter-spacing:
        -.045em;

      line-height:
        .88;

      opacity: 0;

      transform:
        translateY(35px)
        translateX(22px)
        scale(.72);

      text-shadow:
        0 0 7px
        rgba(255,255,255,.55),

        0 0 24px
        rgba(255,142,40,.9),

        0 0 70px
        rgba(255,62,0,.72);

      /*
       * Each letter begins at a slightly
       * different position around the slash.
       */

      animation:
        kaizen-letter-emerge
        560ms
        cubic-bezier(.14,.82,.18,1)
        forwards;
    }

    /*
     * One letter at a time.
     */

    .kaizen-letter:nth-child(1) {
      animation-delay:
        1510ms;
    }

    .kaizen-letter:nth-child(2) {
      animation-delay:
        1650ms;
    }

    .kaizen-letter:nth-child(3) {
      animation-delay:
        1790ms;
    }

    .kaizen-letter:nth-child(4) {
      animation-delay:
        1930ms;
    }

    .kaizen-letter:nth-child(5) {
      animation-delay:
        2070ms;
    }

    .kaizen-letter:nth-child(6) {
      animation-delay:
        2210ms;
    }

    /* ======================================================
       JAPANESE BELOW KAIZEN
    ======================================================= */

    .kaizen-opening-logo-japanese {
      display: flex;

      align-items: center;

      justify-content: center;

      gap: 7px;

      margin-top:
        clamp(
          12px,
          1.4vw,
          20px
        );

      opacity: 0;

      transform:
        translateY(8px);

      animation:
        kaizen-japanese-reveal
        650ms
        cubic-bezier(.14,.82,.18,1)
        2850ms
        forwards;
    }

    .kaizen-jp-letter {
      display: inline-block;

      color:
        rgba(255,255,255,.72);

      font-size:
        clamp(
          17px,
          2.4vw,
          32px
        );

      font-weight: 500;

      letter-spacing:
        .2em;

      text-shadow:
        0 0 14px
        rgba(255,106,0,.48);

      opacity: 0;

      animation:
        kaizen-jp-letter
        420ms
        cubic-bezier(.18,.82,.2,1)
        forwards;
    }

    .kaizen-jp-letter:nth-child(1) {
      animation-delay:
        2860ms;
    }

    .kaizen-jp-letter:nth-child(2) {
      animation-delay:
        2940ms;
    }

    /* ======================================================
       FIRE RING AROUND LOGO
    ======================================================= */

    .kaizen-final-fire-ring {
      position: absolute;

      left: 50%;
      top: 50%;

      width:
        min(
          55vw,
          760px
        );

      height:
        min(
          28vw,
          330px
        );

      transform:
        translate(-50%,-50%)
        scale(.82);

      border-radius: 50%;

      background:
        radial-gradient(
          ellipse,
          transparent 43%,
          rgba(255,108,0,.1) 48%,
          rgba(255,69,0,.2) 52%,
          rgba(255,108,0,.08) 58%,
          transparent 68%
        );

      filter:
        blur(8px);

      opacity: 0;

      mix-blend-mode: screen;

      animation:
        kaizen-final-fire-ring
        1700ms
        ease-in-out
        1600ms
        forwards;
    }

    /* ======================================================
       NOISE
    ======================================================= */

    .kaizen-opening-noise {
      position: absolute;
      inset: 0;

      opacity: .07;

      background-image:
        radial-gradient(
          rgba(255,255,255,.5)
          .5px,
          transparent .5px
        );

      background-size: 4px 4px;

      mix-blend-mode: screen;
    }

    /* ======================================================
       ANIMATIONS
    ======================================================= */

    @keyframes kaizen-slash-draw {
      0% {
        stroke-dashoffset: 1;
        opacity: 0;
      }

      14% {
        opacity: 1;
      }

      80% {
        opacity: 1;
      }

      100% {
        stroke-dashoffset: 0;
        opacity: .98;
      }
    }

    @keyframes kaizen-slash-tail {
      0% {
        stroke-dashoffset: 1;
        opacity: 0;
      }

      20% {
        opacity: .9;
      }

      100% {
        stroke-dashoffset: 0;
        opacity: .26;
      }
    }

    @keyframes kaizen-impact-flash {
      0% {
        opacity: 0;

        transform:
          translate(-50%,-50%)
          scale(.2);
      }

      24% {
        opacity: 0;
      }

      36% {
        opacity: .95;

        transform:
          translate(-50%,-50%)
          scale(1.35);
      }

      52% {
        opacity: .25;

        transform:
          translate(-50%,-50%)
          scale(2.7);
      }

      100% {
        opacity: 0;

        transform:
          translate(-50%,-50%)
          scale(4.2);
      }
    }

    @keyframes kaizen-fracture-reveal {
      0% {
        opacity: 0;
        filter: blur(4px);
      }

      15% {
        opacity: .7;
      }

      62% {
        opacity: .42;
        filter: blur(1px);
      }

      100% {
        opacity: 0;
        filter: blur(3px);
      }
    }

    @keyframes kaizen-impact-ring {
      0% {
        opacity: 0;

        transform:
          translate(-50%,-50%)
          scale(.1);
      }

      16% {
        opacity: .88;
      }

      100% {
        opacity: 0;

        transform:
          translate(-50%,-50%)
          scale(5.8);
      }
    }

    @keyframes kaizen-impact-core {
      0% {
        opacity: 0;

        transform:
          translate(-50%,-50%)
          scale(.2);
      }

      22% {
        opacity: 1;

        transform:
          translate(-50%,-50%)
          scale(1.45);
      }

      64% {
        opacity: .8;

        transform:
          translate(-50%,-50%)
          scale(.55);
      }

      100% {
        opacity: 0;

        transform:
          translate(-50%,-50%)
          scale(.1);
      }
    }

    @keyframes kaizen-logo-container {
      0% {
        opacity: 0;

        filter: blur(12px);

        transform:
          translate(-50%,-50%)
          scale(.78);
      }

      17% {
        opacity: 1;

        filter: blur(0);

        transform:
          translate(-50%,-50%)
          scale(.92);
      }

      70% {
        opacity: 1;

        filter: blur(0);

        transform:
          translate(-50%,-50%)
          scale(1);
      }

      100% {
        opacity: 1;

        filter: blur(0);

        transform:
          translate(-50%,-50%)
          scale(1);
      }
    }

    @keyframes kaizen-letter-emerge {
      0% {
        opacity: 0;

        transform:
          translateY(35px)
          translateX(22px)
          scale(.72);

        filter:
          blur(9px);
      }

      46% {
        opacity: 1;

        transform:
          translateY(-5px)
          translateX(0)
          scale(1.06);

        filter:
          blur(0);
      }

      72% {
        opacity: 1;

        transform:
          translateY(1px)
          translateX(0)
          scale(.99);
      }

      100% {
        opacity: 1;

        transform:
          translateY(0)
          translateX(0)
          scale(1);

        filter:
          blur(0);
      }
    }

    @keyframes kaizen-japanese-reveal {
      0% {
        opacity: 0;

        transform:
          translateY(12px)
          scale(.92);

        filter: blur(4px);
      }

      100% {
        opacity: 1;

        transform:
          translateY(0)
          scale(1);

        filter: blur(0);
      }
    }

    @keyframes kaizen-jp-letter {
      0% {
        opacity: 0;

        transform:
          translateY(11px);
      }

      100% {
        opacity: 1;

        transform:
          translateY(0);
      }
    }

    @keyframes kaizen-final-fire-ring {
      0% {
        opacity: 0;

        transform:
          translate(-50%,-50%)
          scale(.75);
      }

      25% {
        opacity: .65;
      }

      65% {
        opacity: .32;
      }

      100% {
        opacity: 0;

        transform:
          translate(-50%,-50%)
          scale(1.08);
      }
    }

    @keyframes kaizen-breath-one {
      0% {
        opacity: 0;

        transform:
          translate(-50%,-50%)
          scale(.35);
      }

      22% {
        opacity: .5;
      }

      54% {
        opacity: .22;

        transform:
          translate(-50%,-50%)
          scale(1.45);
      }

      100% {
        opacity: 0;

        transform:
          translate(-50%,-50%)
          scale(2.35);
      }
    }

    @keyframes kaizen-breath-two {
      0% {
        opacity: 0;

        transform:
          translate(-50%,-50%)
          scale(.3);
      }

      30% {
        opacity: .28;
      }

      68% {
        opacity: .12;

        transform:
          translate(-50%,-50%)
          scale(1.4);
      }

      100% {
        opacity: 0;

        transform:
          translate(-50%,-50%)
          scale(2.15);
      }
    }

    @keyframes kaizen-breath-three {
      0% {
        opacity: 0;

        transform:
          translate(-50%,-50%)
          scaleX(.4);
      }

      30% {
        opacity: .18;
      }

      65% {
        opacity: .1;

        transform:
          translate(-50%,-50%)
          scaleX(1.15);
      }

      100% {
        opacity: 0;

        transform:
          translate(-50%,-50%)
          scaleX(1.7);
      }
    }

    @keyframes kaizen-flame-rise {
      0% {
        opacity: 0;

        filter:
          blur(5px)
          drop-shadow(
            0 0 5px
            rgba(255,91,0,.3)
          );

        transform:
          translateY(40px)
          scale(.7);
      }

      30% {
        opacity: .78;
      }

      68% {
        opacity: .7;

        filter:
          blur(1px)
          drop-shadow(
            0 0 25px
            rgba(255,91,0,.75)
          );
      }

      100% {
        opacity: 0;

        filter:
          blur(4px)
          drop-shadow(
            0 0 5px
            rgba(255,91,0,.2)
          );

        transform:
          translateY(-42px)
          scale(1.07);
      }
    }

    @keyframes kaizen-particle-burst {
      0% {
        opacity: 0;

        transform:
          translate(-50%,-50%)
          scale(.25)
          rotate(
            var(--particle-rotation)
          );
      }

      16% {
        opacity: .95;
      }

      62% {
        opacity: .68;
      }

      100% {
        opacity: 0;

        transform:
          translate(
            var(--particle-x),
            var(--particle-y)
          )
          scale(.08)
          rotate(
            var(--particle-rotation)
          );
      }
    }

    @keyframes kaizen-opening-exit {
      0% {
        opacity: 1;
      }

      55% {
        opacity: 1;
      }

      100% {
        opacity: 0;
      }
    }

    @media (max-width: 700px) {

      .kaizen-opening-logo {
        top: 50%;
      }

      .kaizen-letter {
        font-size:
          clamp(
            40px,
            12vw,
            70px
          );
      }

      .kaizen-opening-logo-english {
        gap: 2px;
      }

      .flame {
        width: 54px;
        height: 108px;
      }

      .fracture-line {
        width: 78vw;
      }

    }

    @media (prefers-reduced-motion: reduce) {

      #kaizen-opening-slash {
        animation: none;
      }

      .kaizen-opening-slash-wrap,
      .kaizen-opening-atmosphere,
      .kaizen-opening-flash,
      .kaizen-opening-impact,
      .kaizen-flames,
      .kaizen-opening-logo,
      .kaizen-final-fire-ring {
        display: none;
      }

    }
  `;

  document.head.appendChild(
    style
  );
}

export function startKaizenOpeningSlash() {
  if (
    typeof document ===
    "undefined"
  ) {
    return;
  }

  if (
    document.getElementById(
      "kaizen-opening-slash"
    )
  ) {
    return;
  }

  injectStyles();

  const intro =
    buildIntro();

  document.body.prepend(
    intro
  );

  /*
   * =====================================================
   * EMBER BURST
   * =====================================================
   */

  const particleContainer =
    intro.querySelector(
      ".kaizen-opening-embers"
    );

  if (particleContainer) {
    const particleCount =
      window.innerWidth < 700
        ? 42
        : 82;

    for (
      let index = 0;
      index < particleCount;
      index += 1
    ) {
      particleContainer.appendChild(
        createParticle(
          index,
          particleCount
        )
      );
    }
  }

  /*
   * =====================================================
   * REDUCED MOTION
   * =====================================================
   */

  if (
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
  ) {
    window.setTimeout(() => {
      intro.remove();

      document
        .getElementById(
          "kaizen-opening-slash-styles"
        )
        ?.remove();
    }, 400);

    return;
  }

  /*
   * =====================================================
   * EXIT
   *
   * Logo gets enough time to finish:
   *
   * K
   *  A
   *   I
   *    Z
   *     E
   *      N
   *
   * followed by 改善.
   * =====================================================
   */

  window.setTimeout(() => {
    intro.classList.add(
      "is-exiting"
    );
  }, 3350);

  window.setTimeout(() => {
    intro.remove();

    document
      .getElementById(
        "kaizen-opening-slash-styles"
      )
      ?.remove();
  }, INTRO_DURATION);
}

export default startKaizenOpeningSlash;