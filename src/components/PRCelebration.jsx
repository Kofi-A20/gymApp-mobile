import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const PRCelebration = ({ exerciseName, weight, unit, onFinish }) => {
  const { colors, accentColor } = useTheme();
  
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const confettiAnims = useRef([...Array(20)].map(() => ({
    x: new Animated.Value(width / 2),
    y: new Animated.Value(height / 2),
    opacity: new Animated.Value(1),
    scale: new Animated.Value(Math.random() * 0.8 + 0.2),
  }))).current;

  useEffect(() => {
    // Main entrance animation
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
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Confetti animation
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
    Animated.stagger(20, animations).start();
  }, []);

  return (
    <Animated.View style={[styles.overlay, { opacity: opacityAnim, backgroundColor: 'rgba(0,0,0,0.85)' }]}>
      {confettiAnims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.confetti,
            {
              backgroundColor: i % 2 === 0 ? accentColor : colors.text,
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
          transform: [{ scale: scaleAnim }, { translateY: slideAnim }] 
        }
      ]}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => {
            Animated.timing(opacityAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }).start(() => onFinish());
          }}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <MaterialCommunityIcons name="close" size={24} color={colors.secondaryText} />
        </TouchableOpacity>

        <MaterialCommunityIcons name="trophy" size={80} color={accentColor} />
        <Text style={[styles.title, { color: accentColor }]}>NEW PERSONAL RECORD!</Text>
        <Text style={[styles.exercise, { color: colors.text }]}>{exerciseName?.toUpperCase()}</Text>
        <View style={styles.weightRow}>
          <Text style={[styles.weight, { color: colors.text }]}>{weight}</Text>
          <Text style={[styles.unit, { color: colors.secondaryText }]}>{unit?.toUpperCase()}</Text>
        </View>
        <Text style={[styles.subtext, { color: colors.secondaryText }]}>KEEP CRUSHING IT.</Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: width * 0.85,
    padding: 40,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 24,
    right: 24,
    zIndex: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 20,
    textAlign: 'center',
  },
  exercise: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 10,
    textAlign: 'center',
    letterSpacing: -1,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 20,
    gap: 6,
  },
  weight: {
    fontSize: 64,
    fontWeight: '900',
  },
  unit: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtext: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 3,
    marginTop: 30,
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default PRCelebration;
