import { api } from './client.js';

export function createPost(slug: string, threadId: string, data: { body: string; parentId?: string }) {
  return api.post<{ post: any }>(`/api/groups/${slug}/threads/${threadId}/posts`, data);
}

export function updatePost(postId: string, body: string) {
  return api.patch<{ post: any }>(`/api/posts/${postId}`, { body });
}

export function deletePost(postId: string) {
  return api.delete<{ message: string }>(`/api/posts/${postId}`);
}
