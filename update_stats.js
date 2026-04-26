const fs = require('fs');

const filePath = 'src/screens/Stats.jsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  "import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';",
  "import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';\nimport Body from 'react-native-body-highlighter';\nimport { RadarChart } from 'react-native-gifted-charts';"
);

content = content.replace(
  "const WeightsLog = ({ navigation }) => {",
  `const mapMuscleSlug = (muscleName) => {
  const name = muscleName.toLowerCase();
  if (name.includes('anterior deltoid') || name.includes('front delt')) return 'front-deltoids';
  if (name.includes('posterior deltoid') || name.includes('rear delt')) return 'rear-deltoids';
  if (name.includes('deltoid') || name.includes('shoulder')) return 'front-deltoids';
  if (name.includes('pectoralis') || name.includes('chest')) return 'chest';
  if (name.includes('biceps')) return 'biceps';
  if (name.includes('triceps')) return 'triceps';
  if (name.includes('latissimus') || name.includes('lat')) return 'upper-back';
  if (name.includes('trapezius') || name.includes('trap')) return 'trapezius';
  if (name.includes('rectus abdominis') || name.includes('abs') || name.includes('core')) return 'abs';
  if (name.includes('oblique')) return 'obliques';
  if (name.includes('quadriceps') || name.includes('quad')) return 'quadriceps';
  if (name.includes('hamstring')) return 'hamstring';
  if (name.includes('gluteus') || name.includes('glute')) return 'gluteal';
  if (name.includes('gastrocnemius') || name.includes('calf') || name.includes('calves')) return 'calves';
  if (name.includes('erector') || name.includes('lower back')) return 'lower-back';
  if (name.includes('forearm')) return 'forearm';
  return null;
};

const Stats = ({ navigation }) => {`
);

content = content.replace(
  "const [viewMode, setViewMode] = useState('ARCHIVE'); // ARCHIVE | PROGRESSION",
  "const [viewMode, setViewMode] = useState('OVERVIEW'); // OVERVIEW | ARCHIVE | PROGRESSION\n  const [overviewStats, setOverviewStats] = useState(null);\n  const [activeHours, setActiveHours] = useState(0);"
);

content = content.replace(
  "if (viewMode === 'ARCHIVE') {\n        fetchSessions();",
  "if (viewMode === 'OVERVIEW') {\n        fetchOverview();\n      } else if (viewMode === 'ARCHIVE') {\n        fetchSessions();"
);

const fetchOverviewFunc = `  const fetchOverview = async () => {
    setLoading(true);
    try {
      const stats = await sessionsService.getOverviewStats();
      setOverviewStats(stats);
      
      const trainingStats = await sessionsService.getTrainingStats();
      setActiveHours(trainingStats.activeHours);
    } catch (error) {
      console.error('Failed to fetch overview stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {`;

content = content.replace(
  "const fetchSessions = async () => {",
  fetchOverviewFunc
);

