import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  post?: any;
  onLike?: (postId: string) => void;
  onDelete?: (postId: string) => Promise<void> | void;
  onComment?: (post: any) => void;
  currentUser?: any;
  isLiked?: boolean;
};

const { width } = Dimensions.get('window');

const PostCard: React.FC<Props> = ({ post, onLike, onDelete, onComment, currentUser, isLiked }) => {
  const author = post?.user || post?.userId || {};
  const isOwner = currentUser?._id === (author?._id || author?.id || author?._ref);
  const formattedDate = post?.createdAt ? new Date(post.createdAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  }) : '';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Image 
            source={{ 
              uri: author?.profileImage || author?.profileImage?.secure_url || author?.avatar || `https://ui-avatars.com/api/?name=${author?.name || author?.username || 'User'}&background=random`
            }} 
            style={styles.avatar} 
          />
          <View style={styles.nameContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.username} numberOfLines={1}>{author?.firstName ? `${author.firstName} ${author.lastName || ''}` : (author?.name || author?.username || 'User')}</Text>
              <Text style={styles.handle} numberOfLines={1}>@{author?.username || (author?.name && author?.name.replace(/\s+/g, '').toLowerCase()) || 'username'}</Text>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.timestamp}>{formattedDate}</Text>
            </View>
          </View>
        </View>
        {isOwner && (
          <TouchableOpacity 
            onPress={() => {
              Alert.alert('Are you sure you want to delete this post?', undefined, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => onDelete && onDelete(post?._id) }
              ])
            }}
            style={styles.deleteButton}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color="#536471" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.content}>{post?.content}</Text>

      {post?.image && (
        <Image
          source={{ uri: post.image }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}

      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => onComment && onComment(post)}
          activeOpacity={0.7}
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="chatbubble-outline" size={20} color="#536471" />
          </View>
          <Text style={styles.actionText}>{post?.comments?.length || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => onLike && onLike(post?._id)}
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
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="share-social-outline" size={20} color="#536471" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PostCard;

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
  postImage: {
    width: width - 32,
    height: (width - 32) * 0.75,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: '#EFF3F4',
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
    marginLeft: 2,
    color: '#536471',
    fontSize: 13,
  },
  likedText: {
    color: '#F91880',
  },
});
