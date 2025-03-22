"use client"

import { TimerCard } from "./timer-card"
import type { Timer } from "@/types/timer"
import { format, isSameDay } from "date-fns"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Maximize2, Minimize2 } from "lucide-react"

interface TimerListProps {
  timers: Timer[]
  onRemoveTimer: (id: string) => void
  onTimerComplete: (id: string) => void
  activeOnly?: boolean
  setActiveOnly?: (value: boolean) => void
  flashingTimers: Set<string>
  completedTimers: Set<string>
}

interface GroupedTimers {
  [key: string]: {
    date: Date
    timers: Timer[]
  }
}

export function TimerList({
  timers,
  onRemoveTimer,
  onTimerComplete,
  activeOnly = false,
  setActiveOnly,
  flashingTimers,
  completedTimers,
}: TimerListProps) {
  // Filter timers if activeOnly is true
  const filteredTimers = activeOnly ? timers.filter((timer) => timer.isActive) : timers

  if (filteredTimers.length === 0) {
    return (
      <div className="text-center p-8 border border-dashed rounded-lg">
        <p className="text-muted-foreground">No timers added yet. Add a timer to get started.</p>
      </div>
    )
  }

  // Check if any timers are active
  const hasActiveTimers = filteredTimers.some((timer) => timer.isActive)

  // If we're in active-only mode, just show the active timers in a different layout
  if (activeOnly) {
    return (
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 place-items-center">
        {filteredTimers.map((timer) => (
          <TimerCard
            key={timer.id}
            timer={timer}
            onRemove={onRemoveTimer}
            onComplete={onTimerComplete}
            fullScreen={activeOnly}
            isFlashing={flashingTimers.has(timer.id)}
            isCompleted={completedTimers.has(timer.id)}
          />
        ))}
      </div>
    )
  }

  // Group timers by date for normal view
  const groupedTimers: GroupedTimers = filteredTimers.reduce((groups, timer) => {
    const date = new Date(timer.isActive ? timer.endTime - timer.duration : timer.startTime)
    const dateKey = format(date, "yyyy-MM-dd")

    if (!groups[dateKey]) {
      groups[dateKey] = {
        date,
        timers: [],
      }
    }

    groups[dateKey].timers.push(timer)
    return groups
  }, {} as GroupedTimers)

  // Sort dates chronologically
  const sortedDates = Object.keys(groupedTimers).sort()

  // Get today's date for comparison
  const today = new Date()

  return (
    <div className="space-y-6">
      {hasActiveTimers && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Active Timers</h2>
            <Separator className="flex-1 mx-3" />
            <div className="flex items-center space-x-2">
              <Switch id="active-only-inline" checked={activeOnly} onCheckedChange={setActiveOnly} />
              <Label htmlFor="active-only-inline" className="flex items-center text-sm text-muted-foreground">
                {activeOnly ? <Maximize2 className="h-3.5 w-3.5 mr-1" /> : <Minimize2 className="h-3.5 w-3.5 mr-1" />}
                {activeOnly ? "Full screen" : "Normal view"}
              </Label>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {filteredTimers
              .filter((timer) => timer.isActive)
              .map((timer) => (
                <TimerCard
                  key={timer.id}
                  timer={timer}
                  onRemove={onRemoveTimer}
                  onComplete={onTimerComplete}
                  isFlashing={flashingTimers.has(timer.id)}
                  isCompleted={completedTimers.has(timer.id)}
                />
              ))}
          </div>
        </div>
      )}

      {sortedDates.map((dateKey) => {
        const { date, timers: dateTimers } = groupedTimers[dateKey]

        // Filter out active timers as they're shown in the section above
        const inactiveTimers = dateTimers.filter((timer) => !timer.isActive)

        // Skip this date group if there are no inactive timers
        if (inactiveTimers.length === 0) return null

        // Format the date header
        const isToday = isSameDay(date, today)
        const dateHeader = isToday ? "Today" : format(date, "EEEE, MMMM d, yyyy")

        return (
          <div key={dateKey} className="space-y-4">
            <div className="flex items-center">
              <h2 className="text-lg font-semibold">{dateHeader}</h2>
              <Separator className="flex-1 ml-3" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {inactiveTimers.map((timer) => (
                <TimerCard
                  key={timer.id}
                  timer={timer}
                  onRemove={onRemoveTimer}
                  onComplete={onTimerComplete}
                  isFlashing={flashingTimers.has(timer.id)}
                  isCompleted={completedTimers.has(timer.id)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

