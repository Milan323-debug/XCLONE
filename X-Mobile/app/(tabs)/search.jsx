import React from "react";
import { Feather } from "@expo/vector-icons";
import { View, TextInput, ScrollView, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useState, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";

const TRENDING_TOPICS = [
  { topic: "#ReactNative", tweets: "125K" },
  { topic: "#TypeScript", tweets: "89K" },
  { topic: "#WebDevelopment", tweets: "234K" },
  { topic: "#AI", tweets: "567K" },
  { topic: "#TechNews", tweets: "98K" },
];

const SearchScreen = () => {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const results = useMemo(() => {
    if (!query) return TRENDING_TOPICS;
    const q = query.toLowerCase().replace('#','');
    return TRENDING_TOPICS.filter(t => t.topic.toLowerCase().includes(q) || t.topic.toLowerCase().replace('#','').includes(q));
  }, [query]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <View style={styles.headerWrap}>
        <View style={[styles.searchBox, { borderColor: focused ? COLORS.primary : COLORS.border }] }>
          <Feather name="search" size={20} color={focused ? COLORS.primary : COLORS.textLight} />
          <TextInput
            placeholder="Search Twitter"
            style={styles.input}
            placeholderTextColor={COLORS.textLight}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
              <Ionicons name="close" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.heading}>Trending for you</Text>
          {results.length === 0 ? (
            <Text style={{ color: COLORS.textLight, marginTop: 12 }}>No results</Text>
          ) : (
            results.map((item, index) => (
              <TouchableOpacity key={index} style={styles.trendCard} activeOpacity={0.8}>
                <View style={styles.trendLeft} />
                <View style={styles.trendBody}>
                  <Text style={styles.trendSub}>Trending in Technology</Text>
                  <Text style={styles.trendTopic}>{item.topic}</Text>
                </View>
                <Text style={styles.trendCount}>{item.tweets}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  headerWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#eee' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  input: { flex: 1, marginLeft: 8, fontSize: 16, color: COLORS.text },
  clearBtn: { marginLeft: 8, padding: 6 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 120 }, // avoid overlap with tab bar
  content: { padding: 16 },
  heading: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  trendCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: COLORS.white, marginBottom: 12, paddingHorizontal: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  trendLeft: { width: 6, height: 48, backgroundColor: COLORS.primary, borderRadius: 6, marginRight: 12 },
  trendBody: { flex: 1 },
  trendSub: { color: COLORS.textLight, fontSize: 13 },
  trendTopic: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginTop: 4 },
  trendCount: { color: COLORS.textLight, fontSize: 13, marginLeft: 12 },
});

export default SearchScreen;