import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 to-fuchsia-900/20 animate-pulse" />
      <div className="relative z-10 flex flex-col items-center">
        <Loader2 className="w-12 h-12 animate-spin text-fuchsia-500 mb-4" />
        <p className="text-white/40 text-sm font-bold uppercase tracking-widest animate-pulse">
          Loading Vibe...
        </p>
      </div>
    </div>
  )
}
