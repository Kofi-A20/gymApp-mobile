import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const BadgeCelebration = ({ badge, visible, onDismiss }) => {
  const { colors, accentColor } = useTheme();
  
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const confettiAnims = useRef([...Array(25)].map(() => ({
    x: new Animated.Value(width / 2),
    y: new Animated.Value(height / 2),
    opacity: new Animated.Value(1),
    scale: new Animated.Value(Math.random() * 0.8 + 0.2),
    color: Math.random() > 0.5 ? accentColor : colors.text,
  }))).current;

  useEffect(() => {
    if (visible) {
      // Entrance
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Confetti
      const animations = confettiAnims.map((anim) => {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 200 + 100;
        return Animated.parallel([
          Animated.timing(anim.x, {
            toValue: width / 2 + Math.cos(angle) * distance,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(anim.y, {
            toValue: height / 2 + Math.sin(angle) * distance - 100,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]);
      });
      Animated.stagger(15, animations).start();
    } else {
      // Reset animations when hidden
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      confettiAnims.forEach(anim => {
        anim.x.setValue(width / 2);
        anim.y.setValue(height / 2);
        anim.opacity.setValue(1);
      });
    }
  }, [visible]);

  if (!badge) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.blurBg} />
        
        {confettiAnims.map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              styles.confetti,
              {
                backgroundColor: anim.color,
                transform: [
                  { translateX: anim.x },
                  { translateY: anim.y },
                  { scale: anim.scale },
                ],
                opacity: anim.opacity,
              },
            ]}
          />
        ))}
        
        <Animated.View style={[
          styles.card, 
          { 
            backgroundColor: colors.background,
            borderColor: accentColor,
            transform: [{ scale: scaleAnim }] 
          }
        ]}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onDismiss}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <MaterialCommunityIcons name="close" size={24} color={colors.secondaryText} />
          </TouchableOpacity>

          <View style={[styles.iconCircle, { backgroundColor: accentColor + '15' }]}>
            <MaterialCommunityIcons name={badge.icon || 'trophy'} size={80} color={accentColor} />
          </View>
          
          <Text style={[styles.subtitle, { color: colors.secondaryText }]}>BADGE EARNED!</Text>
          <Text style={[styles.badgeName, { color: accentColor }]}>{badge.name.toUpperCase()}</Text>
          
          <Text style={[styles.description, { color: colors.secondaryText, marginBottom: 0 }]}>
            {badge.description}
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  card: {
    width: width * 0.85,
    padding: 30,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 15,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 24,
    right: 24,
    zIndex: 10,
  },
  confetti: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default BadgeCelebration;
