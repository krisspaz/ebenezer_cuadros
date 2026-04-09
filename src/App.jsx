import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, Calendar, CalendarRange, Shield, LogOut,
  ShieldCheck, Ban, Menu, X, Wand2, Clock, Settings,
  UserPlus, Mail, Check, AlertTriangle, Sun, Moon
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from './lib/supabase'
import './App.css'

import PeopleManager       from './components/PeopleManager'
import AreaManager         from './components/AreaManager'
import SchedulerUI         from './components/SchedulerUI'
import AvailabilityManager from './components/AvailabilityManager'
import CalendarView        from './components/CalendarView'
import PDFExporter         from './components/PDFExporter'

const ALL_NAV = [
  { id: 'dashboard',      label: 'Dashboard',      icon: LayoutDashboard, roles: ['admin'],           color: '#60a5fa' },
  { id: 'people',         label: 'Equipo',          icon: Users,           roles: ['admin'],           color: '#34d399' },
  { id: 'areas',          label: 'Áreas',           icon: ShieldCheck,     roles: ['admin'],           color: '#a78bfa' },
  { id: 'availability',   label: 'Disponibilidad',  icon: Ban,             roles: ['admin','viewer'],  color: '#fb923c' },
  { id: 'scheduler',      label: 'Programador',     icon: Wand2,           roles: ['admin'],           color: '#f472b6' },
  { id: 'calendar-month', label: 'Vista Mes',       icon: Calendar,        roles: ['admin','viewer'],  color: '#22d3ee' },
  { id: 'calendar-week',  label: 'Vista Semana',    icon: CalendarRange,   roles: ['admin','viewer'],  color: '#38bdf8' },
  { id: 'settings',       label: 'Configuración',   icon: Settings,        roles: ['admin'],           color: '#94a3b8' },
]

/* ── App root ─────────────────────────────────────────────── */
export default function App() {
  const [session, setSession]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [userRole, setUserRole] = useState(null)
  const [theme, setTheme]       = useState(() => {
    const saved = localStorage.getItem('sanctuary_theme')
    if (saved) return saved
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('sanctuary_theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s)
      if (!s) setUserRole(null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) fetchUserRole(session)
  }, [session])

  const fetchUserRole = async (sess) => {
    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : '')
    if (apiUrl) {
      try {
        const token = sess.access_token
        const res = await fetch(`${apiUrl}/my-role`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setUserRole(data.role)
          return
        }
      } catch (_) {}
    }
    // No API configured → default to admin for local dev
    setUserRole('admin')
  }

  if (loading || (session && userRole === null)) return <Spinner />
  if (!session) return <LoginView theme={theme} toggleTheme={toggleTheme} />
  return <MainLayout session={session} userRole={userRole} theme={theme} toggleTheme={toggleTheme} />
}

/* ── Spinner ──────────────────────────────────────────────── */
function Spinner() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      minHeight:'100vh', background:'var(--bg-deep)' }}>
      <div className="animate-spin-slow" style={{
        width:44, height:44, borderRadius:'50%',
        border:'3px solid var(--border)', borderTopColor:'var(--primary)'
      }} />
    </div>
  )
}

