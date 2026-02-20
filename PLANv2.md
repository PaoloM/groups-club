# Implementation Plan v2: Images & Attachments

## Summary

Add file upload support for user avatars, group cover images, and thread/comment attachments. Uses multer for multipart handling, local filesystem storage under `server/uploads/`, and a new Attachment model in Prisma.

## Dependencies to Add

| Package | Where | Purpose |
|---------|-------|---------|
| `multer` | server | Multipart form-data parsing and file handling |
| `@types/multer` | server (dev) | TypeScript types |
| `uuid` | server | Already available via Prisma, but may use `crypto.randomUUID()` |

No new client dependencies needed — file uploads use native `FormData` and `fetch`.

## Phases

### Phase 1: Server Upload Infrastructure

**Files to create/modify:**

1. **`server/prisma/schema.prisma`** — Add `Attachment` model with fields: `id`, `filename`, `storedName`, `mimeType`, `size`, `path`, `uploadedById`, `threadId?`, `postId?`, `createdAt`. Add optional `coverAttachmentId` to Group, `avatarAttachmentId` to User.

2. **`server/src/middleware/upload.ts`** — New file. Configure multer:
   - Storage: `diskStorage` writing to `server/uploads/{category}/`
   - File filter: allow only JPEG, PNG, GIF, WebP (validate both extension and MIME)
   - Size limit: 5 MB
   - Export preconfigured middleware: `uploadAvatar` (single file, `avatars/`), `uploadCover` (single file, `covers/`), `uploadAttachments` (up to 4 files, `attachments/`)

3. **`server/src/routes/upload.ts`** — New file. Routes:
   - `POST /api/upload/avatar` — requireAuth, uploadAvatar middleware, save Attachment record, update `user.avatarAttachmentId`, return attachment with URL
   - `POST /api/upload/cover/:slug` — requireMember('admin'), uploadCover, save Attachment, update `group.coverAttachmentId`, return attachment
   - `DELETE /api/attachments/:id` — requireAuth, verify ownership or admin role, delete file from disk, delete DB record

4. **`server/src/index.ts`** — Mount upload routes, add `express.static('uploads')` for serving files at `/uploads/`

5. **Run `prisma db push`** to apply schema changes

**Verification:** Upload a file via curl, confirm it's saved to disk and returned with a working URL.

### Phase 2: Thread/Post Attachments (Server)

**Files to modify:**

1. **`server/src/routes/threads.ts`** — Modify `POST /api/groups/:slug/threads` to accept multipart (multer middleware) alongside JSON body fields. After creating thread, save Attachment records linked to `threadId`. Modify `GET` endpoints to include `attachments` relation.

2. **`server/src/routes/posts.ts`** — Same treatment for `POST /api/groups/:slug/threads/:id/posts`. Accept file attachments, save with `postId` reference.

3. **Thread/Post GET responses** — Include `attachments[]` array with `{ id, filename, url, mimeType }` on each thread and post.

**Verification:** Create a thread with attachments via curl, verify attachments appear in GET response with working URLs.

### Phase 3: Avatar Upload UI

**Files to modify:**

1. **`client/src/pages/profile.ts`** — Replace the single "Avatar URL" input with a tabbed interface:
   - "Upload" tab: `<input type="file" accept="image/*">` with preview area
   - "URL" tab: existing URL text input
   - On file select: show preview thumbnail
   - On form submit with file: POST to `/api/upload/avatar` using FormData, then update auth state

2. **`client/src/components/navbar.ts`** — Avatar display already works (reads `avatarUrl`). Server should return the resolved URL (upload path or external URL) so no navbar changes needed.

3. **`server/src/routes/users.ts`** — Modify `GET /me` to resolve avatar: if `avatarAttachmentId` exists, return its URL as `avatarUrl`; otherwise return existing `avatarUrl` field.

**Verification:** Upload avatar from profile page, see it in navbar and public profile.

### Phase 4: Group Cover Upload UI

**Files to modify:**

1. **`client/src/pages/createGroup.ts`** — Replace "Cover image URL" input with dual upload/URL approach. On file select, show preview. On submit with file: POST to `/api/upload/cover/:slug` after group creation, then redirect.

2. **`client/src/pages/groupSettings.ts`** — Same dual approach for editing cover image. Show current cover with "Change" button.

