# Project Spec: groups.club

## Overview

A simple replacement for Facebook groups, providing the ability for users to join clubs, post about their activities in threads, and comment/reply to existing threads.

## Tech Stack

- **Frontend:** TypeScript, Bootstrap 5, Vite (bundler)
- **Backend:** Node.js, Express, TypeScript
- **Database:** MariaDB with Prisma ORM
- **Auth:** Passport.js (Google OAuth + local email/password)
- **Hosting/Deploy:** TBD

## Project Structure

```
groups.club/
├── server/              # Express backend
│   ├── src/
│   │   ├── routes/      # Express route handlers
│   │   ├── middleware/   # Auth, validation, error handling
│   │   ├── prisma/      # Schema and migrations
│   │   └── index.ts     # App entry point
│   └── package.json
├── client/              # Frontend SPA
│   ├── src/
│   │   ├── pages/       # Page modules
│   │   ├── components/  # Reusable UI components
│   │   ├── api/         # API client functions
│   │   ├── auth/        # Auth state and helpers
│   │   └── main.ts      # Entry point
│   ├── index.html
│   └── package.json
└── package.json         # Root workspace scripts
```

## Data Model

### User

| Field     | Type     | Notes                 |
|-----------|----------|-----------------------|
| id        | uuid     | Primary key           |
| name      | string   | Display name          |
| email     | string   | Unique, used for auth |
| password  | string   | Hashed with bcrypt    |
| avatarUrl | string?  | Profile photo URL     |
| createdAt | datetime |                       |

### Group

| Field       | Type     | Notes                                        |
|-------------|----------|----------------------------------------------|
| id          | uuid     | Primary key                                  |
| name        | string   | Max 100 chars                                |
| slug        | string   | Unique, URL-friendly, derived from name      |
| description | text     | Group description, supports Markdown         |
| imageUrl    | string?  | Cover image                                  |
| isPublic    | boolean  | Default true; private groups are invite-only |
| createdById | uuid     | FK to User                                   |
| createdAt   | datetime |                                              |

### Membership

| Field    | Type     | Notes                      |
|----------|----------|----------------------------|
| id       | uuid     | Primary key                |
| userId   | uuid     | FK to User                 |
| groupId  | uuid     | FK to Group                |
| role     | enum     | `owner`, `admin`, `member` |
| joinedAt | datetime |                            |

### Thread

| Field     | Type     | Notes               |
|-----------|----------|---------------------|
| id        | uuid     | Primary key         |
| groupId   | uuid     | FK to Group         |
| authorId  | uuid     | FK to User          |
| title     | string   | Max 200 chars       |
| body      | text     | Thread body content, supports Markdown |
| isPinned  | boolean  | Default false       |
| createdAt | datetime |                     |
| updatedAt | datetime |                     |

### Post (Comment/Reply)

| Field     | Type     | Notes                                            |
|-----------|----------|--------------------------------------------------|
| id        | uuid     | Primary key                                      |
| threadId  | uuid     | FK to Thread                                     |
| authorId  | uuid     | FK to User                                       |
| body      | text     | Comment body, supports Markdown                  |
| parentId  | uuid?    | FK to Post (self-referencing for nested replies) |
| createdAt | datetime |                                                  |
| updatedAt | datetime |                                                  |

### Relationships

- A User has many Memberships; a Group has many Memberships (many-to-many through Membership)
- A Group has many Threads
- A Thread has many Posts (comments)
- A Post can have child Posts (nested replies via parentId)
- A User has many Threads and many Posts

## Pages / Routes

The frontend is a single-page application. Client-side routing maps to these views:

