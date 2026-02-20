import { escapeHtml } from '../utils/escapeHtml.js';

export function renderAttachmentGallery(attachments: any[]): string {
  if (!attachments || attachments.length === 0) return '';

  const images = attachments.map((a) => `
    <a href="${escapeHtml(a.url)}" target="_blank" class="attachment-thumb">
      <img src="${escapeHtml(a.url)}" alt="${escapeHtml(a.filename)}"
        class="rounded border" style="max-height:200px;max-width:100%;object-fit:cover;cursor:pointer">
    </a>
  `).join('');

  return `<div class="d-flex flex-wrap gap-2 mt-2 mb-2">${images}</div>`;
}
