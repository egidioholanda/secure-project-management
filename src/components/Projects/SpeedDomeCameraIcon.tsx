interface SpeedDomeCameraIconProps {
  className?: string;
}

const SpeedDomeCameraIcon = ({ className = "w-5 h-5" }: SpeedDomeCameraIconProps) => {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Pendant mount */}
      <rect x="10" y="2" width="4" height="4" rx="1" />
      {/* Neck */}
      <rect x="11" y="6" width="2" height="2" />
      {/* Dome sphere */}
      <circle cx="12" cy="13" r="6" />
      {/* Lens area */}
      <circle cx="12" cy="15" r="2.5" fill="currentColor" opacity="0.4" />
      {/* Speed rotation indicator */}
      <path
        d="M5.5 10 A7.5 7.5 0 0 1 18.5 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.3"
        strokeDasharray="2 2"
      />
    </svg>
  );
};

export default SpeedDomeCameraIcon;
