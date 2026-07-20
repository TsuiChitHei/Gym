import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppTextInput } from './AppTextInput';
import { Button } from './Button';
import { DatePickerField } from './DatePickerField';
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
  const [workoutDate, setWorkoutDate] = useState(() => new Date());
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [error, setError] = useState<string | null>(null);

  const handleStart = () => {
    if (!workoutName.trim() || !location.trim()) {
      setError('Please fill in session name and location.');
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
      date: workoutDate,
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
      <DatePickerField
        label="Date & time"
        value={workoutDate}
        onChange={setWorkoutDate}
        mode="datetime"
        maximumDate={new Date()}
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
