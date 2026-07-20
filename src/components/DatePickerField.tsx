import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { colors, spacing } from '../constants/theme';
import { formatDisplayDate, formatDisplayDateTime } from '../utils/format';

type PickerMode = 'date' | 'time' | 'datetime';

interface DatePickerFieldProps {
  label: string;
  value: Date | null;
  onChange: (next: Date) => void;
  mode?: PickerMode;
  minimumDate?: Date;
  maximumDate?: Date;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}

export function DatePickerField({
  label,
  value,
  onChange,
  mode = 'date',
  minimumDate,
  maximumDate,
  placeholder = 'Select date',
  style,
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [androidStep, setAndroidStep] = useState<'date' | 'time'>('date');
  const [draft, setDraft] = useState<Date>(value ?? new Date());

  const displayValue = value
    ? mode === 'date'
      ? formatDisplayDate(value)
      : formatDisplayDateTime(value)
    : placeholder;

  const openPicker = () => {
    setDraft(value ?? new Date());
    setAndroidStep('date');
    setOpen(true);
  };

  const closePicker = () => {
    setOpen(false);
    setAndroidStep('date');
  };

  const commit = (next: Date) => {
    onChange(next);
    if (Platform.OS === 'android') {
      if (mode === 'datetime' && androidStep === 'date') {
        setDraft(next);
        setAndroidStep('time');
        return;
      }
      closePicker();
    } else {
      setDraft(next);
    }
  };

  const onPickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'dismissed' || !date) {
      closePicker();
      return;
    }

    if (mode === 'datetime' && Platform.OS === 'android' && androidStep === 'date') {
      const merged = new Date(draft);
      merged.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      commit(merged);
      return;
    }

    if (mode === 'datetime' && Platform.OS === 'android' && androidStep === 'time') {
      const merged = new Date(draft);
      merged.setHours(date.getHours(), date.getMinutes(), 0, 0);
      onChange(merged);
      closePicker();
      return;
    }

    if (mode === 'datetime' && Platform.OS === 'ios') {
      setDraft(date);
      onChange(date);
      return;
    }

    commit(date);
  };

  const pickerMode: 'date' | 'time' =
    Platform.OS === 'android' && mode === 'datetime'
      ? androidStep
      : mode === 'time'
        ? 'time'
        : 'date';

  const iosMode: 'date' | 'time' | 'datetime' =
    mode === 'datetime' ? 'datetime' : mode === 'time' ? 'time' : 'date';

  const display =
    pickerMode === 'date'
      ? Platform.OS === 'ios'
        ? 'inline'
        : 'calendar'
      : Platform.OS === 'ios'
        ? 'spinner'
        : 'default';

  return (
    <View style={style}>
      <Pressable style={styles.field} onPress={openPicker}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueRow}>
          <Text style={[styles.value, !value && styles.placeholder]}>{displayValue}</Text>
          <Ionicons
            name={mode === 'time' ? 'time-outline' : 'calendar-outline'}
            size={18}
            color={colors.primary}
          />
        </View>
      </Pressable>

      {open ? (
        <View style={styles.pickerWrap}>
          <DateTimePicker
            value={draft}
            // Union props require AndroidMode; iOS still accepts datetime at runtime.
            mode={(Platform.OS === 'ios' ? iosMode : pickerMode) as 'date' | 'time'}
            display={display}
            onChange={onPickerChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
          />
          {Platform.OS === 'ios' ? (
            <Button title="Done" variant="secondary" onPress={closePicker} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  value: {
    color: colors.text,
    fontSize: 16,
    flex: 1,
  },
  placeholder: {
    color: colors.textMuted,
  },
  pickerWrap: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
});
