import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { getDatabase } from '../db/database';
import { colors } from '../constants/theme';

interface DatabaseContextValue {
  ready: boolean;
}

const DatabaseContext = createContext<DatabaseContextValue>({ ready: false });

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDatabase()
      .then(() => setReady(true))
      .catch((err) => setError(err instanceof Error ? err.message : 'Database init failed'));
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <DatabaseContext.Provider value={{ ready }}>{children}</DatabaseContext.Provider>;
}

export function useDatabaseReady(): boolean {
  return useContext(DatabaseContext).ready;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  error: {
    color: colors.danger,
    padding: 24,
    textAlign: 'center',
  },
});
