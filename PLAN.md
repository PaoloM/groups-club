# Implementation Plan: mygroups.club

## Context

Building a greenfield group management web application (Facebook Groups replacement) from an empty directory based on SPEC.md. The app uses a split architecture: Express + TypeScript backend, Bootstrap 5 + TypeScript SPA frontend, MariaDB with Prisma ORM, Passport.js auth.

## Architecture

- **Monorepo** with npm workspaces: `server/` and `client/`
- **Dev mode:** Vite dev server (port 5173) proxies `/api` to Express (port 4000) via `concurrently`
- **Production:** Express serves built client from `client/dist/` with SPA catch-all

## Key Package Choices

| Concern | Package | Why |
|---------|---------|-----|
| Client router | **Navigo v8** | ~10KB, History API, parameterized routes, `data-navigo` link interception |
| Session store | **@quixo3/prisma-session-store** | Works directly with PrismaClient, officially listed by Express |
| Prisma provider | `mysql` | Prisma uses `mysql` for both MySQL and MariaDB |
| TS dev runner | `tsx` | Fast TypeScript execution with watch mode |
| Slug generation | `slugify` | URL-friendly slugs from group names |
| Markdown | `marked` + `DOMPurify` | Client-side rendering, raw Markdown stored in DB |

## Phases

### Phase 0: Project Scaffolding
- Root `package.json` with npm workspaces + `concurrently`
- `server/` — package.json, tsconfig.json, `.env`, minimal Express with `/api/health`
- `client/` — package.json, tsconfig.json, vite.config.ts (proxy `/api`), index.html, main.ts
- `.gitignore`
- **Test:** `npm run dev` serves Vite page; `/api/health` returns OK via proxy

### Phase 1: Database Schema
- Full Prisma schema: User (with nullable password + googleId), Group, Membership, Thread, Post (self-referencing parentId), Session model
- `@@unique([userId, groupId])` on Membership; cascade deletes on Group→Membership/Thread, Thread→Post
- Seed script with test data
- **Test:** `prisma migrate dev`, verify tables in MariaDB

### Phase 2: Authentication (Server)
- `express-session` with PrismaSessionStore
- Passport.js: LocalStrategy (bcrypt), GoogleStrategy (find-or-create by googleId)
- Auth routes: `POST /register`, `POST /login`, `GET /google`, `GET /google/callback`, `POST /logout`
- Auth middleware: `requireAuth`, `requireMember`, `requireRole`
- **Test:** Register/login/logout via curl, verify sessions in DB

### Phase 3: Core API Endpoints
- Users: `GET/PATCH /users/me`, `GET /users/:id`
- Groups: full CRUD + search (`?search=`), slug generation with collision handling
- Memberships: join, leave (with owner cascade), list members, change role, remove member
- Threads: CRUD with author info and post count
- Posts: create (with parentId), edit, soft-delete (if has replies → `[deleted]`)
- `GET /users/me/groups` for dashboard data
- Validation helper + global error handler
- **Test:** Full CRUD lifecycle via curl/Postman

### Phase 4: Client SPA Shell
- Navigo router with all 14 routes (order matters: `/groups/new` before `/groups/:slug`)
- Layout component: Bootstrap navbar + `<main id="page">` + footer
- Placeholder page modules (dynamic imports for code splitting)
- API fetch wrapper (`client.ts`) with error handling
- Auth state management (fetchCurrentUser, onAuthChange listeners)
- **Test:** Navigate all routes, URL updates, navbar works

### Phase 5: Auth Pages (Client)
- Login page: email/password form + Google OAuth button
- Register page: name/email/password/confirm form with validation
- Navbar: updates on auth state change (login/avatar dropdown)
- **Test:** Full register → login → logout flow in browser

### Phase 6: Groups UI
- Discover page: search input + group card grid
- Create group page: form with Markdown textarea for description
- Group detail page: rendered Markdown description, member count, join/leave, recent threads
- `renderMarkdown()` utility: `marked.parse()` → `DOMPurify.sanitize()`
- Reusable group card component
- **Test:** Create group, find on discover, view detail, join/leave

### Phase 7: Threads + Members UI
- Thread list page: pinned threads first, title/author/date/post count
- Create thread page: title + Markdown body textarea
- Thread detail page: rendered body + comment section structure
- Member list page: role badges, role management for admins/owners
- Group settings page: edit form + delete with confirmation
- Dashboard page: user's groups + create group CTA
- **Test:** Full thread lifecycle, membership management

### Phase 8: Comments & Nested Replies
- `buildPostTree()` utility: flat list → nested tree by parentId
- `renderPostTree()` component: recursive rendering with indentation (max 3 levels)
- Inline reply form: appears below a post when Reply is clicked
- Soft-delete: `[deleted]` placeholder preserving reply chains
- **Test:** Comment, reply (3 levels), delete with replies

### Phase 9: Profiles & Polish
- Profile page: edit name/avatar, show user's groups
- Public profile page: view other users
- Landing page: hero + featured groups + CTAs
- Empty state component for no-content scenarios
- Date formatting utility
- Navigo `before` hooks for auth-guarded routes
- Production build: `vite build` + Express static serving + SPA catch-all
- **Test:** Full end-to-end walkthrough, mobile viewport, production build

## File Structure (Final ~45 files)

```
server/src/
├── index.ts
├── lib/prisma.ts
├── middleware/  (session, passport, auth, validation, errorHandler)
├── routes/      (auth, users, groups, memberships, threads, posts)
└── prisma/      (schema.prisma, seed.ts)

client/src/
├── main.ts, router.ts
├── api/         (client, auth, groups, memberships, threads, posts)
├── auth/        (state)
├── pages/       (15 page modules)
├── components/  (layout, navbar, groupCard, postTree, postForm, emptyState, markdown)
└── utils/       (tree, dates, escapeHtml)
```

## Verification

After each phase, test the checkpoint described above. Final verification:
1. `npm run dev` — both servers start
2. Register a user, create a group, post a thread with Markdown, comment with nested replies
3. Second user joins via discover, interacts
4. Role management, thread pinning, group settings
5. `npm run build` — production build works, Express serves SPA
