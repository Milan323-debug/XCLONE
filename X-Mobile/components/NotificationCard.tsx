import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Notification } from '../types/notification';
import { getProfileImageUri } from '../lib/utils';

interface NotificationCardProps {
  notification: Notification;
  onDelete?: (id: string) => Promise<void>;
}

const NotificationCard = ({ notification, onDelete }: NotificationCardProps) => {
  const senderName = notification.from.firstName || notification.from.username || 'Someone';

  const getNotificationText = (type: Notification['type']): string => {
    switch (type) {
      case 'like':
        return `${senderName} liked your post`;
      case 'comment':
        return `${senderName} commented on your post`;
      case 'reply':
        return `${senderName} replied to your comment`;
      case 'follow':
        return `${senderName} started following you`;
      case 'like_comment':
        return `${senderName} liked your comment`;
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'like':
      case 'like_comment':
        return 'heart';
      case 'comment':
        return 'chatbubble';
      case 'reply':
        return 'return-up-forward';
      case 'follow':
        return 'person-add';
      default:
        return 'notifications';
    }
  };

  const getIconColor = (type: Notification['type']): string => {
    switch (type) {
      case 'like':
      case 'like_comment':
        return '#ef4444';
      case 'comment':
      case 'reply':
        return '#3b82f6';
      case 'follow':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={getNotificationIcon(notification.type)} size={20} color={getIconColor(notification.type)} />
      </View>
      
      <View style={styles.content}>
        <Image 
          source={{ uri: getProfileImageUri(notification.from) || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y' }} 
          style={styles.avatar}
          defaultSource={require('../assets/images/default-avatar.png')}
        />
        <View style={styles.textContainer}>
          <Text style={styles.text}>
            {getNotificationText(notification.type)}
          </Text>
          <Text style={styles.time}>
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </Text>
        </View>
      </View>

      {onDelete && (
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={async () => {
            try {
              await onDelete(notification._id);
            } catch (error) {
              console.error('Failed to delete notification:', error);
            }
          }}
        >
          <Ionicons name="close" size={20} color="#6b7280" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    marginLeft: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  text: {
    fontSize: 15,
    color: '#1f2937',
  },
  time: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
});

export default NotificationCard;
