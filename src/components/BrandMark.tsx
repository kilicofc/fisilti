import React, { useId } from 'react';

export function FisiltiLogo({ className = 'w-10 h-10' }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  const bgId = `fisilti-bg-${uid}`;
  const skinId = `fisilti-skin-${uid}`;
  const waveId = `fisilti-wave-${uid}`;

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={bgId} x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#25D366" />
          <stop offset="52%" stopColor="#00A884" />
          <stop offset="100%" stopColor="#005C4B" />
        </linearGradient>
        <linearGradient id={skinId} x1="32" y1="12" x2="32" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#D9FDD3" />
        </linearGradient>
        <linearGradient id={waveId} x1="12" y1="22" x2="52" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E7FCE3" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#A7F3D0" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* Squircle luxury medallion base */}
      <rect x="3" y="3" width="58" height="58" rx="18" fill={`url(#${bgId})`} />
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="17"
        stroke="#FFFFFF"
        strokeOpacity="0.22"
        strokeWidth="1.2"
      />

      {/* Acoustic whisper waves radiating gently on left & right */}
      <path
        d="M14.5 23.5C12.2 26.8 12.2 31.2 14.5 34.5"
        stroke={`url(#${waveId})`}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10.5 20.5C7.4 25.5 7.4 32.5 10.5 37.5"
        stroke={`url(#${waveId})`}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.6"
      />
      <path
        d="M49.5 23.5C51.8 26.8 51.8 31.2 49.5 34.5"
        stroke={`url(#${waveId})`}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M53.5 20.5C56.6 25.5 56.6 32.5 53.5 37.5"
        stroke={`url(#${waveId})`}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.6"
      />

      {/* Hooded / sleek editorial bust & head silhouette */}
      <path
        d="M15.5 52.5C16.2 44.2 22.1 39.2 32 39.2C41.9 39.2 47.8 44.2 48.5 52.5C44.2 55.3 38.4 57 32 57C25.6 57 19.8 55.3 15.5 52.5Z"
        fill={`url(#${skinId})`}
        fillOpacity="0.94"
      />
      {/* Sculpted head & jawline */}
      <path
        d="M32 12.5C25.5 12.5 21.4 17.1 21.4 23.5C21.4 29.8 25.8 35.8 32 35.8C38.2 35.8 42.6 29.8 42.6 23.5C42.6 17.1 38.5 12.5 32 12.5Z"
        fill={`url(#${skinId})`}
      />
      {/* Hair / hood shadow contour */}
      <path
        d="M21.8 21.5C22.4 15.8 26.8 12.8 32 12.8C37.2 12.8 41.6 15.8 42.2 21.5C39.8 18.6 36.2 17.3 32 17.3C27.8 17.3 24.2 18.6 21.8 21.5Z"
        fill="#005C4B"
        fillOpacity="0.22"
      />

      {/* Calm expressive brow & eyes */}
      <path
        d="M25.4 22.8C26.4 22 27.9 22 28.9 22.8"
        stroke="#005C4B"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M35.1 22.8C36.1 22 37.6 22 38.6 22.8"
        stroke="#005C4B"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Subtle lips behind index finger */}
      <path
        d="M29.4 30.2C30.8 30.8 33.2 30.8 34.6 30.2"
        stroke="#005C4B"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.7"
      />

      {/* Sleek hand & tapered index finger making the "shush" gesture */}
      <path
        d="M32 25.8C33.4 25.8 34.3 26.8 34.3 28.4V39.2H29.7V28.4C29.7 26.8 30.6 25.8 32 25.8Z"
        fill="#005C4B"
      />
      <path
        d="M32 26.8C32.8 26.8 33.3 27.4 33.3 28.4V40.5H30.7V28.4C30.7 27.4 31.2 26.8 32 26.8Z"
        fill="#FFFFFF"
      />
      {/* Curled knuckles & palm base */}
      <rect
        x="26.2"
        y="38.2"
        width="11.6"
        height="8.4"
        rx="4.2"
        fill="#FFFFFF"
        stroke="#005C4B"
        strokeWidth="1.8"
      />
      <path
        d="M29 41.2H35"
        stroke="#00A884"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

const PALETTES = [
  ['#25D366', '#005C4B', '#E7FCE3'],
  ['#38BDF8', '#075985', '#E0F2FE'],
  ['#2DD4BF', '#115E59', '#CCFBF1'],
  ['#FBBF24', '#92400E', '#FEF3C7'],
  ['#818CF8', '#312E81', '#E0E7FF'],
  ['#F472B6', '#831843', '#FCE7F3'],
];

export function AnonAvatar({
  seed,
  size = 40,
}: {
  seed: string;
  size?: number;
}) {
  const safeSeed = seed || 'fisilti01';
  const uid = useId().replace(/:/g, '');
  let hash = 0;
  for (let i = 0; i < safeSeed.length; i++) {
    hash = (hash * 31 + safeSeed.charCodeAt(i)) >>> 0;
  }
  const palette = PALETTES[hash % PALETTES.length];
  const shapeType = (hash >> 3) % 3;
  const rot = ((hash >> 5) % 4) * 30;
  const gradId = `av-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="rounded-full shrink-0 shadow-xs"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="4" y1="4" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={palette[0]} />
          <stop offset="100%" stopColor={palette[1]} />
        </linearGradient>
      </defs>
      <circle cx="22" cy="22" r="22" fill={`url(#${gradId})`} />
      <circle cx="22" cy="22" r="20.8" stroke="#FFFFFF" strokeOpacity="0.24" strokeWidth="1" />
      <circle cx="22" cy="22" r="14" fill="#FFFFFF" fillOpacity="0.12" />
      {shapeType === 0 && (
        <path
          d="M22 10L32.5 28H11.5L22 10Z"
          fill={palette[2]}
          fillOpacity="0.92"
          transform={`rotate(${rot} 22 22)`}
        />
      )}
      {shapeType === 1 && (
        <rect
          x="13.5"
          y="13.5"
          width="17"
          height="17"
          rx="5"
          fill={palette[2]}
          fillOpacity="0.92"
          transform={`rotate(${rot} 22 22)`}
        />
      )}
      {shapeType === 2 && (
        <path
          d="M22 10L33 17.5V27.5L22 35L11 27.5V17.5L22 10Z"
          fill={palette[2]}
          fillOpacity="0.92"
        />
      )}
      <circle cx="22" cy="22" r="4.2" fill={palette[1]} />
      <circle cx="22" cy="22" r="1.8" fill="#FFFFFF" />
    </svg>
  );
}
