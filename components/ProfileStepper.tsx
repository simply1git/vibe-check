'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, PenLine, Sparkles, Check, ArrowRight, Loader2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import questionsData from '@/lib/questions.json'
import confetti from 'canvas-confetti'
import { generateMemberQuestions } from '@/app/actions'

// Types
interface Question {
  id: string
  chapter: number
  text: string
  options: string[]
}

interface Answer {
  val: string
  isCustom: boolean
}

// VibeOS Themes: All Dark, Neon Accents
const CHAPTER_THEMES: Record<number, { bg: string, accent: string, title: string, desc: string, glow: string }> = {
  1: { 
    bg: "from-slate-900 via-cyan-900 to-slate-900", 
    accent: "text-cyan-400",
    glow: "shadow-cyan-500/20",
    title: "Surface Layer",
    desc: "Let's start with the vibes everyone sees."
  },
  2: { 
    bg: "from-slate-900 via-orange-900 to-slate-900", 
    accent: "text-orange-400",
    glow: "shadow-orange-500/20",
    title: "Lifestyle Layer",
    desc: "How you move through the world."
  },
  3: { 
    bg: "from-slate-900 via-violet-900 to-slate-900", 
    accent: "text-violet-400",
    glow: "shadow-violet-500/20",
    title: "Intermediate Layer",
    desc: "The quirks that make you, you."
  },
  4: { 
    bg: "from-slate-900 via-indigo-900 to-slate-900", 
    accent: "text-indigo-400",
    glow: "shadow-indigo-500/20",
    title: "Deep Layer",
    desc: "Fears, dreams, and the heavy stuff."
  },
  5: { 
    bg: "from-slate-900 via-fuchsia-900 to-slate-900", 
    accent: "text-fuchsia-400",
    glow: "shadow-fuchsia-500/20",
    title: "Soul Layer",
    desc: "The secrets you keep locked away."
  },
  6: { 
    bg: "from-slate-900 via-rose-900 to-slate-900", 
    accent: "text-rose-400",
    glow: "shadow-rose-500/20",
    title: "The Red Flags",
    desc: "Let's unpack your toxic traits."
  },
  7: { 
    bg: "from-slate-900 via-yellow-900 to-slate-900", 
    accent: "text-yellow-400",
    glow: "shadow-yellow-500/20",
    title: "Rapid Fire",
    desc: "Don't think. Just choose."
  }
}

