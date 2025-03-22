export interface Timer {
    id: string
    subject: string
    teacherName: string
    studentName: string
    seatNumber?: string
    duration: number
    startTime: number
    endTime: number
    isComplete: boolean
    isActive: boolean
}