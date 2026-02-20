import { login } from '../api/auth.js';
import { setUser } from '../auth/state.js';
import { router } from '../router.js';
import { updateNavbar } from '../components/navbar.js';

export function renderLogin(): string {
  return `
    <div class="row justify-content-center">
      <div class="col-md-5">
        <h2 class="mb-4">Log in</h2>
        <div id="login-error" class="alert alert-danger d-none"></div>
        <form id="login-form">
          <div class="mb-3">
            <label for="email" class="form-label">Email</label>
            <input type="email" class="form-control" id="email" required>
          </div>
          <div class="mb-3">
            <label for="password" class="form-label">Password</label>
            <input type="password" class="form-control" id="password" required>
          </div>
          <button type="submit" class="btn btn-primary w-100">Log in</button>
        </form>
        <hr>
        <a href="/api/auth/google" class="btn btn-outline-dark w-100 mb-3">
          Sign in with Google
        </a>
        <p class="text-center text-muted">
          Don't have an account? <a href="/register" data-navigo>Sign up</a>
        </p>
      </div>
    </div>
  `;
}

export function initLogin() {
  const form = document.getElementById('login-form') as HTMLFormElement;
  const errorEl = document.getElementById('login-error')!;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('d-none');

    const email = (document.getElementById('email') as HTMLInputElement).value;
    const password = (document.getElementById('password') as HTMLInputElement).value;

    try {
      const { user } = await login(email, password);
      setUser(user);
      updateNavbar();
      router.navigate('/dashboard');
    } catch (err: any) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('d-none');
    }
  });

  router.updatePageLinks();
}
