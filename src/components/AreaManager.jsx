import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Layers, ShieldCheck, Map, Edit2, Check, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

// Default areas to seed if none exist
const DEFAULT_AREAS = ['Alabanza', 'Danza', 'Multimedia', 'Sonido', 'Niños']

export default function AreaManager() {
  const [areas, setAreas]               = useState([])
  const [subareas, setSubareas]         = useState([])
  const [selectedAreaId, setSelectedAreaId] = useState('')
  const [newArea, setNewArea]           = useState('')
  const [newSubarea, setNewSubarea]     = useState('')
  const [editingAreaId, setEditingAreaId] = useState(null)
  const [editAreaName, setEditAreaName] = useState('')
  const [loading, setLoading]           = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const [{ data: aData }, { data: sData }] = await Promise.all([
      supabase.from('areas').select('*').order('name'),
      supabase.from('subareas').select('*').order('name'),
    ])
    setAreas(aData || [])
    setSubareas(sData || [])
    if (aData?.length && !selectedAreaId) setSelectedAreaId(aData[0].id)
    setLoading(false)
  }

  const handleAddArea = async (e) => {
    e.preventDefault()
    if (!newArea.trim()) return
    const { error } = await supabase.from('areas').insert({ name: newArea.trim() })
    if (!error) { setNewArea(''); fetchData() }
  }

  const handleSeedAreas = async () => {
    for (const name of DEFAULT_AREAS) {
      await supabase.from('areas').insert({ name })
    }
    fetchData()
  }

  const handleAddSubarea = async (e) => {
    e.preventDefault()
    if (!newSubarea.trim() || !selectedAreaId) return
    const { error } = await supabase.from('subareas').insert({ name: newSubarea.trim(), area_id: selectedAreaId })
    if (!error) { setNewSubarea(''); fetchData() }
  }

  const handleDeleteArea = async (id) => {
    if (!confirm('¿Eliminar esta área y todos sus roles?')) return
    await supabase.from('areas').delete().eq('id', id)
    if (selectedAreaId === id) setSelectedAreaId('')
    fetchData()
  }

  const handleDeleteSubarea = async (id) => {
    if (!confirm('¿Eliminar este rol?')) return
    await supabase.from('subareas').delete().eq('id', id)
    fetchData()
  }

  const handleEditArea = async (e) => {
    e.preventDefault()
    if (!editAreaName.trim()) return
    await supabase.from('areas').update({ name: editAreaName.trim() }).eq('id', editingAreaId)
    setEditingAreaId(null)
    fetchData()
  }

  const selectedArea = areas.find(a => a.id === selectedAreaId)
  const selectedSubareas = subareas.filter(s => s.area_id === selectedAreaId)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.75rem' }}>
      {/* Header */}
      <div className="view-header">
        <div>
          <h1>Estructura de Servicio</h1>
          <p>Configura las áreas principales y los roles específicos.</p>
        </div>
        {areas.length === 0 && (
          <button className="btn-primary" onClick={handleSeedAreas}>
            <Plus size={18} />
            <span>Cargar Áreas por Defecto</span>
          </button>
        )}
      </div>

      <div className="two-col-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>
        {/* Left: Areas */}
        <div className="glass-card" style={{ padding:'1.75rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'0.4rem' }}>
            <Layers size={18} color="var(--text-secondary)" />
            <h3 style={{ fontWeight:800, fontSize:'1.05rem' }}>Áreas Principales</h3>
          </div>
          <p style={{ color:'var(--text-secondary)', fontSize:'0.82rem', marginBottom:'1.25rem' }}>
            Categorías globales de servicio.
          </p>

          <form onSubmit={handleAddArea} style={{ display:'flex', gap:'0.5rem', marginBottom:'1.25rem' }}>
            <input type="text" placeholder="Nueva área..." value={newArea}
              onChange={e => setNewArea(e.target.value)} style={{ flex:1 }} />
            <button type="submit" className="btn-primary" style={{ padding:'0.7rem', minWidth:42 }}>
              <Plus size={18} />
            </button>
          </form>

          <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
            <AnimatePresence>
              {areas.map(area => (
                <motion.div key={area.id} layout
                  initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:10 }}
                  onClick={() => setSelectedAreaId(area.id)}
                  style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'0.75rem 1rem',
                    background: selectedAreaId === area.id ? 'hsla(217,91%,60%,0.1)' : 'var(--bg-elevated)',
                    border: `1px solid ${selectedAreaId === area.id ? 'hsla(217,91%,60%,0.3)' : 'var(--glass-border)'}`,
                    borderRadius:10, cursor:'pointer', transition:'all 0.2s'
                  }}
                >
                  {editingAreaId === area.id ? (
                    <form onSubmit={handleEditArea} onClick={e => e.stopPropagation()}
                      style={{ display:'flex', gap:'0.4rem', flex:1 }}>
                      <input type="text" value={editAreaName} onChange={e => setEditAreaName(e.target.value)}
                        style={{ flex:1, padding:'0.3rem 0.6rem', fontSize:'0.9rem' }} autoFocus />
                      <button type="submit" style={{ background:'var(--success)', color:'#fff',
                        border:'none', borderRadius:6, padding:'0.3rem 0.6rem', cursor:'pointer' }}>
                        <Check size={14} />
                      </button>
                      <button type="button" onClick={() => setEditingAreaId(null)}
                        style={{ background:'transparent', color:'var(--text-secondary)',
                          border:'none', cursor:'pointer', padding:'0.3rem' }}>
                        <X size={14} />
                      </button>
                    </form>
                  ) : (
                    <>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', fontWeight:600 }}>
                        <Map size={15} color={selectedAreaId === area.id ? 'var(--primary)' : 'var(--text-secondary)'} />
                        <span>{area.name}</span>
                        <span style={{ fontSize:'0.72rem', color:'var(--text-secondary)',
                          background:'var(--bg-mid)', padding:'1px 6px', borderRadius:20 }}>
                          {subareas.filter(s => s.area_id === area.id).length}
                        </span>
                      </div>
                      <div style={{ display:'flex', gap:'0.2rem' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setEditingAreaId(area.id); setEditAreaName(area.name) }}
                          style={{ background:'transparent', color:'var(--text-secondary)',
                            border:'none', cursor:'pointer', padding:'0.25rem', borderRadius:5 }}>
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDeleteArea(area.id)}
                          style={{ background:'transparent', color:'var(--text-secondary)',
                            border:'none', cursor:'pointer', padding:'0.25rem', borderRadius:5 }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {areas.length === 0 && (
              <p style={{ textAlign:'center', color:'var(--text-secondary)', padding:'1.5rem',
                fontSize:'0.85rem' }}>
                No hay áreas. Usa el botón "Cargar Áreas por Defecto" o agrega manualmente.
              </p>
            )}
          </div>
        </div>

        {/* Right: Subareas */}
        <div className="glass-card" style={{ padding:'1.75rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'0.4rem' }}>
            <ShieldCheck size={18} color="var(--text-secondary)" />
            <h3 style={{ fontWeight:800, fontSize:'1.05rem' }}>Roles / Subáreas</h3>
          </div>
          <p style={{ color:'var(--text-secondary)', fontSize:'0.82rem', marginBottom:'1.25rem' }}>
            Roles para: <strong style={{ color:'var(--primary)' }}>
              {selectedArea?.name || 'Selecciona un área'}
            </strong>
          </p>

          <form onSubmit={handleAddSubarea} style={{ display:'flex', gap:'0.5rem', marginBottom:'1.25rem' }}>
            <input type="text" placeholder="Nuevo rol (ej. Guitarra)..." value={newSubarea}
              onChange={e => setNewSubarea(e.target.value)} style={{ flex:1 }}
              disabled={!selectedAreaId} />
            <button type="submit" className="btn-primary" style={{ padding:'0.7rem', minWidth:42 }}
              disabled={!selectedAreaId}>
              <Plus size={18} />
            </button>
          </form>

          <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
            <AnimatePresence mode="popLayout">
              {selectedSubareas.map(sa => (
                <motion.div key={sa.id} layout
                  initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:10 }}
                  style={{
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                    padding:'0.7rem 1rem', background:'var(--bg-mid)',
                    border:'1px solid var(--glass-border)', borderRadius:10
                  }}
                >
                  <span style={{ fontWeight:600, fontSize:'0.92rem' }}>{sa.name}</span>
                  <button onClick={() => handleDeleteSubarea(sa.id)}
                    style={{ background:'transparent', color:'var(--text-secondary)',
                      border:'none', cursor:'pointer', opacity:0.5, padding:'0.25rem',
                      borderRadius:5, transition:'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.opacity='1'; e.currentTarget.style.color='var(--error)' }}
                    onMouseLeave={e => { e.currentTarget.style.opacity='0.5'; e.currentTarget.style.color='var(--text-secondary)' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {selectedAreaId && selectedSubareas.length === 0 && (
              <p style={{ textAlign:'center', color:'var(--text-secondary)', padding:'1.5rem', fontSize:'0.85rem' }}>
                Sin roles. Agrega el primero arriba.
              </p>
            )}
            {!selectedAreaId && (
              <p style={{ textAlign:'center', color:'var(--text-secondary)', padding:'1.5rem', fontSize:'0.85rem' }}>
                Selecciona un área a la izquierda.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: stack vertically */}
      <style>{`
        @media (max-width: 768px) {
          .two-col-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
