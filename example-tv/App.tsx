import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './src/home';
import MovieDetailScreen from './src/detail';
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

const Stack = createStackNavigator();

const AppRoot: React.FC = () => {
  const {
    dispatch,
    state: { promptMgr },
  } = usePrompt();
  const [isReady, setReady] = React.useState(false);
  useFonts({
    buttonFont: require('./assets/fonts/AllProDisplayC-Medium.ttf'),
    otherFont: require('./assets/fonts/AllProDisplayC-Regular.ttf'),
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
        <Stack.Navigator>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="MovieDetail"
            component={MovieDetailScreen}
            options={{ headerShown: false }}
          />
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
  return (
    <PromptProvider appId="6b233605-b981-4d6d-8b45-efa7fc402388" userId="123">
      <AppRoot />
    </PromptProvider>
  );
}
