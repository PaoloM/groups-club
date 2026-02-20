import session from 'express-session';
import { PrismaSessionStore } from '@quixo3/prisma-session-store';
import prisma from '../lib/prisma.js';

export const sessionMiddleware = session({
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  },
  secret: process.env.SESSION_SECRET || 'change-me',
  resave: false,
  saveUninitialized: false,
  store: new PrismaSessionStore(prisma as any, {
    checkPeriod: 2 * 60 * 1000, // prune expired sessions every 2 min
    dbRecordIdIsSessionId: true,
    dbRecordIdFunction: undefined,
  }),
});
