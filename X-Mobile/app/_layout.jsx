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
    if (!fontsLoaded) return;
    
    async function prepare() {
      try {
        await checkAuth();
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn('Error in prepare:', e);
      }
    }
    prepare();
  }, [fontsLoaded, checkAuth]);

  useEffect(() => {
    if (!fontsLoaded) return;

    const inAuthScreen = segments[0] === "(auth)";
    const isSignedIn = user && token;

    if (isSignedIn && inAuthScreen) {
      router.replace("/(tabs)/home");
    } else if (!isSignedIn && !inAuthScreen) {
      router.replace("/(auth)");
    }
  }, [user, token, segments, fontsLoaded]);


  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <SafeScreen>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen 
            name="(auth)" 
            options={{
              animation: 'none',
            }}
          />
          <Stack.Screen 
            name="(tabs)" 
            options={{
              animation: 'none',
            }}
          />
        </Stack>
      </SafeScreen>
      <StatusBar style = "dark"/>
    </SafeAreaProvider>
  );
}