'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { PublicLinkEntityType, PublicLinkPermission } from '@/lib/types';

export async function createPublicLink(
  entityType: PublicLinkEntityType,
  entityId: string,
  permission: PublicLinkPermission,
  options: { expiresAt?: Date | null; password?: string | null }
): Promise<{ error?: string; token?: string; url?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };
  const token = crypto.randomUUID().replace(/-/g, '');
  let passwordHash: string | null = null;
  if (options.password?.trim()) {
    const bcrypt = await import('bcryptjs');
    passwordHash = await bcrypt.hash(options.password.trim(), 10);
  }
  const { data: link, error } = await supabase
    .from('public_links')
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      token,
      permission,
      expires_at: options.expiresAt?.toISOString() ?? null,
      password_hash: passwordHash,
      created_by: user.id,
    })
    .select('id')
    .single();
  if (error) return { error: error.message };
  const base = process.env.NEXT_PUBLIC_APP_URL || '';
  return { token, url: `${base}/s/${token}` };
}
