import React from 'react';

const TravelIcon: React.FC<{ size?: number | string }> = ({ size = 120 }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="100" r="95" fill="#FAF3E0" />
    <mask id="mask0" mask-type="alpha" maskUnits="userSpaceOnUse" x="5" y="5" width="190" height="190">
      <circle cx="100" cy="100" r="95" fill="#C4C4C4" />
    </mask>
    <g mask="url(#mask0)">
      {/* Sky/Water background */}
      <rect x="0" y="100" width="200" height="100" fill="#006767" />
      
      {/* Pyramids */}
      <path d="M60 145L100 85L140 145H60Z" fill="#9E6C3A" />
      <path d="M100 145L135 95L170 145H100Z" fill="#7C522A" />
      
      {/* Waves at bottom */}
      <path d="M0 150C30 140 70 160 100 150C130 140 170 160 200 150V200H0V150Z" fill="#004C4C" />
      <path d="M0 170C30 160 70 180 100 170C130 160 170 180 200 170V200H0V170Z" fill="#003535" />
      
      {/* Palm Trees */}
      <g opacity="0.95">
        {/* Left Tree */}
        <path d="M45 145L42 115" stroke="#483420" strokeWidth="4" />
        <path d="M42 115C35 110 20 115 20 115" stroke="#004D00" strokeWidth="6" strokeLinecap="round" />
        <path d="M42 115C50 110 65 115 65 115" stroke="#004D00" strokeWidth="6" strokeLinecap="round" />
        <path d="M42 115C35 105 40 90 40 90" stroke="#004D00" strokeWidth="6" strokeLinecap="round" />
        
        {/* Right Tree */}
        <path d="M155 145L158 115" stroke="#483420" strokeWidth="4" />
        <path d="M158 115C151 110 136 115 136 115" stroke="#004D00" strokeWidth="6" strokeLinecap="round" />
        <path d="M158 115C166 110 181 115 181 115" stroke="#004D00" strokeWidth="6" strokeLinecap="round" />
        <path d="M158 115C151 105 156 90 156 90" stroke="#004D00" strokeWidth="6" strokeLinecap="round" />
      </g>

      {/* Cloud & Plane */}
      <path d="M100 60C125 60 145 50 145 50C145 50 135 35 100 35C65 35 55 50 55 50C55 50 75 60 100 60Z" fill="white" opacity="0.7" />
      <path d="M85 55L115 45L112 52L130 55L110 58L108 68L100 58L85 55Z" fill="#F97316" />
    </g>
  </svg>
);

export default TravelIcon;
