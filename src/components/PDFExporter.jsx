import React from 'react'
import { Page, Text, View, Document, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Download } from 'lucide-react'

// ── Color palette ───────────────────────────────────────────────────
const C = {
  dark:   '#0f172a',
  mid:    '#1e293b',
  light:  '#e2e8f0',
  muted:  '#94a3b8',
  body:   '#334155',
  blue:   '#3b82f6',
  white:  '#ffffff',
  bg:     '#f8fafc',
}

const AREA_COLORS = {
  'Alabanza':  '#3b82f6',
  'Danza':     '#8b5cf6',
  'Multimedia':'#06b6d4',
  'Sonido':    '#f59e0b',
  'Niños':     '#10b981',
}

function areaColor(name) {
  return AREA_COLORS[name] || '#64748b'
}

// ── Styles ──────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: { padding: 36, backgroundColor: C.white, fontFamily: 'Helvetica' },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    marginBottom: 24, paddingBottom: 14,
    borderBottomWidth: 2, borderBottomColor: C.light, borderBottomStyle: 'solid',
  },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: C.dark, letterSpacing: -0.4 },
  subtitle: { fontSize: 8, color: C.muted, marginTop: 3, textTransform: 'uppercase', letterSpacing: 1.2 },
  meta: { fontSize: 8, color: C.muted, textAlign: 'right' },
  metaBold: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.body, textAlign: 'right' },

  // Date block
  dateBlock: {
    marginBottom: 18, breakInside: 'avoid',
  },
  dateHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.blue, borderRadius: 6,
    paddingVertical: 7, paddingHorizontal: 12,
    marginBottom: 10,
  },
  dateDayNum: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: C.white, marginRight: 10 },
  dateDayName: { fontSize: 10, color: 'rgba(255,255,255,0.85)', textTransform: 'capitalize', flex: 1 },
  dateService: {
    fontSize: 8, color: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 3,
    paddingHorizontal: 7, paddingVertical: 3, textTransform: 'uppercase', letterSpacing: 0.6,
  },

  // Area block
  areasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  areaBlock: { width: '48%', marginBottom: 8 },
  areaHeader: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 4, paddingVertical: 5, paddingHorizontal: 8,
    marginBottom: 5,
  },
  areaName: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.white },

  // Assignment rows
  assignRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 4, paddingHorizontal: 6,
    borderBottomWidth: 0.5, borderBottomColor: C.light, borderBottomStyle: 'solid',
  },
  roleText: { fontSize: 8.5, color: C.body, flex: 1 },
  personText: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.dark, textAlign: 'right' },
  conflictText: { fontSize: 8.5, color: '#ef4444', fontFamily: 'Helvetica-Bold' },

  // Footer
  footer: {
    position: 'absolute', bottom: 24, left: 36, right: 36,
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 0.5, borderTopColor: C.light, borderTopStyle: 'solid',
    paddingTop: 8, fontSize: 7.5, color: C.muted,
  },
})

