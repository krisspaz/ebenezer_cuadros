import React, { useState, useEffect } from 'react'
import { Trash2, Ban, User, Info, Calendar as CalIcon } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

export default function AvailabilityManager() {
  const [people, setPeople]               = useState([])
  const [exceptions, setExceptions]       = useState([])
  const [selectedPersonId, setSelectedPersonId] = useState('')
  const [selectedDate, setSelectedDate]   = useState(format(new Date(), 'yyyy-MM-dd'))
  const [filterPersonId, setFilterPersonId] = useState('')
  const [loading, setLoading]             = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const [{ data: pData }, { data: eData }] = await Promise.all([
      supabase.from('people').select('*').order('name'),
      supabase.from('availability_exceptions')
        .select('*, people(name)')
        .order('date', { ascending: true }),
    ])
    setPeople(pData || [])
    setExceptions(eData || [])
    if (pData?.length && !selectedPersonId) setSelectedPersonId(pData[0].id)
    setLoading(false)
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!selectedPersonId || !selectedDate) return
    setLoading(true)
    const { error } = await supabase.from('availability_exceptions').insert({
      person_id: selectedPersonId,
      date: selectedDate,
    })
    if (error) alert('Ya existe esa restricción o hubo un error.')
    else fetchData()
    setLoading(false)
  }

  const handleDelete = async (id) => {
    await supabase.from('availability_exceptions').delete().eq('id', id)
    fetchData()
  }

  const filtered = filterPersonId
    ? exceptions.filter(e => e.person_id === filterPersonId)
    : exceptions

  // Upcoming vs past
  const today = new Date().toISOString().split('T')[0]
  const upcoming = filtered.filter(e => e.date >= today)
  const past     = filtered.filter(e => e.date  < today)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.75rem' }}>
      {/* Header */}
      <div className="view-header">
        <div>
          <h1>Disponibilidad</h1>
          <p>Registra fechas donde un miembro NO podrá servir.</p>
        </div>
      </div>

      <div className="avail-grid" style={{ display:'grid', gridTemplateColumns:'360px 1fr', gap:'1.5rem', alignItems:'start' }}>
        {/* Form */}
        <div className="glass-card" style={{ padding:'1.75rem' }}>
          <div style={{
            display:'flex', gap:'0.6rem', padding:'0.85rem 1rem',
            background:'hsla(217,91%,60%,0.08)', border:'1px solid hsla(217,91%,60%,0.2)',
            borderRadius:10, marginBottom:'1.5rem', color:'hsl(217,91%,75%)',
            fontSize:'0.83rem', lineHeight:1.5
          }}>
            <Info size={16} style={{ flexShrink:0, marginTop:2 }} />
            <p>Las fechas bloqueadas evitan asignaciones automáticas en ese día.</p>
          </div>

          <form onSubmit={handleAdd} style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
            <div className="input-group">
              <label><User size={12} style={{ display:'inline', verticalAlign:'middle' }} /> Miembro</label>
              <select value={selectedPersonId} onChange={e => setSelectedPersonId(e.target.value)}>
                {people.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label><CalIcon size={12} style={{ display:'inline', verticalAlign:'middle' }} /> Fecha Restringida</label>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
            </div>

            <button type="submit" className="btn-primary" disabled={loading || !selectedPersonId}
              style={{ width:'100%' }}>
              <Ban size={16} />
              <span>{loading ? 'Guardando...' : 'Bloquear Fecha'}</span>
            </button>
          </form>
        </div>

        {/* List */}
        <div className="glass-card" style={{ padding:'1.75rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:'0.75rem' }}>
            <h3 style={{ fontWeight:800 }}>Restricciones Registradas</h3>
            <select value={filterPersonId} onChange={e => setFilterPersonId(e.target.value)}
              style={{ width:'auto', padding:'0.45rem 0.9rem', fontSize:'0.85rem' }}>
              <option value="">Todos los miembros</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {filtered.length === 0 ? (
            <p style={{ color:'var(--text-secondary)', textAlign:'center', padding:'2.5rem', fontSize:'0.9rem' }}>
              No hay restricciones{filterPersonId ? ' para este miembro' : ''}.
            </p>
          ) : (
            <div>
              {upcoming.length > 0 && (
                <div style={{ marginBottom:'1.5rem' }}>
                  <p style={{ fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'0.5px', color:'var(--text-secondary)', marginBottom:'0.6rem' }}>
                    Próximas ({upcoming.length})
                  </p>
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.45rem' }}>
                    <AnimatePresence>
                      {upcoming.map(ex => (
                        <ExceptionRow key={ex.id} ex={ex} onDelete={handleDelete} highlight />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
              {past.length > 0 && (
                <div>
                  <p style={{ fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'0.5px', color:'var(--text-secondary)', marginBottom:'0.6rem' }}>
                    Pasadas ({past.length})
                  </p>
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.45rem' }}>
                    <AnimatePresence>
                      {past.map(ex => (
                        <ExceptionRow key={ex.id} ex={ex} onDelete={handleDelete} />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .avail-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function ExceptionRow({ ex, onDelete, highlight }) {
  return (
    <motion.div layout
      initial={{ opacity:0, scale:0.97 }}
      animate={{ opacity:1, scale:1 }}
      exit={{ opacity:0, scale:0.95 }}
      style={{
        display:'flex', justifyContent:'space-between', alignItems:'center',
        padding:'0.75rem 1rem',
        background: highlight ? 'rgba(239,68,68,0.06)' : 'var(--bg-elevated)',
        border: `1px solid ${highlight ? 'rgba(239,68,68,0.2)' : 'var(--glass-border)'}`,
        borderRadius:10, opacity: highlight ? 1 : 0.6
      }}
    >
      <div>
        <p style={{ fontWeight:700, fontSize:'0.92rem' }}>{ex.people?.name}</p>
        <p style={{ color: highlight ? 'var(--error)' : 'var(--text-secondary)',
          fontSize:'0.78rem', fontWeight:500, textTransform:'capitalize' }}>
          {format(parseISO(ex.date), "EEEE dd 'de' MMMM yyyy", { locale: es })}
        </p>
      </div>
      <button onClick={() => onDelete(ex.id)}
        style={{ background:'transparent', color:'var(--text-secondary)',
          border:'none', cursor:'pointer', padding:'0.35rem', borderRadius:6,
          transition:'all 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.color='var(--error)'; e.currentTarget.style.background='rgba(239,68,68,0.1)' }}
        onMouseLeave={e => { e.currentTarget.style.color='var(--text-secondary)'; e.currentTarget.style.background='transparent' }}
      >
        <Trash2 size={15} />
      </button>
    </motion.div>
  )
}
