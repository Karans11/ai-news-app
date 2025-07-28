// components/auth/AuthGuard.tsx
'use client'
import { useAuth } from '@/contexts/AuthContext'
import AuthScreen from './AuthScreen'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  // If user is not authenticated, show the mandatory authentication screen
  if (!user) {
    return <AuthScreen />
  }

  // If user is authenticated, show the main app content
  return <>{children}</>
}