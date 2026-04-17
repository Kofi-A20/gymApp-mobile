import React, { createContext, useContext, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Pressable, Alert } from 'react-native';
import { useTheme } from './ThemeContext';

const AlertContext = createContext();

export const useRepsAlert = () => useContext(AlertContext);
// backwards-compatible alias — remove once all imports are updated
export const useMonolithAlert = useRepsAlert;

export const AlertProvider = ({ children }) => {
  const { colors } = useTheme();
  const showAlert = (title, message, buttons = [{ text: 'OK' }]) => {
    const nativeButtons = buttons.map(btn => ({
      text: btn.text,
      style: btn.style || 'default', // 'default', 'cancel', 'destructive'
      onPress: btn.onPress
    }));

    Alert.alert(
      title || '',
      message || '',
      nativeButtons,
      { cancelable: true }
    );
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
    </AlertContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertBox: {
    width: '100%',
    borderWidth: 1,
    paddingTop: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  message: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  }
});
