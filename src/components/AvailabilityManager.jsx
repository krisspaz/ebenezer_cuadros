import React, { useState, useEffect } from 'react'
import { Trash2, Ban, User, Info, Calendar as CalIcon, ArrowRight } from 'lucide-react'
import { format, parseISO, eachDayOfInterval } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

// ── Group consecutive dates from the same person into ranges ─────────
function groupExceptions(list) {
  if (!list.length) return []

  const sorted = [...list].sort((a, b) => {
    const na = a.people?.name || '', nb = b.people?.name || ''
    if (na !== nb) return na.localeCompare(nb)
    return a.date.localeCompare(b.date)
  })

  const groups = []
  let cur = null

  for (const ex of sorted) {
    if (!cur || cur.person_id !== ex.person_id) {
      if (cur) groups.push(cur)
      cur = { person_id: ex.person_id, personName: ex.people?.name, from: ex.date, to: ex.date, ids: [ex.id] }
    } else {
      const diff = Math.round(
        (new Date(ex.date + 'T12:00:00') - new Date(cur.to + 'T12:00:00')) / 86400000
      )
      if (diff === 1) {
        cur.to = ex.date
        cur.ids.push(ex.id)
      } else {
        groups.push(cur)
        cur = { person_id: ex.person_id, personName: ex.people?.name, from: ex.date, to: ex.date, ids: [ex.id] }
      }
    }
  }
  if (cur) groups.push(cur)
  return groups
}

