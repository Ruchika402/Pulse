import { useId } from "react";

export function HeroArt() {
  const id = useId();
  // Shifted the pulse line further right (starting at M550 instead of M400)
  const pulse = "M550 180h80l16-30 18 70 22-140 24 160 18-70 14 20h120";
  
  return (
    <svg 
      viewBox="0 0 1000 400" 
      preserveAspectRatio="xMidYMid slice" 
      aria-hidden="true"
      className="absolute inset-0 h-full w-full opacity-60 pointer-events-none"
    >
      <defs>
        <radialGradient id={`${id}m`} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#9DF5CB" /><stop offset="1" stopColor="#2E8B6F" />
        </radialGradient>
        <filter id={`${id}g`}><feGaussianBlur stdDeviation="6" /></filter>
      </defs>
      
      <circle cx="800" cy="100" r="70" fill={`url(#${id}m)`} className="animate-moon" opacity="0.85" />
      
      <polygon points="100,400 300,200 400,280 550,120 700,260 850,180 1000,300 1000,400" fill="#0F3A2C" />
      <polygon points="0,400 150,250 250,320 400,220 550,300 700,250 850,300 1000,220 1000,400" fill="#0A2A20" />
      
      <g fill="#051510">
        <polygon points="850,400 880,250 910,400" /><polygon points="900,400 930,200 960,400" />
        <polygon points="950,400 980,260 1000,400" />
      </g>
      
      <path d={pulse} fill="none" stroke="#7DFFC0" strokeWidth="6" strokeLinecap="round"
            strokeLinejoin="round" filter={`url(#${id}g)`} className="animate-pulse-line" />
            
      <path d={pulse} fill="none" stroke="#C8FFE4" strokeWidth="3" strokeLinecap="round" 
            strokeLinejoin="round" className="animate-pulse-line" />
    </svg>
  );
}