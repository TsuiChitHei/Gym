import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppTextInput } from '../../components/AppTextInput';
import { Button } from '../../components/Button';
import { DatePickerField } from '../../components/DatePickerField';
import { colors, spacing } from '../../constants/theme';
import {
  addBodyWeightLog,
  calculateAge,
  getLatestBodyWeight,
  getUserProfile,
  upsertUserProfile,
} from '../../db/repositories/profile';
import {
  fetchStrengthPercentile,
  fetchSupportedLifts,
  type StrengthLiftOption,
} from '../../services/strengthStandards';
import type { Sex, WeightUnit } from '../../types';
import { parseYmd, toYmd } from '../../utils/format';

export function ProfileScreen() {
  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [currentWeight, setCurrentWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [latestWeightLabel, setLatestWeightLabel] = useState('Not set');
  const [ageLabel, setAgeLabel] = useState('—');
  const [profileSaving, setProfileSaving] = useState(false);

  const [lifts, setLifts] = useState<StrengthLiftOption[]>([]);
  const [selectedLift, setSelectedLift] = useState('bench-press');
  const [showLiftPicker, setShowLiftPicker] = useState(false);
  const [compareWeight, setCompareWeight] = useState('');
  const [compareReps, setCompareReps] = useState('5');
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareResult, setCompareResult] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    const profile = await getUserProfile();
    const weight = await getLatestBodyWeight();
    setBirthDate(profile?.birth_date ?? null);
    setSex(profile?.sex ?? null);
    if (profile?.birth_date) {
      const age = calculateAge(profile.birth_date);
      setAgeLabel(age != null ? `${age}` : '—');
    } else {
      setAgeLabel('—');
    }
    if (weight) {
      setLatestWeightLabel(`${weight.weight_value} ${weight.weight_unit}`);
      setWeightUnit(weight.weight_unit);
      setCurrentWeight(String(weight.weight_value));
    } else {
      setLatestWeightLabel('Not set');
    }
  }, []);

  useEffect(() => {
    void loadProfile();
    fetchSupportedLifts()
      .then((options) => {
        setLifts(options);
        if (options.length > 0) {
          setSelectedLift((current) =>
            options.some((lift) => lift.slug === current) ? current : options[0].slug,
          );
        }
      })
      .catch(() => {
        setLifts([
          { slug: 'bench-press', label: 'Bench Press' },
          { slug: 'squat', label: 'Squat' },
          { slug: 'deadlift', label: 'Deadlift' },
        ]);
      });
  }, [loadProfile]);

  const handleSaveProfile = async () => {
    const weightValue = parseFloat(currentWeight);
    if (!Number.isFinite(weightValue) || weightValue <= 0) {
      Alert.alert('Invalid weight', 'Enter a valid body weight.');
      return;
    }

    setProfileSaving(true);
    try {
      await upsertUserProfile({
        birthDate,
        sex,
      });
      await addBodyWeightLog({
        weightValue,
        weightUnit,
      });
      await loadProfile();
      Alert.alert('Saved', 'Profile updated. Previous weights are kept in history.');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleCompare = async () => {
    const weight = parseFloat(compareWeight);
    const reps = parseInt(compareReps, 10);
    const bodyweight = parseFloat(currentWeight);
    if (!sex) {
      Alert.alert('Profile needed', 'Set your sex in the profile section first.');
      return;
    }
    if (!Number.isFinite(bodyweight) || bodyweight <= 0) {
      Alert.alert('Profile needed', 'Set your current body weight first.');
      return;
    }
    if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(reps) || reps <= 0) {
      Alert.alert('Invalid input', 'Enter valid set weight and reps.');
      return;
    }

    setCompareLoading(true);
    setCompareResult(null);
    try {
      const age = birthDate ? calculateAge(birthDate) : null;
      const result = await fetchStrengthPercentile({
        lift: selectedLift,
        weight,
        reps,
        bodyweight,
        sex,
        unit: weightUnit,
        age: age ?? undefined,
      });

      const lines: string[] = [];
      if (result.gym) {
        lines.push(
          `Gym standards: ${result.gym.percentile}th percentile` +
            (result.gym.tier ? ` (${result.gym.tier})` : ''),
        );
      }
      if (result.verified) {
        lines.push(
          `Verified competition: ${result.verified.percentile}th percentile` +
            (result.verified.tier ? ` (${result.verified.tier})` : ''),
        );
      }
      if (lines.length === 0) {
        lines.push('No percentile data returned for this lift.');
      }
      if (result.attribution?.text) {
        lines.push(result.attribution.text);
      } else {
        lines.push('Data via FitnessVolt Strength Standards API.');
      }
      setCompareResult(lines.join('\n'));
    } catch (error) {
      Alert.alert(
        'Comparison failed',
        error instanceof Error ? error.message : 'Could not reach strength standards API.',
      );
    } finally {
      setCompareLoading(false);
    }
  };

  const selectedLiftLabel =
    lifts.find((lift) => lift.slug === selectedLift)?.label ?? selectedLift;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.help}>
          Current weight is shown below. Saving always appends a new weight record so future
          analytics can normalize by body weight over time.
        </Text>
        <Text style={styles.meta}>Current weight: {latestWeightLabel}</Text>
        <Text style={styles.meta}>Age: {ageLabel}</Text>

        <DatePickerField
          label="Birth date"
          value={birthDate ? parseYmd(birthDate) : null}
          onChange={(next) => setBirthDate(toYmd(next))}
          maximumDate={new Date()}
          placeholder="Select birth date"
        />

        <Text style={styles.label}>Sex</Text>
        <View style={styles.sexRow}>
          {(['male', 'female'] as Sex[]).map((option) => (
            <Pressable
              key={option}
              style={[styles.sexChip, sex === option && styles.sexChipActive]}
              onPress={() => setSex(option)}
            >
              <Text style={[styles.sexChipText, sex === option && styles.sexChipTextActive]}>
                {option === 'male' ? 'Male' : 'Female'}
              </Text>
            </Pressable>
          ))}
        </View>

        <AppTextInput
          label="Body weight"
          value={currentWeight}
          onChangeText={setCurrentWeight}
          keyboardType="decimal-pad"
        />
        <Pressable
          style={styles.unitToggle}
          onPress={() => setWeightUnit((u) => (u === 'kg' ? 'lbs' : 'kg'))}
        >
          <Text style={styles.unitText}>{weightUnit}</Text>
        </Pressable>
        <Button title="Save profile" onPress={handleSaveProfile} loading={profileSaving} />

        <Text style={[styles.sectionTitle, styles.sectionSpacing]}>Strength standards compare</Text>
        <Text style={styles.help}>
          Strength Level does not offer a public API. This uses FitnessVolt&apos;s free strength
          standards API to rank a set against other lifters by body weight (and age when available).
        </Text>
        <Text style={styles.label}>Lift</Text>
        <Pressable style={styles.select} onPress={() => setShowLiftPicker((v) => !v)}>
          <Text style={styles.selectText}>{selectedLiftLabel}</Text>
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </Pressable>
        {showLiftPicker ? (
          <View style={styles.pickerList}>
            {lifts.map((lift) => (
              <Pressable
                key={lift.slug}
                style={styles.pickerItem}
                onPress={() => {
                  setSelectedLift(lift.slug);
                  setShowLiftPicker(false);
                }}
              >
                <Text style={styles.pickerItemText}>{lift.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <AppTextInput
          label={`Set weight (${weightUnit})`}
          value={compareWeight}
          onChangeText={setCompareWeight}
          keyboardType="decimal-pad"
        />
        <AppTextInput
          label="Reps"
          value={compareReps}
          onChangeText={setCompareReps}
          keyboardType="number-pad"
        />
        <Button title="Compare my set" onPress={handleCompare} loading={compareLoading} />
        {compareResult ? <Text style={styles.compareResult}>{compareResult}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  sectionSpacing: {
    marginTop: spacing.xl,
  },
  help: {
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  meta: {
    color: colors.text,
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  sexRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sexChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  sexChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#1B2A22',
  },
  sexChipText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  sexChipTextActive: {
    color: colors.primary,
  },
  unitToggle: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  unitText: {
    color: colors.text,
    fontWeight: '600',
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
    marginBottom: spacing.md,
  },
  selectText: {
    color: colors.text,
    fontSize: 16,
    flex: 1,
  },
  pickerList: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    maxHeight: 220,
    overflow: 'hidden',
  },
  pickerItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerItemText: {
    color: colors.text,
    fontSize: 16,
  },
  compareResult: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