export default function AvailabilityManager() {
  const [people, setPeople]                   = useState([])
  const [exceptions, setExceptions]           = useState([])
  const [selectedPersonId, setSelectedPersonId] = useState('')
  const [dateFrom, setDateFrom]               = useState(format(new Date(), 'yyyy-MM-dd'))
  const [dateTo, setDateTo]                   = useState(format(new Date(), 'yyyy-MM-dd'))
  const [filterPersonId, setFilterPersonId]   = useState('')
  const [loading, setLoading]                 = useState(false)

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

  // Ensure dateFrom ≤ dateTo when either changes
  const handleFromChange = (val) => {
    setDateFrom(val)
    if (dateTo < val) setDateTo(val)
  }
  const handleToChange = (val) => {
    setDateTo(val)
    if (val < dateFrom) setDateFrom(val)
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!selectedPersonId || !dateFrom) return
    setLoading(true)

    // Generate every day in the range
    const days = eachDayOfInterval({
      start: new Date(dateFrom + 'T12:00:00'),
      end:   new Date(dateTo   + 'T12:00:00'),
    }).map(d => ({ person_id: selectedPersonId, date: format(d, 'yyyy-MM-dd') }))

    const { error } = await supabase
      .from('availability_exceptions')
      .upsert(days, { onConflict: 'person_id,date', ignoreDuplicates: true })

    if (error) alert('Hubo un error al guardar las restricciones.')
    else fetchData()
    setLoading(false)
  }

  const handleDeleteGroup = async (ids) => {
    await supabase.from('availability_exceptions').delete().in('id', ids)
    fetchData()
  }

  const filtered = filterPersonId
    ? exceptions.filter(e => e.person_id === filterPersonId)
    : exceptions

  const today    = new Date().toISOString().split('T')[0]
  const upcoming = groupExceptions(filtered.filter(e => e.from >= today || e.to >= today || e.date >= today))
  const past     = groupExceptions(filtered.filter(e => e.date < today))

  // Group filtered for display
  const allGrouped = groupExceptions(filtered)
  const upcomingGroups = allGrouped.filter(g => g.to >= today)
  const pastGroups     = allGrouped.filter(g => g.to <  today)

  const totalDays = filtered.length

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.75rem' }}>
      {/* Header */}
      <div className="view-header">
        <div>
          <h1>Disponibilidad</h1>
          <p>Bloquea un día o un rango de fechas donde un miembro NO podrá servir.</p>
        </div>
      </div>

      <div className="avail-grid" style={{ display:'grid', gridTemplateColumns:'380px 1fr', gap:'1.5rem', alignItems:'start' }}>
        {/* Form */}
        <div className="glass-card" style={{ padding:'1.75rem' }}>
          <div style={{
            display:'flex', gap:'0.6rem', padding:'0.85rem 1rem',
            background:'hsla(217,91%,60%,0.08)', border:'1px solid hsla(217,91%,60%,0.2)',
            borderRadius:10, marginBottom:'1.5rem', color:'hsl(217,91%,75%)',
            fontSize:'0.83rem', lineHeight:1.5
          }}>
            <Info size={16} style={{ flexShrink:0, marginTop:2 }} />
            <p>Puedes bloquear un solo día o un rango completo (días, semanas o meses). Se ignorará esa persona en las fechas seleccionadas.</p>
          </div>

          <form onSubmit={handleAdd} style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
            <div className="input-group">
              <label><User size={12} style={{ display:'inline', verticalAlign:'middle' }} /> Miembro</label>
              <select value={selectedPersonId} onChange={e => setSelectedPersonId(e.target.value)}>
                {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {/* Date range */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:'0.5rem', alignItems:'end' }}>
              <div className="input-group" style={{ margin:0 }}>
                <label><CalIcon size={12} style={{ display:'inline', verticalAlign:'middle' }} /> Desde</label>
                <input type="date" value={dateFrom} onChange={e => handleFromChange(e.target.value)} />
              </div>
              <div style={{ paddingBottom:'0.65rem', color:'var(--text-muted)' }}>
                <ArrowRight size={16} />
              </div>
              <div className="input-group" style={{ margin:0 }}>
                <label>Hasta</label>
                <input type="date" value={dateTo} min={dateFrom} onChange={e => handleToChange(e.target.value)} />
              </div>
            </div>

            {/* Range summary */}
            {dateFrom !== dateTo && (
              <p style={{ fontSize:'0.8rem', color:'var(--text-secondary)',
                background:'var(--bg-elevated)', padding:'0.5rem 0.75rem',
                borderRadius:8, border:'1px solid var(--glass-border)' }}>
                Se bloquearán <strong style={{ color:'var(--text-primary)' }}>
                  {eachDayOfInterval({ start: new Date(dateFrom + 'T12:00:00'), end: new Date(dateTo + 'T12:00:00') }).length} días
                </strong> consecutivos.
              </p>
            )}

            <button type="submit" className="btn-primary" disabled={loading || !selectedPersonId}
              style={{ width:'100%' }}>
              <Ban size={16} />
              <span>{loading ? 'Guardando...' : dateFrom === dateTo ? 'Bloquear Día' : 'Bloquear Rango'}</span>
            </button>
          </form>
        </div>

        {/* List */}
        <div className="glass-card" style={{ padding:'1.75rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
            marginBottom:'1.25rem', flexWrap:'wrap', gap:'0.75rem' }}>
            <div>
              <h3 style={{ fontWeight:800 }}>Restricciones Registradas</h3>
              <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginTop:'0.1rem' }}>
                {totalDays} día{totalDays !== 1 ? 's' : ''} bloqueado{totalDays !== 1 ? 's' : ''}
              </p>
            </div>
            <select value={filterPersonId} onChange={e => setFilterPersonId(e.target.value)}
              style={{ width:'auto', padding:'0.45rem 0.9rem', fontSize:'0.85rem' }}>
              <option value="">Todos los miembros</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {allGrouped.length === 0 ? (
            <p style={{ color:'var(--text-secondary)', textAlign:'center', padding:'2.5rem', fontSize:'0.9rem' }}>
              No hay restricciones{filterPersonId ? ' para este miembro' : ''}.
            </p>
          ) : (
            <div>
              {upcomingGroups.length > 0 && (
                <div style={{ marginBottom:'1.5rem' }}>
                  <p style={{ fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'0.5px', color:'var(--text-secondary)', marginBottom:'0.6rem' }}>
                    Próximas ({upcomingGroups.length})
                  </p>
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.45rem' }}>
                    <AnimatePresence>
                      {upcomingGroups.map((g, i) => (
                        <ExceptionRow key={i} group={g} onDelete={handleDeleteGroup} highlight />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
              {pastGroups.length > 0 && (
                <div>
                  <p style={{ fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'0.5px', color:'var(--text-secondary)', marginBottom:'0.6rem' }}>
                    Pasadas ({pastGroups.length})
                  </p>
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.45rem' }}>
                    <AnimatePresence>
                      {pastGroups.map((g, i) => (
                        <ExceptionRow key={i} group={g} onDelete={handleDeleteGroup} />
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

// ── Exception row (shows single day or a range) ─────────────────────
function ExceptionRow({ group, onDelete, highlight }) {
  const isRange = group.from !== group.to
  const days    = group.ids.length

  const dateLabel = isRange
    ? `${format(parseISO(group.from + 'T12:00:00'), "dd 'de' MMM", { locale: es })} — ${format(parseISO(group.to + 'T12:00:00'), "dd 'de' MMM yyyy", { locale: es })} (${days} días)`
    : format(parseISO(group.from + 'T12:00:00'), "EEEE dd 'de' MMMM yyyy", { locale: es })

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
        borderRadius:10, opacity: highlight ? 1 : 0.65, gap:'0.5rem'
      }}
    >
      <div style={{ minWidth:0 }}>
        <p style={{ fontWeight:700, fontSize:'0.92rem' }}>{group.personName}</p>
        <p style={{ color: highlight ? 'var(--error)' : 'var(--text-secondary)',
          fontSize:'0.78rem', fontWeight:500, textTransform:'capitalize',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {dateLabel}
        </p>
      </div>
      <button onClick={() => onDelete(group.ids)}
        title={isRange ? `Eliminar ${days} días` : 'Eliminar'}
        style={{ background:'transparent', color:'var(--text-secondary)',
          border:'none', cursor:'pointer', padding:'0.35rem', borderRadius:6,
          transition:'all 0.2s', flexShrink:0, display:'flex', alignItems:'center', gap:'0.3rem',
          fontSize:'0.75rem', fontWeight:600 }}
        onMouseEnter={e => { e.currentTarget.style.color='var(--error)'; e.currentTarget.style.background='rgba(239,68,68,0.1)' }}
        onMouseLeave={e => { e.currentTarget.style.color='var(--text-secondary)'; e.currentTarget.style.background='transparent' }}
      >
        {isRange && <span>{days}d</span>}
        <Trash2 size={15} />
      </button>
    </motion.div>
  )
}
