'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Ghost } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center overflow-hidden relative">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-violet-600/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-fuchsia-600/20 rounded-full blur-[100px] animate-pulse delay-1000" />
      </div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 bg-white/5 backdrop-blur-lg border border-white/10 p-12 rounded-3xl shadow-2xl max-w-lg w-full"
      >
        <motion.div 
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="flex justify-center mb-6"
        >
          <Ghost className="w-24 h-24 text-white/20" />
        </motion.div>
        
        <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 mb-4">
          404
        </h1>
        <h2 className="text-2xl font-bold text-white mb-4">
          Ghosted by the Server
        </h2>
        <p className="text-white/60 mb-8">
          The page you're looking for has vanished into the void. It might have been a bad vibe.
        </p>

        <Link 
          href="/"
          className="inline-flex items-center space-x-2 bg-white text-black px-8 py-4 rounded-full font-bold hover:bg-gray-200 transition-all hover:scale-105"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Return to Safety</span>
        </Link>
      </motion.div>
    </div>
  )
}
