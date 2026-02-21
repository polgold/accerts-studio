/**
 * Seed script: run with `npm run db:seed`
 * Requires .env with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * Creates a test user (or uses existing), workspace, project, documents, board, tasks, events.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function seed() {
  const testEmail = process.env.SEED_USER_EMAIL || 'test@accerts.local';
  const testPassword = process.env.SEED_USER_PASSWORD || 'testpassword123';

  let userId: string;
  const { data: existing } = await supabase.auth.admin.listUsers();
  const user = existing?.users?.find((u) => u.email === testEmail);
  if (user) {
    userId = user.id;
    console.log('Using existing user:', testEmail);
  } else {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });
    if (error) {
      console.error('Create user error:', error.message);
      process.exit(1);
    }
    userId = created.user.id;
    console.log('Created user:', testEmail);
  }

  await supabase.from('profiles').upsert({ id: userId, display_name: 'Test User' }, { onConflict: 'id' });

  const { data: ws, error: wsErr } = await supabase
    .from('workspaces')
    .insert({ slug: 'acme', name: 'Acme Productions', created_by: userId })
    .select('id')
    .single();
  let workspaceId: string;
  if (wsErr) {
    const existingWs = await supabase.from('workspaces').select('id').eq('slug', 'acme').single();
    if (existingWs.data) {
      console.log('Using existing workspace acme');
      workspaceId = existingWs.data.id;
      const { data: proj } = await supabase.from('projects').select('id').eq('workspace_id', workspaceId).eq('slug', 'demo').single();
      if (proj) {
        console.log('Seed data already present. Done.');
        return;
      }
    } else throw wsErr;
  } else {
    workspaceId = ws!.id;
  }
  await supabase.from('workspace_members').insert({
    workspace_id: workspaceId,
    user_id: userId,
    role: 'owner',
    status: 'active',
  });

  const { data: project, error: projErr } = await supabase
    .from('projects')
    .insert({
      workspace_id: workspaceId,
      slug: 'demo',
      title: 'Proyecto demo',
      client_name: 'Cliente Demo',
      status: 'pre_production',
      start_date: '2025-03-01',
      end_date: '2025-06-30',
      logline: 'Un logline de ejemplo para la producción.',
      description: 'Descripción del proyecto demo.',
      created_by: userId,
    })
    .select('id')
    .single();
  if (projErr) throw projErr;
  const projectId = project!.id;

  await supabase.from('project_members').insert({
    project_id: projectId,
    user_id: userId,
    role: 'producer',
  });

  const { data: folder } = await supabase
    .from('folders')
    .insert({ project_id: projectId, name: 'Preproducción', position: 0 })
    .select('id')
    .single();

  const { data: doc } = await supabase
    .from('documents')
    .insert({
      project_id: projectId,
      folder_id: folder?.id ?? null,
      title: 'Tratamiento',
      doc_type: 'text',
      visibility: 'team',
      created_by: userId,
      pinned: true,
    })
    .select('id')
    .single();
  if (doc) {
    const { data: ver } = await supabase
      .from('document_versions')
      .insert({
        document_id: doc.id,
        version_number: 1,
        content_json: { content: '<p>Contenido de ejemplo del tratamiento.</p>' },
        created_by: userId,
      })
      .select('id')
      .single();
    if (ver) await supabase.from('documents').update({ current_version_id: ver.id }).eq('id', doc.id);
  }

  const { data: board } = await supabase
    .from('boards')
    .insert({
      project_id: projectId,
      title: 'Moodboard principal',
      mode: 'freeform',
      visibility: 'team',
      created_by: userId,
    })
    .select('id')
    .single();
  if (board) {
    await supabase.from('board_cards').insert([
      { board_id: board.id, card_type: 'text', title: 'Nota 1', data_json: { content: 'Ideas' }, position: 0, created_by: userId },
      { board_id: board.id, card_type: 'text', title: 'Nota 2', data_json: { content: 'Referencias' }, position: 1, created_by: userId },
    ]);
  }

  await supabase.from('tasks').insert([
    { project_id: projectId, title: 'Tarea 1', status: 'todo', created_by: userId },
    { project_id: projectId, title: 'Tarea 2', status: 'doing', created_by: userId },
  ]);

  await supabase.from('calendar_events').insert({
    project_id: projectId,
    title: 'Día de rodaje',
    start_at: '2025-04-15T09:00:00Z',
    end_at: '2025-04-15T18:00:00Z',
    visibility: 'team',
    created_by: userId,
  });

  await supabase.from('activity_log').insert({
    workspace_id: workspaceId,
    project_id: projectId,
    user_id: userId,
    action: 'project_created',
    entity_type: 'project',
    entity_id: projectId,
    metadata: { title: 'Proyecto demo' },
  });

  console.log('Seed completed. Workspace: acme, Project: demo');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
