import { redirect } from 'next/navigation';

export default function SettingsPage({ params }: { params: { workspaceSlug: string } }) {
  redirect(`/w/${params.workspaceSlug}/settings/members`);
}
