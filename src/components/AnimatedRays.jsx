import { cn } from "../lib/utils";

function AnimatedRays({ className = "" }) {
  return (
    <div
      className={cn("animated-rays", className)}
      aria-hidden="true"
    >
      <style>{`
        /* =========================================================
           ANIMATED RAYS
        ========================================================= */

        .animated-rays {
          position: fixed;
          inset: 0;

          width: 100vw;
          height: 100vh;

          overflow: hidden;
          pointer-events: none;

          z-index: 0;

          background: #020304;

          isolation: isolate;
        }

        /* =========================================================
           DEEP BLACK BASE
        ========================================================= */

        .animated-rays-base {
          position: absolute;
          inset: 0;

          background:
            radial-gradient(
              ellipse at 75% 15%,
              rgba(20, 30, 55, 0.25),
              transparent 45%
            ),
            radial-gradient(
              ellipse at 20% 85%,
              rgba(20, 25, 45, 0.18),
              transparent 50%
            ),
            #020304;
        }

        /* =========================================================
           RAY CONTAINER
        ========================================================= */

        .animated-rays-field {
          position: absolute;

          inset: -40%;

          width: 180%;
          height: 180%;

          transform: rotate(-8deg);

          filter: blur(18px);

          opacity: 1;

          will-change: transform;
        }

        /* =========================================================
           INDIVIDUAL RAYS
        ========================================================= */

        .animated-ray {
          position: absolute;

          top: -20%;

          height: 145%;

          border-radius: 999px;

          filter: blur(25px);

          mix-blend-mode: screen;

          will-change: transform;

          background: linear-gradient(
            to bottom,
            transparent 0%,
            transparent 8%,
            var(--ray-color) 28%,
            var(--ray-color) 68%,
            transparent 92%,
            transparent 100%
          );
        }

        /* BLUE */

        .animated-ray-one {
          left: 12%;

          width: 11%;

          --ray-color: rgba(45, 115, 255, 0.85);

          transform: rotate(7deg);

          animation:
            ray-one 16s ease-in-out infinite alternate;
        }

        /* PURPLE */

        .animated-ray-two {
          left: 29%;

          width: 13%;

          --ray-color: rgba(155, 45, 235, 0.82);

          transform: rotate(5deg);

          animation:
            ray-two 20s ease-in-out infinite alternate;
        }

        /* CYAN */

        .animated-ray-three {
          left: 47%;

          width: 14%;

          --ray-color: rgba(20, 190, 220, 0.82);

          transform: rotate(6deg);

          animation:
            ray-three 18s ease-in-out infinite alternate;
        }

        /* TEAL */

        .animated-ray-four {
          left: 66%;

          width: 13%;

          --ray-color: rgba(20, 210, 175, 0.78);

          transform: rotate(7deg);

          animation:
            ray-four 22s ease-in-out infinite alternate;
        }

        /* BLUE / CYAN */

        .animated-ray-five {
          left: 83%;

          width: 12%;

          --ray-color: rgba(45, 135, 255, 0.82);

          transform: rotate(5deg);

          animation:
            ray-five 19s ease-in-out infinite alternate;
        }

        /* =========================================================
           EXTRA BRIGHT CORE
        ========================================================= */

        .animated-ray-core {
          position: absolute;

          top: -15%;

          height: 130%;

          border-radius: 999px;

          filter: blur(35px);

          mix-blend-mode: screen;

          opacity: 0.7;

          pointer-events: none;

          will-change: transform;
        }

        .animated-ray-core-one {
          left: 17%;

          width: 3.5%;

          background: rgba(65, 135, 255, 0.7);

          animation:
            core-one 16s ease-in-out infinite alternate;
        }

        .animated-ray-core-two {
          left: 34%;

          width: 4%;

          background: rgba(195, 60, 255, 0.62);

          animation:
            core-two 20s ease-in-out infinite alternate;
        }

        .animated-ray-core-three {
          left: 53%;

          width: 4%;

          background: rgba(45, 225, 240, 0.68);

          animation:
            core-three 18s ease-in-out infinite alternate;
        }

        .animated-ray-core-four {
          left: 72%;

          width: 4%;

          background: rgba(50, 235, 200, 0.62);

          animation:
            core-four 22s ease-in-out infinite alternate;
        }

        .animated-ray-core-five {
          left: 88%;

          width: 3.5%;

          background: rgba(65, 145, 255, 0.65);

          animation:
            core-five 19s ease-in-out infinite alternate;
        }

        /* =========================================================
           ATMOSPHERIC BLUR
        ========================================================= */

        .animated-rays-atmosphere {
          position: absolute;

          inset: -20%;

          background:
            radial-gradient(
              ellipse 20% 75% at 15% 35%,
              rgba(35, 100, 255, 0.18),
              transparent 70%
            ),
            radial-gradient(
              ellipse 18% 80% at 36% 30%,
              rgba(170, 45, 235, 0.15),
              transparent 70%
            ),
            radial-gradient(
              ellipse 20% 80% at 57% 30%,
              rgba(20, 190, 220, 0.17),
              transparent 70%
            ),
            radial-gradient(
              ellipse 18% 80% at 76% 30%,
              rgba(20, 210, 180, 0.15),
              transparent 70%
            ),
            radial-gradient(
              ellipse 17% 80% at 92% 30%,
              rgba(45, 120, 255, 0.16),
              transparent 70%
            );

          filter: blur(60px);

          opacity: 0.9;

          animation:
            atmosphere-drift 26s ease-in-out infinite alternate;

          will-change: transform;
        }

        /* =========================================================
           DARK VIGNETTE
        ========================================================= */

        .animated-rays-vignette {
          position: absolute;

          inset: 0;

          background:
            linear-gradient(
              to bottom,
              rgba(0, 0, 0, 0.15),
              transparent 25%,
              transparent 65%,
              rgba(0, 0, 0, 0.42)
            ),
            radial-gradient(
              ellipse at center,
              transparent 30%,
              rgba(0, 0, 0, 0.28) 75%,
              rgba(0, 0, 0, 0.62) 100%
            );

          z-index: 10;

          pointer-events: none;
        }

        /* =========================================================
           RAY ANIMATIONS
        ========================================================= */

        @keyframes ray-one {
          0% {
            transform:
              translate3d(-7vw, -4vh, 0)
              rotate(7deg)
              scaleY(1);
          }

          50% {
            transform:
              translate3d(4vw, 3vh, 0)
              rotate(9deg)
              scaleY(1.04);
          }

          100% {
            transform:
              translate3d(-2vw, 8vh, 0)
              rotate(6deg)
              scaleY(0.98);
          }
        }

        @keyframes ray-two {
          0% {
            transform:
              translate3d(5vw, 5vh, 0)
              rotate(5deg)
              scaleY(1);
          }

          50% {
            transform:
              translate3d(-5vw, -2vh, 0)
              rotate(3deg)
              scaleY(1.05);
          }

          100% {
            transform:
              translate3d(3vw, 7vh, 0)
              rotate(7deg)
              scaleY(0.96);
          }
        }

        @keyframes ray-three {
          0% {
            transform:
              translate3d(-4vw, 4vh, 0)
              rotate(6deg)
              scaleY(1);
          }

          50% {
            transform:
              translate3d(6vw, -4vh, 0)
              rotate(8deg)
              scaleY(1.06);
          }

          100% {
            transform:
              translate3d(-2vw, 5vh, 0)
              rotate(5deg)
              scaleY(0.97);
          }
        }

        @keyframes ray-four {
          0% {
            transform:
              translate3d(4vw, -3vh, 0)
              rotate(7deg)
              scaleY(1);
          }

          50% {
            transform:
              translate3d(-6vw, 5vh, 0)
              rotate(5deg)
              scaleY(1.05);
          }

          100% {
            transform:
              translate3d(2vw, 8vh, 0)
              rotate(8deg)
              scaleY(0.98);
          }
        }

        @keyframes ray-five {
          0% {
            transform:
              translate3d(-5vw, 2vh, 0)
              rotate(5deg)
              scaleY(1);
          }

          50% {
            transform:
              translate3d(5vw, -5vh, 0)
              rotate(7deg)
              scaleY(1.06);
          }

          100% {
            transform:
              translate3d(-3vw, 6vh, 0)
              rotate(4deg)
              scaleY(0.97);
          }
        }

        /* =========================================================
           CORE ANIMATIONS
        ========================================================= */

        @keyframes core-one {
          0% {
            transform: translate3d(-6vw, -3vh, 0) rotate(7deg);
          }

          50% {
            transform: translate3d(4vw, 3vh, 0) rotate(9deg);
          }

          100% {
            transform: translate3d(-2vw, 7vh, 0) rotate(6deg);
          }
        }

        @keyframes core-two {
          0% {
            transform: translate3d(5vw, 4vh, 0) rotate(5deg);
          }

          50% {
            transform: translate3d(-5vw, -2vh, 0) rotate(3deg);
          }

          100% {
            transform: translate3d(3vw, 7vh, 0) rotate(7deg);
          }
        }

        @keyframes core-three {
          0% {
            transform: translate3d(-4vw, 3vh, 0) rotate(6deg);
          }

          50% {
            transform: translate3d(6vw, -3vh, 0) rotate(8deg);
          }

          100% {
            transform: translate3d(-2vw, 6vh, 0) rotate(5deg);
          }
        }

        @keyframes core-four {
          0% {
            transform: translate3d(4vw, -2vh, 0) rotate(7deg);
          }

          50% {
            transform: translate3d(-6vw, 5vh, 0) rotate(5deg);
          }

          100% {
            transform: translate3d(2vw, 7vh, 0) rotate(8deg);
          }
        }

        @keyframes core-five {
          0% {
            transform: translate3d(-5vw, 2vh, 0) rotate(5deg);
          }

          50% {
            transform: translate3d(5vw, -4vh, 0) rotate(7deg);
          }

          100% {
            transform: translate3d(-3vw, 6vh, 0) rotate(4deg);
          }
        }

        /* =========================================================
           ATMOSPHERE ANIMATION
        ========================================================= */

        @keyframes atmosphere-drift {
          0% {
            transform:
              translate3d(-2%, -1%, 0)
              scale(1);
          }

          50% {
            transform:
              translate3d(3%, 2%, 0)
              scale(1.04);
          }

          100% {
            transform:
              translate3d(-1%, 4%, 0)
              scale(1.02);
          }
        }

        /* =========================================================
           MOBILE
        ========================================================= */

        @media (max-width: 750px) {
          .animated-rays-field {
            inset: -50%;

            width: 200%;
            height: 200%;

            filter: blur(14px);
          }

          .animated-ray {
            filter: blur(20px);
          }

          .animated-ray-core {
            filter: blur(28px);
          }

          .animated-rays-atmosphere {
            filter: blur(45px);
          }
        }

        /* =========================================================
           REDUCED MOTION
        ========================================================= */

        @media (prefers-reduced-motion: reduce) {
          .animated-ray,
          .animated-ray-core,
          .animated-rays-atmosphere {
            animation: none;
          }
        }
      `}</style>

      {/* Dark foundation */}
      <div className="animated-rays-base"></div>

      {/* Large moving rays */}
      <div className="animated-rays-field">
        <div className="animated-ray animated-ray-one"></div>
        <div className="animated-ray animated-ray-two"></div>
        <div className="animated-ray animated-ray-three"></div>
        <div className="animated-ray animated-ray-four"></div>
        <div className="animated-ray animated-ray-five"></div>

        {/* Bright ray cores */}
        <div className="animated-ray-core animated-ray-core-one"></div>
        <div className="animated-ray-core animated-ray-core-two"></div>
        <div className="animated-ray-core animated-ray-core-three"></div>
        <div className="animated-ray-core animated-ray-core-four"></div>
        <div className="animated-ray-core animated-ray-core-five"></div>
      </div>

      {/* Soft atmospheric glow */}
      <div className="animated-rays-atmosphere"></div>

      {/* Final darkening layer */}
      <div className="animated-rays-vignette"></div>
    </div>
  );
}

export default AnimatedRays;