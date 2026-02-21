import { createGroup } from '../api/groups.js';
import { router } from '../router.js';
import { cropImage } from '../utils/imageCropper.js';

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
            <label for="slug" class="form-label">URL slug</label>
            <input type="text" class="form-control" id="slug" required maxlength="100"
                   pattern="[a-z0-9][a-z0-9-]*[a-z0-9]" placeholder="e.g. nwsm">
            <div class="form-text">Letters, numbers, and hyphens. Auto-generated from name, but you can customize it.</div>
          </div>
          <div class="mb-3">
            <label for="description" class="form-label">Description</label>
            <textarea class="form-control" id="description" rows="6" required placeholder="Supports Markdown"></textarea>
          </div>
          <div class="mb-3">
            <label class="form-label">Cover image</label>
            <ul class="nav nav-tabs mb-2" role="tablist">
              <li class="nav-item"><a class="nav-link active" data-bs-toggle="tab" href="#cover-upload-tab">Upload</a></li>
              <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#cover-url-tab">URL</a></li>
            </ul>
            <div class="tab-content">
              <div class="tab-pane fade show active" id="cover-upload-tab">
                <label class="btn btn-outline-secondary btn-sm">
                  Choose file
                  <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" class="d-none" id="cover-file">
                </label>
                <span class="text-muted small ms-2" id="cover-file-name"></span>
                <div id="cover-preview" class="mt-2"></div>
              </div>
              <div class="tab-pane fade" id="cover-url-tab">
                <input type="url" class="form-control" id="imageUrl" placeholder="https://example.com/cover.jpg">
              </div>
            </div>
          </div>
          <div class="mb-3 form-check">
            <input type="checkbox" class="form-check-input" id="isPublic" checked>
            <label class="form-check-label" for="isPublic">Public group (anyone can join)</label>
          </div>
          <button type="submit" class="btn btn-primary" id="create-btn">Create Group</button>
        </form>
      </div>
    </div>
  `;
}

function toSlug(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function initCreateGroup() {
  const form = document.getElementById('create-group-form') as HTMLFormElement;
  const errorEl = document.getElementById('create-error')!;
  const fileInput = document.getElementById('cover-file') as HTMLInputElement;
  const fileNameEl = document.getElementById('cover-file-name')!;
  const previewEl = document.getElementById('cover-preview')!;
  const nameInput = document.getElementById('name') as HTMLInputElement;
  const slugInput = document.getElementById('slug') as HTMLInputElement;
  let coverFile: File | null = null;
  let slugManuallyEdited = false;

  slugInput.addEventListener('input', () => { slugManuallyEdited = true; });
  nameInput.addEventListener('input', () => {
    if (!slugManuallyEdited) {
      slugInput.value = toSlug(nameInput.value);
    }
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File is too large (max 5 MB).');
      fileInput.value = '';
      return;
    }
    const cropped = await cropImage(file, 2.8);
    if (!cropped) {
      fileInput.value = '';
      return;
    }
    coverFile = new File([cropped], file.name, { type: cropped.type });
    fileNameEl.textContent = file.name;
    const url = URL.createObjectURL(coverFile);
    previewEl.innerHTML = `<img src="${url}" class="rounded border" style="max-height:140px;max-width:100%;object-fit:cover">`;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('d-none');

    const btn = document.getElementById('create-btn') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Creating...';

    const name = (document.getElementById('name') as HTMLInputElement).value;
    const slug = (document.getElementById('slug') as HTMLInputElement).value;
    const description = (document.getElementById('description') as HTMLTextAreaElement).value;
    const imageUrl = (document.getElementById('imageUrl') as HTMLInputElement).value;
    const isPublic = (document.getElementById('isPublic') as HTMLInputElement).checked;

    try {
      const { group } = await createGroup({ name, slug, description, imageUrl: imageUrl || undefined, isPublic });

      // Upload cover if selected
      if (coverFile) {
        const fd = new FormData();
        fd.append('file', coverFile);
        const res = await fetch(`/api/upload/cover/${group.slug}`, { method: 'POST', body: fd, credentials: 'same-origin' });
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Cover upload failed.'); }
      }

      router.navigate(`/groups/${group.slug}`);
    } catch (err: any) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('d-none');
      btn.disabled = false;
      btn.textContent = 'Create Group';
    }
  });
}
