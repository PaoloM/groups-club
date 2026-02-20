import { createGroup } from '../api/groups.js';
import { router } from '../router.js';

export function renderCreateGroup(): string {
  return `
    <div class="row justify-content-center">
      <div class="col-md-8">
        <h2 class="mb-4">Create a Group</h2>
        <div id="create-error" class="alert alert-danger d-none"></div>
        <form id="create-group-form">
          <div class="mb-3">
            <label for="name" class="form-label">Group name</label>
            <input type="text" class="form-control" id="name" required maxlength="100">
          </div>
          <div class="mb-3">
            <label for="description" class="form-label">Description</label>
            <textarea class="form-control" id="description" rows="6" required placeholder="Supports Markdown"></textarea>
          </div>
          <div class="mb-3">
            <label for="imageUrl" class="form-label">Cover image URL (optional)</label>
            <input type="url" class="form-control" id="imageUrl">
          </div>
          <div class="mb-3 form-check">
            <input type="checkbox" class="form-check-input" id="isPublic" checked>
            <label class="form-check-label" for="isPublic">Public group (anyone can join)</label>
          </div>
          <button type="submit" class="btn btn-primary">Create Group</button>
        </form>
      </div>
    </div>
  `;
}

export function initCreateGroup() {
  const form = document.getElementById('create-group-form') as HTMLFormElement;
  const errorEl = document.getElementById('create-error')!;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('d-none');

    const name = (document.getElementById('name') as HTMLInputElement).value;
    const description = (document.getElementById('description') as HTMLTextAreaElement).value;
    const imageUrl = (document.getElementById('imageUrl') as HTMLInputElement).value;
    const isPublic = (document.getElementById('isPublic') as HTMLInputElement).checked;

    try {
      const { group } = await createGroup({ name, description, imageUrl: imageUrl || undefined, isPublic });
      router.navigate(`/groups/${group.slug}`);
    } catch (err: any) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('d-none');
    }
  });
}
