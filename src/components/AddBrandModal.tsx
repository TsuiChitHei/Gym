import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { AppModal } from './AppModal';
import { AppTextInput } from './AppTextInput';
import { Button } from './Button';
import { createBrand } from '../db/repositories/brands';

interface AddBrandModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (brandId: number) => void;
}

export function AddBrandModal({ visible, onClose, onCreated }: AddBrandModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Brand name is required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const brand = await createBrand(name);
      setName('');
      onCreated(brand.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create brand.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setError(null);
    onClose();
  };

  return (
    <AppModal visible={visible} title="Add New Brand" onClose={handleClose}>
      <AppTextInput
        label="Brand name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Technogym"
        autoFocus
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Save Brand" onPress={handleSave} loading={loading} />
    </AppModal>
  );
}

const styles = StyleSheet.create({
  error: {
    color: '#F87171',
    marginBottom: 12,
  },
});
