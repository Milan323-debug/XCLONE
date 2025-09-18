import React, { useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { API_URL } from "../constants/api";
import { useAuthStore } from "../store/authStore";
import { triggerRefetch } from './usePosts';

export const useCreatePost = () => {
  const [content, setContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const sendCreatePost = async (postData: { content: string; imageUri?: string }) => {
    setIsCreating(true);
    try {
      const formData = new FormData();
      if (postData.content) formData.append("content", postData.content);

      if (postData.imageUri) {
        const uriParts = postData.imageUri.split(".");
        const fileType = uriParts[uriParts.length - 1].toLowerCase();
        const mimeTypeMap: { [k: string]: string } = {
          png: "image/png",
          gif: "image/gif",
          webp: "image/webp",
        };
        const mimeType = mimeTypeMap[fileType] || "image/jpeg";

        formData.append("image", {
          uri: postData.imageUri,
          name: `image.${fileType}`,
          type: mimeType,
        } as any);
      }

        const token = useAuthStore.getState().token;
        if (!token) {
          setIsCreating(false);
          Alert.alert("Not authenticated", "Please log in before creating a post");
          throw new Error("No auth token");
        }

        console.log('useCreatePost: sending create-post with token present?', !!token);
        const res = await fetch(`${API_URL}api/posts`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to create post");
      }

  // success
  setContent("");
  setSelectedImage(null);
  Alert.alert("Success", "Post created successfully!");
  // trigger any post list refetch
  try { if (typeof triggerRefetch === 'function') void triggerRefetch(); } catch (e) {}
  return await res.json();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to create post. Please try again.");
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  const handleImagePicker = async (useCamera: boolean = false) => {
    const permissionResult = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult || (permissionResult as any).granted === false) {
      const source = useCamera ? "camera" : "photo library";
      Alert.alert("Permission needed", `Please grant permission to access your ${source}`);
      return;
    }

    const pickerOptions = {
      allowsEditing: true,
      aspect: [16, 9] as [number, number],
      quality: 0.8,
    };

    const result = useCamera
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync({ ...pickerOptions, mediaTypes: ImagePicker.MediaTypeOptions.Images });

    // Newer ImagePicker returns { canceled, assets } shape
    if (!(result as any).canceled && (result as any).assets && (result as any).assets.length > 0) {
      setSelectedImage((result as any).assets[0].uri);
    }
  };

  const createPost = () => {
    if (!content.trim() && !selectedImage) {
      Alert.alert("Empty Post", "Please write something or add an image before posting!");
      return;
    }

    const postData: { content: string; imageUri?: string } = { content: content.trim() };
    if (selectedImage) postData.imageUri = selectedImage;
    void sendCreatePost(postData);
  };

  return {
    content,
    setContent,
    selectedImage,
  isCreating,
    pickImageFromGallery: () => handleImagePicker(false),
    takePhoto: () => handleImagePicker(true),
    removeImage: () => setSelectedImage(null),
    createPost,
  };
};