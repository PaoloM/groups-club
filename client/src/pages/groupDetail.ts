import { getGroup } from '../api/groups.js';
import { joinGroup, leaveGroup } from '../api/memberships.js';
import { listThreads } from '../api/threads.js';
import { renderMarkdown } from '../components/markdown.js';
import { getUser } from '../auth/state.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { formatDate } from '../utils/dates.js';
import { router } from '../router.js';

export async function renderGroupDetail(slug: string): Promise<string> {
  try {
    const { group } = await getGroup(slug);
    const user = getUser();
    const membership = group.currentUserMembership;

    let threadsHtml = '';
    try {
      const { threads } = await listThreads(slug);
      const recent = threads.slice(0, 5);
      threadsHtml = recent.length
        ? recent.map((t: any) => `
          <a href="/groups/${escapeHtml(slug)}/threads/${t.id}" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" data-navigo>
            <div>
              ${t.isPinned ? '<span class="badge bg-warning text-dark me-2">Pinned</span>' : ''}
              <strong>${escapeHtml(t.title)}</strong>
              <br><small class="text-muted">by ${escapeHtml(t.author.name)} &middot; ${formatDate(t.createdAt)}</small>
            </div>
            <span class="badge bg-secondary">${t.postCount} comment${t.postCount !== 1 ? 's' : ''}</span>
          </a>
        `).join('')
        : '<p class="text-muted text-center py-3">No threads yet. Start the conversation!</p>';
    } catch {
      threadsHtml = '';
    }

    const actionButtons = user
      ? membership
        ? `<div class="d-flex gap-2 flex-wrap">
             <a href="/groups/${escapeHtml(slug)}/threads/new" class="btn btn-primary" data-navigo>New Thread</a>
             <a href="/groups/${escapeHtml(slug)}/members" class="btn btn-outline-secondary" data-navigo>Members</a>
             ${membership.role === 'admin' || membership.role === 'owner'
               ? `<a href="/groups/${escapeHtml(slug)}/settings" class="btn btn-outline-secondary" data-navigo>Settings</a>`
               : ''
             }
             <button class="btn btn-outline-danger" id="leave-btn">Leave</button>
           </div>`
        : `<button class="btn btn-primary" id="join-btn">Join Group</button>`
      : `<a href="/login" class="btn btn-primary" data-navigo>Log in to join</a>`;

    return `
      <div class="row">
        <div class="col-lg-8">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h2>${escapeHtml(group.name)}</h2>
              <p class="text-muted">
                ${group.memberCount} member${group.memberCount !== 1 ? 's' : ''}
                ${!group.isPublic ? ' &middot; <span class="badge bg-secondary">Private</span>' : ''}
              </p>
            </div>
            ${actionButtons}
          </div>
          <div class="card mb-4">
            <div class="card-body">${renderMarkdown(group.description)}</div>
          </div>
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h4>Recent Threads</h4>
            <a href="/groups/${escapeHtml(slug)}/threads" class="btn btn-sm btn-outline-secondary" data-navigo>View all</a>
          </div>
          <div class="list-group">${threadsHtml}</div>
        </div>
      </div>
    `;
  } catch (err: any) {
    if (err.status === 403) {
      return `<div class="text-center py-5"><h3>This group is private</h3><p class="text-muted">You need to be a member to view this group.</p></div>`;
    }
    return `<p class="text-danger">Failed to load group.</p>`;
  }
}

export function initGroupDetail(slug: string) {
  const joinBtn = document.getElementById('join-btn');
  if (joinBtn) {
    joinBtn.addEventListener('click', async () => {
      try {
        await joinGroup(slug);
        router.navigate(`/groups/${slug}`);
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  const leaveBtn = document.getElementById('leave-btn');
  if (leaveBtn) {
    leaveBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to leave this group?')) return;
      try {
        await leaveGroup(slug);
        router.navigate('/dashboard');
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  router.updatePageLinks();
}
