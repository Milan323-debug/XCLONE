import { useEffect, useState } from 'react';
import { API_URL } from '../constants/api';
import { useAuthStore } from '../store/authStore';

// A module-scoped refetch trigger which create-post can call after success
export let triggerRefetch: () => void = () => {};

export const usePosts = (username?: string) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const token = useAuthStore((s) => s.token);

  const fetchPosts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = username ? `${API_URL}api/posts/user/${username}` : `${API_URL}api/posts`;
      const res = await fetch(url);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed to fetch posts');
      }
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchPosts();
    // publish refetch
    triggerRefetch = fetchPosts;
    return () => {
      // reset trigger if unmounted
      triggerRefetch = () => {};
    };
  }, [username]);

  const refetch = async () => {
    await fetchPosts();
  };

  const toggleLike = async (postId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    // snapshot for revert
    const prev = posts;

    // optimistic update
    setPosts((ps) =>
      ps.map((p) => {
        if ((p._id || p.id) !== postId) return p;
        const likes = Array.isArray(p.likes) ? [...p.likes] : [];
        const has = likes.some((l: any) => l.toString() === user._id?.toString());
        if (has) {
          return { ...p, likes: likes.filter((l: any) => l.toString() !== user._id?.toString()) };
        }
        return { ...p, likes: [...likes, user._id] };
      })
    );

    try {
      const t = token;
      const res = await fetch(`${API_URL}api/posts/${postId}/like`, {
        method: 'POST',
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      if (!res.ok) throw new Error('Failed to toggle like');
      // optionally refresh from server to get exact counts
      await fetchPosts();
    } catch (err) {
      console.error('toggleLike error', err);
      // revert optimistic update on error
      setPosts(prev);
    }
  };

  const deletePost = async (postId: string) => {
    try {
      const t = token;
      if (!t) {
        console.error('deletePost error: no auth token (user not signed in)');
        return;
      }

      const res = await fetch(`${API_URL}api/posts/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${t}` },
      });

      if (!res.ok) {
        let bodyText = '';
        try {
          bodyText = await res.text();
        } catch (e) {
          bodyText = '<unable to read response body>';
        }
        console.error(`deletePost failed: status=${res.status} body=${bodyText}`);
        throw new Error(`Failed to delete post: ${res.status} ${bodyText}`);
      }

      await fetchPosts();
    } catch (err) {
      console.error('deletePost error', err);
    }
  };

  const checkIsLiked = (likes: any[] = [], user: any) => {
    if (!user) return false;
    return likes && likes.some((l: any) => l.toString() === user._id?.toString());
  };

  return { posts, isLoading, error, refetch, toggleLike, deletePost, checkIsLiked };
};

export default usePosts;
