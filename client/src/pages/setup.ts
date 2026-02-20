import { completeSetup } from '../api/setup.js';

export function renderSetup(): string {
  return `
    <div class="row justify-content-center">
      <div class="col-md-6 col-lg-5">
        <div class="text-center mb-4">
          <h2>Welcome to mygroups.club</h2>
          <p class="text-muted">Create the site owner account to get started.</p>
        </div>
        <div id="setup-error" class="alert alert-danger d-none"></div>
        <form id="setup-form">
          <div class="mb-3">
            <label for="name" class="form-label">Name</label>
            <input type="text" class="form-control" id="name" required maxlength="100">
          </div>
          <div class="mb-3">
            <label for="email" class="form-label">Email</label>
            <input type="email" class="form-control" id="email" required>
          </div>
          <div class="mb-3">
            <label for="password" class="form-label">Password</label>
            <input type="password" class="form-control" id="password" required minlength="8">
            <div class="form-text">At least 8 characters.</div>
          </div>
          <button type="submit" class="btn btn-primary w-100" id="setup-btn">Create Account</button>
        </form>
      </div>
    </div>
  `;
}

export function initSetup() {
  const form = document.getElementById('setup-form') as HTMLFormElement | null;
  const errorEl = document.getElementById('setup-error');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl?.classList.add('d-none');

    const btn = document.getElementById('setup-btn') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Creating...';

    const name = (document.getElementById('name') as HTMLInputElement).value;
    const email = (document.getElementById('email') as HTMLInputElement).value;
    const password = (document.getElementById('password') as HTMLInputElement).value;

    try {
      await completeSetup(name, email, password);
      window.location.href = '/dashboard';
    } catch (err: any) {
      if (errorEl) {
        errorEl.textContent = err.message;
        errorEl.classList.remove('d-none');
      }
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  });
}
