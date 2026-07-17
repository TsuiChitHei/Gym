import React from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps } from 'react-native';
import { colors, spacing } from '../constants/theme';

interface AppTextInputProps extends TextInputProps {
  label?: string;
}

export function AppTextInput({ label, style, ...props }: AppTextInputProps) {
  return (
    <>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, style]}
        {...props}
      />
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 16,
    marginBottom: spacing.md,
  },
});
