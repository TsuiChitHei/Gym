import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseProvider } from './src/context/DatabaseContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <DatabaseProvider>
        <AppNavigator />
        <StatusBar style="light" />
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}
