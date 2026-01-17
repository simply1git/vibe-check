'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import questionsData from '@/lib/questions.json'
import { Copy, MessageCircle, Crown, Award, RefreshCw, Lock, ArrowLeft, Share2, Zap } from 'lucide-react'
import confetti from 'canvas-confetti'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import UserMenu from '@/components/UserMenu'

// Types
interface Member {
  id: string
  display_name: string
  avatar_seed: string
  completed_chapters: number
  is_admin: boolean
}

interface LeaderboardEntry {
  member_id: string
  display_name: string
  avatar_seed: string
  score: number
  correct_count: number
}

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  
  const [loading, setLoading] = useState(true)
  const [groupName, setGroupName] = useState('')
  const [groupId, setGroupId] = useState('')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  
  // Loading Messages
  const loadingMessages = [
    "Analyzing your soul...",
    "Consulting the friendship stars...",
    "Calculating vibe compatibility...",
    "Decoding the group chat energy...",
    "Measuring chaos levels..."
  ]
  const [loadingMsg, setLoadingMsg] = useState(loadingMessages[0])

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingMsg(loadingMessages[Math.floor(Math.random() * loadingMessages.length)])
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetchResults()
  }, [slug])

  const fetchResults = async () => {
    try {
      // 1. Get Group Info
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('id, name, admin_token')
        .eq('slug', slug)
        .single()

      if (groupError || !group) throw new Error('Group not found')
      
      setGroupName(group.name)
      setGroupId(group.id)

      // Check Admin (Casual Mode: Check if current user is admin in DB)
      const currentMemberId = localStorage.getItem('member_id')
      if (currentMemberId) {
        const { data: currentMember } = await supabase
          .from('members')
          .select('is_admin')
          .eq('id', currentMemberId)
          .single()
        
        if (currentMember?.is_admin) {
          setIsAdmin(true)
        }
      }

      // 2. Get Members
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('id, display_name, avatar_seed, is_admin')
        .eq('group_id', group.id)

      if (membersError) throw membersError
      
      const memberMap = new Map(members.map(m => [m.id, m]))
      const memberIds = members.map(m => m.id)

      // 3. Fetch Attempts
      const { data: groupAttempts, error: groupAttemptsError } = await supabase
        .from('attempts')
        .select(`
          guesser_id,
          is_correct,
          points,
          question:question_id (
            target_member_id
          )
        `)
        .in('guesser_id', memberIds)

      if (groupAttemptsError) throw groupAttemptsError

      // Calculate Leaderboard
      const scores = new Map<string, { score: number, correct: number }>()
      
      groupAttempts?.forEach((att: any) => {
        const current = scores.get(att.guesser_id) || { score: 0, correct: 0 }
        scores.set(att.guesser_id, {
          score: current.score + (att.points || 0),
          correct: current.correct + (att.is_correct ? 1 : 0)
        })
      })

      const leaderboardData: LeaderboardEntry[] = members.map(m => ({
        member_id: m.id,
        display_name: m.display_name,
        avatar_seed: m.avatar_seed || m.display_name,
        score: scores.get(m.id)?.score || 0,
        correct_count: scores.get(m.id)?.correct || 0
      })).sort((a, b) => b.score - a.score)

      setLeaderboard(leaderboardData)

    } catch (err) {
      console.error('Error fetching results:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/?join=${slug}`
    navigator.clipboard.writeText(url)
    // alert('Link copied to clipboard!') // Removed annoying alert
  }

  const handleShareWhatsApp = () => {
    const url = `${window.location.origin}/?join=${slug}`
    const text = `How well do you actually know me? Join our group ${groupName} on VibeCheck and find out! ${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const handleResetScores = async () => {
    if (!confirm('Are you sure? This will wipe all attempts and scores for everyone.')) return
    
    const { data: members } = await supabase
      .from('members')
      .select('id')
      .eq('group_id', groupId)
    
    if (members) {
      const memberIds = members.map(m => m.id)
      await supabase
        .from('attempts')
        .delete()
        .in('guesser_id', memberIds)
      
      fetchResults()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/50 to-fuchsia-900/50 animate-pulse" />
        <div className="relative z-10 flex flex-col items-center">
          <Loader2 className="w-12 h-12 animate-spin text-fuchsia-500 mb-4" />
          <h2 className="text-xl font-bold animate-pulse text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-fuchsia-200">
            {loadingMsg}
          </h2>
        </div>
      </div>
    )
  }

  const averageScore = leaderboard.length > 0 
    ? Math.round((leaderboard.reduce((sum, entry) => sum + entry.score, 0) / (leaderboard.length * 100)) * 100) 
    : 0

  // Archetype Logic
  const getArchetype = (score: number, totalQuestions: number = 100) => {
    // Assuming max score is roughly proportional to attempts * 10
    // Simplified: score is just points. Let's base it on relative points or thresholds.
    // For now, let's use raw score thresholds assuming a typical game size.
    // Ideally this would be percentage based.
    
    if (score >= 500) return { title: "The Oracle", color: "text-fuchsia-400", bg: "bg-fuchsia-500/20", border: "border-fuchsia-500/50" }
    if (score >= 300) return { title: "Mind Reader", color: "text-violet-400", bg: "bg-violet-500/20", border: "border-violet-500/50" }
    if (score >= 100) return { title: "Vibe Curator", color: "text-indigo-400", bg: "bg-indigo-500/20", border: "border-indigo-500/50" }
    return { title: "Initiate", color: "text-slate-400", bg: "bg-slate-500/20", border: "border-slate-500/50" }
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20 p-4 md:p-8 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-violet-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-fuchsia-600/20 rounded-full blur-[120px] animate-pulse delay-1000" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.15%22/%3E%3C/svg%3E')] opacity-20 mix-blend-overlay"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-7xl mx-auto relative"
      >
        {/* Header Nav - Fixed Overlap */}
        <div className="flex justify-between items-center mb-12 relative z-50">
          {/* Left: Back Button */}
          <button 
            onClick={() => router.push(`/lobby/${slug}`)}
            className="group flex items-center space-x-2 text-white/60 hover:text-white transition-colors"
          >
            <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <span className="font-medium hidden md:inline">Lobby</span>
          </button>

          {/* Center: Group Name */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
             <span className="text-white/40 text-xs font-bold uppercase tracking-widest block max-w-[120px] sm:max-w-xs truncate">{groupName}</span>
          </div>

          {/* Right: Actions Toolbar */}
          <div className="flex items-center space-x-3">
             <button 
                onClick={handleShareWhatsApp}
                className="flex items-center space-x-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-4 py-2 rounded-full font-bold transition-all hover:scale-105 shadow-lg shadow-green-900/20 text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
             
             {/* User Menu integrated into flow */}
             <UserMenu />
          </div>
        </div>

        {/* Title Section */}
        <div className="text-center mb-16">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-5xl md:text-7xl font-black mb-4 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-violet-200 to-fuchsia-200"
          >
            The Revelation
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-white/60"
          >
            Final results for <span className="text-fuchsia-400 font-bold">{groupName}</span>
          </motion.p>
        </div>

        <div className="flex flex-col space-y-8">
          {/* Group Vibe - Sleek & Centered */}
          <div className="flex justify-center">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 px-8 py-4 rounded-full relative overflow-hidden group flex items-center gap-4"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Group Synergy</h3>
              <div className="h-4 w-[1px] bg-white/10" />
              <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
                {averageScore}%
              </div>
              <p className="text-white/60 text-sm font-medium">
                {averageScore > 50 ? '🔥 Chaotic Energy' : '🧊 Chill Vibes'}
              </p>
            </motion.div>
          </div>

          {/* The Vibe Tribe - List View */}
          <div className="max-w-4xl mx-auto w-full">
             <div className="flex items-center justify-center mb-8">
               <div className="h-[1px] w-12 bg-white/20 mr-4" />
               <h2 className="text-2xl font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                 <Crown className="w-5 h-5" /> The Vibe Tribe
               </h2>
               <div className="h-[1px] w-12 bg-white/20 ml-4" />
             </div>

             <div className="space-y-3">
                {leaderboard.map((entry, index) => {
                  const archetype = getArchetype(entry.score)
                  const isTop = index === 0
                  
                  return (
                    <motion.div
                      key={entry.member_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`relative flex items-center p-3 sm:p-4 rounded-2xl border transition-all hover:bg-white/10 group ${
                        isTop 
                          ? "bg-gradient-to-r from-fuchsia-900/40 to-black border-fuchsia-500/50 shadow-[0_0_20px_rgba(192,38,211,0.15)]"
                          : "bg-white/5 border-white/10"
                      }`}
                    >
                       {/* Rank */}
                       <div className={`w-8 sm:w-12 text-center font-black text-xl sm:text-2xl ${
                            index === 0 ? 'text-yellow-400' : 
                            index === 1 ? 'text-slate-300' : 
                            index === 2 ? 'text-amber-700' : 'text-white/20'
                       }`}>
                          {index + 1}
                       </div>

                       {/* Avatar */}
                       <div className="relative mx-3 sm:mx-4">
                          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full p-[2px] bg-gradient-to-br ${isTop ? 'from-yellow-400 via-fuchsia-500 to-violet-500' : 'from-white/20 to-white/5'}`}>
                            <img 
                              src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${entry.avatar_seed}`} 
                              alt={entry.display_name}
                              className="w-full h-full rounded-full bg-black"
                            />
                          </div>
                          {isTop && <Crown className="absolute -top-2 -right-2 w-5 h-5 text-yellow-400 fill-yellow-400 animate-bounce" />}
                       </div>

                       {/* Info */}
                       <div className="flex-1 min-w-0">
                          <h3 className={`text-base sm:text-lg font-bold truncate ${isTop ? 'text-white' : 'text-white/90'}`}>
                            {entry.display_name}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${archetype.color}`}>
                               {archetype.title}
                            </span>
                          </div>
                       </div>

                       {/* Score */}
                       <div className="text-right pl-4">
                          <div className="text-xl sm:text-3xl font-black text-white">
                            {entry.score}
                          </div>
                          <div className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Points</div>
                       </div>

                       {/* Progress Bar Background (Subtle) */}
                       <div className="absolute bottom-0 left-0 h-[2px] bg-white/5 w-full">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (entry.score / 500) * 100)}%` }}
                            transition={{ delay: 0.5 + (index * 0.1), duration: 1 }}
                            className={`h-full opacity-50 ${isTop ? 'bg-gradient-to-r from-fuchsia-500 to-violet-500' : 'bg-white/20'}`}
                          />
                       </div>
                    </motion.div>
                  )
                })}
             </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
