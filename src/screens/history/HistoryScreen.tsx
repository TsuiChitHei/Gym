import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppModal } from '../../components/AppModal';
import { Button } from '../../components/Button';
import { colors, spacing } from '../../constants/theme';
import { getWorkoutDetail, getAllWorkouts } from '../../db/repositories/workouts';
import { exportBackup } from '../../services/backup/export';
import { importBackup } from '../../services/backup/import';
import type { WorkoutDetail, WorkoutListItem } from '../../types';
import { formatDateTime, formatDuration, formatMonthLabel, groupByMonth } from '../../utils/format';
import { WorkoutFlow } from '../workout/WorkoutFlow';

export function HistoryScreen() {
  const [workouts, setWorkouts] = useState<WorkoutListItem[]>([]);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutDetail | null>(null);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [loadingBackup, setLoadingBackup] = useState(false);

  const loadWorkouts = async () => {
    const data = await getAllWorkouts();
    setWorkouts(data);
  };

  useEffect(() => {
    loadWorkouts();
  }, []);

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

  if (showManualAdd) {
    return (
      <WorkoutFlow
        mode="manual"
        initialStep="manual-session-setup"
        onFinished={() => {
          setShowManualAdd(false);
          loadWorkouts();
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

      <ScrollView contentContainerStyle={styles.list}>
        {monthKeys.length === 0 ? (
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
                        {workout.location_name ?? 'No location'} · {formatDateTime(workout.started_at)}
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
                  </Text>
                ))}
              </View>
            ))}

            <Button title="Close" variant="secondary" onPress={() => setSelectedWorkout(null)} />
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
    maxHeight: 400,
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
});
