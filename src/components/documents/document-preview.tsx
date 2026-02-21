'use client';

type Version = { id: string; version_number: number; storage_path: string | null; external_url: string | null; poster_path: string | null; content_json: Record<string, unknown> | null; created_at: string };

export function DocumentPreview({
  docType,
  version,
  workspaceSlug,
}: {
  docType: string;
  version: Version;
  workspaceSlug: string;
}) {
  if (docType === 'video_link' && version.external_url) {
    const url = version.external_url;
    let embedUrl = '';
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const id = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/)?.[1];
      embedUrl = id ? `https://www.youtube.com/embed/${id}` : '';
    } else if (url.includes('vimeo.com')) {
      const id = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
      embedUrl = id ? `https://player.vimeo.com/video/${id}` : '';
    }
    if (embedUrl) {
      return (
        <div className="aspect-video w-full">
          <iframe
            src={embedUrl}
            title="Video"
            className="w-full h-full"
            allowFullScreen
          />
        </div>
      );
    }
    return (
      <div className="p-4">
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{url}</a>
      </div>
    );
  }
  if (docType === 'text' && version.content_json) {
    const content = (version.content_json as { content?: string })?.content ?? '';
    return (
      <div className="p-6 prose prose-neutral max-w-none">
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    );
  }
  if ((docType === 'pdf' || docType === 'image') && version.storage_path) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const bucket = 'documents';
    const path = version.storage_path;
    const src = supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}` : '';
    if (docType === 'image') {
      return <img src={src} alt="" className="max-w-full h-auto" />;
    }
    return (
      <div className="min-h-[400px] flex items-center justify-center p-6">
        <iframe src={src} title="PDF" className="w-full h-[80vh] rounded" />
      </div>
    );
  }
  return (
    <div className="p-6 text-neutral-500 text-sm">
      Sin vista previa para este tipo de documento.
    </div>
  );
}
