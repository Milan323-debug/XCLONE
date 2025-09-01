import { View, Text, TouchableOpacity, Alert } from 'react-native'
import React, { useState } from 'react'
import { useAuthStore } from '../store/authStore';
import styles from '../assets/styles/login.styles';
import { Image } from 'expo-image';
import { formatMemberSince } from '../lib/utils';
import * as ImagePicker from 'expo-image-picker';

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
                setLocalProfileImage(result.assets[0].uri);
                // TODO: Optionally upload to backend here
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

    if (!user) return null;
    return (
        <View style={styles.profileHeader}>
            <TouchableOpacity onPress={handlePickProfileImage} activeOpacity={0.7}>
                <Image
                    source={{ uri: localProfileImage || user.profileImage || undefined }}
                    style={styles.profileImage}
                    contentFit="cover"
                />
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
                <Text style={styles.email}>{user.email}</Text>
                <Text style={styles.memberSince}> Joined {formatMemberSince(user.createdAt)}</Text>
            </View>
        </View>
    );
}