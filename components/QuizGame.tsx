'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { supabase } from '@/lib/supabase'
import questionsData from '@/lib/questions.json'
import { cn } from '@/lib/utils'
import { Loader2, Trophy, XCircle, CheckCircle2, Flame, Sparkles, Shuffle, User, Search, ArrowRight } from 'lucide-react'

// Types
interface QuizQuestion {
  id: string
  question_text: string
  target_member_name: string
  correct_option: string
  options: string[]
}

interface Member {
  id: string
  display_name: string
  avatar_seed: string
}

interface QuizGameProps {
  groupId: string
  memberId: string
  onComplete?: () => void
  onExit?: () => void
  mode?: 'classic' | 'lightning' | 'most_likely'
}

type GameState = 'SELECT' | 'PLAY' | 'GAMEOVER'

export default function QuizGame({ groupId, memberId, onComplete, onExit, mode = 'classic' }: QuizGameProps) {
  const [gameState, setGameState] = useState<GameState>(
    (mode === 'lightning' || mode === 'most_likely') ? 'PLAY' : 'SELECT'
  )
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(mode === 'lightning' || mode === 'most_likely')
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [loadingMsg, setLoadingMsg] = useState('Entering The Arena...')
  
  // Selection State
  const [availableMembers, setAvailableMembers] = useState<Member[]>([])
  const [targetMember, setTargetMember] = useState<Member | 'random' | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Gameplay State
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isAnswering, setIsAnswering] = useState(false)

  // Most Likely To State
  const [mostLikelyQuestions, setMostLikelyQuestions] = useState<any[]>([])

  // Sound Effects
  const playSound = (type: 'correct' | 'wrong' | 'complete' | 'vote') => {
    const audio = new Audio(
      type === 'correct' 
        ? '/sounds/correct.mp3' 
        : type === 'wrong' 
          ? '/sounds/wrong.mp3' 
          : type === 'complete'
            ? '/sounds/complete.mp3'
            : '/sounds/pop.mp3' // Fallback/Vote sound
    )
    audio.volume = 0.5
    audio.play().catch(() => {}) // Ignore autoplay blocks
  }

  // Loading Messages
  const loadingMessages = [
    "Entering The Arena...",
    "Summoning the Vibe...",
    "Decoding Social DNA...",
    "Preparing the Truth Serum..."
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingMsg(loadingMessages[Math.floor(Math.random() * loadingMessages.length)])
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  // 1. Fetch Available Members on Mount
  useEffect(() => {
    const fetchMembers = async () => {
      // Only fetch members if in 'classic' mode where selection is needed
      if (mode === 'classic') {
        setLoading(true)
        try {
          const { data, error } = await supabase
            .from('members')
            .select('id, display_name, avatar_seed')
            .eq('group_id', groupId)
            .neq('id', memberId) // Exclude self
          
          if (error) throw error
          setAvailableMembers(data || [])
        } catch (err) {
          console.error('Error fetching members:', err)
        } finally {
          setLoading(false)
        }
      } else {
        // For other modes, we might start loading immediately or wait for handleStartGame
        // But since we initialize loading state based on mode, we can just set it to false if needed
        // Actually, for lightning/most_likely, we call handleStartGame immediately in another useEffect
        // So we don't need to do anything here except maybe ensure loading is handled there.
      }
    }
    fetchMembers()
  }, [groupId, memberId, mode])

  // 2. Start Game Logic
  const handleStartGame = useCallback(async (target: Member | 'random') => {
    setTargetMember(target)
    setLoading(true)
    setScore(0)
    setStreak(0)
    setCurrentIndex(0)
    setSelectedOption(null)

    if (mode === 'most_likely') {
      const { data: allMembers } = await supabase
        .from('members')
        .select('display_name')
        .eq('group_id', groupId)
      
      const memberOptions = (allMembers || []).map(m => m.display_name)
      const mlQuestions = questionsData.filter(q => q.id.startsWith('ml'))
      
      const randomQuestions = mlQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, 10)
        .map(q => ({
          id: q.id,
          question_text: q.text,
          target_member_name: 'The Group',
          correct_option: '',
          options: memberOptions
        }))

      setQuestions(randomQuestions)
      setGameState('PLAY')
      setLoading(false)
      return
    }

    try {
      setLoadingMsg(target === 'random' ? "Summoning Random Vibes..." : `Syncing with ${target.display_name}...`)

      let query = supabase
        .from('quiz_questions')
        .select(`
          id,
          question_id,
          correct_option,
          distractors,
          target_member_id,
          members:target_member_id (
            display_name
          )
        `)
        .eq('group_id', groupId)
        .limit(50)

      // Filter based on selection
      if (target === 'random') {
        query = query.neq('target_member_id', memberId)
      } else {
        query = query.eq('target_member_id', target.id)
      }

      const { data, error } = await query

      if (error) throw error
      
      if (!data || data.length === 0) {
        alert("No questions found for this selection yet! Try someone else.")
        setLoading(false)
        if (mode === 'lightning') {
          setGameState('GAMEOVER')
        }
        return
      }

      // Process Questions
      let processedQuestions: QuizQuestion[] = []
      
      if (mode === 'most_likely') {
        processedQuestions = questionsData
          .filter(q => q.id.startsWith('ml'))
          .map(q => ({
            id: q.id,
            question_text: q.text,
            target_member_name: 'Group Vote',
            correct_option: '',
            options: [] // Filled dynamically above
          }))
      } else {
        processedQuestions = data.map((item: any) => {
          const qDef = questionsData.find(q => q.id === item.question_id)
          let text = 'Unknown Question'
          const targetName = item.members?.display_name || 'Anonymous'

          if (qDef) {
             // Use friendText if available, otherwise fallback
             // @ts-ignore
             const rawText = qDef.friendText || qDef.text
             // Replace placeholder with name
             text = rawText.replace(/\{name\}/g, targetName)
          }
          
          // Combine and shuffle options
          const allOptions = [...item.distractors, item.correct_option]
            .sort(() => Math.random() - 0.5)

          return {
            id: item.id,
            question_text: text,
            target_member_name: targetName,
            correct_option: item.correct_option,
            options: allOptions
          }
        })
      }

      const questionLimit = mode === 'lightning' ? 5 : 10
      const randomQuestions = processedQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, questionLimit)

      setQuestions(randomQuestions)
      setGameState('PLAY')
    } catch (err) {
      console.error('Error starting game:', err)
    } finally {
      setLoading(false)
    }
  }, [groupId, memberId, mode])

  useEffect(() => {
    if (mode === 'most_likely') {
      handleStartGame('random') // Target doesn't matter for most_likely
    } else if (mode === 'lightning') {
      handleStartGame('random')
    }
  }, [mode, handleStartGame])

  const handleAnswer = async (option: string) => {
    if (isAnswering) return
    setIsAnswering(true)
    setSelectedOption(option)

    const currentQ = questions[currentIndex]

    if (mode === 'most_likely') {
      // MOST LIKELY MODE LOGIC
      playSound('vote')
      
      // Save vote to profiles table
      try {
        // 1. Get current answers
        const { data: profile } = await supabase
          .from('profiles')
          .select('answers')
          .eq('member_id', memberId)
          .single()

        const currentAnswers = profile?.answers || {}
        
        // 2. Find member ID from option name (Need to fetch members again or store them)
        // Optimization: We fetched members in handleStartGame but didn't save them to state.
        // Let's just store the name for now as the value, it's easier.
        // Or better: Fetch the ID map.
        
        const newAnswers = {
          ...currentAnswers,
          [currentQ.id]: { val: option, isCustom: false }
        }

        await supabase
          .from('profiles')
          .upsert({ 
            member_id: memberId,
            answers: newAnswers
          })

      } catch (err) {
        console.error('Error saving vote:', err)
      }

      setTimeout(() => {
        if (currentIndex < questions.length - 1) {
          setCurrentIndex(prev => prev + 1)
          setSelectedOption(null)
          setIsAnswering(false)
        } else {
          playSound('complete')
          setGameState('GAMEOVER')
        }
      }, 800)
      return
    }

    // CLASSIC / LIGHTNING LOGIC
    const isCorrect = option === currentQ.correct_option

    // 1. Confetti if correct
    let earnedPoints = 0
    if (isCorrect) {
      playSound('correct')
      const newStreak = streak + 1
      setStreak(newStreak)
      
      earnedPoints = 10
      // Streak Bonus: +5 every 3 correct
      if (newStreak % 3 === 0) {
        earnedPoints += 5
        confetti({
           particleCount: 50,
           spread: 40,
           origin: { y: 0.8 },
           colors: ['#FFD700'] // Gold for bonus
        })
      }

      setScore(prev => prev + earnedPoints)
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#8b5cf6', '#d946ef', '#f472b6'] // Violet/Fuchsia/Pink
      })
    } else {
      playSound('wrong')
      setStreak(0)
    }

    // 2. Save Attempt
    try {
      await supabase.from('attempts').insert({
        guesser_id: memberId,
        question_id: currentQ.id,
        is_correct: isCorrect,
        points: earnedPoints
      })
    } catch (err) {
      console.error('Error saving attempt:', err)
    }

    // 3. Wait and advance
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1)
        setSelectedOption(null)
        setIsAnswering(false)
      } else {
        playSound('complete')
        setGameState('GAMEOVER')
        // Don't auto-redirect, let user choose
      }
    }, 1500)
  }

  // --- RENDERS ---

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-white">
        <Loader2 className="w-12 h-12 animate-spin text-fuchsia-500 mb-4" />
        <p className="text-white/60 font-medium tracking-widest uppercase text-sm animate-pulse">{loadingMsg}</p>
      </div>
    )
  }

  // 1. SELECTION SCREEN
  if (gameState === 'SELECT') {
    const filteredMembers = availableMembers.filter(m => 
      m.display_name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
      <div className="w-full max-w-2xl mx-auto p-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 mb-2">
            Choose Your Target
          </h2>
          <p className="text-white/60">Who do you want to vibe check?</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input 
            type="text"
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-fuchsia-500/50 focus:bg-white/10 transition-all"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Random Option */}
          <motion.button
            whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.1)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleStartGame('random')}
            className="flex flex-col items-center justify-center p-6 rounded-3xl bg-white/5 border border-white/10 group hover:border-fuchsia-500/50 transition-all min-h-[160px]"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mb-4 shadow-lg shadow-fuchsia-500/20 group-hover:scale-110 transition-transform">
              <Shuffle className="w-8 h-8 text-white" />
            </div>
            <span className="font-bold text-white">Random Mix</span>
            <span className="text-xs text-white/40 mt-1">Chaos Mode</span>
          </motion.button>

          {/* Members */}
          {filteredMembers.map((member) => (
            <motion.button
              key={member.id}
              whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.1)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleStartGame(member)}
              className="flex flex-col items-center justify-center p-6 rounded-3xl bg-white/5 border border-white/10 group hover:border-violet-500/50 transition-all min-h-[160px]"
            >
              <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-br from-white/10 to-white/5 mb-4 group-hover:from-violet-500 group-hover:to-fuchsia-500 transition-colors">
                <img 
                  src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${member.avatar_seed}`}
                  alt={member.display_name}
                  className="w-full h-full rounded-full bg-black"
                />
              </div>
              <span className="font-bold text-white truncate w-full text-center">{member.display_name}</span>
              <span className="text-xs text-white/40 mt-1">Tap to Check</span>
            </motion.button>
          ))}
        </div>

        <div className="mt-8 text-center">
          {onExit && (
            <button 
              onClick={onExit}
              className="text-white/40 hover:text-white/80 font-medium py-2 transition-colors text-sm"
            >
              Back to Lobby
            </button>
          )}
        </div>
      </div>
    )
  }

  // 2. GAME OVER SCREEN
  if (gameState === 'GAMEOVER') {
    return (
      <div className="text-center p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl animate-in fade-in zoom-in duration-500 max-w-md mx-auto">
        <div className="w-24 h-24 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-fuchsia-500/25">
          <Trophy className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
          {mode === 'lightning' ? 'Lightning Round Complete' : 'Vibe Check Complete'}
        </h2>
        <p className="text-white/60 mb-8 font-medium">
          {mode === 'lightning' ? 'Your score' : 'Your compatibility score'}
        </p>
        <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 mb-8">
          {score}
        </div>
        <div className="flex flex-col space-y-3">
          <button 
            onClick={() => (mode === 'lightning' ? handleStartGame('random') : setGameState('SELECT'))}
            className="bg-white text-black hover:bg-gray-100 font-bold py-4 px-10 rounded-full transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/10 flex items-center justify-center space-x-2"
          >
            <span>Play Again</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          
          {onComplete && (
            <button 
              onClick={onComplete}
              className="bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-10 rounded-full transition-all border border-white/10 flex items-center justify-center space-x-2"
            >
              <span>View Leaderboard</span>
              <Trophy className="w-4 h-4" />
            </button>
          )}

          {onExit && (
            <button 
              onClick={onExit}
              className="text-white/40 hover:text-white/80 font-medium py-2 transition-colors text-sm"
            >
              Back to Lobby
            </button>
          )}
        </div>
      </div>
    )
  }

  // 3. PLAY SCREEN
  const currentQ = questions[currentIndex]

  return (
    <div className="relative w-full max-w-md mx-auto h-[600px] perspective-1000">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-violet-600/20 to-fuchsia-600/20 blur-3xl -z-10 rounded-full" />

      {/* Header HUD */}
      <div className="absolute -top-12 left-0 right-0 flex justify-between items-center px-2 z-10">
        <div className="flex items-center space-x-2">
          <button 
             onClick={() => (mode === 'lightning' ? onExit?.() : setGameState('SELECT'))}
             className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
             Exit
          </button>
          
          {/* Progress Bar */}
          <div className="flex items-center space-x-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <span className="text-xs font-bold text-white/80 w-8 text-center">
              {currentIndex + 1}/{questions.length}
            </span>
            <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-fuchsia-500 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {streak > 1 && (
            <div className="flex items-center space-x-1 bg-gradient-to-r from-orange-500/20 to-red-500/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-orange-500/30 text-xs font-bold text-orange-400">
              <Flame className="w-3 h-3 fill-orange-500" />
              <span>{streak} Streak</span>
            </div>
          )}
        </div>
        <div className="bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-sm font-bold text-fuchsia-400 flex items-center space-x-2">
          <Sparkles className="w-3 h-3" />
          <span>{score} pts</span>
        </div>
      </div>

      {/* Cards Stack */}
      <div className="relative w-full h-full flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full bg-black/40 backdrop-blur-xl rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl relative"
          >
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            
            <div className="p-8 h-full flex flex-col relative z-10">
              {/* Question Header */}
              <div className="mb-8">
                <div className="flex items-center justify-center mb-6">
                  <span className="inline-flex items-center space-x-2 bg-white/10 text-white/90 text-xs font-bold tracking-widest px-4 py-1.5 rounded-full uppercase border border-white/5">
                    <User className="w-3 h-3 text-fuchsia-400" />
                    <span>Guessing For: <span className="text-fuchsia-400">{currentQ.target_member_name}</span></span>
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-white leading-tight text-center">
                  {currentQ.question_text}
                </h3>
              </div>

              {/* Options */}
              <div className="space-y-3 mt-auto">
                {currentQ.options.map((option, idx) => {
                  let buttonStyle = "bg-white/5 hover:bg-white/10 border-white/10 text-white/80"
                  let Icon = null
                  let scale = 1

                  if (selectedOption) {
                    if (option === currentQ.correct_option) {
                      buttonStyle = "bg-green-500/20 border-green-500/50 text-green-200 shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                      Icon = CheckCircle2
                      scale = 1.02
                    } else if (option === selectedOption) {
                      buttonStyle = "bg-red-500/20 border-red-500/50 text-red-200"
                      Icon = XCircle
                      scale = 0.98
                    } else {
                      buttonStyle = "opacity-30 bg-black/20 border-transparent"
                    }
                  }

                  return (
                    <motion.button
                      key={idx}
                      whileHover={!isAnswering ? { scale: 1.02, backgroundColor: "rgba(255,255,255,0.1)" } : {}}
                      whileTap={!isAnswering ? { scale: 0.98 } : {}}
                      animate={{ scale }}
                      onClick={() => handleAnswer(option)}
                      disabled={isAnswering}
                      className={cn(
                        "w-full text-left p-5 rounded-2xl border transition-all flex items-center justify-between group relative overflow-hidden",
                        buttonStyle
                      )}
                    >
                      <span className="font-medium relative z-10">{option}</span>
                      {Icon && <Icon className="w-5 h-5 relative z-10" />}
                    </motion.button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
