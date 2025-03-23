"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format, addDays } from "date-fns"
import { CalendarIcon, Clock, Zap, X, AlertCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { requestTimer } from "@/services/timer-service"

interface TimerFormProps {
  onAddTimer: () => void
  userId: string
  isSuperuser: boolean
  isActive: boolean
}

export function TimerForm({ onAddTimer, userId, isSuperuser, isActive }: TimerFormProps) {
  const [date, setDate] = useState<Date | undefined>(isSuperuser ? new Date() : addDays(new Date(), 2))
  const [hoursInput, setHoursInput] = useState<string>("0")
  const [minutesInput, setMinutesInput] = useState<string>("0")
  const [secondsInput, setSecondsInput] = useState<string>("0")
  const [startHour, setStartHour] = useState<string>("12")
  const [startMinute, setStartMinute] = useState<string>("00")
  const [startPeriod, setStartPeriod] = useState<string>("PM")
  const [subject, setSubject] = useState<string>("")
  const [teacherName, setTeacherName] = useState<string>("")
  const [studentName, setStudentName] = useState<string>("")
  const [seatNumber, setSeatNumber] = useState<string>("")
  const [isOpen, setIsOpen] = useState(false)
  const [startImmediately, setStartImmediately] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{
    subject?: string
    teacherName?: string
    studentName?: string
    duration?: string
    date?: string
  }>({})

  // Calculate the minimum date for scheduling (today for superusers, today + 2 days for regular users)
  const minDate = isSuperuser ? undefined : addDays(new Date(), 2)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate required fields
    const newErrors: {
      subject?: string
      teacherName?: string
      studentName?: string
      duration?: string
      date?: string
    } = {}

    if (!subject.trim()) {
      newErrors.subject = "Subject is required"
    }

    if (!teacherName.trim()) {
      newErrors.teacherName = "Teacher name is required"
    }

    if (!studentName.trim()) {
      newErrors.studentName = "Student name is required"
    }

    // Parse duration inputs
    const hours = Number.parseInt(hoursInput) || 0
    const minutes = Number.parseInt(minutesInput) || 0
    const seconds = Number.parseInt(secondsInput) || 0

    // Calculate duration
    const durationMs = hours * 60 * 60 * 1000 + minutes * 60 * 1000 + seconds * 1000

    if (durationMs <= 0) {
      newErrors.duration = "Duration must be greater than zero"
    }

    // Check date for regular users
    if (!isSuperuser && !startImmediately) {
      const twoDaysFromNow = addDays(new Date(), 2)
      if (date && date < twoDaysFromNow) {
        newErrors.date = "Regular users must schedule at least 2 days in advance"
      }
    }

    // If there are errors, show them and don't submit
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setLoading(false)
      return
    }

    // Clear any previous errors
    setErrors({})

    // Calculate start time
    let startTimeMs: number

    if (startImmediately) {
      if (!isSuperuser) {
        setError("Only superusers can schedule immediate timers")
        setLoading(false)
        return
      }
      startTimeMs = Date.now()
    } else {
      if (!date) {
        setError("Please select a date")
        setLoading(false)
        return
      }

      const startDate = new Date(date)
      const hour = Number.parseInt(startHour) + (startPeriod === "PM" && Number.parseInt(startHour) !== 12 ? 12 : 0)
      const minute = Number.parseInt(startMinute)

      startDate.setHours(hour, minute, 0, 0)
      startTimeMs = startDate.getTime()
    }

    try {
      await requestTimer(
        userId,
        startTimeMs,
        durationMs,
        subject,
        teacherName,
        studentName,
        seatNumber,
        isSuperuser && isActive, // Auto-approve if active superuser
      )

      // Reset form
      setHoursInput("0")
      setMinutesInput("0")
      setSecondsInput("0")
      setSubject("")
      setTeacherName("")
      setStudentName("")
      setSeatNumber("")
      setStartImmediately(false)
      setIsOpen(false)

      // Refresh timers list
      onAddTimer()
    } catch (err) {
      console.log(err)
      setError("Failed to create timer request. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const addPreset = async (presetMinutes: number) => {
    // Validate required fields
    if (!subject.trim() || !teacherName.trim() || !studentName.trim()) {
      setErrors({
        subject: !subject.trim() ? "Subject is required" : undefined,
        teacherName: !teacherName.trim() ? "Teacher name is required" : undefined,
        studentName: !studentName.trim() ? "Student name is required" : undefined,
      })
      return
    }

    // Check date for regular users
    if (!isSuperuser && !startImmediately) {
      const twoDaysFromNow = addDays(new Date(), 2)
      if (date && date < twoDaysFromNow) {
        setErrors({
          date: "Regular users must schedule at least 2 days in advance",
        })
        return
      }
    }

    // Clear any previous errors
    setErrors({})
    setLoading(true)

    // Calculate start time
    let startTimeMs: number

    if (startImmediately) {
      if (!isSuperuser) {
        setError("Only superusers can schedule immediate timers")
        setLoading(false)
        return
      }
      startTimeMs = Date.now()
    } else {
      if (!date) {
        setError("Please select a date")
        setLoading(false)
        return
      }

      const startDate = new Date(date)
      const hour = Number.parseInt(startHour) + (startPeriod === "PM" && Number.parseInt(startHour) !== 12 ? 12 : 0)
      const minute = Number.parseInt(startMinute)

      startDate.setHours(hour, minute, 0, 0)
      startTimeMs = startDate.getTime()
    }

    try {
      await requestTimer(
        userId,
        startTimeMs,
        presetMinutes * 60 * 1000,
        subject,
        teacherName,
        studentName,
        seatNumber,
        isSuperuser && isActive, // Auto-approve if active superuser
      )

      // Reset form
      setSubject("")
      setTeacherName("")
      setStudentName("")
      setSeatNumber("")
      setStartImmediately(false)
      setIsOpen(false)

      // Refresh timers list
      onAddTimer()
    } catch (err) {
      console.log(err)
      setError("Failed to create timer request. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const hours12 = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"))

  // Handle minute input validation
  const handleMinuteChange = (value: string) => {
    // Allow empty string or single digit for typing
    if (value === "" || (value.length <= 2 && /^\d+$/.test(value))) {
      setStartMinute(value)
    }
  }

  // Handle duration input validation
  const handleDurationChange = (value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
    // Allow empty string or numbers
    if (value === "" || /^\d+$/.test(value)) {
      setter(value)
    }
  }

  // Toggle immediate start
  const toggleImmediateStart = () => {
    if (!isSuperuser || !isActive) {
      setError("Only active superusers can schedule immediate timers")
      return
    }
    setStartImmediately(!startImmediately)
    setError(null)
  }

  return (
    <div className="mb-6">
      <Button className="w-full" size="lg" onClick={() => setIsOpen(true)}>
        {isSuperuser && isActive ? "Add New Timer" : "Request New Timer"}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-background z-10 flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-lg">
                {isSuperuser && isActive ? "Schedule a Timer" : "Request a Timer"}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6">
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {!isSuperuser && (
                <Alert className="mb-4">
                  <AlertDescription>
                    Regular users must schedule timers at least 2 days in advance. Your request will need approval from
                    a superuser.
                  </AlertDescription>
                </Alert>
              )}

              {isSuperuser && !isActive && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your superuser account is pending approval. Timer requests will need approval from an active
                    superuser.
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject" className="font-medium">
                    Subject (required)
                  </Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter subject"
                    className={errors.subject ? "border-red-500" : ""}
                  />
                  {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teacherName" className="font-medium">
                    Teacher name (required)
                  </Label>
                  <Input
                    id="teacherName"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="Enter teacher name"
                    className={errors.teacherName ? "border-red-500" : ""}
                  />
                  {errors.teacherName && <p className="text-red-500 text-xs mt-1">{errors.teacherName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="studentName" className="font-medium">
                    Student name (required)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="studentName"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Enter student name"
                      className={`flex-1 ${errors.studentName ? "border-red-500" : ""}`}
                    />
                    <div className="w-1/4">
                      <Input
                        id="seatNumber"
                        value={seatNumber}
                        onChange={(e) => setSeatNumber(e.target.value)}
                        placeholder="Seat #"
                      />
                    </div>
                  </div>
                  {errors.studentName && <p className="text-red-500 text-xs mt-1">{errors.studentName}</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Start Time</Label>
                    <Button
                      type="button"
                      variant={startImmediately ? "default" : "outline"}
                      size="sm"
                      onClick={toggleImmediateStart}
                      className="h-8"
                      disabled={!isSuperuser || !isActive}
                    >
                      <Zap className="h-3.5 w-3.5 mr-1" />
                      Immediately
                    </Button>
                  </div>

                  {!startImmediately ? (
                    <>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !date && "text-muted-foreground",
                              errors.date ? "border-red-500" : "",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                            disabled={(date) => {
                              if (!minDate) return false
                              return date < minDate
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                      {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}

                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Select value={startHour} onValueChange={setStartHour}>
                          <SelectTrigger className="w-[70px]">
                            <SelectValue placeholder="Hour" />
                          </SelectTrigger>
                          <SelectContent>
                            {hours12.map((hour) => (
                              <SelectItem key={hour} value={hour}>
                                {hour}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span>:</span>
                        <Input
                          className="w-[70px]"
                          value={startMinute}
                          onChange={(e) => handleMinuteChange(e.target.value)}
                          placeholder="Min"
                          maxLength={2}
                          onBlur={() => {
                            // Format on blur to ensure two digits
                            if (startMinute === "") {
                              setStartMinute("00")
                            } else {
                              setStartMinute(Number.parseInt(startMinute).toString().padStart(2, "0"))
                            }
                          }}
                        />
                        <Select value={startPeriod} onValueChange={setStartPeriod}>
                          <SelectTrigger className="w-[70px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AM">AM</SelectItem>
                            <SelectItem value="PM">PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : (
                    <div className="p-2 bg-muted rounded-md text-sm">Timer will start immediately when created</div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="font-medium">Duration</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="hours" className="text-xs">
                        Hours
                      </Label>
                      <div className="flex">
                        <Input
                          id="hours"
                          value={hoursInput}
                          onChange={(e) => handleDurationChange(e.target.value, setHoursInput)}
                          placeholder="0"
                          className={`rounded-r-none ${errors.duration ? "border-red-500" : ""}`}
                          onBlur={() => {
                            if (hoursInput === "") {
                              setHoursInput("0")
                            }
                          }}
                        />
                        <div className="flex flex-col border border-l-0 rounded-r-md">
                          <button
                            type="button"
                            className="px-2 border-b h-[18px] text-xs flex items-center justify-center hover:bg-muted"
                            onClick={() => {
                              const current = Number.parseInt(hoursInput) || 0
                              setHoursInput((current + 1).toString())
                            }}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            className="px-2 h-[18px] text-xs flex items-center justify-center hover:bg-muted"
                            onClick={() => {
                              const current = Number.parseInt(hoursInput) || 0
                              setHoursInput(Math.max(0, current - 1).toString())
                            }}
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="minutes" className="text-xs">
                        Minutes
                      </Label>
                      <div className="flex">
                        <Input
                          id="minutes"
                          value={minutesInput}
                          onChange={(e) => handleDurationChange(e.target.value, setMinutesInput)}
                          placeholder="0"
                          className={`rounded-r-none ${errors.duration ? "border-red-500" : ""}`}
                          onBlur={() => {
                            if (minutesInput === "") {
                              setMinutesInput("0")
                            } else {
                              const mins = Number.parseInt(minutesInput)
                              if (mins > 59) {
                                setMinutesInput("59")
                              }
                            }
                          }}
                        />
                        <div className="flex flex-col border border-l-0 rounded-r-md">
                          <button
                            type="button"
                            className="px-2 border-b h-[18px] text-xs flex items-center justify-center hover:bg-muted"
                            onClick={() => {
                              const current = Number.parseInt(minutesInput) || 0
                              setMinutesInput(Math.min(59, current + 1).toString())
                            }}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            className="px-2 h-[18px] text-xs flex items-center justify-center hover:bg-muted"
                            onClick={() => {
                              const current = Number.parseInt(minutesInput) || 0
                              setMinutesInput(Math.max(0, current - 1).toString())
                            }}
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="seconds" className="text-xs">
                        Seconds
                      </Label>
                      <div className="flex">
                        <Input
                          id="seconds"
                          value={secondsInput}
                          onChange={(e) => handleDurationChange(e.target.value, setSecondsInput)}
                          placeholder="0"
                          className={`rounded-r-none ${errors.duration ? "border-red-500" : ""}`}
                          onBlur={() => {
                            if (secondsInput === "") {
                              setSecondsInput("0")
                            } else {
                              const secs = Number.parseInt(secondsInput)
                              if (secs > 59) {
                                setSecondsInput("59")
                              }
                            }
                          }}
                        />
                        <div className="flex flex-col border border-l-0 rounded-r-md">
                          <button
                            type="button"
                            className="px-2 border-b h-[18px] text-xs flex items-center justify-center hover:bg-muted"
                            onClick={() => {
                              const current = Number.parseInt(secondsInput) || 0
                              setSecondsInput(Math.min(59, current + 1).toString())
                            }}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            className="px-2 h-[18px] text-xs flex items-center justify-center hover:bg-muted"
                            onClick={() => {
                              const current = Number.parseInt(secondsInput) || 0
                              setSecondsInput(Math.max(0, current - 1).toString())
                            }}
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  {errors.duration && <p className="text-red-500 text-xs mt-1">{errors.duration}</p>}
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Submitting..." : isSuperuser && isActive ? "Create Timer" : "Request Timer"}
                  </Button>
                  <div className="grid grid-cols-3 gap-2">
                    <Button type="button" variant="outline" onClick={() => addPreset(30)} disabled={loading}>
                      30m
                    </Button>
                    <Button type="button" variant="outline" onClick={() => addPreset(45)} disabled={loading}>
                      45m
                    </Button>
                    <Button type="button" variant="outline" onClick={() => addPreset(60)} disabled={loading}>
                      1h
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

