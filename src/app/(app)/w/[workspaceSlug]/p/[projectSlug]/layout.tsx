import { requireProjectAccess } from '@/lib/auth';
import { ProjectHeader } from '@/components/project/project-header';

const tabs = [
  { href: 'overview', label: 'Overview' },
  { href: 'documents', label: 'Documentos' },
  { href: 'boards', label: 'Boards' },
  { href: 'schedule', label: 'Calendario' },
  { href: 'tasks', label: 'Tareas' },
  { href: 'approvals', label: 'Aprobaciones' },
  { href: 'activity', label: 'Actividad' },
];

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { workspaceSlug: string; projectSlug: string };
}) {
  const { workspace, project } = await requireProjectAccess(params.workspaceSlug, params.projectSlug);
  return (
    <div className="flex flex-col min-h-full">
      <ProjectHeader
        workspaceSlug={workspace.slug}
        projectSlug={project.slug}
        projectTitle={project.title}
        projectStatus={project.status}
        tabs={tabs}
      />
      {children}
    </div>
  );
}
