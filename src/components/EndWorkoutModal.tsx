import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppModal } from './AppModal';
import { Button } from './Button';
import { colors, spacing } from '../constants/theme';

interface EndWorkoutModalProps {
  visible: boolean;
  exerciseCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function EndWorkoutModal({
  visible,
  exerciseCount,
  onConfirm,
  onCancel,
}: EndWorkoutModalProps) {
  return (
    <AppModal visible={visible} title="End workout?" onClose={onCancel} onRequestClose={onCancel}>
      <Text style={styles.message}>
        Save this workout with {exerciseCount} exercise{exerciseCount === 1 ? '' : 's'}?
      </Text>
      <View style={styles.actions}>
        <Button title="Cancel" variant="secondary" onPress={onCancel} style={styles.button} />
        <Button title="End & save" variant="danger" onPress={onConfirm} style={styles.button} />
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
