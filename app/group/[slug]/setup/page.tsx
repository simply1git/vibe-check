'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, UserPlus, ArrowRight, Sparkles, Trash2, Copy } from 'lucide-react'
import UserMenu from '@/components/UserMenu'
import { cn } from '@/lib/utils'

export default function SetupPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  
  const [loading, setLoading] = useState(true)
  const [group, setGroup] = useState<any>(null)
  const [accessCode, setAccessCode] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [members, setMembers] = useState<any[]>([])
  const [newMemberName, setNewMemberName] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const controller = new AbortController()

    const fetchGroupAndMembers = async () => {
      try {
        // Verify Admin Access via Member ID (Casual Security Model)
        const memberId = localStorage.getItem('member_id')
        const storedSlug = localStorage.getItem('group_slug')
        
        if (!memberId || storedSlug !== slug) {
          if (mounted) router.push('/')
          return
        }

        // Fetch Group
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('*')
          .eq('slug', slug)
          .abortSignal(controller.signal)
          .single()

        if (!mounted) return
        if (groupError) throw groupError
        setGroup(groupData)
        setAccessCode(groupData.access_code || '')

        // Fetch Current Member to verify Admin status
        const { data: currentMember, error: memberError } = await supabase
          .from('members')
          .select('is_admin')
          .eq('id', memberId)
          .eq('group_id', groupData.id)
          .abortSignal(controller.signal)
          .single()

        if (!mounted) return
        if (memberError || !currentMember?.is_admin) {
          console.warn('User is not an admin', currentMember)
          router.push(`/lobby/${slug}`) // Redirect to lobby if not admin
          return
        }

        // Fetch All Members
        const { data: membersData, error: membersError } = await supabase
          .from('members')
          .select('*')
          .eq('group_id', groupData.id)
          .order('created_at', { ascending: true })
          .abortSignal(controller.signal)

        if (!mounted) return
        if (membersError) throw membersError
        setMembers(membersData || [])

      } catch (err: any) {
        if (err.name === 'AbortError') return
        console.error('Error fetching data:', err)
        if (mounted) router.push('/')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchGroupAndMembers()

    return () => {
      mounted = false
      controller.abort()
    }
  }, [slug])

  const handleSaveSettings = async () => {
    if (!group) return
    setSavingSettings(true)
    setError(null)
    
    try {
      const { error } = await supabase
        .from('groups')
        .update({ access_code: accessCode || null })
        .eq('id', group.id)

      if (error) throw error
    } catch (err: any) {
      console.error('Error saving settings:', err)
      setError(err.message || 'Failed to save settings')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemberName.trim()) return

    setAdding(true)
    setError(null)

    try {
      // Check for duplicate names locally first
      if (members.some(m => m.display_name.toLowerCase() === newMemberName.trim().toLowerCase())) {
        throw new Error('Member already exists!')
      }

      const { data: newMember, error: addError } = await supabase
        .from('members')
        .insert({
          group_id: group.id,
          display_name: newMemberName.trim(),
          is_admin: false,
          avatar_seed: null, // Indicates "Invited" / Unclaimed
        })
        .select()
        .single()

      if (addError) throw addError

      setMembers([...members, newMember])
      setNewMemberName('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      setMembers(members.filter(m => m.id !== memberId))
    } catch (err) {
      console.error('Error removing member:', err)
    }
  }

  const handleFinish = () => {
    router.push(`/lobby/${slug}`)
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-white selection:bg-fuchsia-500 selection:text-white">
      {/* Background */}
      <div className="fixed inset-0 z-0">
         <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-violet-600/20 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-fuchsia-600/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        {/* Global Nav */}
        <div className="absolute top-4 right-4 z-50">
           <UserMenu />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="text-center space-y-2">
             <div className="flex justify-center mb-6">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 shadow-lg">
                   <h3 className="text-white/80 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                      {group?.name}
                   </h3>
                </div>
             </div>

            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 mb-4">
              <Sparkles className="w-6 h-6 text-fuchsia-400" />
            </div>
            <h1 className="text-4xl font-black tracking-tight">Assemble the Squad</h1>
            <p className="text-white/60 text-lg">
              Add everyone who's playing. They'll join by claiming their name.
            </p>
          </div>

          {/* Group Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-1">Group Code</div>
                <div className="text-2xl font-mono font-bold">{slug}</div>
              </div>
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center font-bold text-xl">
                {group?.name.substring(0, 1).toUpperCase()}
              </div>
            </div>

            {/* Access Code Settings */}
            <div className="pt-4 border-t border-white/10">
               <label className="text-xs font-bold text-fuchsia-300 uppercase tracking-wider mb-2 block">
                 Security Code (Optional)
               </label>
               <div className="flex gap-2">
                 <input
                   type="text"
                   placeholder="e.g. 1234"
                   value={accessCode}
                   onChange={(e) => setAccessCode(e.target.value)}
                   className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/20 focus:outline-none focus:border-fuchsia-500/50 transition-all font-mono"
                   autoComplete="off"
                 />
                 <button
                   onClick={handleSaveSettings}
                   disabled={savingSettings}
                   className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                 >
                   {savingSettings ? 'Saving...' : 'Set Code'}
                 </button>
               </div>
               <p className="text-[10px] text-white/40 mt-2">
                 If set, members must enter this code to join. Keeps strangers out!
               </p>
            </div>
          </div>

          {/* Add Member Form */}
          <form onSubmit={handleAddMember} className="relative">
            <div className="relative">
              <input
                type="text"
                placeholder="Enter friend's name..."
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white placeholder-white/20 focus:outline-none focus:border-fuchsia-500/50 transition-all"
                autoFocus
              />
              <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <button
                type="submit"
                disabled={!newMemberName.trim() || adding}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white text-black font-bold px-4 py-2 rounded-lg hover:bg-fuchsia-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
            {error && (
              <p className="absolute -bottom-6 left-2 text-red-400 text-xs flex items-center gap-1">
                <div className="w-1 h-1 bg-red-400 rounded-full" />
                {error}
              </p>
            )}
          </form>

          {/* Members List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2 text-sm text-white/40 font-medium">
              <span>Guest List ({members.length})</span>
            </div>
            
            <AnimatePresence mode="popLayout">
              {members.map((member) => (
                <motion.div
                  key={member.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                      member.is_admin ? "bg-yellow-500/20 text-yellow-500" : "bg-white/10 text-white/60"
                    )}>
                      {member.display_name.substring(0, 1).toUpperCase()}
                    </div>
                    <span className="font-medium">
                      {member.display_name} 
                      {member.is_admin && <span className="ml-2 text-xs text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded">HOST</span>}
                    </span>
                  </div>
                  
                  {!member.is_admin && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-white/20 hover:text-red-400 transition-colors p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Finish Button */}
          <div className="pt-8">
            <button
              onClick={handleFinish}
              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-fuchsia-500/20 hover:shadow-fuchsia-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span>{members.length > 1 ? "Looks Good, Let's Go" : "Add some friends first"}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            
            <p className="text-center text-white/30 text-xs mt-4">
              You can always add more people later from the lobby.
            </p>
          </div>

        </motion.div>
      </div>
    </div>
  )
}