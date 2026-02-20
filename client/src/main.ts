import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import { renderLayout } from './components/layout.js';
import { initAuth, onAuthChange } from './auth/state.js';
import { updateNavbar } from './components/navbar.js';
import { setupRoutes, router } from './router.js';
import { logout } from './api/auth.js';
import { setUser } from './auth/state.js';

async function main() {
  const app = document.getElementById('app')!;
  app.innerHTML = renderLayout();

  // Initialize auth state
  await initAuth();
  updateNavbar();

  // Update navbar when auth changes
  onAuthChange(() => {
    updateNavbar();
    router.updatePageLinks();
  });

  // Set up routes
  setupRoutes();

  // Logout handler (delegated)
  document.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    if (target.id === 'logout-link' || target.closest('#logout-link')) {
      e.preventDefault();
      try {
        await logout();
        setUser(null);
        updateNavbar();
        router.navigate('/');
      } catch (err: any) {
        console.error('Logout failed:', err);
      }
    }
  });
}

main();
