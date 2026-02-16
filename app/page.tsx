'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, UserPlus, ArrowRight, Loader2, Sparkles, Zap, Heart, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { hashPin } from '@/lib/crypto'
import { motion, AnimatePresence } from 'framer-motion'

type Tab = 'create' | 'join' | 'password' | 'create_pin' | 'login_pin'

export default function Home() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('create')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create Form State
  const [groupName, setGroupName] = useState('')
  const [creatorName, setCreatorName] = useState('')
  const [showJoinSuggestion, setShowJoinSuggestion] = useState(false)

  // Join Form State
  const [joinSlug, setJoinSlug] = useState('')
  const [joinDisplayName, setJoinDisplayName] = useState('')
  const [suggestedMembers, setSuggestedMembers] = useState<any[]>([])

  // Password Challenge State
  const [passwordInput, setPasswordInput] = useState('')
  const [pendingJoin, setPendingJoin] = useState<{slug: string, name: string, correctCode?: string, memberId?: string, groupId?: string} | null>(null)
  
  // New PIN State
  const [pinInput, setPinInput] = useState('')
  const [confirmPinInput, setConfirmPinInput] = useState('')

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setShowJoinSuggestion(false)
    setLoading(true)

    try {
      if (!groupName.trim() || !creatorName.trim()) {
        throw new Error('Please fill in all fields')
      }

      // Step 1: Switch to PIN Creation if not already done
      if (activeTab === 'create') {
        setActiveTab('create_pin')
        setLoading(false)
        return
      }

      // If we are here, we are submitting from create_pin tab
      if (pinInput.length < 4) throw new Error('PIN must be at least 4 digits')
      if (pinInput !== confirmPinInput) throw new Error('PINs do not match')

      // Use user provided name as slug (strict)
      const slug = groupName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      
      if (!slug) throw new Error('Invalid group name')

      // 1. Create Group
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: groupName,
          slug: slug,
        })
        .select()
        .single()

      if (groupError) {
        if (groupError.code === '23505') { // Duplicate key
          setShowJoinSuggestion(true)
          setActiveTab('create') // Go back to fix name
          setLoading(false)
          setError('Group name already taken!')
          return // Stop execution, don't throw
        }
        throw groupError
      }

      // 2. Create Admin Member
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .insert({
          group_id: groupData.id,
          display_name: creatorName,
          is_admin: true,
          avatar_seed: Math.random().toString(36).substring(7), // Admin is auto-joined
        })
        .select()
        .single()

      if (memberError) throw memberError

      // 3. Store PIN Hash
      const hashedPin = await hashPin(pinInput, memberData.id)
      const { error: pinError } = await supabase.rpc('set_pin', {
        input_member_id: memberData.id,
        input_pin_hash: hashedPin
      })
      
      if (pinError) console.error('Failed to save PIN:', pinError)
      // We don't block login if PIN fails, but we should warn? 
      // For now proceed, they can reset later if we add that feature.

      // 4. Store in LocalStorage
      localStorage.setItem('member_id', memberData.id)
      localStorage.setItem('group_id', groupData.id)
      localStorage.setItem('group_slug', slug)
      if (groupData.admin_token) {
        localStorage.setItem('admin_token', groupData.admin_token)
      }

      // Success -> Redirect to Setup
      router.push(`/group/${slug}/setup`)
    } catch (err: any) {
      console.error('Error creating group:', err)
      let message = err.message || 'Failed to create group.'
      if (message.includes('Could not find the function') || message.includes('function not found')) {
         message = 'System Update Required: Please run the "migration_secure_rpc.sql" script in Supabase.'
      } else if (message.includes('Failed to fetch') || message.includes('Network request failed')) {
         message = 'Network error. Please check your internet connection.'
      }
      setError(message)
      setLoading(false)
    }
    // Note: We leave loading=true on success to prevent double-clicks during navigation
  }

  const handleJoinGroup = async (e: React.FormEvent, selectedName?: string) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    setSuggestedMembers([])

    const nameToJoin = selectedName || joinDisplayName

    try {
      if (!joinSlug.trim() || !nameToJoin.trim()) {
        throw new Error('Please fill in all fields')
      }

      const targetSlug = joinSlug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      console.log('Joining group:', { joinSlug, targetSlug })

      // 1. Check if Group Exists
      let { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('id, slug, name, access_code')
        .eq('slug', targetSlug)
        .maybeSingle()

      if (groupError) {
        if (groupError.message?.includes('access_code')) {
           throw new Error('Database update required! Please run the SQL migration.')
        }
        throw new Error(groupError.message)
      }

      // Fallback: Try by exact name match (case insensitive) if slug failed
      if (!groupData) {
         const { data: nameMatchData, error: nameError } = await supabase
            .from('groups')
            .select('id, slug, name, access_code')
            .ilike('name', joinSlug.trim())
            .limit(1)
            .maybeSingle()
         
         if (nameMatchData) {
            groupData = nameMatchData
            groupError = null 
         }
      }

      if (groupError || !groupData) throw new Error('Group not found. Check the name!')

      // 2. Find Member in the Guest List
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('group_id', groupData.id)
        .ilike('display_name', nameToJoin.trim())
        .order('avatar_seed', { ascending: true, nullsFirst: true })
        .limit(1)
        .maybeSingle()

      if (memberError) throw memberError

      if (!memberData) {
        const { data: suggestions } = await supabase
           .from('members')
           .select('display_name, avatar_seed')
           .eq('group_id', groupData.id)
           .order('avatar_seed', { ascending: true, nullsFirst: true })
           .limit(10)

        if (suggestions && suggestions.length > 0) {
           const hasUnclaimed = suggestions.some(m => !m.avatar_seed)
           setSuggestedMembers(suggestions)
           if (hasUnclaimed) {
              setError(`We couldn't find "${nameToJoin}". Did you mean one of these?`)
           } else {
              setError(`We couldn't find "${nameToJoin}". Here is the guest list:`)
           }
           return
        }
        throw new Error(`You are not on the guest list for ${groupData.name}. Ask the host to add you!`)
      }

      // 1.5 Security Check (Group Access Code)
      if (groupData.access_code) {
        // Only ask if we haven't already passed this check (pendingJoin tracks state)
        // If we are coming from password tab, passwordInput should match
        const isFromPasswordTab = activeTab === 'password'
        
        if (!isFromPasswordTab || passwordInput !== groupData.access_code) {
          if (!isFromPasswordTab) {
             setPendingJoin({
               slug: groupData.slug,
               name: nameToJoin,
               correctCode: groupData.access_code
             })
             setActiveTab('password')
             setLoading(false)
             return
          }
        }
      }

      // 3. Check Status & PIN Flow
      if (memberData.avatar_seed) {
        // ALREADY JOINED -> REQUIRE PIN LOGIN
        setPendingJoin({
          slug: groupData.slug,
          name: nameToJoin,
          memberId: memberData.id,
          groupId: groupData.id
        })
        setActiveTab('login_pin')
        setLoading(false)
        return
      }

      // UNCLAIMED -> REQUIRE PIN CREATION
      setPendingJoin({
        slug: groupData.slug,
        name: nameToJoin,
        memberId: memberData.id,
        groupId: groupData.id
      })
      setActiveTab('create_pin')
      setLoading(false)

    } catch (err: any) {
      console.error('Error joining group:', err)
      let message = err.message || 'Failed to join group'
      if (message.includes('Could not find the function') || message.includes('function not found')) {
         message = 'System Update Required: Please run the "migration_secure_rpc.sql" script in Supabase.'
      } else if (message.includes('Failed to fetch') || message.includes('Network request failed')) {
         message = 'Network error. Please check your internet connection.'
      }
      setError(message)
      setLoading(false)
    }
    // Note: We leave loading=true on success to prevent double-clicks during navigation
  }

  const handleClaimWithPin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pendingJoin || !pendingJoin.memberId) return
    setLoading(true)
    setError(null)

    try {
       if (pinInput.length < 4) throw new Error('PIN must be at least 4 digits')
       if (pinInput !== confirmPinInput) throw new Error('PINs do not match')

       const hashedPin = await hashPin(pinInput, pendingJoin.memberId)

       // 1. Save PIN
       const { error: pinError } = await supabase.rpc('set_pin', {
         input_member_id: pendingJoin.memberId,
         input_pin_hash: hashedPin
       })
       
       if (pinError) throw pinError

       // 2. Claim Spot
       const { data: claimedMember, error: claimError } = await supabase
        .from('members')
        .update({
          avatar_seed: Math.random().toString(36).substring(7)
        })
        .eq('id', pendingJoin.memberId)
        .select()
        .single()

      if (claimError) throw claimError

      // 3. Store LocalStorage
      localStorage.setItem('member_id', claimedMember.id)
      localStorage.setItem('group_id', pendingJoin.groupId!)
      localStorage.setItem('group_slug', pendingJoin.slug)

      router.push(`/lobby/${pendingJoin.slug}`)

    } catch (err: any) {
       let message = err.message
       if (message.includes('Could not find the function') || message.includes('function not found')) {
         message = 'System Update Required: Please run the "migration_secure_rpc.sql" script in Supabase.'
       }
       setError(message)
       setLoading(false)
    }
    // Note: We leave loading=true on success to prevent double-clicks during navigation
  }

  const handleLoginWithPin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pendingJoin || !pendingJoin.memberId) return
    setLoading(true)
    setError(null)

    try {
      const hashedPin = await hashPin(pinInput, pendingJoin.memberId)

      // Verify PIN via RPC
      const { data: isValid, error: checkError } = await supabase.rpc('verify_pin', {
        input_member_id: pendingJoin.memberId,
        input_pin_hash: hashedPin
      })

      if (checkError) throw checkError

      if (!isValid) {
        // Fallback: Check if they have a PIN at all
        const { data: hasPin, error: hasPinError } = await supabase.rpc('has_pin', {
          input_member_id: pendingJoin.memberId
        })
        
        if (!hasPin && !hasPinError) {
           // User from before the security update. Allow login & prompt setup later?
           // For now, let's just let them in to avoid lockout, OR force setup.
           // Let's FORCE setup for legacy users.
           setActiveTab('create_pin')
           setError("Security Update: Please set a PIN for your account.")
           setLoading(false)
           return
        }

        throw new Error('Incorrect PIN')
      }

      // Success
      localStorage.setItem('member_id', pendingJoin.memberId)
      localStorage.setItem('group_id', pendingJoin.groupId!)
      localStorage.setItem('group_slug', pendingJoin.slug)

      router.push(`/lobby/${pendingJoin.slug}`)

    } catch (err: any) {
       let message = err.message
       if (message.includes('Could not find the function') || message.includes('function not found')) {
          message = 'System Update Required: Please run the "migration_secure_rpc.sql" script in Supabase.'
       }
       setError(message)
       setLoading(false)
    }
    // Note: We leave loading=true on success to prevent double-clicks during navigation
  }

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault()
    if (!pendingJoin) return

    if (passwordInput === pendingJoin.correctCode) {
      // Success! Retry joining with the correct code in state
      handleJoinGroup(e, pendingJoin.name)
    } else {
      setError('Incorrect code. Ask the host!')
    }
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative selection:bg-fuchsia-500 selection:text-white">
      
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-violet-600/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-fuchsia-600/30 rounded-full blur-[120px] animate-pulse delay-1000" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.15%22/%3E%3C/svg%3E')] opacity-20 mix-blend-overlay"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.8 }}
            className="inline-flex items-center justify-center p-3 mb-4 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/25"
          >
            <Zap className="w-8 h-8 text-white fill-white" />
          </motion.div>
          
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-violet-200 to-fuchsia-200"
          >
            VibeCheck
          </motion.h1>
          
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-white/60 font-medium max-w-md mx-auto"
          >
            The ultimate friendship compatibility engine.
            <br />
            <span className="text-violet-300">No login required.</span>
          </motion.p>
        </div>

        {/* Main Card */}
        <motion.div 
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-2 shadow-2xl"
        >
          {/* Tabs */}
          <div className="grid grid-cols-2 p-1 bg-black/20 rounded-2xl mb-6 relative">
            <motion.div 
              className="absolute inset-y-1 rounded-xl bg-white/10 shadow-sm"
              layoutId="activeTab"
              initial={false}
              animate={{ 
                x: activeTab === 'create' ? 4 : '100%',
                width: 'calc(50% - 8px)'
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
            <button
              onClick={() => setActiveTab('create')}
              className={cn(
                "relative z-10 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2",
                activeTab === 'create' ? "text-white" : "text-white/40 hover:text-white/60"
              )}
            >
              <Sparkles className="w-4 h-4" />
              Create Group
            </button>
            <button
              onClick={() => setActiveTab('join')}
              className={cn(
                "relative z-10 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2",
                activeTab === 'join' ? "text-white" : "text-white/40 hover:text-white/60"
              )}
            >
              <Users className="w-4 h-4" />
              Join Group
            </button>
          </div>

          <div className="px-6 pb-6">
            <AnimatePresence mode="wait">
              {activeTab === 'create' ? (
                <motion.form
                  key="create"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleCreateGroup}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-violet-300 uppercase tracking-wider ml-1">Group Name</label>
                    <input
                      type="text"
                      placeholder="e.g. The Sunday Crew"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-violet-500/5 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-violet-300 uppercase tracking-wider ml-1">Your Name</label>
                    <input
                      type="text"
                      placeholder="What do they call you?"
                      value={creatorName}
                      onChange={(e) => setCreatorName(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-violet-500/5 transition-all"
                    />
                  </div>
                  
                  {error && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          {error}
                        </div>

                        {showJoinSuggestion && (
                          <button 
                            type="button"
                            onClick={() => {
                              // Pre-fill the name exactly as typed so it looks nice
                              setJoinSlug(groupName)
                              setActiveTab('join')
                              setError(null)
                            }}
                            className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg border border-white/10 transition-colors flex items-center justify-center gap-2 mt-1 w-full"
                          >
                            <span>Did you mean to join <strong>{groupName}</strong>?</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-violet-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group mt-4"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <>
                        <span>Launch Portal</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </motion.form>
              ) : activeTab === 'password' ? (
                <motion.form
                  key="password"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleUnlock}
                  className="space-y-6 text-center pt-4"
                >
                   <div className="mx-auto w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-4">
                     <Lock className="w-6 h-6 text-white" />
                   </div>
                   
                   <div className="space-y-1">
                     <h3 className="text-xl font-bold">Security Check</h3>
                     <p className="text-white/60 text-sm">
                       Enter the group code for <strong>{pendingJoin?.slug}</strong>
                     </p>
                   </div>

                   <input
                      type="text"
                      placeholder="Access Code"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-center font-mono text-lg tracking-widest focus:outline-none focus:border-white/50 transition-all"
                      autoFocus
                      autoComplete="off"
                    />

                   {error && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex items-center gap-2 justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        {error}
                      </div>
                   )}

                   <div className="flex gap-3">
                     <button
                       type="button"
                       onClick={() => {
                         setActiveTab('join')
                         setPasswordInput('')
                         setError(null)
                       }}
                       className="flex-1 bg-white/5 text-white font-bold py-3 rounded-xl hover:bg-white/10 transition-colors"
                     >
                       Back
                     </button>
                     <button
                       type="submit"
                       className="flex-1 bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
                     >
                       Unlock
                     </button>
                   </div>
                </motion.form>
              ) : activeTab === 'create_pin' ? (
                <motion.form
                  key="create_pin"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={pendingJoin ? handleClaimWithPin : handleCreateGroup}
                  className="space-y-4"
                >
                  <div className="space-y-1 text-center mb-6">
                     <h3 className="text-xl font-bold">Secure Your Spot</h3>
                     <p className="text-white/60 text-sm">
                       Create a 4-digit PIN to protect your account.
                     </p>
                   </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="create-pin" className="text-xs font-bold text-violet-300 uppercase tracking-wider ml-1">Create PIN</label>
                      <input
                        id="create-pin"
                        type="password"
                        placeholder="••••"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                        maxLength={4}
                        inputMode="numeric"
                        autoComplete="off"
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-center font-mono text-xl tracking-widest focus:outline-none focus:border-violet-500/50 focus:bg-violet-500/5 transition-all"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="confirm-pin" className="text-xs font-bold text-violet-300 uppercase tracking-wider ml-1">Confirm PIN</label>
                      <input
                        id="confirm-pin"
                        type="password"
                        placeholder="••••"
                        value={confirmPinInput}
                        onChange={(e) => setConfirmPinInput(e.target.value)}
                        maxLength={4}
                        inputMode="numeric"
                        autoComplete="off"
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-center font-mono text-xl tracking-widest focus:outline-none focus:border-violet-500/50 focus:bg-violet-500/5 transition-all"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex items-center gap-2 justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                     <button
                       type="button"
                       onClick={() => {
                         setActiveTab(pendingJoin ? 'join' : 'create')
                         setPinInput('')
                         setConfirmPinInput('')
                         setError(null)
                       }}
                       className="flex-1 bg-white/5 text-white font-bold py-3 rounded-xl hover:bg-white/10 transition-colors"
                     >
                       Back
                     </button>
                     <button
                       type="submit"
                       disabled={loading || pinInput.length < 4 || pinInput !== confirmPinInput}
                       className="flex-1 bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                     >
                       {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Set PIN & Join'}
                     </button>
                   </div>
                </motion.form>
              ) : activeTab === 'login_pin' ? (
                <motion.form
                  key="login_pin"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleLoginWithPin}
                  className="space-y-4"
                >
                  <div className="space-y-1 text-center mb-6">
                     <h3 className="text-xl font-bold">Welcome Back</h3>
                     <p className="text-white/60 text-sm">
                       Enter your PIN to verify it's you.
                     </p>
                   </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-violet-300 uppercase tracking-wider ml-1">Your PIN</label>
                      <input
                        type="password"
                        placeholder="••••"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                        maxLength={4}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-center font-mono text-xl tracking-widest focus:outline-none focus:border-violet-500/50 focus:bg-violet-500/5 transition-all"
                        autoFocus
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex items-center gap-2 justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                     <button
                       type="button"
                       onClick={() => {
                         setActiveTab('join')
                         setPinInput('')
                         setError(null)
                       }}
                       className="flex-1 bg-white/5 text-white font-bold py-3 rounded-xl hover:bg-white/10 transition-colors"
                     >
                       Back
                     </button>
                     <button
                       type="submit"
                       disabled={loading || pinInput.length < 4}
                       className="flex-1 bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                     >
                       {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Unlock'}
                     </button>
                   </div>
                </motion.form>
              ) : (
                <motion.form
                  key="join"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleJoinGroup}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-fuchsia-300 uppercase tracking-wider ml-1">Group Name</label>
                    <input
                      type="text"
                      placeholder="e.g. The Sunday Crew"
                      value={joinSlug}
                      onChange={(e) => setJoinSlug(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-fuchsia-500/50 focus:bg-fuchsia-500/5 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-fuchsia-300 uppercase tracking-wider ml-1">Your Name</label>
                    <input
                      type="text"
                      placeholder="New Challenger"
                      value={joinDisplayName}
                      onChange={(e) => setJoinDisplayName(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-fuchsia-500/50 focus:bg-fuchsia-500/5 transition-all"
                    />
                  </div>

                  {error && (
                    <div className="space-y-3">
                      <div className={cn(
                        "p-3 rounded-lg border text-sm flex flex-col gap-2 transition-colors",
                        suggestedMembers.length > 0 
                          ? "bg-violet-500/10 border-violet-500/20 text-violet-200" 
                          : "bg-red-500/10 border-red-500/20 text-red-200"
                      )}>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            suggestedMembers.length > 0 ? "bg-violet-400" : "bg-red-400"
                          )} />
                          {error}
                        </div>

                        {suggestedMembers.length > 0 && (
                          <div className="mt-2">
                             <p className="text-xs text-white/60 mb-2 font-bold uppercase tracking-wider">
                               {error.includes('Did you mean') ? 'Available spots:' : 'Guest List:'}
                             </p>
                             <div className="flex flex-wrap gap-2">
                               {suggestedMembers.map(m => (
                                 <button
                                   key={m.display_name}
                                   type="button"
                                   onClick={(e) => handleJoinGroup(e, m.display_name)}
                                   className={cn(
                                     "text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5",
                                     m.avatar_seed 
                                      ? "bg-white/5 text-white/30 border-white/5 hover:bg-white/10 hover:text-white/60" // Claimed (faint but clickable)
                                      : "bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/40 hover:scale-105" // Available (bright)
                                   )}
                                   disabled={false}
                                  >
                                    {m.display_name}
                                    {m.avatar_seed && <span className="text-[9px] bg-white/5 px-1.5 rounded text-white/20">TAKEN</span>}
                                  </button>
                               ))}
                             </div>
                             <p className="text-[10px] text-white/30 mt-2 italic">
                               Click a name to join as that person.
                             </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white font-bold py-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group mt-4 shadow-lg shadow-fuchsia-500/25"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <>
                        <span>Join the Squad</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex items-center gap-2 text-white/20 text-sm font-medium"
        >
          <Heart className="w-4 h-4 fill-white/20" />
          <span>Crafted for real connections</span>
        </motion.div>

      </div>
    </div>
  )
}
