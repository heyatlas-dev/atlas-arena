import React from 'react';

interface AtlasLogoProps {
  className?: string;
  size?: number;
}

export const AtlasLogo: React.FC<AtlasLogoProps> = ({ className = 'w-7 h-7', size = 28 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 108 108"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="shieldGrad" x1="26" y1="20" x2="82" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2B2D31" />
          <stop offset="100%" stopColor="#18191C" />
        </linearGradient>
        <linearGradient id="aGrad" x1="38" y1="36" x2="70" y2="76" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00F5D4" />
          <stop offset="50%" stopColor="#5865F2" />
          <stop offset="100%" stopColor="#7289DA" />
        </linearGradient>
      </defs>

      {/* Stadium Ring Halo Glow */}
      <circle cx="54" cy="54" r="42" stroke="#5865F2" strokeWidth="2" strokeOpacity="0.35" />

      {/* Hexagonal Arena Shield */}
      <path
        d="M54 20 L82 34 L82 72 L54 88 L26 72 L26 34 Z"
        fill="url(#shieldGrad)"
        stroke="#5865F2"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Champion Star at top vertex */}
      <polygon
        points="54,23 55.5,27 59.5,27.5 56.5,30 57.5,34 54,32 50.5,34 51.5,30 48.5,27.5 52.5,27"
        fill="#FACC15"
      />

      {/* Futuristic Stylized "A" Monogram */}
      <path
        d="M54 36 L70 76 L62 76 L58 66 L50 66 L46 76 L38 76 Z M54 48 L51.5 60 L56.5 60 Z"
        fill="url(#aGrad)"
      />

      {/* Crossbar Neon Energy Accent */}
      <line x1="48" y1="63" x2="60" y2="63" stroke="#00F5D4" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};
