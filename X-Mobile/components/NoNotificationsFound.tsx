import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';

const NoNotificationsFound = ({ onRefresh }: { onRefresh?: () => void }) => {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1827/1827504.png' }} style={{ width: 120, height: 120, marginBottom: 16, opacity: 0.6 }} />
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 8 }}>No notifications</Text>
      <Text style={{ color: '#6b7280', textAlign: 'center', marginBottom: 12 }}>You're all caught up — we'll let you know when something happens.</Text>
      {onRefresh ? (
        <TouchableOpacity onPress={onRefresh} style={{ backgroundColor: '#eef2ff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 }}>
          <Text style={{ color: '#1f2937' }}>Refresh</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

export default NoNotificationsFound;