| Route                         | Description                                                  | Key Actions                           |
|-------------------------------|--------------------------------------------------------------|---------------------------------------|
| `/`                           | Landing page — hero section, featured groups, CTA to sign up | Sign up, Log in, Browse               |
| `/login`                      | Sign in with Google or email/password                        | Authenticate                          |
| `/register`                   | Create account with email/password                           | Register                              |
| `/discover`                   | Searchable directory of public groups                        | Search, join a group                  |
| `/dashboard`                  | User's groups and recent activity across them                | Navigate to group, create group       |
| `/groups/new`                 | Create a new group form                                      | Fill form, submit                     |
| `/groups/:slug`               | Group home — description, member count, recent threads       | Join/leave, browse threads            |
| `/groups/:slug/threads`       | Full thread list for the group                               | Sort, search threads                  |
| `/groups/:slug/threads/new`   | Create a new thread (members only)                           | Write and submit thread               |
| `/groups/:slug/threads/:id`   | Thread detail — full thread body + comments/replies          | Read, comment, reply                  |
| `/groups/:slug/members`       | Member list with roles                                       | View members; admins can manage roles |
| `/groups/:slug/settings`      | Group settings (owner/admin only)                            | Edit group info, delete group         |
| `/profile`                    | Current user's profile                                       | Edit name, avatar                     |
| `/profile/:id`                | Public user profile — name, groups they belong to            | View profile                          |

## Features

### Must Have

- [ ] User registration and login (Google OAuth + email/password)
- [ ] Create, edit, and delete groups
- [ ] Public group discovery with search
- [ ] Join and leave groups
- [ ] Group detail page with description and member count
- [ ] Create, edit, and delete threads within a group
- [ ] Comment on threads
- [ ] Nested replies to comments
- [ ] Role-based permissions (owner, admin, member)
- [ ] User profile page (view and edit)
- [ ] Markdown support in group descriptions, thread bodies, and post/comment bodies (stored as raw Markdown, rendered to HTML on display)
- [ ] Responsive mobile-friendly layout

### Should Have

- [ ] Private (invite-only) groups with shareable invite link
- [ ] Pin important threads to the top of the group
- [ ] Pagination for threads and comments
- [ ] User avatars via URL or upload
- [ ] Member count shown on group cards
- [ ] Sort threads by newest, most active, or most commented
- [ ] Edit and delete own comments

### Nice to Have

- [ ] Email notifications for new threads/comments in joined groups
- [ ] Dark mode toggle
- [ ] Image attachments in threads and comments
- [ ] Live markdown preview side-by-side in thread and comment editors
- [ ] Activity feed on dashboard showing latest posts across all joined groups
- [ ] "Like" or reaction system for threads and comments

## API Endpoints

All endpoints are prefixed with `/api`. The backend serves the API; the frontend is a separate SPA that consumes it.

**Auth:**

| Method | Endpoint               | Description                 | Auth Required |
|--------|------------------------|-----------------------------|---------------|
| POST   | `/api/auth/register`   | Register with email/password | No           |
| POST   | `/api/auth/login`      | Login with email/password   | No            |
| GET    | `/api/auth/google`     | Initiate Google OAuth       | No            |
| GET    | `/api/auth/google/callback` | Google OAuth callback  | No            |
| POST   | `/api/auth/logout`     | Log out (clear session)     | Yes           |

**Users:**

| Method | Endpoint          | Description              | Auth Required |
|--------|-------------------|--------------------------|---------------|
| GET    | `/api/users/me`   | Get current user profile | Yes           |
| PATCH  | `/api/users/me`   | Update profile           | Yes           |

**Groups:**

| Method | Endpoint                          | Description               | Auth Required               |
|--------|-----------------------------------|---------------------------|-----------------------------|
| GET    | `/api/groups`                     | List/search public groups | No                          |
| POST   | `/api/groups`                     | Create a group            | Yes                         |
| GET    | `/api/groups/:slug`               | Get group details         | No (public) / Yes (private) |
| PATCH  | `/api/groups/:slug`               | Update group              | Yes (admin/owner)           |
| DELETE | `/api/groups/:slug`               | Delete group              | Yes (owner)                 |
| POST   | `/api/groups/:slug/join`          | Join a group              | Yes                         |
| DELETE | `/api/groups/:slug/leave`         | Leave a group             | Yes                         |
| GET    | `/api/groups/:slug/members`       | List group members        | Yes (member)                |
| PATCH  | `/api/groups/:slug/members/:id`   | Change member role        | Yes (owner/admin)           |
| DELETE | `/api/groups/:slug/members/:id`   | Remove member             | Yes (owner/admin)           |

**Threads:**

