'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, User, ChevronDown, Loader2, Shield, KeyRound, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { hashPin } from '@/lib/crypto'

type MenuView = 'main' | 'security'

export default function UserMenu({ className }: { className?: string }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState<MenuView>('main')
  const [member, setMember] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const menuRef = useRef<HTMLDivElement>(null)
  const isMounted = useRef(true)

  // PIN Change State
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const [pinError, setPinError] = useState<string | null>(null)
  const [pinSuccess, setPinSuccess] = useState(false)

  useEffect(() => {
    fetchMember()

    // Click outside listener
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        resetPinForm()
        setView('main')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      isMounted.current = false
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const resetPinForm = () => {
    setOldPin('')
    setNewPin('')
    setConfirmPin('')
    setPinError(null)
    setPinSuccess(false)
  }

  const fetchMember = async () => {
    try {
      const memberId = localStorage.getItem('member_id')
      if (!memberId) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('members')
        .select('display_name, avatar_seed, is_admin')
        .eq('id', memberId)
        .single()

      if (data) {
        setMember(data)
      }
    } catch (err) {
      console.error('Error fetching member for menu:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleHome = () => {
    const slug = localStorage.getItem('group_slug')
    if (slug) {
      router.push(`/lobby/${slug}`)
    } else {
      router.push('/')
    }
  }

  const handleLogout = () => {
    // 1. Clear Local Storage
    localStorage.removeItem('member_id')
    localStorage.removeItem('group_id')
    localStorage.removeItem('group_slug')
    localStorage.removeItem('admin_token') // Just in case

    // 2. Redirect to Home
    router.push('/')
  }

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault()
    setPinError(null)
    setPinSuccess(false)
    setPinLoading(true)

    try {
      if (!oldPin || !newPin || !confirmPin) throw new Error('All fields required')
      if (newPin.length < 4) throw new Error('PIN must be 4 digits')
      if (newPin !== confirmPin) throw new Error('New PINs do not match')
      
      const memberId = localStorage.getItem('member_id')
      if (!memberId) throw new Error('Not logged in')

      // 1. Verify & Update via Secure RPC
      const oldHash = await hashPin(oldPin, memberId)
      const newHash = await hashPin(newPin, memberId)

      const { data: success, error: rpcError } = await supabase.rpc('change_pin', {
        input_member_id: memberId,
        old_pin_hash: oldHash,
        new_pin_hash: newHash
      })

      if (rpcError) throw rpcError
      if (!success) throw new Error('Incorrect current PIN')

      setPinSuccess(true)
      setTimeout(() => {
        setIsOpen(false)
        resetPinForm()
        setView('main')
      }, 1500)

    } catch (err: any) {
      // Ignore abort errors which happen if menu closes during request
      if (err.message === 'AbortError' || err.code === 20 || err.name === 'AbortError') return
      
      let message = err.message
      if (message.includes('Could not find the function') || message.includes('function not found')) {
         message = 'System Update Required: Please run the "migration_secure_rpc.sql" script in Supabase.'
      }
      setPinError(message)
    } finally {
      if (isMounted.current) setPinLoading(false)
    }
  }

  if (loading) return null
  if (!member) return null

  return (
    <div className={cn("relative z-50", className)} ref={menuRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) {
            setView('main')
            resetPinForm()
          }
        }}
        className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full pl-1 pr-3 py-1 transition-all group"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-fuchsia-500 p-[1px]">
           {member.avatar_seed ? (
             <img 
               src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${member.avatar_seed}`} 
               alt="Avatar" 
               className="w-full h-full rounded-full bg-black"
             />
           ) : (
             <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
               <User className="w-4 h-4 text-white/50" />
             </div>
           )}
        </div>
        <span className="text-sm font-bold text-white/90 max-w-[100px] truncate">
          {member.display_name}
        </span>
        <ChevronDown className={cn(
          "w-4 h-4 text-white/50 transition-transform duration-200",
          isOpen ? "rotate-180" : "rotate-0"
        )} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 mt-2 w-64 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl"
          >
            <AnimatePresence mode="wait">
              {view === 'main' ? (
                <motion.div
                  key="main"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="p-3 border-b border-white/5">
                    <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-1">Signed in as</p>
                    <p className="text-white font-bold truncate">{member.display_name}</p>
                    {member.is_admin && (
                      <span className="inline-block mt-1 text-[10px] bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded border border-yellow-500/20">
                        Admin
                      </span>
                    )}
                  </div>
                  
                  <div className="p-1 space-y-1">
                    <button
                      onClick={handleHome}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-white/70 hover:bg-white/10 transition-colors text-sm font-medium"
                    >
                      <div className="w-4 h-4 flex items-center justify-center">🏠</div>
                      <span>Home</span>
                    </button>

                    <button
                      onClick={() => setView('security')}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-white/70 hover:bg-white/10 transition-colors text-sm font-medium"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Security</span>
                    </button>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="security"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 20, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                   <div className="p-3 border-b border-white/5 flex items-center gap-2">
                     <button 
                       onClick={() => setView('main')}
                       className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                     >
                       <ArrowLeft className="w-4 h-4 text-white/70" />
                     </button>
                     <span className="text-sm font-bold text-white">Change PIN</span>
                   </div>

                   <form onSubmit={handleChangePin} className="p-3 space-y-3">
                     <div className="space-y-1">
                       <label className="text-[10px] uppercase font-bold text-white/40">Current PIN</label>
                       <input 
                         type="password"
                         maxLength={4}
                         placeholder="••••"
                         value={oldPin}
                         onChange={e => setOldPin(e.target.value)}
                         className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-center tracking-widest focus:outline-none focus:border-white/30"
                       />
                     </div>
                     <div className="space-y-1">
                       <label className="text-[10px] uppercase font-bold text-white/40">New PIN</label>
                       <input 
                         type="password"
                         maxLength={4}
                         placeholder="••••"
                         value={newPin}
                         onChange={e => setNewPin(e.target.value)}
                         className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-center tracking-widest focus:outline-none focus:border-white/30"
                       />
                     </div>
                     <div className="space-y-1">
                       <label className="text-[10px] uppercase font-bold text-white/40">Confirm New</label>
                       <input 
                         type="password"
                         maxLength={4}
                         placeholder="••••"
                         value={confirmPin}
                         onChange={e => setConfirmPin(e.target.value)}
                         className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-center tracking-widest focus:outline-none focus:border-white/30"
                       />
                     </div>

                     {pinError && (
                       <p className="text-xs text-red-300 bg-red-500/10 p-2 rounded border border-red-500/20">
                         {pinError}
                       </p>
                     )}
                     
                     {pinSuccess && (
                       <p className="text-xs text-green-300 bg-green-500/10 p-2 rounded border border-green-500/20">
                         PIN updated successfully!
                       </p>
                     )}

                     <button
                       type="submit"
                       disabled={pinLoading || pinSuccess}
                       className="w-full bg-white text-black font-bold py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 text-xs flex items-center justify-center gap-2"
                     >
                       {pinLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Update PIN'}
                     </button>
                   </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