const renderOverviewFunc = `  const renderOverview = () => {
    if (!overviewStats) return null;

    const gender = profile?.gender === 'female' ? 'female' : 'male';
    
    const radarData = [
      { value: overviewStats.muscleBreakdown.Arms || 0, label: 'Arms' },
      { value: overviewStats.muscleBreakdown.Back || 0, label: 'Back' },
      { value: overviewStats.muscleBreakdown.Chest || 0, label: 'Chest' },
      { value: overviewStats.muscleBreakdown.Core || 0, label: 'Core' },
      { value: overviewStats.muscleBreakdown.Legs || 0, label: 'Legs' },
      { value: overviewStats.muscleBreakdown.Shoulders || 0, label: 'Shoulders' }
    ];

    const values = Object.values(overviewStats.muscleBreakdown).filter(v => v > 0);
    const maxSets = values.length > 0 ? Math.max(...values) : 0;
    const threshold = maxSets / 2;

    const bodyData = [];
    const mapGroupToSpecifics = {
      Arms: ['biceps', 'triceps', 'forearm'],
      Back: ['lat', 'trap', 'lower back'],
      Chest: ['chest'],
      Core: ['core', 'oblique'],
      Legs: ['quad', 'hamstring', 'glute', 'calves'],
      Shoulders: ['front delt', 'rear delt']
    };

    Object.entries(overviewStats.muscleBreakdown).forEach(([group, count]) => {
      if (count > 0 && mapGroupToSpecifics[group]) {
        const intensity = count > threshold ? 2 : 1;
        mapGroupToSpecifics[group].forEach(specific => {
          const slug = mapMuscleSlug(specific);
          if (slug) {
            bodyData.push({ slug, intensity });
          }
        });
      }
    });

    return (
      <View style={{ marginTop: 20 }}>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          <View style={[styles.statTile, { backgroundColor: colors.secondaryBackground, borderColor: colors.border }]}>
            <Text style={[styles.statTileLabel, { color: colors.secondaryText }]}>WORKOUTS</Text>
            <Text style={[styles.statTileValue, { color: colors.text }]}>{overviewStats.totalWorkouts}</Text>
          </View>
          <View style={[styles.statTile, { backgroundColor: colors.secondaryBackground, borderColor: colors.border }]}>
            <Text style={[styles.statTileLabel, { color: colors.secondaryText }]}>TOTAL SETS</Text>
            <Text style={[styles.statTileValue, { color: colors.text }]}>{overviewStats.totalSets}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 30 }}>
          <View style={[styles.statTile, { backgroundColor: colors.secondaryBackground, borderColor: colors.border }]}>
            <Text style={[styles.statTileLabel, { color: colors.secondaryText }]}>TOTAL VOLUME</Text>
            <Text style={[styles.statTileValue, { color: colors.text }]}>{Math.round(overviewStats.totalVolume)} {units}</Text>
          </View>
          <View style={[styles.statTile, { backgroundColor: colors.secondaryBackground, borderColor: colors.border }]}>
            <Text style={[styles.statTileLabel, { color: colors.secondaryText }]}>ACTIVE HOURS</Text>
            <Text style={[styles.statTileValue, { color: colors.text }]}>{activeHours.toFixed(1)}h</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>TRAINING BALANCE</Text>
        <View style={[styles.chartContainer, { backgroundColor: colors.secondaryBackground, borderColor: colors.border }]}>
          <RadarChart
            data={radarData}
            size={250}
            color={colors.accent}
            dataFillColor={colors.accent}
            dataFillOpacity={0.5}
            labelColor={colors.text}
            gridColor={colors.border}
            stroke={colors.accent}
            strokeWidth={2}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>MUSCLE HEATMAP</Text>
        <View style={[styles.heatmapContainer, { backgroundColor: colors.secondaryBackground, borderColor: colors.border }]}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Body data={bodyData} side="front" gender={gender} scale={0.7} colors={['#FF9500', '#FF3B30']} border="#1C2733" />
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Body data={bodyData} side="back" gender={gender} scale={0.7} colors={['#FF9500', '#FF3B30']} border="#1C2733" />
          </View>
        </View>
      </View>
    );
  };

  return (`;

content = content.replace("  return (", renderOverviewFunc);

content = content.replace(
  "<View style={styles.viewToggle}>\n            <TouchableOpacity",
  `<View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'OVERVIEW' && { borderBottomColor: colors.accent }]}
              onPress={() => setViewMode('OVERVIEW')}
            >
              <Text style={[styles.toggleBtnText, { color: viewMode === 'OVERVIEW' ? colors.text : colors.secondaryText }]}>OVERVIEW</Text>
            </TouchableOpacity>
            <TouchableOpacity`
);

content = content.replace(
  "{viewMode === 'ARCHIVE' ? 'CHRONOLOGICAL ARCHIVE' : 'PERSONAL RECORDS'}",
  "{viewMode === 'OVERVIEW' ? 'TRAINING SUMMARY' : viewMode === 'ARCHIVE' ? 'CHRONOLOGICAL ARCHIVE' : 'PERSONAL RECORDS'}"
);

content = content.replace(
  "{viewMode === 'ARCHIVE' ? 'SESSION\\nHISTORY.' : 'WEIGHT\\nPROGRESS.'}",
  "{viewMode === 'OVERVIEW' ? 'OVERVIEW\\nSTATS.' : viewMode === 'ARCHIVE' ? 'SESSION\\nHISTORY.' : 'WEIGHT\\nPROGRESS.'}"
);

content = content.replace(
  "{loading && (viewMode === 'PROGRESSION' || (viewMode === 'ARCHIVE' && !hasFetched)) ?",
  "{loading && (viewMode === 'OVERVIEW' || viewMode === 'PROGRESSION' || (viewMode === 'ARCHIVE' && !hasFetched)) ?"
);

content = content.replace(
  "<ActivityIndicator color={colors.text} style={{ marginTop: 50 }} />\n          ) : viewMode === 'ARCHIVE' ? (",
  "<ActivityIndicator color={colors.text} style={{ marginTop: 50 }} />\n          ) : viewMode === 'OVERVIEW' ? (\n            renderOverview()\n          ) : viewMode === 'ARCHIVE' ? ("
);

content = content.replace(
  "export default WeightsLog;",
  "export default Stats;"
);

const newStyles = `  sessionDate: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statTile: {
    flex: 1,
    padding: 20,
    borderWidth: 1,
    borderRadius: 4,
  },
  statTileLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  statTileValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 15,
  },
  chartContainer: {
    padding: 20,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 30,
  },
  heatmapContainer: {
    flexDirection: 'row',
    padding: 20,
    borderWidth: 1,
    borderRadius: 4,
    justifyContent: 'space-between',
    height: 300,
  },
});`;

content = content.replace(
  "  sessionDate: {\n    fontSize: 10,\n    fontWeight: '800',\n    letterSpacing: 1,\n  },\n});",
  newStyles
);

fs.writeFileSync(filePath, content);
