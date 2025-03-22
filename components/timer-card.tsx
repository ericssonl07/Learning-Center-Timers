"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import type { Timer } from "@/types/timer"
import { X, Clock, AlarmClock, BookOpen, User, UserRound } from "lucide-react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

interface TimerCardProps {
  timer: Timer
  onRemove: (id: string) => void
  onComplete: (id: string) => void
  fullScreen?: boolean
}

export function TimerCard({ timer, onRemove, onComplete, fullScreen = false }: TimerCardProps) {
  const [timeLeft, setTimeLeft] = useState<number>(
    timer.isActive ? Math.max(0, timer.endTime - Date.now()) : timer.duration,
  )
  const [isFlashing, setIsFlashing] = useState<boolean>(false)
  const [timeToStart, setTimeToStart] = useState<number>(Math.max(0, timer.startTime - Date.now()))

  // Calculate progress percentage
  const progressPercentage = timer.isActive ? Math.max(0, Math.min(100, (timeLeft / timer.duration) * 100)) : 100

  // Format time left as HH:MM:SS
  const formatTimeLeft = (ms: number) => {
    if (ms <= 0) return "00:00:00"

    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    return [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
      seconds.toString().padStart(2, "0"),
    ].join(":")
  }

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()

      if (!timer.isActive) {
        // Update time until start
        setTimeToStart(Math.max(0, timer.startTime - now))
      } else {
        // Update time left for active timer
        const newTimeLeft = Math.max(0, timer.endTime - now)
        setTimeLeft(newTimeLeft)

        if (newTimeLeft <= 0 && !timer.isComplete) {
          setIsFlashing(true)
          onComplete(timer.id)
        }
      }
    }, 100)

    return () => clearInterval(interval)
  }, [timer, onComplete])

  return (
    <Card
      className={`
        overflow-hidden 
        ${isFlashing ? "animate-pulse bg-red-50 dark:bg-red-950" : ""} 
        ${fullScreen ? "h-[300px] md:h-[350px] flex flex-col w-full max-w-md mx-auto" : ""}
      `}
    >
      <CardContent className={`p-4 ${fullScreen ? "flex-1 flex flex-col" : ""}`}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-medium text-lg">{timer.subject}</h3>
            <div className="flex flex-col gap-1 mt-1">
              <div className="flex items-center text-sm text-muted-foreground">
                <UserRound className="h-3.5 w-3.5 mr-1.5" />
                <span>Teacher: {timer.teacherName}</span>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5 mr-1.5" />
                <span>
                  Student: {timer.studentName}
                  {timer.seatNumber && ` (Seat #${timer.seatNumber})`}
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(timer.id)}
            aria-label="Remove timer"
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {timer.isActive ? (
          <div className={`${fullScreen ? "flex-1 flex flex-col justify-center" : ""}`}>
            <div
              className={`font-mono text-center my-4 tabular-nums ${fullScreen ? "text-5xl md:text-6xl" : "text-3xl"}`}
            >
              {formatTimeLeft(timeLeft)}
            </div>
            <Progress value={progressPercentage} className={`h-2 ${fullScreen ? "h-3" : ""}`} />
          </div>
        ) : (
          <div className="space-y-3 my-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Starts at: {format(new Date(timer.startTime), "PPP p")}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlarmClock className="h-4 w-4" />
              <span>Duration: {formatTimeLeft(timer.duration)}</span>
            </div>
            <div className="text-sm font-medium text-center p-2 bg-muted/30 rounded-md">
              Waiting to start in {formatTimeLeft(timeToStart)}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="bg-muted/50 px-4 py-2 text-xs flex justify-between items-center">
        <Badge variant="outline" className="flex items-center gap-1">
          <BookOpen className="h-3 w-3" />
          {timer.subject}
        </Badge>

        {timer.isActive ? (
          timeLeft <= 0 ? (
            <span>Session complete!</span>
          ) : (
            <span>{Math.ceil(timeLeft / 1000)} seconds remaining</span>
          )
        ) : (
          <span>Scheduled for {format(new Date(timer.startTime), "p")}</span>
        )}
      </CardFooter>
    </Card>
  )
}

