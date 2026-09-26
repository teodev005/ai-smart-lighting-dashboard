import React from 'react';

interface LogoProps {
  variant?: 'icon' | 'full';
  className?: string;
  size?: number;
}

export const AiSmartLightingLogo: React.FC<LogoProps> = ({
  variant = 'icon',
  className = '',
  size = 40,
}) => {
  if (variant === 'icon') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <defs>
          {/* Bulb Outline Gradient */}
          <linearGradient id="bulbGradient" x1="15" y1="15" x2="85" y2="85" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00c6ff" />
            <stop offset="50%" stopColor="#0072ff" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>

          {/* Screw Base Gradient */}
          <linearGradient id="baseGradient" x1="35" y1="70" x2="65" y2="95" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>

          {/* Golden Core Radial Glow */}
          <radialGradient id="bulbGlow" cx="50%" cy="46%" r="35%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>

          {/* Network Node Gradient */}
          <linearGradient id="nodeGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00d2ff" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>
        </defs>

        {/* Ambient Light Rays around bulb */}
        <g stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" opacity="0.9">
          <line x1="20" y1="36" x2="12" y2="33" />
          <line x1="17" y1="48" x2="8" y2="48" />
          <line x1="20" y1="60" x2="12" y2="63" />
          <line x1="77" y1="60" x2="85" y2="63" />
        </g>

        {/* WiFi wireless signal arcs (top right) */}
        <path
          d="M 68 22 A 16 16 0 0 1 82 36"
          stroke="#00c6ff"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 72 14 A 25 25 0 0 1 92 34"
          stroke="#0072ff"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Glowing bulb interior */}
        <circle cx="48" cy="42" r="22" fill="url(#bulbGlow)" />

        {/* Bulb Glass Outline */}
        <path
          d="M 33 59 C 23 51 22 36 30 26 C 39 16 57 16 66 26 C 73 34 72 49 63 59 C 60 62 59 66 59 70 L 37 70 C 37 66 36 62 33 59 Z"
          stroke="url(#bulbGradient)"
          strokeWidth="4.5"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Screw Base Bands */}
        <rect x="38" y="73" width="20" height="4.5" rx="2.25" fill="url(#baseGradient)" />
        <rect x="40" y="80" width="16" height="4.5" rx="2.25" fill="url(#baseGradient)" />
        <path d="M 43 87 C 43 90.5 45 93 48 93 C 51 93 53 90.5 53 87 Z" fill="#6366f1" />

        {/* AI Neural / Constellation circuit inside bulb */}
        <g stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="48" y1="28" x2="36" y2="40" />
          <line x1="48" y1="28" x2="60" y2="42" />
          <line x1="36" y1="40" x2="48" y2="58" />
          <line x1="60" y1="42" x2="48" y2="58" />
        </g>

        {/* Circuit Nodes */}
        <circle cx="48" cy="28" r="4.2" fill="url(#nodeGradient)" stroke="#ffffff" strokeWidth="1" />
        <circle cx="36" cy="40" r="4.2" fill="url(#nodeGradient)" stroke="#ffffff" strokeWidth="1" />
        <circle cx="60" cy="42" r="4.2" fill="url(#nodeGradient)" stroke="#ffffff" strokeWidth="1" />
        <circle cx="48" cy="58" r="3.2" fill="url(#nodeGradient)" stroke="#ffffff" strokeWidth="0.8" />
      </svg>
    );
  }

  // Full Horizontal Logo variant (matching uploaded c089f0ce-bc44-423b-9cfd-83b52fb0021d.png)
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <AiSmartLightingLogo variant="icon" size={size} />
      <div className="flex items-baseline tracking-tight">
        <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 text-xl sm:text-2xl mr-1.5 font-sans">
          AI
        </span>
        <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-400 text-xl sm:text-2xl tracking-wide uppercase font-sans">
          SMART LIGHTING
        </span>
      </div>
    </div>
  );
};
export default AiSmartLightingLogo;
