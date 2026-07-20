import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AddBrandModal } from './AddBrandModal';
import { AddMachineModal } from './AddMachineModal';
import { AppTextInput } from './AppTextInput';
import { Button } from './Button';
import { MachineImage } from './MachineImage';
import { colors, spacing } from '../constants/theme';
import { getAllBrands } from '../db/repositories/brands';
import { getMachineModes, getMachinesByBrand } from '../db/repositories/machines';
import type { Brand, Machine, MachineMode } from '../types';

export interface ExerciseSelection {
  machineId: number;
  machineModeId?: number;
  machineName: string;
  brandName: string;
  modeName?: string;
}

interface ExerciseSelectFormProps {
  exerciseNumber: number;
  onStart: (selection: ExerciseSelection) => void;
  onCancel: () => void;
}

export function ExerciseSelectForm({ exerciseNumber, onStart, onCancel }: ExerciseSelectFormProps) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [modes, setModes] = useState<MachineMode[]>([]);
  const [selectedModeId, setSelectedModeId] = useState<number | null>(null);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showMachineModal, setShowMachineModal] = useState(false);
  const [showBrandPicker, setShowBrandPicker] = useState(false);
  const [showMachinePicker, setShowMachinePicker] = useState(false);
  const [machineSearch, setMachineSearch] = useState('');

  const loadBrands = async () => {
    const data = await getAllBrands();
    setBrands(data);
    if (!selectedBrandId && data.length > 0) {
      const freeWeights = data.find((b) => b.name === 'Free weights');
      setSelectedBrandId(freeWeights?.id ?? data[0].id);
    }
  };

  const loadMachines = async (brandId: number) => {
    const data = await getMachinesByBrand(brandId);
    setMachines(data);
    setSelectedMachine(null);
    setModes([]);
    setSelectedModeId(null);
    setMachineSearch('');
    setShowMachinePicker(false);
  };

  useEffect(() => {
    void loadBrands();
  }, []);

  useEffect(() => {
    if (selectedBrandId) {
      void loadMachines(selectedBrandId);
    }
  }, [selectedBrandId]);

  useEffect(() => {
    if (selectedMachine?.is_multipurpose) {
      void getMachineModes(selectedMachine.id).then(setModes);
    } else {
      setModes([]);
      setSelectedModeId(null);
    }
  }, [selectedMachine]);

  const selectedBrand = brands.find((b) => b.id === selectedBrandId);

  const filteredMachines = useMemo(() => {
    const q = machineSearch.trim().toLowerCase();
    if (!q) return machines;
    return machines.filter((machine) => machine.machine_name.toLowerCase().includes(q));
  }, [machines, machineSearch]);

  const machineSummary = selectedMachine?.machine_name ?? 'Select machine';

  const handleStart = () => {
    if (!selectedMachine || !selectedBrand) return;
    if (selectedMachine.is_multipurpose && !selectedModeId) return;

    const mode = modes.find((m) => m.id === selectedModeId);
    onStart({
      machineId: selectedMachine.id,
      machineModeId: selectedModeId ?? undefined,
      machineName: selectedMachine.machine_name,
      brandName: selectedBrand.name,
      modeName: mode?.mode_name,
    });
  };

  const canStart =
    selectedMachine && (!selectedMachine.is_multipurpose || selectedModeId !== null);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Exercise {exerciseNumber}</Text>

      <Text style={styles.label}>Brand</Text>
      <Pressable style={styles.select} onPress={() => setShowBrandPicker((v) => !v)}>
        <Text style={styles.selectText}>{selectedBrand?.name ?? 'Select brand'}</Text>
        <Ionicons
          name={showBrandPicker ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </Pressable>

      {showBrandPicker ? (
        <View style={styles.pickerList}>
          {brands.map((brand) => (
            <Pressable
              key={brand.id}
              style={styles.pickerItem}
              onPress={() => {
                setSelectedBrandId(brand.id);
                setShowBrandPicker(false);
              }}
            >
              <Text style={styles.pickerItemText}>{brand.name}</Text>
            </Pressable>
          ))}
          <Pressable
            style={styles.pickerItem}
            onPress={() => {
              setShowBrandPicker(false);
              setShowBrandModal(true);
            }}
          >
            <Text style={[styles.pickerItemText, styles.addNew]}>+ Add New Brand</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.label}>Machine</Text>
      <Pressable
        style={styles.select}
        onPress={() => {
          if (machines.length === 0) return;
          setShowMachinePicker((v) => !v);
        }}
      >
        <Text style={[styles.selectText, !selectedMachine && styles.placeholder]}>
          {machines.length === 0 ? 'No machines for this brand yet' : machineSummary}
        </Text>
        <Ionicons
          name={showMachinePicker ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </Pressable>

      {showMachinePicker ? (
        <View style={styles.pickerList}>
          <AppTextInput
            label="Search"
            value={machineSearch}
            onChangeText={setMachineSearch}
            placeholder="Type machine name"
            style={styles.searchInput}
          />
          <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
            {filteredMachines.length === 0 ? (
              <Text style={styles.emptyPicker}>No matching machines</Text>
            ) : (
              filteredMachines.map((machine) => (
                <Pressable
                  key={machine.id}
                  style={[
                    styles.machinePickerItem,
                    selectedMachine?.id === machine.id && styles.machineSelected,
                  ]}
                  onPress={() => {
                    setSelectedMachine(machine);
                    setShowMachinePicker(false);
                    setMachineSearch('');
                  }}
                >
                  <MachineImage imageFilename={machine.image_filename} />
                  <Text style={styles.machineName}>{machine.machine_name}</Text>
                </Pressable>
              ))
            )}
          </ScrollView>
          <Button
            title="Done"
            variant="secondary"
            onPress={() => setShowMachinePicker(false)}
            style={styles.doneBtn}
          />
        </View>
      ) : null}

      <Button
        title="Add New Machine"
        variant="secondary"
        onPress={() => setShowMachineModal(true)}
        disabled={!selectedBrandId}
        style={styles.addMachineBtn}
      />

      {selectedMachine?.is_multipurpose ? (
        <>
          <Text style={styles.label}>Purpose</Text>
          {modes.map((mode) => (
            <Pressable
              key={mode.id}
              style={[styles.modeRow, selectedModeId === mode.id && styles.machineSelected]}
              onPress={() => setSelectedModeId(mode.id)}
            >
              <Text style={styles.machineName}>{mode.mode_name}</Text>
            </Pressable>
          ))}
        </>
      ) : null}

      <View style={styles.actions}>
        <Button title="Start" onPress={handleStart} disabled={!canStart} style={styles.actionBtn} />
        <Button title="Cancel" variant="secondary" onPress={onCancel} style={styles.actionBtn} />
      </View>

      <AddBrandModal
        visible={showBrandModal}
        onClose={() => setShowBrandModal(false)}
        onCreated={(brandId) => {
          void loadBrands().then(() => setSelectedBrandId(brandId));
        }}
      />

      {selectedBrandId ? (
        <AddMachineModal
          visible={showMachineModal}
          brandId={selectedBrandId}
          onClose={() => setShowMachineModal(false)}
          onSaved={() => void loadMachines(selectedBrandId)}
        />
      ) : null}
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
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
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
  selectText: { color: colors.text, fontSize: 16, flex: 1, marginRight: spacing.sm },
  placeholder: { color: colors.textMuted },
  pickerList: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  pickerItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerItemText: { color: colors.text, fontSize: 16 },
  addNew: { color: colors.primary, fontWeight: '600' },
  searchInput: {
    marginHorizontal: spacing.sm,
    marginTop: spacing.sm,
  },
  pickerScroll: {
    maxHeight: 220,
  },
  emptyPicker: {
    color: colors.textMuted,
    textAlign: 'center',
    padding: spacing.lg,
  },
  machinePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  machineSelected: {
    borderColor: colors.primary,
    backgroundColor: '#1B2A22',
  },
  machineName: { color: colors.text, fontSize: 16, flex: 1 },
  modeRow: {
    padding: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addMachineBtn: { marginTop: spacing.sm, marginBottom: spacing.lg },
  doneBtn: {
    margin: spacing.sm,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  actionBtn: { flex: 1 },
});
