import { listGroups } from '../api/groups.js';
import { renderGroupCard } from '../components/groupCard.js';
import { renderEmptyState } from '../components/emptyState.js';
import { router } from '../router.js';

export function renderDiscover(): string {
  return `
    <h2 class="mb-4">Discover Groups</h2>
    <div class="row mb-4">
      <div class="col-md-6">
        <input type="search" class="form-control" id="search-input" placeholder="Search groups...">
      </div>
    </div>
    <div id="groups-grid" class="row">
      <div class="text-center py-4"><div class="spinner-border" role="status"></div></div>
    </div>
  `;
}

export function initDiscover() {
  loadGroups();

  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  let timeout: ReturnType<typeof setTimeout>;
  searchInput.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => loadGroups(searchInput.value), 300);
  });
}

async function loadGroups(search?: string) {
  const grid = document.getElementById('groups-grid');
  if (!grid) return;

  try {
    const { groups } = await listGroups(search);
    if (groups.length === 0) {
      grid.innerHTML = renderEmptyState(
        search ? 'No groups found matching your search.' : 'No groups yet.',
        '<a href="/groups/new" class="btn btn-primary" data-navigo>Create a group</a>'
      );
    } else {
      grid.innerHTML = groups.map(renderGroupCard).join('');
    }
    router.updatePageLinks();
  } catch {
    grid.innerHTML = '<p class="text-danger">Failed to load groups.</p>';
  }
}
