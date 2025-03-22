"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import type { Profile } from "@/types/supabase"

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, role: "user" | "superuser") => Promise<{ error: any; user: User | null }>
  signOut: () => Promise<void>
  isSuperuser: boolean
  isActive: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSuperuser, setIsSuperuser] = useState(false)
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setIsSuperuser(false)
        setIsActive(false)
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function fetchProfile(userId: string) {
    setLoading(true)
    try {
      // Always use the RPC function to avoid RLS recursion
      const { data, error } = await supabase.rpc("get_profile_by_id", { p_user_id: userId })

      if (error) {
        console.error("Error fetching profile:", error)
      } else if (data) {
        console.log("Profile data:", data) // Debug log
        updateProfileState(data)
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
    } finally {
      setLoading(false)
    }
  }

  function updateProfileState(data: Profile) {
    setProfile(data)
    setIsSuperuser(data.role === "superuser")
    setIsActive(data.status === "active")
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUp = async (email: string, password: string, role: "user" | "superuser") => {
    const { data, error } = await supabase.auth.signUp({ email, password })

    if (!error && data.user) {
      // Create profile with appropriate status
      // Users are active by default, superusers are pending until approved
      const status = role === "user" ? "active" : "pending"

      const { error: insertError } = await supabase.from("profiles").insert({
        id: data.user.id,
        email,
        role,
        status,
      })

      if (insertError) {
        console.error("Error creating profile:", insertError)
      }
    }

    return { error, user: data.user }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    isSuperuser,
    isActive,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

