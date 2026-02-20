import { getUser } from '../auth/state.js';

export function renderNavbar(): string {
  const user = getUser();

  const authLinks = user
    ? `
      <li class="nav-item"><a class="nav-link" href="/dashboard" data-navigo>Dashboard</a></li>
      <li class="nav-item dropdown">
        <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
          ${user.avatarUrl ? `<img src="${user.avatarUrl}" alt="" class="rounded-circle me-1" width="24" height="24">` : ''}
          ${escapeHtml(user.name)}
        </a>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><a class="dropdown-item" href="/profile" data-navigo>Profile</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item" href="#" id="logout-link">Log out</a></li>
        </ul>
      </li>
    `
    : `
      <li class="nav-item"><a class="nav-link" href="/login" data-navigo>Log in</a></li>
      <li class="nav-item"><a class="nav-link btn btn-primary btn-sm text-white ms-2" href="/register" data-navigo>Sign up</a></li>
    `;

  return `
    <nav class="navbar navbar-expand-lg bg-white border-bottom sticky-top">
      <div class="container">
        <a class="navbar-brand fw-bold" href="/" data-navigo>groups.club</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="mainNav">
          <ul class="navbar-nav me-auto">
            <li class="nav-item"><a class="nav-link" href="/discover" data-navigo>Discover</a></li>
          </ul>
          <ul class="navbar-nav">
            ${authLinks}
          </ul>
        </div>
      </div>
    </nav>
  `;
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function updateNavbar() {
  const nav = document.querySelector('nav.navbar');
  if (nav) {
    const temp = document.createElement('div');
    temp.innerHTML = renderNavbar();
    nav.replaceWith(temp.firstElementChild!);
  }
}
