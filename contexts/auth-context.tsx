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
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("Auth state changed:", _event, session?.user?.id)
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
      console.log("Fetching profile for user:", userId)

      // Try to get the profile directly from the profiles table
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

      if (error) {
        console.error("Error fetching profile:", error)

        // If the profile doesn't exist, create one
        if (error.code === "PGRST116") {
          // No rows returned
          await createProfile(userId)
        } else {
          setLoading(false)
        }
        return
      }

      if (data) {
        console.log("Profile found:", data)
        updateProfileState(data)
      } else {
        console.log("No profile found, creating one")
        await createProfile(userId)
      }
    } catch (error) {
      console.error("Error in fetchProfile:", error)
      setLoading(false)
    }
  }

  async function createProfile(userId: string) {
    try {
      // Get user details from auth
      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError || !userData.user) {
        console.error("Error getting user data:", userError)
        setLoading(false)
        return
      }

      const user = userData.user
      const email = user.email || ""

      // Determine role and status from metadata or use defaults
      const metadata = user.user_metadata || {}
      const role = metadata.role || "user"
      const status = role === "superuser" ? "pending" : "active"

      console.log("Creating profile with:", { userId, email, role, status })

      // Insert the profile directly
      const { data, error } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          email,
          role,
          status,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating profile:", error)

        // If the profile already exists, try to fetch it again
        if (error.code === "23505") {
          // Unique violation
          const { data: existingProfile, error: fetchError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single()

          if (fetchError) {
            console.error("Error fetching existing profile:", fetchError)
          } else if (existingProfile) {
            updateProfileState(existingProfile)
            return
          }
        }
      } else if (data) {
        console.log("Profile created:", data)
        updateProfileState(data)
        return
      }

      setLoading(false)
    } catch (error) {
      console.error("Error in createProfile:", error)
      setLoading(false)
    }
  }

  function updateProfileState(data: Profile) {
    setProfile(data)
    setIsSuperuser(data.role === "superuser")
    setIsActive(data.status === "active")
    setLoading(false)
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
    try {
      // Sign up the user with role metadata
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: role,
            status: role === "user" ? "active" : "pending",
          },
        },
      })

      if (error) {
        return { error, user: null }
      }

      if (!data.user) {
        return {
          error: new Error("User creation failed"),
          user: null,
        }
      }

      // For superusers, we need to create the profile immediately
      // so it shows up in the pending superusers list
      if (role === "superuser") {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          email,
          role,
          status: "pending",
          created_at: new Date().toISOString(),
        })

        if (profileError) {
          console.error("Error creating superuser profile:", profileError)
          // Continue anyway, as the profile might be created by other means
        }
      }

      return { error: null, user: data.user }
    } catch (error: any) {
      console.error("Error in signUp:", error)
      return { error, user: null }
    }
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

