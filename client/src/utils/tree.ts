export interface PostNode {
  id: string;
  threadId: string;
  authorId: string;
  body: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string; avatarUrl: string | null };
  attachments: { id: string; filename: string; url: string }[];
  likeCount: number;
  userLiked: boolean;
  children: PostNode[];
}

export function buildPostTree(posts: any[]): PostNode[] {
  const map = new Map<string, PostNode>();
  const roots: PostNode[] = [];

  // Initialize nodes with empty children arrays
  for (const post of posts) {
    map.set(post.id, { ...post, children: [] });
  }

  // Build tree
  for (const post of posts) {
    const node = map.get(post.id)!;
    if (post.parentId && map.has(post.parentId)) {
      map.get(post.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
