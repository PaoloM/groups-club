import type { PostNode } from '../utils/tree.js';
import { renderMarkdown } from './markdown.js';
import { renderAttachmentGallery } from './attachmentGallery.js';
import { renderAvatar } from './avatar.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { formatDate } from '../utils/dates.js';

const MAX_DEPTH = 3;

export function renderPostTree(
  nodes: PostNode[],
  slug: string,
  threadId: string,
  depth: number,
  user: any,
  membership: any
): string {
  return nodes.map((node) => renderPostNode(node, slug, threadId, depth, user, membership)).join('');
}

function renderPostNode(
  node: PostNode,
  slug: string,
  threadId: string,
  depth: number,
  user: any,
  membership: any
): string {
  const isDeleted = node.body === '[deleted]';
  const isAuthor = user && node.authorId === user.id;
  const isSiteOwner = user?.isSiteOwner;
  const isAdminOrOwner = isSiteOwner || (membership && membership.role === 'admin');
  const canDelete = isAuthor || isAdminOrOwner;
  const canReply = membership && depth < MAX_DEPTH;

  const indent = Math.min(depth, MAX_DEPTH) * 2;

  return `
    <div class="border-start ps-3 mb-3" style="margin-left:${indent}rem">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          ${isDeleted
            ? '<span class="text-muted fst-italic">[deleted]</span>'
            : `<small>
                ${renderAvatar(node.author, 22)} <a href="/profile/${node.author.id}" data-navigo class="fw-bold text-decoration-none">${escapeHtml(node.author.name)}</a>
                &middot; ${formatDate(node.createdAt)}
              </small>
              <div class="mt-1">${renderMarkdown(node.body)}</div>
              ${renderAttachmentGallery(node.attachments)}`
          }
        </div>
      </div>
      ${!isDeleted ? `
        <div class="mt-1 d-flex align-items-center">
          ${user ? `<button class="btn btn-sm btn-link text-muted p-0 me-2" data-like-post="${node.id}">${node.userLiked ? '\u2764' : '\u2661'} ${node.likeCount || ''}</button>` : (node.likeCount ? `<span class="text-muted me-2">\u2661 ${node.likeCount}</span>` : '')}
          ${canReply ? `<button class="btn btn-sm btn-link text-muted p-0 me-2" data-reply-to="${node.id}">Reply</button>` : ''}
          ${canDelete ? `<button class="btn btn-sm btn-link text-danger p-0" data-delete-post="${node.id}">Delete</button>` : ''}
        </div>
      ` : ''}
      <div id="reply-form-${node.id}"></div>
      ${node.children.length > 0
        ? renderPostTree(node.children, slug, threadId, depth + 1, user, membership)
        : ''
      }
    </div>
  `;
}
