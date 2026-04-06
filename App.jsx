import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { WorkoutProvider } from './src/context/WorkoutContext';
import { ProfileProvider } from './src/context/ProfileContext';
import { AlertProvider } from './src/context/AlertContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';

const prefix = Linking.createURL('/');

const RootNavigator = () => {
  const { user, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return user ? <MainNavigator /> : <AuthNavigator />;
};

export default function App() {
  const linking = {
    prefixes: [prefix, 'monolith://'],
    config: {
      screens: {
        Main: {
          screens: {
            SharedWorkoutPreview: 'share/:token',
          }
        },
        Auth: {
          screens: {
            SharedWorkoutPreview: 'share/:token',
          }
        }
      },
    },
  };

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ProfileProvider>
            <WorkoutProvider>
              <ThemeProvider>
                <AlertProvider>
                  <NavigationContainer linking={linking}>
                    <RootNavigator />
                    <StatusBar style="auto" />
                  </NavigationContainer>
                </AlertProvider>
              </ThemeProvider>
            </WorkoutProvider>
          </ProfileProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </View>
  );
}
