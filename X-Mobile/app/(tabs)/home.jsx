import PostComposer from "../../components/PostComposer";
import PostsList from "../../components/PostList";
import { usePosts, triggerRefetch } from "../../hooks/usePosts";
import { useUserSync } from "../../hooks/useUserSync";
import { useState } from "react";
import { RefreshControl, ScrollView, Text, View, TouchableOpacity, Image, StyleSheet } from "react-native";
import SignOutButton from "../../components/SignOutButton";
import { COLORS } from '../../constants/colors';

const HomeScreen = () => {
  const [isRefetching, setIsRefetching] = useState(false);
  // ensure we don't create a separate posts instance here — use the shared triggerRefetch

  const handlePullToRefresh = async () => {
    setIsRefetching(true);

    // call the shared triggerRefetch which the PostsList's usePosts instance sets
    if (typeof triggerRefetch === 'function') {
      try {
        await triggerRefetch();
      } catch (e) {
        console.warn('refresh error', e);
      }
    }
    setIsRefetching(false);
  };

  useUserSync();

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={[styles.headerRow]}>
        <View style={{ width: 48, alignItems: 'flex-start' }}>
          <Image source={require('../../assets/images/icon.png')} style={{ width: 40, height: 40, resizeMode: 'contain' }} />
        </View>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.headerTitle]}>Home</Text>
        </View>

        <View style={{ width: 48, alignItems: 'flex-end' }}>
          <SignOutButton />
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <PostComposer />
        <PostsList
          onRefresh={handlePullToRefresh}
          refreshing={isRefetching}
        />
      </View>
    </View>
  );
};
export default HomeScreen;

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.background },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
});