'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import questionsData from '@/lib/questions.json'
import { analyzeVibe, calculateCompatibility } from '@/lib/vibe-analysis'
import VibeRadar from '@/components/VibeRadar'
import { ArrowLeft, Share2, Award, Zap, Heart, Star, Lock } from 'lucide-react'
import { motion } from 'framer-motion'

export default function MemberProfilePage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const memberId = params.memberId as string

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [member, setMember] = useState<any>(null)
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [compatibility, setCompatibility] = useState<number | null>(null)
  const [vibeData, setVibeData] = useState<any>(null)

  useEffect(() => {
    fetchData()
  }, [memberId])

  const fetchData = async () => {
    try {
      // 1. Get Member Info
      const { data: memberData, error: mError } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single()
      
      if (mError) throw mError
      setMember(memberData)

      // 2. Get Profile Answers
      const { data: profileData, error: pError } = await supabase
        .from('profiles')
        .select('answers')
        .eq('member_id', memberId)
        .single()
      
      if (pError && pError.code !== 'PGRST116') throw pError // Ignore not found
      
      const answers = profileData?.answers || {}
      setProfile(answers)

      // 3. Analyze Vibe
      if (Object.keys(answers).length > 0) {
        const analysis = analyzeVibe(answers)
        setVibeData(analysis)
      }

      // 4. Calculate Compatibility (if viewer is different)
      const currentMemberId = localStorage.getItem('member_id')
      setViewerId(currentMemberId)

      if (currentMemberId && currentMemberId !== memberId && Object.keys(answers).length > 0) {
        const { data: myProfile } = await supabase
          .from('profiles')
          .select('answers')
          .eq('member_id', currentMemberId)
          .single()
        
        if (myProfile?.answers) {
          const matchScore = calculateCompatibility(myProfile.answers, answers)
          setCompatibility(matchScore)
        }
      }

    } catch (err) {
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const getQuestionText = (id: string) => questionsData.find(q => q.id === id)?.text || id

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-white/10 rounded-full" />
          <div className="h-4 w-32 bg-white/10 rounded" />
        </div>
      </div>
    )
  }

  if (!member) return <div className="min-h-screen bg-black text-white p-10">Member not found</div>

  const isMe = viewerId === memberId
  const bgGradient = vibeData?.colorPalette || "from-violet-900 to-black"

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgGradient} text-white selection:bg-white/30`}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 p-4 z-50 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent backdrop-blur-sm">
        <button 
          onClick={() => router.back()}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-bold tracking-widest uppercase opacity-80">Vibe Check Profile</h1>
        <button 
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: `Check out ${member.display_name}'s Vibe`,
                url: window.location.href
              })
            } else {
               navigator.clipboard.writeText(window.location.href)
               alert('Link copied!')
            }
          }}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </header>

      <main className="pt-24 pb-20 px-6 max-w-md mx-auto space-y-12">
        
        {/* Hero Section */}
        <div className="text-center space-y-4 relative">
           <div className="relative inline-block">
             <img 
               src={`https://api.dicebear.com/9.x/notionists/svg?seed=${member.avatar_seed}`}
               alt={member.display_name}
               className="w-32 h-32 rounded-full border-4 border-white/20 shadow-2xl mx-auto bg-black/40"
             />
             {isMe && <div className="absolute bottom-0 right-0 bg-white text-black text-xs font-bold px-2 py-1 rounded-full">YOU</div>}
           </div>
           
           <div>
             <h1 className="text-4xl font-black tracking-tight mb-1">{member.display_name}</h1>
             {vibeData ? (
               <div className="flex flex-col gap-2 items-center">
                 <div className="inline-block px-4 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-sm font-medium text-white/90">
                   {vibeData.archetype}
                 </div>
                 {vibeData.toxicTrait && (
                   <div className="inline-block px-4 py-1 rounded-full bg-rose-500/20 backdrop-blur-md border border-rose-500/20 text-xs font-bold text-rose-200 uppercase tracking-wide">
                     ⚠️ {vibeData.toxicTrait}
                   </div>
                 )}
               </div>
             ) : (
               <p className="text-white/50 text-sm">Profile Incomplete</p>
             )}
           </div>

           {/* Compatibility Badge */}
           {compatibility !== null && !isMe && (
             <motion.div 
               initial={{ scale: 0.8, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="flex items-center justify-center gap-2 mt-4 text-green-300 bg-green-900/30 py-2 px-4 rounded-xl border border-green-500/30 mx-auto w-fit"
             >
               <Zap className="w-4 h-4 fill-current" />
               <span className="font-bold">{compatibility}% Match</span>
             </motion.div>
           )}
        </div>

        {/* The Radar */}
        {vibeData && (
          <section className="space-y-4">
             <div className="flex items-center gap-2 opacity-70 mb-2">
               <Award className="w-4 h-4" />
               <h3 className="text-xs font-bold uppercase tracking-wider">Vibe Signature</h3>
             </div>
             <div className="bg-white/5 rounded-3xl p-6 border border-white/10 shadow-inner">
               <VibeRadar stats={vibeData.stats} />
               <div className="grid grid-cols-3 gap-2 text-center mt-6">
                 <div>
                   <div className="text-xs opacity-50 uppercase">Chaos</div>
                   <div className="font-mono font-bold text-lg">{vibeData.stats.chaos}%</div>
                 </div>
                 <div>
                   <div className="text-xs opacity-50 uppercase">Social</div>
                   <div className="font-mono font-bold text-lg">{vibeData.stats.social}%</div>
                 </div>
                 <div>
                   <div className="text-xs opacity-50 uppercase">Wholesome</div>
                   <div className="font-mono font-bold text-lg">{vibeData.stats.wholesome}%</div>
                 </div>
               </div>
             </div>
          </section>
        )}

        {/* Rapid Fire Section */}
        {profile && profile['q30'] && (
             <section className="space-y-4">
               <div className="flex items-center gap-2 opacity-70 mb-2">
                 <Zap className="w-4 h-4" />
                 <h3 className="text-xs font-bold uppercase tracking-wider">Rapid Fire</h3>
               </div>
               <div className="grid grid-cols-2 gap-3">
                 {['q30', 'q31', 'q32', 'q33', 'q34'].map(id => {
                    const ans = profile[id]
                    if (!ans) return null
                    const qText = getQuestionText(id).replace('Rapid Fire: ', '')
                    return (
                      <div key={id} className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                        <div className="text-[10px] text-white/40 uppercase mb-1">{qText}</div>
                        <div className="font-bold text-sm">{ans.val}</div>
                      </div>
                    )
                 })}
               </div>
             </section>
        )}

        {/* The Receipts (Answers) */}
        {profile && Object.keys(profile).length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center gap-2 opacity-70">
               <Star className="w-4 h-4" />
               <h3 className="text-xs font-bold uppercase tracking-wider">The Receipts</h3>
             </div>
            
            <div className="grid gap-4">
              {/* Highlight Specific Questions */}
              {[
                { id: 'q1', label: "Aesthetic" },
                { id: 'q5', label: "Nickname" }, // Text
                { id: 'q16', label: "Hill to Die On" },
                { id: 'q29', label: "Zombie Plan" },
                { id: 'q25', label: "Core Memory" } // Text
              ].map(item => {
                const ans = profile[item.id]
                if (!ans) return null
                return (
                  <div key={item.id} className="bg-white/5 rounded-2xl p-5 border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="text-xs font-bold text-white/40 uppercase mb-2 tracking-wider">{item.label}</div>
                    <div className="text-lg font-medium leading-snug">{ans.val}</div>
                    {item.id === 'q1' && (
                      <div className="text-xs text-white/30 mt-2 italic">{getQuestionText('q1')}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Locked State if incomplete */}
        {(!profile || Object.keys(profile).length < 25) && (
          <div className="text-center py-10 opacity-50">
            <Lock className="w-12 h-12 mx-auto mb-4" />
            <p>This soul is still loading...</p>
          </div>
        )}

      </main>
    </div>
  )
}
