import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppModal } from './AppModal';
import { AppTextInput } from './AppTextInput';
import { Button } from './Button';
import { MachineImage } from './MachineImage';
import { colors, spacing } from '../constants/theme';
import { createMachine, getMachineModes, updateMachine } from '../db/repositories/machines';
import { deleteMachineImage, saveMachineImageFromPicker } from '../services/images';
import type { Machine } from '../types';

interface AddMachineModalProps {
  visible: boolean;
  brandId: number;
  machine?: Machine | null;
  onClose: () => void;
  onSaved: () => void;
}

export function AddMachineModal({
  visible,
  brandId,
  machine,
  onClose,
  onSaved,
}: AddMachineModalProps) {
  const [name, setName] = useState('');
  const [isMultipurpose, setIsMultipurpose] = useState(false);
  const [modesText, setModesText] = useState('');
  const [imageFilename, setImageFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;

    setName(machine?.machine_name ?? '');
    setIsMultipurpose(machine?.is_multipurpose === 1);
    setImageFilename(machine?.image_filename ?? null);
    setError(null);

    if (machine?.is_multipurpose) {
      getMachineModes(machine.id).then((modes) => {
        setModesText(modes.map((mode) => mode.mode_name).join(', '));
      });
    } else {
      setModesText('');
    }
  }, [visible, machine]);

  const handlePickImage = async () => {
    try {
      const filename = await saveMachineImageFromPicker();
      if (filename) {
        if (imageFilename && imageFilename !== machine?.image_filename) {
          await deleteMachineImage(imageFilename);
        }
        setImageFilename(filename);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pick image.');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Machine name is required.');
      return;
    }

    const modes = modesText
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);

    if (isMultipurpose && modes.length === 0) {
      setError('Enter at least one purpose for multipurpose machines.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (machine) {
        await updateMachine({
          id: machine.id,
          machineName: name,
          isMultipurpose,
          imageFilename,
          modes,
        });
      } else {
        await createMachine({
          brandId,
          machineName: name,
          isMultipurpose,
          imageFilename,
          modes,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save machine.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppModal visible={visible} title={machine ? 'Edit Machine' : 'Add New Machine'} onClose={onClose}>
      <ScrollView>
        <AppTextInput
          label="Machine name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Leg Press"
        />

        <Text style={styles.label}>Machine image (optional)</Text>
        <View style={styles.imageRow}>
          <MachineImage imageFilename={imageFilename} size={72} />
          <Button title="Upload Image" variant="secondary" onPress={handlePickImage} style={styles.uploadBtn} />
        </View>

        <Pressable style={styles.checkboxRow} onPress={() => setIsMultipurpose((v) => !v)}>
          <View style={[styles.checkbox, isMultipurpose && styles.checkboxChecked]}>
            {isMultipurpose ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
          <Text style={styles.checkboxLabel}>Multipurpose machine</Text>
        </Pressable>

        {isMultipurpose ? (
          <AppTextInput
            label="Purposes (comma-separated)"
            value={modesText}
            onChangeText={setModesText}
            placeholder="e.g. Chest press, Shoulder press"
          />
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={machine ? 'Save Changes' : 'Add Machine'} onPress={handleSave} loading={loading} />
      </ScrollView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontSize: 14,
    fontWeight: '500',
  },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  uploadBtn: {
    flex: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
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
  },
  checkboxLabel: {
    color: colors.text,
    fontSize: 16,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.sm,
  },
});