export default function ProfileStepper() {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  
  // State
  const [currentChapter, setCurrentChapter] = useState(1)
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showChapterIntro, setShowChapterIntro] = useState(true)
  const [groupName, setGroupName] = useState<string>('')
  
  // Custom Input State
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({})
  const [activeCustomInput, setActiveCustomInput] = useState<string | null>(null)

  // Question Management
  const questions = questionsData as Question[]
  const currentQuestions = questions.filter(q => q.chapter === currentChapter)
  
  // We track "local" index within the chapter (0-4)
  const [questionIndex, setQuestionIndex] = useState(0)
  const activeQuestion = currentQuestions[questionIndex]

  // Initial Load
  useEffect(() => {
    // Check if we have saved progress to resume
    const loadProgress = async () => {
       const memberId = localStorage.getItem('member_id')
       const slug = localStorage.getItem('group_slug')
       
       if (!memberId) {
          router.push('/')
          return
       }

       if (slug) {
         const { data: group } = await supabase.from('groups').select('name').eq('slug', slug).single()
         if (group) setGroupName(group.name)
       }

       const { data } = await supabase
        .from('profiles')
        .select('answers')
        .eq('member_id', memberId)
        .single()
       
       if (data?.answers) {
         setAnswers(data.answers as Record<string, Answer>)
         
         // Also check member completed_chapters to resume correct chapter
         const { data: member } = await supabase.from('members').select('completed_chapters').eq('id', memberId).single()
         if (member && member.completed_chapters > 0 && member.completed_chapters < 5) {
            setCurrentChapter(member.completed_chapters + 1)
         }
       }
    }
    loadProgress()
  }, [])

  // Auto-activate "Write your own" inputs
  useEffect(() => {
    if (activeQuestion) {
      const isWriteYourOwnOnly = activeQuestion.options.length === 1 && activeQuestion.options[0] === 'Write your own'
      if (isWriteYourOwnOnly) {
        setActiveCustomInput(activeQuestion.id)
      } else {
        // Reset if moving to a normal question (unless user clicked pencil)
        // Actually better to clear it unless we want to persist state across navigation back/forth
        setActiveCustomInput(null)
      }
    }
  }, [activeQuestion])

  // Actions
  const handleOptionSelect = (option: string) => {
    setAnswers(prev => ({
      ...prev,
      [activeQuestion.id]: { val: option, isCustom: false }
    }))
    
    // Auto-advance after small delay for feel
    setTimeout(() => {
      handleNext()
    }, 400)
  }

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeCustomInput || !customInputs[activeCustomInput]) return
    
    setAnswers(prev => ({
      ...prev,
      [activeCustomInput]: { val: customInputs[activeCustomInput], isCustom: true }
    }))
    setActiveCustomInput(null)
    handleNext(true)
  }

  const handleNext = (force = false) => {
    // If currently editing custom input, don't advance yet
    if (activeCustomInput && !force) return

    if (questionIndex < currentQuestions.length - 1) {
      setQuestionIndex(prev => prev + 1)
    } else {
      // End of Chapter
      saveChapterProgress()
    }
  }

  const handleBack = () => {
    if (questionIndex > 0) {
      setQuestionIndex(prev => prev - 1)
    } else if (currentChapter > 1) {
       // Ideally we'd go back to previous chapter, but for simplicity in this flow,
       // we might just stay here or alert. 
       // For this "Focus Mode", going back chapters is tricky without reloading data.
       // Let's just allow going back within chapter.
    }
  }

  const saveChapterProgress = async () => {
    setSaving(true)
    try {
      const memberId = localStorage.getItem('member_id')
      if (!memberId) throw new Error('No member ID found')

      // Upsert into profiles
      const { error } = await supabase
        .from('profiles')
        .upsert({
          member_id: memberId,
          answers: answers
        }, { onConflict: 'member_id' })

      if (error) throw error
      
      // Update completed_chapters
      await supabase
        .from('members')
        .update({ completed_chapters: currentChapter })
        .eq('id', memberId)
      
      // Generate Questions
      generateMemberQuestions(memberId)

      if (currentChapter < 7) {
        setCurrentChapter(prev => prev + 1)
        setQuestionIndex(0)
        setShowChapterIntro(true)
      } else {
        // FINISHED ALL
        confetti({ 
          particleCount: 200, 
          spread: 100, 
          origin: { y: 0.6 },
          colors: ['#8b5cf6', '#d946ef', '#f472b6']
        })
        const slug = localStorage.getItem('group_slug')
        setTimeout(() => router.push(`/lobby/${slug}`), 2000)
      }

    } catch (error) {
      console.error('Error saving:', error)
      alert('Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  // --- RENDER ---
  const theme = CHAPTER_THEMES[currentChapter]

  return (
    <div className={cn(
      "min-h-screen w-full transition-colors duration-1000 ease-in-out flex flex-col relative overflow-hidden text-white",
      `bg-gradient-to-br ${theme.bg}`
    )}>
      
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-white/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-white/5 rounded-full blur-[120px] animate-pulse delay-1000" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.15%22/%3E%3C/svg%3E')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* Header with Group Name */}
      <div className="relative z-50 pt-6 px-4 flex justify-center">
         <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 shadow-lg">
            <h3 className="text-white/80 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-fuchsia-500 animate-pulse" />
               {groupName}
            </h3>
         </div>
      </div>

      {/* Header / Progress */}
      <div className="relative z-10 p-6 flex justify-between items-center">
         <div className="flex items-center space-x-4">
            <button 
               onClick={() => {
                  const slug = localStorage.getItem('group_slug')
                  router.push(`/lobby/${slug}`)
               }}
               className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
               <X className="w-6 h-6" />
            </button>
            <div className="flex space-x-2">
                {[1, 2, 3, 4, 5, 6, 7].map(c => (
                   <div key={c} className={cn(
                      "h-1.5 w-8 rounded-full transition-all duration-500",
                      c < currentChapter ? "bg-white/80" : 
                      c === currentChapter ? "bg-white w-12 shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "bg-white/10"
                   )} />
                ))}
            </div>
         </div>
         <div className="font-bold text-sm tracking-wider uppercase text-white/40">
            Chapter {currentChapter}/7
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <AnimatePresence mode="wait">
          
          {/* 1. Chapter Intro Screen */}
          {showChapterIntro ? (
            <motion.div
               key={`intro-${currentChapter}`}
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, y: -20 }}
               className="text-center max-w-md"
            >
               <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mb-6 inline-block"
               >
                  <span className={cn(
                     "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-white/20 text-white bg-white/5 backdrop-blur-md",
                  )}>
                     Level {currentChapter} Unlocked
                  </span>
               </motion.div>
               
               <motion.h1 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className={cn("text-5xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60")}
               >
                  {theme.title}
               </motion.h1>
               
               <motion.p 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className={cn("text-xl mb-12 text-white/60")}
               >
                  {theme.desc}
               </motion.p>

               <motion.button
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  onClick={() => setShowChapterIntro(false)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                     "px-8 py-4 rounded-full font-bold text-lg shadow-xl flex items-center mx-auto space-x-2 bg-white text-black hover:bg-gray-100"
                  )}
               >
                  <span>Dive In</span>
                  <ArrowRight className="w-5 h-5" />
               </motion.button>
            </motion.div>
          ) : (
            
            /* 2. Question Card */
            <motion.div
              key={activeQuestion.id}
              initial={{ x: 100, opacity: 0, rotate: 5 }}
              animate={{ x: 0, opacity: 1, rotate: 0 }}
              exit={{ x: -100, opacity: 0, rotate: -5 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full max-w-lg"
            >
               <div className={cn(
                 "bg-black/40 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-2xl border border-white/10 relative overflow-hidden",
                 theme.glow
               )}>
                  {/* Glossy Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                  
                  {/* Progress Line */}
                  <div className="absolute top-0 left-0 h-1 bg-white/10 w-full">
                     <div 
                        className={cn("h-full transition-all duration-500 bg-gradient-to-r from-white to-white/60")}
                        style={{ width: `${((questionIndex + 1) / currentQuestions.length) * 100}%` }}
                     />
                  </div>

                  <div className="mb-8 mt-4 relative z-10">
                     <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                        {activeQuestion.text}
                     </h2>
                  </div>

                  {/* Options Stack */}
                  <div className={cn(
                     "relative z-10",
                     currentChapter === 7 ? "grid grid-cols-2 gap-4" : "space-y-3"
                  )}>
                     {!(activeQuestion.options.length === 1 && activeQuestion.options[0] === 'Write your own') && activeQuestion.options.map((option, idx) => (
                        <motion.button
                           key={option}
                           initial={{ opacity: 0, y: 20 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ delay: idx * 0.1 }}
                           onClick={() => handleOptionSelect(option)}
                           whileHover={{ scale: 1.02 }}
                           whileTap={{ scale: 0.98 }}
                           className={cn(
                              "w-full text-left p-4 rounded-xl border transition-all group relative overflow-hidden",
                              currentChapter === 7 && "text-center py-8 flex flex-col items-center justify-center font-black text-xl",
                              answers[activeQuestion.id]?.val === option && !answers[activeQuestion.id]?.isCustom
                                 ? "border-white/50 bg-white/20 text-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
                                 : "border-white/5 hover:border-white/20 hover:bg-white/5 text-white/70 bg-black/20"
                           )}
                        >
                           <span className="relative z-10">{option}</span>
                           {answers[activeQuestion.id]?.val === option && !answers[activeQuestion.id]?.isCustom && (
                              <motion.span 
                                 layoutId="check"
                                 className={cn(
                                    "absolute",
                                    currentChapter === 7 ? "top-2 right-2" : "right-4 top-1/2 -translate-y-1/2"
                                 )}
                              >
                                 <Check className="w-5 h-5" />
                              </motion.span>
                           )}
                        </motion.button>
                     ))}

                     {/* Magic Pencil Option (Hidden for Rapid Fire) */}
                     {currentChapter !== 7 && (
                     <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className={currentChapter === 7 ? "col-span-2" : ""}
                     >
                        {activeCustomInput === activeQuestion.id || (activeQuestion.options.length === 1 && activeQuestion.options[0] === 'Write your own') ? (
                           <form onSubmit={handleCustomSubmit} className="relative">
                              <input
                                 autoFocus
                                 type="text"
                                 placeholder="Type your truth..."
                                 value={customInputs[activeQuestion.id] || ''}
                                 onChange={(e) => setCustomInputs(prev => ({...prev, [activeQuestion.id]: e.target.value}))}
                                 className={cn(
                                   "w-full p-4 pr-12 rounded-xl border-2 bg-black/50 text-white placeholder-white/30 focus:outline-none text-lg font-medium",
                                   `border-${theme.accent.split('-')[1]}-500`
                                 )}
                              />
                              <button 
                                 type="submit"
                                 className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                 <ArrowRight className="w-4 h-4" />
                              </button>
                           </form>
                        ) : (
                           <button
                              onClick={() => setActiveCustomInput(activeQuestion.id)}
                              className={cn(
                                 "w-full p-4 rounded-xl border-2 border-dashed transition-all flex items-center justify-center space-x-2 group hover:bg-white/5",
                                 answers[activeQuestion.id]?.isCustom 
                                    ? "bg-white/10 border-white/50 text-white" 
                                    : "border-white/20 text-white/50 hover:border-white/40 hover:text-white"
                              )}
                           >
                              <PenLine className="w-5 h-5 group-hover:scale-110 transition-transform" />
                              <span className="font-bold">
                                 {answers[activeQuestion.id]?.isCustom ? answers[activeQuestion.id].val : "Use Magic Pencil"}
                              </span>
                              {!answers[activeQuestion.id]?.isCustom && <Sparkles className="w-4 h-4 opacity-50 group-hover:opacity-100" />}
                           </button>
                        )}
                     </motion.div>
                     )}
                  </div>

                  {/* Footer Controls */}
                  <div className="mt-8 flex justify-between items-center text-sm text-white/30 font-medium relative z-10">
                     <button 
                        onClick={handleBack}
                        disabled={questionIndex === 0}
                        className="hover:text-white disabled:opacity-0 transition-colors flex items-center"
                     >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Back
                     </button>
                     <span>{questionIndex + 1} of {currentQuestions.length}</span>
                  </div>

               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Saving Indicator Overlay */}
      <AnimatePresence>
         {saving && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col items-center justify-center text-white"
            >
               <Loader2 className="w-12 h-12 animate-spin mb-4 text-fuchsia-500" />
               <p className="font-bold text-xl tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400 animate-pulse">
                  Syncing Soul Data...
               </p>
            </motion.div>
         )}
      </AnimatePresence>
      
    </div>
  )
}
