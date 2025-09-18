import { useCurrentUser } from "../hooks/useCurrentUser";
import { usePosts } from "../hooks/usePosts";
import { Post } from "../types";
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from "react-native";
import PostCard from "./PostCard";
import { useState } from "react";
import CommentsModal from "./CommentsModal";

const PostsList = ({ username }: { username?: string }) => {
  const { currentUser } = useCurrentUser();
  const { posts, isLoading, error, refetch, toggleLike, deletePost, checkIsLiked } =
    usePosts(username);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const selectedPost = selectedPostId ? posts.find((p: Post) => p._id === selectedPostId) : null;

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1DA1F2" />
        <Text style={styles.hint}>Loading posts...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>Failed to load posts</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>No posts yet</Text>
      </View>
    );
  }

  return (
    <>
      {posts.map((post: Post) => (
        <PostCard
          key={post._id}
          post={post}
          onLike={toggleLike}
          onDelete={deletePost}
          onComment={(post: Post) => setSelectedPostId(post._id)}
          currentUser={currentUser}
          isLiked={checkIsLiked(post.likes, currentUser)}
        />
      ))}

      <CommentsModal selectedPost={selectedPost} onClose={() => setSelectedPostId(null)} />
    </>
  );
};

export default PostsList;

const styles = StyleSheet.create({
  center: { padding: 24, alignItems: 'center' },
  hint: { color: '#6b7280', marginTop: 8 },
  retryBtn: { backgroundColor: '#1DA1F2', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginTop: 12 },
  retryText: { color: '#fff', fontWeight: '700' },
});