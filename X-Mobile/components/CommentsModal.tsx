import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, ActivityIndicator, FlatList, Image, TextInput, TouchableOpacity, Alert, Pressable } from 'react-native';
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

  // small pressable wrapper for consistent touch feedback
  const TouchableFeedback = ({ children, style, onPress, hitSlop, accessibilityLabel }: any) => (
    <Pressable
      onPress={onPress}
      hitSlop={hitSlop}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [style, { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      {children}
    </Pressable>
  );

  const submitComment = async () => {
    if (!token) return Alert.alert('Not signed in');
    if (!text.trim()) return;
    setPosting(true);
    try {
      const body: any = { 
        content: text.trim(),
        parentComment: replyTo || null
      };
      
      const res = await fetch(`${API_URL}/api/comments/post/${selectedPost._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.message || 'Failed to post comment');
      
      // Add the new comment to the list
      setComments((currentComments) => {
        const newComment = { ...json.comment, user: currentUser }; // Add user info to new comment
        
        if (replyTo) {
          // For replies, find the parent comment and add the reply to its replies array
          return currentComments.map(c => {
            if (c._id === replyTo) {
              return {
                ...c,
                replies: [...(c.replies || []), newComment]
              };
            }
            return c;
          });
        }
        
        // For top-level comments, add to the beginning
        return [newComment, ...currentComments];
      });
      
      // Clear reply state when posted
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
        <View style={[styles.header, { paddingTop: 40 }]}>
          <TouchableFeedback onPress={() => onClose && onClose()} style={{ padding: 8 }} accessibilityLabel="Back">
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableFeedback>
          <Text style={styles.title}>Comments</Text>
          <View style={{ width: 40 }} />
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
            contentContainerStyle={{ paddingBottom: 100 }}
            renderItem={({ item }) => {
              const isLiked = Array.isArray(item.likes) && item.likes.some((l: any) => l.toString() === (currentUser?._id || ''));
              
              return (
                <View style={styles.threadContainer}>
                  <View style={styles.commentRow}>
                    <Image source={{ uri: item.user?.profileImage || 'https://i.pravatar.cc/40' }} style={styles.avatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.commentUser}>{item.user?.username || 'User'}</Text>
                      <Text style={styles.commentText}>{item.content}</Text>
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={styles.actionButton}
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
                          }}>
                          <View style={styles.actionButton}>
                            <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={20} color={isLiked ? '#F91880' : '#64748b'} />
                            <Text style={styles.actionText}>{(item.likes && item.likes.length) || 0}</Text>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
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
                          }}>
                          <View style={styles.actionButton}>
                            <Ionicons name={'thumbs-down-outline'} size={20} color={'#64748b'} />
                            <Text style={styles.actionText}>{(item.dislikes && item.dislikes.length) || 0}</Text>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.actionButton, { backgroundColor: '#e8f5fe' }]}
                          onPress={() => setReplyTo(item._id)}
                          accessibilityLabel="Reply to comment"
                        >
                          <Ionicons name="chatbubble-outline" size={18} color="#1DA1F2" />
                          <Text style={[styles.actionText, { color: '#1DA1F2' }]}>Reply</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <TouchableFeedback onPress={() => {
                      // three dots menu
                      const buttons: any[] = [{ text: 'Cancel', style: 'cancel' }];
                      if (currentUser && item.user && currentUser._id === item.user._id) {
                        buttons.unshift({ text: 'Delete', style: 'destructive', onPress: () => removeComment(item._id) });
                      }
                      Alert.alert('Options', undefined, buttons as any);
                    }} style={{ padding: 8 }} accessibilityLabel="Comment options">
                      <Ionicons name="ellipsis-vertical" size={18} color="#536471" />
                    </TouchableFeedback>
                  </View>
                  {/* Render replies */}
                  {item.replies && item.replies.length > 0 && (
                    <View style={styles.repliesContainer}>
                      {item.replies.map((reply: any) => (
                        <View key={reply._id} style={styles.replyRow}>
                          <View style={styles.replyLine} />
                          <View style={styles.replyContent}>
                            <Image 
                              source={{ uri: reply.user?.profileImage || 'https://i.pravatar.cc/32' }} 
                              style={styles.replyAvatar} 
                            />
                            <View style={styles.replyTextContainer}>
                              <Text style={styles.replyUsername}>
                                {reply.user?.name || reply.user?.username}
                              </Text>
                              <Text style={styles.replyText}>{reply.content}</Text>
                              <View style={styles.replyActions}>
                                <TouchableOpacity style={styles.replyActionButton}>
                                  <Ionicons name={reply.likes?.includes(currentUser?._id) ? 'heart' : 'heart-outline'} 
                                    size={16} 
                                    color={reply.likes?.includes(currentUser?._id) ? '#F91880' : '#64748b'} 
                                  />
                                  <Text style={styles.replyActionText}>
                                    {(reply.likes && reply.likes.length) || 0}
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.replyActionButton}>
                                  <Ionicons name="thumbs-down-outline" size={16} color="#64748b" />
                                  <Text style={styles.replyActionText}>
                                    {(reply.dislikes && reply.dislikes.length) || 0}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
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
              <TouchableFeedback onPress={() => fetchComments(page + 1)} style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#eef2ff', borderRadius: 8 }} accessibilityLabel="Load more comments">
                <Text style={{ color: '#1f2937' }}>Load more comments</Text>
              </TouchableFeedback>
            )}
          </View>
        ) : null}

        <View style={styles.inputContainer}>
          <View style={styles.composer}>
            <Image source={{ uri: currentUser?.profileImage || 'https://i.pravatar.cc/40' }} style={styles.avatarSmall} />
            <View style={{ flex: 1 }}>
              {replyTo ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ color: '#374151' }}>Replying to </Text>
                  <Text style={{ color: '#1DA1F2', fontWeight: '700' }}>{comments.find((c) => String(c._id) === String(replyTo))?.user?.username || 'user'}</Text>
                  <TouchableFeedback onPress={() => setReplyTo(null)} style={{ marginLeft: 8 }} accessibilityLabel="Cancel reply">
                    <Text style={{ color: '#ef4444' }}>Cancel</Text>
                  </TouchableFeedback>
                </View>
              ) : null}
              <TextInput
                placeholder={replyTo ? 'Write a reply...' : 'Write a comment...'}
                value={text}
                onChangeText={setText}
                style={styles.input}
                editable={!posting}
                multiline
                maxLength={1000}
              />
            </View>
            <TouchableOpacity
              onPress={submitComment}
              style={[styles.sendBtn, { opacity: posting || !text.trim() ? 0.5 : 1 }]}
              disabled={posting || !text.trim()}
              activeOpacity={0.7}
            >
              <Text style={styles.sendBtnText}>Post</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CommentsModal;

const styles = StyleSheet.create({
  containerModal: { 
    flex: 1, 
    backgroundColor: '#fff'
  },
  container: { 
    flex: 1,
    backgroundColor: '#fff'
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fff',
    paddingBottom: 34,
    paddingHorizontal: 16,
    paddingTop: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: { 
    fontWeight: '700', 
    fontSize: 18,
    color: '#0f172a'
  },
  close: { 
    color: '#1DA1F2', 
    fontWeight: '600'
  },
  postPreview: { 
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    margin: 16,
    marginTop: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  commentRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    marginVertical: 4,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  avatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    marginRight: 12,
    backgroundColor: '#f1f5f9'
  },
  avatarSmall: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    marginRight: 12,
    backgroundColor: '#f1f5f9'
  },
  commentUser: { 
    fontWeight: '600',
    fontSize: 15,
    color: '#0f172a',
    marginBottom: 4
  },
  commentText: { 
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8
  },
  composer: { 
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  input: { 
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    fontSize: 14,
    color: '#0f172a'
  },
  sendBtn: { 
    marginLeft: 12,
    backgroundColor: '#1DA1F2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    elevation: 1,
    shadowColor: '#1DA1F2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sendBtnText: { 
    color: '#fff', 
    fontWeight: '600', 
    fontSize: 15 
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#f8fafc'
  },
  actionText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4
  },
  threadContainer: {
    marginBottom: 16
  },
  repliesContainer: {
    marginLeft: 20,
    marginTop: 4
  },
  replyRow: {
    flexDirection: 'row',
    marginTop: 8,
    position: 'relative'
  },
  replyLine: {
    position: 'absolute',
    left: 16,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#e2e8f0',
    borderRadius: 1
  },
  replyContent: {
    flex: 1,
    flexDirection: 'row',
    paddingLeft: 32,
    paddingRight: 16
  },
  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    backgroundColor: '#f1f5f9'
  },
  replyTextContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 8,
    paddingHorizontal: 12
  },
  replyUsername: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2
  },
  replyText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18
  },
  replyActions: {
    flexDirection: 'row',
    marginTop: 4,
    paddingTop: 4
  },
  replyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    padding: 4
  },
  replyActionText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 3
  },
});
