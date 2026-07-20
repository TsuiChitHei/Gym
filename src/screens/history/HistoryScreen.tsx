import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppModal } from '../../components/AppModal';
import { AppTextInput } from '../../components/AppTextInput';
import { Button } from '../../components/Button';
import { colors, spacing } from '../../constants/theme';
import {
  deleteWorkout,
  getWorkoutDetail,
  getAllWorkouts,
  searchExerciseHistory,
} from '../../db/repositories/workouts';
import { exportBackup } from '../../services/backup/export';
import { importBackup } from '../../services/backup/import';
import type { ExerciseHistoryRecord, WorkoutDetail, WorkoutDraft, WorkoutListItem } from '../../types';
import { formatDateTime, formatDuration, formatMonthLabel, groupByMonth } from '../../utils/format';
import { WorkoutFlow } from '../workout/WorkoutFlow';

function formatExerciseTitle(record: ExerciseHistoryRecord): string {
  return `${record.machine_name}${record.mode_name ? ` · ${record.mode_name}` : ''}`;
}
function detailToDraft(detail: WorkoutDetail): WorkoutDraft {
  return {
    id: detail.id,
    workoutName: detail.workout_name,
    location: detail.location_name ?? '',
    startedAt: new Date(detail.started_at),
    endedAt: detail.ended_at ? new Date(detail.ended_at) : undefined,
    durationSeconds: detail.duration_seconds ?? undefined,
    isManual: true,
    exercises: detail.entries.map((entry) => ({
      machineId: entry.machine_id,
      machineModeId: entry.machine_mode_id ?? undefined,
      machineName: entry.machine_name,
      brandName: entry.brand_name,
      modeName: entry.mode_name ?? undefined,
      sets: entry.sets.map((set) => ({
        setNumber: set.set_number,
        reps: String(set.reps),
        weight: String(set.weight_value),
        weightUnit: set.weight_unit,
      })),
    })),
  };
}

