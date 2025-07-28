// components/auth/AuthScreen.tsx
'use client'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

type AuthMode = 'signin' | 'signup' | 'verify'

export default function AuthScreen() {
  const { signUp, signIn, signInWithGoogle, resendVerification, user } = useAuth()
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password, fullName)
        if (error) {
          setError(error.message)
        } else {
          setMode('verify')
          setMessage('Please check your email and click the verification link to continue.')
        }
      } else if (mode === 'signin') {
        const { error } = await signIn(email, password)
        if (error) {
          setError(error.message)
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')
    const { error } = await signInWithGoogle()
    if (error) {
      setError(error.message)
    }
    setLoading(false)
  }

  const handleResendVerification = async () => {
    setLoading(true)
    const { error } = await resendVerification()
    if (error) {
      setError(error.message)
    } else {
      setMessage('Verification email sent! Please check your inbox.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="text-center pt-16 pb-8 px-6">
        <h1 className="text-4xl font-bold text-white mb-4">AI Bytes</h1>
        <p className="text-gray-400 text-lg">
          Stay updated with the latest AI news and insights
        </p>
        <div className="text-6xl mt-6 mb-8">🤖</div>
      </div>

      {/* Authentication Form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
            
            {/* Form Title */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                {mode === 'signin' && 'Welcome Back'}
                {mode === 'signup' && 'Join AI Bytes'}
                {mode === 'verify' && 'Verify Email'}
              </h2>
              <p className="text-gray-400">
                {mode === 'signin' && 'Sign in to access premium content'}
                {mode === 'signup' && 'Create account to get started'}
                {mode === 'verify' && 'Check your email to continue'}
              </p>
            </div>

            {/* Error/Message Display */}
            {error && (
              <div className="bg-red-900/20 border border-red-500/50 text-red-400 p-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}
            
            {message && (
              <div className="bg-blue-900/20 border border-blue-500/50 text-blue-400 p-3 rounded-lg mb-4 text-sm">
                {message}
              </div>
            )}

            {/* Verification Mode */}
            {mode === 'verify' && (
              <div className="text-center">
                <div className="text-6xl mb-6">📧</div>
                <p className="text-gray-300 mb-8">
                  We've sent a verification link to <strong>{email}</strong>
                </p>
                <div className="space-y-4">
                  <button
                    onClick={handleResendVerification}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Resend Verification Email'}
                  </button>
                  <button
                    onClick={() => setMode('signin')}
                    className="w-full text-gray-400 hover:text-white transition"
                  >
                    Back to Sign In
                  </button>
                </div>
              </div>
            )}

            {/* Sign In / Sign Up Forms */}
            {(mode === 'signin' || mode === 'signup') && (
              <>
                {/* Google Sign In */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full bg-white text-gray-900 py-3 rounded-xl font-medium hover:bg-gray-100 transition disabled:opacity-50 mb-6 flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>

                {/* Divider */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1 h-px bg-gray-700"></div>
                  <span className="text-gray-500 text-sm">or</span>
                  <div className="flex-1 h-px bg-gray-700"></div>
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === 'signup' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                      placeholder="Enter your email"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                      placeholder="Enter your password"
                      required
                      minLength={6}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : (mode === 'signin' ? 'Sign In' : 'Sign Up')}
                  </button>
                </form>

                {/* Switch Mode */}
                <div className="text-center mt-6">
                  {mode === 'signin' ? (
                    <p className="text-gray-400">
                      Don't have an account?{' '}
                      <button
                        onClick={() => setMode('signup')}
                        className="text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Sign up
                      </button>
                    </p>
                  ) : (
                    <p className="text-gray-400">
                      Already have an account?{' '}
                      <button
                        onClick={() => setMode('signin')}
                        className="text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Sign in
                      </button>
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-gray-500 text-sm">
            <p>Secure authentication powered by Supabase</p>
          </div>
        </div>
      </div>
    </div>
  )
}