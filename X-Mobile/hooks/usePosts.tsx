import { useEffect, useState } from 'react';
import { API_URL } from '../constants/api';
import { useAuthStore } from '../store/authStore';

// A module-scoped refetch trigger which create-post can call after success
export let triggerRefetch: () => void = () => {};

export const usePosts = (username?: string) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<any>(null);
  const token = useAuthStore((s) => s.token);
  const PAGE_LIMIT = 5;
  const [skip, setSkip] = useState(0);

  const fetchPosts = async (opts?: { append?: boolean; skip?: number }) => {
    const append = opts?.append || false;
    const _skip = typeof opts?.skip === 'number' ? opts!.skip! : 0;
    if (append) setIsLoadingMore(true); else setIsLoading(true);
    setError(null);
    try {
      const base = API_URL.replace(/\/$/, '');
      const urlBase = username ? `${base}/api/posts/user/${encodeURIComponent(username)}` : `${base}/api/posts`;
      const url = `${urlBase}?limit=${PAGE_LIMIT}&skip=${_skip}`;
      const res = await fetch(url);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed to fetch posts');
      }
      const data = await res.json();
      const fetched: any[] = data.posts || [];
      if (append) {
        setPosts((prev) => [...prev, ...fetched]);
        setSkip((s) => s + fetched.length);
      } else {
        setPosts(fetched);
        setSkip(fetched.length);
      }
      setTotal(typeof data.total === 'number' ? data.total : null);
    } catch (err) {
      setError(err);
    } finally {
      if (append) setIsLoadingMore(false); else setIsLoading(false);
    }
  };

  useEffect(() => {
    // initial load
    setSkip(0);
    void fetchPosts({ append: false, skip: 0 });
    // publish refetch
    triggerRefetch = fetchPosts;
    return () => {
      // reset trigger if unmounted
      triggerRefetch = () => {};
    };
  }, [username]);

  const refetch = async () => {
    setSkip(0);
    await fetchPosts({ append: false, skip: 0 });
  };

  const loadMore = async () => {
    // don't load more if already loading, or we already have all items
    if (isLoadingMore) return;
    if (typeof total === 'number' && posts.length >= total) return;
    await fetchPosts({ append: true, skip });
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
      // Success - no need to refetch
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

  const updatePostLocally = (postId: string, updates: Partial<any>) => {
    setPosts((ps) =>
      ps.map((p) => {
        if ((p._id || p.id) !== postId) return p;
        return { ...p, ...updates };
      })
    );
  };

  return { 
    posts, 
    isLoading, 
    isLoadingMore,
    error, 
    refetch, 
    loadMore,
    hasMore: typeof total === 'number' ? posts.length < total : true,
    toggleLike, 
    deletePost,
    updatePostLocally,
    checkIsLiked
  };
};

export default usePosts;
