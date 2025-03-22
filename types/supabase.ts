export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          role: "superuser" | "user"
          status: "active" | "pending"
          created_at: string
        }
        Insert: {
          id: string
          email: string
          role?: "superuser" | "user"
          status?: "active" | "pending"
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: "superuser" | "user"
          status?: "active" | "pending"
          created_at?: string
        }
      }
      timers: {
        Row: {
          id: string
          user_id: string
          subject: string
          teacher_name: string
          student_name: string
          seat_number: string | null
          duration: number
          start_time: number
          end_time: number
          is_complete: boolean
          is_active: boolean
          status: "requested" | "approved"
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subject: string
          teacher_name: string
          student_name: string
          seat_number?: string | null
          duration: number
          start_time: number
          end_time: number
          is_complete?: boolean
          is_active?: boolean
          status?: "requested" | "approved"
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subject?: string
          teacher_name?: string
          student_name?: string
          seat_number?: string | null
          duration?: number
          start_time?: number
          end_time?: number
          is_complete?: boolean
          is_active?: boolean
          status?: "requested" | "approved"
          created_at?: string
        }
      }
    }
  }
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Timer = Database["public"]["Tables"]["timers"]["Row"]

