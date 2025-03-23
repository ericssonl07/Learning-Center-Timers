"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { AlertCircle, Info, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function LoginPage() {
  const router = useRouter()
  const { signIn, signUp, user } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"user" | "superuser">("user")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showSuperuserInfo, setShowSuperuserInfo] = useState(false)
  const [activeTab, setActiveTab] = useState("login")

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push("/")
    }
  }, [user, router])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { error } = await signIn(email, password)

      if (error) {
        setError(error.message)
        setLoading(false)
      }
      // No need to redirect here, the useEffect will handle it
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "An error occurred during sign in")
      } else {
        setError("An unknown error occurred during sign in")
      }
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      console.log("Signing up with:", { email, password, role }) // Debug log

      const { error, user } = await signUp(email, password, role)

      console.log("Sign up result:", { error, user }) // Debug log

      if (error) {
        setError(error.message || "An error occurred during sign up")
        setLoading(false)
      } else {
        if (role === "superuser") {
          setSuccess(
            "Your superuser account has been created but requires approval from an existing superuser before you can use superuser features.",
          )
          setActiveTab("login")
          setLoading(false)
        } else {
          // For regular users, the useEffect will handle redirection
          // But we'll still show a success message
          setSuccess("Account created successfully! You'll be redirected to the dashboard.")
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "An error occurred during sign up")
      } else {
        setError("An unknown error occurred during sign up")
      }
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Countdown Timers</CardTitle>
          <CardDescription className="text-center">Sign in to manage your timers</CardDescription>
        </CardHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleSignIn}>
              <CardContent className="space-y-4 pt-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleSignUp}>
              <CardContent className="space-y-4 pt-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Account Type</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-muted-foreground"
                      onClick={() => setShowSuperuserInfo(!showSuperuserInfo)}
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </div>
                  {showSuperuserInfo && (
                    <Alert className="mb-2">
                      <AlertDescription>
                        <p className="text-sm">
                          <strong>User accounts:</strong> Can request timers that must be approved by superusers. Must
                          schedule at least 2 days in advance.
                        </p>
                        <p className="text-sm mt-1">
                          <strong>Superuser accounts:</strong> Can approve timer requests, schedule immediate timers,
                          and manage other superusers. New superuser accounts require approval from an existing
                          superuser.
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}
                  <RadioGroup value={role} onValueChange={(value) => setRole(value as "user" | "superuser")}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="user" id="user" />
                      <Label htmlFor="user">User (2-day advance scheduling)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="superuser" id="superuser" />
                      <Label htmlFor="superuser">Superuser (Requires approval)</Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}

