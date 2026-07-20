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
import { AddBrandModal } from '../../components/AddBrandModal';
import { AddMachineModal } from '../../components/AddMachineModal';
import { AppModal } from '../../components/AppModal';
import { AppTextInput } from '../../components/AppTextInput';
import { Button } from '../../components/Button';
import { MachineImage } from '../../components/MachineImage';
import { colors, spacing } from '../../constants/theme';
import { deleteBrand, getAllBrands, updateBrand } from '../../db/repositories/brands';
import { deleteMachine, getMachinesByBrand } from '../../db/repositories/machines';
import type { Brand, Machine } from '../../types';

export function BrandsMachinesScreen() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [showAddMachine, setShowAddMachine] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [editBrandName, setEditBrandName] = useState('');

  const loadBrands = useCallback(async () => {
    const data = await getAllBrands();
    setBrands(data);
    if (selectedBrandId && !data.find((b) => b.id === selectedBrandId)) {
      setSelectedBrandId(null);
      setMachines([]);
    }
  }, [selectedBrandId]);

  const loadMachines = useCallback(async (brandId: number) => {
    const data = await getMachinesByBrand(brandId);
    setMachines(data);
  }, []);

  useEffect(() => {
    void loadBrands();
  }, [loadBrands]);

  useEffect(() => {
    if (selectedBrandId) {
      void loadMachines(selectedBrandId);
    }
  }, [selectedBrandId, loadMachines]);

  const handleDeleteBrand = (brand: Brand) => {
    Alert.alert('Delete Brand', `Delete "${brand.name}"? Machines must be removed first.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBrand(brand.id);
            if (selectedBrandId === brand.id) {
              setSelectedBrandId(null);
              setMachines([]);
            }
            void loadBrands();
          } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Cannot delete brand.');
          }
        },
      },
    ]);
  };

  const handleDeleteMachine = (machine: Machine) => {
    Alert.alert('Delete Machine', `Delete "${machine.machine_name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMachine(machine.id);
            if (selectedBrandId) void loadMachines(selectedBrandId);
          } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Cannot delete machine.');
          }
        },
      },
    ]);
  };

  const handleSaveBrandEdit = async () => {
    if (!editingBrand || !editBrandName.trim()) return;
    try {
      await updateBrand(editingBrand.id, editBrandName);
      setEditingBrand(null);
      void loadBrands();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update brand.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Brands</Text>
        {brands.map((brand) => (
          <Pressable
            key={brand.id}
            style={[styles.row, selectedBrandId === brand.id && styles.rowSelected]}
            onPress={() => setSelectedBrandId(brand.id)}
          >
            <Text style={styles.rowText}>{brand.name}</Text>
            <View style={styles.rowActions}>
              <Pressable
                onPress={() => {
                  setEditingBrand(brand);
                  setEditBrandName(brand.name);
                }}
                hitSlop={8}
              >
                <Ionicons name="pencil" size={18} color={colors.textSecondary} />
              </Pressable>
              <Pressable onPress={() => handleDeleteBrand(brand)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
          </Pressable>
        ))}
        <Button title="Add Brand" variant="secondary" onPress={() => setShowAddBrand(true)} />

        {selectedBrandId ? (
          <>
            <Text style={[styles.sectionTitle, styles.machinesTitle]}>Machines</Text>
            {machines.map((machine) => (
              <View key={machine.id} style={styles.machineRow}>
                <MachineImage imageFilename={machine.image_filename} />
                <View style={styles.machineInfo}>
                  <Text style={styles.rowText}>{machine.machine_name}</Text>
                  {machine.is_multipurpose ? (
                    <Text style={styles.multipurpose}>Multipurpose</Text>
                  ) : null}
                </View>
                <View style={styles.rowActions}>
                  <Pressable
                    onPress={() => {
                      setEditingMachine(machine);
                      setShowAddMachine(true);
                    }}
                    hitSlop={8}
                  >
                    <Ionicons name="pencil" size={18} color={colors.textSecondary} />
                  </Pressable>
                  <Pressable onPress={() => handleDeleteMachine(machine)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
            ))}
            <Button
              title="Add Machine"
              variant="secondary"
              onPress={() => {
                setEditingMachine(null);
                setShowAddMachine(true);
              }}
            />
          </>
        ) : (
          <Text style={styles.hint}>Select a brand to manage its machines.</Text>
        )}
      </ScrollView>

      <AddBrandModal
        visible={showAddBrand}
        onClose={() => setShowAddBrand(false)}
        onCreated={() => void loadBrands()}
      />

      {selectedBrandId ? (
        <AddMachineModal
          visible={showAddMachine}
          brandId={selectedBrandId}
          machine={editingMachine}
          onClose={() => {
            setShowAddMachine(false);
            setEditingMachine(null);
          }}
          onSaved={() => void loadMachines(selectedBrandId)}
        />
      ) : null}

      <AppModal
        visible={editingBrand !== null}
        title="Edit Brand"
        onClose={() => setEditingBrand(null)}
      >
        <AppTextInput label="Brand name" value={editBrandName} onChangeText={setEditBrandName} />
        <Button title="Save" onPress={handleSaveBrandEdit} />
      </AppModal>
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
  machinesTitle: {
    marginTop: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  rowSelected: {
    borderColor: colors.primary,
  },
  rowText: {
    color: colors.text,
    fontSize: 16,
    flex: 1,
  },
  rowActions: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  machineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  machineInfo: {
    flex: 1,
  },
  multipurpose: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  hint: {
    color: colors.textMuted,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});
