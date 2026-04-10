import React, { useEffect, useRef } from 'react';
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
import * as Notifications from 'expo-notifications';

// Handle notifications while the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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

const AppContent = ({ linking }) => {
  const { settingsLoaded } = useTheme();

  if (!settingsLoaded) {
    return null;
  }

  return (
    <AlertProvider>
      <NavigationContainer linking={linking} ref={navigationRef}>
        <RootNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </AlertProvider>
  );
};

export const navigationRef = React.createRef();

export default function App() {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const { workoutId } = response.notification.request.content.data;
      if (workoutId && navigationRef.current) {
        // Navigate through the tab stack
        navigationRef.current.navigate('Tabs', {
          screen: 'Workouts',
          params: {
            screen: 'WorkoutDetail',
            params: { workoutId }
          }
        });
      }
    });

    return () => subscription.remove();
  }, []);

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
                <AppContent linking={linking} />
              </ThemeProvider>
            </WorkoutProvider>
          </ProfileProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </View>
  );
}
