import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppTextInput } from './AppTextInput';
import { Button } from './Button';
import { colors, spacing } from '../constants/theme';
import type { SetDraft } from '../types';
import { estimateOneRepMax, formatOneRepMax } from '../utils/oneRepMax';

interface SetLoggingFormProps {
  machineName: string;
  brandName: string;
  modeName?: string;
  initialSets?: SetDraft[];
  isEditing?: boolean;
  onDone: (sets: SetDraft[]) => void;
  onBack?: () => void;
}

function createEmptySet(setNumber: number, previous?: SetDraft): SetDraft {
  return {
    setNumber,
    reps: '',
    weight: previous?.weight ?? '',
    weightUnit: previous?.weightUnit ?? 'kg',
  };
}

function previewOneRepMax(set: SetDraft): string | null {
  const reps = parseInt(set.reps, 10);
  const weight = parseFloat(set.weight);
  if (!Number.isFinite(reps) || reps <= 0 || !Number.isFinite(weight) || weight < 0) {
    return null;
  }
  return formatOneRepMax(estimateOneRepMax(weight, reps), set.weightUnit);
}

export function SetLoggingForm({
  machineName,
  brandName,
  modeName,
  initialSets,
  isEditing = false,
  onDone,
  onBack,
}: SetLoggingFormProps) {
  const [sets, setSets] = useState<SetDraft[]>(
    initialSets && initialSets.length > 0 ? initialSets : [createEmptySet(1)],
  );

  const updateSet = (index: number, patch: Partial<SetDraft>) => {
    setSets((prev) => prev.map((set, i) => (i === index ? { ...set, ...patch } : set)));
  };

  const addSet = () => {
    setSets((prev) => [...prev, createEmptySet(prev.length + 1, prev[prev.length - 1])]);
  };

  const getCompletedSets = () =>
    sets.filter((set) => set.reps.trim() !== '' && set.weight.trim() !== '');

  const toggleUnit = (index: number) => {
    updateSet(index, {
      weightUnit: sets[index].weightUnit === 'kg' ? 'lbs' : 'kg',
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>{machineName}</Text>
      <Text style={styles.subheader}>
        {brandName}
        {modeName ? ` · ${modeName}` : ''}
      </Text>

      {sets.map((set, index) => {
        const oneRm = previewOneRepMax(set);
        return (
          <View key={set.setNumber} style={styles.setRow}>
            <Text style={styles.setLabel}>Set {set.setNumber}</Text>
            <AppTextInput
              label="Reps"
              value={set.reps}
              onChangeText={(text) => updateSet(index, { reps: text })}
              keyboardType="number-pad"
              style={styles.setInput}
            />
            <AppTextInput
              label="Weight"
              value={set.weight}
              onChangeText={(text) => updateSet(index, { weight: text })}
              keyboardType="decimal-pad"
              style={styles.setInput}
            />
            <Pressable style={styles.unitToggle} onPress={() => toggleUnit(index)}>
              <Text style={styles.unitText}>{set.weightUnit}</Text>
            </Pressable>
            {oneRm ? (
              <Text style={styles.oneRm}>Est. 1RM: {oneRm}</Text>
            ) : (
              <Text style={styles.oneRmHint}>Enter reps and weight to see estimated 1RM</Text>
            )}
          </View>
        );
      })}

      <View style={styles.actions}>
        <Button title="New Set" variant="secondary" onPress={addSet} style={styles.actionBtn} />
        <Button
          title={isEditing ? 'Save exercise' : 'Done'}
          onPress={() => onDone(getCompletedSets())}
          style={styles.actionBtn}
        />
        {onBack ? (
          <Button title="Back" variant="ghost" onPress={onBack} style={styles.actionBtn} />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  header: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  subheader: {
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: spacing.lg,
  },
  setRow: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  setLabel: {
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  setInput: {
    marginBottom: spacing.sm,
  },
  unitToggle: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unitText: {
    color: colors.text,
    fontWeight: '600',
  },
  oneRm: {
    marginTop: spacing.sm,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  oneRmHint: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 13,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionBtn: {},
});
