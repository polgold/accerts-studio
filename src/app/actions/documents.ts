'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { documentSchema, type DocumentSchema } from '@/lib/validations';

export async function createDocument(projectId: string, data: DocumentSchema): Promise<{ documentId?: string; error?: string }> {
  const parsed = documentSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().formErrors[0] };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };
  const { data: doc, error } = await supabase
    .from('documents')
    .insert({
      project_id: projectId,
      title: parsed.data.title,
      doc_type: parsed.data.doc_type,
      visibility: parsed.data.visibility,
      folder_id: parsed.data.folder_id || null,
      pinned: parsed.data.pinned,
      created_by: user.id,
    })
    .select('id')
    .single();
  if (error) return { error: error.message };
  const versionNumber = 1;
  await supabase.from('document_versions').insert({
    document_id: doc.id,
    version_number: versionNumber,
    content_json: parsed.data.doc_type === 'text' ? { content: '' } : null,
    created_by: user.id,
  });
  const { data: ver } = await supabase
    .from('document_versions')
    .select('id')
    .eq('document_id', doc.id)
    .eq('version_number', versionNumber)
    .single();
  if (ver) await supabase.from('documents').update({ current_version_id: ver.id }).eq('id', doc.id);
  revalidatePath('/');
  return { documentId: doc.id };
}

export async function createDocumentVersion(
  documentId: string,
  payload: { storage_path?: string; external_url?: string; poster_path?: string; content_json?: Record<string, unknown> }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };
  const { data: doc } = await supabase.from('documents').select('id, project_id').eq('id', documentId).single();
  if (!doc) return { error: 'Documento no encontrado' };
  const { data: max } = await supabase
    .from('document_versions')
    .select('version_number')
    .eq('document_id', documentId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single();
  const versionNumber = (max?.version_number ?? 0) + 1;
  const { data: version, error } = await supabase
    .from('document_versions')
    .insert({
      document_id: documentId,
      version_number: versionNumber,
      storage_path: payload.storage_path ?? null,
      external_url: payload.external_url ?? null,
      poster_path: payload.poster_path ?? null,
      content_json: payload.content_json ?? null,
      created_by: user.id,
    })
    .select('id')
    .single();
  if (error) return { error: error.message };
  await supabase.from('documents').update({ current_version_id: version.id }).eq('id', documentId);
  revalidatePath('/');
  return {};
}

export async function addComment(
  entityType: 'document' | 'version' | 'board' | 'card' | 'task',
  entityId: string,
  content: string,
  parentId?: string | null
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };
  const { error } = await supabase.from('comments').insert({
    entity_type: entityType,
    entity_id: entityId,
    parent_id: parentId ?? null,
    user_id: user.id,
    content: content.slice(0, 10000),
    status: 'open',
  });
  if (error) return { error: error.message };
  return {};
}

export async function resolveComment(commentId: string, resolved: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('comments')
    .update({ status: resolved ? 'resolved' : 'open' })
    .eq('id', commentId);
  return error ? { error: error.message } : {};
}

export async function requestApproval(documentVersionId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };
  const { error } = await supabase.from('approvals').insert({
    document_version_id: documentVersionId,
    status: 'pending',
    requested_by: user.id,
  });
  return error ? { error: error.message } : {};
}

export async function setApprovalStatus(
  approvalId: string,
  status: 'pending' | 'changes_requested' | 'approved',
  note?: string | null
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };
  const { error } = await supabase
    .from('approvals')
    .update({
      status,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
      note: note ?? null,
    })
    .eq('id', approvalId);
  return error ? { error: error.message } : {};
}
