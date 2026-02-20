import { api } from './client.js';

export function listThreads(slug: string) {
  return api.get<{ threads: any[] }>(`/api/groups/${slug}/threads`);
}

export function getThread(slug: string, threadId: string) {
  return api.get<{ thread: any }>(`/api/groups/${slug}/threads/${threadId}`);
}

export function createThread(slug: string, data: { title: string; body: string }, files?: File[]) {
  if (files && files.length > 0) {
    const fd = new FormData();
    fd.append('title', data.title);
    fd.append('body', data.body);
    files.forEach((f) => fd.append('files', f));
    return fetch(`/api/groups/${slug}/threads`, { method: 'POST', body: fd, credentials: 'same-origin' })
      .then(async (res) => {
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || res.statusText); }
        return res.json() as Promise<{ thread: any }>;
      });
  }
  return api.post<{ thread: any }>(`/api/groups/${slug}/threads`, data);
}

export function updateThread(slug: string, threadId: string, data: any) {
  return api.patch<{ thread: any }>(`/api/groups/${slug}/threads/${threadId}`, data);
}

export function deleteThread(slug: string, threadId: string) {
  return api.delete<{ message: string }>(`/api/groups/${slug}/threads/${threadId}`);
}
