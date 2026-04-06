import React, { createContext, useContext, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { useTheme } from './ThemeContext';

const AlertContext = createContext();

export const useMonolithAlert = () => useContext(AlertContext);

export const AlertProvider = ({ children }) => {
  const { colors } = useTheme();
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: []
  });

  const showAlert = (title, message, buttons = [{ text: 'OK' }]) => {
    setAlertConfig({
      visible: true,
      title: title || '',
      message: message || '',
      buttons
    });
  };

  const hideAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };

  const handleButtonPress = (onPress) => {
    hideAlert();
    if (onPress) {
      setTimeout(() => onPress(), 10);
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal
        transparent
        visible={alertConfig.visible}
        animationType="fade"
        onRequestClose={hideAlert}
      >
        <Pressable style={styles.overlay} onPress={() => {}}>
          <View style={[styles.alertBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>{alertConfig.title.toUpperCase()}</Text>
            {!!alertConfig.message && (
              <Text style={[styles.message, { color: colors.secondaryText }]}>{alertConfig.message.toUpperCase()}</Text>
            )}
            <View style={styles.buttonContainer}>
              {alertConfig.buttons.map((btn, index) => {
                const isDestructive = btn.style === 'destructive';
                const isCancel = btn.style === 'cancel';
                let btnTextColor = colors.text;
                if (isDestructive) btnTextColor = '#FF3B30';
                else if (isCancel) btnTextColor = colors.secondaryText;
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.button, { borderTopColor: colors.border, borderLeftWidth: index > 0 ? 1 : 0, borderLeftColor: colors.border }]}
                    onPress={() => handleButtonPress(btn.onPress)}
                  >
                    <Text style={[styles.buttonText, { color: btnTextColor }]}>{btn.text.toUpperCase()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Modal>
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
