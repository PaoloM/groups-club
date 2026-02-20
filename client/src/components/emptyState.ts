export function renderEmptyState(message: string, actionHtml?: string): string {
  return `
    <div class="text-center py-5 text-muted">
      <p class="lead">${message}</p>
      ${actionHtml || ''}
    </div>
  `;
}
