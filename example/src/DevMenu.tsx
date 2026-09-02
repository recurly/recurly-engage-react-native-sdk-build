import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { usePrompt } from '@recurly/engage-react-native';
import { PrivacyConsentCategory } from '@recurly/engage-core';

const ALL_CATEGORIES = Object.values(PrivacyConsentCategory);

export default function DevMenu({ screenName }: { screenName: string }) {
  const {
    state: { promptMgr, prompt },
  } = usePrompt();
  const [visible, setVisible] = React.useState(false);
  const [selected, setSelected] = React.useState<PrivacyConsentCategory[]>(
    promptMgr?.getPrivacyConsentCategories() ?? []
  );

  const toggle = (category: PrivacyConsentCategory) => {
    const next = selected.includes(category)
      ? selected.filter((c) => c !== category)
      : [...selected, category];
    setSelected(next);
  };

  const close = () => {
    setVisible(false);
    promptMgr?.setPrivacyConsentCategories(selected);
    promptMgr?.screenChanged(screenName);
  };

  return (
    <>
      <TouchableOpacity onPress={() => setVisible(true)}>
        <View style={styles.trigger}>
          <Text style={styles.triggerText}>Dev: Consent Categories</Text>
        </View>
      </TouchableOpacity>
      {visible && (
        <View style={styles.overlay}>
          <View style={styles.panel}>
            <Text style={styles.title}>Privacy Consent Categories</Text>
            {ALL_CATEGORIES.map((category) => {
              const isOn = selected.includes(category);
              return (
                <TouchableOpacity
                  key={category}
                  onPress={() => toggle(category)}
                  style={styles.row}
                >
                  <View style={[styles.checkbox, isOn && styles.checkboxOn]} />
                  <Text style={styles.rowText}>{category}</Text>
                </TouchableOpacity>
              );
            })}
            <Text style={styles.status}>
              {selected.length === 0
                ? 'No categories set — filtering disabled, all paths match'
                : `Active categories: ${selected.join(', ')}`}
            </Text>
            <Text style={styles.status}>
              Current match for "{screenName}":{' '}
              {prompt.path ? prompt.path.id : 'none'}
              {prompt.result ? ` (${prompt.result.code})` : ''}
            </Text>
            <TouchableOpacity onPress={close} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    padding: 10,
    backgroundColor: '#f0f0f0',
  },
  triggerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'purple',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
    elevation: 1000,
  },
  panel: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#333',
    marginRight: 10,
  },
  checkboxOn: {
    backgroundColor: 'purple',
  },
  rowText: {
    fontSize: 16,
  },
  status: {
    marginTop: 12,
    fontSize: 13,
    color: '#555',
  },
  closeButton: {
    marginTop: 16,
    alignSelf: 'flex-end',
  },
  closeButtonText: {
    fontSize: 16,
    color: 'purple',
    fontWeight: 'bold',
  },
});
