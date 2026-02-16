'use client'

import { motion } from 'framer-motion'

interface VibeRadarProps {
  stats: {
    chaos: number;
    social: number;
    wholesome: number;
  };
  color?: string;
}

export default function VibeRadar({ stats, color = 'violet' }: VibeRadarProps) {
  // Normalize 0-100 to 0-1 (radius)
  // Triangle coordinates:
  // Top (Chaos): (50, 10)
  // Bottom Right (Social): (90, 80)
  // Bottom Left (Wholesome): (10, 80)
  // Center: (50, 50)

  // Calculate dynamic points based on stats
  // Max radius is approx 40 units from center (50,50)
  
  const center = { x: 50, y: 50 };
  const maxR = 40;

  // Chaos (Top) - Angle -90deg (270)
  const chaosR = (stats.chaos / 100) * maxR;
  const p1 = { x: 50, y: 50 - chaosR };

  // Social (Bottom Right) - Angle 30deg
  const socialR = (stats.social / 100) * maxR;
  const p2 = {
    x: 50 + socialR * Math.cos(Math.PI / 6),
    y: 50 + socialR * Math.sin(Math.PI / 6)
  };

  // Wholesome (Bottom Left) - Angle 150deg
  const wholesomeR = (stats.wholesome / 100) * maxR;
  const p3 = {
    x: 50 + wholesomeR * Math.cos(5 * Math.PI / 6),
    y: 50 + wholesomeR * Math.sin(5 * Math.PI / 6)
  };

  const points = `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`;

  return (
    <div className="relative w-full aspect-square max-w-[300px] mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
        {/* Background Triangle (Guide) */}
        <polygon 
          points="50,10 85,75 15,75" 
          fill="none" 
          stroke="rgba(255,255,255,0.2)" 
          strokeWidth="0.5" 
          strokeDasharray="4 2"
        />
        
        {/* Axis Lines */}
        <line x1="50" y1="50" x2="50" y2="10" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
        <line x1="50" y1="50" x2="85" y2="75" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
        <line x1="50" y1="50" x2="15" y2="75" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />

        {/* Labels */}
        <text x="50" y="8" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="4" fontWeight="bold">CHAOS</text>
        <text x="90" y="80" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="4" fontWeight="bold">SOCIAL</text>
        <text x="10" y="80" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="4" fontWeight="bold">WHOLESOME</text>

        {/* The Shape */}
        <motion.polygon
          points={points}
          fill={`var(--color-${color}-500, #8b5cf6)`}
          fillOpacity="0.6"
          stroke={`var(--color-${color}-300, #d8b4fe)`}
          strokeWidth="2"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, type: 'spring' }}
        />
        
        {/* Dots */}
        <circle cx={p1.x} cy={p1.y} r="1.5" fill="white" />
        <circle cx={p2.x} cy={p2.y} r="1.5" fill="white" />
        <circle cx={p3.x} cy={p3.y} r="1.5" fill="white" />
      </svg>
    </div>
  )
}
