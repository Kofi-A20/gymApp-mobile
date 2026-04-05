import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { MaterialCommunityIcons, Ionicons, AntDesign, Feather } from '@expo/vector-icons';

const Profile = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const { signOut } = useAuth();
  const { profile, loading: profileLoading, updateProfile, refreshProfile } = useProfile();

  // Local state for form fields, initialized from profile
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        first_name: firstName,
        last_name: lastName,
        phone: phone,
      });
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      Alert.alert('Error', 'Failed to log out');
    }
  };

  const BiometricTile = ({ label, value, unit, isDark }) => (
    <View style={[
      styles.bioTile, 
      { 
        backgroundColor: isDark ? (isDarkMode ? '#121212' : '#000') : colors.secondaryBackground,
        borderColor: colors.border
      }
    ]}>
       <Text style={[styles.bioLabel, { color: isDark ? '#666' : colors.secondaryText }]}>{label.toUpperCase()}</Text>
       <View style={styles.bioValueRow}>
          <Text style={[styles.bioValue, { color: isDark ? '#FFF' : colors.text }]}>{value}</Text>
          {unit && <Text style={[styles.bioUnit, { color: isDark ? '#666' : colors.secondaryText }]}>{unit.toUpperCase()}</Text>}
       </View>
    </View>
  );

  const InputField = ({ label, value, onChangeText, keyboardType }) => (
    <View style={styles.inputContainer}>
       <Text style={[styles.fieldLabel, { color: colors.secondaryText }]}>{label.toUpperCase()}</Text>
       <TextInput 
          style={[styles.textInput, { color: colors.text, borderColor: colors.border }]}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
       />
    </View>
  );

  if (profileLoading && !profile) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <AntDesign name="arrowleft" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>PROFILE SETTINGS</Text>
        <TouchableOpacity onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          
          {/* Identity Header */}
          <View style={styles.profileHero}>
             <View style={styles.avatarWrapper}>
                <Image 
                  source={{ uri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300' }} 
                  style={styles.mainAvatar} 
                />
                <TouchableOpacity style={[styles.editBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
                   <Feather name="edit-2" size={16} color={colors.text} />
                </TouchableOpacity>
             </View>
             
             <View style={styles.identityText}>
                <Text style={[styles.identityLabel, { color: colors.secondaryText }]}>USER IDENTIFICATION</Text>
                <Text style={[styles.userName, { color: colors.text }]}>
                  {profile?.first_name?.toUpperCase()} {profile?.last_name?.toUpperCase()}
                </Text>
                <Text style={[styles.memberSince, { color: colors.secondaryText }]}>
                  Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'Unknown'}
                </Text>
             </View>
          </View>

          {/* Biometrics Grid */}
          <View style={styles.sectionTitleRow}>
             <Text style={[styles.sectionTitle, { color: colors.text }]}>BIOMETRICS</Text>
             <Text style={[styles.sectionSubTitle, { color: colors.secondaryText }]}>VITAL STATISTICS</Text>
          </View>

          <View style={styles.bioGrid}>
             <BiometricTile label="Height" value={profile?.height_cm || '--'} unit="cm" />
             <BiometricTile label="Weight" value={profile?.weight_kg || '--'} unit={profile?.units || 'kg'} />
             <BiometricTile label="Activity" value={profile?.activity_level?.toUpperCase() || 'NOT SET'} />
             <BiometricTile label="Goal" value={profile?.fitness_goals?.toUpperCase() || 'NOT SET'} isDark />
          </View>

          {/* Account Details */}
          <View style={[styles.sectionTitleRow, { marginTop: 60 }]}>
             <Text style={[styles.sectionTitle, { color: colors.text }]}>ACCOUNT DETAILS</Text>
             <Text style={[styles.sectionSubTitle, { color: colors.secondaryText }]}>SECURITY & CORE</Text>
          </View>

          <InputField label="First Name" value={firstName} onChangeText={setFirstName} />
          <InputField label="Last Name" value={lastName} onChangeText={setLastName} />
          <InputField label="Email Address" value={profile?.email} editable={false} />
          <InputField label="Mobile Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

          {/* System Preferences */}
          <View style={[styles.sectionTitleRow, { marginTop: 60 }]}>
             <Text style={[styles.sectionTitle, { color: colors.text }]}>SYSTEM PREFERENCES</Text>
          </View>
          <Text style={[styles.prefDesc, { color: colors.secondaryText }]}>
             Manage notifications and display metrics.
          </Text>

          <View style={styles.prefRow}>
             <TouchableOpacity style={[styles.prefChip, { backgroundColor: colors.secondaryBackground }]}>
                <Text style={[styles.prefChipText, { color: colors.text }]}>NOTIFICATIONS</Text>
             </TouchableOpacity>
             <TouchableOpacity 
                style={[styles.prefChip, { backgroundColor: colors.secondaryBackground }]}
                onPress={() => navigation.navigate('Settings')}
              >
                <Text style={[styles.prefChipText, { color: colors.text }]}>SETTINGS</Text>
             </TouchableOpacity>
          </View>

          {/* Save Action */}
          <TouchableOpacity 
            style={[styles.saveBtn, { backgroundColor: '#CCFF00' }]}
            onPress={handleSave}
            disabled={saving}
          >
             {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>SAVE CHANGES</Text>}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 60,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  headerAvatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  profileHero: {
     marginBottom: 60,
  },
  avatarWrapper: {
     width: 140,
     height: 140,
     marginBottom: 30,
  },
  mainAvatar: {
     width: '100%',
     height: '100%',
     borderRadius: 4,
  },
  editBtn: {
     position: 'absolute',
     bottom: -15,
     right: -15,
     width: 45,
     height: 45,
     borderRadius: 4,
     justifyContent: 'center',
     alignItems: 'center',
     borderWidth: 1,
  },
  identityText: {
     marginTop: 10,
  },
  identityLabel: {
     fontSize: 10,
     fontWeight: '800',
     letterSpacing: 1,
  },
  userName: {
     fontSize: 42,
     fontWeight: '900',
     letterSpacing: -1,
     marginVertical: 4,
  },
  memberSince: {
     fontSize: 14,
     fontWeight: '500',
  },
  sectionTitleRow: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'baseline',
     marginBottom: 30,
  },
  sectionTitle: {
     fontSize: 24,
     fontWeight: '900',
     letterSpacing: 0.5,
  },
  sectionSubTitle: {
     fontSize: 9,
     fontWeight: '800',
     letterSpacing: 1,
  },
  bioGrid: {
     flexDirection: 'row',
     flexWrap: 'wrap',
     gap: 12,
  },
  bioTile: {
     width: '48.2%',
     aspectRatio: 0.85,
     padding: 20,
     justifyContent: 'center',
     borderWidth: 1,
     borderRadius: 2,
  },
  bioLabel: {
     fontSize: 9,
     fontWeight: '800',
     letterSpacing: 1,
     marginBottom: 25,
  },
  bioValueRow: {
     flexDirection: 'row',
     alignItems: 'baseline',
     gap: 4,
  },
  bioValue: {
     fontSize: 32,
     fontWeight: '900',
  },
  bioUnit: {
     fontSize: 10,
     fontWeight: '800',
  },
  inputContainer: {
     marginBottom: 25,
  },
  fieldLabel: {
     fontSize: 9,
     fontWeight: '800',
     letterSpacing: 1,
     marginBottom: 8,
  },
  textInput: {
     height: 60,
     borderWidth: 1,
     borderRadius: 2,
     paddingHorizontal: 15,
     fontSize: 18,
     fontWeight: '700',
  },
  prefDesc: {
     fontSize: 14,
     fontWeight: '500',
     marginTop: -20,
     marginBottom: 20,
  },
  prefRow: {
     flexDirection: 'row',
     gap: 12,
  },
  prefChip: {
     flex: 1,
     height: 50,
     justifyContent: 'center',
     alignItems: 'center',
     borderRadius: 4,
  },
  prefChipText: {
     fontSize: 12,
     fontWeight: '900',
     letterSpacing: 1,
  },
  saveBtn: {
     marginTop: 60,
     padding: 24,
     alignItems: 'center',
     borderRadius: 4,
  },
  saveBtnText: {
     color: '#000',
     fontSize: 20,
     fontWeight: '900',
     letterSpacing: 1,
  },
});

export default Profile;
