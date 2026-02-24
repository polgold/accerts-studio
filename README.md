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
   - … (resto en orden numérico, incl. `00008_o365_storage_and_connectors.sql`)
3. Crea el bucket de almacenamiento:
   - **Storage** → **New bucket** → nombre: `documents`, **Private**.
   - Opcional: en **Policies** del bucket añade políticas para que los usuarios autenticados puedan subir/leer según RLS (o usa las políticas por defecto si las creas vía SQL en `storage.objects`).
4. **Authentication** → **Providers**: habilita Email y opcionalmente Magic Link.
5. Copia `.env.example` a `.env.local` y rellena:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto Supabase (ej. `https://xxxx.supabase.co`). Debe ser el dominio de Supabase, **no** el de Vercel.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (solo servidor; nunca en cliente)
   - `NEXT_PUBLIC_SITE_URL`: solo para redirects de auth (magic link, callback). En producción usar `https://accerts-studio.vercel.app`.
   - `NEXT_PUBLIC_APP_URL` (ej. `http://localhost:3000` o tu dominio en producción)

## Microsoft 365 (OneDrive / SharePoint) – archivos y conectores

Para conectar cuentas Microsoft y subir/listar/descargar archivos en OneDrive o SharePoint vía Microsoft Graph:

1. **Registro de aplicación en Azure**
   - Entra en [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID** (Azure AD) → **Registros de aplicaciones** → **Nueva inscripción**.
   - Nombre: p. ej. "Accerts Studio". Tipo de cuenta: **Solo las cuentas de esta organización** (solo trabajo/escuela) o **Cualquier directorio** si quieres multi-tenant.
   - En **Autenticación** → **Plataformas** → **Web**: añade una **URL de redirección**:
     - Local: `http://localhost:3000/api/connectors/microsoft/callback`
     - Producción: `https://TU_DOMINIO/api/connectors/microsoft/callback`
   - En **Certificados y secretos** crea un **Secreto de cliente** y cópialo (solo se muestra una vez).
   - En **Permisos de API** → **Agregar permiso** → **Microsoft Graph** → **Permisos delegados**: añade `User.Read`, `offline_access`, `Files.ReadWrite`, `Sites.Read.All`, `Files.Read.All`. Para subir a SharePoint también: `Files.ReadWrite.All`, `Sites.ReadWrite.All` (si lo usas).

2. **Variables de entorno**
   - `MICROSOFT_CLIENT_ID`: ID de aplicación (Azure).
   - `MICROSOFT_CLIENT_SECRET`: secreto de cliente (solo servidor; nunca en cliente).
   - `MICROSOFT_TENANT_ID`: `common` (multi-tenant) o el ID del tenant para solo organización.
   - `MICROSOFT_REDIRECT_URI`: debe coincidir con la URL de redirección configurada (ej. `http://localhost:3000/api/connectors/microsoft/callback`).
   - `CONNECTORS_ENCRYPTION_KEY`: clave para cifrar tokens en DB (mín. 16 caracteres o 64 hex).
   - Opcional: `O365_STORAGE_MODE` = `onedrive` (por defecto) o `sharepoint`.
   - Para modo SharePoint: `SHAREPOINT_SITE_ID`, `SHAREPOINT_DRIVE_ID`, y opcionalmente `SHAREPOINT_BASE_FOLDER`.
   - Para OneDrive: `ONEDRIVE_BASE_FOLDER` (por defecto `/Apps/AccertsStudio`), `O365_APP_NAME` (nombre de la app en la ruta).

3. **Cuentas soportadas**
   - **Recomendado:** cuentas laborales o educativas (Entra ID). Si el registro está limitado a “solo esta organización”, las cuentas personales (MSA) no funcionarán; la app mostrará: *"Las cuentas personales de Microsoft (MSA) no están soportadas. Usa una cuenta laboral o educativa."*

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
| `/w/[slug]/settings/connectors` | Conectores Microsoft y archivos O365 |
| `/s/[token]` | Enlace público (documento o board; opcional contraseña) |

## Seguridad

- RLS está habilitado en todas las tablas; las políticas aíslan por workspace y proyecto.
- La clave `SUPABASE_SERVICE_ROLE_KEY` solo se usa en servidor (ruta `/s/[token]`) y no debe exponerse al cliente.
- Los secretos de Microsoft (`MICROSOFT_CLIENT_SECRET`, `CONNECTORS_ENCRYPTION_KEY`) solo se usan en servidor; nunca en cliente.
- Validación con Zod en server actions; sanitización de rich text en comentarios/documentos.
