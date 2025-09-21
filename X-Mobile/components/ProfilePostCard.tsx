import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatRelativeTime } from '../lib/timeUtils';
import { useRouter } from 'expo-router';

type Props = {
  post?: any;
  onDelete?: (postId: string) => Promise<void> | void;
  currentUser?: any;
};

const ProfilePostCard: React.FC<Props> = ({ post, onDelete, currentUser }) => {
  const isOwner = React.useMemo(() => 
    currentUser?._id === (post?.user?._id || post?.userId?._id || post?.userId),
    [currentUser?._id, post?.user?._id, post?.userId]
  );
  const router = useRouter();
  
  const formattedDate = React.useMemo(() => 
    post?.createdAt ? formatRelativeTime(post.createdAt) : '',
    [post?.createdAt]
  );

  return (
    <View style={styles.container}>
      {isOwner && (
        <TouchableOpacity 
          onPress={() => {
            Alert.alert('Delete post', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Delete',
                style: 'destructive',
                onPress: () => onDelete && onDelete(post?._id)
              }
            ]);
          }}
          style={styles.deleteButton}
          activeOpacity={0.7}
        >
          <Ionicons name="ellipsis-horizontal" size={18} color="#536471" />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          const author = post?.user || post?.userId || {};
          const isMe = currentUser?._id && (currentUser._id === (author?._id || author?.id || author?._ref));
          if (isMe) {
            router.push('/(tabs)/profile');
          }
        }}
        style={styles.postContentContainer}
      >
        {
          // prefer Cloudinary-generated poster for videos, fall back to media url or legacy image fields
          (() => {
            const mediaUrl = post?.media?.url || post?.image || post?.imageUrl || null;
            const poster = post?.media?.poster || null;
            const isVideo = post?.media?.type === 'video' || (post?.media && typeof post.media === 'object' && post.media.type === 'video');
            const imageSource = isVideo ? (poster || mediaUrl) : mediaUrl;
            if (!imageSource) return null;
            return (
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: imageSource }}
                  style={styles.postImage}
                  resizeMode="cover"
                  progressiveRenderingEnabled={true}
                />
                {isVideo && (
                  <View style={styles.playOverlay} pointerEvents="none">
                    <Ionicons name="play" size={28} color="rgba(255,255,255,0.95)" />
                  </View>
                )}
              </View>
            );
          })()
        }
        <View style={styles.metadataContainer}>
          <Text style={styles.content} numberOfLines={3}>
            {post?.content}
          </Text>
          <View style={styles.metadata}>
            <Text style={styles.metadataText}>
              <Text style={styles.metadataLabel}>Posted: </Text>
              {formattedDate}
            </Text>
          </View>
          <View style={styles.metadata}>
            <Text style={styles.metadataText}>
              <Text style={styles.metadataLabel}>Likes: </Text>
              {post?.likes?.length || 0}
            </Text>
            <Text style={styles.metadataText}>
              <Text style={styles.metadataLabel}>Comments: </Text>
              {post?.comments?.length || 0}
            </Text>
          </View>
          {post?.comments?.[0] && (
            <Text style={styles.firstComment} numberOfLines={2}>
              <Text style={styles.commentLabel}>First comment: </Text>
              {post.comments[0].content}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: '#fff',
    marginVertical: 8,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 8,
    zIndex: 1,
  },
  postContentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  postImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#EFF3F4',
  },
  imageWrapper: {
    position: 'relative',
  },
  playOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 8,
  },
  metadataContainer: {
    flex: 1,
    marginLeft: 16,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    color: '#0F1419',
    marginBottom: 12,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 16,
  },
  metadataText: {
    fontSize: 13,
    color: '#536471',
  },
  metadataLabel: {
    fontSize: 13,
    color: '#536471',
    fontWeight: '500',
  },
  firstComment: {
    fontSize: 14,
    color: '#536471',
    marginTop: 12,
    lineHeight: 18,
  },
  commentLabel: {
    fontSize: 14,
    color: '#536471',
    fontWeight: '500',
  },
});

export default React.memo(ProfilePostCard);