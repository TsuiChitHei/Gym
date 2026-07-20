import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { colors, spacing } from '../constants/theme';
import type { ExerciseDraft } from '../types';
import { estimateOneRepMax, formatOneRepMax } from '../utils/oneRepMax';

interface ExerciseRecapFormProps {
  exercises: ExerciseDraft[];
  mode?: 'logging' | 'editing';
  onEditExercise: (index: number) => void;
  onDeleteExercise: (index: number) => void;
  onNewExercise: () => void;
  onEndWorkout: () => void;
  onSaveChanges?: () => void;
  onDiscardWorkout: () => void;
}

function exercisePeak1rm(exercise: ExerciseDraft): string | null {
  let best: number | null = null;
  let unit: 'kg' | 'lbs' = 'kg';
  for (const set of exercise.sets) {
    const reps = parseInt(set.reps, 10);
    const weight = parseFloat(set.weight);
    if (!Number.isFinite(reps) || reps <= 0 || !Number.isFinite(weight)) continue;
    const est = estimateOneRepMax(weight, reps);
    if (best == null || est > best) {
      best = est;
      unit = set.weightUnit;
    }
  }
  return best != null ? formatOneRepMax(best, unit) : null;
}

export function ExerciseRecapForm({
  exercises,
  mode = 'logging',
  onEditExercise,
  onDeleteExercise,
  onNewExercise,
  onEndWorkout,
  onSaveChanges,
  onDiscardWorkout,
}: ExerciseRecapFormProps) {
  const confirmDelete = (index: number, exercise: ExerciseDraft) => {
    Alert.alert(
      'Remove exercise?',
      `Remove ${exercise.machineName}${exercise.modeName ? ` · ${exercise.modeName}` : ''} from this workout?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onDeleteExercise(index) },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{mode === 'editing' ? 'Edit workout' : 'Workout progress'}</Text>
      <Text style={styles.subtitle}>
        {exercises.length} exercise{exercises.length === 1 ? '' : 's'} logged
      </Text>

      {exercises.length === 0 ? (
        <Text style={styles.empty}>No exercises yet. Add your first exercise below.</Text>
      ) : (
        exercises.map((exercise, index) => {
          const peak = exercisePeak1rm(exercise);
          return (
            <View key={`${exercise.machineId}-${exercise.machineModeId ?? 'none'}-${index}`} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTextWrap}>
                  <Text style={styles.cardTitle}>
                    {index + 1}. {exercise.machineName}
                    {exercise.modeName ? ` · ${exercise.modeName}` : ''}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {exercise.brandName} · {exercise.sets.length} set
                    {exercise.sets.length === 1 ? '' : 's'}
                    {peak ? ` · peak est. 1RM ${peak}` : ''}
                  </Text>
                </View>
                <View style={styles.cardActions}>
                  <Pressable onPress={() => onEditExercise(index)} hitSlop={8}>
                    <Ionicons name="pencil" size={20} color={colors.primary} />
                  </Pressable>
                  <Pressable onPress={() => confirmDelete(index, exercise)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
              {exercise.sets.map((set) => (
                <Text key={set.setNumber} style={styles.setLine}>
                  Set {set.setNumber}: {set.reps} reps @ {set.weight} {set.weightUnit}
                </Text>
              ))}
            </View>
          );
        })
      )}

      <View style={styles.actions}>
        <Button title="New Exercise" onPress={onNewExercise} />
        {mode === 'editing' ? (
          <Button title="Save Changes" onPress={onSaveChanges} />
        ) : (
          <>
            {exercises.length > 0 ? (
              <Button title="End Workout" variant="danger" onPress={onEndWorkout} />
            ) : null}
            <Button title="Discard Workout" variant="ghost" onPress={onDiscardWorkout} />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: spacing.xl,
  },
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTextWrap: {
    flex: 1,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  cardMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  setLine: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
