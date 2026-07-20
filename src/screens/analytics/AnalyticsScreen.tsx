import React, { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTextInput } from '../../components/AppTextInput';
import { Button } from '../../components/Button';
import { DatePickerField } from '../../components/DatePickerField';
import { colors, spacing } from '../../constants/theme';
import {
  formatModeLabel,
  getDailyMaxOneRepMax,
  getExerciseOptionsUsedInWorkouts,
} from '../../db/repositories/analytics';
import type { AnalyticsExerciseOption, DailyOneRepMaxPoint } from '../../types';
import { parseYmd, toYmd } from '../../utils/format';

function defaultEndDate(): string {
  return toYmd(new Date());
}

function defaultStartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return toYmd(d);
}

/** Expand axis so data occupies ~70% of chart height (15% pad top & bottom). */
function paddedAxisBounds(values: number[]): { min: number; max: number } {
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const range = dataMax - dataMin;
  const effectiveRange = range > 0 ? range : Math.max(Math.abs(dataMax) * 0.1, 1);
  const pad = (effectiveRange * 0.3) / 2 / 0.7;
  return {
    min: dataMin - pad,
    max: dataMax + pad,
  };
}

export function AnalyticsScreen() {
  const [options, setOptions] = useState<AnalyticsExerciseOption[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [points, setPoints] = useState<DailyOneRepMaxPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<DailyOneRepMaxPoint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedOptions = useMemo(
    () => options.filter((option) => selectedKeys.includes(option.key)),
    [options, selectedKeys],
  );

  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(q) ||
        option.machine_name.toLowerCase().includes(q) ||
        option.brand_name.toLowerCase().includes(q) ||
        (option.mode_name?.toLowerCase().includes(q) ?? false),
    );
  }, [options, searchQuery]);

  const loadChart = useCallback(
    async (
      keys: string[],
      allOptions: AnalyticsExerciseOption[],
      rangeStart: string,
      rangeEnd: string,
    ) => {
      const selections = allOptions
        .filter((option) => keys.includes(option.key))
        .map((option) => ({
          machineId: option.machine_id,
          machineModeId: option.machine_mode_id,
        }));

      if (selections.length === 0) {
        setPoints([]);
        setSelectedPoint(null);
        return;
      }
      if (rangeStart > rangeEnd) {
        setError('Start date must be on or before end date.');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await getDailyMaxOneRepMax({
          selections,
          startDate: rangeStart,
          endDate: rangeEnd,
        });
        setPoints(data);
        setSelectedPoint(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        try {
          const data = await getExerciseOptionsUsedInWorkouts();
          if (!active) return;

          setOptions(data);
          setSelectedKeys((current) => {
            const valid = current.filter((key) => data.some((option) => option.key === key));
            if (valid.length > 0) return valid;
            return data.length > 0 ? [data[0].key] : [];
          });
        } catch (err) {
          if (!active) return;
          setError(err instanceof Error ? err.message : 'Failed to load exercises.');
        }
      })();

      return () => {
        active = false;
      };
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      void loadChart(selectedKeys, options, startDate, endDate);
    }, [selectedKeys, options, startDate, endDate, loadChart]),
  );

  const toggleOption = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const chartWidth = Dimensions.get('window').width - spacing.lg * 2;

  const chartData = useMemo(() => {
    if (points.length === 0) {
      return {
        labels: ['—'],
        datasets: [{ data: [0] }],
      };
    }

    const values = points.map((p) => Math.round(p.estimated_1rm_kg * 10) / 10);
    const { min, max } = paddedAxisBounds(values);

    const maxLabels = 6;
    const step = Math.max(1, Math.ceil(points.length / maxLabels));
    const labels = points.map((p, index) =>
      index % step === 0 || index === points.length - 1 ? p.date.slice(5) : '',
    );

    return {
      labels,
      datasets: [
        {
          data: values,
          color: () => colors.primary,
          strokeWidth: 2,
        },
        {
          data: [min, max],
          color: () => 'rgba(0,0,0,0)',
          strokeWidth: 0,
          withDots: false,
        },
      ],
    };
  }, [points]);

  const selectionSummary =
    selectedOptions.length === 0
      ? options.length === 0
        ? 'No logged exercises yet'
        : 'Select one or more exercises'
      : selectedOptions.length === 1
        ? selectedOptions[0].label
        : `${selectedOptions.length} exercises selected`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Analytics</Text>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Exercise progress (est. 1RM)</Text>
        <Text style={styles.help}>
          Multipurpose purposes are listed separately (e.g. Rope vs V-bar). Selecting several puts
          them on one chart; if more than one lands on the same day, the point closest to the
          average of the other days is kept. Tap a point for set details.
        </Text>

        <Text style={styles.label}>Exercises</Text>
        <Pressable style={styles.select} onPress={() => setShowPicker((v) => !v)}>
          <Text style={styles.selectText}>{selectionSummary}</Text>
          <Ionicons
            name={showPicker ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textSecondary}
          />
        </Pressable>

        {selectedOptions.length > 1 ? (
          <View style={styles.chipWrap}>
            {selectedOptions.map((option) => (
              <Pressable
                key={option.key}
                style={styles.chip}
                onPress={() => toggleOption(option.key)}
              >
                <Text style={styles.chipText}>{option.label}</Text>
                <Ionicons name="close" size={14} color={colors.primary} />
              </Pressable>
            ))}
          </View>
        ) : null}

        {showPicker ? (
          <View style={styles.pickerList}>
            <AppTextInput
              label="Search"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Type machine, brand, or purpose"
              style={styles.searchInput}
            />
            <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
              {filteredOptions.length === 0 ? (
                <Text style={styles.emptyPicker}>No matching exercises</Text>
              ) : (
                filteredOptions.map((option) => {
                  const selected = selectedKeys.includes(option.key);
                  return (
                    <Pressable
                      key={option.key}
                      style={[styles.pickerItem, selected && styles.pickerItemSelected]}
                      onPress={() => toggleOption(option.key)}
                    >
                      <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                        {selected ? <Text style={styles.checkmark}>✓</Text> : null}
                      </View>
                      <Text style={styles.pickerItemText}>{option.label}</Text>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
            <Button
              title="Done"
              variant="secondary"
              onPress={() => setShowPicker(false)}
              style={styles.doneBtn}
            />
          </View>
        ) : null}

        <Text style={styles.label}>Date range</Text>
        <View style={styles.dateRow}>
          <DatePickerField
            label="Start"
            value={parseYmd(startDate)}
            onChange={(next) => {
              const ymd = toYmd(next);
              setStartDate(ymd);
              if (ymd > endDate) setEndDate(ymd);
            }}
            maximumDate={parseYmd(endDate)}
            style={styles.dateField}
          />
          <DatePickerField
            label="End"
            value={parseYmd(endDate)}
            onChange={(next) => {
              const ymd = toYmd(next);
              setEndDate(ymd);
              if (ymd < startDate) setStartDate(ymd);
            }}
            minimumDate={parseYmd(startDate)}
            style={styles.dateField}
          />
        </View>

        <Button
          title="Refresh chart"
          onPress={() => loadChart(selectedKeys, options, startDate, endDate)}
          loading={loading}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Daily estimated 1RM (kg)</Text>
          {points.length === 0 ? (
            <Text style={styles.empty}>No sets found for the selected exercises in this range.</Text>
          ) : (
            <>
              <LineChart
                data={chartData}
                width={chartWidth - 8}
                height={220}
                yAxisSuffix=" kg"
                fromZero={false}
                withShadow={false}
                chartConfig={{
                  backgroundColor: colors.surfaceElevated,
                  backgroundGradientFrom: colors.surfaceElevated,
                  backgroundGradientTo: colors.surfaceElevated,
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(74, 222, 128, ${opacity})`,
                  labelColor: () => colors.textSecondary,
                  propsForDots: {
                    r: '5',
                    strokeWidth: '2',
                    stroke: colors.primaryDark,
                  },
                  propsForBackgroundLines: {
                    stroke: colors.border,
                  },
                }}
                bezier
                style={styles.chart}
                onDataPointClick={({ index }) => {
                  const point = points[index];
                  if (point) setSelectedPoint(point);
                }}
              />
              <Text style={styles.summary}>
                {points.length} day{points.length === 1 ? '' : 's'} · peak{' '}
                {Math.max(...points.map((p) => p.estimated_1rm_kg)).toFixed(1)} kg
              </Text>
              <Text style={styles.tapHint}>Tap a point to inspect that day&apos;s chosen set</Text>
            </>
          )}

          {selectedPoint ? (
            <View style={styles.detailCard}>
              <Text style={styles.detailTitle}>{selectedPoint.date}</Text>
              <Text style={styles.detailLine}>
                Est. 1RM: {Math.round(selectedPoint.estimated_1rm_kg * 10) / 10} kg
              </Text>
              <Text style={styles.detailLine}>
                Set: {selectedPoint.reps} reps @ {selectedPoint.weight_value}{' '}
                {selectedPoint.weight_unit}
              </Text>
              <Text style={styles.detailLine}>
                Machine: {selectedPoint.machine_name}
                {selectedPoint.mode_name
                  ? ` · ${formatModeLabel(selectedPoint.mode_name)}`
                  : ''}{' '}
                ({selectedPoint.brand_name})
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
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
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  help: {
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  select: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  selectText: {
    color: colors.text,
    fontSize: 16,
    flex: 1,
    marginRight: spacing.sm,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1B2A22',
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: '100%',
  },
  chipText: {
    color: colors.primary,
    fontSize: 12,
    flexShrink: 1,
  },
  pickerList: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  searchInput: {
    marginBottom: spacing.sm,
  },
  pickerScroll: {
    maxHeight: 260,
  },
  emptyPicker: {
    color: colors.textMuted,
    paddingVertical: spacing.md,
    textAlign: 'center',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerItemSelected: {
    backgroundColor: '#1B2A22',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 12,
  },
  pickerItemText: {
    color: colors.text,
    fontSize: 15,
    flex: 1,
  },
  doneBtn: {
    marginTop: spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateField: {
    flex: 1,
  },
  error: {
    color: colors.danger,
    marginTop: spacing.sm,
  },
  chartCard: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartTitle: {
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  chart: {
    borderRadius: 12,
    marginLeft: -8,
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  summary: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontSize: 13,
  },
  tapHint: {
    color: colors.textMuted,
    marginTop: 4,
    fontSize: 12,
  },
  detailCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailTitle: {
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  detailLine: {
    color: colors.text,
    marginBottom: 4,
    lineHeight: 20,
  },
});
