import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Switch, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import RepsHeader from '../components/RepsHeader';
import { splitsService } from '../services/splitsService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppTile from '../components/AppTile';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SplitsScreen = ({ navigation }) => {
  const { colors, isDarkMode, accentColor } = useTheme();
  const insets = useSafeAreaInsets();
  const [splits, setSplits] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadSplits();
    }, [])
  );

  const loadSplits = async () => {
    const data = await splitsService.getAllSplits();
    setSplits(data);
  };

  const handleToggle = async (splitId, newValue) => {
    try {
      await splitsService.toggleSplitActive(splitId, newValue);
      loadSplits();
    } catch (e) {
      Alert.alert('Error', 'Failed to toggle split');
    }
  };

  const handleDelete = (splitId) => {
    Alert.alert('Delete Split', 'Are you sure you want to delete this split?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await splitsService.deleteSplit(splitId);
            loadSplits();
          } catch (e) {
            Alert.alert('Error', 'Failed to delete split');
          }
        }
      }
    ]);
  };

  const renderItem = ({ item }) => {
    // Unique days this split has assigned
    const activeDays = [...new Set(item.assignments.map(a => a.dayOfWeek))].sort();
    return (
      <AppTile style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={[styles.splitName, { color: colors.text }]}>{item.name}</Text>
          <Switch
            value={item.isActive}
            onValueChange={(val) => handleToggle(item.id, val)}
            trackColor={{ false: colors.border, true: accentColor }}
            thumbColor={isDarkMode ? '#000' : '#FFF'}
          />
        </View>
        <View style={styles.daysRow}>
          {['S','M','T','W','T','F','S'].map((char, idx) => {
            const isActive = activeDays.includes(idx);
            return (
              <View 
                key={idx} 
                style={[
                  styles.dayPill, 
                  { borderColor: colors.border },
                  isActive && { backgroundColor: accentColor, borderColor: accentColor }
                ]}
              >
                <Text style={[
                  styles.dayChar,
                  { color: isActive ? '#000' : colors.secondaryText }
                ]}>{char}</Text>
              </View>
            );
          })}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => navigation.navigate('EditSplitScreen', { split: item })} style={styles.actionBtn}>
            <MaterialCommunityIcons name="pencil" size={20} color={colors.text} />
            <Text style={[styles.actionText, { color: colors.text }]}>EDIT</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={[styles.actionBtn, { marginLeft: 15 }]}>
            <MaterialCommunityIcons name="delete" size={20} color="#FF3B30" />
            <Text style={[styles.actionText, { color: '#FF3B30' }]}>DELETE</Text>
          </TouchableOpacity>
        </View>
      </AppTile>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <RepsHeader
        title="SPLITS LIBRARY"
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        rightActions={[{ icon: 'plus', library: 'AntDesign', onPress: () => navigation.navigate('EditSplitScreen') }]}
      />
      {splits.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.secondaryText }]}>NO SPLITS CREATED</Text>
          <TouchableOpacity 
            style={[styles.createBtn, { backgroundColor: colors.accent }]}
            onPress={() => navigation.navigate('EditSplitScreen')}
          >
            <Text style={[styles.createBtnText, { color: '#000' }]}>CREATE SPLIT</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={splits}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 24, paddingBottom: 100 },
  card: {
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  splitName: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    flex: 1,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  dayPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayChar: {
    fontSize: 10,
    fontWeight: '900',
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 15,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 20,
    textAlign: 'center',
  },
  createBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
  },
  createBtnText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  }
});

export default SplitsScreen;
