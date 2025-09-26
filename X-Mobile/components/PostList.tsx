import { useCurrentUser } from "../hooks/useCurrentUser";
import { usePosts } from "../hooks/usePosts";
import { Post, PostWithCommentUpdate } from "../types";
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import PostCard from "./PostCard";
import React from "react";
import { useState, useCallback } from "react";
import CommentsModal from "./CommentsModal";

// ...existing code...

interface PostsListProps {
  username?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}

const PostsList = ({ username, onRefresh, refreshing }: PostsListProps) => {
  const { currentUser } = useCurrentUser();
  const { posts, isLoading, isLoadingMore, error, refetch, toggleLike, deletePost, checkIsLiked, loadMore, hasMore } =
    usePosts(username);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  // typed as PostWithCommentUpdate when available so calling onCommentUpdate is type-safe
  const selectedPost = selectedPostId ? (posts.find((p: Post) => p._id === selectedPostId) as PostWithCommentUpdate | undefined) : undefined;

  const MemoPostCard = React.memo(PostCard);
  const renderItem = useCallback(({ item: post }: { item: Post }) => (
    <MemoPostCard
      key={post._id}
      post={post}
      onLike={toggleLike}
      onDelete={deletePost}
      onComment={(post: PostWithCommentUpdate) => setSelectedPostId(post._id)}
      currentUser={currentUser}
      isLiked={checkIsLiked(post.likes, currentUser)}
    />
  ), [currentUser, toggleLike, deletePost, checkIsLiked]);

  const keyExtractor = useCallback((item: Post) => item._id, []);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: 150,
    offset: 150 * index,
    index,
  }), []);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#23D5D5" />
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
      <FlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={true}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (hasMore && !isLoadingMore) {
            loadMore();
          }
        }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListHeaderComponent={<View style={{ height: 10 }} />}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListFooterComponent={() => {
          if (isLoadingMore) {
            return (
              <View style={{ padding: 12, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#23D5D5" />
              </View>
            );
          }
          if (hasMore) {
            return (
              <View style={{ padding: 12, alignItems: 'center' }}>
                <TouchableOpacity style={styles.retryBtn} onPress={() => loadMore()}>
                  <Text style={styles.retryText}>Load more</Text>
                </TouchableOpacity>
              </View>
            );
          }
          return <View style={{ height: 40 }} />;
        }}
      />

      <CommentsModal
        selectedPost={selectedPost}
        onClose={() => setSelectedPostId(null)}
        onCommentCreated={update => {
          if (selectedPost?.onCommentUpdate) {
            selectedPost.onCommentUpdate({ newCount: update.newCount });
          }
        }}
        onCommentDeleted={update => {
          if (selectedPost?.onCommentUpdate) {
            selectedPost.onCommentUpdate({ newCount: update.newCount });
          }
        }}
      />
    </>
  );
};

export default PostsList;

const styles = StyleSheet.create({
  center: { 
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: { 
    color: '#6b7280', 
    marginTop: 8 
  },
  retryBtn: { 
    backgroundColor: '#23D5D5', 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 8, 
    marginTop: 12 
  },
  retryText: { 
    color: '#fff', 
    fontWeight: '700' 
  },
});