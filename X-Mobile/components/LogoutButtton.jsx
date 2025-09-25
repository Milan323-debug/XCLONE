import React from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Image } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { getProfileImageUri } from '../lib/utils';

const LogoutButton = () => {
    const { logout } = useAuthStore();
    const { currentUser } = useCurrentUser();

    const confirmLogout = () => {
      Alert.alert(
        "Log out", 
        "Are you sure you want to log out?", 
        [
          { 
            text: "Cancel", 
            style: "cancel" 
          },
          { 
            text: "Log out", 
            onPress: () => logout(), 
            style: "destructive" 
          },
        ]
      );
    };

    const userInitials = currentUser?.name 
      ? currentUser.name.charAt(0).toUpperCase() 
      : 'U';

    const profileImageUri = React.useMemo(() => getProfileImageUri(currentUser), [currentUser]);

    return (
      <TouchableOpacity 
        style={styles.logoutButton} 
        onPress={confirmLogout}
        activeOpacity={0.7}
      >
        <Image 
          source={{ uri: profileImageUri }} 
          style={styles.profileImage}
          defaultSource={require('../assets/images/default-avatar.png')}
        />
      </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
  logoutButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  initialsContainer: {
    backgroundColor: '#E1E8ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: '#536471',
    fontSize: 16,
    fontWeight: '600',
  }
});

export default LogoutButton;