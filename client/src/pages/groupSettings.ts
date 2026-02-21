import { getGroup, updateGroup, deleteGroup } from '../api/groups.js';
import { getUser } from '../auth/state.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { router } from '../router.js';
import { cropImage } from '../utils/imageCropper.js';

export async function renderGroupSettings(slug: string): Promise<string> {
  try {
    const { group } = await getGroup(slug);
    const membership = group.currentUserMembership;
    const user = getUser();
    const isSiteOwner = user?.isSiteOwner;

    if (!isSiteOwner && (!membership || membership.role !== 'admin')) {
      return '<p class="text-danger">You do not have permission to view group settings.</p>';
    }

    return `
      <a href="/groups/${escapeHtml(slug)}" data-navigo class="text-decoration-none">&larr; ${escapeHtml(group.name)}</a>
      <h2 class="mt-3 mb-4">Group Settings</h2>
      <div id="settings-error" class="alert alert-danger d-none"></div>
      <div id="settings-success" class="alert alert-success d-none">Settings saved.</div>
      <form id="settings-form">
        <div class="mb-3">
          <label for="name" class="form-label">Group name</label>
          <input type="text" class="form-control" id="name" value="${escapeHtml(group.name)}" required maxlength="100">
        </div>
        <div class="mb-3">
          <label for="slug" class="form-label">URL slug</label>
          <input type="text" class="form-control" id="slug" value="${escapeHtml(group.slug)}" required maxlength="100"
                 pattern="[a-z0-9][a-z0-9-]*[a-z0-9]" placeholder="e.g. nwsm">
          <div class="form-text">Letters, numbers, and hyphens. Changing this will change the group's URL.</div>
        </div>
        <div class="mb-3">
          <label for="description" class="form-label">Description</label>
          <textarea class="form-control" id="description" rows="6" required>${escapeHtml(group.description)}</textarea>
        </div>
        <div class="mb-3">
          <label class="form-label">Cover image</label>
          ${group.imageUrl ? `<div class="mb-2"><img src="${escapeHtml(group.imageUrl)}" class="rounded border" style="max-height:140px;max-width:100%;object-fit:cover"></div>` : ''}
          <ul class="nav nav-tabs mb-2" role="tablist">
            <li class="nav-item"><a class="nav-link active" data-bs-toggle="tab" href="#cover-upload-tab">Upload</a></li>
            <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#cover-url-tab">URL</a></li>
          </ul>
          <div class="tab-content">
            <div class="tab-pane fade show active" id="cover-upload-tab">
              <label class="btn btn-outline-secondary btn-sm">
                Choose file
                <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" class="d-none" id="cover-file">
              </label>
              <span class="text-muted small ms-2" id="cover-file-name"></span>
              <div id="cover-preview" class="mt-2"></div>
            </div>
            <div class="tab-pane fade" id="cover-url-tab">
              <input type="url" class="form-control" id="imageUrl" value="${group.imageUrl?.startsWith('http') ? escapeHtml(group.imageUrl) : ''}">
            </div>
          </div>
        </div>
        <div class="mb-3 form-check">
          <input type="checkbox" class="form-check-input" id="isPublic" ${group.isPublic ? 'checked' : ''}>
          <label class="form-check-label" for="isPublic">Public group</label>
        </div>
        <button type="submit" class="btn btn-primary" id="save-btn">Save Changes</button>
      </form>
      ${isSiteOwner ? `
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

function toSlug(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function initGroupSettings(slug: string) {
  const form = document.getElementById('settings-form') as HTMLFormElement | null;
  const errorEl = document.getElementById('settings-error');
  const successEl = document.getElementById('settings-success');
  const fileInput = document.getElementById('cover-file') as HTMLInputElement | null;
  const fileNameEl = document.getElementById('cover-file-name');
  const previewEl = document.getElementById('cover-preview');
  const nameInput = document.getElementById('name') as HTMLInputElement | null;
  const slugInput = document.getElementById('slug') as HTMLInputElement | null;
  let coverFile: File | null = null;
  let slugManuallyEdited = true; // pre-filled, don't overwrite by default

  if (slugInput) {
    slugInput.addEventListener('input', () => { slugManuallyEdited = true; });
  }
  if (nameInput) {
    nameInput.addEventListener('input', () => {
      if (!slugManuallyEdited && slugInput) {
        slugInput.value = toSlug(nameInput.value);
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        alert('File is too large (max 5 MB).');
        fileInput.value = '';
        return;
      }
      const cropped = await cropImage(file, 2.8);
      if (!cropped) {
        fileInput.value = '';
        return;
      }
      coverFile = new File([cropped], file.name, { type: cropped.type });
      if (fileNameEl) fileNameEl.textContent = file.name;
      if (previewEl) {
        const url = URL.createObjectURL(coverFile);
        previewEl.innerHTML = `<img src="${url}" class="rounded border" style="max-height:140px;max-width:100%;object-fit:cover">`;
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl?.classList.add('d-none');
      successEl?.classList.add('d-none');

      const btn = document.getElementById('save-btn') as HTMLButtonElement;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span>Saving...';

      const name = (document.getElementById('name') as HTMLInputElement).value;
      const newSlug = (document.getElementById('slug') as HTMLInputElement).value;
      const description = (document.getElementById('description') as HTMLTextAreaElement).value;
      const imageUrl = (document.getElementById('imageUrl') as HTMLInputElement).value;
      const isPublic = (document.getElementById('isPublic') as HTMLInputElement).checked;

      try {
        // Upload cover if file selected
        if (coverFile) {
          const fd = new FormData();
          fd.append('file', coverFile);
          const res = await fetch(`/api/upload/cover/${slug}`, { method: 'POST', body: fd, credentials: 'same-origin' });
          if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Cover upload failed.'); }
        }

        const patchData: any = { name, slug: newSlug, description, isPublic };
        if (!coverFile) patchData.imageUrl = imageUrl || null;

        const { group } = await updateGroup(slug, patchData);
        successEl?.classList.remove('d-none');
        // If slug changed, navigate to new URL
        if (group.slug !== slug) {
          router.navigate(`/groups/${group.slug}/settings`);
        }
      } catch (err: any) {
        if (errorEl) {
          errorEl.textContent = err.message;
          errorEl.classList.remove('d-none');
        }
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Changes';
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
