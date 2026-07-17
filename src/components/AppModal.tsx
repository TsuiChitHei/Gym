import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type ModalProps } from 'react-native';
import { colors, spacing } from '../constants/theme';

interface AppModalProps extends ModalProps {
  title?: string;
  onClose?: () => void;
  children: React.ReactNode;
}

export function AppModal({ title, onClose, children, ...props }: AppModalProps) {
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose} {...props}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {title ? (
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              {onClose ? (
                <Pressable onPress={onClose} hitSlop={12}>
                  <Text style={styles.close}>✕</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  close: {
    color: colors.textSecondary,
    fontSize: 20,
    paddingLeft: spacing.md,
  },
});
