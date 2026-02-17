import questions from './questions.json';

// Types
type AnswerMap = Record<string, { val: string; isCustom: boolean }>;

interface VibeStats {
  chaos: number;      // 0-100 (Spontaneous/Messy vs Organized/Structured)
  social: number;     // 0-100 (Extrovert/Party vs Introvert/Home)
  wholesome: number;  // 0-100 (Sweet/Helpful vs Edgy/Roast)
}

interface VibeProfile {
  archetype: string;
  stats: VibeStats;
  colorPalette: string; // Hex codes or Tailwind classes
  bestMatchQ: string;   // ID of question to highlight
  toxicTrait?: string;  // Derived from Q26
}

// Helper: Get option index (0-3) for a given answer value
function getOptionIndex(qId: string, answerVal: string): number {
  if (!answerVal) return -1;
  const q = questions.find(q => q.id === qId);
  if (!q || !q.options) return -1;
  return q.options.indexOf(answerVal as never);
}

export function analyzeVibe(answers: AnswerMap): VibeProfile {
  let chaosScore = 50;
  let socialScore = 50;
  let wholesomeScore = 50;

  // --- 1. CHAOS CALCULATION ---
  // Q6: Sat 10am -> Asleep(High Chaos/Lazy), Gym(Low), Coffee(Low), Chores(Low)
  const q6Idx = getOptionIndex('q6', answers['q6']?.val); // Asleep=0
  if (q6Idx === 0) chaosScore += 10;
  if (q6Idx === 3) chaosScore -= 10; // Chores

  // Q7: Trip Role -> Planned(Low), Lost(High), Snacks(Med), Photos(Med)
  const q7Idx = getOptionIndex('q7', answers['q7']?.val); // Planned=0, Lost=1
  if (q7Idx === 0) chaosScore -= 15;
  if (q7Idx === 1) chaosScore += 15;

  // Q13: Last Min Trip -> Car(High), Plan?(Low), No(Low), Tomorrow(Med)
  const q13Idx = getOptionIndex('q13', answers['q13']?.val); // Car=0, Plan=1
  if (q13Idx === 0) chaosScore += 20;
  if (q13Idx === 1 || q13Idx === 2) chaosScore -= 10;

  // Q33: Plan vs Wing (Rapid Fire)
  const q33Idx = getOptionIndex('q33', answers['q33']?.val);
  if (q33Idx === 0) chaosScore -= 10; // Plan
  if (q33Idx === 1) chaosScore += 10; // Wing

  // --- 2. SOCIAL BATTERY ---
  // Q9: Party -> Started(High), Dog(Low), Irish Exit(Low), Uber(Med)
  const q9Idx = getOptionIndex('q9', answers['q9']?.val); // Started=0
  if (q9Idx === 0) socialScore += 20;
  if (q9Idx === 1 || q9Idx === 2) socialScore -= 15;

  // Q4: Emoji -> Party(High), Zen(Low)
  const q4Idx = getOptionIndex('q4', answers['q4']?.val); // Emoji: Party=2
  if (q4Idx === 2) socialScore += 10;
  if (q4Idx === 1 || q4Idx === 3) socialScore -= 10; // Zen/Drained

  // Q30: Call vs Text
  const q30Idx = getOptionIndex('q30', answers['q30']?.val);
  if (q30Idx === 0) socialScore += 5; // Call
  if (q30Idx === 1) socialScore -= 5; // Text

  // Q31: In vs Out
  const q31Idx = getOptionIndex('q31', answers['q31']?.val);
  if (q31Idx === 0) socialScore -= 10; // In
  if (q31Idx === 1) socialScore += 10; // Out

  // --- 3. WHOLESOME LEVEL ---
  // Q15: Care -> Memes(Low), Roast(Low), Service(High), Time(High)
  const q15Idx = getOptionIndex('q15', answers['q15']?.val);
  if (q15Idx === 2 || q15Idx === 3) wholesomeScore += 15;
  if (q15Idx === 1) wholesomeScore -= 15; // Roasting

  // Q24: Loyalty
  const q24Idx = getOptionIndex('q24', answers['q24']?.val); // Loyalty
  if (q24Idx === 2 || q24Idx === 3) wholesomeScore += 10; // Details/Honesty
  if (q24Idx === 0) wholesomeScore -= 5; // Food (Transactional? lol)

  // Q32: Forgive vs Forget
  const q32Idx = getOptionIndex('q32', answers['q32']?.val);
  if (q32Idx === 0) wholesomeScore += 10; // Forgive
  if (q32Idx === 1) chaosScore += 5; // Forget (Move on)

  // --- 4. RED FLAGS & HORROR (Multi-Stat) ---
  // Q26: Toxic Trait
  const q26Val = answers['q26']?.val;
  const q26Idx = getOptionIndex('q26', q26Val);
  if (q26Idx === 0) { chaosScore += 10; socialScore -= 5; } // Head
  if (q26Idx === 1) { socialScore -= 10; chaosScore += 5; } // Doomscroll
  if (q26Idx === 2) { wholesomeScore -= 10; socialScore += 5; } // Interrupt
  if (q26Idx === 3) { chaosScore += 15; wholesomeScore += 10; } // Fix them

  // Q27: Horror Movie
  const q27Idx = getOptionIndex('q27', answers['q27']?.val);
  if (q27Idx === 0) wholesomeScore += 10; // First to die (Innocent)
  if (q27Idx === 1) { chaosScore += 20; wholesomeScore = 0; } // Killer
  if (q27Idx === 3) wholesomeScore -= 5; // Skeptic

  // Q29: Zombie
  const q29Idx = getOptionIndex('q29', answers['q29']?.val);
  if (q29Idx === 0) chaosScore += 10; // Hoard
  if (q29Idx === 1) { socialScore += 10; chaosScore -= 10; } // Lead
  if (q29Idx === 3) chaosScore += 20; // Join Zombies

  // Clamp scores
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  const stats = {
    chaos: clamp(chaosScore),
    social: clamp(socialScore),
    wholesome: clamp(wholesomeScore)
  };

  // --- 5. DETERMINE ARCHETYPE ---
  let archetype = "The Wildcard"; // Default
  let palette = "from-gray-500 to-slate-900";

  if (stats.chaos > 75) {
    archetype = "The Agent of Chaos";
    palette = "from-red-500 to-orange-600";
  } else if (stats.chaos < 30 && stats.wholesome > 65) {
    archetype = "The Mom Friend";
    palette = "from-emerald-400 to-teal-600";
  } else if (stats.social > 75) {
    archetype = "The Life of the Party";
    palette = "from-pink-500 to-rose-600";
  } else if (stats.social < 30 && stats.wholesome > 50) {
    archetype = "The Cozy Introvert";
    palette = "from-indigo-400 to-violet-600";
  } else if (stats.wholesome > 80) {
    archetype = "The Golden Retriever";
    palette = "from-yellow-400 to-amber-600";
  } else if (stats.wholesome < 25) {
    archetype = "The Menace";
    palette = "from-purple-600 to-fuchsia-900";
  } else if (stats.chaos < 40 && stats.social > 40 && stats.social < 70) {
    archetype = "The Chill Pill";
    palette = "from-cyan-400 to-blue-500";
  } else if (stats.chaos > 60 && stats.social > 60) {
    archetype = "The Loose Cannon";
    palette = "from-orange-500 to-fuchsia-500";
  }

  // --- 6. MOVIE COLOR (Visual Theme override) ---
  const q1Val = answers['q1']?.val;
  if (q1Val?.includes("Neon")) palette = "from-fuchsia-600 to-purple-900";
  if (q1Val?.includes("Pastel")) palette = "from-rose-200 to-sky-200 text-slate-800";
  if (q1Val?.includes("Earthy")) palette = "from-stone-500 to-emerald-800";
  if (q1Val?.includes("Mono")) palette = "from-slate-700 to-black";

  return {
    archetype,
    stats,
    colorPalette: palette,
    bestMatchQ: 'q1', // Placeholder
    toxicTrait: q26Val // Pass the toxic trait through
  };
}

export function calculateCompatibility(myAnswers: AnswerMap, theirAnswers: AnswerMap): number {
  let matches = 0;
  let total = 0;

  for (const q of questions) {
    // Skip text entry questions for strict matching
    if (q.type === 'text_entry') continue;
    
    const myAns = myAnswers[q.id]?.val;
    const theirAns = theirAnswers[q.id]?.val;

    if (myAns && theirAns) {
      total++;
      if (myAns === theirAns) matches++;
    }
  }

  return total === 0 ? 0 : Math.round((matches / total) * 100);
}
