import { getThread, updateThread, deleteThread } from '../api/threads.js';
import { getGroup } from '../api/groups.js';
import { renderMarkdown } from '../components/markdown.js';
import { renderPostTree } from '../components/postTree.js';
import { renderPostForm } from '../components/postForm.js';
import { buildPostTree } from '../utils/tree.js';
import { getUser } from '../auth/state.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { formatDate } from '../utils/dates.js';
import { router } from '../router.js';

export async function renderThreadDetail(slug: string, threadId: string): Promise<string> {
  try {
    const [{ group }, { thread }] = await Promise.all([
      getGroup(slug),
      getThread(slug, threadId),
    ]);

    const user = getUser();
    const membership = group.currentUserMembership;
    const isAuthor = user && thread.authorId === user.id;
    const isAdminOrOwner = membership && (membership.role === 'admin' || membership.role === 'owner');
    const canEdit = isAuthor || isAdminOrOwner;

    const tree = buildPostTree(thread.posts);

    return `
      <a href="/groups/${escapeHtml(slug)}/threads" data-navigo class="text-decoration-none">&larr; Back to threads</a>
      <div class="mt-3">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div>
            ${thread.isPinned ? '<span class="badge bg-warning text-dark me-2">Pinned</span>' : ''}
            <h2>${escapeHtml(thread.title)}</h2>
            <p class="text-muted">
              by <a href="/profile/${thread.author.id}" data-navigo>${escapeHtml(thread.author.name)}</a>
              &middot; ${formatDate(thread.createdAt)}
              ${thread.updatedAt !== thread.createdAt ? ' &middot; edited' : ''}
            </p>
          </div>
          ${canEdit ? `
            <div class="dropdown">
              <button class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">Actions</button>
              <ul class="dropdown-menu dropdown-menu-end">
                ${isAdminOrOwner ? `<li><button class="dropdown-item" id="pin-btn">${thread.isPinned ? 'Unpin' : 'Pin'} thread</button></li>` : ''}
                ${isAuthor ? '<li><button class="dropdown-item" id="edit-thread-btn">Edit</button></li>' : ''}
                <li><button class="dropdown-item text-danger" id="delete-thread-btn">Delete</button></li>
              </ul>
            </div>
          ` : ''}
        </div>
        <div class="card mb-4">
          <div class="card-body" id="thread-body">${renderMarkdown(thread.body)}</div>
        </div>
        <h4 class="mb-3">${thread.posts.length} Comment${thread.posts.length !== 1 ? 's' : ''}</h4>
        ${membership ? renderPostForm(slug, threadId) : '<p class="text-muted">Join this group to comment.</p>'}
        <div id="comments-section">
          ${renderPostTree(tree, slug, threadId, 0, user, membership)}
        </div>
      </div>
    `;
  } catch {
    return '<p class="text-danger">Failed to load thread.</p>';
  }
}

export function initThreadDetail(slug: string, threadId: string) {
  // Pin button
  const pinBtn = document.getElementById('pin-btn');
  if (pinBtn) {
    pinBtn.addEventListener('click', async () => {
      const isPinned = pinBtn.textContent?.includes('Unpin');
      try {
        await updateThread(slug, threadId, { isPinned: !isPinned });
        await reloadThread(slug, threadId);
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  // Delete button
  const deleteBtn = document.getElementById('delete-thread-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Delete this thread and all its comments?')) return;
      try {
        await deleteThread(slug, threadId);
        router.navigate(`/groups/${slug}/threads`);
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  // Post form
  initPostFormHandler(slug, threadId);

  // Reply buttons + delete post buttons
  initCommentActions(slug, threadId);

  router.updatePageLinks();
}

async function reloadThread(slug: string, threadId: string) {
  const page = document.getElementById('page');
  if (!page) return;
  page.innerHTML = await renderThreadDetail(slug, threadId);
  initThreadDetail(slug, threadId);
}

function initPostFormHandler(slug: string, threadId: string) {
  const form = document.getElementById('post-form') as HTMLFormElement | null;
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bodyInput = form.querySelector('textarea') as HTMLTextAreaElement;
    const body = bodyInput.value.trim();
    if (!body) return;

    const btn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Posting...';

    try {
      const { createPost } = await import('../api/posts.js');
      await createPost(slug, threadId, { body });
      await reloadThread(slug, threadId);
    } catch (err: any) {
      alert(err.message);
      btn.disabled = false;
      btn.textContent = 'Post Comment';
    }
  });
}

function initCommentActions(slug: string, threadId: string) {
  // Reply buttons
  document.querySelectorAll('[data-reply-to]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const parentId = (btn as HTMLElement).dataset.replyTo!;
      const container = document.getElementById(`reply-form-${parentId}`);
      if (!container) return;

      if (container.innerHTML.trim()) {
        container.innerHTML = '';
        return;
      }

      container.innerHTML = `
        <form class="reply-form mt-2" data-parent-id="${parentId}">
          <textarea class="form-control form-control-sm mb-2" rows="2" required placeholder="Write a reply..."></textarea>
          <div class="d-flex gap-2">
            <button type="submit" class="btn btn-sm btn-primary">Reply</button>
            <button type="button" class="btn btn-sm btn-outline-secondary cancel-reply">Cancel</button>
          </div>
        </form>
      `;

      const replyForm = container.querySelector('form')!;
      replyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const textarea = replyForm.querySelector('textarea')!;
        const body = textarea.value.trim();
        if (!body) return;

        const replyBtn = replyForm.querySelector('button[type="submit"]') as HTMLButtonElement;
        replyBtn.disabled = true;
        replyBtn.textContent = 'Posting...';

        try {
          const { createPost } = await import('../api/posts.js');
          await createPost(slug, threadId, { body, parentId });
          await reloadThread(slug, threadId);
        } catch (err: any) {
          alert(err.message);
          replyBtn.disabled = false;
          replyBtn.textContent = 'Reply';
        }
      });

      container.querySelector('.cancel-reply')?.addEventListener('click', () => {
        container.innerHTML = '';
      });
    });
  });

  // Delete post buttons
  document.querySelectorAll('[data-delete-post]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this comment?')) return;
      const postId = (btn as HTMLElement).dataset.deletePost!;
      try {
        const { deletePost } = await import('../api/posts.js');
        await deletePost(postId);
        await reloadThread(slug, threadId);
      } catch (err: any) {
        alert(err.message);
      }
    });
  });
}
