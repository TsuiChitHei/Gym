import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../constants/theme';
import { BrandsMachinesScreen } from '../screens/settings/BrandsMachinesScreen';
import { ProfileScreen } from '../screens/settings/ProfileScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';

export type SettingsStackParamList = {
  SettingsHome: undefined;
  Profile: undefined;
  BrandsMachines: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text, fontWeight: '600' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="SettingsHome"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Stack.Screen
        name="BrandsMachines"
        component={BrandsMachinesScreen}
        options={{ title: 'Brands & Machines' }}
      />
    </Stack.Navigator>
  );
}
