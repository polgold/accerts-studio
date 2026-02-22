import { redirect } from 'next/navigation';

export default async function WorkspaceRootPage({ params }: { params: { workspaceSlug: string } }) {
  const { workspaceSlug } = params;
  redirect(`/w/${workspaceSlug}/projects`);
}
