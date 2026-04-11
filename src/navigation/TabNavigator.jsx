import React, { useRef, useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { MaterialCommunityIcons, Ionicons, AntDesign, FontAwesome } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

// Screens
import WorkoutsLibrary from '../screens/WorkoutsLibrary';
import WorkoutDetail from '../screens/WorkoutDetail';
import Calendar from '../screens/Calendar';
import AddWorkout from '../screens/AddWorkout';
import WeightsLog from '../screens/WeightsLog';
import Calories from '../screens/Calories';
import Settings from '../screens/Settings';
import Profile from '../screens/Profile';

import { useTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ─── Nested Stacks ────────────────────────────────────────────────────────────

const WorkoutStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000000' } }}>
    <Stack.Screen name="WorkoutsLibrary" component={WorkoutsLibrary} />
    <Stack.Screen name="WorkoutDetail" component={WorkoutDetail} />
    <Stack.Screen name="AddWorkout" component={AddWorkout} options={{ animation: 'slide_from_right' }} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000000' } }}>
    <Stack.Screen name="ProfileMain" component={Profile} />
    <Stack.Screen name="Settings" component={Settings} />
  </Stack.Navigator>
);

// ─── Tab Icon Map ─────────────────────────────────────────────────────────────

const TAB_ICONS = {
  Workouts: ({ color, size }) => (
    <MaterialCommunityIcons name="dumbbell" color={color} size={size} />
  ),
  Calendar: ({ color, size }) => (
    <Ionicons name="calendar" color={color} size={size} />
  ),
  Log: ({ color, size }) => (
    <FontAwesome name="bar-chart" color={color} size={size} />
  ),
  Calories: ({ color, size }) => (
    <MaterialCommunityIcons name="fire" color={color} size={size} />
  ),
  Profile: ({ color, size }) => (
    <MaterialCommunityIcons name="account" color={color} size={size} />
  ),
};

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────

const CustomTabBar = ({ state, descriptors, navigation }) => {
  const { colors, isDarkMode } = useTheme();

  const [containerWidth, setContainerWidth] = useState(0);
  const slideAnim = useRef(new Animated.Value(state.index)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: state.index,
      useNativeDriver: true,
      stiffness: 180,
      damping: 20,
      mass: 0.8,
    }).start();
  }, [state.index]);

  const pillWidth = 44;

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: [0, 1, 2, 3, 4].map(i => {
      const slotWidth = (containerWidth - 16) / 5;
      return 8 + (slotWidth * i) + (slotWidth / 2) - (pillWidth / 2);
    }),
  });

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={[
        styles.pillContainer,
        {
          shadowColor: isDarkMode ? '#000' : '#555',
        }
      ]}>
        <BlurView
          intensity={isDarkMode ? 95 : 75}
          tint={isDarkMode ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        {/* Tinted overlay for contrast */}
        <View style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDarkMode
              ? 'rgba(40, 40, 40, 0.55)'
              : 'rgba(210, 210, 210, 0.55)',
            borderRadius: 32,
          }
        ]} />

        {/* Icon Row — our layout, full control */}
        <View
          style={styles.iconRow}
          onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
          {containerWidth > 0 && (
            <Animated.View
              style={[
                styles.slidingPill,
                {
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
                  transform: [{ translateX }],
                }
              ]}
            />
          )}

          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const IconComponent = TAB_ICONS[route.name];

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.tabItem}
                activeOpacity={1}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel}
              >
                {IconComponent && (
                  <IconComponent
                    color={isFocused ? colors.text : colors.secondaryText}
                    size={22}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 36,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pillContainer: {
    flexDirection: 'row',
    width: '75%',
    borderRadius: 32,
    overflow: 'hidden',
    // Shadow
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 14,
  },
  iconRow: {
    flex: 1,
    flexDirection: 'row',
    height: 60,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1, // Make sure icons stay above pill
  },
  slidingPill: {
    position: 'absolute',
    left: 0,
    width: 44,
    height: 36,
    borderRadius: 18,
    zIndex: 0,
  }
});

// ─── Tab Navigator ────────────────────────────────────────────────────────────

const TabNavigator = () => (
  <Tab.Navigator
    tabBar={(props) => <CustomTabBar {...props} />}
    screenOptions={{ headerShown: false, lazy: true, unmountOnBlur: false }}
  >
    <Tab.Screen name="Workouts" component={WorkoutStack} />
    <Tab.Screen name="Calendar" component={Calendar} />
    <Tab.Screen name="Log" component={WeightsLog} />
    <Tab.Screen name="Calories" component={Calories} />
    <Tab.Screen
      name="Profile"
      component={ProfileStack}
      listeners={({ navigation }) => ({
        tabPress: (e) => {
          e.preventDefault();
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Profile', state: { routes: [{ name: 'ProfileMain' }], index: 0 } }],
            })
          );
        },
      })}
    />
  </Tab.Navigator>
);

export default TabNavigator;
