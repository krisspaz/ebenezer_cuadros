import React, { useState, useEffect } from 'react'
import { Plus, Trash2, UserPlus, Tag, X, Edit2, Check, ChevronDown, ChevronUp, CalendarDays } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DAYS_FULL  = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export default function PeopleManager() {
  const [people, setPeople]           = useState([])
  const [subareas, setSubareas]       = useState([])
  const [areas, setAreas]             = useState([])
  const [isAdding, setIsAdding]       = useState(false)
  const [editingId, setEditingId]     = useState(null)
  const [formName, setFormName]       = useState('')
  const [formSkills, setFormSkills]   = useState([])
  const [formDays, setFormDays]       = useState([])   // [] = sin restricción (todos los días)
  const [loading, setLoading]         = useState(false)
  const [expandedId, setExpandedId]   = useState(null)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const [{ data: pData }, { data: sData }, { data: aData }] = await Promise.all([
      supabase.from('people')
        .select('*, person_subareas(subarea_id), person_available_days(day_of_week)')
        .order('name'),
      supabase.from('subareas').select('*, areas(name)').order('name'),
      supabase.from('areas').select('*').order('name'),
    ])
    setPeople(pData || [])
    setSubareas(sData || [])
    setAreas(aData || [])
    setLoading(false)
  }

  const openAdd = () => {
    setEditingId(null)
    setFormName('')
    setFormSkills([])
    setFormDays([])
    setIsAdding(true)
  }

  const openEdit = (person) => {
    setEditingId(person.id)
    setFormName(person.name)
    setFormSkills(person.person_subareas?.map(ps => ps.subarea_id) || [])
    setFormDays(person.person_available_days?.map(d => d.day_of_week) || [])
    setIsAdding(false)
  }

  const toggleSkill = (id) =>
    setFormSkills(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])

  const toggleDay = (dow) =>
    setFormDays(prev => prev.includes(dow) ? prev.filter(d => d !== dow) : [...prev, dow])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formName.trim()) return
    setLoading(true)

    let personId = editingId

    if (editingId) {
      await supabase.from('people').update({ name: formName.trim() }).eq('id', editingId)
    } else {
      const { data } = await supabase.from('people').insert({ name: formName.trim() }).select()
      personId = data?.[0]?.id
    }

    if (personId) {
      // Replace skills
      await supabase.from('person_subareas').delete().eq('person_id', personId)
      if (formSkills.length > 0) {
        await supabase.from('person_subareas').insert(
          formSkills.map(sid => ({ person_id: personId, subarea_id: sid }))
        )
      }

      // Replace available days
      await supabase.from('person_available_days').delete().eq('person_id', personId)
      if (formDays.length > 0) {
        await supabase.from('person_available_days').insert(
          formDays.map(dow => ({ person_id: personId, day_of_week: dow }))
        )
      }
    }

    setIsAdding(false)
    setEditingId(null)
    setFormName('')
    setFormSkills([])
    setFormDays([])
    fetchData()
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar a esta persona?')) return
    await supabase.from('people').delete().eq('id', id)
    fetchData()
  }

  const cancelForm = () => {
    setIsAdding(false)
    setEditingId(null)
    setFormName('')
    setFormSkills([])
    setFormDays([])
  }

  const subareasByArea = areas.map(area => ({
    ...area,
    subareas: subareas.filter(s => s.area_id === area.id)
  })).filter(a => a.subareas.length > 0)

  const showForm = isAdding || editingId !== null

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.75rem' }}>
      {/* Header */}
      <div className="view-header">
        <div>
          <h1>Gestión de Equipo</h1>
          <p>Administra los miembros, sus roles y los días que pueden servir.</p>
        </div>
        <button className="btn-primary" onClick={showForm ? cancelForm : openAdd}>
          {showForm ? <X size={18} /> : <UserPlus size={18} />}
          <span>{showForm ? 'Cancelar' : 'Nuevo Miembro'}</span>
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form key="person-form"
            initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
            exit={{ height:0, opacity:0 }} style={{ overflow:'hidden' }}
            onSubmit={handleSubmit}>

            <div className="glass-card" style={{ borderColor:'var(--primary)', padding:'1.75rem' }}>
              <h3 style={{ fontWeight:800, marginBottom:'1.25rem' }}>
                {editingId ? 'Editar Miembro' : 'Agregar Miembro'}
              </h3>

              {/* Name */}
              <div className="input-group" style={{ marginBottom:'1.5rem', maxWidth:400 }}>
                <label>Nombre Completo</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)}
                  placeholder="Ej. Juan Pérez" required autoFocus />
              </div>

              {/* Skills */}
              <div style={{ marginBottom:'1.5rem' }}>
                <label style={{ marginBottom:'0.75rem' }}>Roles / Habilidades</label>
                <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                  {subareasByArea.map(area => (
                    <div key={area.id}>
                      <p style={{ fontSize:'0.78rem', color:'var(--text-secondary)', fontWeight:700,
                        textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'0.5rem' }}>
                        {area.name}
                      </p>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem' }}>
                        {area.subareas.map(sa => (
                          <button key={sa.id} type="button" onClick={() => toggleSkill(sa.id)}
                            style={{
                              padding:'0.4rem 0.9rem', borderRadius:20, fontSize:'0.83rem',
                              fontWeight:600, cursor:'pointer', transition:'all 0.2s',
                              border: formSkills.includes(sa.id) ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                              background: formSkills.includes(sa.id) ? 'var(--primary)' : 'var(--bg-mid)',
                              color: formSkills.includes(sa.id) ? '#fff' : 'var(--text-secondary)',
                            }}>
                            {sa.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {subareasByArea.length === 0 && (
                    <p style={{ color:'var(--text-secondary)', fontSize:'0.85rem' }}>
                      Primero crea áreas y subáreas en la sección Áreas.
                    </p>
                  )}
                </div>
              </div>

              {/* Available days */}
              <div style={{ marginBottom:'1.5rem' }}>
                <label style={{ marginBottom:'0.4rem' }}>
                  <CalendarDays size={12} style={{ display:'inline', verticalAlign:'middle', marginRight:4 }} />
                  Días que puede servir
                </label>
                <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginBottom:'0.65rem' }}>
                  {formDays.length === 0
                    ? 'Sin restricción — puede servir cualquier día de la semana'
                    : `Solo: ${formDays.sort((a,b)=>a-b).map(d => DAYS_FULL[d]).join(', ')}`}
                </p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem' }}>
                  {DAYS_SHORT.map((d, i) => (
                    <button key={i} type="button" onClick={() => toggleDay(i)}
                      style={{
                        padding:'0.4rem 0.8rem', borderRadius:20, fontSize:'0.83rem',
                        fontWeight:700, cursor:'pointer', transition:'all 0.2s',
                        border: formDays.includes(i) ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                        background: formDays.includes(i) ? 'var(--primary)' : 'var(--bg-mid)',
                        color: formDays.includes(i) ? '#fff' : 'var(--text-secondary)',
                      }}>
                      {d}
                    </button>
                  ))}
                </div>
                {formDays.length > 0 && (
                  <button type="button" onClick={() => setFormDays([])}
                    style={{ marginTop:'0.5rem', fontSize:'0.75rem', color:'var(--text-muted)',
                      background:'transparent', border:'none', cursor:'pointer', padding:0 }}>
                    Limpiar restricción (cualquier día)
                  </button>
                )}
              </div>

              <div style={{ display:'flex', gap:'0.75rem' }}>
                <button type="submit" className="btn-primary" disabled={loading}>
                  <Check size={16} />
                  <span>{loading ? 'Guardando...' : editingId ? 'Actualizar' : 'Guardar Miembro'}</span>
                </button>
                <button type="button" onClick={cancelForm}
                  style={{ padding:'0.7rem 1.2rem', borderRadius:10, background:'var(--bg-mid)',
                    border:'1px solid var(--glass-border)', color:'var(--text-secondary)', fontWeight:600 }}>
                  Cancelar
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* People grid */}
      {loading && people.length === 0 ? (
        <p style={{ color:'var(--text-secondary)', textAlign:'center', padding:'3rem' }}>Cargando...</p>
      ) : people.length === 0 ? (
        <div className="glass-card" style={{ textAlign:'center', padding:'3rem', color:'var(--text-secondary)' }}>
          <UserPlus size={48} style={{ margin:'0 auto 1rem', opacity:0.3 }} />
          <p>No hay miembros aún. Agrega el primero.</p>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'1rem' }}>
          <AnimatePresence>
            {people.map(person => {
              const personSkills = person.person_subareas?.map(ps =>
                subareas.find(s => s.id === ps.subarea_id)
              ).filter(Boolean) || []

              const personDays = person.person_available_days?.map(d => d.day_of_week).sort((a,b) => a-b) || []
              const isExpanded = expandedId === person.id
              const isEditing  = editingId === person.id

              return (
                <motion.div key={person.id} layout
                  initial={{ opacity:0, scale:0.95 }}
                  animate={{ opacity:1, scale:1 }}
                  exit={{ opacity:0, scale:0.9 }}
                  className="glass-card"
                  style={{ padding:'1.25rem', cursor:'default',
                    borderColor: isEditing ? 'var(--primary)' : 'var(--glass-border)' }}>

                  <div style={{ display:'flex', alignItems:'center', gap:'0.85rem' }}>
                    <div style={{
                      width:46, height:46, borderRadius:13, flexShrink:0,
                      background:'linear-gradient(135deg, var(--primary), var(--accent))',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontWeight:900, fontSize:'1.2rem'
                    }}>{person.name[0].toUpperCase()}</div>

                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontWeight:700, fontSize:'1rem', overflow:'hidden',
                        textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{person.name}</p>
                      <p style={{ color:'var(--text-secondary)', fontSize:'0.78rem' }}>
                        {personSkills.length} rol{personSkills.length !== 1 ? 'es' : ''}
                        {personDays.length > 0 && (
                          <span style={{ marginLeft:'0.5rem', color:'var(--primary)' }}>
                            · {personDays.map(d => DAYS_SHORT[d]).join(', ')}
                          </span>
                        )}
                      </p>
                    </div>

                    <div style={{ display:'flex', gap:'0.35rem' }}>
                      <button onClick={() => setExpandedId(isExpanded ? null : person.id)}
                        style={{ background:'transparent', color:'var(--text-secondary)', padding:'0.3rem', borderRadius:6 }}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      <button onClick={() => openEdit(person)}
                        style={{ background:'transparent', color:'var(--text-secondary)', padding:'0.3rem', borderRadius:6 }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(person.id)}
                        style={{ background:'transparent', color:'var(--text-secondary)', padding:'0.3rem', borderRadius:6 }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
                        exit={{ height:0, opacity:0 }}
                        style={{ overflow:'hidden', marginTop:'0.85rem', paddingTop:'0.85rem',
                          borderTop:'1px solid var(--glass-border)' }}>

                        {/* Skills */}
                        {personSkills.length > 0 && (
                          <div style={{ marginBottom:'0.75rem' }}>
                            <p style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--text-muted)',
                              textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'0.4rem' }}>
                              Roles
                            </p>
                            <div style={{ display:'flex', flexWrap:'wrap', gap:'0.35rem' }}>
                              {personSkills.map(sk => (
                                <span key={sk.id} style={{
                                  fontSize:'0.75rem', fontWeight:600,
                                  padding:'0.25rem 0.65rem', borderRadius:20,
                                  background:'var(--bg-surface)', border:'1px solid var(--glass-border)',
                                  color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:'0.3rem'
                                }}>
                                  <Tag size={10} /> {sk.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Available days */}
                        <div>
                          <p style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--text-muted)',
                            textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'0.4rem' }}>
                            Días de servicio
                          </p>
                          {personDays.length === 0 ? (
                            <p style={{ fontSize:'0.8rem', color:'var(--text-secondary)', fontStyle:'italic' }}>
                              Cualquier día de la semana
                            </p>
                          ) : (
                            <div style={{ display:'flex', flexWrap:'wrap', gap:'0.35rem' }}>
                              {personDays.map(d => (
                                <span key={d} style={{
                                  fontSize:'0.75rem', fontWeight:700,
                                  padding:'0.25rem 0.65rem', borderRadius:20,
                                  background:'hsla(217,91%,60%,0.12)',
                                  border:'1px solid hsla(217,91%,60%,0.25)',
                                  color:'hsl(217,91%,72%)'
                                }}>
                                  {DAYS_FULL[d]}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
