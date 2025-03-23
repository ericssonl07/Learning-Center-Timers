import { supabase } from "@/lib/supabase"
import type { Timer } from "@/types/timer"
import type { Profile } from "@/types/supabase"
import { SetStateAction } from "react"

export async function fetchTimers(userId: string, isSuperuser: boolean): Promise<Timer[]> {
  try {
    console.log("Fetching timers with:", { userId, isSuperuser }) // Debug log

    // Always use the RPC function to avoid RLS issues
    const { data, error } = await supabase.rpc("get_timers_for_user", {
      p_user_id: userId,
      p_is_superuser: isSuperuser,
    })

    if (error) {
      console.error("Error fetching timers:", error)
      return []
    }

    return data.map(dbTimerToAppTimer)
  } catch (error) {
    console.error("Error fetching timers:", error)
    return []
  }
}

export async function fetchPendingTimers(): Promise<Timer[]> {
  try {
    // Always use the RPC function to avoid RLS issues
    const { data, error } = await supabase.rpc("get_pending_timers")

    if (error) {
      console.error("Error fetching pending timers:", error)
      return []
    }

    return data.map(dbTimerToAppTimer)
  } catch (error) {
    console.error("Error fetching pending timers:", error)
    return []
  }
}

export async function fetchPendingSuperusers(): Promise<Profile[]> {
  try {
    console.log("Fetching pending superusers") // Debug log

    // Try to use the RPC function first
    try {
      const { data, error } = await supabase.rpc("get_pending_superusers")

      if (error) {
        throw error
      }

      console.log("Pending superusers from RPC:", data) // Debug log
      return data
    } catch (rpcError) {
      console.error("Error using RPC for pending superusers, falling back to direct query:", rpcError)

      // Fall back to direct query
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "superuser")
        .eq("status", "pending")
        .order("created_at", { ascending: true })

      if (error) {
        throw error
      }

      console.log("Pending superusers from direct query:", data) // Debug log
      return data
    }
  } catch (error) {
    console.error("Error fetching pending superusers:", error)
    return []
  }
}

export async function requestTimer(
  userId: string,
  startTime: number,
  duration: number,
  subject: string,
  teacherName: string,
  studentName: string,
  seatNumber?: string,
  autoApprove = false,
): Promise<Timer | null> {
  const now = Date.now()
  const isActive = now >= startTime
  const endTime = startTime + duration

  // Determine status based on auto-approve flag
  const status = autoApprove ? "approved" : "requested"

  const { data, error } = await supabase
    .from("timers")
    .insert({
      user_id: userId,
      subject,
      teacher_name: teacherName,
      student_name: studentName,
      seat_number: seatNumber || null,
      duration,
      start_time: startTime,
      end_time: endTime,
      is_complete: false,
      is_active: isActive && status === "approved", // Only active if approved
      status,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating timer:", error)
    return null
  }

  return dbTimerToAppTimer(data)
}

export async function approveTimer(timerId: string): Promise<Timer | null> {
  try {
    // Use the RPC function to approve the timer
    const { data, error } = await supabase.rpc("approve_timer", { p_timer_id: timerId })

    if (error) {
      console.error("Error approving timer:", error)
      return null
    }

    return dbTimerToAppTimer(data)
  } catch (error) {
    console.error("Error approving timer:", error)
    return null
  }
}

export async function approveSuperuser(userId: string): Promise<boolean> {
  try {
    console.log("Approving superuser:", userId) // Debug log

    // Try to use the RPC function first
    try {
      const { data, error } = await supabase.rpc("approve_superuser", { p_user_id: userId })

      if (error) {
        throw error
      }

      return data || false
    } catch (rpcError) {
      console.error("Error using RPC for approving superuser, falling back to direct update:", rpcError)

      // Fall back to direct update
      const { error } = await supabase
        .from("profiles")
        .update({ status: "active" })
        .eq("id", userId)
        .eq("role", "superuser")

      if (error) {
        throw error
      }

      return true
    }
  } catch (error) {
    console.error("Error approving superuser:", error)
    return false
  }
}

export async function rejectSuperuser(userId: string): Promise<boolean> {
  try {
    console.log("Rejecting superuser:", userId) // Debug log

    // Try to use the RPC function first
    try {
      const { data, error } = await supabase.rpc("reject_superuser", { p_user_id: userId })

      if (error) {
        throw error
      }

      return data || false
    } catch (rpcError) {
      console.error("Error using RPC for rejecting superuser, falling back to direct update:", rpcError)

      // Fall back to direct update
      const { error } = await supabase
        .from("profiles")
        .update({ role: "user", status: "active" })
        .eq("id", userId)

      if (error) {
        throw error
      }

      return true
    }
  } catch (error) {
    console.error("Error rejecting superuser:", error)
    return false
  }
}

export async function updateTimer(timer: Timer): Promise<Timer | null> {
  const { data, error } = await supabase
    .from("timers")
    .update({
      subject: timer.subject,
      teacher_name: timer.teacherName,
      student_name: timer.studentName,
      seat_number: timer.seatNumber || null,
      duration: timer.duration,
      start_time: timer.startTime,
      end_time: timer.endTime,
      is_complete: timer.isComplete,
      is_active: timer.isActive,
      status: timer.status,
    })
    .eq("id", timer.id)
    .select()
    .single()

  if (error) {
    console.error("Error updating timer:", error)
    return null
  }

  return dbTimerToAppTimer(data)
}

export async function deleteTimer(id: string): Promise<boolean> {
  console.log("Deleting timer:", id) // Debug log
  const { error } = await supabase.from("timers").delete().eq("id", id)

  if (error) {
    console.error("Error deleting timer:", error)
    return false
  }

  window.location.reload();

  return true
}

// Helper function to convert database timer to app timer
function dbTimerToAppTimer(dbTimer: any): Timer {
  return {
    id: dbTimer.id,
    subject: dbTimer.subject,
    teacherName: dbTimer.teacher_name,
    studentName: dbTimer.student_name,
    seatNumber: dbTimer.seat_number,
    duration: dbTimer.duration,
    startTime: dbTimer.start_time,
    endTime: dbTimer.end_time,
    isComplete: dbTimer.is_complete,
    isActive: dbTimer.is_active,
    status: dbTimer.status,
  }
}

