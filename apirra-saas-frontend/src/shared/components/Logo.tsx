type LogoProps = { className?: string };

const Logo: React.FC<LogoProps> = ({ className = "" }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <img src="/favicon.svg" alt="" className="h-7 w-7" />
    <span className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
      apirra
    </span>
  </div>
);

export default Logo;
