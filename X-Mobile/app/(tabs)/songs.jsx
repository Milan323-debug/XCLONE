import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Alert, Platform } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { Audio } from 'expo-av'
import { API_URL } from '../../constants/api'
import { COLORS } from '../../constants/colors'
import { useAuthStore } from '../../store/authStore'

export default function Songs() {
  const { token } = useAuthStore();
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [pickedFile, setPickedFile] = useState(null)

  const soundRef = useRef(null)
  const [playingId, setPlayingId] = useState(null)

  useEffect(() => {
    fetchSongs()
    return () => {
      if (soundRef.current) {
        try { soundRef.current.unloadAsync() } catch (e) {}
      }
    }
  }, [])

  const fetchSongs = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/songs`)
      const json = await res.json()
      setSongs(json.songs || [])
    } catch (e) {
      console.warn('fetchSongs', e)
      Alert.alert('Error', 'Failed to load songs')
    } finally {
      setLoading(false)
    }
  }

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'audio/*' })
      if (res.type === 'success') {
        setPickedFile(res)
      }
    } catch (e) {
      console.warn('pickFile', e)
    }
  }

  const uploadToCloudinary = async (file) => {
    // request signature from backend
    const signRes = await fetch(`${API_URL}/api/songs/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ folder: 'songs', resource_type: 'raw' }),
    })
    if (!signRes.ok) throw new Error('Failed to get upload signature')
    const signJson = await signRes.json()

    const cloudUrl = `https://api.cloudinary.com/v1_1/${signJson.cloud_name}/raw/upload`;

    const form = new FormData()
    // for react native, file object should be { uri, name, type }
    const name = file.name || `song.${file.uri.split('.').pop()}`
    form.append('file', { uri: file.uri, name, type: file.mimeType || 'audio/mpeg' })
    form.append('api_key', signJson.api_key)
    form.append('timestamp', String(signJson.timestamp))
    form.append('signature', signJson.signature)
    form.append('resource_type', 'raw')
    form.append('folder', 'songs')

    const uploadRes = await fetch(cloudUrl, { method: 'POST', body: form })
    const cloudJson = await uploadRes.json()
    if (!uploadRes.ok) throw new Error(cloudJson.error?.message || 'Cloud upload failed')
    return cloudJson
  }

  const handleUpload = async () => {
    if (!token) return Alert.alert('Not signed in')
    if (!pickedFile) return Alert.alert('Select a file first')
    if (!title.trim()) return Alert.alert('Title required')

    setUploading(true)
    try {
      // cloud upload
      const cloudJson = await uploadToCloudinary(pickedFile)

      // create DB record
      const createRes = await fetch(`${API_URL}/api/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: title.trim(), artist: artist.trim(), url: cloudJson.secure_url, publicId: cloudJson.public_id, mimeType: cloudJson.resource_type || pickedFile.mimeType, size: cloudJson.bytes || pickedFile.size || 0 }),
      })
      const createJson = await createRes.json()
      if (!createRes.ok) throw new Error(createJson.error || 'Failed to save song')

      // prepend to list
      setSongs((s) => [createJson.song, ...s])
      setTitle(''); setArtist(''); setPickedFile(null)
      Alert.alert('Success', 'Song uploaded')
    } catch (e) {
      console.error('upload error', e)
      Alert.alert('Upload failed', e.message)
    } finally {
      setUploading(false)
    }
  }

  const playSong = async (song) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null
      }
      const { sound } = await Audio.Sound.createAsync({ uri: song.url }, { shouldPlay: true })
      soundRef.current = sound
      setPlayingId(song._id)
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) setPlayingId(null)
      })
    } catch (e) {
      console.warn('playSong', e)
      Alert.alert('Playback error', 'Could not play this song')
    }
  }

  const stopPlayback = async () => {
    if (soundRef.current) {
      try { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); } catch (e) {}
      soundRef.current = null
      setPlayingId(null)
    }
  }

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.songTitle}>{item.title}</Text>
        <Text style={styles.songArtist}>{item.artist || item.user?.username || ''}</Text>
      </View>
      {playingId === item._id ? (
        <TouchableOpacity style={styles.playBtn} onPress={stopPlayback}><Text style={styles.playText}>Stop</Text></TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.playBtn, { backgroundColor: COLORS.primary }]} onPress={() => playSong(item)}><Text style={[styles.playText, { color: COLORS.white }]}>Play</Text></TouchableOpacity>
      )}
    </View>
  )

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}> 
      <Text style={styles.header}>Upload a Song</Text>

      <View style={styles.uploadCard}>
        <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={styles.input} />
        <TextInput placeholder="Artist" value={artist} onChangeText={setArtist} style={styles.input} />

        <TouchableOpacity style={styles.fileBtn} onPress={pickFile}>
          <Text style={styles.fileBtnText}>{pickedFile ? pickedFile.name : 'Choose audio file'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: COLORS.primary }]} onPress={handleUpload} disabled={uploading}>
          {uploading ? <ActivityIndicator color={COLORS.white} /> : <Text style={[styles.uploadBtnText, { color: COLORS.white }]}>Upload</Text>}
        </TouchableOpacity>
      </View>

      <View style={{ height: 12 }} />

      <Text style={styles.header}>Recent Songs</Text>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color={COLORS.primary} />
      ) : (
        <FlatList data={songs} keyExtractor={(i) => i._id} renderItem={renderItem} contentContainerStyle={{ padding: 12 }} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { fontSize: 18, fontWeight: '700', color: COLORS.text, margin: 12 },
  uploadCard: { margin: 12, padding: 12, backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  input: { borderWidth: 1, borderColor: COLORS.border, padding: 8, borderRadius: 8, marginBottom: 8, color: COLORS.text },
  fileBtn: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', marginBottom: 8 },
  fileBtnText: { color: COLORS.text },
  uploadBtn: { padding: 12, borderRadius: 8, alignItems: 'center' },
  uploadBtnText: { fontWeight: '700' },
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  songTitle: { fontWeight: '700', color: COLORS.text },
  songArtist: { color: COLORS.textLight, marginTop: 4 },
  playBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  playText: { fontWeight: '700' },
})