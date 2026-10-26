type LogoProps = { className?: string };

// Inline (rather than <img src="/favicon.svg">) so the mark picks up the
// theme tokens and inverts in dark mode.
const Logo: React.FC<LogoProps> = ({ className = "" }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <svg viewBox="0 0 64 64" className="h-7 w-7" aria-hidden="true">
      <rect x="4" y="4" width="56" height="56" rx="12" fill="var(--color-ink)" />
      <path
        d="M24 21L15 32L24 43M40 21L49 32L40 43"
        fill="none"
        stroke="var(--color-paper)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="32" r="4.5" fill="#5FC4A4" />
    </svg>
    <span className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
      apirra
    </span>
  </div>
);

export default Logo;
