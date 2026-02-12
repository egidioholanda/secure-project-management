interface PTZCameraIconProps {
  className?: string;
}

const PTZCameraIcon = ({ className = "w-5 h-5" }: PTZCameraIconProps) => {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      {/* Mount pole */}
      <rect x="10" y="16" width="4" height="5" rx="1" />
      {/* Rotation joint */}
      <circle cx="12" cy="15" r="2.5" />
      {/* Camera body */}
      <rect x="5" y="8" width="10" height="7" rx="2" />
      {/* Lens */}
      <path d="M15 10 L20 7.5 L20 15.5 L15 13 Z" />
      {/* Pan arrows */}
      <path d="M2 11.5 L4.5 9.5 L4.5 13.5 Z" opacity="0.4" />
      <path d="M22 11.5 L19.5 9.5 L19.5 13.5 Z" opacity="0.4" />
    </svg>
  );
};

export default PTZCameraIcon;
