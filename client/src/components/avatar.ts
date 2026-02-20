import { escapeHtml } from '../utils/escapeHtml.js';

export function renderAvatar(author: { name: string; avatarUrl: string | null }, size = 24): string {
  if (author.avatarUrl) {
    return `<img src="${escapeHtml(author.avatarUrl)}" alt="" class="rounded-circle" width="${size}" height="${size}" style="object-fit:cover">`;
  }
  const fontSize = Math.round(size * 0.45);
  return `<div class="bg-secondary rounded-circle d-inline-flex align-items-center justify-content-center" style="width:${size}px;height:${size}px"><span class="text-white" style="font-size:${fontSize}px;line-height:1">${escapeHtml(author.name.charAt(0).toUpperCase())}</span></div>`;
}
