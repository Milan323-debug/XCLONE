import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NoNotificationsFoundProps {
  onRefresh?: () => void;
}

const NoNotificationsFound: React.FC<NoNotificationsFoundProps> = ({ onRefresh }) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="notifications-outline" size={48} color="#94a3b8" />
      </View>
      <Text style={styles.title}>No notifications</Text>
      <Text style={styles.description}>
        You're all caught up — we'll let you know when something happens.
      </Text>
      {onRefresh && (
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color="#4b5563" style={styles.refreshIcon} />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  description: {
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  refreshIcon: {
    marginRight: 8,
  },
  refreshText: {
    color: '#4b5563',
    fontWeight: '600',
  },
});

export default NoNotificationsFound;