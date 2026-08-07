import React from 'react';
import {
  PromptProvider,
  usePrompt,
  PromptOverlay,
} from '@recurly/engage-react-native';
import type {PromptResult} from '@recurly/engage-core';
import {createStackNavigator} from '@amazon-devices/react-navigation__stack';
import {NavigationContainer} from '@amazon-devices/react-navigation__native';
import HomeScreen from './home';
import MovieDetailScreen from './detail';

const Stack = createStackNavigator();

const AppRoot = () => {
  const [isReady, setReady] = React.useState(false);
  const {
    state: {promptMgr},
  } = usePrompt();

  React.useEffect(() => {
    if (!promptMgr) return;
    const intervalId = setInterval(() => {
      if (promptMgr.isInitialized()) {
        setReady(true);
        clearInterval(intervalId);
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [promptMgr]);

  return (
    <NavigationContainer>
      {isReady && (
        <Stack.Navigator>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{headerShown: false}}
          />
          <Stack.Screen
            name="MovieDetail"
            component={MovieDetailScreen}
            options={{headerShown: false}}
          />
        </Stack.Navigator>
      )}
      <PromptOverlay
        onEvent={(result: PromptResult) => {
          console.log(JSON.stringify({...result, source: 'modal'}, null, 2));
        }}
      />
    </NavigationContainer>
  );
};

export const App = () => {
  return (
    <PromptProvider appId="6b233605-b981-4d6d-8b45-efa7fc402388" userId="123">
      <AppRoot />
    </PromptProvider>
  );
};
