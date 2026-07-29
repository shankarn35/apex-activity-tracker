import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import NavBar from './NavBar'
import Tasks from './pages/Tasks'
import Calendar from './pages/Calendar'
import Bills from './pages/Bills'
import Hobbies from './pages/Hobbies'

export default function Dashboard({ session }) {
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>ShaanKriya</h1>
        <button className="logout-button" onClick={handleLogout}>
          Log Out
        </button>
      </header>

      <NavBar />

      <div className="dashboard-content">
        <p>Logged in as: {session.user.email}</p>

        <Routes>
          <Route path="/" element={<Navigate to="/tasks" replace />} />
          <Route path="/tasks" element={<Tasks session={session} />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/bills" element={<Bills />} />
          <Route path="/hobbies" element={<Hobbies />} />
          <Route path="*" element={<Navigate to="/tasks" replace />} />
        </Routes>
      </div>
    </div>
  )
}