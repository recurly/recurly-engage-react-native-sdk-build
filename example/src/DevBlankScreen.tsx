import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { usePrompt } from '@recurly/engage-react-native';
import type { DevBlankScreenRouteProp } from './types';

// An otherwise-empty screen used to preview whatever prompt targets an
// arbitrary screen name, without needing a real screen by that name to exist.
export default function DevBlankScreen() {
  const { params } = useRoute<DevBlankScreenRouteProp>();
  const { screenName } = params;
  const {
    state: { promptMgr },
  } = usePrompt();

  React.useEffect(() => {
    promptMgr?.screenChanged(screenName);
  }, [promptMgr, screenName]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Blank screen: "{screenName}"</Text>
      <Text style={styles.hint}>
        promptMgr.screenChanged("{screenName}") was fired on mount. Any matching
        prompt will render over this screen.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  hint: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
  },
});
