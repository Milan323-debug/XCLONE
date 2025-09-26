import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  Switch,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from 'expo-image-picker';
import { Audio } from "expo-av";
import { usePlayerStore } from "../../store/playerStore";
import { API_URL } from "../../constants/api";
import { COLORS } from "../../constants/colors";
import { useAuthStore } from "../../store/authStore";
import { Feather, Ionicons } from "@expo/vector-icons";

export default function Songs() {
  const { token } = useAuthStore();
  const currentUser = useAuthStore((s) => s.user);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [pickedFile, setPickedFile] = useState(null);
  const [pickedArtwork, setPickedArtwork] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [optionsForSong, setOptionsForSong] = useState(null);

  const playerCurrent = usePlayerStore((s) => s.current);
  const playerIsPlaying = usePlayerStore((s) => s.isPlaying);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const stopPlayer = usePlayerStore((s) => s.stop);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const setShuffle = usePlayerStore((s) => s.setShuffle);
  const setRepeatMode = usePlayerStore((s) => s.setRepeatMode);

  useEffect(() => {
    fetchSongs();
    return () => {
      // leave player running across screens; do not stop automatically
    };
  }, []);

  // request permission for image library
  useEffect(() => {
    (async () => {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Permission to access photos is required to select artwork');
        }
      } catch (e) {
        console.warn('permission request', e);
      }
    })();
  }, []);

  const fetchSongs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/songs`);
      const json = await res.json();
      setSongs(json.songs || []);
    } catch (e) {
      console.warn("fetchSongs", e);
      Alert.alert("Error", "Failed to load songs");
    } finally {
      setLoading(false);
    }
  };

  const pickFile = async () => {
    try {
      const pickerType = Platform.OS === "ios" ? "public.audio" : "audio/*";
      const res = await DocumentPicker.getDocumentAsync({
        type: pickerType,
        copyToCacheDirectory: true,
      });
      console.debug("DocumentPicker result", res);
      // Newer expo-document-picker returns { canceled: boolean, assets: [{ uri, name, size, mimeType }] }
      if (res && Array.isArray(res.assets) && res.canceled === false) {
        const asset = res.assets[0];
        const uri = asset.uri;
        let name = asset.name || (uri ? uri.split("/").pop() : undefined);
        const mimeType = asset.mimeType || asset.type || undefined;
        const normalized = { uri, name, size: asset.size, mimeType, raw: res };
        console.debug("Normalized picked file (assets)", normalized);
        setPickedFile(normalized);
      } else if (res && res.type === "success") {
        // legacy shape
        const uri = res.uri;
        let name = res.name;
        if (!name && uri) {
          const parts = uri.split("/");
          name = parts[parts.length - 1];
        }
        const mimeType = res.mimeType || res.mime || undefined;
        const normalized = { uri, name, size: res.size, mimeType, raw: res };
        console.debug("Normalized picked file (legacy)", normalized);
        setPickedFile(normalized);
      } else if (res && (res.type === "cancel" || res.canceled === true)) {
        console.debug("DocumentPicker cancelled");
        Alert.alert("Selection cancelled", "No file was selected");
      }
    } catch (e) {
      console.warn("pickFile", e);
    }
  };

  const pickArtwork = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
      if (!res) return;
      if (res.cancelled) return;
      // res has uri, width, height
      const name = res.uri.split('/').pop();
      const normalized = { uri: res.uri, name, width: res.width, height: res.height, raw: res };
      setPickedArtwork(normalized);
    } catch (e) {
      console.warn('pickArtwork', e);
    }
  };

  const uploadToCloudinary = async (file) => {
    // request signature from backend
    const signRes = await fetch(`${API_URL}/api/songs/sign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ folder: "songs", resource_type: "raw" }),
    });
    if (!signRes.ok) throw new Error("Failed to get upload signature");
    const signJson = await signRes.json();

    const cloudUrl = `https://api.cloudinary.com/v1_1/${signJson.cloud_name}/raw/upload`;

    const form = new FormData();
    // for react native, file object should be { uri, name, type }
    const name =
      file.name ||
      (file.uri
        ? file.uri.split("/").pop()
        : `song.${(file.uri || "").split(".").pop()}`);
    // some pickers don't return mimeType; fall back to common audio mime
    const type = file.mimeType || "audio/mpeg";
    form.append("file", { uri: file.uri, name, type });
    form.append("api_key", signJson.api_key);
    form.append("timestamp", String(signJson.timestamp));
    form.append("signature", signJson.signature);
    form.append("resource_type", "raw");
    form.append("folder", "songs");

    const uploadRes = await fetch(cloudUrl, { method: "POST", body: form });
    const cloudJson = await uploadRes.json();
    if (!uploadRes.ok)
      throw new Error(cloudJson.error?.message || "Cloud upload failed");
    return cloudJson;
  };

  const uploadArtworkToCloudinary = async (image) => {
    // image: { uri, name }
    const signRes = await fetch(`${API_URL}/api/songs/sign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ folder: "songs/artwork", resource_type: "image" }),
    });
    if (!signRes.ok) throw new Error('Failed to get upload signature');
    const signJson = await signRes.json();
    const cloudUrl = `https://api.cloudinary.com/v1_1/${signJson.cloud_name}/image/upload`;
    const form = new FormData();
    const name = image.name || image.uri.split('/').pop();
    const type = 'image/jpeg';
    form.append('file', { uri: image.uri, name, type });
    form.append('api_key', signJson.api_key);
    form.append('timestamp', String(signJson.timestamp));
    form.append('signature', signJson.signature);
    form.append('folder', 'songs/artwork');
    const uploadRes = await fetch(cloudUrl, { method: 'POST', body: form });
    const cloudJson = await uploadRes.json();
    if (!uploadRes.ok) throw new Error(cloudJson.error?.message || 'Artwork upload failed');
    return cloudJson;
  }

  const handleUpload = async () => {
    if (!token) return Alert.alert("Not signed in");
    if (!pickedFile) return Alert.alert("Select a file first");
    if (!title.trim()) return Alert.alert("Title required");

    setUploading(true);
    try {
      // optionally upload artwork first
      let artworkJson = null;
      if (pickedArtwork) {
        artworkJson = await uploadArtworkToCloudinary(pickedArtwork);
      }

      // cloud upload for audio
      const cloudJson = await uploadToCloudinary(pickedFile);

      // create DB record, include artwork metadata when available
      const createRes = await fetch(`${API_URL}/api/songs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          artist: artist.trim(),
          url: cloudJson.secure_url,
          publicId: cloudJson.public_id,
          mimeType: cloudJson.resource_type || pickedFile.mimeType,
          size: cloudJson.bytes || pickedFile.size || 0,
          artworkUrl: artworkJson ? artworkJson.secure_url : undefined,
          artworkPublicId: artworkJson ? artworkJson.public_id : undefined,
        }),
      });
      const createJson = await createRes.json();
      if (!createRes.ok)
        throw new Error(createJson.error || "Failed to save song");

      // prepend to list
      setSongs((s) => [createJson.song, ...s]);
      setTitle("");
      setArtist("");
      setPickedFile(null);
      setPickedArtwork(null);
      Alert.alert("Success", "Song uploaded");
    } catch (e) {
      console.error("upload error", e);
      Alert.alert("Upload failed", e.message);
    } finally {
      setUploading(false);
    }
  };

  const playSong = async (song, index) => {
    try {
      await playTrack(song, songs, index);
    } catch (e) {
      console.warn("playSong", e);
      Alert.alert("Playback error", "Could not play this song");
    }
  };

  const stopPlayback = async () => {
    try {
      await stopPlayer();
    } catch (e) {
      console.warn("stopPlayback", e);
    }
  };

  const showSongOptions = (item) => {
    setOptionsForSong(item);
  };

  const confirmDeleteSong = (item) => {
    Alert.alert("Are you sure?", "Are you sure you want to delete the song?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await fetch(`${API_URL}/api/songs/${item._id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Delete failed");
            setSongs((s) => s.filter((x) => x._id !== item._id));
            setOptionsForSong(null);
          } catch (e) {
            console.warn("delete song failed", e);
            Alert.alert("Delete failed", e.message);
          }
        },
      },
    ]);
  };

  const repeatSongOption = async (item) => {
    try {
      setRepeatMode("one");
      await playTrack(
        item,
        songs,
        songs.findIndex((s) => String(s._id) === String(item._id))
      );
      setOptionsForSong(null);
      Alert.alert("Repeat enabled", "This song will repeat");
    } catch (e) {
      console.warn("repeat song failed", e);
      Alert.alert("Failed", "Could not set repeat");
    }
  };

  const renderItem = ({ item, index }) => {
    const isCurrent = playerCurrent && String(playerCurrent._id) === String(item._id)
    const playing = isCurrent && playerIsPlaying
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => {
          if (playing) stopPlayback()
          else playSong(item, index)
        }}
      >
        {item.artworkUrl ? (
          <Image source={{ uri: item.artworkUrl }} style={styles.cardArt} />
        ) : (
          <View style={styles.cardArtPlaceholder} />
        )}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.songTitle}>{item.title}</Text>
          <Text style={styles.songArtist}>{item.artist || item.user?.username || ""}</Text>
        </View>
        {currentUser && item.user && String(item.user._id) === String(currentUser._id) && (
          <TouchableOpacity style={styles.optionsBtn} onPress={() => showSongOptions(item)}>
            <Text style={styles.optionsText}>⋮</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <Text style={styles.header}>Upload a Song</Text>

      <View style={styles.uploadCard}>
        <TextInput
          placeholder="Title"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />
        <TextInput
          placeholder="Artist"
          value={artist}
          onChangeText={setArtist}
          style={styles.input}
        />

        <TouchableOpacity
          style={styles.fileBtn}
          onPress={pickFile}
          disabled={uploading}
        >
          <Text style={styles.fileBtnText}>
            {pickedFile ? `Selected: ${pickedFile.name}` : "Choose audio file"}
          </Text>
        </TouchableOpacity>
        {pickedFile && (
          <Text style={{ color: COLORS.textLight, marginTop: 6 }}>
            {pickedFile.name}{" "}
            {pickedFile.size
              ? `· ${(pickedFile.size / 1024).toFixed(1)} KB`
              : ""}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.fileBtn, { marginTop: 8 }]}
          onPress={pickArtwork}
          disabled={uploading}
        >
          <Text style={styles.fileBtnText}>{pickedArtwork ? `Artwork selected: ${pickedArtwork.name}` : 'Optional: Choose cover image'}</Text>
        </TouchableOpacity>
        {pickedArtwork && (
          <Text style={{ color: COLORS.textLight, marginTop: 6 }}>{pickedArtwork.name}</Text>
        )}
        {pickedFile && (
          <Text style={{ color: COLORS.textLight, marginTop: 6 }}>
            {pickedFile.name}{" "}
            {pickedFile.size
              ? `· ${(pickedFile.size / 1024).toFixed(1)} KB`
              : ""}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.uploadBtn, { backgroundColor: COLORS.primary }]}
          onPress={handleUpload}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={[styles.uploadBtnText, { color: COLORS.white }]}>
              Upload
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 12 }} />

      <View style={styles.headerRow}>
        <Text style={styles.header}>Recent Songs</Text>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => setSettingsOpen(true)}
        >
          <Feather name="settings" size={21} color="#657786" />
        </TouchableOpacity>
      </View>
      <Modal visible={settingsOpen} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 300,
              backgroundColor: COLORS.card,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Text
              style={{
                fontWeight: "700",
                color: COLORS.text,
                marginBottom: 12,
              }}
            >
              Player Settings
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <Text style={{ color: COLORS.text }}>Shuffle</Text>
              <Switch
                value={shuffle}
                onValueChange={(v) => setShuffle(v)}
                trackColor={{ false: "#767577", true: "#06b6d4" }}
                thumbColor={shuffle ? "#0369a1" : "#f4f3f4"}
              />
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ color: COLORS.text }}>Repeat</Text>
              <TouchableOpacity
                onPress={() =>
                  setRepeatMode(repeatMode === "off" ? "one" : "off")
                }
                style={{
                  padding: 8,
                  backgroundColor: COLORS.border,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: COLORS.text }}>
                  {repeatMode === "one" ? "One" : "Off"}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ height: 12 }} />
            <TouchableOpacity
              onPress={() => setSettingsOpen(false)}
              style={{
                alignSelf: "flex-end",
                padding: 8,
                backgroundColor: "#00BFAE", // Cyan-blue-green color
                borderRadius: 20,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Ionicons name="checkmark" size={20} color="white" />
              <Text style={{ color: "white", marginLeft: 2 }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(i) => i._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12 }}
        />
      )}
  <Modal visible={!!optionsForSong} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.card,
              padding: 12,
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
            }}
          >
            <TouchableOpacity
              style={{ padding: 12 }}
              onPress={() => confirmDeleteSong(optionsForSong)}
            >
              <Text style={{ color: "#ef4444", fontWeight: "700" }}>
                Delete
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ padding: 12 }}
              onPress={() => repeatSongOption(optionsForSong)}
            >
              <Text style={{ color: COLORS.text, fontWeight: "700" }}>
                Repeat song
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ padding: 12, alignItems: "center" }}
              onPress={() => setOptionsForSong(null)}
            >
              <Text style={{ color: COLORS.textLight }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { fontSize: 18, fontWeight: "700", color: COLORS.text, margin: 12 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  settingsBtn: { padding: 8 },
  uploadCard: {
    margin: 12,
    padding: 12,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 8,
    borderRadius: 12,
    marginBottom: 8,
    color: COLORS.text,
  },
  fileBtn: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    marginBottom: 8,
  },
  fileBtnText: { color: COLORS.text },
  uploadBtn: { padding: 12, borderRadius: 12, alignItems: "center" },
  uploadBtnText: { fontWeight: "700" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  songTitle: { fontWeight: "700", color: COLORS.text },
  songArtist: { color: COLORS.textLight, marginTop: 4 },
  cardArt: { width: 56, height: 56, borderRadius: 6 },
  cardArtPlaceholder: { width: 56, height: 56, borderRadius: 6, backgroundColor: '#e6e6e6' },
  playBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 22 },
  playText: { fontWeight: '700' },
  optionsBtn: { paddingHorizontal: 8, paddingVertical: 6, marginLeft: 4 },
  optionsText: { fontSize: 20, color: COLORS.textLight },
});
