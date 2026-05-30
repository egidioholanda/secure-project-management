interface DomeCameraIconProps {
  className?: string;
}

const DomeCameraIcon = ({ className = "w-5 h-5" }: DomeCameraIconProps) => {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Outer dome hemisphere */}
      <path d="M2 14 A10 10 0 0 1 22 14 Z" />
      {/* Inner dome cutout for depth */}
      <path d="M6 14 A6 6 0 0 1 18 14 Z" opacity="0.4" />
      {/* Base ring */}
      <rect x="1" y="13" width="22" height="3" rx="1.5" />
      {/* Central lens dot */}
      <circle cx="12" cy="9" r="2.5" fill="currentColor" opacity="0.7" />
    </svg>
  );
};

export default DomeCameraIcon;
