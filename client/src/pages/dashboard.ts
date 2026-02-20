import { getMyGroups } from '../api/groups.js';
import { renderGroupCard } from '../components/groupCard.js';
import { renderEmptyState } from '../components/emptyState.js';
import { router } from '../router.js';

export function renderDashboard(): string {
  return `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h2>My Groups</h2>
      <a href="/groups/new" class="btn btn-primary" data-navigo>Create Group</a>
    </div>
    <div id="my-groups" class="row">
      <div class="text-center py-4"><div class="spinner-border" role="status"></div></div>
    </div>
  `;
}

export async function initDashboard() {
  const container = document.getElementById('my-groups');
  if (!container) return;

  try {
    const { groups } = await getMyGroups();
    if (groups.length === 0) {
      container.innerHTML = renderEmptyState(
        "You haven't joined any groups yet.",
        '<a href="/discover" class="btn btn-primary" data-navigo>Discover groups</a>'
      );
    } else {
      container.innerHTML = groups.map(renderGroupCard).join('');
    }
    router.updatePageLinks();
  } catch {
    container.innerHTML = '<p class="text-danger">Failed to load groups.</p>';
  }
}
