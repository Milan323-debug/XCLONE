import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, ActivityIndicator, FlatList, Image, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../constants/api';
import { useAuthStore } from '../store/authStore';

const CommentsModal = ({ selectedPost, onClose, onCommentCreated, onCommentDeleted }: { selectedPost?: any; onClose?: () => void, onCommentCreated?: () => void, onCommentDeleted?: () => void }) => {
  const [comments, setComments] = useState<any[]>([]);
  const [fetchedPost, setFetchedPost] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [posting, setPosting] = useState(false);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const token = useAuthStore((s) => s.token);
  const currentUser = useAuthStore((s) => s.user);

  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    if (selectedPost) {
      setPage(1);
      fetchComments(1);
    }
  }, [selectedPost]);

  // Guard: avoid rendering modal content when no selectedPost — prevents null deref
  if (!selectedPost) return null;

  const fetchComments = async (requestedPage = 1) => {
    if (!selectedPost) return;
    if (requestedPage === 1) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }
    try {
      const res = await fetch(`${API_URL}/api/comments/post/${selectedPost._id}?page=${requestedPage}&limit=${limit}`);
      if (!res.ok) throw new Error('Failed to load comments');
      const json = await res.json();
      if (requestedPage === 1) {
        setComments(json.comments || []);
      } else {
        setComments((prev) => [...prev, ...(json.comments || [])]);
      }
      if (json.post) setFetchedPost(json.post);
      setTotal(typeof json.total === 'number' ? json.total : null);
      setPage(requestedPage);
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const submitComment = async () => {
    if (!token) return Alert.alert('Not signed in');
    if (!text.trim()) return;
    setPosting(true);
    try {
      const body: any = { content: text.trim() };
      if (replyTo) body.parentComment = replyTo;
      const res = await fetch(`${API_URL}/api/comments/post/${selectedPost._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.message || 'Failed to post comment');
      // prepend new comment
  setComments((c) => [json.comment, ...c]);
  // clear reply state when posted
  setReplyTo(null);
  if (typeof onCommentCreated === 'function') onCommentCreated();
      setText('');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not post comment');
    } finally {
      setPosting(false);
    }
  };

  const removeComment = async (commentId: string) => {
    if (!token) return Alert.alert('Not signed in');
    Alert.alert('Delete comment', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const res = await fetch(`${API_URL}/api/comments/${commentId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error('Delete failed');
          setComments((c) => c.filter((x) => x._id !== commentId));
          if (typeof onCommentDeleted === 'function') onCommentDeleted();
        } catch (e: any) {
          Alert.alert('Delete failed', e.message || 'Failed to delete comment');
        }
      }}
    ]);
  };

  return (
    <Modal visible={!!selectedPost} animationType="slide" onRequestClose={() => onClose && onClose()}>
      <View style={styles.containerModal}>
        <View style={styles.header}>
          <Text style={styles.title}>Comments</Text>
          <TouchableOpacity onPress={() => onClose && onClose()}>
            <Text style={styles.close}>Close</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.postPreview}>
          <Text style={{ color: '#111', fontWeight: '700' }}>{(fetchedPost?.user?.username) || selectedPost.user?.username || 'Unknown'}</Text>
          <Text style={{ color: '#333', marginTop: 6 }}>{fetchedPost?.content ?? selectedPost.content}</Text>
          {/* show image if available */}
          {fetchedPost?.image ? (
            <Image source={{ uri: fetchedPost.image }} style={{ width: '100%', height: 180, marginTop: 8, borderRadius: 8 }} />
          ) : selectedPost.image ? (
            <Image source={{ uri: selectedPost.image }} style={{ width: '100%', height: 180, marginTop: 8, borderRadius: 8 }} />
          ) : null}
        </View>

        {loading ? (
          <View style={{ padding: 16, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#1DA1F2" />
          </View>
        ) : error ? (
          <View style={{ padding: 16 }}>
            <Text style={{ color: '#f00' }}>{error}</Text>
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(i) => i._id}
            renderItem={({ item }) => {
              // only render top-level comments here; replies rendered nested below
              if (item.parentComment) return null;
              const isLiked = Array.isArray(item.likes) && item.likes.some((l: any) => l.toString() === (currentUser?._id || ''));
              return (
                <View>
                  <View style={styles.commentRow}>
                    <Image source={{ uri: item.user?.profileImage || 'https://i.pravatar.cc/40' }} style={styles.avatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.commentUser}>{item.user?.username || 'User'}</Text>
                      <Text style={styles.commentText}>{item.content}</Text>
                      <View style={{ flexDirection: 'row', marginTop: 6, alignItems: 'center' }}>
                        <TouchableOpacity
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          accessible
                          accessibilityLabel="Like comment"
                          onPress={async () => {
                            if (!token || !currentUser) return Alert.alert('Not signed in');
                            // optimistic toggle
                            const prev = comments;
                            const uid = currentUser?._id;
                            setComments((cs) => cs.map((c) => c._id === item._id ? { ...c, likes: Array.isArray(c.likes) ? (isLiked ? c.likes.filter((x: any) => x.toString() !== uid) : [...c.likes, uid]) : [uid] } : c));
                            try {
                              const res = await fetch(`${API_URL}/api/comments/${item._id}/like`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
                              let body: any = {};
                              try { body = await res.json(); } catch (err) { body = {}; }
                              if (res.status === 401) {
                                console.warn('like backend response 401', body);
                                return Alert.alert('Not authorized', body?.message || body?.error || '');
                              }
                              if (!res.ok) {
                                console.warn('like backend response', res.status, body);
                                const errMsg = body?.error || body?.message || `Status ${res.status}`;
                                throw new Error(errMsg);
                              }
                              // success
                              setComments((cs) => cs.map((c) => c._id === item._id ? (body?.comment ?? c) : c));
                            } catch (e: any) {
                              console.warn('like error', e.message || e);
                              setComments(prev);
                              Alert.alert('Error', e.message || 'Failed to like comment');
                            }
                          }} style={{ marginRight: 12 }}>
                          <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={18} color={isLiked ? '#F91880' : '#536471'} />
                        </TouchableOpacity>
                        <Text style={{ color: '#6b7280', marginRight: 12 }}>{(item.likes && item.likes.length) || 0}</Text>
                        <TouchableOpacity
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          accessible
                          accessibilityLabel="Dislike comment"
                          onPress={async () => {
                            if (!token || !currentUser) return Alert.alert('Not signed in');
                            const prev = comments;
                            const uid = currentUser?._id;
                            setComments((cs) => cs.map((c) => c._id === item._id ? { ...c, dislikes: Array.isArray(c.dislikes) ? (c.dislikes.some((d: any) => d.toString() === uid) ? c.dislikes.filter((x: any) => x.toString() !== uid) : [...(c.dislikes || []), uid]) : [uid] } : c));
                            try {
                              const res = await fetch(`${API_URL}/api/comments/${item._id}/dislike`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
                              let body: any = {};
                              try { body = await res.json(); } catch (err) { body = {}; }
                              if (res.status === 401) {
                                console.warn('dislike backend response 401', body);
                                return Alert.alert('Not authorized', body?.message || body?.error || '');
                              }
                              if (!res.ok) {
                                console.warn('dislike backend response', res.status, body);
                                const errMsg = body?.error || body?.message || `Status ${res.status}`;
                                throw new Error(errMsg);
                              }
                              setComments((cs) => cs.map((c) => c._id === item._id ? (body?.comment ?? c) : c));
                            } catch (e: any) {
                              console.warn('dislike error', e.message || e);
                              setComments(prev);
                              Alert.alert('Error', e.message || 'Failed to dislike comment');
                            }
                          }} style={{ marginRight: 12 }}>
                          <Ionicons name={'thumbs-down-outline'} size={18} color={'#536471'} />
                        </TouchableOpacity>
                        <Text style={{ color: '#6b7280', marginRight: 12 }}>{(item.dislikes && item.dislikes.length) || 0}</Text>
                        <TouchableOpacity onPress={() => setReplyTo(item._id)}>
                          <Text style={{ color: '#1DA1F2' }}>Reply</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => {
                      // three dots menu
                      const buttons: any[] = [{ text: 'Cancel', style: 'cancel' }];
                      if (currentUser && item.user && currentUser._id === item.user._id) {
                        buttons.unshift({ text: 'Delete', style: 'destructive', onPress: () => removeComment(item._id) });
                      }
                      Alert.alert('Options', undefined, buttons as any);
                    }} style={{ padding: 8 }}>
                      <Ionicons name="ellipsis-vertical" size={18} color="#536471" />
                    </TouchableOpacity>
                  </View>
                  {/* replies */}
                  {comments.filter((c) => String(c.parentComment || '') === String(item._id)).map((reply) => (
                    <View key={reply._id} style={{ flexDirection: 'row', marginTop: 8, marginLeft: 48 }}>
                      <Image source={{ uri: reply.user?.profileImage }} style={{ width: 32, height: 32, borderRadius: 16, marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#0f172a', fontWeight: '600' }}>{reply.user?.name || reply.user?.username}</Text>
                        <Text style={{ color: '#334155' }}>{reply.content}</Text>
                        <View style={{ flexDirection: 'row', marginTop: 6 }}>
                          <Text style={{ color: '#6b7280', marginRight: 12 }}>{(reply.likes && reply.likes.length) || 0} likes</Text>
                          <Text style={{ color: '#6b7280' }}>{(reply.dislikes && reply.dislikes.length) || 0} dislikes</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              );
            }}
          />
        )}

        {/* load more button when there are more comments */}
        {total !== null && comments.length < (total || 0) ? (
          <View style={{ padding: 12, alignItems: 'center' }}>
            {loadingMore ? (
              <ActivityIndicator size="small" color="#1DA1F2" />
            ) : (
              <TouchableOpacity onPress={() => fetchComments(page + 1)} style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#eef2ff', borderRadius: 8 }}>
                <Text style={{ color: '#1f2937' }}>Load more comments</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        <View style={styles.composer}>
          <Image source={{ uri: currentUser?.profileImage || 'https://i.pravatar.cc/40' }} style={styles.avatarSmall} />
          <View style={{ flex: 1 }}>
            {replyTo ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ color: '#374151' }}>Replying to </Text>
                <Text style={{ color: '#1DA1F2', fontWeight: '700' }}>{comments.find((c) => String(c._id) === String(replyTo))?.user?.username || 'user'}</Text>
                <TouchableOpacity onPress={() => setReplyTo(null)} style={{ marginLeft: 8 }}>
                  <Text style={{ color: '#ef4444' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            <TextInput placeholder={replyTo ? 'Write a reply...' : 'Write a comment...'} value={text} onChangeText={setText} style={styles.input} editable={!posting} />
          </View>
          <TouchableOpacity onPress={submitComment} disabled={posting || !text.trim()} style={styles.sendBtn}>
            <Text style={{ color: posting ? '#aaa' : '#fff' }}>{posting ? '...' : 'Send'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default CommentsModal;

const styles = StyleSheet.create({
  containerModal: { flex: 1, backgroundColor: '#fff', padding: 12, paddingTop: 20 },
  container: { position: 'absolute', bottom: 0, left: 0, right: 0, top: 80, backgroundColor: '#fff', padding: 12, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontWeight: '700', fontSize: 16 },
  close: { color: '#1DA1F2', fontWeight: '700' },
  postPreview: { padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, marginBottom: 8 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 8 },
  avatarSmall: { width: 36, height: 36, borderRadius: 18, marginRight: 8 },
  commentUser: { fontWeight: '700' },
  commentText: { color: '#374151' },
  composer: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#eee' },
  input: { flex: 1, minHeight: 40, paddingHorizontal: 12, backgroundColor: '#f3f4f6', borderRadius: 20 },
  sendBtn: { marginLeft: 8, backgroundColor: '#1DA1F2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
});
