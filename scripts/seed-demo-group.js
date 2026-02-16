
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Data
const GROUP_NAME = "The Vibe Squad";
const SLUG = "vibe-squad-demo-" + Math.floor(Math.random() * 1000);
const MEMBERS = [
  { name: "Alex", avatar: "alex" },
  { name: "Jordan", avatar: "jordan" },
  { name: "Taylor", avatar: "taylor" },
  { name: "Casey", avatar: "casey" }
];
const PIN = "1234";

// Node.js crypto version of hashPin
function nodeHashPin(pin, salt) {
  return crypto.createHash('sha256').update(pin + salt).digest('hex');
}

const questions = require('../lib/questions.json');

// Helper to get random answer for a question
function getRandomAnswer(q) {
  if (q.type === 'text_entry') {
    return "This is a custom answer for demo purposes.";
  }
  const options = q.options;
  return options[Math.floor(Math.random() * options.length)];
}

async function seed() {
  console.log(`🌱 Seeding Demo Group: ${GROUP_NAME} (${SLUG})...`);

  // 1. Create Group
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({ name: GROUP_NAME, slug: SLUG })
    .select()
    .single();

  if (groupError) {
    console.error('Error creating group:', groupError);
    return;
  }
  console.log(`✅ Group created: ${group.id}`);

  // 2. Create Members
  const memberIds = {};
  for (const m of MEMBERS) {
    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert({
        group_id: group.id,
        display_name: m.name,
        avatar_seed: m.avatar,
        completed_chapters: 7 // All chapters completed
      })
      .select()
      .single();

    if (memberError) {
      console.error(`Error creating member ${m.name}:`, memberError);
      continue;
    }
    memberIds[m.name] = member.id;
    console.log(`  👤 Member created: ${m.name} (${member.id})`);

    // 3. Set PIN
    const pinHash = nodeHashPin(PIN, member.id);
    const { error: pinError } = await supabase.rpc('set_pin', {
      input_member_id: member.id,
      input_pin_hash: pinHash
    });

    if (pinError) {
      console.error(`  ❌ Error setting PIN for ${m.name}:`, pinError);
    } else {
      console.log(`    bs🔒 PIN set to '${PIN}'`);
    }

    // 4. Create Dummy Profile (Answers)
    const dummyAnswers = {};
    questions.forEach(q => {
      dummyAnswers[q.id] = {
        val: getRandomAnswer(q),
        isCustom: false
      };
    });

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        member_id: member.id,
        answers: dummyAnswers
      });
    
    if (profileError) console.error(`    ❌ Error creating profile for ${m.name}:`, profileError);
  }

  // 5. Create Quiz Questions & Attempts (The Meat 🍖)
  // We need to simulate that they played the game.
  // We'll create 1 question for each member, and have others answer it.
  
  // Pick random questions from the full list for the quiz
  const questionTemplates = questions
    .sort(() => 0.5 - Math.random())
    .slice(0, MEMBERS.length) // One question per member
    .map(q => ({
      id: q.id,
      text: q.friendText || q.text, // Use friendText if available
      correct: null, // Will be set per target member based on their profile
      distractors: q.options.filter(o => o !== "Write your own").slice(0, 3) // Simple distractors logic
    }));

  console.log('🎲 Generating gameplay data...');

  // For each member (target), create questions about them
  for (let i = 0; i < Object.keys(memberIds).length; i++) {
    const targetName = Object.keys(memberIds)[i];
    const targetId = memberIds[targetName];
    
    // Pick a question template (use index to rotate)
    const template = questionTemplates[i % questionTemplates.length];
    
    // Retrieve the target's answer for this question to set as correct
    const { data: profile } = await supabase
      .from('profiles')
      .select('answers')
      .eq('member_id', targetId)
      .single();
      
    if (!profile || !profile.answers[template.id]) continue;
    
    const correctAns = profile.answers[template.id].val;
    // Ensure distractors don't include correct answer
    const distractors = template.distractors.filter(d => d !== correctAns);
    // Fill up distractors if needed (simple fallback)
    while (distractors.length < 3) {
      distractors.push("Random Distractor " + Math.random());
    }

    // Insert into quiz_questions
    const { data: quizQ, error: quizError } = await supabase
      .from('quiz_questions')
      .insert({
        group_id: group.id,
        target_member_id: targetId,
        question_id: template.id,
        correct_option: correctAns,
        distractors: distractors
      })
      .select()
      .single();

    if (quizError) {
      console.error(`  ❌ Error creating question for ${targetName}:`, quizError);
      continue;
    }

    // Now have OTHER members answer this question
    for (const guesserName of Object.keys(memberIds)) {
      if (guesserName === targetName) continue; // Don't answer own question (usually)

      const guesserId = memberIds[guesserName];
      // Randomly decide if they are correct (70% chance)
      const isCorrect = Math.random() > 0.3;
      
      const { error: attemptError } = await supabase
        .from('attempts')
        .insert({
          guesser_id: guesserId,
          question_id: quizQ.id,
          is_correct: isCorrect,
          points: isCorrect ? 100 : 0
        });

      if (attemptError) {
        console.error(`    ❌ Error recording attempt by ${guesserName}:`, attemptError);
      }
    }
  }

  console.log('🎉 Demo Group Seeded Successfully!');
  console.log('-----------------------------------');
  console.log(`Lobby URL:   http://localhost:3000/lobby/${SLUG}`);
  console.log(`Results URL: http://localhost:3000/group/${SLUG}/results`);
  console.log(`Access Code: (None set, open join)`);
  console.log(`PIN for all: ${PIN}`);
  console.log('-----------------------------------');
}

seed();
