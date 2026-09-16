import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { usePrompt } from '@recurly/engage-react-native';
import { PathType } from '@recurly/engage-core';
import type { Prompt } from '@recurly/engage-core';
import type { DevToolsScreenNavigationProp } from './types';
import {
  loadDevSettings,
  saveDevSettings,
  clearDevSettings,
  effectiveAppId,
  effectiveUserId,
  DevEnvironment,
  DefaultAppId,
  DefaultUserId,
  type DevSettingsValue,
} from './DevSettings';
import { DevRestartContext } from './app';

const PROMPT_TYPES: { label: string; type: PathType; color: string }[] = [
  { label: 'MODAL', type: PathType.MODAL, color: '#2f6fed' },
  { label: 'INTERSTITIAL', type: PathType.INTERSTITIAL, color: '#8b3fed' },
  { label: 'BOTTOM_BANNER', type: PathType.BOTTOM_BANNER, color: '#ed8f2f' },
  { label: 'HORIZONTAL', type: PathType.HORIZONTAL, color: '#2fa61f' },
];

const badgeColorFor = (type: PathType): string =>
  PROMPT_TYPES.find((t) => t.type === type)?.color ?? '#777';

const labelFor = (type: PathType): string =>
  PROMPT_TYPES.find((t) => t.type === type)?.label ?? String(type);

