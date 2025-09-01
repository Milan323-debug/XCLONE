import { View, Text } from 'react-native'
import { ActivityIndicator } from 'react-native';
import { size } from 'expo-font';
import { COLORS } from '../constants/colors';

export default function Loader() {
  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: COLORS.background,
    }}>
      <ActivityIndicator size={size} color={COLORS.primary} />
      <Text style={{ marginTop: 10, color: COLORS.text }}>Loading...</Text>
    </View>
  )
}