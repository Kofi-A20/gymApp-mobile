import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Clipboard,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { socialService } from '../services/socialService';
import { MaterialCommunityIcons, AntDesign, Ionicons } from '@expo/vector-icons';
import RepsHeader from '../components/RepsHeader';
import AppTile from '../components/AppTile';

const AddFriend = ({ navigation }) => {
  const { colors, accentColor } = useTheme();
  const insets = useSafeAreaInsets();

  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [shareCode, setShareCode] = useState('');

  const handleSendRequest = async () => {
    if (!username) return;
    try {
      setLoading(true);
      await socialService.sendFriendRequest(username);
      Alert.alert('SUCCESS', `FRIEND REQUEST SENT TO @${username.toUpperCase()}`);
      navigation.goBack();
    } catch (e) {
      Alert.alert('ERROR', e.message.toUpperCase());
    } finally {
      setLoading(false);
    }
  };

  const handleImportByCode = async () => {
    if (!shareCode) return;
    // For now, let's assume codes can also refer to usernames or we'll add a specific code logic later
    // The requirement was: "reuse existing share code UI pattern, add username search as second option"
    Alert.alert('COMING SOON', 'FRIEND CODES WILL BE AVAILABLE IN THE NEXT UPDATE.');
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <RepsHeader title="ADD FRIEND" leftIcon="close" onLeftPress={() => navigation.goBack()} />

      <View style={styles.container}>
        <Text style={[styles.subLabel, { color: colors.secondaryText }]}>SEARCH BY USERNAME</Text>
        <AppTile style={styles.inputWrapper}>
          <View style={styles.inputRow}>
            <Text style={[styles.atSign, { color: colors.secondaryText }]}>@</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="USERNAME"
              placeholderTextColor={colors.secondaryText}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleSendRequest}
            />
          </View>
        </AppTile>

        <TouchableOpacity 
          style={[styles.primaryBtn, { backgroundColor: username ? accentColor : colors.secondaryBackground }]}
          onPress={handleSendRequest}
          disabled={loading || !username}
        >
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>SEND REQUEST</Text>}
        </TouchableOpacity>

        <View style={styles.orRow}>
          <View style={[styles.line, { backgroundColor: colors.border }]} />
          <Text style={[styles.orText, { color: colors.secondaryText }]}>OR</Text>
          <View style={[styles.line, { backgroundColor: colors.border }]} />
        </View>

        <Text style={[styles.subLabel, { color: colors.secondaryText }]}>INVITE BY CODE</Text>
        <AppTile style={styles.inputWrapper}>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="6-CHARACTER CODE"
            placeholderTextColor={colors.secondaryText}
            value={shareCode}
            onChangeText={v => setShareCode(v.toUpperCase())}
            maxLength={6}
            autoCapitalize="characters"
          />
        </AppTile>

        <TouchableOpacity 
          style={[styles.secondaryBtn, { borderColor: colors.border }]}
          onPress={handleImportByCode}
        >
          <Text style={[styles.secondaryBtnText, { color: colors.text }]}>IMPORT CODE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 24, flex: 1 },
  subLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 12 },
  inputWrapper: { height: 60, justifyContent: 'center', paddingHorizontal: 15, marginBottom: 20 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  atSign: { fontSize: 18, fontWeight: '900', marginRight: 4 },
  input: { fontSize: 18, fontWeight: '700', flex: 1 },
  primaryBtn: { height: 60, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  btnText: { fontSize: 16, fontWeight: '900', letterSpacing: 1, color: '#000' },
  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 40, gap: 15 },
  line: { flex: 1, height: 1 },
  orText: { fontSize: 10, fontWeight: '900' },
  secondaryBtn: { height: 60, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  secondaryBtnText: { fontSize: 14, fontWeight: '800', letterSpacing: 1 },
});

export default AddFriend;
