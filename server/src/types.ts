import type { User } from '@prisma/client';

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User {
      id: string;
      name: string;
      email: string;
      password: string | null;
      googleId: string | null;
      avatarUrl: string | null;
      isSiteOwner: boolean;
      createdAt: Date;
    }
  }
}

export function paramString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0];
  return value || '';
}
