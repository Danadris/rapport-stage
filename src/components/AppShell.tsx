import { Settings } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import logo from '../assets/ifmbp-logo.png'

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-cream/85 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full items-center justify-between px-5">
          <NavLink to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="IFMBP" className="h-7 w-auto" />
            <span className="hidden text-sm font-semibold tracking-tight text-ink sm:inline">
              Rapport de stage
            </span>
            <span className="rounded border border-line bg-paper px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-muted uppercase">
              IFMBP
            </span>
          </NavLink>
          <nav className="flex items-center gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-[13px] transition-colors duration-150 ${
                  isActive ? 'bg-gold-soft font-medium text-gold-deep' : 'text-muted hover:text-ink'
                }`
              }
            >
              Accueil
            </NavLink>
            <NavLink
              to="/parametres"
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors duration-150 ${
                  isActive ? 'bg-gold-soft font-medium text-gold-deep' : 'text-muted hover:text-ink'
                }`
              }
            >
              <Settings size={14} />
              Paramètres
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
