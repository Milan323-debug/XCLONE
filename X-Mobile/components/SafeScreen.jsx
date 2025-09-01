import { View, Text } from 'react-native'
import React from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLORS } from '../constants/colors.js'

const SafeScreen = ({children}) => {
    const insets = useSafeAreaInsets()
  return (
    <View style={{
      flex: 1, backgroundColor: COLORS.primary, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {children}
    </View>
  )
}

export default SafeScreen