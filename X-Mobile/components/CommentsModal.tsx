import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CommentsModal = ({ selectedPost, onClose }: { selectedPost?: any; onClose?: () => void }) => {
  if (!selectedPost) return null;
  return (
    <View style={styles.container}>
      <Text>Comments for: {selectedPost.content}</Text>
    </View>
  );
};

export default CommentsModal;

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16 },
});
