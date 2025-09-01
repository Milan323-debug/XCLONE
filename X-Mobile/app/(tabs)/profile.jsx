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
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useAuthStore } from '../../store/authStore'
import { API_URL } from '../../constants/api'
import { COLORS } from '../../constants/colors'
import { Feather } from '@expo/vector-icons'

export default function Profile() {
  const { user, token, logout } = useAuthStore()
  const [profileUser, setProfileUser] = useState(user)
  const [loading, setLoading] = useState(false)
  const [posts, setPosts] = useState([])

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
      const res = await fetch(`${API_URL}/api/user/me`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to load profile')
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
    try {
      const username = user.username
      const res = await fetch(`${API_URL}/api/posts/user/${username}`)
      const json = await res.json()
      setPosts(json.posts || [])
    } catch (e) {
      console.warn('fetchUserPosts', e.message)
    }
  }

  const pickImage = async (forProfile) => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!p.granted) {
      Alert.alert('Permission required', 'We need permission to access your photos')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7, allowsEditing: true })
    if (!result.cancelled) {
      if (forProfile) {
        // send as base64 string to update profile
        updateProfileImage(`data:image/jpeg;base64,${result.base64}`)
      } else {
        // prepare file for multipart FormData
        const uri = result.uri
        const name = uri.split('/').pop()
        const match = /\.(\w+)$/.exec(name)
        const ext = match ? match[1] : 'jpg'
        const type = `image/${ext}`
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
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.name}>{profileUser?.firstName ? `${profileUser.firstName} ${profileUser.lastName || ''}` : profileUser.username}</Text>
          <Text style={styles.handle}>@{profileUser?.username}</Text>
          <Text style={styles.bio}>{profileUser?.bio || ''}</Text>
        </View>
      </View>

      {/* Composer */}
      <View style={styles.composer}>
        <TextInput
          placeholder="What's happening?"
          placeholderTextColor={COLORS.textLight}
          value={newContent}
          onChangeText={setNewContent}
          style={styles.composerInput}
          multiline
        />
        {newImage ? (
          <Image source={{ uri: newImage.uri }} style={styles.previewImage} />
        ) : (
          <View style={styles.composerActions}>
            <TouchableOpacity onPress={() => pickImage(false)} style={styles.iconBtn}>
              <Feather name="image" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.composerFooter}>
          <TouchableOpacity onPress={createPost} style={[styles.postBtn, { backgroundColor: posting ? COLORS.border : COLORS.primary }]} disabled={posting}>
            {posting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff' }}>Post</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <FlatList
          data={posts}
          keyExtractor={(i) => String(i._id || i.id)}
          renderItem={({ item }) => (
            <View style={styles.postRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.postContent}>{item.content}</Text>
                {(item.image || item.imageUrl || (item.image && item.image.secure_url)) ? (
                  <Image source={{ uri: item.image || item.imageUrl || (item.image && item.image.secure_url) }} style={styles.postImage} />
                ) : null}
              </View>
              <TouchableOpacity onPress={() => deletePost(item._id || item.id)} style={styles.deleteBtn}>
                <Feather name="trash-2" size={18} color={COLORS.expense} />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<View style={{ padding: 20 }}><Text style={{ color: COLORS.textLight }}>No posts yet.</Text></View>}
          onRefresh={fetchUserPosts}
          refreshing={false}
        />
      </View>
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