'use server'

import { supabase } from '@/lib/supabase'
import questionsData from '@/lib/questions.json'

interface Answer {
  val: string
  isCustom: boolean
}

interface ProfileAnswers {
  [key: string]: Answer
}

export async function generateMemberQuestions(memberId: string) {
  try {
    console.log(`Generating questions for member: ${memberId}`)

    // 1. Fetch current member's profile and group_id
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('group_id')
      .eq('id', memberId)
      .single()

    if (memberError || !memberData) throw new Error('Member not found')

    const groupId = memberData.group_id

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('answers')
      .eq('member_id', memberId)
      .single()

    if (profileError || !profileData) {
      console.log('No profile found yet, skipping generation')
      return { success: true, count: 0 }
    }

    const myAnswers = profileData.answers as ProfileAnswers

    // 2. Fetch ALL profiles in the same group (to pool distractors)
    // In a real app with RLS, this might need Service Role, but we assume public/anon access for now
    const { data: allProfiles, error: allProfilesError } = await supabase
      .from('profiles')
      .select(`
        member_id,
        answers,
        members!inner (
          group_id
        )
      `)
      .eq('members.group_id', groupId)
      .neq('member_id', memberId) // Exclude self

    if (allProfilesError) throw allProfilesError

    // Pre-process distractor pool: Map<QuestionId, Set<AnswerString>>
    const distractorPool = new Map<string, Set<string>>()
    
    if (allProfiles) {
      allProfiles.forEach((p: any) => {
        const pAnswers = p.answers as ProfileAnswers
        Object.entries(pAnswers).forEach(([qId, ans]) => {
          if (!distractorPool.has(qId)) {
            distractorPool.set(qId, new Set())
          }
          if (ans && ans.val) {
            distractorPool.get(qId)?.add(ans.val)
          }
        })
      })
    }

    let generatedCount = 0

    // 3. Iterate through MY answers and generate/update quiz questions
    for (const [qId, ans] of Object.entries(myAnswers)) {
      if (!ans || !ans.val) continue

      const correctAnswer = ans.val
      const questionDef = questionsData.find((q: any) => q.id === qId)
      
      // Skip if question definition not found (shouldn't happen)
      if (!questionDef) continue

      // A. Build Distractors
      const potentialDistractors = Array.from(distractorPool.get(qId) || [])
        .filter(d => d !== correctAnswer) // Ensure uniqueness
      
      // Shuffle potential distractors
      const shuffledPotential = potentialDistractors.sort(() => 0.5 - Math.random())
      
      // Pick up to 3
      const selectedDistractors = shuffledPotential.slice(0, 3)

      // Fill remaining from default options
      if (selectedDistractors.length < 3) {
        const defaultOptions = questionDef.options || []
        // Filter out correct answer and already selected distractors
        const remainingDefaults = defaultOptions.filter(opt => 
          opt !== correctAnswer && !selectedDistractors.includes(opt)
        )
        
        // Shuffle defaults
        const shuffledDefaults = remainingDefaults.sort(() => 0.5 - Math.random())
        
        // Fill up to 3
        const needed = 3 - selectedDistractors.length
        selectedDistractors.push(...shuffledDefaults.slice(0, needed))
      }

      // Ensure we have 3 distractors (if possible)
      // If still < 3 (rare, e.g. if options are few), we just accept it

      // B. Upsert into quiz_questions
      // Since we don't have a unique constraint on (target_member_id, question_id) in the simple schema,
      // we'll DELETE existing then INSERT.
      
      // Delete existing
      await supabase
        .from('quiz_questions')
        .delete()
        .match({ 
          target_member_id: memberId, 
          question_id: qId 
        })

      // Insert new
      const { error: insertError } = await supabase
        .from('quiz_questions')
        .insert({
          group_id: groupId,
          target_member_id: memberId,
          question_id: qId,
          correct_option: correctAnswer, // Privacy: Only storing the string, not isCustom
          distractors: selectedDistractors
        })

      if (insertError) {
        console.error(`Failed to insert quiz question ${qId}:`, insertError)
      } else {
        generatedCount++
      }
    }

    console.log(`Successfully generated ${generatedCount} quiz questions for member ${memberId}`)
    return { success: true, count: generatedCount }

  } catch (err: any) {
    console.error('Error in generateMemberQuestions:', err)
    return { success: false, error: err.message }
  }
}
