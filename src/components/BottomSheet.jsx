import React, { useRef, useEffect, useState } from 'react';
import { View, Modal, Animated, PanResponder, Dimensions, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const BottomSheet = ({ visible, onClose, children, snapHeight = '75%' }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const panY = useRef(new Animated.Value(0)).current;
  const [isExpanded, setIsExpanded] = useState(false);
  
  const parseHeight = (h) => {
    if (typeof h === 'number') return h;
    if (typeof h === 'string' && h.endsWith('%')) {
      return (parseFloat(h) / 100) * SCREEN_HEIGHT;
    }
    return SCREEN_HEIGHT * 0.75;
  };

  const defaultHeightPx = parseHeight(snapHeight);
  const expandedHeightPx = SCREEN_HEIGHT * 0.95;
  const maxTravel = expandedHeightPx - defaultHeightPx;

  useEffect(() => {
    if (visible) {
      setIsExpanded(false);
      panY.setValue(0);
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10,
      onPanResponderMove: (_, gestureState) => {
        let newY = gestureState.dy;
        if (isExpanded) {
          newY = -maxTravel + gestureState.dy;
        }
        // Add some resistance if dragging past expanded
        if (newY < -maxTravel) {
          newY = -maxTravel + (newY + maxTravel) * 0.2;
        }
        panY.setValue(newY);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isExpanded) {
          if (gestureState.dy > 50 || gestureState.vy > 0.5) {
            // Snap back to default
            Animated.spring(panY, { toValue: 0, useNativeDriver: true }).start(() => {
              setIsExpanded(false);
            });
          } else {
            // Stay expanded
            Animated.spring(panY, { toValue: -maxTravel, useNativeDriver: true }).start();
          }
        } else {
          if (gestureState.dy > 80 || gestureState.vy > 0.5) {
            // Dismiss
            Animated.timing(panY, { toValue: defaultHeightPx + 50, duration: 300, useNativeDriver: true }).start(() => {
              onClose();
            });
          } else if (gestureState.dy < -50 || gestureState.vy < -0.5) {
            // Snap to expanded
            Animated.spring(panY, { toValue: -maxTravel, useNativeDriver: true }).start(() => {
              setIsExpanded(true);
            });
          } else {
            // Stay default
            Animated.spring(panY, { toValue: 0, useNativeDriver: true }).start();
          }
        }
      },
    })
  ).current;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { justifyContent: 'flex-end', padding: 0 }]}>
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
            height: expandedHeightPx,
            marginBottom: -maxTravel,
            paddingBottom: maxTravel + (insets.bottom > 0 ? insets.bottom + 20 : 30),
          },
          { transform: [{ translateY: panY }] }
        ]}>
          <View {...panResponder.panHandlers} style={{ width: '100%', alignItems: 'center', paddingVertical: 12 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
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
