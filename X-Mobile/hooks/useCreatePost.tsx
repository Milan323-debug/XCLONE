import React, { useState } from "react";
import { Alert, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { API_URL } from "../constants/api";
import { useAuthStore } from "../store/authStore";
import { triggerRefetch } from './usePosts';

export const useCreatePost = () => {
  const [content, setContent] = useState("");
  const [selectedMediaUri, setSelectedMediaUri] = useState<string | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<'image' | 'video' | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const sendCreatePost = async (postData: { content: string; mediaUri?: string; mediaType?: string }) => {
    setIsCreating(true);
    try {
      const formData = new FormData();
      if (postData.content) formData.append("content", postData.content);

      console.log('Creating post with content:', postData.content);
      console.log('Media URI:', postData.mediaUri);
      console.log('Media type:', postData.mediaType);

      if (postData.mediaUri) {
        // infer file extension
        const uriParts = postData.mediaUri.split(".");
        const fileType = uriParts[uriParts.length - 1].toLowerCase();
        const isVideo = (postData.mediaType || "").startsWith("video") || ["mp4", "mov", "mkv", "webm", "3gp"].includes(fileType);
        const mimeType = postData.mediaType || (isVideo ? `video/${fileType}` : `image/${fileType}`);
        // On Android use the RN file object form (avoids issues fetching file:// URIs as blobs)
        if (Platform.OS === 'android') {
          // For video files, we need to handle them specially
          if (postData.mediaType?.startsWith('video/') || fileType === 'mp4') {
            try {
              // Access the file to check its size
              const response = await fetch(postData.mediaUri);
              const blob = await response.blob();
              const fileSize = blob.size;
              
              console.log(`Preparing video upload. Size: ${(fileSize / (1024 * 1024)).toFixed(2)}MB`);
              
              const maxSize = 25; // 25MB limit
              if (fileSize > maxSize * 1024 * 1024) {
                Alert.alert(
                  'Video Too Large',
                  `Please select a video smaller than ${maxSize}MB or use a lower quality setting. Try reducing the video length or resolution.`,
                  [{ text: 'OK' }]
                );
                throw new Error('Video file too large');
              }
              
              // Add video-specific headers to help with upload
              formData.append('fileSize', fileSize.toString());
              formData.append('fileType', 'video/mp4');
            } catch (e) {
              console.error('Error preparing video:', e);
              const errorMessage = typeof e === 'object' && e !== null && 'message' in e ? (e as { message?: string }).message : String(e);
              throw new Error('Could not prepare video for upload: ' + errorMessage);
            }
          }

          // Determine proper MIME type based on file extension
          let finalMimeType = mimeType;
          if (fileType === 'jpeg') {
            finalMimeType = 'image/jpeg';
          } else if (fileType === 'mp4') {
            finalMimeType = 'video/mp4';
          } else if (fileType === 'mov') {
            finalMimeType = 'video/quicktime';
          } else if (fileType === '3gp') {
            finalMimeType = 'video/3gpp';
          } else if (fileType === 'mkv') {
            finalMimeType = 'video/x-matroska';
          }

          const mediaFile = {
            uri: postData.mediaUri,
            name: `upload.${fileType}`,
            type: finalMimeType,
          };
          
          console.log('Appending media for Android:', mediaFile);
          formData.append("media", mediaFile as any);
        } else {
          // On iOS/web try blob approach first, fallback to RN file object
          try {
            const uriToFetch = postData.mediaUri;
            const response = await fetch(uriToFetch);
            const blob = await response.blob();
            const fileName = `media.${fileType}`;
            formData.append('media', blob as any, fileName);
          } catch (blobErr: any) {
            console.warn('blob append failed, falling back to RN file object', String(blobErr));
            formData.append("media", {
              uri: postData.mediaUri,
              name: `media.${fileType}`,
              type: mimeType,
            } as any);
          }
        }
      }

      const token = useAuthStore.getState().token;
      if (!token) {
        setIsCreating(false);
        Alert.alert("Not authenticated", "Please log in before creating a post");
        throw new Error("No auth token");
      }

      const endpoint = `${API_URL.replace(/\/$/, '')}/api/posts`;
      console.log('createPost: POST', endpoint, 'token?', !!token);
      
      // For video uploads, use fetch with a longer timeout
      if (postData.mediaType?.startsWith('video/') || postData.mediaUri?.endsWith('.mp4')) {
        try {
          if (!postData.mediaUri) {
            throw new Error('No media URI provided');
          }

          // Check file size before upload
          const response = await fetch(postData.mediaUri);
          const blob = await response.blob();
          const fileSize = blob.size;
          const fileSizeMB = fileSize / (1024 * 1024);
          
          console.log(`Starting video upload... File size: ${fileSizeMB.toFixed(2)}MB`);
          
          const maxSize = 25; // 25MB limit
          if (fileSizeMB > maxSize) {
            Alert.alert(
              'Video Too Large',
              `The video file is too large. Maximum size is ${maxSize}MB. Try these tips:\n- Record a shorter video\n- Use a lower video quality\n- Reduce the video resolution`,
              [{ text: 'OK' }]
            );
            throw new Error('Video file too large');
          }
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 minutes timeout
          
          const response2 = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
              'Content-Type': 'multipart/form-data'
            },
            body: formData,
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);

          if (!response2.ok) {
            const errorText = await response2.text();
            console.error('Upload failed:', {
              status: response2.status,
              statusText: response2.statusText,
              error: errorText
            });
            throw new Error(`Upload failed: ${response2.status} ${errorText}`);
          }

          console.log('Video upload successful');
          const result = await response2.json();
          
          // Reset form state on success
          setContent("");
          setSelectedMediaUri(null);
          setSelectedMediaType(null);
          Alert.alert("Success", "Video post created successfully!");
          try { if (typeof triggerRefetch === 'function') void triggerRefetch(); } catch (e) {}
          
          return result;
        } catch (error: any) {
          if (error.name === 'TimeoutError') {
            console.error('Upload timed out - video may be too large');
            Alert.alert(
              'Upload Timeout',
              'The video upload timed out. Try a shorter or lower quality video.',
              [{ text: 'OK' }]
            );
          } else {
            console.error('Video upload error:', error);
          }
          throw error;
        }
      }
      
      // For non-video content, use regular fetch with shorter timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout after 30s')), 30000)
      );
      
      try {
        // Log the full FormData contents for debugging
        console.log('FormData entries:', 
          [...(formData as any).entries()].map(([key, value]: [string, any]) => ({
            key,
            type: typeof value,
            isFile: value instanceof File,
            isBlob: value instanceof Blob,
            uri: value?.uri,
            mimeType: value?.type
          }))
        );

        // Race the fetch against a timeout
        const res = await Promise.race([
          fetch(endpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              'Accept': 'application/json',
            },
            body: formData,
          }),
          timeoutPromise
        ]) as Response;
        
        console.log('Response status:', res.status);
        const responseHeaders = Object.fromEntries([...res.headers.entries()]);
        console.log('Response headers:', JSON.stringify(responseHeaders));
        
        if (!res.ok) {
          const text = await res.text();
          console.error('Server error response:', text);
          throw new Error(text || "Failed to create post");
        }

        // success
        setContent("");
        setSelectedMediaUri(null);
        setSelectedMediaType(null);
        Alert.alert("Success", "Post created successfully!");
        try { if (typeof triggerRefetch === 'function') void triggerRefetch(); } catch (e) {}
        return await res.json();
      } catch (networkErr: any) {
        // More detailed network error handling / logging
        console.error('createPost network error', networkErr?.name, networkErr?.message, networkErr);
        Alert.alert('Network error', networkErr?.message || 'Network request failed');
        throw networkErr;
      }
    } catch (err: any) {
      console.error('sendCreatePost caught error', err?.name, err?.message, err);
      Alert.alert("Error", err?.message || "Failed to create post. Please try again.");
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  const handleMediaPicker = async (useCamera: boolean = false, mediaKind: 'image' | 'video' | 'all' = 'all') => {
    const permissionResult = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult || (permissionResult as any).granted === false) {
      const source = useCamera ? "camera" : "photo library";
      Alert.alert("Permission needed", `Please grant permission to access your ${source}`);
      return;
    }

    const pickerOptions: ImagePicker.ImagePickerOptions = {
      allowsEditing: true,
      aspect: undefined, // Allow free aspect ratio for all media
      quality: mediaKind === 'video' ? 0.3 : 0.6, // Lower quality to meet size limits
      exif: false,
      mediaTypes: mediaKind === 'video' ? ImagePicker.MediaTypeOptions.Videos : 
                 mediaKind === 'image' ? ImagePicker.MediaTypeOptions.Images :
                 ImagePicker.MediaTypeOptions.All,
      videoMaxDuration: 30, // Limit to 30 seconds to help control file size
      allowsMultipleSelection: false,
      // Set video quality
      ...(Platform.OS === 'ios' ? {
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium
      } : {
        quality: 0.3 // Lower quality for Android
      })
    };

    if (mediaKind === 'image') pickerOptions.mediaTypes = ImagePicker.MediaTypeOptions.Images;
    if (mediaKind === 'video') pickerOptions.mediaTypes = ImagePicker.MediaTypeOptions.Videos;

    const result = useCamera
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions);

    if (!(result as any).canceled && (result as any).assets?.[0]) {
      const asset = (result as any).assets[0];
      
      // Check file size for videos
      // Check file size for all media types
      if (asset.fileSize) {
        const sizeMB = asset.fileSize / (1024 * 1024);
        const isVideo = asset.type?.startsWith('video') || asset.uri.match(/\.(mp4|mov|mkv|webm|3gp)(\?|$)/i);
        const maxSize = 4; // 4MB limit to match Vercel's free tier limit
        
        console.log(`${isVideo ? 'Video' : 'Image'} size: ${sizeMB.toFixed(2)}MB`);
        
        if (sizeMB > maxSize) {
          Alert.alert(
            'File Too Large',
            `Please select a ${isVideo ? 'shorter video or use a lower quality setting' : 'smaller image'}. Maximum size is ${maxSize}MB.`,
            [{ text: 'OK' }]
          );
          return;
        }
      }
      
      setSelectedMediaUri(asset.uri);
      const detectedType = (asset.type && asset.type.startsWith('video')) || (asset.mediaType && asset.mediaType === 'video') || String(asset.uri).match(/\.(mp4|mov|mkv|webm|3gp)(\?|$)/i)
        ? 'video' : 'image';
      setSelectedMediaType(detectedType);
    }
  };

  const createPost = () => {
    if (!content.trim() && !selectedMediaUri) {
      Alert.alert("Empty Post", "Please write something or add media before posting!");
      return;
    }

    const postData: { content: string; mediaUri?: string; mediaType?: string } = { content: content.trim() };
    if (selectedMediaUri) {
      postData.mediaUri = selectedMediaUri;
      if (selectedMediaType) postData.mediaType = selectedMediaType;
    }
    void sendCreatePost(postData);
  };

  return {
    content,
    setContent,
    selectedMediaUri,
    selectedMediaType,
    isCreating,
    pickImageFromGallery: () => handleMediaPicker(false, 'image'),
    pickVideoFromGallery: () => handleMediaPicker(false, 'video'),
    takePhoto: () => handleMediaPicker(true, 'image'),
    recordVideo: () => handleMediaPicker(true, 'video'),
    removeMedia: () => { setSelectedMediaUri(null); setSelectedMediaType(null); },
    createPost,
  };
};