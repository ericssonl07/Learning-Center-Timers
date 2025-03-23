"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import {
  fetchPendingTimers,
  fetchPendingSuperusers,
  approveTimer,
  approveSuperuser,
  deleteTimer,
  rejectSuperuser
} from "@/services/timer-service"
import { useAuth } from "@/contexts/auth-context"
import type { Timer } from "@/types/timer"
import type { Profile } from "@/types/supabase"
import { Clock, User, BookOpen, Check, X, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AdminPanelProps {
  onApprove: () => void
}

export function AdminPanel({ onApprove }: AdminPanelProps) {
  const { refreshProfile } = useAuth()
  const [pendingTimers, setPendingTimers] = useState<Timer[]>([])
  const [pendingSuperusers, setPendingSuperusers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("timers")

  useEffect(() => {
    loadPendingItems()
  }, [])

  const loadPendingItems = async () => {
    setLoading(true)
    try {
      const timers = await fetchPendingTimers()
      const superusers = await fetchPendingSuperusers()

      console.log("Loaded pending items:", { timers, superusers }) // Debug log

      setPendingTimers(timers)
      setPendingSuperusers(superusers)
    } catch (error) {
      console.error("Error loading pending items:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadPendingItems()
    setRefreshing(false)
  }

  const handleApproveTimer = async (id: string) => {
    await approveTimer(id)
    setPendingTimers(pendingTimers.filter((timer) => timer.id !== id))
    onApprove()
  }

  const handleApproveSuperuser = async (id: string) => {
    const success = await approveSuperuser(id)
    if (success) {
      setPendingSuperusers(pendingSuperusers.filter((user) => user.id !== id))
      onApprove()

      // If the current user is being approved, refresh their profile
      await refreshProfile()
    }
  }

  const handleRejectSuperuser = async (id: string) => {
    const success = await rejectSuperuser(id)
    if (success) {
      setPendingSuperusers(pendingSuperusers.filter((user) => user.id !== id))
      onApprove()
    }
  }

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

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Admin Panel</CardTitle>
          <CardDescription>Approve pending timer requests and superuser accounts</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="h-8">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="timers" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="timers">
              Timer Requests
              {pendingTimers.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingTimers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="superusers">
              Superuser Requests
              {pendingSuperusers.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingSuperusers.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timers" className="space-y-4 mt-4">
            {loading ? (
              <div className="text-center py-4">Loading pending timer requests...</div>
            ) : pendingTimers.length === 0 ? (
              <Alert>
                <AlertDescription>No pending timer requests.</AlertDescription>
              </Alert>
            ) : (
              pendingTimers.map((timer) => (
                <Card key={timer.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium text-lg">{timer.subject}</h3>
                        <div className="flex flex-col gap-1 mt-1">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <User className="h-3.5 w-3.5 mr-1.5" />
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
                      <Badge variant="outline" className="bg-yellow-50">
                        Requested
                      </Badge>
                    </div>

                    <div className="space-y-3 my-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Starts at: {format(new Date(timer.startTime), "PPP p")}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Duration: {formatTimeLeft(timer.duration)}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/50 px-4 py-2 flex justify-between items-center">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {timer.subject}
                    </Badge>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-red-500 hover:text-red-700"
                        onClick={() => deleteTimer(timer.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button size="sm" className="h-8" onClick={() => handleApproveTimer(timer.id)}>
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="superusers" className="space-y-4 mt-4">
            {loading ? (
              <div className="text-center py-4">Loading pending superuser requests...</div>
            ) : pendingSuperusers.length === 0 ? (
              <Alert>
                <AlertDescription>No pending superuser requests.</AlertDescription>
              </Alert>
            ) : (
              pendingSuperusers.map((user) => (
                <Card key={user.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium text-lg">{user.email}</h3>
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          <User className="h-3.5 w-3.5 mr-1.5" />
                          <span>Requested superuser access</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-yellow-50">
                        Pending
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Requested on: {format(new Date(user.created_at), "PPP p")}
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/50 px-4 py-2 flex justify-end items-center">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-red-500 hover:text-red-700"
                        onClick={() => handleRejectSuperuser(user.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button size="sm" className="h-8" onClick={() => handleApproveSuperuser(user.id)}>
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

