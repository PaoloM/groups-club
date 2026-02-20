import { api } from './client.js';

export function listThreads(slug: string) {
  return api.get<{ threads: any[] }>(`/api/groups/${slug}/threads`);
}

export function getThread(slug: string, threadId: string) {
  return api.get<{ thread: any }>(`/api/groups/${slug}/threads/${threadId}`);
}

export function createThread(slug: string, data: { title: string; body: string }) {
  return api.post<{ thread: any }>(`/api/groups/${slug}/threads`, data);
}

export function updateThread(slug: string, threadId: string, data: any) {
  return api.patch<{ thread: any }>(`/api/groups/${slug}/threads/${threadId}`, data);
}

export function deleteThread(slug: string, threadId: string) {
  return api.delete<{ message: string }>(`/api/groups/${slug}/threads/${threadId}`);
}
