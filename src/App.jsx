import { useState, useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import Dashboard from './Dashboard'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div className="loading-screen">Loading...</div>
  }

  return (
    <div className="app">
      {!session ? (
        <Auth />
      ) : (
        <BrowserRouter>
          <Dashboard session={session} />
        </BrowserRouter>
      )}
    </div>
  )
}

export default App
