export interface LCAppUser {
    id: string
    email: string
    role: "superuser" | "user"
    status: "active" | "pending"
    created_at: string
}