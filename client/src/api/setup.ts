import { api } from './client.js';

export function getSetupStatus() {
  return api.get<{ needsSetup: boolean }>('/api/setup/status');
}

export function completeSetup(name: string, email: string, password: string) {
  return api.post<{ user: any }>('/api/setup', { name, email, password });
}
