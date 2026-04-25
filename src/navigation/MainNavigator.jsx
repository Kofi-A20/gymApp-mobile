import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import SharedWorkoutPreview from '../screens/SharedWorkoutPreview';
import ActiveWorkout from '../screens/ActiveWorkout';
import SessionHistoryDetail from '../screens/SessionHistoryDetail';
import JoinWorkout from '../screens/JoinWorkoutScreen';
import SplitsScreen from '../screens/SplitsScreen';
import EditSplitScreen from '../screens/EditSplitScreen';

const Stack = createNativeStackNavigator();

const MainNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000000' } }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="SharedWorkoutPreview" component={SharedWorkoutPreview} />
      <Stack.Screen name="JoinWorkout" component={JoinWorkout} />
      <Stack.Screen name="SessionHistoryDetail" component={SessionHistoryDetail} />
      <Stack.Screen name="SplitsScreen" component={SplitsScreen} />
      <Stack.Screen name="EditSplitScreen" component={EditSplitScreen} />
      <Stack.Screen 
        name="ActiveWorkout" 
        component={ActiveWorkout} 
        options={{ gestureEnabled: false }} 
      />
    </Stack.Navigator>
  );
};

export default MainNavigator;
