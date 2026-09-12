# FieldCam 📷

App de documentación fotográfica de proyectos para contratistas — clon de CompanyCam.

## Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Storage + Auth + Realtime)
- **IA**: Claude API (Anthropic) — reportes, análisis de fotos, checklists
- **Pagos**: Stripe
- **PWA**: Instalable en móvil, funciona offline

## Instalación rápida

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
```
Edita `.env` con tus credenciales:
- **Supabase**: [supabase.com](https://supabase.com) → Nuevo proyecto → Settings → API
- **Anthropic**: [console.anthropic.com](https://console.anthropic.com) → API Keys
- **Stripe**: [dashboard.stripe.com](https://dashboard.stripe.com) → Developers → API Keys

### 3. Configurar base de datos
En Supabase → SQL Editor, ejecuta todo el contenido de `supabase-schema.sql`.

### 4. Correr en desarrollo
```bash
npm run dev
```
Abre [http://localhost:5173](http://localhost:5173)

### 5. Deploy en Vercel
```bash
# Opción 1: CLI
npx vercel

# Opción 2: Conecta tu repo en vercel.com
# Agrega las variables de entorno en el dashboard de Vercel
```

## Módulos incluidos

| Módulo | Descripción |
|--------|-------------|
| **Proyectos** | CRUD completo, estados, búsqueda, filtros |
| **Fotos** | Cámara real, subida múltiple, análisis IA, lightbox |
| **Checklists** | Interactivas, generación con IA, asignación de equipo |
| **Equipo** | Miembros, roles, invitaciones, estado en tiempo real |
| **Reportes** | Generación automática con Claude AI, PDF, galería cliente |
| **Pagos** | Facturas, estados, recordatorios, integración Stripe |

## Agregar app móvil (iOS/Android)

```bash
npm install @capacitor/core @capacitor/cli @capacitor/camera @capacitor/geolocation
npx cap init FieldCam com.tuempresa.fieldcam
npm run build
npx cap add ios
npx cap add android
npx cap sync
npx cap open ios     # Abre en Xcode
npx cap open android # Abre en Android Studio
```

## Estructura del proyecto

```
src/
├── components/
│   └── layout/        # AppLayout con sidebar
├── lib/
│   ├── supabase.ts    # Cliente y tipos de Supabase
│   ├── ai.ts          # Integración Claude API
│   └── utils.ts       # Utilidades y helpers
├── pages/
│   ├── AuthPage.tsx   # Login / Registro
│   ├── ProjectsPage.tsx
│   ├── PhotosPage.tsx
│   ├── ChecklistsPage.tsx
│   ├── TeamPage.tsx
│   ├── ReportsPage.tsx
│   └── PaymentsPage.tsx
├── store/
│   └── index.ts       # Zustand store global
├── App.tsx            # Router principal
└── main.tsx           # Entry point
```

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL de tu proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave pública de Supabase |
| `ANTHROPIC_API_KEY` | Clave de API de Anthropic (sin prefijo `VITE_`: se usa solo en `api/claude.js`, en el servidor) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Clave pública de Stripe |

## Modo demo

Si no configuras las credenciales, la app funciona en **modo demo** con datos de ejemplo y sin persistencia. Útil para mostrar a clientes antes de la configuración completa.

## Licencia

MIT — Úsalo como quieras.
