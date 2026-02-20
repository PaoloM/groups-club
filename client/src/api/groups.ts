import { api } from './client.js';

export function listGroups(search?: string) {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  return api.get<{ groups: any[] }>(`/api/groups${qs}`);
}

export function getGroup(slug: string) {
  return api.get<{ group: any }>(`/api/groups/${slug}`);
}

export function createGroup(data: { name: string; description: string; imageUrl?: string; isPublic?: boolean }) {
  return api.post<{ group: any }>('/api/groups', data);
}

export function updateGroup(slug: string, data: any) {
  return api.patch<{ group: any }>(`/api/groups/${slug}`, data);
}

export function deleteGroup(slug: string) {
  return api.delete<{ message: string }>(`/api/groups/${slug}`);
}

export function getMyGroups() {
  return api.get<{ groups: any[] }>('/api/users/me/groups');
}
