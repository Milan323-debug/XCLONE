export interface User {
  _id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  profileImage?: string | { secure_url?: string };
  avatar?: string;
}

export interface Post {
  _id: string;
  content?: string;
  user?: User | null;
  userId?: string | null;
  media?: { url?: string; type?: 'image' | 'video'; poster?: string } | null;
  image?: string | { secure_url?: string } | null;
  imageUrl?: string | null;
  likes?: Array<string | { _id: string }>;
  comments?: any[];
  createdAt?: string;
}

export interface PostWithCommentUpdate extends Post {
  onCommentUpdate: (update: { newCount: number }) => void;
}

export interface CommentUpdate {
  postId: string;
  newCount: number;
}