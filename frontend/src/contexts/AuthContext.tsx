import React, { createContext, useContext, useEffect, useState } from 'react'
import { type User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { usersAPI } from '@/lib/api'
import { toast } from 'sonner'

export interface SignUpData {
  email: string
  password: string
  name: string
  company_name: string
  phone: string
  address: string
  vat_number: string
  eori_number: string
  role?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (data: SignUpData) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active sessions
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Sync user to PostgreSQL in background
      if (session?.user) {
        const syncData = {
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email,
          company_name: session.user.user_metadata?.company_name,
          phone: session.user.user_metadata?.phone,
          address: session.user.user_metadata?.address,
          vat_number: session.user.user_metadata?.vat_number,
          eori_number: session.user.user_metadata?.eori_number,
          role: session.user.user_metadata?.role || 'Shipper',
        }
        usersAPI.sync(syncData).catch(error => {
          console.log('Background user sync skipped:', error)
        })
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      
      // Sync user on sign in or initial session (after signup with no email confirmation)
      if (session?.user && (_event === 'SIGNED_IN' || _event === 'INITIAL_SESSION')) {
        const syncData = {
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email,
          company_name: session.user.user_metadata?.company_name,
          phone: session.user.user_metadata?.phone,
          address: session.user.user_metadata?.address,
          vat_number: session.user.user_metadata?.vat_number,
          eori_number: session.user.user_metadata?.eori_number,
          role: session.user.user_metadata?.role || 'Shipper',
        }
        usersAPI.sync(syncData).catch(error => {
          console.log('User sync skipped:', error)
        })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (data: SignUpData) => {
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            company_name: data.company_name,
            phone: data.phone,
            address: data.address,
            vat_number: data.vat_number,
            eori_number: data.eori_number,
            role: data.role || 'Shipper',
          },
        },
      })

      if (error) throw error

      // Sync user to PostgreSQL database ONLY if session is available (email confirmation disabled)
      // Otherwise, sync will happen on first login via onAuthStateChange
      if (authData.user && authData.session) {
        const syncData = {
          name: data.name,
          email: data.email,
          company_name: data.company_name,
          phone: data.phone,
          address: data.address,
          vat_number: data.vat_number,
          eori_number: data.eori_number,
          role: data.role || 'Shipper',
        }
        await usersAPI.sync(syncData).catch(syncError => {
          console.error('Failed to sync user to database:', syncError)
          toast.error('Account created but failed to sync. Please try logging in.')
        })
      }

      toast.success('Account created successfully! Please log in.')
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account')
      throw error
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      toast.success('Signed in successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in')
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      toast.success('Signed out successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out')
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
