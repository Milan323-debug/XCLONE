import { View, Text, ActivityIndicator } from 'react-native';
import { COLORS } from '../constants/colors';

export default function Loader() {
  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: COLORS.background,
    }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={{ marginTop: 10, color: COLORS.text }}>Loading...</Text>
    </View>
  )
}