import { renderNavbar } from './navbar.js';

export function renderLayout(): string {
  return `
    ${renderNavbar()}
    <main id="page" class="container py-4"></main>
    <footer class="bg-light py-3 mt-auto">
      <div class="container text-center text-muted">
        <small>&copy; ${new Date().getFullYear()} groups.club</small>
      </div>
    </footer>
  `;
}
