import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../constants/theme';
import type { SettingsStackParamList } from '../../navigation/SettingsNavigator';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'SettingsHome'>;

const MENU_ITEMS: {
  key: 'Profile' | 'BrandsMachines';
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    key: 'Profile',
    title: 'Profile',
    subtitle: 'Birth date, sex, body weight, strength compare',
    icon: 'person-outline',
  },
  {
    key: 'BrandsMachines',
    title: 'Brands & Machines',
    subtitle: 'Manage gym brands and machine catalog',
    icon: 'barbell-outline',
  },
];

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.content}>
        {MENU_ITEMS.map((item) => (
          <Pressable
            key={item.key}
            style={styles.row}
            onPress={() => navigation.navigate(item.key)}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={item.icon} size={22} color={colors.primary} />
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>
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
    paddingBottom: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  row: {
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
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1B2A22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextWrap: {
    flex: 1,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
});
