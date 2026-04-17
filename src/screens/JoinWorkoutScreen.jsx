import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { sharingService } from '../services/sharingService';
import { MaterialCommunityIcons, AntDesign, Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { CameraView, useCameraPermissions } from 'expo-camera';
import RepsHeader from '../components/RepsHeader';
import { useRepsAlert } from '../context/AlertContext';

const JoinWorkoutScreen = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { showAlert } = useRepsAlert();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [hasScanned, setHasScanned] = useState(false);

  const fetchWorkout = async (token) => {
    Keyboard.dismiss();
    const cleanToken = token.trim().toUpperCase();
    console.log('[IMPORT] Attempting to fetch workout with token:', cleanToken);
    if (cleanToken.length !== 6) {
      showAlert('INVALID CODE', 'Please enter a 6-character code.');
      return;
    }

    try {
      setLoading(true);
      console.log('[IMPORT] Calling sharingService.getSharedWorkout...');
      const data = await sharingService.getSharedWorkout(cleanToken);
      console.log('[IMPORT] Workout fetched successfully:', data?.name);
      navigation.navigate('SharedWorkoutPreview', { token: cleanToken, workout: data });
    } catch (error) {
      console.error('[IMPORT] Error fetching workout:', error);
      showAlert('INVALID CODE', 'This code doesn\'t match any shared workout. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      const formatted = text.trim().toUpperCase().substring(0, 6);
      setCode(formatted);
      if (formatted.length === 6) {
         fetchWorkout(formatted);
      }
    }
  };

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        showAlert('CAMERA ACCESS', 'Camera permission is required to scan QR codes.');
        return;
      }
    }
    setHasScanned(false);
    setScannerOpen(true);
  };

  const handleBarCodeScanned = ({ data }) => {
    if (hasScanned) return;
    setHasScanned(true);
    console.log('[IMPORT] QR code scanned:', data);
    const scannedToken = data.trim().toUpperCase().substring(0, 6);
    setScannerOpen(false);
    setCode(scannedToken);
    if (scannedToken.length === 6) {
      fetchWorkout(scannedToken);
    }
  };

  if (scannerOpen) {
    return (
      <View style={[styles.container, { backgroundColor: '#000', paddingTop: insets.top }]}>
        <RepsHeader 
          onLeftPress={() => setScannerOpen(false)} 
          title="SCAN QR CODE" 
        />
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={hasScanned ? undefined : handleBarCodeScanned}
          />
          {/* Scanner overlay */}
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame}>
              <View style={[styles.cornerTL, styles.corner, { borderColor: colors.accent }]} />
              <View style={[styles.cornerTR, styles.corner, { borderColor: colors.accent }]} />
              <View style={[styles.cornerBL, styles.corner, { borderColor: colors.accent }]} />
              <View style={[styles.cornerBR, styles.corner, { borderColor: colors.accent }]} />
            </View>
            <Text style={styles.scannerHint}>ALIGN QR CODE WITHIN FRAME</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <RepsHeader onLeftPress={() => navigation.goBack()} title="IMPORT WORKOUT" />

      <ScrollView 
        contentContainerStyle={styles.content}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.mainTitle, { color: colors.text }]}>IMPORT{"\n"}WORKOUT</Text>
        <Text style={[styles.description, { color: colors.secondaryText }]}>
          Enter a 6-character code or scan a QR code to import a shared workout.
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.secondaryBackground }]}
            value={code}
            onChangeText={(text) => setCode(text.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6))}
            placeholder="XXXXXX"
            placeholderTextColor={colors.border}
            autoCapitalize="characters"
            maxLength={6}
            autoCorrect={false}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 40 }}>
          <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.border, flex: 1 }]} onPress={handlePaste}>
            <MaterialCommunityIcons name="content-paste" size={18} color={colors.text} style={{ marginRight: 8 }} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>PASTE</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.border, flex: 1 }]} onPress={handleOpenScanner}>
            <MaterialCommunityIcons name="qrcode-scan" size={18} color={colors.text} style={{ marginRight: 8 }} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>SCAN QR</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.primaryBtn, { backgroundColor: code.length === 6 ? colors.accent : colors.secondaryBackground }]} 
          disabled={code.length !== 6 || loading}
          onPress={() => fetchWorkout(code)}
        >
          {loading ? (
             <ActivityIndicator size="small" color="#000" />
          ) : (
             <View style={{ flexDirection: 'row', alignItems: 'center' }}>
               <Text style={[styles.primaryBtnText, { color: code.length === 6 ? '#000' : colors.secondaryText }]}>IMPORT WORKOUT</Text>
               <AntDesign name="right" size={16} color={code.length === 6 ? '#000' : colors.secondaryText} style={{ marginLeft: 10 }} />
             </View>
          )}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const FRAME_SIZE = 220;

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 40 },
  mainTitle: { fontSize: 48, fontWeight: '900', letterSpacing: -1, lineHeight: 44, marginBottom: 20 },
  description: { fontSize: 14, fontWeight: '500', lineHeight: 22, marginBottom: 40 },
  inputContainer: { marginBottom: 20 },
  input: {
    height: 80,
    borderWidth: 1,
    borderRadius: 4,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 8,
    textAlign: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderWidth: 1,
    borderRadius: 4,
    marginBottom: 0,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  primaryBtn: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  // Scanner styles
  scannerContainer: {
    flex: 1,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    height: 30,
  },
  cornerTL: {
    top: 0, left: 0,
    borderTopWidth: 3, borderLeftWidth: 3,
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth: 3, borderRightWidth: 3,
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: 3, borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: 3, borderRightWidth: 3,
  },
  scannerHint: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 30,
    opacity: 0.7,
  },
});

export default JoinWorkoutScreen;
