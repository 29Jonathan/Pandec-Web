import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import axios from 'axios'

const API = import.meta.env.VITE_API_BASE_URL as string

export function ProfileSync() {
  useEffect(() => {
    const syncProfile = async () => {
      try {
        const { data: session } = await supabase.auth.getSession()
        if (session.session) {
          const headers = { Authorization: `Bearer ${session.session.access_token}` }
          await axios.post(`${API}/api/sync-profile`, {}, { headers })
        }
      } catch (error) {
        console.warn('Profile sync failed:', error)
      }
    }

    // Sync profile when component mounts
    syncProfile()

    // Listen for auth state changes and sync profile
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        try {
          const headers = { Authorization: `Bearer ${session.access_token}` }
          await axios.post(`${API}/api/sync-profile`, {}, { headers })
        } catch (error) {
          console.warn('Profile sync failed on auth change:', error)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return null // This component doesn't render anything
}
