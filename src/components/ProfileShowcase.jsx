import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import AppTile from './AppTile';
import { LEVEL_THRESHOLDS } from '../services/gamificationService';

const ProfileShowcase = ({ profile, flexStat, isOwnProfile, onFlexStatPress }) => {
  const { colors, accentColor } = useTheme();
  
  if (!profile) return null;

  return (
    <View style={styles.container}>
      {/* Profile Hero */}
      <View style={styles.hero}>
        <View style={[styles.avatar, { backgroundColor: profile.avatar_color || accentColor }]} />
        <Text style={[styles.name, { color: colors.text }]}>
          {(profile.first_name || '').toUpperCase()} {(profile.last_name || '').toUpperCase()}
        </Text>
        <Text style={[styles.title, { color: accentColor }]}>
          {(profile.selected_title || 'NEW MEMBER').toUpperCase()}
        </Text>
        
        <View style={[styles.levelBadge, { backgroundColor: accentColor }]}>
          <Text style={[styles.levelText, { color: colors.background }]}>
            {(profile.level || 'NOVICE').toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <AppTile style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.secondaryText }]}>TOTAL XP</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {(profile.total_xp || 0).toLocaleString()}
            </Text>
          </AppTile>
          <AppTile style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.secondaryText }]}>CONSISTENCY</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {profile.consistencyScore || 0}%
            </Text> 
          </AppTile>
        </View>

        {(flexStat || isOwnProfile) && (
          <TouchableOpacity 
            activeOpacity={isOwnProfile ? 0.7 : 1}
            onPress={isOwnProfile ? onFlexStatPress : undefined}
          >
            <AppTile style={styles.flexBox}>
              {flexStat ? (
                <>
                  <Text style={[styles.statLabel, { color: colors.secondaryText }]}>{flexStat.label}</Text>
                  <Text style={[styles.flexValue, { color: accentColor }]}>{flexStat.value}</Text>
                </>
              ) : isOwnProfile ? (
                <Text style={[styles.flexPrompt, { color: colors.secondaryText }]}>CHOOSE YOUR FLEX STAT →</Text>
              ) : null}
            </AppTile>
          </TouchableOpacity>
        )}
      </View>

      {/* Progress Bar (Optional, used in main profile) */}
      {profile.progressPercentage !== undefined && (
        <View style={styles.xpBarContainer}>
           <View style={[styles.xpBar, { backgroundColor: colors.border }]}>
             <View style={[styles.xpFill, { width: `${profile.progressPercentage}%`, backgroundColor: accentColor }]} />
           </View>
           
           {/* XP Label moved inside for better grouping */}
           {profile.total_xp !== undefined && (
             <View style={{ marginTop: 8, alignItems: 'flex-end' }}>
               {(() => {
                 const currentXp = profile.total_xp || 0;
                 let currentLevelMin = 0;
                 for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
                   if (currentXp >= LEVEL_THRESHOLDS[i].minXp) {
                     currentLevelMin = LEVEL_THRESHOLDS[i].minXp;
                   }
                 }
                 const currentLevelIdx = LEVEL_THRESHOLDS.findIndex(t => t.minXp === currentLevelMin);
                 const nextLevel = currentLevelIdx + 1 < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[currentLevelIdx + 1] : null;
                 const xpRemaining = nextLevel ? nextLevel.minXp - currentXp : 0;
                 const nextLevelName = nextLevel ? nextLevel.level.toUpperCase() : 'MAX LEVEL';

                 return nextLevel ? (
                   <Text style={{ color: colors.secondaryText, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, opacity: 0.8 }}>
                     {xpRemaining.toLocaleString()} XP TO {nextLevelName}
                   </Text>
                 ) : (
                   <Text style={{ color: colors.secondaryText, fontSize: 10, fontWeight: '800', letterSpacing: 1, opacity: 0.8 }}>
                     MAX LEVEL REACHED
                   </Text>
                 );
               })()}
             </View>
           )}
        </View>
      )}

      {/* Top PRs */}
      {profile.topPrs && profile.topPrs.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.secondaryText, marginTop: 40 }]}>TOP PERFORMANCE</Text>
          {profile.topPrs.map(pr => (
            <AppTile key={pr.id} style={styles.prItem}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.prName, { color: colors.text }]}>{pr.name.toUpperCase()}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.prWeight, { color: accentColor }]}>{pr.bestWeight} KG</Text>
                <MaterialCommunityIcons name="trophy" size={12} color={accentColor} />
              </View>
            </AppTile>
          ))}
        </>
      )}

      {/* Badges Showcase */}
      <Text style={[styles.sectionLabel, { color: colors.secondaryText, marginTop: 40 }]}>BADGE SHOWCASE</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgeScroll}>
        {profile.badges && profile.badges.map(b => (
          <View key={b.badge_definitions?.id || b.id} style={styles.badgeItem}>
            <View style={[styles.badgeIcon, { borderColor: colors.border }]}>
              <MaterialCommunityIcons 
                name={b.badge_definitions?.icon_name || 'medal'} 
                size={32} 
                color={accentColor} 
              />
            </View>
            <Text style={[styles.badgeName, { color: colors.text }]}>
              {(b.badge_definitions?.name || '').toUpperCase()}
            </Text>
          </View>
        ))}
        {(!profile.badges || profile.badges.length === 0) && (
          <Text style={{ color: colors.secondaryText, fontSize: 12 }}>NO BADGES EARNED YET.</Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { alignItems: 'center', marginBottom: 40 },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 20 },
  name: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  title: { fontSize: 12, fontWeight: '800', letterSpacing: 2, marginTop: 4 },
  levelBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4, marginTop: 15 },
  levelText: { fontSize: 10, fontWeight: '900' },
  statsGrid: { gap: 12 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statBox: { flex: 1, padding: 20, alignItems: 'center' },
  flexBox: { width: '100%', padding: 20, alignItems: 'center' },
  flexValue: { fontSize: 20, fontWeight: '900', marginTop: 4, textAlign: 'center' },
  flexPrompt: { fontSize: 12, fontWeight: '900', letterSpacing: 1, opacity: 0.5 },
  statLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  statValue: { fontSize: 24, fontWeight: '900' },
  xpBarContainer: { marginTop: 20 },
  xpBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 3 },
  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
  prItem: { flexDirection: 'row', alignItems: 'center', padding: 15, marginBottom: 10 },
  prName: { fontSize: 14, fontWeight: '900' },
  prWeight: { fontSize: 16, fontWeight: '900' },
  badgeScroll: { flexDirection: 'row' },
  badgeItem: { alignItems: 'center', marginRight: 20, width: 80 },
  badgeIcon: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  badgeName: { fontSize: 8, fontWeight: '900', textAlign: 'center' },
});

export default ProfileShowcase;
