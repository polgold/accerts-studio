import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function PublicDocsPage() {
  const supabase = await createClient();
  const { data: documents } = await supabase
    .from('documents')
    .select('id, title, doc_type, updated_at, projects(title, slug, workspaces(slug))')
    .eq('visibility', 'public')
    .order('updated_at', { ascending: false });

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">Documentos públicos</h1>
        <p className="text-neutral-500 mt-1 text-sm">
          Solo podés ver documentos con acceso público. Para ver proyectos y más, tenés que ser invitado a un workspace.
        </p>
        <ul className="mt-6 space-y-2">
          {(documents ?? []).map((doc: { id: string; title: string; doc_type: string; updated_at: string; projects?: unknown }) => (
              <li key={doc.id}>
                <Link
                  href={`/public-docs/${doc.id}`}
                  className="block p-3 rounded-lg border border-neutral-200 bg-white hover:border-neutral-300"
                >
                  <span className="font-medium text-neutral-900">{doc.title}</span>
                  <span className="text-xs text-neutral-500 ml-2">{doc.doc_type}</span>
                </Link>
              </li>
            ))}
        </ul>
        {(documents ?? []).length === 0 && (
          <p className="mt-6 text-neutral-500 text-sm">No hay documentos públicos todavía.</p>
        )}
        <p className="mt-8 text-sm text-neutral-500">
          <Link href="/" className="hover:underline">Volver al inicio</Link>
        </p>
      </div>
    </div>
  );
}
