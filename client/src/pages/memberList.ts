import { listMembers, changeMemberRole, removeMember } from '../api/memberships.js';
import { getGroup } from '../api/groups.js';
import { getUser } from '../auth/state.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { formatDate } from '../utils/dates.js';
import { router } from '../router.js';

export async function renderMemberList(slug: string): Promise<string> {
  try {
    const [{ group }, { members }] = await Promise.all([
      getGroup(slug),
      listMembers(slug),
    ]);

    const user = getUser();
    const myMembership = group.currentUserMembership;
    const isAdminOrOwner = myMembership && (myMembership.role === 'admin' || myMembership.role === 'owner');
    const isOwner = myMembership && myMembership.role === 'owner';

    const roleColors: Record<string, string> = { owner: 'primary', admin: 'success', member: 'secondary' };

    const rows = members.map((m: any) => {
      const isMe = user && m.userId === user.id;
      let actions = '';

      if (isAdminOrOwner && !isMe && m.role !== 'owner') {
        const roleOptions = isOwner
          ? `<option value="admin" ${m.role === 'admin' ? 'selected' : ''}>Admin</option>
             <option value="member" ${m.role === 'member' ? 'selected' : ''}>Member</option>`
          : '';

        actions = `
          ${isOwner ? `
            <select class="form-select form-select-sm d-inline-block w-auto me-2" data-role-change="${m.id}">
              ${roleOptions}
            </select>
          ` : ''}
          <button class="btn btn-sm btn-outline-danger" data-remove-member="${m.id}">Remove</button>
        `;
      }

      return `
        <tr>
          <td>
            <a href="/profile/${m.user.id}" data-navigo class="text-decoration-none">
              ${escapeHtml(m.user.name)}
            </a>
            ${isMe ? '<span class="badge bg-info ms-1">You</span>' : ''}
          </td>
          <td><span class="badge bg-${roleColors[m.role] || 'secondary'}">${m.role}</span></td>
          <td class="text-muted">${formatDate(m.joinedAt)}</td>
          <td>${actions}</td>
        </tr>
      `;
    }).join('');

    return `
      <a href="/groups/${escapeHtml(slug)}" data-navigo class="text-decoration-none">&larr; ${escapeHtml(group.name)}</a>
      <h2 class="mt-3 mb-4">Members (${members.length})</h2>
      <table class="table">
        <thead><tr><th>Name</th><th>Role</th><th>Joined</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  } catch {
    return '<p class="text-danger">Failed to load members.</p>';
  }
}

export function initMemberList(slug: string) {
  // Role change
  document.querySelectorAll('[data-role-change]').forEach((select) => {
    select.addEventListener('change', async () => {
      const membershipId = (select as HTMLElement).dataset.roleChange!;
      const role = (select as HTMLSelectElement).value;
      try {
        await changeMemberRole(slug, membershipId, role);
        router.navigate(`/groups/${slug}/members`);
      } catch (err: any) {
        alert(err.message);
      }
    });
  });

  // Remove member
  document.querySelectorAll('[data-remove-member]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remove this member?')) return;
      const membershipId = (btn as HTMLElement).dataset.removeMember!;
      try {
        await removeMember(slug, membershipId);
        router.navigate(`/groups/${slug}/members`);
      } catch (err: any) {
        alert(err.message);
      }
    });
  });

  router.updatePageLinks();
}
