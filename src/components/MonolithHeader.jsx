import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, AntDesign, MaterialCommunityIcons, Entypo, Feather, FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const getIconLibrary = (libraryName) => {
  switch (libraryName) {
    case 'AntDesign': return AntDesign;
    case 'MaterialCommunityIcons': return MaterialCommunityIcons;
    case 'Entypo': return Entypo;
    case 'Feather': return Feather;
    case 'FontAwesome': return FontAwesome;
    case 'Ionicons':
    default:
      return Ionicons;
  }
};

const RepsHeader = ({
  title = 'REPS',
  selectionMode = false,
  selectedCount = 0,
  onCancelSelection,
  onDeleteSelected,
  onSelectAll,
  leftIcon = null,
  onLeftPress,
  rightActions = [],
  centerContent = null
}) => {
  const { colors } = useTheme();

  if (selectionMode) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={onCancelSelection} style={styles.leftBtn}>
          <Text style={{ color: colors.text, fontWeight: '900', fontSize: 12, letterSpacing: 1.5 }}>CANCEL</Text>
        </TouchableOpacity>
        
        <View style={styles.centerContainer}>
          <Text style={[styles.title, { color: colors.text, fontSize: 14 }]}>{selectedCount} SELECTED</Text>
        </View>

        <View style={styles.rightActionsRow}>
          {onSelectAll && (
            <TouchableOpacity onPress={onSelectAll} style={{ marginRight: 10 }}>
              <Text style={{ color: '#CCFF00', fontWeight: '900', fontSize: 11, letterSpacing: 1 }}>SELECT ALL</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            onPress={onDeleteSelected} 
            disabled={selectedCount === 0}
          >
            <MaterialCommunityIcons 
              name="delete" 
              size={24} 
              color={selectedCount > 0 ? "#FF3B30" : colors.secondaryText} 
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.leftBtn}>
        {(leftIcon || onLeftPress) && (
          <TouchableOpacity onPress={onLeftPress} disabled={!onLeftPress}>
            <Ionicons name={leftIcon || 'arrow-back'} size={24} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.centerContainer}>
        {centerContent ? centerContent : (
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        )}
      </View>

      <View style={styles.rightActionsRow}>
        {rightActions.map((action, index) => {
          if (action.text) {
            return (
              <TouchableOpacity key={index} onPress={action.onPress}>
                <Text style={[styles.rightActionText, { color: action.color || colors.text }]}>
                  {action.text.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          }
          const IconComp = getIconLibrary(action.library);
          return (
            <TouchableOpacity 
              key={index} 
              onPress={action.onPress}
            >
              <IconComp 
                name={action.icon} 
                size={22} 
                color={action.color || colors.text} 
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    height: 60,
  },
  leftBtn: {
    minWidth: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
  rightBtn: {
    minWidth: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rightActionsRow: {
    minWidth: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 16,
  },
  rightActionText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  }
});

export default RepsHeader;
