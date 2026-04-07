import React, { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, Calendar, X, Users, Layers,
  Trash2, Edit3, Check
} from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isToday, parseISO,
  addMonths, subMonths, addWeeks, subWeeks
} from 'date-fns'
import { es } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import PDFExporter from './PDFExporter'

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function CalendarView({ initialMode = 'month' }) {
  const [currentDate, setCurrentDate]   = useState(new Date())
  const [viewMode, setViewMode]         = useState(initialMode) // 'month' | 'week' | 'list'
  const [schedules, setSchedules]       = useState([])
  const [allAssignments, setAllAssignments] = useState([])
  const [people, setPeople]             = useState([])
  const [selectedDay, setSelectedDay]   = useState(null)
  const [loading, setLoading]           = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => { fetchPeople() }, [])
  useEffect(() => { fetchData() }, [currentDate, viewMode])

  const fetchPeople = async () => {
    const { data } = await supabase.from('people').select('id, name').order('name')
    setPeople(data || [])
  }

  const getDateRange = useCallback(() => {
    if (viewMode === 'week') {
      return {
        start: format(startOfWeek(currentDate, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
        end:   format(endOfWeek(currentDate,   { weekStartsOn: 0 }), 'yyyy-MM-dd'),
      }
    }
    return {
      start: format(startOfMonth(currentDate), 'yyyy-MM-dd'),
      end:   format(endOfMonth(currentDate),   'yyyy-MM-dd'),
    }
  }, [currentDate, viewMode])

  const fetchData = async () => {
    setLoading(true)
    const { start, end } = getDateRange()

    const { data } = await supabase
      .from('schedules')
      .select('*, assignments(*, subareas(name, areas(name)), people(name))')
      .gte('date', start)
      .lte('date', end)
      .order('date')

    setSchedules(data || [])

    const flat = []
    ;(data || []).forEach(sch => {
      sch.assignments?.forEach(a => {
        flat.push({ ...a, schedules: { date: sch.date, service_name: sch.service_name } })
      })
    })
    setAllAssignments(flat)
    setLoading(false)
  }

  const handleDelete = async (scheduleId) => {
    await supabase.from('schedules').delete().eq('id', scheduleId)
    setDeleteConfirm(null)
    setSelectedDay(null)
    fetchData()
  }

  // Navigation
  const goNext = () => {
    if (viewMode === 'week') setCurrentDate(d => addWeeks(d, 1))
    else setCurrentDate(d => addMonths(d, 1))
  }
  const goPrev = () => {
    if (viewMode === 'week') setCurrentDate(d => subWeeks(d, 1))
    else setCurrentDate(d => subMonths(d, 1))
  }
  const goToday = () => setCurrentDate(new Date())

  // Month grid data
  const calStart   = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 })
  const calEnd     = endOfWeek(endOfMonth(currentDate),     { weekStartsOn: 0 })
  const calDays    = eachDayOfInterval({ start: calStart, end: calEnd })

  // Week grid data
  const weekStart  = startOfWeek(currentDate, { weekStartsOn: 0 })
  const weekEnd    = endOfWeek(currentDate,   { weekStartsOn: 0 })
  const weekDays   = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // Index by date
  const schedulesByDate = {}
  schedules.forEach(sch => {
    if (!schedulesByDate[sch.date]) schedulesByDate[sch.date] = []
    schedulesByDate[sch.date].push(sch)
  })

  const selectedSchedules = selectedDay
    ? (schedulesByDate[format(selectedDay, 'yyyy-MM-dd')] || [])
    : []

  // Navigator label
  const navLabel = viewMode === 'week'
    ? `${format(weekStart, "d 'de' MMM", { locale: es })} – ${format(weekEnd, "d 'de' MMM yyyy", { locale: es })}`
    : format(currentDate, 'MMMM yyyy', { locale: es })

  const serviceDays = Object.keys(schedulesByDate).length

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.75rem' }}>

      {/* Header */}
      <div className="view-header">
        <div>
          <h1>Calendario de Servicio</h1>
          <p>Vista de asignaciones confirmadas.</p>
        </div>
        <div style={{ display:'flex', gap:'0.6rem', alignItems:'center', flexWrap:'wrap' }}>
          {allAssignments.length > 0 && <PDFExporter assignments={allAssignments} />}
          <div style={{ display:'flex', gap:'0.3rem', background:'var(--bg-mid)',
            border:'1px solid var(--glass-border)', borderRadius:10, padding:'0.25rem' }}>
            {[
              { id:'month', label:'Mes'    },
              { id:'week',  label:'Semana' },
              { id:'list',  label:'Lista'  },
            ].map(({ id, label }) => (
              <button key={id} onClick={() => setViewMode(id)}
                style={{
                  padding:'0.45rem 0.9rem', borderRadius:8, fontSize:'0.82rem', fontWeight:700,
                  cursor:'pointer', transition:'all 0.2s', border:'none',
                  background: viewMode === id ? 'var(--primary)' : 'transparent',
                  color:      viewMode === id ? '#fff'           : 'var(--text-secondary)',
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:'1rem' }}>
        {[
          { label: viewMode === 'week' ? 'Días con Servicio' : 'Días de Servicio', value: serviceDays,              icon: Calendar, color:'#3b82f6' },
          { label:'Asignaciones', value: allAssignments.length, icon: Users,    color:'#8b5cf6' },
          { label:'Servicios',    value: schedules.length,      icon: Layers,   color:'#10b981' },
        ].map((s, i) => (
          <div key={i} className="glass-card"
            style={{ display:'flex', alignItems:'center', gap:'0.85rem', padding:'1rem 1.25rem' }}>
            <div style={{ background:`${s.color}20`, padding:'0.6rem', borderRadius:10 }}>
              <s.icon size={18} color={s.color} />
            </div>
            <div>
              <p style={{ fontSize:'0.72rem', color:'var(--text-secondary)', fontWeight:700,
                textTransform:'uppercase', letterSpacing:'0.4px' }}>{s.label}</p>
              <p style={{ fontSize:'1.5rem', fontWeight:900, lineHeight:1.1 }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Navigator */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <h2 style={{ fontSize:'1.3rem', fontWeight:800, textTransform:'capitalize' }}>
          {navLabel}
        </h2>
        <div style={{ display:'flex', gap:'0.4rem' }}>
          <button onClick={goPrev}
            style={{ background:'var(--bg-surface)', border:'1px solid var(--glass-border)',
              borderRadius:8, padding:'0.45rem 0.7rem', color:'var(--text-primary)', cursor:'pointer' }}>
            <ChevronLeft size={16} />
          </button>
          <button onClick={goToday}
            style={{ background:'var(--bg-surface)', border:'1px solid var(--glass-border)',
              borderRadius:8, padding:'0.45rem 0.9rem', fontSize:'0.82rem',
              fontWeight:700, color:'var(--text-secondary)', cursor:'pointer' }}>
            Hoy
          </button>
          <button onClick={goNext}
            style={{ background:'var(--bg-surface)', border:'1px solid var(--glass-border)',
              borderRadius:8, padding:'0.45rem 0.7rem', color:'var(--text-primary)', cursor:'pointer' }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Month view ─────────────────────────────────────────────── */}
      {viewMode === 'month' && (
        <div className="glass-card" style={{ padding:'1.25rem', overflowX:'auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7, minmax(80px, 1fr))', gap:'4px', marginBottom:'4px' }}>
            {DAYS_OF_WEEK.map(d => (
              <div key={d} style={{ textAlign:'center', fontSize:'0.72rem', fontWeight:800,
                textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--text-secondary)',
                padding:'0.4rem 0' }}>
                {d}
              </div>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7, minmax(80px, 1fr))', gap:'4px' }}>
            {calDays.map((day, i) => {
              const dateStr     = format(day, 'yyyy-MM-dd')
              const daySchedules = schedulesByDate[dateStr] || []
              const inMonth     = isSameMonth(day, currentDate)
              const todayDate   = isToday(day)
              const isSelected  = selectedDay && format(selectedDay, 'yyyy-MM-dd') === dateStr
              const hasService  = daySchedules.length > 0

              return (
                <div key={i}
                  onClick={() => setSelectedDay(hasService ? day : null)}
                  style={{
                    minHeight:80, padding:'0.4rem', borderRadius:8,
                    background: isSelected   ? 'hsla(217,91%,60%,0.15)'
                              : todayDate    ? 'hsla(217,91%,60%,0.08)'
                              : hasService   ? 'var(--bg-mid)'
                              : 'rgba(255,255,255,0.01)',
                    border:`1px solid ${
                      isSelected  ? 'hsla(217,91%,60%,0.4)'
                      : todayDate ? 'hsla(217,91%,60%,0.25)'
                      : hasService ? 'var(--bg-surface)'
                      : 'var(--bg-elevated)'}`,
                    opacity: inMonth ? 1 : 0.3,
                    cursor: hasService ? 'pointer' : 'default',
                    transition:'all 0.15s',
                  }}>
                  <span style={{
                    fontSize:'0.82rem', fontWeight: todayDate ? 900 : 600,
                    display:'block', marginBottom:'0.3rem',
                    color: todayDate ? 'var(--primary)' : inMonth ? 'var(--text-primary)' : 'var(--text-secondary)',
                    ...(todayDate ? {
                      background:'var(--primary)', color:'#fff', width:22, height:22,
                      borderRadius:'50%', display:'flex', alignItems:'center',
                      justifyContent:'center', fontSize:'0.75rem'
                    } : {})
                  }}>
                    {format(day, 'd')}
                  </span>
                  {daySchedules.map((sch, si) => (
                    <div key={si} style={{
                      fontSize:'0.65rem', fontWeight:700, padding:'1px 5px', borderRadius:4,
                      marginBottom:2, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis',
                      background:'hsla(217,91%,60%,0.2)', color:'hsl(217,91%,75%)',
                      border:'1px solid hsla(217,91%,60%,0.25)',
                    }}>
                      {sch.service_name}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Week view ──────────────────────────────────────────────── */}
      {viewMode === 'week' && (
        <div className="glass-card" style={{ padding:'1.25rem', overflowX:'auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7, minmax(120px, 1fr))', gap:'6px' }}>
            {weekDays.map((day, i) => {
              const dateStr      = format(day, 'yyyy-MM-dd')
              const daySchedules = schedulesByDate[dateStr] || []
              const todayDate    = isToday(day)
              const isSelected   = selectedDay && format(selectedDay, 'yyyy-MM-dd') === dateStr

              return (
                <div key={i} style={{
                  borderRadius:10,
                  border:`1px solid ${
                    isSelected  ? 'hsla(217,91%,60%,0.4)'
                    : todayDate ? 'hsla(217,91%,60%,0.3)'
                    : 'var(--bg-elevated)'}`,
                  background: todayDate ? 'hsla(217,91%,60%,0.06)' : 'var(--bg-mid)',
                  overflow:'hidden',
                }}>
                  {/* Day header */}
                  <div style={{
                    padding:'0.55rem 0.7rem',
                    borderBottom:'1px solid var(--glass-border)',
                    background: todayDate ? 'hsla(217,91%,60%,0.12)' : 'var(--bg-elevated)',
                  }}>
                    <p style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--text-secondary)',
                      textTransform:'uppercase', letterSpacing:'0.4px' }}>
                      {DAYS_OF_WEEK[i]}
                    </p>
                    <p style={{
                      fontSize:'1.3rem', fontWeight:900, lineHeight:1.1,
                      color: todayDate ? 'var(--primary)' : 'var(--text-primary)',
                    }}>
                      {format(day, 'd')}
                    </p>
                  </div>

                  {/* Services */}
                  <div style={{ padding:'0.5rem', minHeight:80, display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                    {daySchedules.length === 0 ? (
                      <p style={{ fontSize:'0.7rem', color:'var(--text-muted)', textAlign:'center',
                        marginTop:'0.75rem', fontStyle:'italic' }}>
                        Sin servicio
                      </p>
                    ) : (
                      daySchedules.map(sch => (
                        <button key={sch.id}
                          onClick={() => setSelectedDay(day)}
                          style={{
                            textAlign:'left', padding:'0.5rem 0.6rem', borderRadius:7, cursor:'pointer',
                            background:'hsla(217,91%,60%,0.15)', border:'1px solid hsla(217,91%,60%,0.25)',
                            color:'hsl(217,91%,75%)',
                          }}>
                          <p style={{ fontSize:'0.72rem', fontWeight:800, marginBottom:'0.2rem' }}>
                            {sch.service_name}
                          </p>
                          <p style={{ fontSize:'0.65rem', color:'var(--text-secondary)' }}>
                            {sch.assignments?.length || 0} asignaciones
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── List view ─────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem' }}>
          {loading && (
            <p style={{ color:'var(--text-secondary)', textAlign:'center', padding:'2rem' }}>Cargando...</p>
          )}
          {!loading && schedules.length === 0 && (
            <div className="glass-card" style={{ textAlign:'center', padding:'3rem', color:'var(--text-secondary)' }}>
              <Calendar size={48} style={{ margin:'0 auto 1rem', opacity:0.2 }} />
              <p>No hay servicios programados este mes.</p>
            </div>
          )}
          {schedules.map(sch => (
            <ServiceCard
              key={sch.id}
              schedule={sch}
              people={people}
              deleteConfirm={deleteConfirm}
              onRequestDelete={setDeleteConfirm}
              onConfirmDelete={handleDelete}
              onCancelDelete={() => setDeleteConfirm(null)}
              onRefresh={fetchData}
            />
          ))}
        </div>
      )}

      {/* Day detail modal */}
      <AnimatePresence>
        {selectedDay && selectedSchedules.length > 0 && (
          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)',
              backdropFilter:'blur(4px)', zIndex:100, display:'flex',
              alignItems:'center', justifyContent:'center', padding:'1rem' }}
            onClick={() => setSelectedDay(null)}
          >
            <motion.div
              initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }}
              exit={{ scale:0.9, opacity:0 }}
              onClick={e => e.stopPropagation()}
              style={{ background:'var(--bg-mid)', border:'1px solid var(--glass-border)',
                borderRadius:18, padding:'1.75rem', maxWidth:600, width:'100%',
                maxHeight:'80vh', overflowY:'auto' }}
            >
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
                <h3 style={{ fontWeight:800, fontSize:'1.1rem', textTransform:'capitalize' }}>
                  {format(selectedDay, "EEEE dd 'de' MMMM", { locale: es })}
                </h3>
                <button onClick={() => setSelectedDay(null)}
                  style={{ background:'var(--bg-surface)', border:'1px solid var(--glass-border)',
                    borderRadius:8, padding:'0.4rem', cursor:'pointer', color:'var(--text-primary)' }}>
                  <X size={16} />
                </button>
              </div>
              {selectedSchedules.map(sch => (
                <ServiceCard
                  key={sch.id}
                  schedule={sch}
                  compact
                  people={people}
                  deleteConfirm={deleteConfirm}
                  onRequestDelete={setDeleteConfirm}
                  onConfirmDelete={handleDelete}
                  onCancelDelete={() => setDeleteConfirm(null)}
                  onRefresh={() => { fetchData(); setSelectedDay(null) }}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Service card ─────────────────────────────────────────────────────
function ServiceCard({ schedule, compact, people, deleteConfirm, onRequestDelete, onConfirmDelete, onCancelDelete, onRefresh }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedMap, setEditedMap] = useState({})
  const [saving, setSaving]       = useState(false)

  const isPendingDelete = deleteConfirm === schedule.id

  const byArea = {}
  schedule.assignments?.forEach(a => {
    const name = a.subareas?.areas?.name || 'General'
    if (!byArea[name]) byArea[name] = []
    byArea[name].push(a)
  })

  const handleStartEdit = () => {
    const map = {}
    schedule.assignments?.forEach(a => { map[a.id] = a.person_id || '' })
    setEditedMap(map)
    setIsEditing(true)
  }

  const handleCancelEdit = () => { setIsEditing(false); setEditedMap({}) }

  const handleSaveEdit = async () => {
    setSaving(true)
    for (const [assignmentId, personId] of Object.entries(editedMap)) {
      const original = schedule.assignments?.find(a => a.id === assignmentId)
      if (original?.person_id !== (personId || null)) {
        await supabase
          .from('assignments')
          .update({ person_id: personId || null })
          .eq('id', assignmentId)
      }
    }
    setSaving(false)
    setIsEditing(false)
    setEditedMap({})
    onRefresh?.()
  }

  return (
    <div className={compact ? '' : 'glass-card'}
      style={{ padding: compact ? '0 0 1.25rem' : '1.25rem',
        borderBottom: compact ? '1px solid var(--glass-border)' : 'none' }}>

      {/* Card header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
        marginBottom:'0.85rem', flexWrap:'wrap', gap:'0.5rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', flexWrap:'wrap', flex:1 }}>
          {!compact && (
            <p style={{ fontSize:'0.78rem', color:'var(--text-secondary)', fontWeight:700, textTransform:'capitalize' }}>
              {format(parseISO(schedule.date + 'T12:00:00'), "EEEE dd 'de' MMMM", { locale: es })}
            </p>
          )}
          <span style={{ padding:'0.3rem 0.8rem', borderRadius:20,
            background:'hsla(217,91%,60%,0.15)', color:'hsl(217,91%,70%)',
            fontSize:'0.75rem', fontWeight:700 }}>
            {schedule.service_name}
          </span>
          <span style={{ fontSize:'0.72rem', color:'var(--text-secondary)' }}>
            {schedule.assignments?.length || 0} asignaciones
          </span>
        </div>

        {/* Action buttons */}
        <div style={{ display:'flex', gap:'0.4rem', alignItems:'center' }}>
          {isEditing ? (
            <>
              <button onClick={handleSaveEdit} disabled={saving}
                style={{ display:'flex', alignItems:'center', gap:'0.3rem',
                  padding:'0.35rem 0.75rem', borderRadius:8, fontSize:'0.78rem', fontWeight:700,
                  border:'none', background:'var(--success)', color:'#fff', cursor:'pointer' }}>
                <Check size={13} />
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button onClick={handleCancelEdit}
                style={{ padding:'0.35rem 0.6rem', borderRadius:8, fontSize:'0.78rem',
                  border:'1px solid var(--glass-border)', background:'transparent',
                  color:'var(--text-secondary)', cursor:'pointer' }}>
                <X size={13} />
              </button>
            </>
          ) : isPendingDelete ? (
            <>
              <span style={{ fontSize:'0.78rem', color:'var(--error)', fontWeight:600 }}>¿Eliminar?</span>
              <button onClick={() => onConfirmDelete(schedule.id)}
                style={{ display:'flex', alignItems:'center', gap:'0.3rem',
                  padding:'0.35rem 0.7rem', borderRadius:8, fontSize:'0.78rem', fontWeight:700,
                  border:'none', background:'var(--error)', color:'#fff', cursor:'pointer' }}>
                <Check size={13} /> Sí
              </button>
              <button onClick={onCancelDelete}
                style={{ padding:'0.35rem 0.6rem', borderRadius:8, fontSize:'0.78rem',
                  border:'1px solid var(--glass-border)', background:'transparent',
                  color:'var(--text-secondary)', cursor:'pointer' }}>
                <X size={13} />
              </button>
            </>
          ) : (
            <>
              <button onClick={handleStartEdit}
                style={{ display:'flex', alignItems:'center', gap:'0.3rem',
                  padding:'0.35rem 0.7rem', borderRadius:8, fontSize:'0.78rem', fontWeight:600,
                  border:'1px solid var(--glass-border)', background:'transparent',
                  color:'var(--text-secondary)', cursor:'pointer' }}>
                <Edit3 size={13} /> Editar
              </button>
              <button onClick={() => onRequestDelete(schedule.id)}
                style={{ display:'flex', alignItems:'center', gap:'0.3rem',
                  padding:'0.35rem 0.6rem', borderRadius:8, fontSize:'0.78rem',
                  border:'1px solid hsla(0,84%,62%,0.3)', background:'hsla(0,84%,62%,0.07)',
                  color:'hsl(0,80%,72%)', cursor:'pointer' }}>
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Assignments grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:'0.75rem' }}>
        {Object.entries(byArea).map(([areaName, items]) => (
          <div key={areaName} style={{
            background:'var(--bg-elevated)', border:'1px solid var(--glass-border)',
            borderRadius:10, padding:'0.75rem', overflow:'hidden'
          }}>
            <p style={{ fontSize:'0.7rem', fontWeight:800, textTransform:'uppercase',
              letterSpacing:'0.5px', color:'var(--primary)', marginBottom:'0.5rem' }}>
              {areaName}
            </p>
            {items.map(item => (
              <div key={item.id} style={{ display:'flex', justifyContent:'space-between',
                alignItems:'center', padding:'0.3rem 0',
                borderBottom:'1px solid var(--bg-mid)', gap:'0.5rem' }}>
                <span style={{ fontSize:'0.78rem', color:'var(--text-secondary)', flexShrink:0 }}>
                  {item.subareas?.name}
                </span>
                {isEditing ? (
                  <select
                    value={editedMap[item.id] || ''}
                    onChange={e => setEditedMap(prev => ({ ...prev, [item.id]: e.target.value }))}
                    style={{ fontSize:'0.75rem', padding:'0.2rem 0.4rem', flex:1, minWidth:0 }}
                  >
                    <option value="">— Sin asignar —</option>
                    {people.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                ) : (
                  <span style={{ fontSize:'0.8rem', fontWeight:700, flexShrink:0,
                    color: item.people?.name ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontStyle: item.people?.name ? 'normal' : 'italic' }}>
                    {item.people?.name || 'Sin asignar'}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