export default function DevToolsScreen() {
  const navigation = useNavigation<DevToolsScreenNavigationProp>();
  const {
    state: { promptMgr },
  } = usePrompt();
  const restartSdk = React.useContext(DevRestartContext);

  // --- SDK config ---
  const [settings, setSettings] = React.useState<DevSettingsValue | null>(null);
  React.useEffect(() => {
    loadDevSettings().then(setSettings);
  }, []);

  const saveAndRestart = async () => {
    if (!settings) return;
    await saveDevSettings(settings);
    Alert.alert(
      'Restarting SDK',
      `App ID: ${effectiveAppId(settings)}\nUser ID: ${effectiveUserId(
        settings
      )}\nEnvironment: ${settings.environment}`,
      [{ text: 'OK', onPress: () => restartSdk() }]
    );
  };

  const clearOverrides = async () => {
    await clearDevSettings();
    const fresh = await loadDevSettings();
    setSettings(fresh);
    Alert.alert(
      'Overrides cleared',
      `Back to default App ID: ${DefaultAppId}`,
      [{ text: 'OK', onPress: () => restartSdk() }]
    );
  };

  // --- Prompt list ---
  const [prompts, setPrompts] = React.useState<Prompt[]>([]);
  const refreshPrompts = React.useCallback(() => {
    if (!promptMgr) return;
    const all = PROMPT_TYPES.flatMap(({ type }) => promptMgr.getPrompts(type));
    all.sort((a, b) => a.pathItem.name.localeCompare(b.pathItem.name));
    setPrompts(all);
  }, [promptMgr]);
  React.useEffect(() => refreshPrompts(), [refreshPrompts]);

  const openPrompt = (prompt: Prompt) => {
    const zoneId = prompt.actions?.rf_settings_zone_id;
    if (prompt.type === PathType.HORIZONTAL && zoneId) {
      navigation.navigate('DevInlinePreview', { zoneId });
      return;
    }
    promptMgr?.showPrompt(prompt);
  };

  const [manualPromptId, setManualPromptId] = React.useState('');
  const showPromptById = () => {
    if (!promptMgr || !manualPromptId.trim()) return;
    const found = promptMgr.getPrompt(manualPromptId.trim());
    if (!found) {
      Alert.alert('Prompt not found', `No prompt with id "${manualPromptId}"`);
      return;
    }
    promptMgr.showPrompt(found);
  };

  // --- Inline preview ---
  const [zoneId, setZoneId] = React.useState('');

  // --- Simulate trigger ---
  const [screenName, setScreenName] = React.useState('');
  const [buttonId, setButtonId] = React.useState('');

  // --- Blank screen ---
  const [blankScreenName, setBlankScreenName] = React.useState('');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>SDK Config</Text>
      <Text style={styles.subtle}>
        Active App ID:{' '}
        {promptMgr
          ? effectiveAppId(
              settings ?? {
                appIdOverride: '',
                userIdOverride: '',
                environment: DevEnvironment.Production,
              }
            )
          : '…'}
      </Text>
      <TextInput
        style={styles.input}
        placeholder={`App ID override (default: ${DefaultAppId})`}
        value={settings?.appIdOverride ?? ''}
        onChangeText={(text) =>
          setSettings((prev) =>
            prev ? { ...prev, appIdOverride: text } : prev
          )
        }
      />
      <TextInput
        style={styles.input}
        placeholder={`User ID override (default: ${DefaultUserId})`}
        value={settings?.userIdOverride ?? ''}
        onChangeText={(text) =>
          setSettings((prev) =>
            prev ? { ...prev, userIdOverride: text } : prev
          )
        }
      />
      <View style={styles.row}>
        {Object.values(DevEnvironment).map((env) => (
          <TouchableOpacity
            key={env}
            style={[
              styles.envButton,
              settings?.environment === env && styles.envButtonActive,
            ]}
            onPress={() =>
              setSettings((prev) =>
                prev ? { ...prev, environment: env } : prev
              )
            }
          >
            <Text
              style={[
                styles.envButtonText,
                settings?.environment === env && styles.envButtonTextActive,
              ]}
            >
              {env}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.row}>
        <TouchableOpacity style={styles.button} onPress={saveAndRestart}>
          <Text style={styles.buttonText}>Save and restart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={clearOverrides}
        >
          <Text style={styles.buttonText}>Clear overrides</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Show prompt</Text>
      <TouchableOpacity style={styles.button} onPress={refreshPrompts}>
        <Text style={styles.buttonText}>Refresh list</Text>
      </TouchableOpacity>
      {prompts.map((prompt) => (
        <TouchableOpacity
          key={prompt.id}
          style={styles.promptRow}
          onPress={() => openPrompt(prompt)}
        >
          <View
            style={[
              styles.badge,
              { backgroundColor: badgeColorFor(prompt.type) },
            ]}
          >
            <Text style={styles.badgeText}>{labelFor(prompt.type)}</Text>
          </View>
          <View style={styles.promptRowText}>
            <Text style={styles.promptName}>{prompt.pathItem.name}</Text>
            <Text style={styles.promptId}>{prompt.id}</Text>
          </View>
        </TouchableOpacity>
      ))}
      {prompts.length === 0 && (
        <Text style={styles.subtle}>No prompts loaded yet.</Text>
      )}
      <TextInput
        style={styles.input}
        placeholder="Show prompt by id"
        value={manualPromptId}
        onChangeText={setManualPromptId}
      />
      <TouchableOpacity style={styles.button} onPress={showPromptById}>
        <Text style={styles.buttonText}>Show</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Inline preview</Text>
      <TextInput
        style={styles.input}
        placeholder="Zone id"
        value={zoneId}
        onChangeText={setZoneId}
      />
      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          zoneId.trim() &&
          navigation.navigate('DevInlinePreview', { zoneId: zoneId.trim() })
        }
      >
        <Text style={styles.buttonText}>Preview</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Simulate trigger</Text>
      <TextInput
        style={styles.input}
        placeholder="Screen name"
        value={screenName}
        onChangeText={setScreenName}
      />
      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          screenName.trim() && promptMgr?.screenChanged(screenName.trim())
        }
      >
        <Text style={styles.buttonText}>Fire screenChanged</Text>
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        placeholder="Button/click id"
        value={buttonId}
        onChangeText={setButtonId}
      />
      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          buttonId.trim() && promptMgr?.buttonClicked(buttonId.trim())
        }
      >
        <Text style={styles.buttonText}>Fire buttonClicked</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Blank screen</Text>
      <TextInput
        style={styles.input}
        placeholder="Screen name"
        value={blankScreenName}
        onChangeText={setBlankScreenName}
      />
      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          blankScreenName.trim() &&
          navigation.navigate('DevBlankScreen', {
            screenName: blankScreenName.trim(),
          })
        }
      >
        <Text style={styles.buttonText}>Open</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 8,
  },
  subtle: {
    fontSize: 13,
    color: '#555',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  button: {
    backgroundColor: 'purple',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  buttonSecondary: {
    backgroundColor: '#888',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  envButton: {
    borderWidth: 1,
    borderColor: 'purple',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  envButtonActive: {
    backgroundColor: 'purple',
  },
  envButtonText: {
    color: 'purple',
    fontWeight: 'bold',
  },
  envButtonTextActive: {
    color: '#fff',
  },
  promptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  badge: {
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginRight: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  promptRowText: {
    flex: 1,
  },
  promptName: {
    fontSize: 15,
    fontWeight: '600',
  },
  promptId: {
    fontSize: 12,
    color: '#777',
  },
});
