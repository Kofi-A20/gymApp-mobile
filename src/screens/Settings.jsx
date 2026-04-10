import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { MaterialCommunityIcons, AntDesign } from '@expo/vector-icons';
import { useMonolithAlert } from '../context/AlertContext';

const Settings = ({ navigation }) => {
  const { isDarkMode, toggleTheme, units, toggleUnits, notifications, toggleNotifications, colors } = useTheme();
  const { signOut } = useAuth();
  const { showAlert } = useMonolithAlert();

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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Branding Header */}
        <View style={styles.brandHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <AntDesign name="arrowleft" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.brandTitle, { color: colors.text }]}>SETTINGS</Text>
          <View style={{ width: 24 }} />
        </View>

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

          <TouchableOpacity style={[styles.logoutBtn, { borderColor: colors.danger }]} onPress={handleLogout}>
             <Text style={[styles.logoutText, { color: colors.danger }]}>TERMINATE ACCOUNT SESSION</Text>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    height: 60,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
  avatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  topLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
  },
  mainTitle: {
    fontSize: 48,
    fontWeight: '900',
    marginBottom: 40,
    letterSpacing: -1,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    fontStyle: 'italic',
    marginRight: 10,
  },
  headerLine: {
    flex: 1,
    height: 1,
    opacity: 0.3,
  },
  accountCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderRadius: 4,
    borderWidth: 1,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    backgroundColor: '#CCFF00',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  authSub: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
  },
  securityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 30,
    paddingBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  securityLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  securitySub: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  interfaceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  themeCard: {
    width: '48%',
    padding: 20,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    borderRadius: 2,
  },
  themeNameBlack: {
    color: '#000',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 15,
  },
  themeSubBlack: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 5,
    opacity: 0.6,
  },
  themeNameWhite: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 15,
  },
  themeSubWhite: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 5,
    opacity: 0.6,
  },
  toggleCard: {
    padding: 20,
    borderRadius: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  toggleSub: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 5,
  },
  unitToggle: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 4,
  },
  unitToggleText: {
    fontWeight: '900',
    fontSize: 14,
  },
  terminal: {
    marginTop: 10,
  },
  terminalLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
  },
  terminalText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  logoutBtn: {
    marginTop: 50,
    padding: 20,
    borderWidth: 2,
    alignItems: 'center',
    borderRadius: 4,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
});

export default Settings;
