'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import questionsData from '@/lib/questions.json'
import { Copy, MessageCircle, Crown, Award, RefreshCw, Lock, ArrowLeft, Share2, Zap, User, Sparkles, Flame, Ghost, Shield, Skull, ChevronDown, ChevronUp, Download } from 'lucide-react'
import confetti from 'canvas-confetti'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import UserMenu from '@/components/UserMenu'
import Link from 'next/link'
import { analyzeVibe } from '@/lib/vibe-analysis'
import VibeRadar from '@/components/VibeRadar'
import ShareCard from '@/components/ShareCard'
import html2canvas from 'html2canvas'

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
  const [memberProfiles, setMemberProfiles] = useState<Record<string, any>>({})
  const [currentMember, setCurrentMember] = useState<Member | null>(null)
  const shareCardRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  
  // Loading Messages
  const loadingMessages = [
    "Analyzing your soul...",
    "Consulting the friendship stars...",
    "Calculating vibe compatibility...",
    "Decoding the group chat energy...",
    "Measuring chaos levels..."
  ]
  const [loadingMsg, setLoadingMsg] = useState(loadingMessages[0])
  const [expandedMember, setExpandedMember] = useState<string | null>(null)

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

      // Check Admin & Current Member
      const currentMemberId = localStorage.getItem('member_id')
      if (currentMemberId) {
        const { data: currentMemberData, error: currentMemberError } = await supabase
          .from('members')
          .select('*')
          .eq('id', currentMemberId)
          .single()
        
        if (!currentMemberError && currentMemberData) {
          setCurrentMember(currentMemberData)
          if (currentMemberData.is_admin) {
            setIsAdmin(true)
          }
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

      // 4. Fetch Profiles (for Red Flags & Stats)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('member_id, answers')
        .in('member_id', memberIds)

      if (!profilesError && profiles) {
        const profileMap: Record<string, any> = {}
        profiles.forEach(p => {
          profileMap[p.member_id] = p.answers
        })
        setMemberProfiles(profileMap)
      }

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

  const getBinarySplit = (questionId: string, fallbackLeft: string, fallbackRight: string) => {
    const question = questionsData.find(q => q.id === questionId)
    const options = question?.options || []
    const leftOption = options[0] || fallbackLeft
    const rightOption = options[1] || fallbackRight
    let leftCount = 0
    let rightCount = 0
    let total = 0

    Object.values(memberProfiles).forEach((ans: any) => {
      const val = ans?.[questionId]?.val
      if (val === leftOption) {
        leftCount++
        total++
      } else if (val === rightOption) {
        rightCount++
        total++
      }
    })

    const leftPct = total ? Math.round((leftCount / total) * 100) : 50
    return { leftLabel: leftOption, rightLabel: rightOption, leftPct, rightPct: 100 - leftPct, total }
  }

  const handleDownloadCard = async () => {
    if (!shareCardRef.current) return
    setDownloading(true)
    
    try {
      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: '#000000',
        scale: 2, // Retina
        useCORS: true, // For images
        logging: false
      })
      
      const image = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = image
      link.download = `vibe-check-${groupName.replace(/\s+/g, '-').toLowerCase()}.png`
      link.click()
    } catch (err) {
      console.error('Failed to generate card:', err)
      alert('Failed to generate image. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  const hasRedFlags = leaderboard.some(member => memberProfiles[member.member_id]?.['q26']?.val)
  const topThree = leaderboard.slice(0, 3)

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
                onClick={handleDownloadCard}
                disabled={downloading}
                className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full font-bold transition-all hover:scale-105 border border-white/10 text-sm disabled:opacity-50"
              >
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span className="hidden sm:inline">Card</span>
              </button>
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

          <div className="max-w-5xl mx-auto w-full px-4">
             <div className="flex items-center justify-center mb-6">
               <div className="h-[1px] w-12 bg-white/20 mr-4" />
               <h2 className="text-2xl font-black uppercase tracking-widest text-violet-200/90 flex items-center gap-2">
                 ⚡ Replay Mode
               </h2>
               <div className="h-[1px] w-12 bg-white/20 ml-4" />
             </div>

             <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-sm font-bold uppercase tracking-widest text-white/40">Top 3</div>
                    <div className="text-lg font-bold text-white/90">Run it back and steal the crown.</div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => router.push(`/lobby/${slug}`)}
                      className="bg-white text-black hover:bg-gray-100 font-bold px-5 py-2.5 rounded-full transition-all hover:scale-105"
                    >
                      Challenge Again
                    </button>
                    <button
                      onClick={() => router.push(`/group/${slug}/profile`)}
                      className="bg-white/10 hover:bg-white/20 text-white font-bold px-5 py-2.5 rounded-full border border-white/10 transition-all"
                    >
                      Update Profile
                    </button>
                  </div>
                </div>

                {topThree.length === 0 ? (
                  <div className="mt-6 text-center text-white/50 text-sm font-semibold uppercase tracking-widest">
                    No scores yet. Play a round to crown a Vibe Master.
                  </div>
                ) : (
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {topThree.map((entry, index) => (
                      <div key={entry.member_id} className="bg-black/40 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/10 bg-black/50">
                            <img
                              src={`https://api.dicebear.com/9.x/notionists/svg?seed=${entry.avatar_seed}`}
                              alt={entry.display_name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          {index === 0 && (
                            <div className="absolute -top-2 -right-2 bg-yellow-500 text-black rounded-full p-1 shadow-lg">
                              <Crown className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-white truncate">{entry.display_name}</div>
                          <div className="text-xs text-white/40 uppercase tracking-widest">{entry.correct_count} correct</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-black text-white">{entry.score}</div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">Points</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          </div>

          {/* Squad Archetypes */}
          <div className="max-w-7xl mx-auto w-full px-4">
            <div className="flex items-center justify-center mb-8">
               <div className="h-[1px] w-12 bg-white/20 mr-4" />
               <h2 className="text-2xl font-black uppercase tracking-widest text-blue-400/80 flex items-center gap-2">
                 🎭 Squad Archetypes
               </h2>
               <div className="h-[1px] w-12 bg-white/20 ml-4" />
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    id: 'main_character',
                    title: 'The Main Character',
                    icon: Sparkles,
                    description: 'Thinks they are in a movie.',
                    color: 'text-yellow-400',
                    bgColor: 'bg-yellow-500/10',
                    borderColor: 'border-yellow-500/20',
                    condition: (a: any) => a?.q29?.val === 'Lead the survivors' || a?.q18?.val === 'Fame'
                  },
                  {
                    id: 'chaos_agent',
                    title: 'The Chaos Agent',
                    icon: Flame,
                    description: 'Thrives on disorder.',
                    color: 'text-red-400',
                    bgColor: 'bg-red-500/10',
                    borderColor: 'border-red-500/20',
                    condition: (a: any) => a?.q2?.val === 'Pure Chaos/Memes' || a?.q33?.val === 'Wing it'
                  },
                  {
                    id: 'ghost',
                    title: 'The Ghost',
                    icon: Ghost,
                    description: 'Here one second, gone the next.',
                    color: 'text-slate-400',
                    bgColor: 'bg-slate-500/10',
                    borderColor: 'border-slate-500/20',
                    condition: (a: any) => a?.q9?.val === "Planning the 'Irish Exit'" || a?.q14?.val === 'Total Silence'
                  },
                  {
                    id: 'dad',
                    title: 'The Team Dad',
                    icon: Shield,
                    description: 'Responsible (unfortunately).',
                    color: 'text-blue-400',
                    bgColor: 'bg-blue-500/10',
                    borderColor: 'border-blue-500/20',
                    condition: (a: any) => a?.q7?.val === 'Planned everything' || a?.q29?.val === 'Hoard all the snacks'
                  },
                  {
                    id: 'villain',
                    title: 'The Mastermind',
                    icon: Skull,
                    description: 'Always three steps ahead.',
                    color: 'text-purple-400',
                    bgColor: 'bg-purple-500/10',
                    borderColor: 'border-purple-500/20',
                    condition: (a: any) => a?.q29?.val === 'Sacrifice the slow ones' || a?.q27?.val === 'The Survivor'
                  }
                ].map((archetype) => {
                  const members = leaderboard.filter(m => {
                    const answers = memberProfiles[m.member_id]
                    return archetype.condition(answers)
                  })

                  if (members.length === 0) return null

                  return (
                    <div key={archetype.id} className={`rounded-xl border ${archetype.bgColor} ${archetype.borderColor} p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
                       <div className="flex items-center gap-3 mb-4">
                         <div className={`p-3 rounded-full bg-black/20 ${archetype.color}`}>
                           <archetype.icon className="w-6 h-6" />
                         </div>
                         <div>
                           <h3 className={`font-black text-lg ${archetype.color}`}>{archetype.title}</h3>
                           <p className="text-white/40 text-xs font-bold uppercase tracking-wider">{archetype.description}</p>
                         </div>
                       </div>
                       
                       <div className="flex flex-wrap gap-2">
                         {members.map(m => (
                           <div key={m.member_id} className="flex items-center gap-2 bg-black/30 rounded-full pl-1 pr-3 py-1 border border-white/5">
                              <img 
                                src={`https://api.dicebear.com/9.x/notionists/svg?seed=${m.avatar_seed}`}
                                alt={m.display_name}
                                className="w-6 h-6 rounded-full bg-white/10"
                              />
                              <span className="text-sm font-bold text-white/90">{m.display_name}</span>
                           </div>
                         ))}
                       </div>
                    </div>
                  )
                })}
             </div>
          </div>


          {/* Rapid Fire Stats */}
          <div className="max-w-4xl mx-auto w-full px-4">
             <div className="flex items-center justify-center mb-8">
               <div className="h-[1px] w-12 bg-white/20 mr-4" />
               <h2 className="text-2xl font-black uppercase tracking-widest text-yellow-400/80 flex items-center gap-2">
                 ⚡ Rapid Fire Splits
               </h2>
               <div className="h-[1px] w-12 bg-white/20 ml-4" />
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'q30', fallbackLeft: 'Call', fallbackRight: 'Text' },
                  { id: 'q33', fallbackLeft: 'Plan', fallbackRight: 'Wing' },
                  { id: 'q31', fallbackLeft: 'In', fallbackRight: 'Out' }
                ].map((stat) => {
                   const split = getBinarySplit(stat.id, stat.fallbackLeft, stat.fallbackRight)
                   
                   return (
                     <div key={stat.id} className="bg-white/5 border border-white/10 rounded-xl p-4 relative overflow-hidden">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-white/40 mb-2">
                           <span>{split.leftLabel}</span>
                           <span>{split.rightLabel}</span>
                        </div>
                        <div className="relative h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                           <div className="absolute top-0 left-0 h-full bg-yellow-400 transition-all duration-1000" style={{ width: `${split.leftPct}%` }} />
                        </div>
                        <div className="flex justify-between text-xl font-black text-white">
                           <span>{split.leftPct}%</span>
                           <span>{split.rightPct}%</span>
                        </div>
                        {split.total === 0 && (
                          <div className="mt-2 text-xs text-white/40 font-semibold uppercase tracking-widest text-center">
                            No responses yet
                          </div>
                        )}
                     </div>
                   )
                })}
             </div>
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
                  const isFirst = index === 0
                  const isSecond = index === 1
                  const isThird = index === 2
                  
                  const vibe = analyzeVibe(memberProfiles[entry.member_id] || {})
                  const isExpanded = expandedMember === entry.member_id

                  return (
                    <div 
                      key={entry.member_id} 
                      className={`
                        relative flex flex-col rounded-xl border transition-all duration-300 overflow-hidden
                        ${isFirst ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : ''}
                        ${isSecond ? 'bg-gradient-to-r from-gray-300/10 to-gray-400/10 border-gray-400/30' : ''}
                        ${isThird ? 'bg-gradient-to-r from-orange-700/10 to-orange-800/10 border-orange-700/30' : ''}
                        ${!isFirst && !isSecond && !isThird ? 'bg-white/5 border-white/5' : ''}
                      `}
                    >
                      <div 
                        onClick={() => setExpandedMember(isExpanded ? null : entry.member_id)}
                        className="flex items-center p-4 cursor-pointer hover:bg-white/5 transition-colors"
                      >
                        {/* Rank Badge */}
                        <div className={`
                          w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm mr-4 shrink-0
                          ${isFirst ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/50' : ''}
                          ${isSecond ? 'bg-gray-300 text-black shadow-lg shadow-gray-300/30' : ''}
                          ${isThird ? 'bg-orange-700 text-white shadow-lg shadow-orange-700/30' : ''}
                          ${!isFirst && !isSecond && !isThird ? 'bg-white/10 text-white/50' : ''}
                        `}>
                          {index + 1}
                        </div>

                        {/* Avatar */}
                        <div className="relative mr-4">
                          <div className={`
                            w-12 h-12 rounded-full overflow-hidden border-2 bg-black/50
                            ${isFirst ? 'border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'border-white/10'}
                          `}>
                             <img 
                               src={`https://api.dicebear.com/9.x/notionists/svg?seed=${entry.avatar_seed}`}
                               alt={entry.display_name}
                               className="w-full h-full object-cover"
                             />
                          </div>
                          {isFirst && (
                            <div className="absolute -top-2 -right-2 bg-yellow-500 text-black rounded-full p-1 shadow-lg animate-bounce">
                              <Crown className="w-3 h-3" />
                            </div>
                          )}
                        </div>

                        {/* Name & Title */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className={`font-bold truncate ${isFirst ? 'text-yellow-200' : 'text-white'}`}>
                              {entry.display_name}
                            </h3>
                            {isFirst && <span className="text-[10px] font-bold bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full border border-yellow-500/30 uppercase tracking-wide">Vibe Master</span>}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-white/40 mt-0.5">
                            <span>{entry.correct_count} correct guesses</span>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="text-right mr-4">
                          <div className={`text-xl font-black tabular-nums tracking-tight ${isFirst ? 'text-yellow-400' : 'text-white'}`}>
                            {entry.score}
                          </div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">Points</div>
                        </div>

                        {/* Expand Icon */}
                        <div className="text-white/40">
                           {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>

                      {/* Expanded Content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-black/20 border-t border-white/5 overflow-hidden"
                          >
                             <div className="p-4 flex flex-col sm:flex-row gap-6 items-center">
                                {/* Radar */}
                                <div className="w-32 h-32 shrink-0">
                                   <VibeRadar stats={vibe.stats} color={vibe.colorPalette.split('-')[1] || 'violet'} />
                                </div>
                                
                                {/* Details */}
                                <div className="flex-1 space-y-3 text-center sm:text-left w-full">
                                   <div>
                                      <div className="text-xs font-bold uppercase tracking-widest text-white/40 mb-1">Vibe Archetype</div>
                                      <div className={`text-xl font-black bg-clip-text text-transparent bg-gradient-to-r ${vibe.colorPalette}`}>
                                        {vibe.archetype}
                                      </div>
                                   </div>
                                   
                                   {vibe.toxicTrait && (
                                     <div>
                                        <div className="text-xs font-bold uppercase tracking-widest text-white/40 mb-1">Signature Quirk</div>
                                        <div className="text-sm text-white/80 italic">"{vibe.toxicTrait}"</div>
                                     </div>
                                   )}
                                   
                                   <div className="pt-2">
                                     <Link 
                                       href={`/group/${slug}/member/${entry.member_id}`}
                                       className="inline-flex items-center text-xs font-bold text-white/60 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10"
                                     >
                                       View Full Profile <ArrowLeft className="w-3 h-3 ml-2 rotate-180" />
                                     </Link>
                                   </div>
                                </div>
                             </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
             </div>
          </div>
        </div>
      </motion.div>

      {/* Hidden Share Card for Generation */}
      <div className="absolute top-0 left-0 -z-50 opacity-0 pointer-events-none">
        {currentMember && memberProfiles[currentMember.id] && (
            <ShareCard
                ref={shareCardRef}
                groupName={groupName}
                memberName={currentMember.display_name}
                archetype={getArchetype(leaderboard.find(l => l.member_id === currentMember.id)?.score || 0)}
                vibeStats={analyzeVibe(memberProfiles[currentMember.id]).stats}
            />
        )}
      </div>
    </div>
  )
}
