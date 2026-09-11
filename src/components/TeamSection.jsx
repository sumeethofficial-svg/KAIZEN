import { useState } from "react";

const MEMBERS = [
  {
    id: "thejas",
    name: "Thejas U",
    role: "Creator",
    description:
      "Building KAIZEN with an obsession for clean design, useful tools and constant improvement.",

    realImage: "/team/thejas-real.jpg",
    alternateImage: "/team/thejas-tony.jpg",

    realInitial: "T",
    alternateInitial: "TS",

    realLabel: "THEJAS U",
    alternateLabel: "TONY STARK",

    realMode: "REAL WORLD",
    alternateMode: "TONY STARK MODE",

    accent: "#f97316",

    xUrl: "https://x.com/ByThejas",
    githubUrl:
      "https://github.com/ByThejas",
  },

  {
    id: "sumeeth",
    name: "Sumeeth H B",
    role: "Creator",
    description:
      "Building the vision alongside KAIZEN with ideas, perspective and creativity.",

    /* Sumeeth's actual images */
    realImage: "/team/sumeeth-real.jpg",
    alternateImage: "/team/sumeeth-alt.jpg",

    realInitial: "S",
    alternateInitial: "S",

    realLabel: "SUMEETH H B",
    alternateLabel: "SUMEETH ALT",

    realMode: "REAL WORLD",
    alternateMode: "ALTERNATE MODE",

    accent: "#fb923c",

    xUrl: "https://x.com/sumedev_",
    githubUrl:
      "https://github.com/sumeethofficial-svg",
  },
];

function XIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M18.244 2H21.5l-7.11 8.13L22.75 22h-6.617l-5.18-6.774L5.022 22H1.764l7.6-8.69L1.25 2h6.785l4.683 6.195L18.244 2Zm-1.148 17.805h1.803L6.973 4.126H5.038l12.058 15.679Z"
        fill="currentColor"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.38 7.86 10.9.58.1.79-.25.79-.56v-1.98c-3.2.7-3.88-1.36-3.88-1.36-.53-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.03 1.74 2.69 1.24 3.34.95.1-.74.4-1.24.73-1.52-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.94 10.94 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.76.11 3.05.73.81 1.18 1.84 1.18 3.1 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.07.78 2.16v3.2c0 .31.21.67.8.56A11.52 11.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

function SocialLink({
  href,
  label,
  children,
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="kaizen-team-social"
      aria-label={label}
      title={label}
    >
      {children}
    </a>
  );
}

function PhotoSide({
  image,
  initial,
  label,
  isAlternate,
}) {
  return (
    <>
      {image ? (
        <img
          src={image}
          alt={label}
          className="kaizen-team-photo"
          draggable="false"
        />
      ) : (
        <div
          className={`kaizen-team-photo-placeholder ${
            isAlternate
              ? "alternate-placeholder"
              : "real-placeholder"
          }`}
        >
          <div className="kaizen-team-initial">
            {initial}
          </div>

          <div className="kaizen-team-placeholder-label">
            {label}
          </div>
        </div>
      )}
    </>
  );
}

