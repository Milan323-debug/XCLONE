import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../constants/api';
import { useAuthStore } from '../../store/authStore';
import FollowButton from '../../components/FollowButton';
import ProfilePostCard from '../../components/ProfilePostCard';

export default function UserProfile() {
  const { username } = useLocalSearchParams();
  const { token, user: currentUser } = useAuthStore();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
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
      setError(e instanceof Error ? e.message : String(e));
      console.error('fetchProfile error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    if (!username) return;
    try {
      const res = await fetch(`${API_URL}/api/posts/user/${username}`);
      if (!res.ok) throw new Error('Failed to load posts');
      const json = await res.json();
      setPosts(json.posts || []);
    } catch (e) {
      console.error('fetchUserPosts error:', e);
    } finally {
      setPostsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchProfile(), fetchUserPosts()]);
    setRefreshing(false);
  };

  useEffect(() => {
    if (username) {
      fetchProfile();
      fetchUserPosts();
    }
  }, [username]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1DA1F2" />
      </SafeAreaView>
    );
  }

  if (error || !user) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {error || "Couldn't find this user"}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchProfile}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isCurrentUser = currentUser?._id === user._id;
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    // determine if current user is following the fetched profile
    if (currentUser && user) {
      const follows = (user.followers || []).some((f) => (f._id || f).toString() === currentUser._id?.toString());
      setIsFollowing(follows);
    }
  }, [currentUser, user]);

  const toggleFollow = async () => {
    if (!currentUser) return router.push('/(auth)');
    if (isCurrentUser) return; // can't follow self
    setFollowLoading(true);
    try {
      const { success, data, error } = await useAuthStore.getState().toggleFollow(user._id);
      if (!success) {
        console.warn('toggleFollow error', error);
        return;
      }
      // update UI based on returned payload
      setIsFollowing(!!data.isFollowing);
      if (typeof data.followersCount === 'number') {
        setUser((u) => ({ ...u, followers: new Array(data.followersCount).fill(null) }));
      } else {
        // optimistic update
        setUser((u) => {
          if (!u) return u;
          const followers = u.followers || [];
          if (data.isFollowing) {
            return { ...u, followers: [...followers, { _id: useAuthStore.getState().user._id }] };
          }
          return { ...u, followers: followers.filter((f) => (f._id || f).toString() !== useAuthStore.getState().user._id.toString()) };
        });
      }
    } catch (e) {
      console.warn('toggleFollow failed', e);
    } finally {
      setFollowLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: user.firstName || user.username || 'Profile',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
          ),
        }}
      />
      
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1DA1F2"
          />
        }
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <Image
            source={{
              uri: user.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName || user.username)}&background=random`
            }}
            style={styles.profileImage}
          />
          
          <View style={styles.userInfo}>
            <Text style={styles.name}>{user.firstName} {user.lastName}</Text>
            <Text style={styles.username}>@{user.username}</Text>
            <Text style={styles.bio}>{user.bio || 'No bio yet'}</Text>
            <View style={{ flexDirection: 'row', marginTop: 8, alignItems: 'center' }}>
              {!isCurrentUser && (
                <FollowButton isFollowing={isFollowing} loading={followLoading} onToggle={toggleFollow} />
              )}
            </View>

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
        </View>

        {/* Posts */}
        <View style={styles.postsContainer}>
          {postsLoading ? (
            <ActivityIndicator size="small" color="#1DA1F2" style={styles.postsLoading} />
          ) : posts.length === 0 ? (
            <Text style={styles.noPosts}>No posts yet</Text>
          ) : (
            posts.map(post => (
              <ProfilePostCard
                key={post._id}
                post={post}
                currentUser={currentUser}
              />
            ))
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
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
  backButton: {
    marginLeft: 16,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  userInfo: {
    marginTop: 8,
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
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  statsText: {
    marginRight: 20,
    color: '#666',
  },
  statsNumber: {
    fontWeight: '700',
    color: '#000',
  },
  postsContainer: {
    paddingTop: 8,
  },
  postsLoading: {
    marginTop: 20,
  },
  noPosts: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
    fontSize: 15,
  },
});