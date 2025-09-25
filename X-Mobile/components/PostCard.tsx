import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, Alert, Share } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { formatRelativeTime } from '../lib/timeUtils';
import UserProfileModal from './UserProfileModal';
import { useAuthStore } from '../store/authStore';
import FollowButton from './FollowButton';
import { getProfileImageUri } from '../lib/utils';

import type { Post, User, PostWithCommentUpdate } from '../types';

interface Props {
  post?: Post;
  onLike?: (postId: string) => void;
  onDelete?: (postId: string) => Promise<void> | void;
  onComment?: (post: PostWithCommentUpdate) => void;
  currentUser?: User;
  isLiked?: boolean;
}

const { width } = Dimensions.get('window');

const PostCard: React.FC<Props> = ({ post, onLike, onDelete, onComment, currentUser, isLiked }) => {
  const videoRef = React.useRef<Video | null>(null);
  const router = useRouter();
  const [commentCount, setCommentCount] = React.useState(post?.comments?.length || 0);
  const [showProfileModal, setShowProfileModal] = useState(false);
  // author may be a User object or just an id/ref; narrow to a loose object shape for local use
  const author: any = React.useMemo(() => post?.user || post?.userId || {}, [post]);
  const isOwner = React.useMemo(() => currentUser?._id === (author?._id || author?.id || author?._ref), [currentUser?._id, author]);
  const [followLoading, setFollowLoading] = useState(false);
  const storeUser = useAuthStore((s) => s.user);
  const [isFollowingLocal, setIsFollowingLocal] = useState<boolean>(false);

  // keep local follow state in sync with auth store and author
  React.useEffect(() => {
    try {
      if (!storeUser || !author) {
        setIsFollowingLocal(false);
        return;
      }
      const following = storeUser.following || [];
      const found = following.some((f: any) => String(f._id || f) === String(author._id || author.id || author._ref));
      setIsFollowingLocal(!!found);
    } catch (e) {
      setIsFollowingLocal(false);
    }
  }, [storeUser, author]);
  const formattedDate = React.useMemo(() => post?.createdAt ? formatRelativeTime(post.createdAt) : '', [post?.createdAt]);

  const authorName = React.useMemo(() =>
    author?.firstName ? `${author.firstName} ${author.lastName || ''}` : (author?.name || author?.username || 'User'),
    [author]
  );

  const authorUsername = React.useMemo(() =>
    author?.username || (author?.name && author?.name.replace(/\s+/g, '').toLowerCase()) || 'username',
    [author]
  );

  const profileImageUri = React.useMemo(() => getProfileImageUri(author), [author]);

  // support legacy posts that used `image` or `imageUrl` and new `media` object
  const mediaUrl = React.useMemo(() => {
    if (!post) return '';
    if (post.media && post.media.url) return post.media.url;
    if (typeof post.image === 'string') return post.image;
    if (post.image && typeof post.image === 'object' && post.image.secure_url) return post.image.secure_url;
    if (post.imageUrl) return post.imageUrl;
    return '';
  }, [post]);

  const mediaType = React.useMemo(() => {
    if (post?.media?.type) return post.media.type;
    if (post?.image || post?.imageUrl) return 'image';
    return undefined;
  }, [post]);

  return (
    <>
      {showProfileModal && (
        <UserProfileModal
          isVisible={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          username={author?.username || author?.name || ''}
        />
      )}
      <View style={styles.container}>
        <View style={styles.header}>
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={() => {
            // If tapping on your own profile, navigate to profile tab; otherwise show modal
            const isMe = currentUser?._id && (currentUser._id === (author?._id || author?.id || author?._ref));
            if (isMe) {
              // navigate to profile tab
              try {
                router.push('/(tabs)/profile');
              } catch (e) {
                // fallback: show modal
                setShowProfileModal(true);
              }
              return;
            }
            if (author?.username || author?.name) {
              setShowProfileModal(true);
            }
          }}
        >
          <Image
            source={{ uri: profileImageUri }}
            style={styles.avatar}
          />
          <View style={styles.nameContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.username} numberOfLines={1}>{authorName}</Text>
              <Text style={styles.handle} numberOfLines={1}>@{authorUsername}</Text>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.timestamp}>{formattedDate}</Text>
            </View>
          </View>
        </TouchableOpacity>
        {isOwner && (
          <TouchableOpacity
            onPress={() => {
              Alert.alert('Are you sure you want to delete this post?', undefined, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => {
                  if (onDelete && typeof post?._id === 'string') onDelete(post._id);
                } }
              ])
            }}
            style={styles.deleteButton}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color="#536471" />
          </TouchableOpacity>
        )}
        {!isOwner && (
          <FollowButton
            isFollowing={isFollowingLocal}
            loading={followLoading}
            onToggle={async () => {
              if (!author || !author._id && !author.id && !author._ref) return;
              const targetId = author._id || author.id || author._ref;
              try {
                setFollowLoading(true);
                const res = await useAuthStore.getState().toggleFollow(targetId);
                if (res && res.success) {
                  const isFollowing = res.data?.isFollowing;
                  if (typeof isFollowing === 'boolean') setIsFollowingLocal(isFollowing);
                  else setIsFollowingLocal(prev => !prev);
                } else {
                  setIsFollowingLocal(prev => !prev);
                }
              } catch (e) {
                console.warn('Follow toggle error', e);
              } finally {
                setFollowLoading(false);
              }
            }}
          />
        )}
      </View>

      {/* Content then full-width image to preserve original aspect ratio in feed */}
      <Text style={styles.content}>{post?.content}</Text>

      {/* render media (image/video) if available; fall back to legacy fields */}
      {mediaUrl ? (
        mediaType === 'video' ? (
          <View style={styles.videoContainer}>
            <View style={styles.mediaCrop}>
              {/* show poster image if available for video */}
              {post?.media?.poster ? (
                <Image source={{ uri: post?.media?.poster }} style={styles.postImage} resizeMode="cover" />
              ) : null}
              <Video
                ref={videoRef}
                source={{ uri: mediaUrl }}
                style={[styles.postImage]}
                useNativeControls
                resizeMode={ResizeMode.COVER}
                isLooping
                shouldPlay={false}
                onFullscreenUpdate={({ fullscreenUpdate }) => {
                  // Handle fullscreen updates if needed
                  console.log('Fullscreen update:', fullscreenUpdate);
                }}
              />
            </View>
            <TouchableOpacity 
              style={styles.fullscreenButton}
              onPress={async () => {
                try {
                  if (videoRef.current) {
                    await videoRef.current.presentFullscreenPlayer();
                  }
                } catch (error) {
                  console.error('Error presenting fullscreen:', error);
                }
              }}
            >
              <Ionicons name="expand-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
          <Image
            source={{ uri: mediaUrl }}
            style={styles.postImage}
            resizeMode="cover"
            progressiveRenderingEnabled={true}
          />
        )
      ) : null}

      {/* metadata removed from under image to keep feed minimal */}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            if (post?._id && onComment) {
              const payload: PostWithCommentUpdate = {
                ...post,
                comments: post?.comments || [],
                onCommentUpdate: ({ newCount }: { newCount: number }) => {
                  setCommentCount(newCount);
                }
              } as PostWithCommentUpdate;
              onComment(payload);
            }
          }}
          activeOpacity={0.7}
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="chatbubble-outline" size={20} color="#536471" />
          </View>
          <Text style={styles.actionText}>{commentCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => post?._id && onLike?.(post._id)}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconContainer, isLiked && styles.likedContainer]}>
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={20}
              color={isLiked ? "#F91880" : "#536471"}
            />
          </View>
          <Text style={[styles.actionText, isLiked && styles.likedText]}>
            {post?.likes?.length || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.7}
          onPress={async () => {
            try {
              const name = author?.firstName ? `${author.firstName} ${author.lastName || ''}` : (author?.name || author?.username || 'User');
              const text = post?.content ? `${name}: ${post.content}` : `${name} shared a post.`;
              const url = post?.media?.url || post?.image || post?.imageUrl || '';
              const sharePayload = url ? { message: `${text}\n${url}` } : { message: text };
              await Share.share(sharePayload);
            } catch (err) {
              const message = (err && (err as any).message) || 'Could not share post';
              Alert.alert('Share failed', message);
            }
          }}
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="share-social-outline" size={20} color="#536471" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
    </>
  );
};

