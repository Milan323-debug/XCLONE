import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import React, { useState } from 'react'
import { useAuthStore } from '../store/authStore';
import styles from '../assets/styles/login.styles';
import { Image } from 'expo-image';
import { formatMemberSince, getProfileImageUri } from '../lib/utils';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '../constants/api';

export default function ProfileHeader() {
    const { user } = useAuthStore();
    const [localProfileImage, setLocalProfileImage] = useState(null);

    // Handler to pick a new profile image
    const handlePickProfileImage = async () => {
        try {
            // Use the new permission API for Expo SDK 49+
            const permission = await ImagePicker.getMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                const request = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!request.granted) {
                    Alert.alert('Permission denied', 'Camera roll permissions are required!');
                    return;
                }
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: [ImagePicker.MediaType.IMAGE],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
                base64: false,
            });
            if (!result.canceled && result.assets && result.assets[0].uri) {
                const uri = result.assets[0].uri;
                setLocalProfileImage(uri);
                // upload as multipart/form-data like createPost
                const token = useAuthStore.getState().token;
                if (!token) {
                    Alert.alert('Not authenticated', 'Please log in to update your profile');
                    return;
                }

                setUploading(true);
                try {
                    const form = new FormData();
                    // derive filename and type
                    const uriParts = uri.split('/');
                    const name = uriParts[uriParts.length - 1];
                    const match = name.match(/\.([0-9a-z]+)(?:[\?#]|$)/i);
                    const ext = match ? match[1] : 'jpg';
                    const type = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

                    form.append('profileImage', {
                        uri,
                        name: name,
                        type,
                    });

                    const res = await fetch(`${API_URL}/api/user/profile`, {
                        method: 'PUT',
                        headers: {
                            Authorization: `Bearer ${token}`,
                            // NOTE: Do not set Content-Type; fetch will set the correct boundary for multipart
                        },
                        body: form,
                    });

                    const json = await res.json();
                    if (!res.ok) {
                        console.warn('Profile image upload failed', json);
                        Alert.alert('Upload failed', json.message || json.error || 'Could not upload image');
                        // revert local preview if desired
                        setLocalProfileImage(null);
                    } else {
                        // update auth store user with returned user
                        const updatedUser = json.user;
                        if (updatedUser) {
                            useAuthStore.setState({ user: updatedUser });
                        }
                    }
                } catch (err) {
                    console.warn('Profile upload error', err);
                    Alert.alert('Upload error', err.message || 'Could not upload image');
                    setLocalProfileImage(null);
                } finally {
                    setUploading(false);
                }
            } else if (result.canceled) {
                // User cancelled, do nothing
                return;
            } else {
                Alert.alert('Error', 'No image selected.');
            }
        } catch (error) {
            Alert.alert('Error', 'Could not pick image.');
        }
    };

    const [uploading, setUploading] = useState(false);

    if (!user) return null;
    return (
        <View style={styles.profileHeader}>
            <TouchableOpacity onPress={handlePickProfileImage} activeOpacity={0.7} disabled={uploading}>
                <Image
                    source={{ uri: localProfileImage || getProfileImageUri(user) || undefined }}
                    style={styles.profileImage}
                    contentFit="cover"
                />
                {uploading && (
                    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.4)'}}>
                        <ActivityIndicator size="large" color="#1DA1F2" />
                    </View>
                )}
                {!localProfileImage && !user.profileImage && (
                    <View style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <Text style={{ color: '#aaa', fontSize: 32 }}>+</Text>
                    </View>
                )}
            </TouchableOpacity>
            <View style={styles.profileInfo}>
                        <Text style={styles.username}>{user.username}</Text>
                        {user.firstName || user.lastName ? (
                            <Text style={styles.name}>{[user.firstName, user.lastName].filter(Boolean).join(' ')}</Text>
                        ) : null}
                        {user.email ? <Text style={styles.email}>{user.email}</Text> : null}
                        {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}

                        <View style={{ flexDirection: 'row', marginTop: 6, alignItems: 'center' }}>
                            {typeof user.followers === 'number' && typeof user.following === 'number' ? (
                                <>
                                    <Text style={{ marginRight: 12, color: '#6b7280' }}>{user.following} Following</Text>
                                    <Text style={{ color: '#6b7280' }}>{user.followers} Followers</Text>
                                </>
                            ) : null}
                        </View>

                        {user.location ? <Text style={{ color: '#6b7280', marginTop: 6 }}>{user.location}</Text> : null}
                        {user.website ? <Text style={{ color: '#1DA1F2', marginTop: 6 }}>{user.website}</Text> : null}
                        <Text style={styles.memberSince}> Joined {formatMemberSince(user.createdAt)}</Text>
            </View>
        </View>
    );
}