function TeamMemberCard({ member }) {
  const [isAlternate, setIsAlternate] =
    useState(false);

  function togglePhoto() {
    setIsAlternate((current) => !current);
  }

  return (
    <article
      className="kaizen-team-card"
      style={{
        "--team-accent": member.accent,
      }}
    >
      <button
        type="button"
        className="kaizen-team-photo-button"
        onClick={togglePhoto}
        aria-label={`Flip ${member.name} card`}
      >
        <div
          className={`kaizen-team-flip-card ${
            isAlternate
              ? "is-flipped"
              : ""
          }`}
        >
          {/* FRONT */}
          <div className="kaizen-team-face kaizen-team-front">
            <PhotoSide
              image={member.realImage}
              initial={member.realInitial}
              label={member.realLabel}
              isAlternate={false}
            />

            <div className="kaizen-team-overlay" />

            <div className="kaizen-team-badge">
              <span className="kaizen-team-dot" />
              {member.realMode}
            </div>

            <div className="kaizen-team-click">
              CLICK TO FLIP
            </div>

            <div className="kaizen-team-glow" />
          </div>

          {/* BACK */}
          <div className="kaizen-team-face kaizen-team-back">
            <PhotoSide
              image={member.alternateImage}
              initial={member.alternateInitial}
              label={member.alternateLabel}
              isAlternate={true}
            />

            <div className="kaizen-team-overlay" />

            <div className="kaizen-team-badge">
              <span className="kaizen-team-dot" />
              {member.alternateMode}
            </div>

            <div className="kaizen-team-click">
              CLICK TO FLIP
            </div>

            <div className="kaizen-team-glow" />
          </div>
        </div>
      </button>

      <div className="kaizen-team-info">
        <div className="kaizen-team-name-row">
          <div>
            <h3 className="kaizen-team-name">
              {member.name}
            </h3>

            <p className="kaizen-team-role">
              {member.role}
            </p>
          </div>

          <div className="kaizen-team-socials">
            <SocialLink
              href={member.xUrl}
              label={`${member.name} on X`}
            >
              <XIcon />
            </SocialLink>

            <SocialLink
              href={member.githubUrl}
              label={`${member.name} on GitHub`}
            >
              <GitHubIcon />
            </SocialLink>
          </div>
        </div>

        <p className="kaizen-team-description">
          {member.description}
        </p>

        <button
          type="button"
          className="kaizen-team-switch"
          onClick={togglePhoto}
        >
          {isAlternate
            ? "← Back to reality"
            : "Flip the card →"}
        </button>
      </div>
    </article>
  );
}

