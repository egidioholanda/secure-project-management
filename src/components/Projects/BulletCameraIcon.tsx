interface BulletCameraIconProps {
  className?: string;
}

const BulletCameraIcon = ({ className = "w-5 h-5" }: BulletCameraIconProps) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      {/* Camera body - rounded rectangle */}
      <rect
        x="2"
        y="7"
        width="14"
        height="10"
        rx="2"
        ry="2"
      />
      {/* Lens/front cone */}
      <path
        d="M16 9 L22 6 L22 18 L16 15 Z"
      />
    </svg>
  );
};

export default BulletCameraIcon;