export function HistoryScreen() {
  const [workouts, setWorkouts] = useState<WorkoutListItem[]>([]);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutDetail | null>(null);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [editingDraft, setEditingDraft] = useState<WorkoutDraft | null>(null);
  const [loadingBackup, setLoadingBackup] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ExerciseHistoryRecord[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const loadWorkouts = useCallback(async () => {
    const data = await getAllWorkouts();
    setWorkouts(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadWorkouts();
    }, [loadWorkouts]),
  );

  useEffect(() => {
    const query = exerciseSearch.trim();
    if (!query) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const timer = setTimeout(() => {
      void searchExerciseHistory(query)
        .then(setSearchResults)
        .finally(() => setSearchLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [exerciseSearch]);

  const isSearching = exerciseSearch.trim().length > 0;

  const grouped = groupByMonth(workouts);
  const monthKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const toggleMonth = (key: string) => {
    setExpandedMonths((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openWorkout = async (id: number) => {
    const detail = await getWorkoutDetail(id);
    setSelectedWorkout(detail);
  };

  const handleExport = async () => {
    setLoadingBackup(true);
    try {
      await exportBackup();
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoadingBackup(false);
    }
  };

  const handleImport = async () => {
    Alert.alert(
      'Import Backup',
      'This will replace all existing data with the backup contents. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          style: 'destructive',
          onPress: async () => {
            setLoadingBackup(true);
            try {
              await importBackup();
              await loadWorkouts();
              Alert.alert('Success', 'Backup restored successfully.');
            } catch (error) {
              Alert.alert('Import failed', error instanceof Error ? error.message : 'Unknown error');
            } finally {
              setLoadingBackup(false);
            }
          },
        },
      ],
    );
  };

  const startEditing = () => {
    if (!selectedWorkout) return;
    const draft = detailToDraft(selectedWorkout);
    setSelectedWorkout(null);
    setEditingDraft(draft);
  };

  const confirmDeleteWorkout = (workout: { id: number; workout_name: string }) => {
    Alert.alert(
      'Delete workout?',
      `Permanently delete "${workout.workout_name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteWorkout(workout.id);
                setSelectedWorkout(null);
                await loadWorkouts();
              } catch (error) {
                Alert.alert(
                  'Delete failed',
                  error instanceof Error ? error.message : 'Could not delete workout.',
                );
              }
            })();
          },
        },
      ],
    );
  };

  const cancelEditing = () => {
    Alert.alert('Discard changes?', 'Leave edit mode without saving your changes?', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => setEditingDraft(null) },
    ]);
  };

  if (editingDraft) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.editHeader}>
          <Pressable onPress={cancelEditing} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </Pressable>
          <Text style={styles.editTitle}>Edit workout</Text>
          <View style={styles.editHeaderSpacer} />
        </View>
        <WorkoutFlow
          mode="manual"
          initialDraft={editingDraft}
          onFinished={() => {
            setEditingDraft(null);
            void loadWorkouts();
          }}
          onCancel={() => setEditingDraft(null)}
        />
      </SafeAreaView>
    );
  }

  if (showManualAdd) {
    return (
      <WorkoutFlow
        mode="manual"
        initialStep="manual-session-setup"
        onFinished={() => {
          setShowManualAdd(false);
          void loadWorkouts();
        }}
        onCancel={() => setShowManualAdd(false)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={handleExport} disabled={loadingBackup} hitSlop={12}>
          <Ionicons name="download-outline" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.title}>History</Text>
        <Pressable onPress={() => setShowManualAdd(true)} hitSlop={12}>
          <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
        </Pressable>
      </View>

      <Pressable style={styles.importRow} onPress={handleImport} disabled={loadingBackup}>
        <Ionicons name="cloud-upload-outline" size={18} color={colors.textSecondary} />
        <Text style={styles.importText}>Import backup</Text>
      </Pressable>

      <View style={styles.searchRow}>
        <AppTextInput
          value={exerciseSearch}
          onChangeText={setExerciseSearch}
          placeholder="Search exercises e.g. Bench press"
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {exerciseSearch.length > 0 ? (
          <Pressable
            onPress={() => setExerciseSearch('')}
            hitSlop={8}
            style={styles.searchClear}
          >
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {isSearching ? (
          searchLoading ? (
            <Text style={styles.empty}>Searching…</Text>
          ) : searchResults.length === 0 ? (
            <Text style={styles.empty}>No matching exercises found.</Text>
          ) : (
            <>
              <Text style={styles.searchSummary}>
                {searchResults.length} record{searchResults.length === 1 ? '' : 's'} for "
                {exerciseSearch.trim()}"
              </Text>
              {searchResults.map((record) => (
                <Pressable
                  key={`${record.workout_id}-${record.entry_order}-${record.machine_id}-${record.machine_mode_id ?? 'none'}`}
                  style={styles.searchResultRow}
                  onPress={() => openWorkout(record.workout_id)}
                >
                  <Text style={styles.searchExerciseTitle}>{formatExerciseTitle(record)}</Text>
                  <Text style={styles.searchExerciseMeta}>{record.brand_name}</Text>
                  <Text style={styles.workoutMeta}>
                    {record.workout_name} · {record.location_name ?? 'No location'}
                  </Text>
                  <Text style={styles.workoutMeta}>{formatDateTime(record.started_at)}</Text>
                  {record.sets.map((set) => (
                    <Text key={set.id} style={styles.setLine}>
                      Set {set.set_number}: {set.reps} reps @ {set.weight_value} {set.weight_unit}
                      {set.estimated_1rm != null
                        ? ` · est. 1RM ${Math.round(set.estimated_1rm * 10) / 10} ${set.weight_unit}`
                        : ''}
                    </Text>
                  ))}
                </Pressable>
              ))}
            </>
          )
        ) : monthKeys.length === 0 ? (
          <Text style={styles.empty}>No workouts yet. Start logging or add a past workout.</Text>
        ) : (
          monthKeys.map((monthKey) => (
            <View key={monthKey} style={styles.monthSection}>
              <Pressable style={styles.monthHeader} onPress={() => toggleMonth(monthKey)}>
                <Text style={styles.monthTitle}>{formatMonthLabel(monthKey)}</Text>
                <Ionicons
                  name={expandedMonths[monthKey] ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>

              {expandedMonths[monthKey]
                ? grouped[monthKey].map((workout) => (
                    <Pressable
                      key={workout.id}
                      style={styles.workoutRow}
                      onPress={() => openWorkout(workout.id)}
                    >
                      <Text style={styles.workoutName}>{workout.workout_name}</Text>
                      <Text style={styles.workoutMeta}>
                        {workout.location_name ?? 'No location'} ·{' '}
                        {formatDateTime(workout.started_at)}
                      </Text>
                      {workout.duration_seconds != null ? (
                        <Text style={styles.workoutDuration}>
                          {formatDuration(workout.duration_seconds)}
                        </Text>
                      ) : null}
                    </Pressable>
                  ))
                : null}
            </View>
          ))
        )}
      </ScrollView>

      <AppModal
        visible={selectedWorkout !== null}
        title={selectedWorkout?.workout_name}
        onClose={() => setSelectedWorkout(null)}
      >
        {selectedWorkout ? (
          <ScrollView style={styles.detailScroll}>
            <Text style={styles.detailMeta}>
              {selectedWorkout.location_name ?? 'No location'}
            </Text>
            <Text style={styles.detailMeta}>{formatDateTime(selectedWorkout.started_at)}</Text>
            {selectedWorkout.duration_seconds != null ? (
              <Text style={styles.detailMeta}>
                Duration: {formatDuration(selectedWorkout.duration_seconds)}
              </Text>
            ) : null}

            {selectedWorkout.entries.map((entry) => (
              <View key={entry.entry_order} style={styles.entryBlock}>
                <Text style={styles.entryTitle}>
                  {entry.entry_order}. {entry.machine_name} ({entry.brand_name})
                  {entry.mode_name ? ` — ${entry.mode_name}` : ''}
                </Text>
                {entry.sets.map((set) => (
                  <Text key={set.id} style={styles.setLine}>
                    Set {set.set_number}: {set.reps} reps @ {set.weight_value} {set.weight_unit}
                    {set.estimated_1rm != null
                      ? ` · est. 1RM ${Math.round(set.estimated_1rm * 10) / 10} ${set.weight_unit}`
                      : ''}
                  </Text>
                ))}
              </View>
            ))}

            <View style={styles.detailActions}>
              <Button title="Edit" onPress={startEditing} style={styles.detailBtn} />
              <Button
                title="Delete"
                variant="danger"
                onPress={() => confirmDeleteWorkout(selectedWorkout)}
                style={styles.detailBtn}
              />
              <Button
                title="Close"
                variant="secondary"
                onPress={() => setSelectedWorkout(null)}
                style={styles.detailBtn}
              />
            </View>
          </ScrollView>
        ) : null}
      </AppModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  editTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  editHeaderSpacer: {
    width: 24,
  },
  importRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  importText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  searchRow: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    position: 'relative',
  },
  searchInput: {
    marginBottom: 0,
    paddingRight: spacing.xl,
  },
  searchClear: {
    position: 'absolute',
    right: spacing.lg + spacing.sm,
    top: spacing.md,
  },
  searchSummary: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  searchResultRow: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchExerciseTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  searchExerciseMeta: {
    color: colors.primary,
    fontSize: 14,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  list: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  monthSection: {
    marginBottom: spacing.md,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  workoutRow: {
    marginTop: spacing.sm,
    marginLeft: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  workoutName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  workoutMeta: {
    color: colors.textSecondary,
    marginTop: 4,
    fontSize: 14,
  },
  workoutDuration: {
    color: colors.primary,
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
  },
  detailScroll: {
    maxHeight: 440,
  },
  detailMeta: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  entryBlock: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
  },
  entryTitle: {
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  setLine: {
    color: colors.textSecondary,
    marginBottom: 4,
  },
  detailActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  detailBtn: {
    flex: 1,
  },
});
