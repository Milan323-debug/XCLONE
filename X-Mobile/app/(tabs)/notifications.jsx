import React from 'react';
import NoNotificationsFound from "@/components/NoNotificationsFound";
import NotificationCard from "@/components/NotificationCard";
import { useNotifications } from "@/hooks/useNotifications";
import { Feather } from "@expo/vector-icons";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const NotificationsScreen = () => {
  const { notifications, isLoading, error, refetch, isRefetching, deleteNotification } =
    useNotifications();

  const insets = useSafeAreaInsets();

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={[styles.centeredContainer, styles.fullScreen]}>
          <ActivityIndicator size="large" color="#1DA1F2" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={[styles.centeredContainer, styles.fullScreen]}>
          <Text style={styles.errorText}>Failed to load notifications</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (notifications.length === 0) {
      return <NoNotificationsFound onRefresh={refetch} />;
    }

    return notifications.map((notification) => (
      <NotificationCard
        key={notification._id}
        notification={notification}
        onDelete={deleteNotification}
      />
    ));
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity>
          <Feather name="settings" size={24} color="#657786" />
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 100 + insets.bottom }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={isRefetching} 
            onRefresh={refetch} 
            tintColor="#1DA1F2"
          />
        }
      >
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
};
export default NotificationsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  fullScreen: {
    minHeight: '100%',
  },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  errorText: {
    color: '#6b7280',
    marginBottom: 12,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#1DA1F2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    minWidth: 120,
    alignItems: 'center',
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingText: {
    color: '#6b7280',
    marginTop: 12,
    fontSize: 15,
  },
});