import { COLORS } from "@/constants/colors";
import { useCreatePost } from "../hooks/useCreatePost";
import { useAuthStore } from "../store/authStore";
import { Feather } from "@expo/vector-icons";
import { View, Text, Image, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Video } from "expo-av";

const PostComposer = () => {
  const {
    content,
    setContent,
    selectedMediaUri,
    selectedMediaType,
    isCreating,
    pickImageFromGallery,
    pickVideoFromGallery,
    takePhoto,
    recordVideo,
    removeMedia,
    createPost,
  } = useCreatePost();

  const { user } = useAuthStore();

  return (
    <View style={styles.container}>
      <View style={styles.row}>
  <Image source={{ uri: user?.profileImage || 'https://as1.ftcdn.net/v2/jpg/05/60/26/08/1000_F_560260880_O1V3Qm2cNO5HWjN66mBh2NrlPHNHOUxW.jpg' }} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="What's happening?"
              placeholderTextColor="#6b7280"
              value={content}
              onChangeText={setContent}
            />
          </View>
        </View>
      </View>

      {selectedMediaUri && (
        <View style={styles.previewWrap}>
          <View>
            {/* rudimentary mime check to decide image vs video preview */}
            {selectedMediaType === 'video' || selectedMediaUri.match(/\.(mp4|mov|mkv|webm|3gp)(\?|$)/i) ? (
              <Video
                source={{ uri: selectedMediaUri! }}
                style={styles.preview}
                useNativeControls
                isLooping
              />
            ) : (
              <Image
                source={{ uri: selectedMediaUri! }}
                style={styles.preview}
                resizeMode="cover"
              />
            )}

            <TouchableOpacity style={styles.removeBtn} onPress={removeMedia}>
              <Feather name="x" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.footerRow}>
        <View style={styles.leftIcons}>
          <TouchableOpacity style={styles.iconBtn} onPress={pickImageFromGallery} accessibilityLabel="Pick image">
            <Feather name="image" size={20} color="#1DA1F2" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={pickVideoFromGallery} accessibilityLabel="Pick video">
            <Feather name="video" size={20} color="#1DA1F2" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={takePhoto} accessibilityLabel="Take photo">
            <Feather name="camera" size={20} color="#1DA1F2" />
          </TouchableOpacity>
          {/* <TouchableOpacity style={styles.iconBtn} onPress={recordVideo} accessibilityLabel="Record video">
            <Feather name="video" size={20} color="#0ea5e9" />
          </TouchableOpacity> */}
        </View>

        <View style={styles.rightArea}>
          {content.length > 0 && (
            <Text style={[styles.charsLeft, content.length > 260 ? { color: '#ef4444' } : { color: '#6b7280' }]}>
              {280 - content.length}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.postBtn, (content.trim() || selectedMediaUri) ? styles.postBtnActive : styles.postBtnDisabled]}
            onPress={createPost}
            disabled={isCreating || !(content.trim() || selectedMediaUri)}
          >
            {isCreating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={(content.trim() || selectedMediaUri) ? styles.postBtnTextActive : styles.postBtnTextDisabled}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
export default PostComposer;

const styles = StyleSheet.create({
  container: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6', padding: 12, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  inputWrap: { backgroundColor: '#f1f5f9', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
  input: { fontSize: 16, color: '#111827', padding: 0, margin: 0 },
  previewWrap: { marginTop: 12, marginLeft: 24 },
  preview: { width: '100%', height: 192, borderRadius: 14 },
  removeBtn: { position: 'absolute', top: 8, right: 8, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  leftIcons: { flexDirection: 'row' },
  iconBtn: { marginRight: 12 },
  rightArea: { flexDirection: 'row', alignItems: 'center' },
  charsLeft: { marginRight: 12, fontSize: 12 },
  postBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  postBtnActive: { backgroundColor: '#1DA1F2' },
  postBtnDisabled: { backgroundColor: '#e5e7eb' },
  postBtnTextActive: { color: '#fff', fontWeight: '700' },
  postBtnTextDisabled: { color: '#6b7280', fontWeight: '700' },
});