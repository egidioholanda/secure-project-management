interface DomeCameraIconProps {
  className?: string;
}

const DomeCameraIcon = ({ className = "w-5 h-5" }: DomeCameraIconProps) => {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Dome top */}
      <path d="M4 14 A8 8 0 0 1 20 14" />
      {/* Base plate */}
      <rect x="3" y="14" width="18" height="3" rx="1" />
      {/* Lens dot */}
      <circle cx="12" cy="11" r="2" fill="currentColor" opacity="0.5" />
    </svg>
  );
};

export default DomeCameraIcon;
