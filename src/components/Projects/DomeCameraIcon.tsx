interface DomeCameraIconProps {
  className?: string;
}

const DomeCameraIcon = ({ className = "w-5 h-5" }: DomeCameraIconProps) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Top mounting cap */}
      <rect x="4" y="4" width="16" height="2.5" rx="0.5" fill="currentColor" />
      {/* Thin ring under cap */}
      <rect x="5" y="7" width="14" height="1" rx="0.3" fill="currentColor" />
      {/* Dome body (sphere) */}
      <path d="M4.5 9 A7.5 7.5 0 0 0 19.5 9 Z" fill="currentColor" />
      {/* Lens outer ring */}
      <circle cx="12" cy="13.5" r="3.2" fill="none" stroke="hsl(var(--primary-foreground))" strokeWidth="1" />
      {/* Lens middle ring */}
      <circle cx="12" cy="13.5" r="1.8" fill="none" stroke="hsl(var(--primary-foreground))" strokeWidth="0.8" />
      {/* Lens center */}
      <circle cx="12" cy="13.5" r="0.8" fill="hsl(var(--primary-foreground))" />
    </svg>
  );
};

export default DomeCameraIcon;
