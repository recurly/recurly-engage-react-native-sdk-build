import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './home';
import MovieDetailScreen from './detail';
import DevToolsScreen from './DevToolsScreen';
import DevInlinePreviewScreen from './DevInlinePreviewScreen';
import DevBlankScreen from './DevBlankScreen';
import { NavigationContainer } from '@react-navigation/native';
import {
  PromptAction_Font_Button,
  PromptAction_Font_Timer,
  PromptAction_Font_LegalText,
  PromptProvider,
  usePrompt,
  PromptOverlay,
} from '@recurly/engage-react-native';
import React from 'react';
import type { PromptResult } from '@recurly/engage-core';
import { useFonts } from 'expo-font';
import {
  loadDevSettings,
  baseUrlForEnvironment,
  effectiveAppId,
  effectiveUserId,
  type DevSettingsValue,
} from './DevSettings';

const Stack = createStackNavigator();

// Lets DevToolsScreen persist new overrides and remount the SDK without
// requiring a real app restart (unlike the native SDKs' "quit and relaunch").
export const DevRestartContext = React.createContext<() => Promise<void>>(
  async () => {}
);

const AppRoot: React.FC = () => {
  const {
    dispatch,
    state: { promptMgr },
  } = usePrompt();
  const [isReady, setReady] = React.useState(false);
  useFonts({
    buttonFont: require('../assets/fonts/AllProDisplayC-Bold.ttf'),
    otherFont: require('../assets/fonts/AllProDisplayC-Regular.ttf'),
  });

  React.useEffect(() => {
    if (!promptMgr) return;
    const intervalId = setInterval(() => {
      if (promptMgr.isInitialized()) {
        dispatch({
          type: PromptAction_Font_Button,
          data: 'buttonFont',
        });
        dispatch({
          type: PromptAction_Font_Timer,
          data: 'otherFont',
        });
        dispatch({
          type: PromptAction_Font_LegalText,
          data: 'otherFont',
        });
        setReady(true);
        clearInterval(intervalId);
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [promptMgr]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <NavigationContainer>
      {isReady && (
        <Stack.Navigator screenOptions={{ headerShown: true }}>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="MovieDetail" component={MovieDetailScreen} />
          <Stack.Screen name="DevTools" component={DevToolsScreen} />
          <Stack.Screen
            name="DevInlinePreview"
            component={DevInlinePreviewScreen}
          />
          <Stack.Screen name="DevBlankScreen" component={DevBlankScreen} />
        </Stack.Navigator>
      )}
      <PromptOverlay
        onEvent={(result: PromptResult) => {
          console.log(JSON.stringify({ ...result, source: 'modal' }, null, 2));
        }}
      />
    </NavigationContainer>
  );
};

export default function App() {
  const [settings, setSettings] = React.useState<DevSettingsValue | null>(null);
  const [instanceKey, setInstanceKey] = React.useState(0);

  React.useEffect(() => {
    loadDevSettings().then(setSettings);
  }, []);

  const restartSdk = React.useCallback(async () => {
    const fresh = await loadDevSettings();
    setSettings(fresh);
    setInstanceKey((key) => key + 1);
  }, []);

  if (!settings) return null;

  return (
    <DevRestartContext.Provider value={restartSdk}>
      <PromptProvider
        key={instanceKey}
        appId={effectiveAppId(settings)}
        userId={effectiveUserId(settings)}
        baseUrl={baseUrlForEnvironment(settings.environment)}
      >
        <AppRoot />
      </PromptProvider>
    </DevRestartContext.Provider>
  );
}
