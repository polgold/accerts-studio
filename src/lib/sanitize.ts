import DOMPurify from 'dompurify';

const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'blockquote'];

function stripTagsServer(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function sanitizeHtml(html: string): string {
  if (typeof window !== 'undefined') {
    return DOMPurify.sanitize(html, { ALLOWED_TAGS });
  }
  return stripTagsServer(html);
}

export function sanitizeRichText(content: string): string {
  return sanitizeHtml(content);
}
