import { supabase } from './supabaseClient'

export default function Dashboard({ session }) {
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>APEX Activity Tracker</h1>
        <button className="logout-button" onClick={handleLogout}>
          Log Out
        </button>
      </header>

      <div className="dashboard-content">
        <p>Logged in as: {session.user.email}</p>
        <p className="placeholder-note">
          This is a placeholder dashboard confirming login works end-to-end.
          Tasks, Calendar, Bills, and Hobbies modules come next.
        </p>
      </div>
    </div>
  )
}