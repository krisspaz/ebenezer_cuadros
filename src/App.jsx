import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, Calendar, Shield, LogOut,
  ShieldCheck, Ban, Menu, X, Wand2, Clock, TrendingUp
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from './lib/supabase'
import './App.css'

import PeopleManager     from './components/PeopleManager'
import AreaManager       from './components/AreaManager'
import SchedulerUI       from './components/SchedulerUI'
import AvailabilityManager from './components/AvailabilityManager'
import CalendarView      from './components/CalendarView'
import PDFExporter       from './components/PDFExporter'

const NAV = [
  { id: 'dashboard',    label: 'Dashboard',      icon: LayoutDashboard },
  { id: 'people',       label: 'Equipo',          icon: Users },
  { id: 'areas',        label: 'Áreas',           icon: ShieldCheck },
  { id: 'availability', label: 'Disponibilidad',  icon: Ban },
  { id: 'scheduler',    label: 'Programador',     icon: Wand2 },
  { id: 'calendar',     label: 'Calendario',      icon: Calendar },
]

/* ── App root ─────────────────────────────────────────────── */
export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <Spinner />
  if (!session) return <LoginView />
  return <MainLayout session={session} />
}

/* ── Full-screen spinner ──────────────────────────────────── */
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
function LoginView() {
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
      minHeight:'100vh', background:'var(--bg-deep)', padding:'1.5rem' }}>

      {/* Background glow */}
      <div style={{ position:'fixed', top:'20%', left:'50%', transform:'translateX(-50%)',
        width:600, height:600, borderRadius:'50%', pointerEvents:'none',
        background:'radial-gradient(circle, hsla(217,91%,60%,0.06) 0%, transparent 70%)' }} />

      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
        transition={{ duration:0.4, ease:[0.4,0,0.2,1] }}
        className="glass-card"
        style={{ maxWidth:420, width:'100%', padding:'2.5rem', position:'relative' }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <div style={{
            width:56, height:56,
            background:'linear-gradient(135deg, var(--primary), var(--accent))',
            borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 1rem', boxShadow:'0 8px 24px var(--primary-glow)'
          }}>
            <Shield color="white" size={26} />
          </div>
          <h1 style={{ fontSize:'1.6rem', fontWeight:900, marginBottom:'0.3rem' }}>Sanctuary</h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'0.9rem' }}>Sistema de Gestión de Servicio</p>
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
function MainLayout({ session }) {
  const [tab, setTab]             = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const userName    = session?.user?.email?.split('@')[0] || 'Admin'
  const userInitial = userName[0].toUpperCase()
  const navigate    = (id) => { setTab(id); setSidebarOpen(false) }

  return (
    <>
      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <div style={{ display:'flex', alignItems:'center', gap:'0.7rem' }}>
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>
            <Menu size={18} />
          </button>
          <span style={{ fontFamily:'Outfit', fontWeight:900, fontSize:'1.05rem',
            letterSpacing:'-0.02em' }}>Sanctuary</span>
        </div>
        <div style={{
          width:32, height:32, borderRadius:'50%',
          background:'linear-gradient(135deg, var(--primary), var(--accent))',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontWeight:800, fontSize:'0.8rem'
        }}>{userInitial}</div>
      </div>

      <div className="app-layout">
        {/* Overlay */}
        {sidebarOpen && (
          <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`app-sidebar${sidebarOpen ? ' app-sidebar-open' : ''}`}>

          <div className="sidebar-brand">
            <div className="sidebar-logo"><Shield color="white" size={20} /></div>
            <span className="sidebar-brand-name">Sanctuary</span>
            <button className="hamburger sidebar-close-btn"
              onClick={() => setSidebarOpen(false)}>
              <X size={16} />
            </button>
          </div>

          <nav className="sidebar-nav">
            {NAV.map(item => (
              <button key={item.id}
                className={`nav-item${tab === item.id ? ' active' : ''}`}
                onClick={() => navigate(item.id)}>
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            {/* User info */}
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
                <p style={{ color:'var(--text-muted)', fontSize:'0.72rem' }}>Administrador</p>
              </div>
            </div>
            <button className="nav-logout" onClick={() => supabase.auth.signOut()}>
              <LogOut size={16} />
              Cerrar Sesión
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className="app-main">
          <div className="app-content animate-fade-in">
            <AnimatePresence mode="wait">
              <motion.div key={tab}
                initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                exit={{ opacity:0, y:-6 }} transition={{ duration:0.2 }}>
                {tab === 'dashboard'    && <DashboardView />}
                {tab === 'people'       && <PeopleManager />}
                {tab === 'areas'        && <AreaManager />}
                {tab === 'availability' && <AvailabilityManager />}
                {tab === 'scheduler'    && <SchedulerUI />}
                {tab === 'calendar'     && <CalendarView />}
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
    { label:'Equipo',    value:stats.people,    icon:Users,      color:'#3b82f6', bg:'hsla(217,91%,60%,0.1)'  },
    { label:'Áreas',     value:stats.areas,     icon:ShieldCheck, color:'#8b5cf6', bg:'hsla(250,84%,65%,0.1)' },
    { label:'Servicios', value:stats.schedules, icon:Clock,      color:'#10b981', bg:'hsla(142,65%,45%,0.1)'  },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.75rem' }}>

      {/* Page title */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end',
        flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h1 style={{ fontSize:'1.9rem', fontWeight:900, marginBottom:'0.2rem' }}>Panel de Control</h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'0.9rem', textTransform:'capitalize' }}>
            {format(new Date(), "EEEE, dd 'de' MMMM yyyy", { locale:es })}
          </p>
        </div>
        {assignments.length > 0 && <PDFExporter assignments={assignments} />}
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'1rem' }}>
        {STATS.map((s, i) => (
          <motion.div key={i} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
            transition={{ delay:i*0.07 }}
            style={{ background:'var(--bg-surface)', border:'1px solid var(--border)',
              borderRadius:'var(--radius-lg)', padding:'1.25rem 1.5rem',
              display:'flex', alignItems:'center', gap:'1rem' }}>
            <div style={{ background:s.bg, padding:'0.7rem', borderRadius:12, flexShrink:0 }}>
              <s.icon size={22} color={s.color} />
            </div>
            <div>
              <p style={{ color:'var(--text-secondary)', fontSize:'0.78rem', fontWeight:700,
                textTransform:'uppercase', letterSpacing:'0.05em' }}>{s.label}</p>
              <p style={{ fontSize:'2rem', fontWeight:900, lineHeight:1, marginTop:'0.1rem' }}>{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Assignments list */}
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
          <p style={{ color:'var(--text-muted)', textAlign:'center', padding:'3rem',
            fontSize:'0.9rem' }}>Cargando...</p>
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
                  {/* Date chip */}
                  <div style={{
                    minWidth:42, height:42, background:'hsla(217,91%,60%,0.12)',
                    border:'1px solid hsla(217,91%,60%,0.2)',
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
                {/* Person */}
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
