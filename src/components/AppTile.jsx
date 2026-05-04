import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';

/**
 * AppTile — A universal tile component used throughout the app.
 * Features soft rounded corners and unified styling.
 */
const AppTile = ({ style, children, onPress, onLongPress, activeOpacity = 0.85, transparent = false, ...rest }) => {
  const { colors } = useTheme();

  const containerStyle = [
    styles.base,
    { backgroundColor: transparent ? 'transparent' : colors.secondaryBackground, borderColor: colors.border },
    style,
  ];



  if (onPress || onLongPress) {
    return (
      <TouchableOpacity
        activeOpacity={activeOpacity}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={300}
        style={containerStyle}
        {...rest}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={containerStyle}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 24, // softer, more rounded corners
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },

});

export default AppTile;
