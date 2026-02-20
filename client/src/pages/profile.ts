import { getUser, setUser } from '../auth/state.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { updateNavbar } from '../components/navbar.js';
import { api } from '../api/client.js';
import { router } from '../router.js';

export function renderProfile(): string {
  const user = getUser();
  if (!user) return '';

  return `
    <div class="row justify-content-center">
      <div class="col-md-6">
        <h2 class="mb-4">Your Profile</h2>
        <div id="profile-success" class="alert alert-success d-none">Profile updated.</div>
        <div id="profile-error" class="alert alert-danger d-none"></div>
        <form id="profile-form">
          <div class="mb-3">
            <label for="name" class="form-label">Name</label>
            <input type="text" class="form-control" id="name" value="${escapeHtml(user.name)}" required>
          </div>
          <div class="mb-3">
            <label class="form-label">Avatar</label>
            <ul class="nav nav-tabs mb-2" role="tablist">
              <li class="nav-item"><a class="nav-link active" data-bs-toggle="tab" href="#avatar-upload-tab">Upload</a></li>
              <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#avatar-url-tab">URL</a></li>
            </ul>
            <div class="tab-content">
              <div class="tab-pane fade show active" id="avatar-upload-tab">
                <div class="d-flex align-items-center gap-3">
                  ${user.avatarUrl
                    ? `<img src="${escapeHtml(user.avatarUrl)}" class="rounded-circle" width="64" height="64" alt="" id="avatar-preview">`
                    : `<div class="bg-secondary rounded-circle d-flex align-items-center justify-content-center" style="width:64px;height:64px" id="avatar-preview"><span class="text-white fs-4">${escapeHtml(user.name.charAt(0).toUpperCase())}</span></div>`
                  }
                  <label class="btn btn-outline-secondary btn-sm">
                    Choose file
                    <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" class="d-none" id="avatar-file">
                  </label>
                  <span class="text-muted small" id="avatar-file-name"></span>
                </div>
              </div>
              <div class="tab-pane fade" id="avatar-url-tab">
                <input type="url" class="form-control" id="avatarUrl" value="${escapeHtml(user.avatarUrl || '')}" placeholder="https://example.com/photo.jpg">
              </div>
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label">Email</label>
            <input type="email" class="form-control" value="${escapeHtml(user.email)}" disabled>
          </div>
          <button type="submit" class="btn btn-primary" id="profile-submit">Save Changes</button>
        </form>
      </div>
    </div>
  `;
}

export function initProfile() {
  const form = document.getElementById('profile-form') as HTMLFormElement;
  const successEl = document.getElementById('profile-success')!;
  const errorEl = document.getElementById('profile-error')!;
  const fileInput = document.getElementById('avatar-file') as HTMLInputElement;
  const fileNameEl = document.getElementById('avatar-file-name')!;
  let selectedFile: File | null = null;

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File is too large (max 5 MB).');
      return;
    }
    selectedFile = file;
    fileNameEl.textContent = file.name;

    // Update preview
    const preview = document.getElementById('avatar-preview');
    if (preview) {
      const url = URL.createObjectURL(file);
      if (preview.tagName === 'IMG') {
        (preview as HTMLImageElement).src = url;
      } else {
        const img = document.createElement('img');
        img.src = url;
        img.className = 'rounded-circle';
        img.width = 64;
        img.height = 64;
        img.id = 'avatar-preview';
        preview.replaceWith(img);
      }
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    successEl.classList.add('d-none');
    errorEl.classList.add('d-none');

    const btn = document.getElementById('profile-submit') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const name = (document.getElementById('name') as HTMLInputElement).value;
    const avatarUrl = (document.getElementById('avatarUrl') as HTMLInputElement).value;

    try {
      // Upload avatar file if selected
      if (selectedFile) {
        const fd = new FormData();
        fd.append('file', selectedFile);
        const res = await fetch('/api/upload/avatar', { method: 'POST', body: fd, credentials: 'same-origin' });
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Upload failed.'); }
      }

      // Update name (and URL if no file was uploaded and URL tab has a value)
      const patchData: any = { name };
      if (!selectedFile && avatarUrl !== undefined) {
        patchData.avatarUrl = avatarUrl || null;
      }
      const { user } = await api.patch<{ user: any }>('/api/users/me', patchData);
      setUser(user);
      updateNavbar();
      successEl.classList.remove('d-none');
    } catch (err: any) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('d-none');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Changes';
    }
  });
}
