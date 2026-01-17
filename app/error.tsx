'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-10 mix-blend-overlay" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-md w-full bg-red-950/30 backdrop-blur-xl border border-red-500/20 p-8 rounded-3xl"
      >
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
        </div>

        <h2 className="text-2xl font-black text-white mb-2">Vibe Check Failed</h2>
        <p className="text-red-200/60 mb-8 text-sm font-mono">
          {error.message || "Something went wrong."}
        </p>

        <button
          onClick={reset}
          className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-bold transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
      </motion.div>
    </div>
  )
}
