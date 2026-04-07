import React, { useState, useEffect, useCallback } from 'react'
import {
  Wand2, Save, RefreshCw, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle2, Clock, User, Settings,
  Plus, Trash2, X, Check
} from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, addMonths, subMonths, parseISO
} from 'date-fns'
import { es } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { GeneratedPDFExporter } from './PDFExporter'

// ── Day-of-week helpers ─────────────────────────────────────────────
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const STORAGE_KEY = 'sanctuary_service_types'

const DEFAULT_SERVICE_TYPES = [
  { id: 'default_1', name: 'Culto Martes',      dayOfWeek: 2, enabled: true  },
  { id: 'default_2', name: 'Culto Viernes',     dayOfWeek: 5, enabled: true  },
  { id: 'default_3', name: 'Domingo 1er Culto', dayOfWeek: 0, enabled: true  },
  { id: 'default_4', name: 'Domingo 2do Culto', dayOfWeek: 0, enabled: false },
]

function loadServiceTypes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (_) {}
  return DEFAULT_SERVICE_TYPES
}

function saveServiceTypes(types) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(types))
}

// ── Client-side scheduling algorithm ────────────────────────────────
function runScheduler({ serviceSlots, subareaIds, people, personSkills, exceptions }) {
  const counts = {}
  people.forEach(p => { counts[p.id] = 0 })
  const results = []

  for (const slot of serviceSlots) {
    const { date, service_name } = slot
    const usedInSlot = new Set()

    for (const subareaId of subareaIds) {
      const eligible = people.filter(p =>
        personSkills[p.id]?.includes(subareaId) &&
        !exceptions[p.id]?.includes(date) &&
        !usedInSlot.has(p.id)
      )

      if (eligible.length === 0) {
        results.push({ date, service_name, subarea_id: subareaId,
          person_id: null, person_name: null, has_conflict: true })
        continue
      }

      const minCount = Math.min(...eligible.map(p => counts[p.id]))
      const candidates = eligible.filter(p => counts[p.id] === minCount)
      const chosen = candidates[Math.floor(Math.random() * candidates.length)]
      usedInSlot.add(chosen.id)
      counts[chosen.id]++
      results.push({ date, service_name, subarea_id: subareaId,
        person_id: chosen.id, person_name: chosen.name, has_conflict: false })
    }
  }
  return results
}

