import PostComposer from "../../components/PostComposer";
import PostsList from "../../components/PostList";
import { usePosts, triggerRefetch } from "../../hooks/usePosts";
import { useUserSync } from "../../hooks/useUserSync";
import { useState } from "react";
import { RefreshControl, ScrollView, Text, View, TouchableOpacity, Image } from "react-native";
import SignOutButton from "../../components/SignOutButton";

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
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#111827' }}>
        <View style={{ width: 48, alignItems: 'flex-start' }}>
          <Image source={require('../../assets/images/icon.png')} style={{ width: 40, height: 40, resizeMode: 'contain' }} />
        </View>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F1419' }}>Home</Text>
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