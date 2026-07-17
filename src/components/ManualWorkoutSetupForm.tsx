import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppTextInput } from './AppTextInput';
import { Button } from './Button';
import { colors, spacing } from '../constants/theme';

interface ManualWorkoutSetupFormProps {
  onStart: (params: {
    workoutName: string;
    location: string;
    date: Date;
    durationSeconds: number;
  }) => void;
  onCancel: () => void;
}

export function ManualWorkoutSetupForm({ onStart, onCancel }: ManualWorkoutSetupFormProps) {
  const [workoutName, setWorkoutName] = useState('');
  const [location, setLocation] = useState('');
  const [dateText, setDateText] = useState(new Date().toISOString().slice(0, 16).replace('T', ' '));
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [error, setError] = useState<string | null>(null);

  const handleStart = () => {
    if (!workoutName.trim() || !location.trim()) {
      setError('Please fill in session name and location.');
      return;
    }

    const parsedDate = new Date(dateText.replace(' ', 'T'));
    if (Number.isNaN(parsedDate.getTime())) {
      setError('Invalid date. Use format: YYYY-MM-DD HH:mm');
      return;
    }

    const duration = parseInt(durationMinutes, 10);
    if (Number.isNaN(duration) || duration < 0) {
      setError('Enter a valid duration in minutes.');
      return;
    }

    onStart({
      workoutName: workoutName.trim(),
      location: location.trim(),
      date: parsedDate,
      durationSeconds: duration * 60,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Past Workout</Text>
      <AppTextInput
        label="Session name"
        value={workoutName}
        onChangeText={setWorkoutName}
        placeholder="e.g. Leg Day"
      />
      <AppTextInput
        label="Gym / location"
        value={location}
        onChangeText={setLocation}
        placeholder="e.g. Campus Gym"
      />
      <AppTextInput
        label="Date & time (YYYY-MM-DD HH:mm)"
        value={dateText}
        onChangeText={setDateText}
        placeholder="2026-07-09 18:30"
      />
      <AppTextInput
        label="Duration (minutes)"
        value={durationMinutes}
        onChangeText={setDurationMinutes}
        keyboardType="number-pad"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Continue" onPress={handleStart} />
      <Button title="Cancel" variant="ghost" onPress={onCancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.sm,
  },
});
