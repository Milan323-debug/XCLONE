import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../constants/api';
import { getProfileImageUri } from '../lib/utils';
import { useAuthStore } from '../store/authStore';
import ProfilePostCard from './ProfilePostCard';

const { height } = Dimensions.get('window');

interface UserProfileModalProps {
  isVisible: boolean;
  onClose: () => void;
  username: string;
}

export default function UserProfileModal({ isVisible, onClose, username }: UserProfileModalProps) {
  const { token, user: currentUser } = useAuthStore();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!username) return;
    try {
      const base = API_URL.replace(/\/$/, '');
      const url = `${base}/api/user/profile/${encodeURIComponent(username)}`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '<no body>');
        throw new Error(`Failed to load profile: ${res.status} ${body}`);
      }
      const json = await res.json();
      setUser(json.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    if (!username) return;
    try {
      const base = API_URL.replace(/\/$/, '');
      const url = `${base}/api/posts/user/${encodeURIComponent(username)}`;
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.text().catch(() => '<no body>');
        throw new Error(`Failed to load posts: ${res.status} ${body}`);
      }
      const json = await res.json();
      setPosts(json.posts || []);
    } catch (e) {
      console.error('fetchUserPosts error:', e);
    }
  };

  useEffect(() => {
    if (isVisible && username) {
      setLoading(true);
      setError(null);
      fetchProfile();
      fetchUserPosts();
    }
  }, [isVisible, username]);

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile</Text>
            <View style={styles.headerRight} />
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1DA1F2" />
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={fetchProfile}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : user ? (
            <ScrollView style={styles.scrollView}>
              {/* Profile Info */}
              <View style={styles.profileInfo}>
                <Image
                  source={{ uri: getProfileImageUri(user) || undefined }}
                  style={styles.profileImage}
                />
                <Text style={styles.name}>{user.firstName} {user.lastName}</Text>
                <Text style={styles.username}>@{user.username}</Text>
                {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
                
                <View style={styles.statsRow}>
                  <Text style={styles.statsText}>
                    <Text style={styles.statsNumber}>{posts.length}</Text> Posts
                  </Text>
                  <Text style={styles.statsText}>
                    <Text style={styles.statsNumber}>{user.followers?.length || 0}</Text> Followers
                  </Text>
                  <Text style={styles.statsText}>
                    <Text style={styles.statsNumber}>{user.following?.length || 0}</Text> Following
                  </Text>
                </View>
              </View>

              {/* Posts */}
              <View style={styles.postsContainer}>
                {posts.map(post => (
                  <ProfilePostCard
                    key={post._id}
                    post={post}
                    currentUser={currentUser}
                  />
                ))}
                {posts.length === 0 && (
                  <Text style={styles.noPosts}>No posts yet</Text>
                )}
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: height * 0.9,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  headerRight: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#1DA1F2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  profileInfo: {
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  username: {
    fontSize: 15,
    color: '#666',
    marginBottom: 12,
  },
  bio: {
    fontSize: 15,
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  statsText: {
    marginHorizontal: 10,
    color: '#666',
  },
  statsNumber: {
    fontWeight: '700',
    color: '#000',
  },
  postsContainer: {
    paddingTop: 8,
  },
  noPosts: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
    fontSize: 15,
    paddingBottom: 20,
  },
});