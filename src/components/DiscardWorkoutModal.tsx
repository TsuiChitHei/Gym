import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppModal } from './AppModal';
import { Button } from './Button';
import { colors, spacing } from '../constants/theme';

interface DiscardWorkoutModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DiscardWorkoutModal({ visible, onConfirm, onCancel }: DiscardWorkoutModalProps) {
  return (
    <AppModal visible={visible} onRequestClose={onCancel}>
      <Text style={styles.message}>
        You have not completed any sets. This workout will be discarded if you continue.
      </Text>
      <View style={styles.actions}>
        <Button title="Cancel" variant="secondary" onPress={onCancel} style={styles.button} />
        <Button title="Discard" variant="danger" onPress={onConfirm} style={styles.button} />
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  message: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
  },
});
