import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import Svg, { Polygon } from 'react-native-svg';

export const COLOR_PALETTE = [
  '#FF3B30', '#FF375F', '#FF2D55', '#FF6B35',
  '#FF9500', '#FFD60A', '#FFCC00', '#34C759',
  '#00D4AA', '#00C7BE', '#30B0C7', '#32ADE6',
  '#007AFF', '#5856D6', '#BF5AF2', '#AF52DE',
  '#A2845E', // Grey removed, total 17 colors
];

const HexagonSwatch = ({ color, selected, onPress }) => {
  const R = 44; 
  const W = Math.sqrt(3) * R; 
  const H = 2 * R; 

  const R_out = 48;
  const W_out = Math.sqrt(3) * R_out;
  const H_out = 2 * R_out;

  const points = `${W/2},0 ${W},${R/2} ${W},${H - R/2} ${W/2},${H} 0,${H - R/2} 0,${R/2}`;
  const points_out = `${W_out/2},0 ${W_out},${R_out/2} ${W_out},${H_out - R_out/2} ${W_out/2},${H_out} 0,${H_out - R_out/2} 0,${R_out/2}`;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ width: W_out, height: H_out, alignItems: 'center', justifyContent: 'center' }}>
      {selected && (
        <Svg width={W_out} height={H_out} style={{ position: 'absolute' }}>
          <Polygon points={points_out} fill="transparent" stroke={color} strokeWidth={2} />
        </Svg>
      )}
      <Svg width={W} height={H}>
        <Polygon points={points} fill={color} />
      </Svg>
    </TouchableOpacity>
  );
};

export const ColorPickerModal = ({ visible, onClose, selectedColor, onSelectColor }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, { backgroundColor: colors.background, paddingBottom: insets.bottom + 40 }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>SELECT COLOR</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: colors.accent, fontWeight: '900', fontSize: 14 }}>DONE</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 10 }}
          >
            <View style={{ width: '100%', alignItems: 'center' }}>
              <View style={styles.row}>
                {COLOR_PALETTE.slice(0, 3).map(c => (
                  <HexagonSwatch key={c} color={c} selected={selectedColor === c} onPress={() => onSelectColor(c)} />
                ))}
              </View>
              <View style={styles.row}>
                {COLOR_PALETTE.slice(3, 7).map(c => (
                  <HexagonSwatch key={c} color={c} selected={selectedColor === c} onPress={() => onSelectColor(c)} />
                ))}
              </View>
              <View style={styles.row}>
                {COLOR_PALETTE.slice(7, 10).map(c => (
                  <HexagonSwatch key={c} color={c} selected={selectedColor === c} onPress={() => onSelectColor(c)} />
                ))}
              </View>
              <View style={styles.row}>
                {COLOR_PALETTE.slice(10, 14).map(c => (
                  <HexagonSwatch key={c} color={c} selected={selectedColor === c} onPress={() => onSelectColor(c)} />
                ))}
              </View>
              <View style={[styles.row, { marginBottom: 0 }]}>
                {COLOR_PALETTE.slice(14, 17).map(c => (
                  <HexagonSwatch key={c} color={c} selected={selectedColor === c} onPress={() => onSelectColor(c)} />
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: -22.2,
  },
});
