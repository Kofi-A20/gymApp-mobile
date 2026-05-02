import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { LEVEL_THRESHOLDS } from '../services/gamificationService';

const { width, height } = Dimensions.get('window');

const LevelUpCelebration = ({ newLevel, onDismiss }) => {
  const { colors, accentColor } = useTheme();
  
  // Find level index
  const levelIdx = LEVEL_THRESHOLDS.findIndex(t => t.level.toLowerCase() === newLevel?.toLowerCase());
  const levelNum = levelIdx !== -1 ? levelIdx + 1 : '?';

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const confettiAnims = useRef([...Array(30)].map(() => ({
    x: new Animated.Value(width / 2),
    y: new Animated.Value(height / 2),
    opacity: new Animated.Value(1),
    scale: new Animated.Value(Math.random() * 0.8 + 0.2),
    color: Math.random() > 0.5 ? accentColor : '#FFF',
  }))).current;

  useEffect(() => {
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
      const distance = Math.random() * 250 + 150;
      return Animated.parallel([
        Animated.timing(anim.x, {
          toValue: width / 2 + Math.cos(angle) * distance,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(anim.y, {
          toValue: height / 2 + Math.sin(angle) * distance - 100,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(anim.opacity, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]);
    });
    Animated.stagger(10, animations).start();
  }, []);

  return (
    <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
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

        <View style={[styles.iconCircle, { backgroundColor: accentColor + '20' }]}>
          <MaterialCommunityIcons name="trending-up" size={60} color={accentColor} />
        </View>
        
        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>YOU REACHED LEVEL {levelNum}</Text>
        <Text style={[styles.levelName, { color: accentColor }]}>{newLevel.toUpperCase()}</Text>
        
        <Text style={[styles.description, { color: colors.secondaryText }]}>
          Your dedication is paying off. Keep pushing the limits.
        </Text>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: accentColor }]}
          onPress={onDismiss}
        >
          <Text style={styles.buttonText}>KEEP GRINDING</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
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
  closeButton: {
    position: 'absolute',
    top: 24,
    right: 24,
    zIndex: 10,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 8,
  },
  levelName: {
    fontSize: 42,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -1,
    marginBottom: 15,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  button: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontWeight: '900',
    letterSpacing: 2,
    fontSize: 14,
  },
  confetti: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default LevelUpCelebration;
