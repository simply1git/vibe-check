'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Copy, MessageCircle, Play, Users, Edit2, ArrowRight, Loader2, Trophy } from 'lucide-react'
import QuizGame from '@/components/QuizGame'
import UserMenu from '@/components/UserMenu'
import { motion } from 'framer-motion'

export default function LobbyPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  
  const [group, setGroup] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [gameStarted, setGameStarted] = useState(false)
  const [currentMember, setCurrentMember] = useState<any>(null)

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const fetchGroupData = async () => {
      try {
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('*')
          .eq('slug', slug)
          .abortSignal(controller.signal)
          .single()

        if (groupError) throw groupError
        if (!isMounted) return
        setGroup(groupData)

        const { data: membersData, error: membersError } = await supabase
          .from('members')
          .select('*')
          .eq('group_id', groupData.id)
          .abortSignal(controller.signal)

        if (membersError) throw membersError
        if (!isMounted) return
        setMembers(membersData || [])
        
        const myId = localStorage.getItem('member_id')
        if (myId) {
          const me = membersData?.find(m => m.id === myId)
          if (isMounted) setCurrentMember(me)
        }

      } catch (err: any) {
        if (
          err.name === 'AbortError' || 
          err.message?.includes('AbortError') ||
          err.details?.includes('AbortError')
        ) {
          // Request aborted, ignore
          return
        }
        console.error('Error fetching group:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchGroupData()
    const interval = setInterval(fetchGroupData, 5000)
    
    return () => {
      isMounted = false
      controller.abort()
      clearInterval(interval)
    }
  }, [slug])

  const handleCopyLink = () => {
    const url = `${window.location.origin}/?join=${slug}`
    navigator.clipboard.writeText(url)
    alert('Link copied to clipboard!')
  }

  const handleShareWhatsApp = () => {
    const url = `${window.location.origin}/?join=${slug}`
    const text = `How well do you actually know me? Join our group "${group?.name}" on VibeCheck! ${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const handleShareTwitter = () => {
    const url = `${window.location.origin}/?join=${slug}`
    const text = `I just created a Vibe Check group called "${group?.name}". Come test our friendship soul!`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank')
  }

  const handleStartGame = () => {
    setGameStarted(true)
  }

  const handleExitGame = () => {
    setGameStarted(false)
  }

  const handleProfileNavigation = () => {
    router.push(`/group/${slug}/profile`)
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-900/50 to-fuchsia-900/50 animate-pulse" />
      <div className="relative z-10 flex flex-col items-center">
        <Loader2 className="w-12 h-12 animate-spin text-fuchsia-500 mb-4" />
        <p className="text-white/60 font-medium tracking-widest uppercase text-sm">Syncing Vibe...</p>
      </div>
    </div>
  )

  if (gameStarted) {
    return (
      <div className="min-h-screen bg-black">
        <QuizGame 
          memberId={currentMember?.id} 
          groupId={group?.id} 
          onComplete={() => router.push(`/group/${slug}/results`)}
          onExit={handleExitGame}
        />
      </div>
    )
  }

  const isProfileComplete = currentMember?.completed_chapters >= 5

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 relative overflow-hidden">
       {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] left-[-20%] w-[80%] h-[80%] bg-pink-600/20 rounded-full blur-[120px] animate-pulse delay-1000" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.15%22/%3E%3C/svg%3E')] opacity-20 mix-blend-overlay"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto relative z-10"
      >
        {/* Global Nav */}
        <div className="absolute top-0 right-0 z-50">
           <UserMenu />
        </div>

        {/* Header Section */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-block"
          >
            <h1 className="text-4xl md:text-6xl font-black mb-2 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-fuchsia-200">
              {group?.name}
            </h1>
            <div className="flex items-center justify-center space-x-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 mx-auto w-fit">
              <span className="text-white/40 text-sm font-bold uppercase tracking-wider">Code</span>
              <span className="font-mono text-fuchsia-300 font-bold">{slug}</span>
              <button onClick={handleCopyLink} className="ml-2 hover:text-white transition-colors">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          
          {/* Left Column: Actions */}
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
              <h2 className="text-xl font-bold mb-6 flex items-center text-white/90">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mr-3 shadow-lg shadow-indigo-500/30">
                  <Play className="w-4 h-4 text-white" />
                </span>
                Mission Control
              </h2>
              
              <div className="space-y-4">
                {!currentMember ? (
                  <button
                    onClick={() => router.push(`/?join=${slug}`)}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-3 transition-all transform hover:scale-[1.02] shadow-lg shadow-emerald-500/20 group"
                  >
                    <Users className="w-5 h-5" />
                    <span>Join This Squad</span>
                    <ArrowRight className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : !isProfileComplete ? (
                   <div className="relative group">
                     <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                      <button
                        onClick={handleProfileNavigation}
                        className="relative w-full bg-black border border-white/10 hover:bg-gray-900 text-white font-bold py-5 rounded-2xl flex items-center justify-center space-x-3 transition-all"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-violet-500 flex items-center justify-center">
                          <Edit2 className="w-4 h-4 text-white" />
                        </div>
                        <div className="text-left">
                          <span className="block text-sm text-pink-300 font-medium uppercase tracking-wider">Required</span>
                          <span className="text-lg">Complete Your Soul Profile</span>
                        </div>
                        <ArrowRight className="w-5 h-5 text-white/50 ml-auto group-hover:translate-x-1 transition-transform" />
                      </button>
                   </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={handleStartGame}
                      className="w-full bg-white text-black hover:bg-gray-100 font-bold py-4 rounded-2xl flex items-center justify-center space-x-3 transition-all transform hover:scale-[1.02] shadow-xl"
                    >
                      <Play className="w-5 h-5" />
                      <span>Start The Quiz</span>
                    </button>
                    <button
                      onClick={handleProfileNavigation}
                      className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-3 transition-colors"
                    >
                      <Edit2 className="w-5 h-5" />
                      <span>Update Profile</span>
                    </button>
                  </div>
                )}
                
                {currentMember && (
                  <button
                    onClick={() => router.push(`/group/${slug}/results`)}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-3 transition-colors"
                  >
                    <div className="w-5 h-5 flex items-center justify-center rounded-full bg-yellow-500/20 text-yellow-400">
                       <Trophy className="w-3 h-3" />
                    </div>
                    <span>Leaderboard</span>
                  </button>
                )}

              <div className="grid grid-cols-2 gap-3 mt-4">
                 <button 
                    onClick={handleShareWhatsApp}
                    className="w-full bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] font-bold py-3 rounded-xl border border-[#25D366]/20 transition-all flex items-center justify-center gap-2"
                 >
                    <MessageCircle className="w-5 h-5" />
                    WhatsApp
                 </button>
                 <button 
                    onClick={handleShareTwitter}
                    className="w-full bg-[#1DA1F2]/20 hover:bg-[#1DA1F2]/30 text-[#1DA1F2] font-bold py-3 rounded-xl border border-[#1DA1F2]/20 transition-all flex items-center justify-center gap-2"
                 >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    Twitter
                 </button>
              </div>
              </div>
            </div>
          </div>

          {/* Right Column: Members Grid */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white/90 flex items-center">
                <Users className="w-5 h-5 mr-3 text-fuchsia-400" />
                The Squad <span className="ml-2 bg-white/10 px-2 py-0.5 rounded-full text-sm">{members.length}</span>
              </h2>
              
              {/* Admin Manage Button */}
              {currentMember?.is_admin && (
                <button 
                  onClick={() => router.push(`/group/${slug}/setup`)}
                  className="text-xs font-bold text-white/40 hover:text-white transition-colors uppercase tracking-wider flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  Manage
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {members.map((member, idx) => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  key={member.id} 
                  className="bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/5 hover:border-white/20 rounded-2xl p-4 flex flex-col items-center text-center transition-all group relative overflow-hidden"
                >
                  <div className="relative mb-3">
                    {member.avatar_seed ? (
                      <img 
                        src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${member.avatar_seed}`} 
                        alt="avatar" 
                        className="w-16 h-16 rounded-full bg-white/5 border-2 border-white/10 group-hover:border-fuchsia-400/50 transition-colors shadow-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-white/5 border-2 border-white/10 border-dashed flex items-center justify-center">
                         <Users className="w-6 h-6 text-white/20" />
                      </div>
                    )}

                    {member.is_admin && (
                      <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-black/10 shadow-sm">
                        ADMIN
                      </span>
                    )}
                    
                    {!member.avatar_seed && (
                       <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white/20 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap backdrop-blur-sm">
                        WAITING
                      </span>
                    )}

                    {member.completed_chapters >= 5 && member.avatar_seed && (
                       <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-black">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                       </div>
                    )}
                  </div>
                  
                  <p className="font-bold text-sm truncate w-full mb-1 text-white/90">
                    {member.display_name}
                  </p>
                  
                  {member.id === currentMember?.id && (
                    <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      You
                    </span>
                  )}
                  
                  {/* Hover Glow */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </motion.div>
              ))}
              
              {/* Empty State / Invite Placeholder */}
              <button onClick={handleCopyLink} className="border-2 border-dashed border-white/10 hover:border-white/30 rounded-2xl p-4 flex flex-col items-center justify-center text-white/30 hover:text-white/60 transition-all min-h-[140px]">
                 <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2">
                    <Users className="w-5 h-5" />
                 </div>
                 <span className="text-xs font-bold uppercase tracking-wider">Invite</span>
              </button>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  )
}