import { createContext, useContext } from 'react'
import type { ProfileVM } from './types.ts'

/* The adapted profile is provided once by App and read by any component. */
export const ProfileContext = createContext<ProfileVM | null>(null)

export function useProfile(): ProfileVM {
  const p = useContext(ProfileContext)
  if (!p) throw new Error('useProfile must be used within ProfileContext')
  return p
}
