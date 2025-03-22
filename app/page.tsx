"use client"

import { Badge } from "@/components/ui/badge"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { TimerForm } from "@/components/timer-form"
import { TimerList } from "@/components/timer-list"
import { AdminPanel } from "@/components/admin-panel"
import type { Timer } from "@/types/timer"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Maximize2, Minimize2, LogOut, User, AlertCircle, RefreshCw } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { fetchTimers, updateTimer, deleteTimer } from "@/services/timer-service"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function CountdownTimers() {
  const router = useRouter()
  const { user, profile, loading: authLoading, signOut, isSuperuser, isActive, refreshProfile } = useAuth()
  const [timers, setTimers] = useState<Timer[]>([])
  const [activeTimersOnly, setActiveTimersOnly] = useState(false)
  const [completedTimers, setCompletedTimers] = useState<Set<string>>(new Set())
  const [flashingTimers, setFlashingTimers] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>("timers")
  const [refreshing, setRefreshing] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [authLoading, user, router])

  // Load timers from Supabase
  useEffect(() => {
    if (user) {
      loadTimers()
    }
  }, [user, isSuperuser, isActive])

  // Update timers and check for activation
  useEffect(() => {
    if (!user) return

    const interval = setInterval(async () => {
      const now = Date.now()
      let updated = false

      setTimers((prevTimers) => {
        const newTimers = [...prevTimers].map((timer) => {
          // Only check for activation if timer is approved
          if (!timer.isActive && timer.status === "approved" && now >= timer.startTime) {
            updated = true
            return { ...timer, isActive: true }
          }
          return timer
        })

        // Sort timers
        newTimers.sort((a, b) => {
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
        })

        return newTimers
      })

      // Update activated timers in the database
      if (updated) {
        const activatedTimers = timers.filter((t) => t.isActive && t.status === "approved" && now >= t.startTime)
        for (const timer of activatedTimers) {
          await updateTimer(timer)
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [user, timers])

  const loadTimers = async () => {
    if (!user) return

    setLoading(true)
    console.log("Loading timers with superuser status:", isSuperuser) // Debug log
    const loadedTimers = await fetchTimers(user.id, isSuperuser)
    setTimers(loadedTimers)

    // Restore completed and flashing timers
    const newCompleted = new Set<string>()
    const newFlashing = new Set<string>()

    loadedTimers.forEach((timer) => {
      if (timer.isComplete) {
        newCompleted.add(timer.id)
        if (timer.isActive && timer.endTime <= Date.now()) {
          newFlashing.add(timer.id)
        }
      }
    })

    setCompletedTimers(newCompleted)
    setFlashingTimers(newFlashing)
    setLoading(false)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await refreshProfile()
    await loadTimers()
    setRefreshing(false)
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  const removeTimer = async (id: string) => {
    await deleteTimer(id)
    setTimers((prevTimers) => prevTimers.filter((timer) => timer.id !== id))

    // Remove from completed and flashing sets if present
    if (completedTimers.has(id)) {
      const newCompleted = new Set(completedTimers)
      newCompleted.delete(id)
      setCompletedTimers(newCompleted)
    }

    if (flashingTimers.has(id)) {
      const newFlashing = new Set(flashingTimers)
      newFlashing.delete(id)
      setFlashingTimers(newFlashing)
    }
  }

  const markComplete = async (id: string) => {
    const timer = timers.find((t) => t.id === id)
    if (!timer) return

    const updatedTimer = { ...timer, isComplete: true }
    await updateTimer(updatedTimer)

    setTimers((prevTimers) => prevTimers.map((timer) => (timer.id === id ? { ...timer, isComplete: true } : timer)))

    // Add to completed set
    setCompletedTimers((prev) => new Set(prev).add(id))

    // Add to flashing set
    setFlashingTimers((prev) => new Set(prev).add(id))
  }

  // Check if there are any active timers
  const hasActiveTimers = timers.some((timer) => timer.isActive)

  if (authLoading) {
    return (
      <div className="container mx-auto p-4 max-w-5xl">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return (
    <div className={`transition-all duration-300 ${activeTimersOnly ? "h-screen flex flex-col bg-background" : ""}`}>
      <div className={`container mx-auto p-4 max-w-5xl ${activeTimersOnly ? "flex-1 flex flex-col" : ""}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold">Countdown Timers</h1>
            <div className="flex items-center text-sm text-muted-foreground mt-1">
              <User className="h-3.5 w-3.5 mr-1.5" />
              <span>
                {profile?.email} ({isSuperuser ? "Superuser" : "User"})
                {isSuperuser && !isActive && (
                  <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-700">
                    Pending Approval
                  </Badge>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing} className="h-8">
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            {hasActiveTimers && (
              <div className="flex items-center space-x-2">
                <Switch id="active-only" checked={activeTimersOnly} onCheckedChange={setActiveTimersOnly} />
                <Label htmlFor="active-only" className="flex items-center cursor-pointer">
                  {activeTimersOnly ? <Maximize2 className="h-4 w-4 mr-2" /> : <Minimize2 className="h-4 w-4 mr-2" />}
                  Active timers only
                </Label>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {isSuperuser && !isActive && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your superuser account is pending approval. You can create timer requests, but they will need approval
              from an active superuser.
            </AlertDescription>
          </Alert>
        )}

        {isSuperuser && isActive ? (
          <Tabs defaultValue="timers" value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="timers">Timers</TabsTrigger>
              <TabsTrigger value="admin">Admin Panel</TabsTrigger>
            </TabsList>
            <TabsContent value="timers">
              {!activeTimersOnly && (
                <TimerForm onAddTimer={loadTimers} userId={user.id} isSuperuser={isSuperuser} isActive={isActive} />
              )}
            </TabsContent>
            <TabsContent value="admin">
              <AdminPanel onApprove={loadTimers} />
            </TabsContent>
          </Tabs>
        ) : (
          !activeTimersOnly && (
            <TimerForm onAddTimer={loadTimers} userId={user.id} isSuperuser={isSuperuser} isActive={isActive} />
          )
        )}

        <div className={activeTimersOnly ? "flex-1 flex flex-col" : ""}>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          ) : (
            <TimerList
              timers={timers}
              onRemoveTimer={removeTimer}
              onTimerComplete={markComplete}
              activeOnly={activeTimersOnly}
              setActiveOnly={setActiveTimersOnly}
              flashingTimers={flashingTimers}
              completedTimers={completedTimers}
            />
          )}

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

