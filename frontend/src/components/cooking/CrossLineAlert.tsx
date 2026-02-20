import React, { useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

interface CrossLineAlertProps {
  visible: boolean;
  message: string;
  onDismiss: () => void;
}

export function CrossLineAlert({ visible, message, onDismiss }: CrossLineAlertProps) {
  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>该照顾宝宝的菜了！</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity style={styles.btn} onPress={onDismiss}>
            <Text style={styles.btnText}>好的，去看看</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  icon: {
    fontSize: 40,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#212121',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    color: '#555',
    marginBottom: 20,
  },
  btn: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
