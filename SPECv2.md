# Spec v2: Images & Attachments

## Overview

v1 stores images as external URLs pasted by users. v2 adds actual file upload support for avatars, group cover images, and inline attachments in threads and comments.

## Goals

- Users can upload avatar images instead of pasting URLs
- Group owners/admins can upload cover images
- Members can attach images to threads and comments
- Uploaded images are stored on the server and served via static URLs
- Existing URL-based image fields continue to work alongside uploads

## Storage

Uploaded files are stored on the local filesystem under `server/uploads/`. In production this directory should be served by a reverse proxy (Nginx) or migrated to S3-compatible storage. For now, Express serves the directory statically at `/uploads/`.

```
server/uploads/
├── avatars/       # User profile photos
├── covers/        # Group cover images
└── attachments/   # Thread/post inline images
```

### File Naming

Files are renamed to `{uuid}.{ext}` on upload to avoid collisions and path traversal. Original filenames are stored in the database for display purposes.

### Limits

| Constraint | Value |
|------------|-------|
| Max file size | 5 MB |
| Allowed types | JPEG, PNG, GIF, WebP |
| Max attachments per post | 4 |

## Data Model Changes

### New: Attachment

| Field        | Type     | Notes                                    |
|--------------|----------|------------------------------------------|
| id           | uuid     | Primary key                              |
| filename     | string   | Original filename                        |
| storedName   | string   | UUID filename on disk                    |
| mimeType     | string   | e.g. `image/png`                         |
| size         | int      | File size in bytes                       |
| path         | string   | Relative path from uploads dir           |
| uploadedById | uuid     | FK to User                               |
| threadId     | uuid?    | FK to Thread (if thread attachment)      |
| postId       | uuid?    | FK to Post (if comment attachment)       |
| createdAt    | datetime |                                          |

### Modified: User

- `avatarUrl` remains as-is (supports external URLs)
- New field: `avatarAttachmentId` (uuid?, FK to Attachment) — for uploaded avatars
- Display logic: if `avatarAttachmentId` exists, use its path; otherwise fall back to `avatarUrl`

### Modified: Group

- `imageUrl` remains as-is
- New field: `coverAttachmentId` (uuid?, FK to Attachment) — for uploaded covers
- Same fallback logic as avatars

## API Changes

### New Endpoints

| Method | Endpoint                                    | Description                     | Auth          |
|--------|---------------------------------------------|---------------------------------|---------------|
| POST   | `/api/upload/avatar`                        | Upload user avatar              | Yes           |
| POST   | `/api/upload/cover/:slug`                   | Upload group cover image        | Yes (admin+)  |
| POST   | `/api/groups/:slug/threads/:id/attachments` | Upload thread/post attachments  | Yes (member)  |
| GET    | `/uploads/:path`                            | Serve uploaded file (static)    | No            |
| DELETE | `/api/attachments/:id`                      | Delete an attachment            | Yes (uploader/admin) |

### Upload Flow

1. Client sends `multipart/form-data` with the file
2. Server validates file type and size via multer
3. Server saves file to `uploads/{category}/{uuid}.{ext}`
4. Server creates Attachment record in DB
5. Server returns Attachment object with `url` field (e.g. `/uploads/avatars/abc123.png`)

### Modified Endpoints

- `PATCH /api/users/me` — accepts `avatarUrl` (external URL, as before) OR the user can POST to `/api/upload/avatar` to upload a file
- `POST /api/groups` and `PATCH /api/groups/:slug` — same dual approach for cover images
- `GET /api/groups/:slug/threads/:id` — thread and post responses include `attachments[]` array

## UI Changes

### Avatar Upload (Profile Page)

- Replace the "Avatar URL" text input with a dual option:
  - **Upload** tab: file picker with drag-and-drop area, shows preview
  - **URL** tab: text input for external URL (existing behavior)
- Show current avatar with a "Change" overlay on hover

### Group Cover Upload (Create/Edit Group)

- Replace "Cover image URL" input with same dual upload/URL approach
- Show image preview after selection

### Thread & Comment Attachments

- Add attachment button (paperclip icon) next to the textarea in:
  - Create thread form
  - Post comment form
  - Reply form
- Show thumbnails of selected files below the textarea before posting
- After posting, display attached images inline below the text content
- Click to expand/view full size (Bootstrap modal or lightbox)

### Image Display

- Attached images render as thumbnails (max-height 300px) in a flex row
- Clicking opens a simple modal with the full image
- Images in Markdown (`![alt](url)`) continue to work as before

## Security

- **File type validation:** Check both MIME type and file extension; reject mismatches
- **File size limit:** 5 MB enforced by multer
- **Path traversal:** Files renamed to UUIDs; stored names never include user input
- **Serving:** Files served via Express static middleware (or reverse proxy in production)
- **Access control for private groups:** Attachment URLs are unguessable (UUID-based), but publicly accessible. For true private group support, a signed URL or auth-checked proxy would be needed (out of scope for v2)

## Out of Scope (v2)

- Image resizing/thumbnailing (serve originals only)
- Non-image file attachments (PDF, etc.)
- S3/cloud storage integration (filesystem only for now)
- Signed URLs for private group attachments
- Drag-and-drop image paste into Markdown textarea
- Video uploads
