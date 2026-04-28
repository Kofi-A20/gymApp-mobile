import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRepsAlert } from '../../context/AlertContext';
import AppTile from '../../components/AppTile';

const Login = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { colors } = useTheme();
  const { showAlert } = useRepsAlert();

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
    } catch (error) {
      showAlert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={[styles.logo, { color: colors.text }]}>REPS</Text>
            <Text style={[styles.subtitle, { color: colors.secondaryText }]}>CONTINUE YOUR EVOLUTION</Text>
          </View>

          <View style={styles.form}>
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
              <AppTile style={styles.tileInputContainer}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="••••••••••••"
                  placeholderTextColor={colors.secondaryText}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </AppTile>
            </View>

            <AppTile
              style={[styles.loginButton, { backgroundColor: colors.text, borderColor: colors.text }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={[styles.loginButtonText, { color: colors.background }]}>LOG IN</Text>
              )}
            </AppTile>

            <View style={styles.footer}>
              <Text style={{ color: colors.secondaryText }}>NEW TO REPS? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={[styles.link, { color: colors.text }]}>SIGN UP</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 30,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 60,
  },
  logo: {
    fontSize: 42,
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
    marginTop: 20,
  },
  inputContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 12,
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
  loginButton: {
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 40,
  },
  link: {
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
});

export default Login;
