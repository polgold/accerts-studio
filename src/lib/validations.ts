import { z } from 'zod';

export const workspaceMemberRoles = ['owner', 'admin', 'producer', 'collaborator', 'client', 'vendor', 'viewer'] as const;
export const projectStatuses = ['draft', 'pre_production', 'production', 'post_production', 'delivered', 'archived'] as const;
export const docTypes = ['pdf', 'image', 'video_link', 'text', 'screenplay', 'call_sheet', 'shot_list', 'storyboard', 'moodboard', 'other'] as const;
export const docVisibilities = ['private', 'team', 'client', 'public'] as const;
export const taskStatuses = ['todo', 'doing', 'blocked', 'done'] as const;
export const boardModes = ['freeform', 'columns'] as const;
export const cardTypes = ['image', 'pdf', 'text', 'link', 'checklist', 'column'] as const;

export const slugSchema = z.string().min(1).max(64).regex(/^[a-z0-9_-]+$/);
export const emailSchema = z.string().email();

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(6).optional(),
  magic_link: z.literal(true).optional(),
});
export type LoginSchema = z.infer<typeof loginSchema>;

export const signUpSchema = z.object({
  email: emailSchema,
  password: z.string().min(8),
  full_name: z.string().min(1).max(200).optional(),
});

export const inviteSchema = z.object({
  email: emailSchema,
  role: z.enum(workspaceMemberRoles),
  project_id: z.string().uuid().nullable(),
});
export type InviteSchema = z.infer<typeof inviteSchema>;

export const workspaceSchema = z.object({
  name: z.string().min(1).max(200),
  slug: slugSchema,
});
export type WorkspaceSchema = z.infer<typeof workspaceSchema>;

export const projectSchema = z.object({
  title: z.string().min(1).max(500),
  slug: slugSchema,
  client_name: z.string().max(200).nullable(),
  status: z.enum(projectStatuses),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  logline: z.string().nullable(),
  description: z.string().nullable(),
});
export type ProjectSchema = z.infer<typeof projectSchema>;

export const folderSchema = z.object({
  name: z.string().min(1).max(200),
  parent_id: z.string().uuid().nullable(),
  position: z.number().int().min(0),
});

export const documentSchema = z.object({
  title: z.string().min(1).max(500),
  doc_type: z.enum(docTypes),
  visibility: z.enum(docVisibilities),
  folder_id: z.preprocess((v) => (v === '' ? null : v), z.string().uuid().nullable()),
  pinned: z.boolean(),
});
export type DocumentSchema = z.infer<typeof documentSchema>;

export const documentVersionSchema = z.object({
  version_number: z.number().int().min(1),
  storage_path: z.string().nullable(),
  external_url: z.string().url().nullable(),
  poster_path: z.string().nullable(),
  content_json: z.record(z.unknown()).nullable(),
});

export const commentSchema = z.object({
  content: z.string().min(1).max(10000),
  entity_type: z.enum(['document', 'version', 'board', 'card', 'task']),
  entity_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable(),
  status: z.enum(['open', 'resolved']).optional(),
});

export const approvalSchema = z.object({
  status: z.enum(['pending', 'changes_requested', 'approved']),
  note: z.string().max(2000).nullable(),
});

export const boardSchema = z.object({
  title: z.string().min(1).max(200),
  mode: z.enum(boardModes),
  visibility: z.enum(['team', 'client']),
});

export const boardCardSchema = z.object({
  card_type: z.enum(cardTypes),
  title: z.string().max(500).nullable(),
  data_json: z.record(z.unknown()),
  position: z.number().int().min(0),
});

export const taskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().nullable(),
  status: z.enum(taskStatuses),
  due_date: z.string().nullable(),
  document_id: z.string().uuid().nullable(),
  board_card_id: z.string().uuid().nullable(),
});

export const calendarEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().nullable(),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  visibility: z.enum(['team', 'client']),
});

export const publicLinkSchema = z.object({
  entity_type: z.enum(['document', 'board']),
  entity_id: z.string().uuid(),
  permission: z.enum(['view', 'comment']),
  expires_at: z.string().datetime().nullable(),
  password: z.string().nullable(),
});

export const richTextContentSchema = z.object({
  type: z.literal('richtext'),
  content: z.string(),
});
