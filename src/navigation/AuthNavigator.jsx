import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import Login from '../screens/auth/Login';
import SignUp from '../screens/auth/SignUp';
import SharedWorkoutPreview from '../screens/SharedWorkoutPreview';

const Stack = createNativeStackNavigator();

const AuthNavigator = () => {
  const { colors } = useTheme();
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'fade_from_bottom',
        contentStyle: { backgroundColor: colors.background }
      }}
    >
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="SignUp" component={SignUp} />
      <Stack.Screen name="SharedWorkoutPreview" component={SharedWorkoutPreview} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
