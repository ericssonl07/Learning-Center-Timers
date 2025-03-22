"use client"

import { useState, useEffect } from "react"
import { TimerForm } from "@/components/timer-form"
import { TimerList } from "@/components/timer-list"
import type { Timer } from "@/types/timer"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Maximize2, Minimize2 } from "lucide-react"

export default function CountdownTimers() {
  const [timers, setTimers] = useState<Timer[]>([])
  const [activeTimersOnly, setActiveTimersOnly] = useState(false)

  // Update timers and check for activation
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()

      setTimers((prevTimers) =>
        [...prevTimers]
          .map((timer) => {
            // Check if an inactive timer should be activated
            if (!timer.isActive && now >= timer.startTime) {
              return { ...timer, isActive: true }
            }
            return timer
          })
          .sort((a, b) => {
            // For active timers, sort by remaining time
            if (a.isActive && b.isActive) {
              const aRemaining = Math.max(0, a.endTime - now)
              const bRemaining = Math.max(0, b.endTime - now)
              return aRemaining - bRemaining
            }

            // Active timers come before inactive ones
            if (a.isActive !== b.isActive) {
              return a.isActive ? -1 : 1
            }

            // For inactive timers, sort by start time
            return a.startTime - b.startTime
          }),
      )
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Update the addTimer function to include seatNumber
  const addTimer = (
    startTime: number,
    duration: number,
    subject: string,
    teacherName: string,
    studentName: string,
    seatNumber?: string,
  ) => {
    const now = Date.now()
    const isActive = now >= startTime

    const newTimer: Timer = {
      id: Date.now().toString(),
      subject,
      teacherName,
      studentName,
      seatNumber,
      duration,
      startTime,
      endTime: startTime + duration,
      isComplete: false,
      isActive,
    }

    setTimers((prevTimers) => [...prevTimers, newTimer])
  }

  const removeTimer = (id: string) => {
    setTimers((prevTimers) => prevTimers.filter((timer) => timer.id !== id))
  }

  const markComplete = (id: string) => {
    setTimers((prevTimers) => prevTimers.map((timer) => (timer.id === id ? { ...timer, isComplete: true } : timer)))
  }

  // Check if there are any active timers
  const hasActiveTimers = timers.some((timer) => timer.isActive)

  return (
    <div className={`transition-all duration-300 ${activeTimersOnly ? "h-screen flex flex-col bg-background" : ""}`}>
      <div className={`container mx-auto p-4 max-w-5xl ${activeTimersOnly ? "flex-1 flex flex-col" : ""}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold">Countdown Timers</h1>

          <div className="flex items-center space-x-2">
            <Switch id="active-only" checked={activeTimersOnly} onCheckedChange={setActiveTimersOnly} />
            <Label htmlFor="active-only" className="flex items-center cursor-pointer">
              {activeTimersOnly ? <Maximize2 className="h-4 w-4 mr-2" /> : <Minimize2 className="h-4 w-4 mr-2" />}
              Active timers only
            </Label>
          </div>
        </div>

        {!activeTimersOnly && <TimerForm onAddTimer={addTimer} />}

        <div className={activeTimersOnly ? "flex-1 flex flex-col" : ""}>
          <TimerList
            timers={timers}
            onRemoveTimer={removeTimer}
            onTimerComplete={markComplete}
            activeOnly={activeTimersOnly}
          />

          {activeTimersOnly && !hasActiveTimers && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center p-8 border border-dashed rounded-lg">
                <p className="text-muted-foreground">No active timers. Toggle the switch to see all timers.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

