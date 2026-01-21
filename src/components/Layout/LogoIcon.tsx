export const LogoIcon = ({ className = "w-10 h-10" }: { className?: string }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Shield background */}
      <path
        d="M50 5 L90 20 V50 C90 75 70 90 50 95 C30 90 10 75 10 50 V20 L50 5Z"
        fill="currentColor"
        className="text-primary"
      />
      
      {/* Letter S */}
      <text
        x="22"
        y="38"
        fontSize="20"
        fontWeight="bold"
        fill="white"
        fontFamily="Arial, sans-serif"
      >
        S
      </text>
      
      {/* Chart bars */}
      <rect x="25" y="55" width="10" height="25" fill="white" opacity="0.9" rx="1" />
      <rect x="40" y="45" width="10" height="35" fill="white" opacity="0.9" rx="1" />
      <rect x="55" y="35" width="10" height="45" fill="white" opacity="0.9" rx="1" />
      
      {/* Arrow going up */}
      <path
        d="M30 60 L45 48 L55 55 L75 25"
        stroke="white"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M65 25 L75 25 L75 35"
        stroke="white"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Gear icon */}
      <circle cx="78" cy="72" r="14" fill="currentColor" className="text-primary" stroke="white" strokeWidth="2" />
      <circle cx="78" cy="72" r="6" fill="white" />
      {/* Gear teeth */}
      <g fill="currentColor" className="text-primary">
        <rect x="76" y="56" width="4" height="6" rx="1" />
        <rect x="76" y="82" width="4" height="6" rx="1" />
        <rect x="60" y="70" width="6" height="4" rx="1" />
        <rect x="90" y="70" width="6" height="4" rx="1" />
        <rect x="64" y="60" width="5" height="4" rx="1" transform="rotate(45 66.5 62)" />
        <rect x="87" y="78" width="5" height="4" rx="1" transform="rotate(45 89.5 80)" />
        <rect x="64" y="80" width="5" height="4" rx="1" transform="rotate(-45 66.5 82)" />
        <rect x="87" y="62" width="5" height="4" rx="1" transform="rotate(-45 89.5 64)" />
      </g>
    </svg>
  );
};
