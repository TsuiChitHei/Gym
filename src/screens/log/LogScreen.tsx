import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../constants/theme';
import { WorkoutFlow } from '../workout/WorkoutFlow';

export function LogScreen() {
  const [isActive, setIsActive] = useState(false);

  if (isActive) {
    return (
      <WorkoutFlow
        mode="live"
        initialStep="session-setup"
        onFinished={() => setIsActive(false)}
        onCancel={() => setIsActive(false)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Log</Text>
      <View style={styles.center}>
        <Pressable
          style={({ pressed }) => [styles.playButton, pressed && styles.playPressed]}
          onPress={() => setIsActive(true)}
        >
          <Ionicons name="play" size={56} color={colors.background} style={styles.playIcon} />
        </Pressable>
        <Text style={styles.hint}>Tap to start a workout</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  playPressed: {
    transform: [{ scale: 0.96 }],
  },
  playIcon: {
    marginLeft: 8,
  },
  hint: {
    color: colors.textSecondary,
    marginTop: spacing.lg,
    fontSize: 16,
  },
});
