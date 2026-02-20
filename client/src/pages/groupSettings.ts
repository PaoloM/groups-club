import { getGroup, updateGroup, deleteGroup } from '../api/groups.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { router } from '../router.js';

export async function renderGroupSettings(slug: string): Promise<string> {
  try {
    const { group } = await getGroup(slug);
    const membership = group.currentUserMembership;

    if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) {
      return '<p class="text-danger">You do not have permission to view group settings.</p>';
    }

    return `
      <a href="/groups/${escapeHtml(slug)}" data-navigo class="text-decoration-none">&larr; ${escapeHtml(group.name)}</a>
      <h2 class="mt-3 mb-4">Group Settings</h2>
      <div id="settings-error" class="alert alert-danger d-none"></div>
      <form id="settings-form">
        <div class="mb-3">
          <label for="name" class="form-label">Group name</label>
          <input type="text" class="form-control" id="name" value="${escapeHtml(group.name)}" required maxlength="100">
        </div>
        <div class="mb-3">
          <label for="description" class="form-label">Description</label>
          <textarea class="form-control" id="description" rows="6" required>${escapeHtml(group.description)}</textarea>
        </div>
        <div class="mb-3">
          <label for="imageUrl" class="form-label">Cover image URL</label>
          <input type="url" class="form-control" id="imageUrl" value="${escapeHtml(group.imageUrl || '')}">
        </div>
        <div class="mb-3 form-check">
          <input type="checkbox" class="form-check-input" id="isPublic" ${group.isPublic ? 'checked' : ''}>
          <label class="form-check-label" for="isPublic">Public group</label>
        </div>
        <button type="submit" class="btn btn-primary">Save Changes</button>
      </form>
      ${membership.role === 'owner' ? `
        <hr class="my-4">
        <h4 class="text-danger">Danger Zone</h4>
        <p>Deleting a group is permanent and removes all threads and memberships.</p>
        <button class="btn btn-danger" id="delete-group-btn">Delete Group</button>
      ` : ''}
    `;
  } catch {
    return '<p class="text-danger">Failed to load group settings.</p>';
  }
}

export function initGroupSettings(slug: string) {
  const form = document.getElementById('settings-form') as HTMLFormElement | null;
  const errorEl = document.getElementById('settings-error');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl?.classList.add('d-none');

      const name = (document.getElementById('name') as HTMLInputElement).value;
      const description = (document.getElementById('description') as HTMLTextAreaElement).value;
      const imageUrl = (document.getElementById('imageUrl') as HTMLInputElement).value;
      const isPublic = (document.getElementById('isPublic') as HTMLInputElement).checked;

      try {
        const { group } = await updateGroup(slug, { name, description, imageUrl: imageUrl || null, isPublic });
        router.navigate(`/groups/${group.slug}`);
      } catch (err: any) {
        if (errorEl) {
          errorEl.textContent = err.message;
          errorEl.classList.remove('d-none');
        }
      }
    });
  }

  const deleteBtn = document.getElementById('delete-group-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to delete this group? This cannot be undone.')) return;
      try {
        await deleteGroup(slug);
        router.navigate('/dashboard');
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  router.updatePageLinks();
}