export default React.memo(PostCard);

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#EFF3F4',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#EFF3F4',
  },
  nameContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  username: {
    fontWeight: '700',
    fontSize: 16,
    color: '#0F1419',
    marginRight: 4,
  },
  handle: {
    color: '#536471',
    fontSize: 15,
    marginRight: 4,
  },
  dot: {
    color: '#536471',
    marginHorizontal: 4,
  },
  timestamp: {
    color: '#536471',
    fontSize: 15,
  },
  deleteButton: {
    padding: 8,
    marginTop: -8,
    marginRight: -8,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
    color: '#0F1419',
  },
  // full width image/video for feed with flexible aspect ratio
  postImage: {
    width: width - 32,
    // increase vertical size slightly (taller cards)
    minHeight: (width - 32) * 0.75, // taller minimum (approx 4:3)
    maxHeight: (width - 32) * 1.2, // cap height for tall media
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: '#000',
  },
  // container to crop videos when using cover to fill horizontally
  mediaCrop: {
    width: width - 32,
    height: (width - 32) * 0.75,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#000',
  },
  videoContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
    zIndex: 1,
  },
  postContentContainer: {
    // kept for possible alternate layouts
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 12,
  },
  metadataContainer: {
    marginBottom: 8,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 16,
  },
  metadataText: {
    fontSize: 13,
    color: '#536471',
    marginRight: 12,
  },
  firstComment: {
    fontSize: 14,
    color: '#536471',
    marginTop: 8,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: (width - 32) / 3,
    justifyContent: 'center',
  },
  actionIconContainer: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likedContainer: {
    backgroundColor: 'rgba(249, 24, 128, 0.1)',
  },
  actionText: {
    marginLeft: 8,
    color: '#536471',
    fontSize: 13,
  },
  likedText: {
    color: '#F91880',
  },
});
