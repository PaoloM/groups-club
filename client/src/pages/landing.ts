import { listGroups } from '../api/groups.js';
import { getUser } from '../auth/state.js';
import { renderGroupCard } from '../components/groupCard.js';
import { router } from '../router.js';

export async function renderLanding(): Promise<string> {
  const user = getUser();
  let featuredHtml = '';

  try {
    const { groups } = await listGroups();
    const featured = groups.slice(0, 6);
    featuredHtml = featured.length
      ? `<div class="row">${featured.map(renderGroupCard).join('')}</div>`
      : '';
  } catch {
    featuredHtml = '';
  }

  return `
    <div class="text-center py-5">
      <h1 class="display-4 fw-bold">Find your people.</h1>
      <p class="lead text-muted mb-4">Join groups, start conversations, build community.</p>
      <div class="d-flex justify-content-center gap-3">
        ${user
          ? `<a href="/dashboard" class="btn btn-primary btn-lg" data-navigo>Go to Dashboard</a>`
          : `<a href="/register" class="btn btn-primary btn-lg" data-navigo>Get started</a>
             <a href="/discover" class="btn btn-outline-secondary btn-lg" data-navigo>Browse groups</a>`
        }
      </div>
    </div>
    ${featuredHtml
      ? `<hr class="my-5">
         <h2 class="mb-4">Featured Groups</h2>
         ${featuredHtml}`
      : ''
    }
  `;
}
