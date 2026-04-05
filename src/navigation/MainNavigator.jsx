import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import SharedWorkoutPreview from '../screens/SharedWorkoutPreview';

const Stack = createNativeStackNavigator();

const MainNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="SharedWorkoutPreview" component={SharedWorkoutPreview} />
    </Stack.Navigator>
  );
};

export default MainNavigator;
