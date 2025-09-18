export type Post = {
  _id: string;
  content?: string;
  image?: string | { secure_url?: string };
  likes?: any[];
};

export type User = {
  _id?: string;
  name?: string;
  profileImage?: string | { secure_url?: string };
};
