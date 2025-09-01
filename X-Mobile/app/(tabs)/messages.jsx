import { CONVERSATIONS } from "../../data/conversations";
import { Feather } from "@expo/vector-icons";
import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  Alert,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Pressable,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";

const MessagesScreen = () => {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState("");
  const [conversationsList, setConversationsList] = useState(CONVERSATIONS);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const messagesFlatRef = useRef(null);

  const deleteConversation = (conversationId) => {
    Alert.alert("Delete Conversation", "Are you sure you want to delete this conversation?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setConversationsList((prev) => prev.filter((conv) => conv.id !== conversationId));
        },
      },
    ]);
  };

  const openConversation = (conversation) => {
    setSelectedConversation(conversation);
    setIsChatOpen(true);
  };

  const closeChatModal = () => {
    setIsChatOpen(false);
    setSelectedConversation(null);
    setNewMessage("");
  };

  const sendMessage = () => {
    if (newMessage.trim() && selectedConversation) {
      // update last message in conversation
      setConversationsList((prev) =>
        prev.map((conv) =>
          conv.id === selectedConversation.id
            ? { ...conv, lastMessage: newMessage, time: "now" }
            : conv
        )
      );
      setNewMessage("");
      Alert.alert(
        "Message Sent!",
        `Your message has been sent to ${selectedConversation.user.name}`
      );
      // scroll the messages FlatList to bottom after sending
      setTimeout(() => {
        try {
          messagesFlatRef.current?.scrollToOffset({ offset: 0, animated: true });
        } catch (e) {}
      }, 100);
    }
  };

  // debounce search input to avoid filtering on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchText.trim()), 250);
    return () => clearTimeout(t);
  }, [searchText]);

  const filteredConversations = useMemo(() => {
    if (!debouncedQuery) return conversationsList;
    const q = debouncedQuery.toLowerCase().replace('@', '').replace('#','');
    return conversationsList.filter((c) => {
      return (
        c.user.name.toLowerCase().includes(q) ||
        c.user.username.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q)
      );
    });
  }, [conversationsList, debouncedQuery]);

  return (
  <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity>
          <Feather name="edit" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Feather name="search" size={20} color={COLORS.textLight} />
          <TextInput
            placeholder="Search for people and groups"
            style={styles.searchInput}
            placeholderTextColor={COLORS.textLight}
            value={searchText}
            onChangeText={setSearchText}
            accessibilityLabel="Search conversations"
          />
        </View>
      </View>

      {/* CONVERSATIONS LIST (FlatList) */}
      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => String(item.id)}
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: conversation }) => (
          <Pressable
            key={conversation.id}
            style={styles.conversationItem}
            onPress={() => openConversation(conversation)}
            onLongPress={() => deleteConversation(conversation.id)}
            accessibilityLabel={`Conversation with ${conversation.user.name}`}
          >
            <Image
              source={{ uri: conversation.user.avatar }}
              style={styles.avatar}
            />

            <View style={styles.convBody}>
              <View style={styles.convHeaderRow}>
                <View style={styles.convLeftRow}>
                  <Text style={styles.convName}>{conversation.user.name}</Text>
                  {conversation.user.verified && (
                    <Feather name="check-circle" size={14} color={COLORS.primary} style={{ marginLeft: 6 }} />
                  )}
                  <Text style={styles.convHandle}>@{conversation.user.username}</Text>
                </View>
                <Text style={styles.convTime}>{conversation.time}</Text>
              </View>
              <Text style={styles.convLast} numberOfLines={1}>{conversation.lastMessage}</Text>
            </View>
          </Pressable>
        )}
      />

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.quickText}>Tap to open • Long press to delete</Text>
      </View>

      <Modal visible={isChatOpen} animationType="slide" presentationStyle="pageSheet">
        {selectedConversation && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <SafeAreaView style={{ flex: 1 }}>
              {/* Chat Header */}
              <View style={styles.chatHeader}>
                <TouchableOpacity onPress={closeChatModal} style={{ marginRight: 12 }}>
                  <Feather name="arrow-left" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <Image source={{ uri: selectedConversation.user.avatar }} style={styles.avatarLarge} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.convName}>{selectedConversation.user.name}</Text>
                    {selectedConversation.user.verified && (
                      <Feather name="check-circle" size={14} color={COLORS.primary} style={{ marginLeft: 6 }} />
                    )}
                  </View>
                  <Text style={styles.convHandle}>@{selectedConversation.user.username}</Text>
                </View>
              </View>

              {/* Chat Messages Area (inverted FlatList) */}
              <FlatList
                data={[...selectedConversation.messages].reverse()}
                ref={messagesFlatRef}
                inverted
                keyExtractor={(m) => String(m.id)}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item: message }) => (
                  <View style={[{ flexDirection: 'row', marginBottom: 12 }, message.fromUser ? { justifyContent: 'flex-end' } : {}]}>
                    {!message.fromUser && (
                      <Image source={{ uri: selectedConversation.user.avatar }} style={styles.avatarSmall} />
                    )}
                    <View style={[{ flex: 1 }, message.fromUser ? { alignItems: 'flex-end' } : {}]}>
                      <View style={[styles.bubble, message.fromUser ? { backgroundColor: COLORS.primary } : { backgroundColor: COLORS.card }] }>
                        <Text style={message.fromUser ? { color: COLORS.white } : { color: COLORS.text }}>{message.text}</Text>
                      </View>
                      <Text style={{ color: COLORS.textLight, fontSize: 12, marginTop: 6 }}>{message.time}</Text>
                    </View>
                  </View>
                )}
              />

              {/* Message Input */}
              <View style={styles.inputRow}>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.chatTextInput}
                    placeholder="Start a message..."
                    placeholderTextColor={COLORS.textLight}
                    value={newMessage}
                    onChangeText={setNewMessage}
                    multiline
                    accessibilityLabel="Message input"
                  />
                </View>
                <TouchableOpacity
                  onPress={() => { sendMessage(); Keyboard.dismiss(); }}
                  style={[
                    styles.sendBtn,
                    { backgroundColor: newMessage.trim() ? COLORS.primary : COLORS.border },
                  ]}
                  disabled={!newMessage.trim()}
                >
                  <Feather name="send" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </KeyboardAvoidingView>
        )}
      </Modal>
    </SafeAreaView>
  );
};

export default MessagesScreen;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { marginLeft: 8, fontSize: 16, color: COLORS.text, paddingVertical: 6 },
  list: { flex: 1 },
  conversationItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#fafafa' },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  avatarLarge: { width: 42, height: 42, borderRadius: 21, marginRight: 12 },
  avatarSmall: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  convBody: { flex: 1 },
  convHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  convLeftRow: { flexDirection: 'row', alignItems: 'center' },
  convName: { fontWeight: '700', color: COLORS.text },
  convHandle: { color: COLORS.textLight, marginLeft: 8 },
  convTime: { color: COLORS.textLight },
  convLast: { color: COLORS.textLight },
  quickActions: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fafafa' },
  quickText: { textAlign: 'center', color: COLORS.textLight, fontSize: 12 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  bubble: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, maxWidth: '70%' },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: COLORS.background },
  inputBox: { flex: 1, backgroundColor: COLORS.card, borderRadius: 22, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: COLORS.border },
  chatTextInput: { flex: 1, color: COLORS.text, minHeight: 36, maxHeight: 120 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.shadow, shadowOpacity: 0.08, shadowRadius: 4 },
});