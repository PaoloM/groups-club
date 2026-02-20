import 'dotenv/config';
import express from 'express';
import path from 'path';
import { sessionMiddleware } from './middleware/session.js';
import passport from './middleware/passport.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import groupRoutes from './routes/groups.js';
import membershipRoutes from './routes/memberships.js';
import threadRoutes from './routes/threads.js';
import postRoutes from './routes/posts.js';
import uploadRoutes from './routes/upload.js';
import setupRoutes from './routes/setup.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// API routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/setup', setupRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/groups/:slug', membershipRoutes);
app.use('/api/groups/:slug/threads', threadRoutes);
app.use('/api/groups/:slug/threads/:id/posts', postRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api', uploadRoutes); // for DELETE /api/attachments/:id

// Error handler
app.use(errorHandler);

// In production, serve client build
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
