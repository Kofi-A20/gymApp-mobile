import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RepsHeader from '../../components/RepsHeader';
import { useRepsAlert } from '../../context/AlertContext';
import AppTile from '../../components/AppTile';

const SignUp = ({ navigation }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { showAlert } = useRepsAlert();

  const handleSignUp = async () => {
    setPasswordError('');

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      setPasswordError('Minimum 8 characters required');
      return;
    } else if (!/[a-zA-Z]/.test(password)) {
      setPasswordError('Must contain at least one letter');
      return;
    } else if (!/[0-9]/.test(password)) {
      setPasswordError('Must contain at least one number');
      return;
    } else if (!/[^a-zA-Z0-9]/.test(password)) {
      setPasswordError('Must contain at least one special character');
      return;
    }

    if (password !== confirmPassword) {
      showAlert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      });
      // Email confirmation is disabled in Supabase — signUp returns a live
      // session immediately. The onAuthStateChange listener in AuthContext
      // will set the user and drive navigation automatically, so there is
      // nothing extra to do here.
    } catch (error) {
      showAlert('Signup Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <RepsHeader onLeftPress={() => navigation.goBack()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={[styles.logo, { color: colors.text }]}>JOIN REPS</Text>
            <Text style={[styles.subtitle, { color: colors.secondaryText }]}>DEFINE YOUR LEGACY</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 10 }]}>
                <Text style={[styles.label, { color: colors.secondaryText }]}>FIRST NAME</Text>
                <AppTile style={styles.tileInputContainer}>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="NAME"
                    placeholderTextColor={colors.secondaryText}
                    value={firstName}
                    onChangeText={setFirstName}
                  />
                </AppTile>
              </View>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.secondaryText }]}>LAST NAME</Text>
                <AppTile style={styles.tileInputContainer}>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="LAST"
                    placeholderTextColor={colors.secondaryText}
                    value={lastName}
                    onChangeText={setLastName}
                  />
                </AppTile>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.secondaryText }]}>EMAIL</Text>
              <AppTile style={styles.tileInputContainer}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="YOUR_EMAIL@EXAMPLE.COM"
                  placeholderTextColor={colors.secondaryText}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </AppTile>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.secondaryText }]}>PASSWORD</Text>
              <AppTile style={[styles.tileInputContainer, passwordError ? { borderColor: colors.danger || 'red', borderWidth: 1 } : {}]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="••••••••••••"
                  placeholderTextColor={colors.secondaryText}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </AppTile>
              {passwordError ? <Text style={[styles.errorText, { color: colors.danger || 'red' }]}>{passwordError}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.secondaryText }]}>CONFIRM PASSWORD</Text>
              <AppTile style={styles.tileInputContainer}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="••••••••••••"
                  placeholderTextColor={colors.secondaryText}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </AppTile>
            </View>

            <AppTile
              style={[styles.signUpButton, { backgroundColor: colors.text, borderColor: colors.text }]}
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={[styles.signUpButtonText, { color: colors.background }]}>CREATE ACCOUNT</Text>
              )}
            </AppTile>

            <View style={styles.footer}>
              <Text style={{ color: colors.secondaryText }}>ALREADY CHALLENGED? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={[styles.link, { color: colors.text }]}>LOG IN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 30,
    paddingTop: 40,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 30,
  },
  header: {
    marginBottom: 40,
  },
  logo: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  form: {
    marginTop: 0,
  },
  row: {
    flexDirection: 'row',
  },
  inputContainer: {
    marginBottom: 25,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  tileInputContainer: {
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  input: {
    height: 45,
    fontSize: 16,
    paddingVertical: 5,
  },
  errorText: {
    fontSize: 12,
    marginTop: 5,
    fontWeight: '600',
  },
  signUpButton: {
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  signUpButtonText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  link: {
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
});

export default SignUp;
