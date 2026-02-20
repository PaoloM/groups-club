import { escapeHtml } from '../utils/escapeHtml.js';

export function renderGroupCard(group: any): string {
  return `
    <div class="col-md-6 col-lg-4 mb-4">
      <div class="card h-100 shadow-sm">
        ${group.imageUrl ? `<img src="${escapeHtml(group.imageUrl)}" class="card-img-top" alt="" style="height:140px;object-fit:cover">` : ''}
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${escapeHtml(group.name)}</h5>
          <p class="card-text text-muted small flex-grow-1">${escapeHtml(truncate(group.description, 120))}</p>
          <div class="d-flex justify-content-between align-items-center">
            <span class="badge bg-secondary">${group.memberCount ?? 0} member${group.memberCount !== 1 ? 's' : ''}</span>
            <a href="/groups/${escapeHtml(group.slug)}" class="btn btn-outline-primary btn-sm" data-navigo>View</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

function truncate(str: string, len: number): string {
  // Strip markdown for preview
  const plain = str.replace(/[#*_`~\[\]()>]/g, '').replace(/\n+/g, ' ');
  return plain.length > len ? plain.slice(0, len) + '...' : plain;
}
