import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppTextInput } from './AppTextInput';
import { Button } from './Button';
import { colors, spacing } from '../constants/theme';

interface SessionSetupFormProps {
  onStart: (workoutName: string, location: string) => void;
  onCancel: () => void;
}

export function SessionSetupForm({ onStart, onCancel }: SessionSetupFormProps) {
  const [workoutName, setWorkoutName] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleStart = () => {
    if (!workoutName.trim() || !location.trim()) {
      setError('Please fill in both session name and location.');
      return;
    }
    onStart(workoutName.trim(), location.trim());
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Start Workout</Text>
      <AppTextInput
        label="Session name"
        value={workoutName}
        onChangeText={setWorkoutName}
        placeholder="e.g. Push Day"
      />
      <AppTextInput
        label="Gym / location"
        value={location}
        onChangeText={setLocation}
        placeholder="e.g. Campus Gym"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Start Workout" onPress={handleStart} />
      <Button title="Cancel" variant="ghost" onPress={onCancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.sm,
  },
});
