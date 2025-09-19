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

  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>Failed to load notifications</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity>
          <Feather name="settings" size={24} color="#657786" />
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={"#1DA1F2"} />
        }
      >
        {isLoading ? (
          <View style={styles.centeredContainer}>
            <ActivityIndicator size="large" color="#1DA1F2" />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <NoNotificationsFound onRefresh={refetch} />
        ) : (
          notifications.map((notification) => (
            <NotificationCard
              key={notification._id}
              notification={notification}
              onDelete={deleteNotification}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
export default NotificationsScreen;

const styles = StyleSheet.create({
  centeredContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  errorText: { color: '#6b7280', marginBottom: 12 },
  retryBtn: { backgroundColor: '#1DA1F2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '700' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  loadingText: { color: '#6b7280', marginTop: 12 },
});