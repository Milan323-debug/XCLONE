export type Post = {
  _id: string;
  content?: string;
  image?: string | { secure_url?: string };
  imageUrl?: string;
  media?: { url?: string; type?: 'image' | 'video'; poster?: string };
  likes?: string[];
  comments?: any[];
  user?: User;
  userId?: User | string | undefined;
  createdAt?: string;
};

export type User = {
  _id?: string;
  id?: string;
  _ref?: string;
  name?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string | { secure_url?: string };
  bio?: string;
  followers?: string[] | any[];
  following?: string[] | any[];
};

export type PostWithCommentUpdate = Post & {
  onCommentUpdate: ({ newCount }: { newCount: number }) => void;
};

export type CommentUpdate = {
  postId: string;
  newCount: number;
};