// ── Main component ───────────────────────────────────────────────────
export default function SchedulerUI() {
  const [currentMonth, setCurrentMonth]     = useState(new Date())
  const [subareas, setSubareas]             = useState([])
  const [areas, setAreas]                   = useState([])
  const [people, setPeople]                 = useState([])
  const [selectedSubareas, setSelectedSubareas] = useState([])
  const [generated, setGenerated]           = useState([])
  const [loading, setLoading]               = useState(false)
  const [saving, setSaving]                 = useState(false)
  const [saved, setSaved]                   = useState(false)
  const [serviceTypes, setServiceTypes]     = useState(loadServiceTypes)
  const [showTypeEditor, setShowTypeEditor] = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const [{ data: sData }, { data: aData }, { data: pData }] = await Promise.all([
      supabase.from('subareas').select('*, areas(name)').order('name'),
      supabase.from('areas').select('*').order('name'),
      supabase.from('people').select('*, person_subareas(subarea_id)').order('name'),
    ])
    setSubareas(sData || [])
    setAreas(aData || [])
    setPeople(pData || [])
    if (sData) setSelectedSubareas(sData.map(s => s.id))
  }

  const persistServiceTypes = (types) => {
    setServiceTypes(types)
    saveServiceTypes(types)
  }

  const toggleServiceType = (id) => {
    persistServiceTypes(serviceTypes.map(st =>
      st.id === id ? { ...st, enabled: !st.enabled } : st
    ))
  }

  const buildSlots = useCallback(() => {
    const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
    const slots = []
    days.forEach(day => {
      const dow = getDay(day)  // 0=Sun … 6=Sat
      serviceTypes
        .filter(st => st.enabled && st.dayOfWeek === dow)
        .forEach(st => {
          slots.push({ date: format(day, 'yyyy-MM-dd'), service_name: st.name })
        })
    })
    return slots
  }, [currentMonth, serviceTypes])

  const handleGenerate = async () => {
    if (selectedSubareas.length === 0 || people.length === 0) return
    setLoading(true)
    setSaved(false)

    const slots = buildSlots()
    const apiUrl = import.meta.env.VITE_API_URL

    if (apiUrl && apiUrl !== 'http://localhost:8000') {
      try {
        const resp = await fetch(`${apiUrl}/generate-schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ service_slots: slots, subareas: selectedSubareas }),
        })
        if (resp.ok) {
          setGenerated(await resp.json())
          setLoading(false)
          return
        }
      } catch (_) {}
    }

    // Client-side fallback
    const [{ data: exData }] = await Promise.all([
      supabase.from('availability_exceptions').select('person_id, date'),
    ])

    const personSkills = {}
    people.forEach(p => {
      personSkills[p.id] = p.person_subareas?.map(ps => ps.subarea_id) || []
    })

    const exceptions = {}
    ;(exData || []).forEach(e => {
      if (!exceptions[e.person_id]) exceptions[e.person_id] = []
      exceptions[e.person_id].push(e.date)
    })

    setGenerated(runScheduler({ serviceSlots: slots, subareaIds: selectedSubareas, people, personSkills, exceptions }))
    setLoading(false)
  }

  const handleManualChange = (index, personId) => {
    const updated = [...generated]
    const person = people.find(p => p.id === personId)
    updated[index] = {
      ...updated[index],
      person_id: personId || null,
      person_name: person ? person.name : null,
      has_conflict: !personId,
    }
    setGenerated(updated)
  }

  const handleSave = async () => {
    setSaving(true)
    const groups = {}
    generated.forEach(a => {
      const key = `${a.date}__${a.service_name}`
      if (!groups[key]) groups[key] = { date: a.date, service_name: a.service_name, items: [] }
      groups[key].items.push(a)
    })

    for (const g of Object.values(groups)) {
      const { data: schData } = await supabase
        .from('schedules')
        .insert({ date: g.date, service_name: g.service_name })
        .select()
      if (!schData?.[0]) continue
      const scheduleId = schData[0].id
      const toInsert = g.items
        .filter(i => i.person_id && i.subarea_id)
        .map(i => ({ schedule_id: scheduleId, person_id: i.person_id, subarea_id: i.subarea_id }))
      if (toInsert.length > 0) {
        await supabase.from('assignments').insert(toInsert)
      }
    }

    setSaved(true)
    setSaving(false)
    setTimeout(() => { setGenerated([]); setSaved(false) }, 2500)
  }

  // Group generated for display
  const groupedGenerated = []
  const seenKeys = {}
  generated.forEach(a => {
    const key = `${a.date}__${a.service_name}`
    if (!seenKeys[key]) {
      seenKeys[key] = groupedGenerated.length
      groupedGenerated.push({ date: a.date, service_name: a.service_name, assignments: [] })
    }
    groupedGenerated[seenKeys[key]].assignments.push(a)
  })

  const subareasByArea = areas.map(area => ({
    ...area,
    subareas: subareas.filter(s => s.area_id === area.id)
  })).filter(a => a.subareas.length > 0)

  const conflictCount = generated.filter(a => a.has_conflict).length

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.75rem' }}>
      {/* Header */}
      <div className="view-header">
        <div>
          <h1>Programador Inteligente</h1>
          <p>Genera calendarios automáticos con distribución equitativa.</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem',
          background:'var(--bg-mid)', border:'1px solid var(--glass-border)',
          borderRadius:12, padding:'0.5rem 1rem' }}>
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            style={{ background:'transparent', border:'none', color:'var(--text-secondary)',
              cursor:'pointer', padding:'0.25rem' }}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontWeight:700, textTransform:'capitalize', minWidth:160, textAlign:'center' }}>
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </span>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            style={{ background:'transparent', border:'none', color:'var(--text-secondary)',
              cursor:'pointer', padding:'0.25rem' }}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="scheduler-grid" style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:'1.5rem', alignItems:'start' }}>
        {/* Config sidebar */}
        <div className="glass-card scheduler-sidebar" style={{ padding:'1.5rem' }}>

          {/* Service types */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
            <h3 style={{ display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.82rem',
              color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'1px' }}>
              <Clock size={15} /> Cultos Activos
            </h3>
            <button onClick={() => setShowTypeEditor(true)}
              title="Configurar tipos de culto"
              style={{ background:'transparent', border:'1px solid var(--glass-border)',
                borderRadius:7, padding:'0.25rem 0.5rem', cursor:'pointer',
                color:'var(--text-secondary)', display:'flex', alignItems:'center' }}>
              <Settings size={13} />
            </button>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem', marginBottom:'1.5rem' }}>
            {serviceTypes.map(st => (
              <button key={st.id} type="button"
                onClick={() => toggleServiceType(st.id)}
                style={{
                  padding:'0.55rem 0.75rem', borderRadius:8, fontSize:'0.82rem', fontWeight:700,
                  cursor:'pointer', transition:'all 0.2s', textAlign:'left',
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  border: st.enabled ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                  background: st.enabled ? 'var(--primary)' : 'var(--bg-mid)',
                  color: st.enabled ? '#fff' : 'var(--text-secondary)',
                }}>
                <span>{st.name}</span>
                <span style={{ fontSize:'0.7rem', opacity:0.7 }}>{DAY_SHORT[st.dayOfWeek]}</span>
              </button>
            ))}
          </div>

          <h3 style={{ display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.82rem',
            color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'1px',
            marginBottom:'0.75rem' }}>
            <User size={15} /> Subáreas a Programar
          </h3>

          <div style={{ maxHeight:280, overflowY:'auto', display:'flex', flexDirection:'column', gap:'1rem',
            marginBottom:'1.5rem' }}>
            {subareasByArea.map(area => (
              <div key={area.id}>
                <p style={{ fontSize:'0.72rem', color:'var(--text-secondary)', fontWeight:700,
                  textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'0.4rem' }}>
                  {area.name}
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.3rem' }}>
                  {area.subareas.map(sa => (
                    <label key={sa.id} style={{
                      display:'flex', alignItems:'center', gap:'0.6rem',
                      fontSize:'0.85rem', cursor:'pointer', padding:'0.25rem 0'
                    }}>
                      <input type="checkbox"
                        checked={selectedSubareas.includes(sa.id)}
                        onChange={() => setSelectedSubareas(prev =>
                          prev.includes(sa.id) ? prev.filter(id => id !== sa.id) : [...prev, sa.id]
                        )}
                        style={{ width:'auto' }}
                      />
                      {sa.name}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button className="btn-primary" onClick={handleGenerate}
            disabled={loading || selectedSubareas.length === 0}
            style={{ width:'100%' }}>
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Wand2 size={16} />}
            <span>{loading ? 'Generando...' : 'Generar Propuesta'}</span>
          </button>
        </div>

        {/* Preview panel */}
        <div>
          <AnimatePresence mode="wait">
            {generated.length > 0 ? (
              <motion.div key="preview"
                initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0 }}>

                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                  marginBottom:'1.25rem', flexWrap:'wrap', gap:'0.75rem' }}>
                  <div>
                    <h3 style={{ fontWeight:800, fontSize:'1.1rem' }}>
                      Vista Previa — {format(currentMonth, 'MMMM yyyy', { locale: es })}
                    </h3>
                    {conflictCount > 0 && (
                      <p style={{ color:'var(--warning)', fontSize:'0.82rem', marginTop:'0.2rem' }}>
                        <AlertTriangle size={12} style={{ display:'inline', verticalAlign:'middle' }} />
                        {' '}{conflictCount} conflicto{conflictCount > 1 ? 's' : ''} — sin personal disponible
                      </p>
                    )}
                  </div>
                  <div style={{ display:'flex', gap:'0.6rem' }}>
                    <button className="btn-primary"
                      onClick={handleGenerate} disabled={loading}
                      style={{ background:'var(--bg-surface)', border:'1px solid var(--glass-border)',
                        color:'var(--text-primary)' }}>
                      <RefreshCw size={15} />
                      <span>Regenerar</span>
                    </button>
                    <GeneratedPDFExporter generated={generated} subareas={subareas} />
                    <button className="btn-primary"
                      onClick={handleSave} disabled={saving || saved}
                      style={{ background: saved ? 'var(--success)' : 'var(--primary)' }}>
                      {saved ? <CheckCircle2 size={15} /> : <Save size={15} />}
                      <span>{saved ? 'Guardado' : saving ? 'Guardando...' : 'Confirmar y Guardar'}</span>
                    </button>
                  </div>
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                  {groupedGenerated.map((group, gi) => (
                    <div key={gi} className="glass-card" style={{ padding:'1.25rem' }}>
                      <h4 style={{ fontWeight:800, marginBottom:'0.85rem',
                        color:'var(--primary)', fontSize:'0.95rem' }}>
                        {format(parseISO(group.date), "EEEE dd 'de' MMMM", { locale: es })}
                        {' — '}{group.service_name}
                      </h4>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'0.6rem' }}>
                        {group.assignments.map((a, ai) => {
                          const sa = subareas.find(s => s.id === a.subarea_id)
                          const globalIdx = generated.indexOf(a)
                          return (
                            <div key={ai} style={{
                              padding:'0.75rem', borderRadius:10,
                              background: a.has_conflict ? 'rgba(239,68,68,0.07)' : 'var(--bg-mid)',
                              border:`1px solid ${a.has_conflict ? 'rgba(239,68,68,0.25)' : 'var(--glass-border)'}`,
                            }}>
                              <p style={{ fontSize:'0.72rem', color:'var(--text-secondary)', fontWeight:700,
                                textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:'0.35rem' }}>
                                {sa?.areas?.name} › {sa?.name}
                              </p>
                              {a.has_conflict ? (
                                <p style={{ color:'var(--error)', fontSize:'0.82rem', fontWeight:700,
                                  display:'flex', alignItems:'center', gap:'0.3rem' }}>
                                  <AlertTriangle size={13} /> Sin disponibles
                                </p>
                              ) : (
                                <p style={{ fontWeight:700, color:'var(--success)', fontSize:'0.9rem' }}>
                                  {a.person_name}
                                </p>
                              )}
                              <select
                                value={a.person_id || ''}
                                onChange={e => handleManualChange(globalIdx, e.target.value)}
                                style={{ marginTop:'0.5rem', fontSize:'0.78rem', padding:'0.3rem 0.5rem' }}>
                                <option value="">— Cambiar persona —</option>
                                {people.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity:0 }} animate={{ opacity:1 }}
                className="glass-card"
                style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                  textAlign:'center', padding:'4rem 2rem', gap:'1rem', color:'var(--text-secondary)' }}>
                <Wand2 size={56} style={{ opacity:0.2 }} />
                <h3 style={{ fontWeight:800 }}>Listo para comenzar</h3>
                <p style={{ maxWidth:360, fontSize:'0.9rem' }}>
                  Selecciona los cultos y las subáreas en el panel lateral, luego presiona "Generar Propuesta".
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Service type editor modal */}
      <AnimatePresence>
        {showTypeEditor && (
          <ServiceTypeEditorModal
            types={serviceTypes}
            onSave={types => { persistServiceTypes(types); setShowTypeEditor(false) }}
            onClose={() => setShowTypeEditor(false)}
          />
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 900px) { .scheduler-grid { grid-template-columns: 1fr !important; } }
        @media (min-width: 901px) { .scheduler-sidebar { position: sticky; top: 1rem; } }
      `}</style>
    </div>
  )
}

// ── Service Type Editor Modal ────────────────────────────────────────
function ServiceTypeEditorModal({ types, onSave, onClose }) {
  const [draft, setDraft] = useState(types.map(t => ({ ...t })))
  const [newName, setNewName]   = useState('')
  const [newDay, setNewDay]     = useState(0)

  const update = (id, field, value) => {
    setDraft(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t))
  }

  const addType = () => {
    if (!newName.trim()) return
    setDraft(prev => [...prev, {
      id: `custom_${Date.now()}`,
      name: newName.trim(),
      dayOfWeek: parseInt(newDay),
      enabled: true,
    }])
    setNewName('')
    setNewDay(0)
  }

  const removeType = (id) => {
    setDraft(prev => prev.filter(t => t.id !== id))
  }

  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)',
        backdropFilter:'blur(4px)', zIndex:200, display:'flex',
        alignItems:'center', justifyContent:'center', padding:'1rem' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale:0.92, opacity:0 }} animate={{ scale:1, opacity:1 }}
        exit={{ scale:0.92, opacity:0 }}
        onClick={e => e.stopPropagation()}
        style={{ background:'var(--bg-mid)', border:'1px solid var(--glass-border)',
          borderRadius:18, padding:'1.75rem', maxWidth:500, width:'100%' }}
      >
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
          <h3 style={{ fontWeight:800, fontSize:'1.05rem' }}>Configurar Tipos de Culto</h3>
          <button onClick={onClose}
            style={{ background:'var(--bg-surface)', border:'1px solid var(--glass-border)',
              borderRadius:8, padding:'0.4rem', cursor:'pointer', color:'var(--text-primary)' }}>
            <X size={15} />
          </button>
        </div>

        {/* Existing types */}
        <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem', marginBottom:'1.25rem' }}>
          {draft.map(t => (
            <div key={t.id} style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
              <input
                value={t.name}
                onChange={e => update(t.id, 'name', e.target.value)}
                style={{ flex:1, fontSize:'0.85rem', padding:'0.4rem 0.6rem' }}
                placeholder="Nombre del culto"
              />
              <select
                value={t.dayOfWeek}
                onChange={e => update(t.id, 'dayOfWeek', parseInt(e.target.value))}
                style={{ fontSize:'0.82rem', padding:'0.4rem 0.5rem' }}
              >
                {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
              <button onClick={() => removeType(t.id)}
                style={{ background:'hsla(0,84%,62%,0.1)', border:'1px solid hsla(0,84%,62%,0.3)',
                  borderRadius:7, padding:'0.4rem', cursor:'pointer', color:'hsl(0,80%,72%)',
                  flexShrink:0, display:'flex', alignItems:'center' }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        {/* Add new type */}
        <div style={{ display:'flex', gap:'0.5rem', alignItems:'center',
          padding:'0.85rem', background:'var(--bg-elevated)',
          border:'1px solid var(--glass-border)', borderRadius:10, marginBottom:'1.25rem' }}>
          <Plus size={14} style={{ color:'var(--text-muted)', flexShrink:0 }} />
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addType()}
            placeholder="Nuevo tipo de culto..."
            style={{ flex:1, fontSize:'0.85rem', padding:'0.3rem 0.5rem' }}
          />
          <select
            value={newDay}
            onChange={e => setNewDay(e.target.value)}
            style={{ fontSize:'0.82rem', padding:'0.3rem 0.5rem' }}
          >
            {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
          <button onClick={addType} disabled={!newName.trim()}
            style={{ background:'var(--primary)', border:'none', borderRadius:7,
              padding:'0.4rem 0.7rem', cursor:'pointer', color:'#fff', fontSize:'0.8rem',
              fontWeight:700, flexShrink:0 }}>
            Agregar
          </button>
        </div>

        <div style={{ display:'flex', gap:'0.5rem', justifyContent:'flex-end' }}>
          <button onClick={onClose}
            style={{ padding:'0.55rem 1.1rem', borderRadius:9, fontSize:'0.85rem',
              border:'1px solid var(--glass-border)', background:'transparent',
              color:'var(--text-secondary)', cursor:'pointer', fontWeight:600 }}>
            Cancelar
          </button>
          <button onClick={() => onSave(draft)}
            style={{ padding:'0.55rem 1.25rem', borderRadius:9, fontSize:'0.85rem',
              border:'none', background:'var(--primary)', color:'#fff',
              cursor:'pointer', fontWeight:700, display:'flex', alignItems:'center', gap:'0.4rem' }}>
            <Check size={14} /> Guardar cambios
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
