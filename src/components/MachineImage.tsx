import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../constants/theme';
import { getMachineImageUri } from '../services/images';

interface MachineImageProps {
  imageFilename: string | null;
  size?: number;
}

export function MachineImage({ imageFilename, size = 48 }: MachineImageProps) {
  const uri = getMachineImageUri(imageFilename);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: 8 }}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={[styles.placeholder, { width: size, height: size }]}>
      <Ionicons name="barbell-outline" size={size * 0.5} color={colors.textMuted} />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
