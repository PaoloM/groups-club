import { createThread } from '../api/threads.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { renderAttachmentPicker, initAttachmentPicker } from '../components/attachmentPicker.js';
import { router } from '../router.js';

export function renderCreateThread(slug: string): string {
  return `
    <div class="row justify-content-center">
      <div class="col-md-8">
        <a href="/groups/${escapeHtml(slug)}/threads" data-navigo class="text-decoration-none">&larr; Back to threads</a>
        <h2 class="mt-3 mb-4">New Thread</h2>
        <div id="create-error" class="alert alert-danger d-none"></div>
        <form id="create-thread-form">
          <div class="mb-3">
            <label for="title" class="form-label">Title</label>
            <input type="text" class="form-control" id="title" required maxlength="200">
          </div>
          <div class="mb-3">
            <label for="body" class="form-label">Body</label>
            <textarea class="form-control" id="body" rows="8" required placeholder="Supports Markdown"></textarea>
          </div>
          <div class="mb-3">
            ${renderAttachmentPicker('thread-attach')}
          </div>
          <button type="submit" class="btn btn-primary" id="create-thread-btn">Create Thread</button>
        </form>
      </div>
    </div>
  `;
}

export function initCreateThread(slug: string) {
  const form = document.getElementById('create-thread-form') as HTMLFormElement;
  const errorEl = document.getElementById('create-error')!;
  const picker = initAttachmentPicker('thread-attach');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('d-none');

    const btn = document.getElementById('create-thread-btn') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Creating...';

    const title = (document.getElementById('title') as HTMLInputElement).value;
    const body = (document.getElementById('body') as HTMLTextAreaElement).value;
    const files = picker.getFiles();

    try {
      const { thread } = await createThread(slug, { title, body }, files.length > 0 ? files : undefined);
      router.navigate(`/groups/${slug}/threads/${thread.id}`);
    } catch (err: any) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('d-none');
      btn.disabled = false;
      btn.textContent = 'Create Thread';
    }
  });

  router.updatePageLinks();
}
