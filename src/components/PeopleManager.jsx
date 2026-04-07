import React, { useState, useEffect } from 'react'
import { Plus, Trash2, UserPlus, Tag, X, Edit2, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

export default function PeopleManager() {
  const [people, setPeople]           = useState([])
  const [subareas, setSubareas]       = useState([])
  const [areas, setAreas]             = useState([])
  const [isAdding, setIsAdding]       = useState(false)
  const [editingId, setEditingId]     = useState(null)
  const [formName, setFormName]       = useState('')
  const [formSkills, setFormSkills]   = useState([])
  const [loading, setLoading]         = useState(false)
  const [expandedId, setExpandedId]   = useState(null)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const [{ data: pData }, { data: sData }, { data: aData }] = await Promise.all([
      supabase.from('people').select('*, person_subareas(subarea_id)').order('name'),
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
    setIsAdding(true)
  }

  const openEdit = (person) => {
    setEditingId(person.id)
    setFormName(person.name)
    setFormSkills(person.person_subareas?.map(ps => ps.subarea_id) || [])
    setIsAdding(false)
  }

  const toggleSkill = (id) => {
    setFormSkills(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formName.trim()) return
    setLoading(true)

    if (editingId) {
      // Update name
      await supabase.from('people').update({ name: formName.trim() }).eq('id', editingId)
      // Replace skills
      await supabase.from('person_subareas').delete().eq('person_id', editingId)
      if (formSkills.length > 0) {
        await supabase.from('person_subareas').insert(
          formSkills.map(sid => ({ person_id: editingId, subarea_id: sid }))
        )
      }
      setEditingId(null)
    } else {
      const { data } = await supabase.from('people').insert({ name: formName.trim() }).select()
      if (data?.[0] && formSkills.length > 0) {
        await supabase.from('person_subareas').insert(
          formSkills.map(sid => ({ person_id: data[0].id, subarea_id: sid }))
        )
      }
      setIsAdding(false)
    }

    setFormName('')
    setFormSkills([])
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
  }

  // Group subareas by area for the form
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
          <p>Administra los miembros y sus habilidades de servicio.</p>
        </div>
        <button className="btn-primary" onClick={showForm ? cancelForm : openAdd}>
          {showForm ? <X size={18} /> : <UserPlus size={18} />}
          <span>{showForm ? 'Cancelar' : 'Nuevo Miembro'}</span>
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            key="person-form"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
            onSubmit={handleSubmit}
          >
            <div className="glass-card" style={{ borderColor:'var(--primary)', padding:'1.75rem' }}>
              <h3 style={{ fontWeight:800, marginBottom:'1.25rem' }}>
                {editingId ? 'Editar Miembro' : 'Agregar Miembro'}
              </h3>

              <div className="input-group" style={{ marginBottom:'1.5rem', maxWidth:400 }}>
                <label>Nombre Completo</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)}
                  placeholder="Ej. Juan Pérez" required autoFocus />
              </div>

              <div>
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
                          <button key={sa.id} type="button"
                            onClick={() => toggleSkill(sa.id)}
                            style={{
                              padding:'0.4rem 0.9rem', borderRadius:20, fontSize:'0.83rem',
                              fontWeight:600, cursor:'pointer', transition:'all 0.2s',
                              border: formSkills.includes(sa.id)
                                ? '1px solid var(--primary)'
                                : '1px solid var(--glass-border)',
                              background: formSkills.includes(sa.id)
                                ? 'var(--primary)' : 'var(--bg-mid)',
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

              <div style={{ display:'flex', gap:'0.75rem', marginTop:'1.5rem' }}>
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
              const isExpanded = expandedId === person.id
              const isEditing = editingId === person.id

              return (
                <motion.div key={person.id} layout
                  initial={{ opacity:0, scale:0.95 }}
                  animate={{ opacity:1, scale:1 }}
                  exit={{ opacity:0, scale:0.9 }}
                  className="glass-card"
                  style={{ padding:'1.25rem', cursor:'default',
                    borderColor: isEditing ? 'var(--primary)' : 'var(--glass-border)' }}
                >
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
                      </p>
                    </div>

                    <div style={{ display:'flex', gap:'0.35rem' }}>
                      <button onClick={() => setExpandedId(isExpanded ? null : person.id)}
                        style={{ background:'transparent', color:'var(--text-secondary)',
                          padding:'0.3rem', borderRadius:6 }}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      <button onClick={() => openEdit(person)}
                        style={{ background:'transparent', color:'var(--text-secondary)',
                          padding:'0.3rem', borderRadius:6 }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(person.id)}
                        style={{ background:'transparent', color:'var(--text-secondary)',
                          padding:'0.3rem', borderRadius:6 }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && personSkills.length > 0 && (
                      <motion.div
                        initial={{ height:0, opacity:0 }}
                        animate={{ height:'auto', opacity:1 }}
                        exit={{ height:0, opacity:0 }}
                        style={{ overflow:'hidden', marginTop:'0.85rem', paddingTop:'0.85rem',
                          borderTop:'1px solid var(--glass-border)' }}
                      >
                        <div style={{ display:'flex', flexWrap:'wrap', gap:'0.35rem' }}>
                          {personSkills.map(sk => (
                            <span key={sk.id} style={{
                              fontSize:'0.75rem', fontWeight:600,
                              padding:'0.25rem 0.65rem', borderRadius:20,
                              background:'var(--bg-surface)',
                              border:'1px solid var(--glass-border)',
                              color:'var(--text-secondary)',
                              display:'flex', alignItems:'center', gap:'0.3rem'
                            }}>
                              <Tag size={10} /> {sk.name}
                            </span>
                          ))}
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
