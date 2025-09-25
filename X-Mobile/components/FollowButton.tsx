import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle } from 'react-native';

type Props = {
  isFollowing: boolean;
  loading?: boolean;
  onToggle: () => void | Promise<void>;
  style?: ViewStyle;
};

export default function FollowButton({ isFollowing, loading, onToggle, style }: Props) {
  return (
    <TouchableOpacity
      onPress={() => { if (!loading) onToggle(); }}
      style={[{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: isFollowing ? '#e5f3f1' : '#008B8B' }, style]}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isFollowing ? '#0b6b5a' : '#fff'} />
      ) : (
        <Text style={{ color: isFollowing ? '#0b6b5a' : '#fff', fontWeight: '600' }}>{isFollowing ? 'Following' : 'Follow'}</Text>
      )}
    </TouchableOpacity>
  );
}
