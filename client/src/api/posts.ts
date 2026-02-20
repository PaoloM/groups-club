import { api } from './client.js';

export function createPost(slug: string, threadId: string, data: { body: string; parentId?: string }, files?: File[]) {
  if (files && files.length > 0) {
    const fd = new FormData();
    fd.append('body', data.body);
    if (data.parentId) fd.append('parentId', data.parentId);
    files.forEach((f) => fd.append('files', f));
    return fetch(`/api/groups/${slug}/threads/${threadId}/posts`, { method: 'POST', body: fd, credentials: 'same-origin' })
      .then(async (res) => {
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || res.statusText); }
        return res.json() as Promise<{ post: any }>;
      });
  }
  return api.post<{ post: any }>(`/api/groups/${slug}/threads/${threadId}/posts`, data);
}

export function updatePost(postId: string, body: string) {
  return api.patch<{ post: any }>(`/api/posts/${postId}`, { body });
}

export function deletePost(postId: string) {
  return api.delete<{ message: string }>(`/api/posts/${postId}`);
}

export function toggleLike(postId: string) {
  return api.post<{ liked: boolean; likeCount: number }>(`/api/posts/${postId}/like`, {});
}
