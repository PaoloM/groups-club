import { api } from '../api/client.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { formatDate } from '../utils/dates.js';
import { router } from '../router.js';

export async function renderPublicProfile(userId: string): Promise<string> {
  try {
    const { user } = await api.get<{ user: any }>(`/api/users/${userId}`);

    const groupsList = user.memberships?.length
      ? user.memberships.map((m: any) => `
        <a href="/groups/${escapeHtml(m.group.slug)}" class="list-group-item list-group-item-action" data-navigo>
          ${escapeHtml(m.group.name)}
        </a>
      `).join('')
      : '<p class="text-muted">Not a member of any public groups.</p>';

    return `
      <div class="row justify-content-center">
        <div class="col-md-6">
          <div class="text-center mb-4">
            ${user.avatarUrl
              ? `<img src="${escapeHtml(user.avatarUrl)}" class="rounded-circle mb-3" width="96" height="96" alt="">`
              : '<div class="bg-secondary rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width:96px;height:96px"><span class="text-white fs-1">' + escapeHtml(user.name.charAt(0).toUpperCase()) + '</span></div>'
            }
            <h2>${escapeHtml(user.name)}</h2>
            <p class="text-muted">Member since ${formatDate(user.createdAt)}</p>
          </div>
          <h5>Groups</h5>
          <div class="list-group">${groupsList}</div>
        </div>
      </div>
    `;
  } catch {
    return '<p class="text-danger">User not found.</p>';
  }
}

export function initPublicProfile(userId: string) {
  router.updatePageLinks();
}
