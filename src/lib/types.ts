export type WorkspaceMemberRole = 'owner' | 'admin' | 'producer' | 'collaborator' | 'client' | 'vendor' | 'viewer';
export type WorkspaceMemberStatus = 'active' | 'invited';
export type ProjectStatus = 'draft' | 'pre_production' | 'production' | 'post_production' | 'delivered' | 'archived';
export type DocType = 'pdf' | 'image' | 'video_link' | 'text' | 'screenplay' | 'call_sheet' | 'shot_list' | 'storyboard' | 'moodboard' | 'other';
export type DocVisibility = 'private' | 'team' | 'client';
export type CommentEntityType = 'document' | 'version' | 'board' | 'card' | 'task';
export type CommentStatus = 'open' | 'resolved';
export type ApprovalStatus = 'pending' | 'changes_requested' | 'approved';
export type BoardMode = 'freeform' | 'columns';
export type BoardVisibility = 'team' | 'client';
export type CardType = 'image' | 'pdf' | 'text' | 'link' | 'checklist' | 'column';
export type TaskStatus = 'todo' | 'doing' | 'blocked' | 'done';
export type EventVisibility = 'team' | 'client';
export type PublicLinkEntityType = 'document' | 'board';
export type PublicLinkPermission = 'view' | 'comment';

export interface Workspace {
  id: string;
  slug: string;
  name: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceMemberRole;
  status: WorkspaceMemberStatus;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  workspace_id: string;
  slug: string;
  title: string;
  client_name: string | null;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  logline: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  project_id: string;
  folder_id: string | null;
  title: string;
  doc_type: DocType;
  visibility: DocVisibility;
  created_by: string | null;
  pinned: boolean;
  current_version_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  storage_path: string | null;
  external_url: string | null;
  poster_path: string | null;
  content_json: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}

export interface Board {
  id: string;
  project_id: string;
  title: string;
  mode: BoardMode;
  visibility: BoardVisibility;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoardCard {
  id: string;
  board_id: string;
  card_type: CardType;
  title: string | null;
  data_json: Record<string, unknown>;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}
