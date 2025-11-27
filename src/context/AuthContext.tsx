import { auth } from "@/src/services/firebase"
import { useRouter, useSegments } from "expo-router"
import { signOut as firebaseSignOut, onAuthStateChanged, type User } from "firebase/auth"
import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// This hook will protect the routes - CORREGIDO
function useProtectedRoute(user: User | null, isLoading: boolean) {
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    // ✅ ESPERAR A QUE TERMINE LA CARGA
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)"

    // ✅ VERIFICAR QUE EL ROUTER ESTÉ LISTO
    if (!router.canGoBack()) return;

    if (
      // If the user is not signed in and the initial segment is not anything in the auth group.
      !user &&
      !inAuthGroup
    ) {
      // Redirect to the sign-in page.
      router.replace("/(auth)/login")
    } else if (user && inAuthGroup) {
      // Redirect away from the sign-in page.
      router.replace("/(tabs)")
    }
  }, [user, segments, isLoading]) // ✅ AGREGAR isLoading a las dependencias
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // ✅ PASAR isLoading AL HOOK
  useProtectedRoute(user, isLoading)

  const signOut = async () => {
    await firebaseSignOut(auth)
  }

  return <AuthContext.Provider value={{ user, isLoading, signOut }}>{children}</AuthContext.Provider>
}