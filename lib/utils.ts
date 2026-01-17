import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const ADJECTIVES = [
  "happy", "lucky", "sunny", "clever", "brave", "calm", "eager", "fancy", "jolly", "kind",
  "lively", "nice", "proud", "silly", "witty", "active", "alert", "bold", "cool", "fair"
]

const NOUNS = [
  "panda", "tiger", "eagle", "shark", "whale", "lion", "wolf", "bear", "hawk", "fox",
  "otter", "seal", "swan", "duck", "owl", "frog", "goat", "deer", "cat", "dog"
]

export function generateSlug(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const num = Math.floor(Math.random() * 99) + 1
  return `${adj}-${noun}-${num}`
}
