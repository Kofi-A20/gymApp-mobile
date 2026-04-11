import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Switch, Platform, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { MaterialCommunityIcons, AntDesign, Ionicons } from '@expo/vector-icons';
import RepsHeader from '../components/MonolithHeader';
import { useRepsAlert } from '../context/AlertContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const EXPO_WEEKDAYS = {
  'SUN': 1, 'MON': 2, 'TUE': 3, 'WED': 4, 'THU': 5, 'FRI': 6, 'SAT': 7
};

const Settings = ({ navigation }) => {
  const { isDarkMode, toggleTheme, units, toggleUnits, notifications, toggleNotifications, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { showAlert } = useRepsAlert();

  // Weight Reminder States
  const [weightReminderEnabled, setWeightReminderEnabled] = useState(false);
  const [weightReminderDay, setWeightReminderDay] = useState('SUN');
  const [weightReminderHour, setWeightReminderHour] = useState(9);
  const [weightReminderMinute, setWeightReminderMinute] = useState(0);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const e = await AsyncStorage.getItem('weightReminderEnabled');
      const d = await AsyncStorage.getItem('weightReminderDay');
      const h = await AsyncStorage.getItem('weightReminderHour');
      const m = await AsyncStorage.getItem('weightReminderMinute');
      
      if (e !== null) setWeightReminderEnabled(e === 'true');
      if (d !== null) setWeightReminderDay(d);
      if (h !== null) setWeightReminderHour(parseInt(h));
      if (m !== null) setWeightReminderMinute(parseInt(m));
    } catch(e) {}
  };

  const scheduleReminder = async (enabled, day, hour, minute) => {
    try {
      await Notifications.cancelScheduledNotificationAsync('weeklyWeightReminder');
      if (enabled) {
        if (Platform.OS === 'ios') {
          const { status } = await Notifications.getPermissionsAsync();
          if (status !== 'granted') {
            await Notifications.requestPermissionsAsync();
          }
        }
        
        await Notifications.scheduleNotificationAsync({
          identifier: 'weeklyWeightReminder',
          content: {
            title: 'REPS',
            body: 'TIME TO LOG YOUR WEIGHT — STAY ON TRACK.',
          },
          trigger: {
            weekday: EXPO_WEEKDAYS[day],
            hour: hour,
            minute: minute,
            repeats: true,
          }
        });
      }
    } catch (e) {
      console.log("Failed to schedule weekly weight reminder:", e);
    }
  };

  const setReminderVal = async (key, val, setter) => {
    setter(val);
    try {
      if (typeof val === 'boolean') {
        await AsyncStorage.setItem(key, val ? 'true' : 'false');
      } else {
        await AsyncStorage.setItem(key, String(val));
      }
    } catch (e) {}
  };

  const updateEnabled = async (val) => {
    await setReminderVal('weightReminderEnabled', val, setWeightReminderEnabled);
    await scheduleReminder(val, weightReminderDay, weightReminderHour, weightReminderMinute);
  };
  
  const updateDay = async (val) => {
    await setReminderVal('weightReminderDay', val, setWeightReminderDay);
    if (weightReminderEnabled) await scheduleReminder(true, val, weightReminderHour, weightReminderMinute);
  };
  
  const updateTime = async (_, date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (date) {
      const h = date.getHours();
      const m = date.getMinutes();
      await setReminderVal('weightReminderHour', h, setWeightReminderHour);
      await setReminderVal('weightReminderMinute', m, setWeightReminderMinute);
      if (weightReminderEnabled) await scheduleReminder(true, weightReminderDay, h, m);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      showAlert('Error', 'Failed to log out');
    }
  };

  const SectionHeader = ({ id, title }) => (
    <View style={styles.sectionHeaderContainer}>
      <Text style={[styles.sectionHeader, { color: colors.text }]}>{id}. {title.toUpperCase()}</Text>
      <View style={[styles.headerLine, { backgroundColor: colors.border }]} />
    </View>
  );

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <RepsHeader 
          title="SETTINGS" 
          onLeftPress={() => navigation.goBack()} 
        />

        <View style={styles.content}>
          <Text style={[styles.topLabel, { color: colors.secondaryText }]}>SYSTEM PREFERENCES</Text>
          <Text style={[styles.mainTitle, { color: colors.text }]}>OPTIONS</Text>

          {/* Section 01: Interface */}
          <SectionHeader id="01" title="Interface" />
          <View style={styles.interfaceGrid}>
            <TouchableOpacity 
              onPress={() => isDarkMode && toggleTheme()}
              style={[
                styles.themeCard, 
                { backgroundColor: '#FFFFFF', borderColor: !isDarkMode ? colors.accent : colors.border, borderWidth: !isDarkMode ? 2 : 1 }
              ]}
            >
              <MaterialCommunityIcons name="white-balance-sunny" size={32} color="#000" />
              <Text style={styles.themeNameBlack}>STARK WHITE</Text>
              <Text style={styles.themeSubBlack}>{!isDarkMode ? 'ACTIVE THEME' : 'SWITCH MODE'}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => !isDarkMode && toggleTheme()}
              style={[
                styles.themeCard, 
                { backgroundColor: '#121212', borderColor: isDarkMode ? colors.accent : colors.border, borderWidth: isDarkMode ? 2 : 1 }
              ]}
            >
              <MaterialCommunityIcons name="moon-waning-crescent" size={32} color="#FFF" />
              <Text style={styles.themeNameWhite}>DEEP BLACK</Text>
              <Text style={styles.themeSubWhite}>{isDarkMode ? 'ACTIVE THEME' : 'SWITCH MODE'}</Text>
            </TouchableOpacity>
          </View>

          {/* Section 02: Alerts & Units */}
          <SectionHeader id="02" title="Alerts & Units" />
          <View style={[styles.toggleCard, { backgroundColor: colors.secondaryBackground }]}>
             <View style={styles.toggleRow}>
                <View>
                   <Text style={[styles.toggleLabel, { color: colors.text }]}>WORKOUT REMINDERS</Text>
                   <Text style={[styles.toggleSub, { color: colors.secondaryText }]}>PUSH NOTIFICATIONS FOR SCHEDULED SETS</Text>
                </View>
                <Switch 
                  value={notifications} 
                  onValueChange={toggleNotifications}
                  trackColor={{ false: '#767577', true: isDarkMode ? '#CCFF00' : '#000' }}
                  thumbColor="#f4f3f4"
                />
             </View>
          </View>

          <View style={[styles.toggleCard, { backgroundColor: colors.secondaryBackground, marginTop: 12 }]}>
             <View style={styles.toggleRow}>
                <View>
                   <Text style={[styles.toggleLabel, { color: colors.text }]}>SYSTEM UNITS</Text>
                   <Text style={[styles.toggleSub, { color: colors.secondaryText }]}>CURRENTLY USING: {units.toUpperCase()}</Text>
                </View>
                <TouchableOpacity onPress={toggleUnits} style={[styles.unitToggle, { backgroundColor: colors.text }]}>
                   <Text style={[styles.unitToggleText, { color: colors.background }]}>{units.toUpperCase()}</Text>
                </TouchableOpacity>
             </View>
          </View>

          {/* Section 03: Weight Reminder */}
          <SectionHeader id="03" title="Weight Reminder" />
          <View style={[styles.toggleCard, { backgroundColor: colors.secondaryBackground }]}>
             <View style={styles.toggleRow}>
                <View>
                   <Text style={[styles.toggleLabel, { color: colors.text }]}>WEEKLY LOGGING</Text>
                   <Text style={[styles.toggleSub, { color: colors.secondaryText }]}>PROMPTS FOR WEIGHT CHECK-IN</Text>
                </View>
                <Switch 
                  value={weightReminderEnabled} 
                  onValueChange={updateEnabled}
                  trackColor={{ false: '#767577', true: isDarkMode ? '#CCFF00' : '#000' }}
                  thumbColor="#f4f3f4"
                />
             </View>
          </View>

          {weightReminderEnabled && (
            <View style={{ marginTop: 15 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                {DAYS.map(day => {
                  const isSelected = day === weightReminderDay;
                  return (
                    <TouchableOpacity 
                      key={day}
                      onPress={() => updateDay(day)}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 8,
                        borderRadius: 4,
                        borderWidth: 1,
                        borderColor: isSelected ? '#CCFF00' : colors.border,
                        backgroundColor: isSelected ? '#CCFF00' : 'transparent',
                        flex: 1,
                        alignItems: 'center',
                        marginHorizontal: 2
                      }}
                    >
                      <Text style={{
                        fontSize: 10, 
                        fontWeight: '900',
                        color: isSelected ? '#000' : colors.text
                      }}>{day}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <TouchableOpacity
                onPress={() => setShowTimePicker(true)}
                style={[styles.toggleCard, { backgroundColor: colors.secondaryBackground, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>TIME</Text>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#CCFF00' }}>
                  {weightReminderHour.toString().padStart(2, '0')}:{weightReminderMinute.toString().padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Time Picker Modals */}
          {showTimePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={new Date(new Date().setHours(weightReminderHour, weightReminderMinute, 0, 0))}
              mode="time"
              display="spinner"
              is24Hour={true}
              onChange={updateTime}
            />
          )}

          {showTimePicker && Platform.OS === 'ios' && (
            <Modal transparent animationType="slide" visible={showTimePicker}>
              <View style={styles.modalOverlay}>
                <View style={[styles.modalBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>REMINDER TIME</Text>
                    <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                      <Text style={{ color: '#CCFF00', fontWeight: '900', fontSize: 14 }}>DONE</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={new Date(new Date().setHours(weightReminderHour, weightReminderMinute, 0, 0))}
                    mode="time"
                    display="spinner"
                    themeVariant={isDarkMode ? 'dark' : 'light'}
                    onChange={updateTime}
                    style={{ width: '100%' }}
                  />
                </View>
              </View>
            </Modal>
          )}

          <TouchableOpacity style={[styles.logoutBtn, { borderColor: colors.danger }]} onPress={handleLogout}>
             <Text style={[styles.logoutText, { color: colors.danger }]}>TERMINATE ACCOUNT SESSION</Text>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  brandHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, height: 60,
  },
  brandTitle: { fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  content: { paddingHorizontal: 24, paddingTop: 30 },
  topLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  mainTitle: { fontSize: 48, fontWeight: '900', marginBottom: 40, letterSpacing: -1 },
  sectionHeaderContainer: {
    flexDirection: 'row', alignItems: 'center', marginTop: 40, marginBottom: 20,
  },
  sectionHeader: { fontSize: 18, fontWeight: '700', fontStyle: 'italic', marginRight: 10 },
  headerLine: { flex: 1, height: 1, opacity: 0.3 },
  interfaceGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  themeCard: {
    width: '48%', padding: 20, aspectRatio: 1,
    justifyContent: 'center', alignItems: 'flex-start', borderRadius: 2,
  },
  themeNameBlack: { color: '#000', fontSize: 20, fontWeight: '900', marginTop: 15 },
  themeSubBlack: { color: '#000', fontSize: 10, fontWeight: '700', marginTop: 5, opacity: 0.6 },
  themeNameWhite: { color: '#FFF', fontSize: 20, fontWeight: '900', marginTop: 15 },
  themeSubWhite: { color: '#FFF', fontSize: 10, fontWeight: '700', marginTop: 5, opacity: 0.6 },
  toggleCard: { padding: 20, borderRadius: 4 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleLabel: { fontSize: 16, fontWeight: '700' },
  toggleSub: { fontSize: 10, fontWeight: '600', marginTop: 5 },
  unitToggle: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 4 },
  unitToggleText: { fontWeight: '900', fontSize: 14 },
  logoutBtn: { marginTop: 50, padding: 20, borderWidth: 2, alignItems: 'center', borderRadius: 4 },
  logoutText: { fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end',
  },
  modalBox: { borderTopWidth: 1, paddingBottom: 40 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  modalTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 2 },
});

export default Settings;