/* ── Login ────────────────────────────────────────────────── */
function LoginView({ theme, toggleTheme }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      minHeight:'100vh', background:'var(--bg-deep)', padding:'1.5rem', position:'relative', overflow:'hidden' }}>
      {/* Decorative orbs */}
      <div style={{ position:'fixed', top:'-15%', left:'-10%', width:700, height:700,
        borderRadius:'50%', pointerEvents:'none',
        background:'radial-gradient(circle, hsla(220,90%,60%,0.1) 0%, transparent 65%)' }} />
      <div style={{ position:'fixed', bottom:'-20%', right:'-5%', width:600, height:600,
        borderRadius:'50%', pointerEvents:'none',
        background:'radial-gradient(circle, hsla(270,80%,65%,0.09) 0%, transparent 65%)' }} />
      <div style={{ position:'fixed', top:'50%', right:'15%', width:300, height:300,
        borderRadius:'50%', pointerEvents:'none',
        background:'radial-gradient(circle, hsla(190,90%,50%,0.06) 0%, transparent 60%)' }} />

      {/* Theme toggle top-right */}
      <button onClick={toggleTheme}
        style={{ position:'fixed', top:'1.25rem', right:'1.25rem',
          background:'var(--bg-surface)', border:'1px solid var(--glass-border)',
          borderRadius:10, padding:'0.5rem 0.8rem', cursor:'pointer',
          color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:'0.4rem',
          fontSize:'0.8rem', fontWeight:600 }}>
        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
      </button>

      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
        transition={{ duration:0.4, ease:[0.4,0,0.2,1] }}
        className="glass-card"
        style={{ maxWidth:420, width:'100%', padding:'2.5rem', position:'relative',
          borderColor:'hsla(220,80%,60%,0.3)',
          boxShadow:'0 0 0 1px hsla(220,80%,60%,0.15), 0 24px 64px rgba(0,0,0,0.4)' }}>

        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <img
            src={theme === 'dark' ? '/logo-dark.jpg' : '/logo-light.jpg'}
            alt="Iglesia de Cristo Ebenezer Cobán"
            style={{ maxWidth:320, width:'100%', height:'auto', borderRadius:8, marginBottom:'0.75rem' }}
          />
          <p style={{ color:'var(--text-secondary)', fontSize:'0.85rem' }}>Sistema de Gestión de Servicio</p>
        </div>

        <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:'1.1rem' }}>
          <div className="input-group">
            <label>Correo Electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="admin@iglesia.com" required />
          </div>
          <div className="input-group">
            <label>Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required />
          </div>
          {error && (
            <div style={{ padding:'0.7rem 1rem', background:'hsla(0,84%,62%,0.1)',
              border:'1px solid hsla(0,84%,62%,0.25)', borderRadius:8,
              color:'hsl(0,80%,72%)', fontSize:'0.85rem', fontWeight:500 }}>
              {error}
            </div>
          )}
          <button type="submit" className="btn-primary" disabled={loading}
            style={{ width:'100%', padding:'0.8rem', fontSize:'0.95rem', marginTop:'0.25rem' }}>
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}

