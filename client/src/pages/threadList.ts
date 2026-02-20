import { listThreads } from '../api/threads.js';
import { getGroup } from '../api/groups.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { formatDate } from '../utils/dates.js';
import { renderEmptyState } from '../components/emptyState.js';
import { router } from '../router.js';

export async function renderThreadList(slug: string): Promise<string> {
  try {
    const { group } = await getGroup(slug);
    const { threads } = await listThreads(slug);

    const threadItems = threads.length
      ? threads.map((t: any) => `
        <a href="/groups/${escapeHtml(slug)}/threads/${t.id}" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" data-navigo>
          <div>
            ${t.isPinned ? '<span class="badge bg-warning text-dark me-2">Pinned</span>' : ''}
            <strong>${escapeHtml(t.title)}</strong>
            <br><small class="text-muted">by ${escapeHtml(t.author.name)} &middot; ${formatDate(t.createdAt)}</small>
          </div>
          <span class="badge bg-secondary">${t.postCount} comment${t.postCount !== 1 ? 's' : ''}</span>
        </a>
      `).join('')
      : renderEmptyState('No threads yet.', `<a href="/groups/${escapeHtml(slug)}/threads/new" class="btn btn-primary" data-navigo>Start a thread</a>`);

    return `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <a href="/groups/${escapeHtml(slug)}" data-navigo class="text-decoration-none">&larr; ${escapeHtml(group.name)}</a>
          <h2 class="mt-2">Threads</h2>
        </div>
        ${group.currentUserMembership
          ? `<a href="/groups/${escapeHtml(slug)}/threads/new" class="btn btn-primary" data-navigo>New Thread</a>`
          : ''
        }
      </div>
      <div class="list-group">${threadItems}</div>
    `;
  } catch {
    return '<p class="text-danger">Failed to load threads.</p>';
  }
}

export function initThreadList(slug: string) {
  router.updatePageLinks();
}