export default function TeamSection() {
  return (
    <section className="kaizen-team-section">
      <style>{`
        .kaizen-team-section {
          position: relative;
          width: 100%;
          box-sizing: border-box;
          margin-top: 60px;
          padding: 55px 0 48px;
          overflow: hidden;
        }

        .kaizen-team-section::before {
          content: "";
          position: absolute;
          left: 50%;
          top: 38%;
          width: 620px;
          height: 350px;
          transform: translate(-50%, -50%);
          background:
            radial-gradient(
              circle,
              rgba(249,115,22,.09),
              transparent 68%
            );
          pointer-events: none;
        }

        .kaizen-team-inner {
          position: relative;
          z-index: 1;
          width: min(780px, 100%);
          margin: 0 auto;
          padding: 0 24px;
          box-sizing: border-box;
        }

        .kaizen-team-heading {
          max-width: 590px;
          margin: 0 auto 34px;
          text-align: center;
        }

        .kaizen-team-eyebrow {
          margin: 0 0 10px;
          color: rgba(249,115,22,.98);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .22em;
          text-transform: uppercase;
        }

        .kaizen-team-title {
          margin: 0;
          color: rgba(255,255,255,.98);
          font-size: clamp(26px, 3vw, 34px);
          line-height: 1.08;
          letter-spacing: -.05em;
          font-weight: 800;
        }

        .kaizen-team-title span {
          color: rgba(255,255,255,.72);
        }

        .kaizen-team-subtitle {
          max-width: 500px;
          margin: 12px auto 0;
          color: rgba(255,255,255,.66);
          font-size: 12px;
          line-height: 1.65;
        }

        .kaizen-team-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          column-gap: 30px;
          row-gap: 20px;
        }

        .kaizen-team-card {
          position: relative;
          min-width: 0;
          padding: 6px;
          border:
            1px solid
            rgba(255,255,255,.11);
          border-radius: 18px;
          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,.065),
              rgba(255,255,255,.02)
            );
          box-shadow:
            0 15px 45px
            rgba(0,0,0,.22);
          backdrop-filter: blur(16px);
          transition:
            transform .3s ease,
            border-color .3s ease,
            box-shadow .3s ease;
        }

        .kaizen-team-card:hover {
          transform: translateY(-3px);
          border-color:
            color-mix(
              in srgb,
              var(--team-accent) 38%,
              transparent
            );
          box-shadow:
            0 20px 55px
            rgba(0,0,0,.3),
            0 0 32px
            color-mix(
              in srgb,
              var(--team-accent) 7%,
              transparent
            );
        }

        .kaizen-team-photo-button {
          width: 100%;
          padding: 0;
          border: 0;
          background: transparent;
          cursor: pointer;
          text-align: left;
          perspective: 1100px;
        }

        .kaizen-team-flip-card {
          position: relative;
          width: 100%;
          aspect-ratio: 1.18 / 1;
          transform-style: preserve-3d;
          transition:
            transform .75s
            cubic-bezier(
              .22,
              .61,
              .36,
              1
            );
        }

        .kaizen-team-flip-card.is-flipped {
          transform: rotateY(180deg);
        }

        .kaizen-team-face {
          position: absolute;
          inset: 0;
          overflow: hidden;
          border-radius: 13px;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        .kaizen-team-front {
          transform: rotateY(0deg);
        }

        .kaizen-team-back {
          transform: rotateY(180deg);
        }

        .kaizen-team-photo {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          object-position: center center;
          user-select: none;
          -webkit-user-drag: none;
        }

        .kaizen-team-photo-placeholder {
          position: absolute;
          inset: 0;

          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
        }

        .kaizen-team-photo-placeholder.real-placeholder {
          background:
            radial-gradient(
              circle at 50% 26%,
              rgba(255,255,255,.12),
              transparent 28%
            ),
            linear-gradient(
              145deg,
              #303030 0%,
              #111 100%
            );
        }

        .kaizen-team-photo-placeholder.alternate-placeholder {
          background:
            radial-gradient(
              circle at 50% 26%,
              rgba(249,115,22,.24),
              transparent 30%
            ),
            linear-gradient(
              145deg,
              #3a190c 0%,
              #0e0907 100%
            );
        }

        .kaizen-team-initial {
          width: 64px;
          height: 64px;

          display: flex;
          align-items: center;
          justify-content: center;

          border:
            1px solid
            rgba(255,255,255,.17);

          border-radius: 50%;

          background:
            rgba(255,255,255,.05);

          color:
            rgba(255,255,255,.92);

          font-size: 19px;
          font-weight: 800;
        }

        .kaizen-team-placeholder-label {
          margin-top: 9px;
          color:
            rgba(255,255,255,.48);
          font-size: 7px;
          font-weight: 700;
          letter-spacing: .15em;
          text-transform: uppercase;
        }

        .kaizen-team-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;

          background:
            linear-gradient(
              180deg,
              rgba(0,0,0,.02) 30%,
              rgba(0,0,0,.54) 100%
            );
        }

        .kaizen-team-badge {
          position: absolute;
          top: 9px;
          left: 9px;

          display: inline-flex;
          align-items: center;
          gap: 5px;

          padding: 5px 7px;

          border:
            1px solid
            rgba(255,255,255,.14);

          border-radius: 999px;

          background:
            rgba(6,6,6,.68);

          backdrop-filter: blur(10px);

          color:
            rgba(255,255,255,.84);

          font-size: 6px;
          font-weight: 800;
          letter-spacing: .12em;
        }

        .kaizen-team-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;

          background:
            var(--team-accent);

          box-shadow:
            0 0 8px
            var(--team-accent);
        }

        .kaizen-team-click {
          position: absolute;
          top: 9px;
          right: 9px;

          padding: 5px 7px;

          border:
            1px solid
            rgba(255,255,255,.11);

          border-radius: 6px;

          background:
            rgba(6,6,6,.5);

          color:
            rgba(255,255,255,.62);

          font-size: 6px;
          font-weight: 800;
          letter-spacing: .1em;
        }

        .kaizen-team-glow {
          position: absolute;
          left: 50%;
          bottom: -28%;
          width: 58%;
          aspect-ratio: 1;

          transform:
            translateX(-50%);

          border-radius: 50%;

          background:
            radial-gradient(
              circle,
              color-mix(
                in srgb,
                var(--team-accent) 17%,
                transparent
              ),
              transparent 70%
            );

          pointer-events: none;
        }

        .kaizen-team-info {
          padding:
            13px
            8px
            8px;
        }

        .kaizen-team-name-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .kaizen-team-name {
          margin: 0;

          color:
            rgba(255,255,255,.96);

          font-size: 17px;
          line-height: 1.05;
          letter-spacing: -.035em;
          font-weight: 750;
        }

        .kaizen-team-role {
          margin:
            4px
            0
            0;

          color:
            var(--team-accent);

          font-size: 8px;
          font-weight: 800;
          letter-spacing: .14em;
          text-transform: uppercase;
        }

        .kaizen-team-socials {
          display: flex;
          gap: 6px;
          flex-shrink: 0;
        }

        .kaizen-team-social {
          width: 27px;
          height: 27px;

          display: inline-flex;
          align-items: center;
          justify-content: center;

          border:
            1px solid
            rgba(255,255,255,.1);

          border-radius: 8px;

          background:
            rgba(255,255,255,.04);

          color:
            rgba(255,255,255,.52);

          text-decoration: none;

          transition:
            color .18s ease,
            background .18s ease,
            border-color .18s ease,
            transform .18s ease;
        }

        .kaizen-team-social:hover {
          color: #ffffff;

          background:
            rgba(249,115,22,.12);

          border-color:
            rgba(249,115,22,.35);

          transform:
            translateY(-1px);
        }

        .kaizen-team-description {
          margin:
            8px
            0
            0;

          color:
            rgba(255,255,255,.5);

          font-size: 9px;

          line-height:
            1.55;
        }

        .kaizen-team-switch {
          margin-top:
            9px;

          padding: 0;

          border: 0;

          background: transparent;

          color:
            rgba(255,255,255,.58);

          font-size: 8px;
          font-weight: 700;

          cursor: pointer;

          transition:
            color .18s ease;
        }

        .kaizen-team-switch:hover {
          color:
            var(--team-accent);
        }

        .kaizen-team-signature {
          margin-top:
            28px;

          text-align: center;

          color:
            rgba(255,255,255,.28);

          font-size: 7px;
          font-weight: 800;

          letter-spacing:
            .26em;

          text-transform:
            uppercase;
        }

        .kaizen-team-signature strong {
          color:
            rgba(255,255,255,.5);
        }

        @media (max-width: 650px) {
          .kaizen-team-section {
            margin-top: 42px;
            padding:
              42px
              0
              34px;
          }

          .kaizen-team-inner {
            padding:
              0
              16px;
          }

          .kaizen-team-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .kaizen-team-heading {
            margin-bottom:
              28px;
          }

          .kaizen-team-title {
            font-size:
              28px;
          }
        }

        @media (
          prefers-reduced-motion: reduce
        ) {
          .kaizen-team-card,
          .kaizen-team-flip-card,
          .kaizen-team-social,
          .kaizen-team-switch {
            transition: none;
          }
        }
      `}</style>

      <div className="kaizen-team-inner">
        <header className="kaizen-team-heading">
          <p className="kaizen-team-eyebrow">
            THE PEOPLE BEHIND KAIZEN
          </p>

          <h2 className="kaizen-team-title">
            Built by <span>us.</span>
          </h2>

          <p className="kaizen-team-subtitle">
            Two people. One idea. Keep improving,
            keep building, keep going.
          </p>
        </header>

        <div className="kaizen-team-grid">
          {MEMBERS.map((member) => (
            <TeamMemberCard
              key={member.id}
              member={member}
            />
          ))}
        </div>

        <div className="kaizen-team-signature">
          <strong>KAIZEN</strong>
          {" · "}
          改善
        </div>
      </div>
    </section>
  );
}