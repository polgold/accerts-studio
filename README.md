# Accerts Productions

Plataforma de gestión de producciones y boards visuales (estilo StudioBinder + Milanote). Next.js 14 (App Router), TypeScript, TailwindCSS, Supabase.

**Repositorio:** [github.com/polgold/accerts-studio](https://github.com/polgold/accerts-studio)

## Requisitos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com)

## Configuración Supabase

1. Crea un proyecto en Supabase.
2. En **SQL Editor** ejecuta las migraciones en orden:
   - `supabase/migrations/00001_initial_schema.sql`
   - `supabase/migrations/00002_rls_policies.sql`
   - `supabase/migrations/00003_storage_and_triggers.sql`
3. Crea el bucket de almacenamiento:
   - **Storage** → **New bucket** → nombre: `documents`, **Private**.
   - Opcional: en **Policies** del bucket añade políticas para que los usuarios autenticados puedan subir/leer según RLS (o usa las políticas por defecto si las creas vía SQL en `storage.objects`).
4. **Authentication** → **Providers**: habilita Email y opcionalmente Magic Link.
5. Copia `.env.example` a `.env.local` y rellena:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (solo servidor; nunca en cliente)
   - `NEXT_PUBLIC_APP_URL` (ej. `http://localhost:3000` o tu dominio en producción)

## Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Tras iniciar sesión o registrarte serás redirigido a onboarding para crear un workspace.

## Seed (datos de ejemplo)

Tras tener Supabase configurado y al menos un usuario creado (puedes registrarte desde la app):

```bash
npm run db:seed
```

El script espera que exista un usuario en `auth.users`; usa el primer usuario o configura el email en el script. Crea un workspace, un proyecto, documentos, un board, tareas y eventos de ejemplo.

## Despliegue en Vercel

1. Conecta el repo a Vercel.
2. Añade las variables de entorno (las mismas que en `.env.local`).
3. **SUPABASE_SERVICE_ROLE_KEY** debe estar definida para que el enlace público `/s/[token]` funcione.
4. Deploy.

## Estructura

- `src/app` – Rutas App Router (login, onboarding, `/w/[workspaceSlug]/...`, `/s/[token]`).
- `src/components` – UI (auth, workspace, project, documents, boards, tasks, schedule, public).
- `src/lib` – Cliente Supabase (browser, server, admin), auth, tipos, validaciones Zod, utilidades.
- `src/app/actions` – Server actions (workspace, project, documents, boards, tasks, public-links).
- `supabase/migrations` – Schema SQL, RLS y triggers.

## Rutas principales

| Ruta | Descripción |
|------|-------------|
| `/login` | Inicio de sesión (email/password o magic link) |
| `/onboarding` | Crear workspace tras primer login |
| `/w/[slug]/dashboard` | Dashboard del workspace |
| `/w/[slug]/projects` | Lista de proyectos |
| `/w/[slug]/p/[projectSlug]/overview` | Resumen del proyecto |
| `/w/[slug]/p/[projectSlug]/documents` | Documentos y carpetas |
| `/w/[slug]/p/[projectSlug]/boards` | Boards (canvas) |
| `/w/[slug]/p/[projectSlug]/schedule` | Calendario |
| `/w/[slug]/p/[projectSlug]/tasks` | Tareas (kanban) |
| `/w/[slug]/p/[projectSlug]/approvals` | Aprobaciones |
| `/w/[slug]/settings/members` | Miembros e invitaciones |
| `/s/[token]` | Enlace público (documento o board; opcional contraseña) |

## Seguridad

- RLS está habilitado en todas las tablas; las políticas aíslan por workspace y proyecto.
- La clave `SUPABASE_SERVICE_ROLE_KEY` solo se usa en servidor (ruta `/s/[token]`) y no debe exponerse al cliente.
- Validación con Zod en server actions; sanitización de rich text en comentarios/documentos.
