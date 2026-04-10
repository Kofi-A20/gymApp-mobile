import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const deviceColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [units, setUnits] = useState('kg');
  const [notifications, setNotifications] = useState(true);
  const [loaded, setLoaded] = useState(false);

  // ── Load persisted values on mount ──────────────────────────────────────────
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [savedTheme, savedUnits, savedNotifications] = await Promise.all([
          AsyncStorage.getItem('theme'),
          AsyncStorage.getItem('units'),
          AsyncStorage.getItem('notifications'),
        ]);

        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === 'dark');
        } else {
          setIsDarkMode(deviceColorScheme === 'dark');
        }

        if (savedUnits !== null) {
          setUnits(savedUnits);
        }

        if (savedNotifications !== null) {
          setNotifications(savedNotifications === 'true');
        }
      } catch (e) {
        console.error('Failed to load theme settings:', e);
      } finally {
        setLoaded(true);
      }
    };

    loadSettings();
  }, []);

  // ── Persist isDarkMode ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem('theme', isDarkMode ? 'dark' : 'light').catch(e =>
      console.error('Failed to save theme:', e)
    );
  }, [isDarkMode, loaded]);

  // ── Persist units ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem('units', units).catch(e =>
      console.error('Failed to save units:', e)
    );
  }, [units, loaded]);

  // ── Persist notifications ────────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem('notifications', notifications ? 'true' : 'false').catch(e =>
      console.error('Failed to save notifications:', e)
    );
  }, [notifications, loaded]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);
  const toggleUnits = () => setUnits(prev => (prev === 'kg' ? 'lbs' : 'kg'));
  const toggleNotifications = () => setNotifications(prev => !prev);

  const colors = {
    background: isDarkMode ? '#000000' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#000000',
    secondaryBackground: isDarkMode ? '#1C1C1E' : '#F8F8F8',
    secondaryText: isDarkMode ? '#BCBCBC' : '#666666',
    border: isDarkMode ? '#333333' : '#E0E0E0',
    accent: isDarkMode ? '#CCFF00' : '#000000',
    danger: '#FF3B30',
  };

  const theme = {
    isDarkMode,
    toggleTheme,
    units,
    toggleUnits,
    notifications,
    toggleNotifications,
    colors,
    settingsLoaded: loaded,
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
