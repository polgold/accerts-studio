import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import { PublicShareView } from '@/components/public/public-share-view';

export default async function PublicSharePage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { password?: string };
}) {
  const { token } = params;
  const { password } = searchParams;
  const supabase = createAdminClient();
  const { data: link } = await supabase
    .from('public_links')
    .select('id, entity_type, entity_id, permission, expires_at, password_hash')
    .eq('token', token)
    .single();
  if (!link) notFound();
  if (link.expires_at && new Date(link.expires_at) < new Date()) notFound();
  if (link.password_hash) {
    const bcrypt = await import('bcryptjs');
    const ok = password && (await bcrypt.compare(password, link.password_hash));
    if (!ok) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50">
          <form method="get" action={`/s/${token}`} className="bg-white rounded-xl shadow-card p-6 w-80">
            <label className="block text-sm font-medium text-neutral-700">Contraseña</label>
            <input type="password" name="password" className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2" required />
            <button type="submit" className="mt-4 w-full rounded-lg bg-neutral-900 text-white py-2 text-sm font-medium">Acceder</button>
          </form>
        </div>
      );
    }
  }
  if (link.entity_type === 'document') {
    const { data: doc } = await supabase
      .from('documents')
      .select('id, title, doc_type, current_version_id')
      .eq('id', link.entity_id)
      .single();
    if (!doc) notFound();
    const { data: version } = doc.current_version_id
      ? await supabase.from('document_versions').select('*').eq('id', doc.current_version_id).single()
      : await supabase.from('document_versions').select('*').eq('document_id', doc.id).order('version_number', { ascending: false }).limit(1).single();
    return (
      <div className="min-h-screen bg-neutral-50 p-6">
        <PublicShareView
          type="document"
          document={doc as { id: string; title: string; doc_type: string }}
          version={version as { id: string; storage_path: string | null; external_url: string | null; content_json: Record<string, unknown> | null } | null}
          permission={link.permission}
        />
      </div>
    );
  }
  if (link.entity_type === 'board') {
    const { data: board } = await supabase.from('boards').select('id, title, mode').eq('id', link.entity_id).single();
    if (!board) notFound();
    const { data: cards } = await supabase.from('board_cards').select('id, card_type, title, data_json, position').eq('board_id', board.id).order('position');
    return (
      <div className="min-h-screen bg-neutral-50 p-6">
        <PublicShareView
          type="board"
          board={board as { id: string; title: string; mode: string }}
          cards={(cards ?? []) as { id: string; card_type: string; title: string | null; data_json: Record<string, unknown>; position: number }[]}
          permission={link.permission}
        />
      </div>
    );
  }
  notFound();
}
