import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const deviceColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(deviceColorScheme === 'dark');
  const [units, setUnits] = useState('kg');
  const [notifications, setNotifications] = useState(true);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const toggleUnits = () => setUnits(units === 'kg' ? 'lbs' : 'kg');
  const toggleNotifications = () => setNotifications(!notifications);

  const colors = {
    background: isDarkMode ? '#000000' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#000000',
    secondaryBackground: isDarkMode ? '#1C1C1E' : '#F8F8F8',
    secondaryText: isDarkMode ? '#BCBCBC' : '#666666',
    border: isDarkMode ? '#333333' : '#E0E0E0',
    accent: isDarkMode ? '#CCFF00' : '#000000', // Neon highlight for dark, bold black for light
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
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
