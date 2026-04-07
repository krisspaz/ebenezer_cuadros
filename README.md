# Sanctuary Connect – Church Management Platform

Sistema completo para gestionar áreas de servicio, equipo humano y calendarios de culto.

---

## Stack

| Capa       | Tecnología                          |
|------------|-------------------------------------|
| Frontend   | React 19 + Vite 8 + Framer Motion  |
| Backend    | Python FastAPI + Mangum             |
| Base datos | PostgreSQL via Supabase             |
| Auth       | Supabase Auth (email/password)      |
| Hosting    | Vercel (frontend + serverless API)  |
| PDF        | @react-pdf/renderer                 |

---

## Funcionalidades

- **Login** con email y contraseña (Supabase Auth)
- **Gestión de personas** — CRUD + asignación de habilidades por subárea
- **Gestión de áreas/subáreas** — Alabanza, Danza, Multimedia, Sonido, Niños y sus roles
- **Disponibilidad** — Bloquea fechas donde un miembro no puede servir
- **Programador inteligente** — Genera calendario mensual automático:
  - Cultos: Martes, Viernes, Domingo (1ro y 2do)
  - Sin conflictos por culto (una persona, un rol)
  - Respeta fechas bloqueadas
  - Distribución equitativa (prioriza a quien ha servido menos)
  - Edición manual antes de guardar
- **Calendario** — Vista mensual/lista de servicios confirmados
- **Exportar PDF** — Cronograma A4 profesional con colores por área

---

## Despliegue paso a paso

### 1. Configurar Supabase

1. Crear cuenta en supabase.com → New Project
2. Ir a **SQL Editor** y ejecutar `supabase/schema.sql`
3. (Opcional) Ejecutar `supabase/seed.sql` para datos de ejemplo
4. En **Authentication → Users** crear el usuario admin
5. Copiar desde **Settings → API**:
   - `URL` → `VITE_SUPABASE_URL`
   - `anon public` → `VITE_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_KEY` (solo backend)

### 2. Variables locales (.env)

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=
```

### 3. Desarrollo local

```bash
npm install && npm run dev

# Backend (opcional)
pip install -r requirements.txt
uvicorn api.index:app --reload --port 8000
```

### 4. Despliegue en Vercel

```bash
npm i -g vercel
vercel
```

En Vercel → Settings → Environment Variables agregar:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

---

## API endpoints

| Método | Ruta                 | Descripción                        |
|--------|----------------------|------------------------------------|
| GET    | `/`                  | Health check                       |
| POST   | `/generate-schedule` | Genera propuesta de calendario     |
| POST   | `/save-schedule`     | Guarda en base de datos            |
| DELETE | `/schedule/{id}`     | Elimina servicio y asignaciones    |

Documentación interactiva: `/docs` (Swagger UI)

---

## Algoritmo de generación

1. Para cada slot (fecha + culto), itera sobre las subáreas seleccionadas
2. Filtra personas: deben tener la habilidad Y no tener excepción de disponibilidad
3. Elige al candidato con **menos asignaciones acumuladas** (tie-break aleatorio)
4. Una persona solo aparece una vez por culto
5. Sin candidatos → conflicto marcado (slot vacío)

El algoritmo corre también en el **cliente** (JavaScript) como fallback si el backend no está disponible.

---

## Estructura

```
plataforma-iglesia/
├── api/index.py              # FastAPI backend (Vercel serverless)
├── src/
│   ├── lib/supabase.js       # Cliente Supabase compartido
│   ├── components/
│   │   ├── PeopleManager.jsx
│   │   ├── AreaManager.jsx
│   │   ├── AvailabilityManager.jsx
│   │   ├── SchedulerUI.jsx
│   │   ├── CalendarView.jsx
│   │   └── PDFExporter.jsx
│   ├── App.jsx
│   └── index.css
├── supabase/
│   ├── schema.sql             # Tablas + RLS + índices
│   └── seed.sql               # Áreas, roles y personas de ejemplo
├── requirements.txt
├── vercel.json
└── vite.config.js
```
