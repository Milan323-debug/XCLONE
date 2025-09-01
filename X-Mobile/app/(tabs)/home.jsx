import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import LogoutButtton from '../../components/LogoutButtton'
import { API_URL } from '../../constants/api'
import { COLORS } from '../../constants/colors'
import { Feather } from '@expo/vector-icons'

export default function Home() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  // local vote state: { [postId]: 1 | -1 | 0 }
  const [votes, setVotes] = useState({})

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/api/posts`)
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      const items = Array.isArray(json.posts) ? json.posts : []
      setPosts(items)
      // seed votes from likes length
      const seed = {}
      items.forEach((p) => (seed[p._id || p.id] = 0))
      setVotes(seed)
    } catch (err) {
      console.warn('fetchPosts error', err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchPosts()
  }, [fetchPosts])

  const toggleVote = (postId, delta) => {
    setVotes((prev) => {
      const current = prev[postId] || 0
      const next = current === delta ? 0 : delta
      return { ...prev, [postId]: next }
    })
    // optimistic local score update
    setPosts((prev) =>
      prev.map((p) => {
        const id = p._id || p.id
        if (id !== postId) return p
        const current = votes[postId] || 0
        // compute new like count locally
        let likes = Array.isArray(p.likes) ? p.likes.length : 0
        // remove previous vote effect
        likes = likes - (current === 1 ? 1 : 0) + (current === -1 ? -1 : 0)
        // apply new vote
        likes = likes + ( (current === delta) ? 0 : (delta === 1 ? 1 : -1) )
        return { ...p, _localLikes: likes }
      })
    )
  }

  const renderPost = ({ item: post }) => {
    const id = post._id || post.id
    const author = post.user || {}
    const score = post._localLikes ?? (Array.isArray(post.likes) ? post.likes.length : 0)
    const voted = votes[id] || 0

    return (
      <View style={styles.postCard}>
        <View style={styles.voteCol}>
          <TouchableOpacity onPress={() => toggleVote(id, 1)}>
            <Feather name="chevron-up" size={22} color={voted === 1 ? COLORS.primary : COLORS.textLight} />
          </TouchableOpacity>
          <Text style={[styles.scoreText, { color: voted === 1 ? COLORS.primary : COLORS.text }]}>{score}</Text>
          <TouchableOpacity onPress={() => toggleVote(id, -1)}>
            <Feather name="chevron-down" size={22} color={voted === -1 ? COLORS.primary : COLORS.textLight} />
          </TouchableOpacity>
        </View>

        <View style={styles.postBody}>
          <View style={styles.postHeader}>
            <Image source={{ uri: author.profileImage || author.avatar || 'https://i.pravatar.cc/40' }} style={styles.postAvatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.postAuthor}>{author.firstName ? `${author.firstName} ${author.lastName || ''}` : author.username || 'Unknown'}</Text>
              <Text style={styles.postMeta}>{new Date(post.createdAt).toLocaleString()}</Text>
            </View>
          </View>

          {post.content ? <Text style={styles.postContent}>{post.content}</Text> : null}
          {(
            post.image || post.imageUrl || (post.image && post.image.secure_url)
          ) ? (
            <Image
              source={{ uri: post.image || post.imageUrl || (post.image && post.image.secure_url) }}
              style={styles.postImage}
            />
          ) : null}

          <View style={styles.postActions}>
            <TouchableOpacity style={styles.actionBtn}>
              <Feather name="message-circle" size={16} color={COLORS.textLight} />
              <Text style={styles.actionText}>{(post.comments || []).length}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Feather name="heart" size={16} color={COLORS.textLight} />
              <Text style={styles.actionText}>{Array.isArray(post.likes) ? post.likes.length : 0}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container]}>
      <View style={styles.header}>
        <Text style={styles.title}>Home</Text>
        <LogoutButtton />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(i) => String(i._id || i.id)}
          renderItem={renderPost}
          contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListEmptyComponent={<View style={{ padding: 20 }}><Text style={{ color: COLORS.textLight }}>No posts yet.</Text></View>}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.background },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  postCard: { flexDirection: 'row', padding: 12, marginVertical: 8, marginHorizontal: 4, backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, shadowColor: COLORS.shadow, shadowOpacity: 0.05, shadowRadius: 6 },
  voteCol: { width: 48, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 6 },
  scoreText: { fontWeight: '700', marginVertical: 4, color: COLORS.text },
  postBody: { flex: 1 },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  postAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
  postAuthor: { fontWeight: '700', color: COLORS.text },
  postMeta: { color: COLORS.textLight, fontSize: 12 },
  postContent: { color: COLORS.text, marginBottom: 8 },
  postImage: { width: '100%', height: 180, borderRadius: 8, marginTop: 8, resizeMode: 'cover' },
  postActions: { flexDirection: 'row', marginTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  actionText: { marginLeft: 6, color: COLORS.textLight },
})