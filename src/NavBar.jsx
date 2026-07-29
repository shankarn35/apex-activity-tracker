import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/tasks', label: 'Tasks' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/bills', label: 'Bills' },
  { to: '/hobbies', label: 'Hobbies' },
]

export default function NavBar() {
  return (
    <nav className="nav-bar">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
