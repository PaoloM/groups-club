import { register } from '../api/auth.js';
import { setUser } from '../auth/state.js';
import { router } from '../router.js';
import { updateNavbar } from '../components/navbar.js';

export function renderRegister(): string {
  return `
    <div class="row justify-content-center">
      <div class="col-md-5">
        <h2 class="mb-4">Create an account</h2>
        <div id="register-error" class="alert alert-danger d-none"></div>
        <form id="register-form">
          <div class="mb-3">
            <label for="name" class="form-label">Name</label>
            <input type="text" class="form-control" id="name" required>
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
          <div class="mb-3">
            <label for="confirmPassword" class="form-label">Confirm password</label>
            <input type="password" class="form-control" id="confirmPassword" required>
          </div>
          <button type="submit" class="btn btn-primary w-100">Sign up</button>
        </form>
        <hr>
        <a href="/api/auth/google" class="btn btn-outline-dark w-100 mb-3">
          Sign up with Google
        </a>
        <p class="text-center text-muted">
          Already have an account? <a href="/login" data-navigo>Log in</a>
        </p>
      </div>
    </div>
  `;
}

export function initRegister() {
  const form = document.getElementById('register-form') as HTMLFormElement;
  const errorEl = document.getElementById('register-error')!;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('d-none');

    const name = (document.getElementById('name') as HTMLInputElement).value;
    const email = (document.getElementById('email') as HTMLInputElement).value;
    const password = (document.getElementById('password') as HTMLInputElement).value;
    const confirmPassword = (document.getElementById('confirmPassword') as HTMLInputElement).value;

    if (password !== confirmPassword) {
      errorEl.textContent = 'Passwords do not match.';
      errorEl.classList.remove('d-none');
      return;
    }

    try {
      const { user } = await register(name, email, password);
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