/* ── Main shell ───────────────────────────────────────────── */
function MainLayout({ session, userRole, theme, toggleTheme }) {
  const navItems = ALL_NAV.filter(n => n.roles.includes(userRole))
  const defaultTab = userRole === 'admin' ? 'dashboard' : 'calendar-month'

  const [tab, setTab]             = useState(defaultTab)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const userName    = session?.user?.email?.split('@')[0] || 'Usuario'
  const userInitial = userName[0].toUpperCase()
  const navigate    = (id) => { setTab(id); setSidebarOpen(false) }

  const roleLabel = userRole === 'admin' ? 'Administrador' : 'Visor'

  return (
    <>
      <div className="mobile-topbar">
        <div style={{ display:'flex', alignItems:'center', gap:'0.7rem' }}>
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>
            <Menu size={18} />
          </button>
          <img
            src={theme === 'dark' ? '/logo-dark.jpg' : '/logo-light.jpg'}
            alt="Ebenezer Cobán"
            style={{ height:28, width:'auto', borderRadius:4 }}
          />
        </div>
        <div style={{
          width:32, height:32, borderRadius:'50%',
          background:'linear-gradient(135deg, var(--primary), var(--accent))',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontWeight:800, fontSize:'0.8rem'
        }}>{userInitial}</div>
      </div>

      <div className="app-layout">
        {sidebarOpen && <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} />}

        <aside className={`app-sidebar${sidebarOpen ? ' app-sidebar-open' : ''}`}>
          <div className="sidebar-brand" style={{ paddingBottom:'0.5rem' }}>
            <img
              src={theme === 'dark' ? '/logo-dark.jpg' : '/logo-light.jpg'}
              alt="Ebenezer Cobán"
              style={{ flex:1, height:36, width:'auto', objectFit:'contain',
                objectPosition:'left', borderRadius:4, minWidth:0 }}
            />
            <button className="hamburger sidebar-close-btn" onClick={() => setSidebarOpen(false)}>
              <X size={16} />
            </button>
          </div>

          <nav className="sidebar-nav">
            {navItems.map(item => {
              const isActive = tab === item.id
              return (
                <button key={item.id}
                  className={`nav-item${isActive ? ' active' : ''}`}
                  onClick={() => navigate(item.id)}
                  style={isActive ? {
                    color: item.color,
                    background: `${item.color}18`,
                    borderColor: `${item.color}35`,
                  } : {}}>
                  <item.icon size={18} color={isActive ? item.color : undefined} />
                  {item.label}
                </button>
              )
            })}
          </nav>

          <div className="sidebar-footer">
            <div style={{ display:'flex', alignItems:'center', gap:'0.65rem',
              padding:'0.6rem 0.85rem', marginBottom:'0.25rem' }}>
              <div style={{
                width:32, height:32, borderRadius:'50%', flexShrink:0,
                background:'linear-gradient(135deg, var(--primary), var(--accent))',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontWeight:800, fontSize:'0.8rem'
              }}>{userInitial}</div>
              <div style={{ overflow:'hidden', minWidth:0 }}>
                <p style={{ fontWeight:700, fontSize:'0.85rem',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{userName}</p>
                <p style={{ color:'var(--text-muted)', fontSize:'0.72rem' }}>{roleLabel}</p>
              </div>
            </div>
            <button onClick={toggleTheme}
              style={{ display:'flex', alignItems:'center', gap:'0.55rem',
                width:'100%', padding:'0.55rem 0.85rem', borderRadius:9, border:'none',
                background:'transparent', color:'var(--text-secondary)',
                fontSize:'0.83rem', fontWeight:600, cursor:'pointer',
                transition:'all 0.2s', marginBottom:'0.15rem' }}
              onMouseEnter={e => { e.currentTarget.style.background='var(--bg-elevated)'; e.currentTarget.style.color='var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-secondary)' }}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
            </button>
            <button className="nav-logout" onClick={() => supabase.auth.signOut()}>
              <LogOut size={16} />
              Cerrar Sesión
            </button>
          </div>
        </aside>

        <main className="app-main">
          <div className="app-content animate-fade-in">
            <AnimatePresence mode="wait">
              <motion.div key={tab}
                initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                exit={{ opacity:0, y:-6 }} transition={{ duration:0.2 }}>
                {tab === 'dashboard'      && <DashboardView />}
                {tab === 'people'         && <PeopleManager />}
                {tab === 'areas'          && <AreaManager />}
                {tab === 'availability'   && <AvailabilityManager />}
                {tab === 'scheduler'      && <SchedulerUI />}
                {tab === 'calendar-month' && <CalendarView initialMode="month" />}
                {tab === 'calendar-week'  && <CalendarView initialMode="week"  />}
                {tab === 'settings'       && <SettingsView session={session} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </>
  )
}

/* ── Dashboard ────────────────────────────────────────────── */
function DashboardView() {
  const [stats, setStats]           = useState({ people:0, areas:0, schedules:0 })
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const [
      { count: pCount },
      { count: aCount },
      { data: assData }
    ] = await Promise.all([
      supabase.from('people').select('*', { count:'exact', head:true }),
      supabase.from('areas').select('*',  { count:'exact', head:true }),
      supabase.from('assignments')
        .select('*, schedules(date, service_name), subareas(name, areas(name)), people(name)')
        .order('created_at', { ascending:false })
        .limit(10),
    ])
    const { count: sCount } = await supabase
      .from('schedules').select('*', { count:'exact', head:true })

    setStats({ people: pCount||0, areas: aCount||0, schedules: sCount||0 })
    setAssignments(assData || [])
    setLoading(false)
  }

  const STATS = [
    { label:'Equipo',    value:stats.people,    icon:Users,
      grad:'linear-gradient(135deg, #3b82f6, #60a5fa)', glow:'hsla(220,90%,60%,0.3)', border:'hsla(220,90%,60%,0.25)' },
    { label:'Áreas',     value:stats.areas,     icon:ShieldCheck,
      grad:'linear-gradient(135deg, #7c3aed, #a78bfa)', glow:'hsla(263,70%,60%,0.3)', border:'hsla(263,70%,60%,0.25)' },
    { label:'Servicios', value:stats.schedules, icon:Clock,
      grad:'linear-gradient(135deg, #059669, #34d399)', glow:'hsla(160,80%,40%,0.3)', border:'hsla(160,80%,40%,0.25)' },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.75rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end',
        flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h1 style={{ fontSize:'1.9rem', fontWeight:900, marginBottom:'0.2rem',
            background:'linear-gradient(90deg, var(--primary), var(--accent))',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
            Panel de Control
          </h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'0.9rem', textTransform:'capitalize' }}>
            {format(new Date(), "EEEE, dd 'de' MMMM yyyy", { locale:es })}
          </p>
        </div>
        {assignments.length > 0 && <PDFExporter assignments={assignments} />}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'1rem' }}>
        {STATS.map((s, i) => (
          <motion.div key={i} initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }}
            transition={{ delay:i*0.08 }}
            style={{ background:'var(--bg-surface)', border:`1px solid ${s.border}`,
              borderRadius:'var(--radius-lg)', padding:'1.4rem 1.5rem',
              display:'flex', alignItems:'center', gap:'1.1rem',
              boxShadow:`0 4px 24px ${s.glow}` }}>
            <div style={{ background:s.grad, padding:'0.85rem', borderRadius:14, flexShrink:0,
              boxShadow:`0 4px 14px ${s.glow}` }}>
              <s.icon size={24} color="#fff" />
            </div>
            <div>
              <p style={{ color:'var(--text-secondary)', fontSize:'0.78rem', fontWeight:700,
                textTransform:'uppercase', letterSpacing:'0.05em' }}>{s.label}</p>
              <p style={{ fontSize:'2.1rem', fontWeight:900, lineHeight:1, marginTop:'0.1rem' }}>{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)',
        borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
        <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid var(--border-subtle)',
          display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ fontWeight:800, fontSize:'1rem' }}>Últimas Asignaciones</h3>
          <span style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>
            {assignments.length} registros
          </span>
        </div>

        {loading ? (
          <p style={{ color:'var(--text-muted)', textAlign:'center', padding:'3rem', fontSize:'0.9rem' }}>Cargando...</p>
        ) : assignments.length === 0 ? (
          <div style={{ textAlign:'center', padding:'3.5rem 2rem', color:'var(--text-muted)' }}>
            <Calendar size={40} style={{ margin:'0 auto 0.75rem', opacity:0.3 }} />
            <p style={{ fontSize:'0.9rem' }}>No hay asignaciones. Genera un calendario en el Programador.</p>
          </div>
        ) : (
          <div>
            {assignments.map((a, i) => (
              <div key={a.id} style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'0.9rem 1.5rem',
                borderBottom: i < assignments.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                flexWrap:'wrap', gap:'0.5rem'
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.85rem' }}>
                  <div style={{
                    minWidth:42, height:42,
                    background:'linear-gradient(135deg, hsla(220,90%,60%,0.2), hsla(270,80%,65%,0.15))',
                    border:'1px solid hsla(220,90%,60%,0.3)',
                    borderRadius:10, display:'flex', flexDirection:'column',
                    alignItems:'center', justifyContent:'center'
                  }}>
                    <span style={{ color:'var(--primary)', fontWeight:900, fontSize:'1.05rem', lineHeight:1 }}>
                      {format(new Date(a.schedules.date + 'T12:00:00'), 'dd')}
                    </span>
                    <span style={{ color:'var(--text-muted)', fontSize:'0.58rem', fontWeight:700, textTransform:'uppercase' }}>
                      {format(new Date(a.schedules.date + 'T12:00:00'), 'MMM', { locale:es })}
                    </span>
                  </div>
                  <div>
                    <p style={{ fontWeight:700, fontSize:'0.88rem' }}>{a.schedules.service_name}</p>
                    <p style={{ color:'var(--text-muted)', fontSize:'0.76rem' }}>
                      {a.subareas?.areas?.name} › {a.subareas?.name}
                    </p>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                  <div style={{
                    width:28, height:28, borderRadius:'50%',
                    background:'linear-gradient(135deg, var(--primary), var(--accent))',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontWeight:800, fontSize:'0.75rem', flexShrink:0
                  }}>{a.people?.name?.[0]}</div>
                  <span style={{ fontWeight:600, fontSize:'0.88rem' }}>{a.people?.name}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Settings view (admin only) ───────────────────────────── */
function SettingsView({ session }) {
  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : '')
  const token  = session?.access_token

  const [users, setUsers]         = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [inviteEmail, setInviteEmail]   = useState('')
  const [inviteRole, setInviteRole]     = useState('viewer')
  const [inviting, setInviting]   = useState(false)
  const [inviteMsg, setInviteMsg] = useState(null)   // { type: 'ok'|'err', text }
  const [updatingId, setUpdatingId] = useState(null)

  const noApi = !apiUrl

  useEffect(() => { if (!noApi) fetchUsers() }, [])

  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const res = await fetch(`${apiUrl}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setUsers(await res.json())
    } catch (_) {}
    setLoadingUsers(false)
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteMsg(null)
    try {
      const res = await fetch(`${apiUrl}/invite-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      if (res.ok) {
        setInviteMsg({ type:'ok', text:`Invitación enviada a ${inviteEmail}` })
        setInviteEmail('')
        fetchUsers()
      } else {
        const err = await res.json()
        setInviteMsg({ type:'err', text: err.detail || 'Error al invitar' })
      }
    } catch (_) {
      setInviteMsg({ type:'err', text:'Error de conexión con la API' })
    }
    setInviting(false)
  }

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingId(userId)
    try {
      await fetch(`${apiUrl}/user-role/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole }),
      })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    } catch (_) {}
    setUpdatingId(null)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.75rem' }}>
      <div>
        <h1 style={{ fontSize:'1.9rem', fontWeight:900, marginBottom:'0.2rem' }}>Configuración</h1>
        <p style={{ color:'var(--text-secondary)', fontSize:'0.9rem' }}>
          Gestión de usuarios y accesos al sistema.
        </p>
      </div>

      {noApi && (
        <div style={{ padding:'1rem 1.25rem', background:'hsla(40,90%,60%,0.1)',
          border:'1px solid hsla(40,90%,60%,0.3)', borderRadius:10,
          display:'flex', alignItems:'flex-start', gap:'0.75rem' }}>
          <AlertTriangle size={18} color="hsl(40,90%,65%)" style={{ flexShrink:0, marginTop:2 }} />
          <div>
            <p style={{ fontWeight:700, color:'hsl(40,90%,70%)', fontSize:'0.9rem' }}>
              API no configurada
            </p>
            <p style={{ color:'var(--text-secondary)', fontSize:'0.82rem', marginTop:'0.2rem' }}>
              Para gestionar usuarios necesitas configurar <code>VITE_API_URL</code> en tu archivo <code>.env</code>
              {' '}y desplegar el backend FastAPI.
            </p>
          </div>
        </div>
      )}

      {/* Invite user */}
      <div className="glass-card" style={{ padding:'1.5rem' }}>
        <h2 style={{ fontWeight:800, fontSize:'1rem', marginBottom:'1.1rem',
          display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <UserPlus size={17} color="var(--primary)" /> Invitar Usuario
        </h2>

        <form onSubmit={handleInvite}
          style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', alignItems:'flex-end' }}>
          <div className="input-group" style={{ flex:'1 1 220px', margin:0 }}>
            <label>Correo electrónico</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="usuario@iglesia.com"
              required
              disabled={noApi}
            />
          </div>
          <div className="input-group" style={{ margin:0 }}>
            <label>Rol</label>
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} disabled={noApi}
              style={{ padding:'0.55rem 0.75rem' }}>
              <option value="viewer">Visor</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <button type="submit" className="btn-primary"
            disabled={inviting || noApi || !inviteEmail.trim()}
            style={{ flexShrink:0 }}>
            <Mail size={15} />
            <span>{inviting ? 'Enviando...' : 'Enviar invitación'}</span>
          </button>
        </form>

        {inviteMsg && (
          <div style={{ marginTop:'0.85rem', padding:'0.65rem 1rem', borderRadius:8, fontSize:'0.85rem',
            background: inviteMsg.type === 'ok' ? 'hsla(142,65%,45%,0.1)' : 'hsla(0,84%,62%,0.1)',
            border: `1px solid ${inviteMsg.type === 'ok' ? 'hsla(142,65%,45%,0.3)' : 'hsla(0,84%,62%,0.3)'}`,
            color: inviteMsg.type === 'ok' ? 'hsl(142,65%,60%)' : 'hsl(0,80%,72%)',
            fontWeight:600 }}>
            {inviteMsg.text}
          </div>
        )}
      </div>

      {/* Users list */}
      <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)',
        borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
        <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid var(--border-subtle)',
          display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2 style={{ fontWeight:800, fontSize:'1rem' }}>Usuarios del Sistema</h2>
          <span style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>
            {users.length} usuario{users.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loadingUsers && !noApi ? (
          <p style={{ padding:'2.5rem', textAlign:'center', color:'var(--text-muted)', fontSize:'0.9rem' }}>
            Cargando...
          </p>
        ) : noApi ? (
          <p style={{ padding:'2.5rem', textAlign:'center', color:'var(--text-muted)', fontSize:'0.9rem' }}>
            Configura la API para ver los usuarios.
          </p>
        ) : users.length === 0 ? (
          <p style={{ padding:'2.5rem', textAlign:'center', color:'var(--text-muted)', fontSize:'0.9rem' }}>
            No se encontraron usuarios.
          </p>
        ) : (
          <div>
            {users.map((u, i) => {
              const isCurrentUser = u.email === session?.user?.email
              return (
                <div key={u.id} style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'0.9rem 1.5rem', flexWrap:'wrap', gap:'0.75rem',
                  borderBottom: i < users.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                    <div style={{
                      width:34, height:34, borderRadius:'50%',
                      background:'linear-gradient(135deg, var(--primary), var(--accent))',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontWeight:800, fontSize:'0.85rem', flexShrink:0
                    }}>
                      {u.email?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontWeight:700, fontSize:'0.88rem' }}>
                        {u.email}
                        {isCurrentUser && (
                          <span style={{ marginLeft:'0.5rem', fontSize:'0.7rem',
                            background:'hsla(217,91%,60%,0.15)', color:'hsl(217,91%,70%)',
                            padding:'0.1rem 0.5rem', borderRadius:20, fontWeight:700 }}>
                            Tú
                          </span>
                        )}
                      </p>
                      <p style={{ color:'var(--text-muted)', fontSize:'0.75rem' }}>
                        {u.created_at ? `Desde ${u.created_at.slice(0,10)}` : ''}
                      </p>
                    </div>
                  </div>

                  {isCurrentUser ? (
                    <span style={{ fontSize:'0.82rem', fontWeight:700,
                      padding:'0.3rem 0.8rem', borderRadius:20,
                      background:'hsla(217,91%,60%,0.12)', color:'hsl(217,91%,70%)' }}>
                      {u.role === 'admin' ? 'Administrador' : 'Visor'}
                    </span>
                  ) : (
                    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                      {updatingId === u.id && (
                        <span style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>Guardando...</span>
                      )}
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        disabled={updatingId === u.id}
                        style={{ fontSize:'0.82rem', padding:'0.35rem 0.6rem',
                          borderRadius:8, fontWeight:600 }}>
                        <option value="viewer">Visor</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Role legend */}
      <div className="glass-card" style={{ padding:'1.25rem 1.5rem' }}>
        <h3 style={{ fontWeight:700, fontSize:'0.85rem', color:'var(--text-secondary)',
          textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'0.85rem' }}>
          Permisos por Rol
        </h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'1rem' }}>
          {[
            { role:'Administrador', perms:['Dashboard', 'Equipo', 'Áreas', 'Disponibilidad', 'Programador', 'Calendario', 'Configuración'], color:'var(--primary)' },
            { role:'Visor',         perms:['Disponibilidad', 'Calendario'], color:'#8b5cf6' },
          ].map(({ role, perms, color }) => (
            <div key={role} style={{ background:'var(--bg-elevated)',
              border:'1px solid var(--glass-border)', borderRadius:10, padding:'1rem' }}>
              <p style={{ fontWeight:800, color, fontSize:'0.88rem', marginBottom:'0.6rem' }}>{role}</p>
              {perms.map(p => (
                <div key={p} style={{ display:'flex', alignItems:'center', gap:'0.4rem',
                  padding:'0.2rem 0', fontSize:'0.82rem', color:'var(--text-secondary)' }}>
                  <Check size={12} color="var(--success)" /> {p}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