3. **`server/src/routes/groups.ts`** — Resolve `coverAttachmentId` to URL in GET responses, similar to avatar resolution.

**Verification:** Upload cover image on group create/edit, see it on group card and detail page.

### Phase 5: Thread/Post Attachment UI

**Files to create/modify:**

1. **`client/src/components/attachmentPicker.ts`** — New component. Renders:
   - Paperclip button that opens file picker (multi-select, max 4)
   - Thumbnail previews of selected files below textarea
   - Remove button on each thumbnail

2. **`client/src/components/attachmentGallery.ts`** — New component. Renders attached images on a thread/post:
   - Flex row of thumbnail images (max-height 300px)
   - Click to open Bootstrap modal with full-size image

3. **`client/src/pages/createThread.ts`** — Add attachment picker to form. On submit: send as FormData (title, body, and files together) instead of JSON.

4. **`client/src/pages/threadDetail.ts`** — Render attachment gallery on thread body and on each post/comment. Add attachment picker to comment and reply forms.

5. **`client/src/components/postTree.ts`** — Render `node.attachments[]` gallery below each post body.

6. **`client/src/api/threads.ts`** and **`client/src/api/posts.ts`** — Add FormData upload variants of create functions.

**Verification:** Attach images to thread and comments, see them displayed inline, click to view full size.

### Phase 6: Cleanup & Polish

1. **Delete attachments on cascade** — When a thread, post, or group is deleted, also delete associated attachment files from disk. Add `onDelete: Cascade` in Prisma and a Prisma middleware or manual cleanup in delete routes.

2. **Orphan cleanup** — Optional: scheduled task or startup script to delete files in `uploads/` that have no matching DB record.

3. **Loading states** — Show upload progress indicator (percentage or spinner) during file uploads.

4. **Error handling** — Show friendly errors for: file too large, wrong file type, too many attachments.

5. **Empty `uploads/` directory** — Add `server/uploads/.gitkeep` files so the directory structure exists in version control. Add `server/uploads/**` to `.gitignore` (except `.gitkeep`).

## File Inventory

### New Files (~6)
```
server/src/middleware/upload.ts          — Multer config
server/src/routes/upload.ts              — Upload endpoints
server/uploads/avatars/.gitkeep
server/uploads/covers/.gitkeep
server/uploads/attachments/.gitkeep
client/src/components/attachmentPicker.ts — File picker UI
client/src/components/attachmentGallery.ts — Image display UI
```

### Modified Files (~12)
```
server/prisma/schema.prisma       — Attachment model + relations
server/src/index.ts                — Mount upload routes, static serving
server/src/routes/users.ts         — Resolve avatar attachment
server/src/routes/groups.ts        — Resolve cover attachment
server/src/routes/threads.ts       — Accept/return attachments
server/src/routes/posts.ts         — Accept/return attachments
server/package.json                — Add multer
client/src/pages/profile.ts        — Avatar upload UI
client/src/pages/createGroup.ts    — Cover upload UI
client/src/pages/groupSettings.ts  — Cover upload edit UI
client/src/pages/createThread.ts   — Attachment picker
client/src/pages/threadDetail.ts   — Attachment display + picker
client/src/components/postTree.ts  — Attachment gallery per post
client/src/api/threads.ts          — FormData upload variant
client/src/api/posts.ts            — FormData upload variant
.gitignore                         — Exclude uploads/*
```

## Key Design Decisions

1. **Filesystem over S3:** Keeps things simple for self-hosted/dev. The `uploads/` directory structure and URL scheme (`/uploads/avatars/uuid.png`) make migration to S3 straightforward later — just swap the static serving with a proxy to S3 and change the URL prefix.

2. **Dual URL + Upload:** Preserving the URL input alongside the file upload means existing functionality isn't broken and users who prefer linking external images can still do so.

3. **Attachments as separate model:** Rather than embedding image data into threads/posts, a dedicated Attachment table allows reuse, proper cleanup on delete, and future expansion (other file types, multiple attachments).

4. **UUID filenames:** Prevents collisions and path traversal. Original filenames stored in DB for display in UI (e.g., "vacation.jpg (2.1 MB)").

5. **No server-side image processing:** Browsers handle display sizing via CSS. Adds simplicity at the cost of bandwidth. Thumbnailing could be added later with `sharp`.
