export function renderPostForm(slug: string, threadId: string): string {
  return `
    <form id="post-form" class="mb-4">
      <textarea class="form-control mb-2" rows="3" required placeholder="Write a comment... (Markdown supported)"></textarea>
      <button type="submit" class="btn btn-primary btn-sm">Post Comment</button>
    </form>
  `;
}
