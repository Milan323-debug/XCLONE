export interface User {
  _id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
}

export interface Post {
  _id: string;
  content: string;
  image?: string;
  media?: {
    url: string;
    type: string;
  }[];
}

export interface Comment {
  _id: string;
  content: string;
}

export interface Notification {
  _id: string;
  type: 'like' | 'comment' | 'reply' | 'follow' | 'like_comment';
  from: User;
  to: string;
  post?: Post;
  comment?: Comment;
  createdAt: string;
}