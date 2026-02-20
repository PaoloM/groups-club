import { fetchCurrentUser } from '../api/auth.js';

type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  isSiteOwner: boolean;
};

type AuthListener = (user: User | null) => void;

let currentUser: User | null = null;
const listeners: AuthListener[] = [];

export function getUser(): User | null {
  return currentUser;
}

export function setUser(user: User | null) {
  currentUser = user;
  listeners.forEach((fn) => fn(currentUser));
}

export function onAuthChange(fn: AuthListener) {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

export async function initAuth(): Promise<User | null> {
  try {
    const { user } = await fetchCurrentUser();
    setUser(user);
    return user;
  } catch {
    setUser(null);
    return null;
  }
}