| Method | Endpoint                                  | Description              | Auth Required              |
|--------|-------------------------------------------|--------------------------|----------------------------|
| GET    | `/api/groups/:slug/threads`               | List threads in group    | Yes (member) / No (public) |
| POST   | `/api/groups/:slug/threads`               | Create thread            | Yes (member)               |
| GET    | `/api/groups/:slug/threads/:id`           | Get thread with comments | Yes (member) / No (public) |
| PATCH  | `/api/groups/:slug/threads/:id`           | Edit thread              | Yes (author/admin/owner)   |
| DELETE | `/api/groups/:slug/threads/:id`           | Delete thread            | Yes (author/admin/owner)   |

**Posts (Comments):**

| Method | Endpoint                                        | Description          | Auth Required            |
|--------|-------------------------------------------------|----------------------|--------------------------|
| POST   | `/api/groups/:slug/threads/:id/posts`           | Add comment          | Yes (member)             |
| PATCH  | `/api/posts/:id`                                | Edit comment         | Yes (author)             |
| DELETE | `/api/posts/:id`                                | Delete comment       | Yes (author/admin/owner) |

## UI / UX Notes

- **Framework:** Bootstrap 5 with custom SCSS overrides for branding.
- **Style:** Clean, minimal, card-based layout. Generous whitespace. Feels like a modern forum, not a social media feed.
- **Responsive:** Mobile-first using Bootstrap's grid and breakpoints. Single column on mobile, sidebar + content on desktop.
- **Dark mode:** Not in MVP, nice-to-have (Bootstrap has built-in dark mode support via `data-bs-theme`).
- **Navigation:** Bootstrap navbar with logo, Discover, Dashboard (when logged in), avatar dropdown. Collapses to hamburger on mobile.
- **Thread layout:** Title + preview on list view. Full body + threaded comments on detail view (indent nested replies).
- **Empty states:** Friendly messages when a group has no threads ("Start the conversation!") or a user hasn't joined any groups yet.
- **Forms:** Bootstrap form controls with client-side validation.
- **Markdown:** Body fields use a plain `<textarea>` for input. Rendered output uses `marked` (or similar) to convert Markdown to HTML, sanitized with `DOMPurify` to prevent XSS. Rendered markdown is styled to match Bootstrap typography.

## Behavior & Edge Cases

- When a user creates a group, they automatically become the `owner`.
- When the owner leaves a group, the oldest admin is promoted. If no admins, the oldest member is promoted. If the group is empty, it is soft-deleted.
- When a group slug is taken, auto-append a numeric suffix (e.g., `book-club-2`).
- When a user tries to access a private group they are not a member of, show a "This group is private" message.
- When a thread is deleted, all its comments are also deleted (cascade).
- When a user deletes their account, anonymize their threads/posts (author shown as "Deleted User") rather than removing content.
- Nested replies go a maximum of 3 levels deep. Beyond that, replies are shown as flat comments referencing the parent.
- When a comment is deleted but has child replies, show "[deleted]" placeholder instead of removing it entirely, so the reply chain is preserved.

## Auth & Permissions

Authentication uses Express sessions stored in the database (via `express-session` + `connect-session-prisma` or similar). Passport.js handles strategy logic.

| Role                        | Permissions                                                                                         |
|-----------------------------|-----------------------------------------------------------------------------------------------------|
| **Visitor** (not logged in) | View public groups, read threads in public groups                                                   |
| **Logged-in User**          | All visitor permissions + create groups, join public groups, edit own profile                       |
| **Member**                  | All user permissions (within group) + create threads, post comments, edit/delete own content        |
| **Admin**                   | All member permissions + pin/delete any thread, delete any comment, remove members, edit group info |
| **Owner**                   | All admin permissions + delete group, promote/demote admins, transfer ownership                     |

## Third-Party Integrations

- **Passport.js:** Google OAuth 2.0 strategy + Local strategy (email/password)
- **bcrypt:** Password hashing
- **express-session:** Server-side session management
- **marked:** Markdown to HTML rendering
- **DOMPurify:** Sanitize rendered HTML to prevent XSS
- **Nodemailer or Resend:** Transactional email for notifications (nice-to-have)

## Out of Scope

- Real-time chat or direct messaging between users
- Event scheduling or calendars
- Payment processing or paid memberships
- Mobile native apps (iOS/Android)
- Platform-wide admin/moderation dashboard
- Public API for third-party developers
- SSO / SAML enterprise authentication
- File attachments beyond images
