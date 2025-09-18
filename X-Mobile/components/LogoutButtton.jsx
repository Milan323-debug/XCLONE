import { View, Text, TouchableOpacity, Alert, StyleSheet, Image } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useCurrentUser } from '../hooks/useCurrentUser';

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

    return (
      <TouchableOpacity 
        style={styles.logoutButton} 
        onPress={confirmLogout}
        activeOpacity={0.7}
      >
        {currentUser?.profileImage ? (
          <Image 
            source={{ uri: currentUser.profileImage }} 
            style={styles.profileImage} 
          />
        ) : (
          <View style={[styles.profileImage, styles.initialsContainer]}>
            <Text style={styles.initialsText}>{userInitials}</Text>
          </View>
        )}
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