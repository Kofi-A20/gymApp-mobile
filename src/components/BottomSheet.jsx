import React, { useRef, useEffect, useState } from 'react';
import { View, Animated, PanResponder, Dimensions, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const BottomSheet = ({ visible, onClose, children, snapHeight = '75%' }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const panY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const parseHeight = (h) => {
    if (typeof h === 'number') return h;
    if (typeof h === 'string' && h.endsWith('%')) {
      return (parseFloat(h) / 100) * SCREEN_HEIGHT;
    }
    return SCREEN_HEIGHT * 0.75;
  };

  const defaultHeightPx = parseHeight(snapHeight);

  useEffect(() => {
    if (visible) {
      setIsAnimatingOut(false);
      // Start from below the screen
      panY.setValue(defaultHeightPx + 100);
      Animated.parallel([
        Animated.spring(panY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true })
      ]).start();
    }
  }, [visible]);

  const handleDismiss = () => {
    setIsAnimatingOut(true);
    Animated.parallel([
      Animated.timing(panY, { toValue: defaultHeightPx + 100, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true })
    ]).start(() => {
      setIsAnimatingOut(false);
      onClose();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10,
      onPanResponderMove: (_, gestureState) => {
        let newY = gestureState.dy;
        if (newY < 0) {
          // Add resistance for dragging up (since swipe up is removed)
          newY = newY * 0.2;
        }
        panY.setValue(newY);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 80 || gestureState.vy > 0.5) {
          handleDismiss();
        } else {
          // Snap back to default
          Animated.spring(panY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  if (!visible && !isAnimatingOut) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]} pointerEvents="box-none">
      <TouchableWithoutFeedback onPress={handleDismiss}>
        <Animated.View 
          style={[styles.modalOverlay, { opacity, padding: 0 }]} 
          pointerEvents={visible ? "auto" : "none"}
        />
      </TouchableWithoutFeedback>
      
      <View style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
        <Animated.View style={[
          styles.modalContent,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTopWidth: 1,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderBottomWidth: 0,
            height: defaultHeightPx,
            paddingBottom: (insets.bottom > 0 ? insets.bottom : 20) + 100, // Extra padding to clear the Tab Bar
          },
          { transform: [{ translateY: panY }] }
        ]}>
          <View {...panResponder.panHandlers} style={{ width: '100%', alignItems: 'center', paddingVertical: 12 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>
          {children}
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    width: '100%',
    borderWidth: 1,
    padding: 20
  }
});

export default BottomSheet;
