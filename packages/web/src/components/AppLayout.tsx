import { Outlet } from 'react-router-dom'
import { NavLink } from 'react-router-dom'
import { FlowProvider } from '../lib/flowContext'
import { useAuth } from '../lib/authContext'

function Nav() {
  const { user, logout } = useAuth()
  const cls = ({ isActive }: { isActive: boolean }) =>
    `text-sm px-3 py-1.5 rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'}`
  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
      <div className="flex gap-2 flex-wrap">
        <NavLink to="/" end className={cls}>Novo edital</NavLink>
        <NavLink to="/templates" className={cls}>Templates</NavLink>
        <NavLink to="/profiles" className={cls}>Perfis</NavLink>
        <NavLink to="/history" className={cls}>Histórico</NavLink>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400">{user?.email} · {user?.plan}</span>
        <button
          onClick={logout}
          className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
        >
          Sair
        </button>
      </div>
    </nav>
  )
}

export default function AppLayout() {
  return (
    <FlowProvider>
      <Nav />
      <Outlet />
    </FlowProvider>
  )
}
