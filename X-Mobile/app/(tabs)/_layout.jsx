import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { View, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PlayerContainer from '../../components/PlayerContainer'


const _layout = () => {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, position: 'relative' }}>
      <PlayerContainer />
      <Tabs
    screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2bcbba',
        tabBarInactiveTintColor: '#9e9e9e',
        tabBarShowLabel: true,
        tabBarStyle: {
          height: 58,
          paddingBottom: 6,
          paddingTop: 6,
          elevation: 12,
          zIndex: 12,
          backgroundColor: '#ffffff',
        }
    }}>
  <Tabs.Screen name="home" options={{
        title: "",
        tabBarIcon: ({color , size}) => (
          <Ionicons name="home-outline" size = {size} color={color} />
        )
      }} />
      <Tabs.Screen name="search" options={{
        title: "",
        tabBarIcon: ({color , size}) => (
          <Ionicons name="search-outline" size = {size} color={color} />
        )
      }} />
      <Tabs.Screen name="messages" options={{
        title: "",
        tabBarIcon: ({color , size}) => (
          <Ionicons name="chatbubble-outline" size = {size} color={color} />
        )
      }} />
      <Tabs.Screen name="notifications" options={{
        title: "",
        tabBarIcon: ({color , size}) => (
          <Ionicons name="notifications-outline" size = {size} color={color} />
        )
      }} />
      <Tabs.Screen name="songs" options={{
        title: "",
        tabBarIcon: ({color , size}) => (
          <Ionicons name="musical-notes" size = {size} color={color} />
        )
      }} />
      <Tabs.Screen name="profile" options={{
        title: "",
        tabBarIcon: ({color , size}) => (
          <Ionicons name="person-outline" size = {size} color={color} />
        )
      }} />
    </Tabs>
      <PlayerContainer />
    </View>
  )
}

export default _layout