import React, { forwardRef } from 'react'
import VibeRadar from './VibeRadar'

interface ShareCardProps {
  groupName: string
  memberName: string
  archetype: {
    title: string
    color: string
    bg: string
    border: string
  }
  vibeStats: {
    chaos: number
    social: number
    wholesome: number
  }
}

const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(({ groupName, memberName, archetype, vibeStats }, ref) => {
  return (
    <div 
      ref={ref}
      className="w-[400px] h-[600px] bg-black relative overflow-hidden flex flex-col items-center justify-between p-8 text-white font-sans"
    >
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 to-fuchsia-900/40 z-0" />
      <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] bg-indigo-600/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-20%] left-[-20%] w-[80%] h-[80%] bg-pink-600/20 rounded-full blur-[100px]" />
      
      {/* Noise Texture */}
      <div className="absolute inset-0 opacity-20 z-0 mix-blend-overlay" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`
      }} />
      
      {/* Header */}
      <div className="relative z-10 text-center w-full mt-4">
        <div className="text-[10px] font-bold tracking-[0.4em] uppercase opacity-60 mb-2 text-fuchsia-200">VIBE CHECK REVEALED</div>
        <h2 className="text-2xl font-black tracking-tighter leading-none text-white">{groupName}</h2>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center w-full flex-1 justify-center gap-8">
        
        {/* Avatar/Name Placeholder */}
        <div className="text-center">
            <div className="text-xs font-bold opacity-60 mb-2 tracking-widest uppercase">Member</div>
            <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-violet-200 to-fuchsia-200">
                {memberName}
            </h1>
        </div>

        {/* Radar */}
        <div className="w-56 h-56 transform scale-110">
             <VibeRadar stats={vibeStats} color={archetype.color.replace('text-', '').replace('-400', '')} />
        </div>

        {/* Archetype Badge */}
        <div className={`px-8 py-3 rounded-full border ${archetype.border} ${archetype.bg} backdrop-blur-md shadow-xl`}>
            <span className={`text-xl font-black uppercase tracking-wider ${archetype.color}`}>
                {archetype.title}
            </span>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 w-full flex justify-between items-end border-t border-white/10 pt-4 pb-2">
        <div className="flex flex-col">
            <span className="text-[8px] font-bold opacity-50 uppercase tracking-widest">Date</span>
            <span className="text-[10px] font-mono opacity-80">{new Date().toLocaleDateString()}</span>
        </div>
        <div className="flex flex-col items-end">
             <span className="text-[8px] font-bold opacity-50 uppercase tracking-widest">Join the Squad</span>
             <span className="text-[10px] font-bold text-fuchsia-400">vibecheck.app</span>
        </div>
      </div>
    </div>
  )
})

ShareCard.displayName = 'ShareCard'

export default ShareCard
