import { api } from './client.js';

export function register(name: string, email: string, password: string) {
  return api.post<{ user: any }>('/api/auth/register', { name, email, password });
}

export function login(email: string, password: string) {
  return api.post<{ user: any }>('/api/auth/login', { email, password });
}

export function logout() {
  return api.post<{ message: string }>('/api/auth/logout');
}

export function fetchCurrentUser() {
  return api.get<{ user: any }>('/api/users/me');
}
