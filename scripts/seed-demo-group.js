
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

// Helper to hash PIN (matching client-side logic roughly, but we use RPC 'set_pin' which takes a hash)
// Wait, the client hashes the PIN before sending to 'verify_pin'?
// Let's check 'app/actions.ts' or wherever PIN is handled.
// Actually, 'docs/schema.sql' says 'member_auth' stores 'pin_hash'.
// And 'set_pin' RPC takes 'input_pin_hash'.
// So we need to hash it here.
// Let's check how the client hashes it.
// Usually SHA-256.

async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Node.js crypto version of hashPin
function nodeHashPin(pin, salt) {
  return crypto.createHash('sha256').update(pin + salt).digest('hex');
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
        completed_chapters: 5 // Mark as done so Results page works
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
    // We just need some data so the app doesn't crash if it checks profiles
    const dummyAnswers = {
      "q1": { "val": "Pizza", "isCustom": false },
      "q2": { "val": "Friday", "isCustom": false }
    };
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
  
  const questionTemplates = [
    { id: 'q1', text: "What is their favorite food?", correct: "Pizza", distractors: ["Sushi", "Burgers", "Salad"] },
    { id: 'q2', text: "Best day of the week?", correct: "Friday", distractors: ["Monday", "Wednesday", "Sunday"] },
    { id: 'q3', text: "Dream vacation?", correct: "Japan", distractors: ["Paris", "New York", "Bali"] },
    { id: 'q4', text: "Superpower?", correct: "Flight", distractors: ["Invisibility", "Strength", "Speed"] }
  ];

  console.log('🎲 Generating gameplay data...');

  // For each member (target), create questions about them
  for (const targetName of Object.keys(memberIds)) {
    const targetId = memberIds[targetName];
    
    // Pick a random question template
    const template = questionTemplates[Math.floor(Math.random() * questionTemplates.length)];
    
    // Insert into quiz_questions
    const { data: quizQ, error: quizError } = await supabase
      .from('quiz_questions')
      .insert({
        group_id: group.id,
        target_member_id: targetId,
        question_id: template.id,
        correct_option: template.correct,
        distractors: template.distractors
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
