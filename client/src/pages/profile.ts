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
            <label for="avatarUrl" class="form-label">Avatar URL</label>
            <input type="url" class="form-control" id="avatarUrl" value="${escapeHtml(user.avatarUrl || '')}">
          </div>
          <div class="mb-3">
            <label class="form-label">Email</label>
            <input type="email" class="form-control" value="${escapeHtml(user.email)}" disabled>
          </div>
          <button type="submit" class="btn btn-primary">Save Changes</button>
        </form>
      </div>
    </div>
  `;
}

export function initProfile() {
  const form = document.getElementById('profile-form') as HTMLFormElement;
  const successEl = document.getElementById('profile-success')!;
  const errorEl = document.getElementById('profile-error')!;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    successEl.classList.add('d-none');
    errorEl.classList.add('d-none');

    const name = (document.getElementById('name') as HTMLInputElement).value;
    const avatarUrl = (document.getElementById('avatarUrl') as HTMLInputElement).value;

    try {
      const { user } = await api.patch<{ user: any }>('/api/users/me', { name, avatarUrl: avatarUrl || null });
      setUser(user);
      updateNavbar();
      successEl.classList.remove('d-none');
    } catch (err: any) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('d-none');
    }
  });
}
