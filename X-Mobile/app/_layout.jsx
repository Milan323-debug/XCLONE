import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import SafeScreen from "../components/SafeScreen";
import { StatusBar } from "react-native";
import { useEffect } from "react";
import { useFonts } from "expo-font";

import { useAuthStore } from "../store/authStore";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const {checkAuth, user, token} = useAuthStore();

 const [fontsLoaded] = useFonts({
    "JetBrainsMono": require("../assets/fonts/JetBrainsMono-Medium.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
  setTimeout(() => {
    checkAuth();
    const inAuthScreen = segments[0] === "(auth)";
    const isSignedIn = user && token;

    if (!inAuthScreen && !isSignedIn) {
      router.replace("/(auth)");
    }
    else if (inAuthScreen && isSignedIn) {
      // Navigate explicitly to the home screen inside the (tabs) group
      router.replace("/(tabs)/home");
    }
  }, 100);
}, [user, token, segments]);


  return (
    <SafeAreaProvider>
      <SafeScreen>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
        </Stack>
      </SafeScreen>
      <StatusBar style = "dark"/>
    </SafeAreaProvider>
  );
}