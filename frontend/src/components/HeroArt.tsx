import { useId } from "react";

export function HeroArt() {
  const id = useId();
  const pulse = "M330 180h110l16-26 18 68 22-136 24 156 18-62 14 20h120";
  
  return (
    <svg viewBox="0 0 760 300" preserveAspectRatio="xMaxYMax slice" aria-hidden="true"
         className="absolute bottom-0 right-0 h-full w-[70%] max-sm:opacity-40">
      <defs>
        <radialGradient id={`${id}m`} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#9DF5CB" /><stop offset="1" stopColor="#2E8B6F" />
        </radialGradient>
        <filter id={`${id}g`}><feGaussianBlur stdDeviation="5" /></filter>
      </defs>
      <circle cx="520" cy="100" r="70" fill={`url(#${id}m)`} opacity=".85" />
      <polygon points="100,300 250,140 340,200 450,100 610,225 760,130 760,300" fill="#0F3A2C" />
      <polygon points="0,300 150,190 260,245 380,175 520,255 680,200 760,235 760,300" fill="#0A2A20" />
      <g fill="#051510">
        <polygon points="590,300 610,200 630,300" /><polygon points="625,300 650,170 675,300" />
        <polygon points="670,300 690,210 710,300" /><polygon points="705,300 735,160 760,300" />
      </g>
      <path d={pulse} fill="none" stroke="#7DFFC0" strokeWidth="7" strokeLinecap="round"
            strokeLinejoin="round" filter={`url(#${id}g)`} />
      <path d={pulse} fill="none" stroke="#C8FFE4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}