// ── Document from SAVED assignments ────────────────────────────────
function SavedDocument({ assignments }) {
  const sorted = [...assignments].sort((a, b) =>
    new Date(a.schedules.date) - new Date(b.schedules.date)
  )

  const grouped = {}
  sorted.forEach(a => {
    const key = `${a.schedules.date}__${a.schedules.service_name}`
    if (!grouped[key]) grouped[key] = { date: a.schedules.date, service: a.schedules.service_name, areas: {} }
    const areaName = a.subareas?.areas?.name || 'General'
    if (!grouped[key].areas[areaName]) grouped[key].areas[areaName] = []
    grouped[key].areas[areaName].push(a)
  })

  const monthLabel = Object.values(grouped)[0]?.date
    ? format(parseISO(Object.values(grouped)[0].date + 'T12:00:00'), "MMMM yyyy", { locale: es })
    : ''

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <View>
            <Text style={S.title}>Cronograma de Servicio</Text>
            <Text style={S.subtitle}>Sanctuary — Sistema de Gestión</Text>
          </View>
          <View>
            <Text style={S.metaBold}>{monthLabel}</Text>
            <Text style={S.meta}>Generado: {format(new Date(), 'dd/MM/yyyy HH:mm')}</Text>
          </View>
        </View>

        {Object.values(grouped).map((group, idx) => (
          <View key={idx} style={S.dateBlock} wrap={false}>
            <View style={S.dateHeader}>
              <Text style={S.dateDayNum}>
                {format(parseISO(group.date + 'T12:00:00'), 'dd')}
              </Text>
              <Text style={S.dateDayName}>
                {format(parseISO(group.date + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: es })}
              </Text>
              <Text style={S.dateService}>{group.service}</Text>
            </View>
            <View style={S.areasRow}>
              {Object.entries(group.areas).map(([areaName, items]) => (
                <View key={areaName} style={S.areaBlock}>
                  <View style={[S.areaHeader, { backgroundColor: areaColor(areaName) }]}>
                    <Text style={S.areaName}>{areaName}</Text>
                  </View>
                  {items.map((item, ii) => (
                    <View key={ii} style={S.assignRow}>
                      <Text style={S.roleText}>{item.subareas?.name}</Text>
                      <Text style={S.personText}>{item.people?.name}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={S.footer} fixed>
          <Text>© {new Date().getFullYear()} Sanctuary Church Management</Text>
          <Text render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

// ── Document from GENERATED (unsaved) assignments ──────────────────
function GeneratedDocument({ generated, subareas }) {
  // Group by (date, service_name) -> areas -> assignments
  const grouped = {}
  generated.forEach(a => {
    const key = `${a.date}__${a.service_name}`
    if (!grouped[key]) grouped[key] = { date: a.date, service: a.service_name, areas: {} }
    const sa = subareas.find(s => s.id === a.subarea_id)
    const areaName = sa?.areas?.name || 'General'
    if (!grouped[key].areas[areaName]) grouped[key].areas[areaName] = []
    grouped[key].areas[areaName].push({ ...a, subarea_name: sa?.name })
  })

  const keys = Object.keys(grouped)
  const monthLabel = keys.length
    ? format(parseISO(grouped[keys[0]].date + 'T12:00:00'), "MMMM yyyy", { locale: es })
    : ''

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <View>
            <Text style={S.title}>Propuesta de Calendario</Text>
            <Text style={S.subtitle}>Sanctuary — Sistema de Gestión</Text>
          </View>
          <View>
            <Text style={S.metaBold}>{monthLabel}</Text>
            <Text style={S.meta}>Generado: {format(new Date(), 'dd/MM/yyyy HH:mm')}</Text>
          </View>
        </View>

        {Object.values(grouped).map((group, idx) => (
          <View key={idx} style={S.dateBlock} wrap={false}>
            <View style={S.dateHeader}>
              <Text style={S.dateDayNum}>
                {format(parseISO(group.date + 'T12:00:00'), 'dd')}
              </Text>
              <Text style={S.dateDayName}>
                {format(parseISO(group.date + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: es })}
              </Text>
              <Text style={S.dateService}>{group.service}</Text>
            </View>
            <View style={S.areasRow}>
              {Object.entries(group.areas).map(([areaName, items]) => (
                <View key={areaName} style={S.areaBlock}>
                  <View style={[S.areaHeader, { backgroundColor: areaColor(areaName) }]}>
                    <Text style={S.areaName}>{areaName}</Text>
                  </View>
                  {items.map((item, ii) => (
                    <View key={ii} style={S.assignRow}>
                      <Text style={S.roleText}>{item.subarea_name}</Text>
                      {item.has_conflict
                        ? <Text style={S.conflictText}>Sin asignar</Text>
                        : <Text style={S.personText}>{item.person_name}</Text>
                      }
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={S.footer} fixed>
          <Text>© {new Date().getFullYear()} Sanctuary Church Management</Text>
          <Text render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

// ── Exported components ─────────────────────────────────────────────
export default function PDFExporter({ assignments }) {
  if (!assignments || assignments.length === 0) return null
  return (
    <PDFDownloadLink
      document={<SavedDocument assignments={assignments} />}
      fileName={`Cronograma_${format(new Date(), 'yyyy-MM-dd')}.pdf`}
      className="btn-primary"
      style={{ textDecoration:'none', display:'inline-flex', alignItems:'center',
        padding:'0.6rem 1.2rem', gap:'0.5rem', fontSize:'0.88rem', borderRadius:10 }}
    >
      {({ loading }) => (
        <>
          <Download size={16} />
          <span>{loading ? 'Preparando...' : 'Exportar PDF'}</span>
        </>
      )}
    </PDFDownloadLink>
  )
}

export function GeneratedPDFExporter({ generated, subareas }) {
  if (!generated || generated.length === 0) return null
  return (
    <PDFDownloadLink
      document={<GeneratedDocument generated={generated} subareas={subareas} />}
      fileName={`Propuesta_${format(new Date(), 'yyyy-MM-dd')}.pdf`}
      style={{ textDecoration:'none', display:'inline-flex', alignItems:'center',
        gap:'0.5rem', padding:'0.6rem 1rem', borderRadius:10, fontSize:'0.85rem',
        fontWeight:700, cursor:'pointer', background:'rgba(255,255,255,0.07)',
        border:'1px solid var(--glass-border)', color:'var(--text-primary)' }}
    >
      {({ loading }) => (
        <>
          <Download size={15} />
          <span>{loading ? 'Preparando...' : 'PDF Borrador'}</span>
        </>
      )}
    </PDFDownloadLink>
  )
}
