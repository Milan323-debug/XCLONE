import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import PostComposer from '../../components/PostComposer'
import ProfilePostCard from '../../components/ProfilePostCard'
import { useAuthStore } from '../../store/authStore'
import { API_URL } from '../../constants/api'
import { COLORS } from '../../constants/colors'
import { Feather } from '@expo/vector-icons'
import FollowButton from '../../components/FollowButton'

export default function Profile() {
  const { user, token, logout } = useAuthStore()
  const [profileUser, setProfileUser] = useState(user)
  const [loading, setLoading] = useState(false)
  const [posts, setPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [listModalVisible, setListModalVisible] = useState(false)
  const [listModalType, setListModalType] = useState(null) // 'followers' | 'following'
  const [listUsers, setListUsers] = useState([])
  const [listLoading, setListLoading] = useState(false)

  // composer
  const [newContent, setNewContent] = useState('')
  const [newImage, setNewImage] = useState(null) // { uri, type, name }
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    fetchProfile()
    fetchUserPosts()
  }, [])

  const fetchProfile = async () => {
    if (!token || !user) return
    setLoading(true)
    try {
      console.debug('fetchProfile: token present?', !!token, 'user id=', user?._id)
      const res = await fetch(`${API_URL}/api/user/me`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) {
        const body = await res.text().catch(() => '<no body>');
        console.warn('fetchProfile (me) failed', res.status, body);
        throw new Error(`Failed to load profile: ${res.status} ${body}`)
      }
      const json = await res.json()
      setProfileUser(json.user || user)
    } catch (e) {
      console.warn(e.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserPosts = async () => {
    if (!user) return
    setPostsLoading(true)
    try {
      const username = user.username
      const res = await fetch(`${API_URL}/api/posts/user/${username}`)
      const json = await res.json()
      setPosts(json.posts || [])
    } catch (e) {
      console.warn('fetchUserPosts', e.message)
    } finally {
      setPostsLoading(false)
    }
  }

  const openListModal = async (type) => {
    if (!profileUser) return;
    setListModalType(type);
    setListLoading(true);
    setListModalVisible(true);
    try {
      // profileUser.followers and following may contain user objects; normalize
      const list = (type === 'followers' ? (profileUser.followers || []) : (profileUser.following || []));
      // if list contains ids, fetch full user objects from backend
      const needFetch = list.length > 0 && typeof list[0] !== 'object';
      if (needFetch) {
        try {
          console.debug('openListModal: fetching batch for ids count=', list.length);
          const res = await fetch(`${API_URL}/api/user/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: list }),
          });
          const text = await res.text();
          let j = null;
          try { j = text ? JSON.parse(text) : null; } catch(e) { console.debug('openListModal: batch response not json', text); }
          if (res.ok && j && Array.isArray(j.users)) {
            setListUsers(j.users || []);
          } else {
            console.warn('openListModal: batch fetch failed', res.status, text);
            // fallback: show placeholder objects so user sees something
            const placeholders = list.map(id => ({ _id: id, username: id.substring(0, 8), profileImage: 'https://i.pravatar.cc/48' }));
            setListUsers(placeholders);
          }
        } catch (e) {
          console.warn('batch fetch error', e);
          const placeholders = list.map(id => ({ _id: id, username: id.substring(0, 8), profileImage: 'https://i.pravatar.cc/48' }));
          setListUsers(placeholders);
        }
      } else {
        setListUsers(list || []);
      }
    } catch (e) {
      console.warn('openListModal error', e);
      setListUsers([]);
    } finally {
      setListLoading(false);
    }
  }

  const closeListModal = () => {
    setListModalVisible(false);
    setListModalType(null);
    setListUsers([]);
  }

  const pickImage = async (forProfile) => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!p.granted) {
      Alert.alert('Permission required', 'We need permission to access your photos')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7, allowsEditing: true })
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0]
      const uri = asset.uri
      if (forProfile) {
        // send as base64 string to update profile
        // prefer asset.base64 when available
        if (asset.base64) {
          updateProfileImage(`data:${asset.type || 'image/jpeg'};base64,${asset.base64}`)
        } else {
          // fallback: try to fetch the file and convert to base64 (optional)
          // For now, try to send the uri directly (backend expects base64) - show error
          Alert.alert('Upload failed', 'Could not read image data. Please try a different image.')
        }
      } else {
        // prepare file for multipart FormData
        const name = asset.fileName || uri.split('/').pop()
        const match = /\.(\w+)$/.exec(name || '')
        const ext = match ? match[1] : (asset.type && asset.type.split('/').pop()) || 'jpg'
        const type = asset.type || `image/${ext}`
        setNewImage({ uri, name, type })
      }
    }
  }

  const updateProfileImage = async (base64Data) => {
    if (!token) return Alert.alert('Not signed in')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/user/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ profileImage: base64Data }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to update')
      setProfileUser(json.user)
      // update local authStore user copy
      try { localStorage } catch (e) {}
    } catch (e) {
      Alert.alert('Update failed', e.message)
    } finally {
      setLoading(false)
    }
  }

  const createPost = async () => {
    if (!token) return Alert.alert('Not signed in')
    if (!newContent.trim() && !newImage) return Alert.alert('Empty', 'Add content or image')
    setPosting(true)
    try {
      const fd = new FormData()
      fd.append('content', newContent)
      if (newImage) {
        fd.append('image', {
          uri: newImage.uri,
          name: newImage.name,
          type: newImage.type,
        })
      }
      const res = await fetch(`${API_URL}/api/posts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to create post')
      setNewContent('')
      setNewImage(null)
      // refresh
      fetchUserPosts()
    } catch (e) {
      Alert.alert('Create post failed', e.message)
    } finally {
      setPosting(false)
    }
  }

  const deletePost = async (postId) => {
    if (!token) return Alert.alert('Not signed in')
    Alert.alert('Delete post', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const res = await fetch(`${API_URL}/api/posts/${postId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
          if (!res.ok) throw new Error('Delete failed')
          setPosts((p) => p.filter((x) => (x._id || x.id) !== postId))
        } catch (e) {
          Alert.alert('Delete failed', e.message)
        }
      }}
    ])
  }

  if (!user) return (
    <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: COLORS.textLight }}>You must be signed in to view your profile.</Text>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{profileUser?.firstName || profileUser?.username || 'Profile'}</Text>
        <TouchableOpacity onPress={() => { logout(); }}>
          <Feather name="log-out" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.profileRow}>
        <TouchableOpacity onPress={() => pickImage(true)}>
          <Image source={{ uri: profileUser?.profileImage || (profileUser?.profileImage?.secure_url) || 'https://i.pravatar.cc/80' }} style={styles.avatar} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12, paddingRight: 12 }}>
          <Text style={[styles.name, { marginTop: 6 }]}>{profileUser?.firstName ? `${profileUser.firstName} ${profileUser.lastName || ''}` : profileUser.username}</Text>
          <Text style={[styles.handle, { marginTop: 4 }]}>@{profileUser?.username}</Text>
          <Text style={styles.bio}>{profileUser?.bio || ''}</Text>

          {/* Inline stats within header: Posts / Followers / Following */}
          <View style={styles.statsRowHeader}>
            <Pressable onPress={() => { /* no-op: posts list is below */ }} style={styles.statItem}>
              <Text style={styles.statNumber}>{posts.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </Pressable>

            <Pressable onPress={() => openListModal('followers')} style={styles.statItem}>
              <Text style={styles.statNumber}>{profileUser?.followers?.length || 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </Pressable>

            <Pressable onPress={() => openListModal('following')} style={styles.statItem}>
              <Text style={styles.statNumber}>{profileUser?.following?.length || 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* stats moved into the profile header */}

      {/* Composer */}
      <PostComposer />

      <View style={{ flex: 1 }}>
        {postsLoading && (!posts || posts.length === 0) ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ color: COLORS.textLight, marginTop: 8 }}>Loading posts...</Text>
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(i) => String(i._id || i.id)}
            renderItem={({ item }) => (
              <ProfilePostCard
                post={item}
                currentUser={user}
                onDelete={deletePost}
              />
            )}
            ListEmptyComponent={<View style={{ padding: 20 }}><Text style={{ color: COLORS.textLight }}>No posts yet.</Text></View>}
            onRefresh={fetchUserPosts}
            refreshing={postsLoading}
          />
        )}
      </View>

      {/* Modal showing followers / following list */}
      <Modal
        visible={listModalVisible}
        animationType="slide"
        onRequestClose={closeListModal}
        transparent={false}
      >
        <View style={{ flex: 1, padding: 12, backgroundColor: COLORS.background }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text }}>{listModalType === 'followers' ? 'Followers' : 'Following'}</Text>
            <TouchableOpacity onPress={closeListModal}><Text style={{ color: COLORS.primary }}>Close</Text></TouchableOpacity>
          </View>

          {listLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <FlatList
              data={listUsers}
              keyExtractor={(i) => String(i._id || i.id)}
              renderItem={({ item }) => {
                const isMe = item._id === user._id;
                const curFollowing = user?.following || [];
                const isFollowingItem = curFollowing.some((f) => String(f._id || f) === String(item._id || item.id));
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: COLORS.border }}>
                    <Image source={{ uri: item.profileImage || 'https://i.pravatar.cc/48' }} style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', color: COLORS.text }}>{item.firstName ? `${item.firstName} ${item.lastName || ''}` : item.username}</Text>
                      <Text style={{ color: COLORS.textLight }}>@{item.username}</Text>
                    </View>
                    {!isMe && (
                      <FollowButton
                        isFollowing={isFollowingItem}
                        loading={false}
                        onToggle={async () => {
                          try {
                            await useAuthStore.getState().toggleFollow(item._id || item.id);
                            // refresh local user and profileUser
                            await useAuthStore.getState().fetchMe();
                            await fetchProfile();
                          } catch (e) { console.warn('list follow toggle', e) }
                        }}
                      />
                    )}
                  </View>
                )
              }}
            />
          )}
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  profileRow: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  name: { fontWeight: '700', color: COLORS.text, fontSize: 16 },
  handle: { color: COLORS.textLight, marginTop: 2 },
  bio: { color: COLORS.text, marginTop: 8 },
  statsRowHeader: { flexDirection: 'row', marginTop: 10, alignItems: 'flex-end', justifyContent: 'flex-start' },
  statItem: { marginRight: 16, alignItems: 'center', width: 72 },
  statNumber: { fontWeight: '700', fontSize: 15, color: COLORS.text, textAlign: 'center' },
  statLabel: { color: COLORS.textLight, fontSize: 13, marginTop: 4, textAlign: 'center' },
  composer: { marginTop: 12, padding: 12, backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  composerInput: { minHeight: 44, color: COLORS.text, maxHeight: 140 },
  composerActions: { flexDirection: 'row', marginTop: 8 },
  iconBtn: { padding: 8 },
  postBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: '100%', height: 180, borderRadius: 8, marginTop: 8 },
  composerFooter: { marginTop: 10, alignItems: 'flex-end' },
  postRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, marginTop: 12, backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  postContent: { color: COLORS.text },
  postImage: { width: 120, height: 120, borderRadius: 8, marginTop: 8 },
  deleteBtn: { marginLeft: 12, padding: 6 },
})