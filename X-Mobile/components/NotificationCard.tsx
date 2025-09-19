import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { formatDistanceToNow } from 'date-fns';

const NotificationCard = ({ notification, onDelete }: any) => {
  const from = notification.from || notification.user || {};
  return (
    <View style={{ flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' }}>
      <Image source={{ uri: from.profileImage || 'https://i.pravatar.cc/40' }} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700', color: '#0f172a' }}>{from.username || from.name || 'Someone'}</Text>
        <Text style={{ color: '#475569', marginTop: 2 }}>{notification.message || `${notification.type} on your post`}</Text>
        <Text style={{ color: '#94a3b8', marginTop: 6, fontSize: 12 }}>{formatDistanceToNow(new Date(notification.createdAt || Date.now()))} ago</Text>
      </View>
      <TouchableOpacity onPress={() => onDelete && onDelete(notification._id)} style={{ padding: 8 }}>
        <Text style={{ color: '#ef4444' }}>Delete</Text>
      </TouchableOpacity>
    </View>
  );
};

export default NotificationCard;
