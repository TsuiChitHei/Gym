import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../constants/theme';
import { formatDuration } from '../utils/format';

interface WorkoutTimerProps {
  startedAt: Date;
  isManual?: boolean;
  durationSeconds?: number;
}

export function WorkoutTimer({ startedAt, isManual, durationSeconds }: WorkoutTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (isManual && durationSeconds !== undefined) {
      setElapsed(durationSeconds);
      return;
    }

    const tick = () => {
      setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt, isManual, durationSeconds]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{isManual ? 'Duration' : 'Elapsed'}</Text>
      <Text style={styles.time}>{formatDuration(elapsed)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  time: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
