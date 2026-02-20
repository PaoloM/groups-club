import { api } from './client.js';

export function joinGroup(slug: string) {
  return api.post<{ membership: any }>(`/api/groups/${slug}/join`);
}

export function leaveGroup(slug: string) {
  return api.delete<{ message: string }>(`/api/groups/${slug}/leave`);
}

export function listMembers(slug: string) {
  return api.get<{ members: any[] }>(`/api/groups/${slug}/members`);
}

export function changeMemberRole(slug: string, membershipId: string, role: string) {
  return api.patch<{ membership: any }>(`/api/groups/${slug}/members/${membershipId}`, { role });
}

export function removeMember(slug: string, membershipId: string) {
  return api.delete<{ message: string }>(`/api/groups/${slug}/members/${membershipId}`);
}
