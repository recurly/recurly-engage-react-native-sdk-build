import { View, Text, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { RecurlyInline } from '@recurly/engage-react-native';
import type { DevInlinePreviewScreenRouteProp } from './types';

// Renders a horizontal/inline prompt for an arbitrary zone id. Inline prompts
// render directly in the view hierarchy (not via PromptOverlay), so they
// can't be fired the same way modal/interstitial/bottom-banner prompts are.
export default function DevInlinePreviewScreen() {
  const { params } = useRoute<DevInlinePreviewScreenRouteProp>();
  const { zoneId } = params;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Zone: {zoneId}</Text>
      <RecurlyInline
        key={zoneId}
        zoneId={zoneId}
        closeButtonColor="#000000"
        closeButtonBgColor="#FFFFFF"
        closeButtonSize="12"
        timerFontSize="12"
        timerFontColor="#FFFFFF"
        focusStyle={{ borderWidth: 2, borderColor: '#ff0000', borderRadius: 5 }}
        onEvent={(result) =>
          console.log(
            JSON.stringify({ ...result, source: 'dev-inline-preview' }, null, 2)
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
  },
});
