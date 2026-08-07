/* eslint-disable react-native/no-inline-styles */

import React from 'react';
import {
  View,
  Modal,
  StyleSheet,
  ImageBackground,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import {
  extractModalParams,
  type PathItem,
  type PromptResult,
} from '@recurly/engage-core';
import { getImageCompositeFieldName, modalAlignment } from './utils';
import { usePrompt } from './usePrompt';
import { CloseBar, SafeAreaContainer } from './Components';

export const PromptBottomBanner = ({
  path,
  onEvent,
}: {
  path: PathItem;
  onEvent: (result: PromptResult) => void;
}) => {
  const modalParams = React.useMemo(
    () =>
      extractModalParams(
        path,
        Dimensions.get('window').width,
        Dimensions.get('window').height
      ),
    [path]
  );
  const {
    modalWidth,
    modalHeight,
    modalOffsetX,
    modalOffsetY,
    modalPosition,
    modallessDismissable,
    animationType,
  } = modalParams;
  const imageFieldName = getImageCompositeFieldName();
  const {
    state: { promptMgr },
  } = usePrompt();

  React.useEffect(() => {
    promptMgr?.onEvent(path, 'impression', onEvent);
  }, [promptMgr]); // eslint-disable-line react-hooks/exhaustive-deps

  const getBanner = () => {
    return (
      <View
        // @ts-ignore
        style={{
          flex: 1,
          ...modalAlignment(
            modalPosition,
            modalOffsetX,
            modalOffsetY
          ) /* position */,
        }}
      >
        <TouchableOpacity
          activeOpacity={Platform.OS === 'ios' && Platform.isTV ? 1 : 0.2}
          onPress={() => promptMgr?.onEvent(path, 'goal', onEvent)}
        >
          <ImageBackground
            // @ts-ignore
            source={{ uri: path.actions[imageFieldName] }}
            resizeMode="cover"
            style={{
              ...styles.modalViewRoot,
              width: modalWidth,
              height: modalHeight,
            }}
          >
            <CloseBar
              params={modalParams}
              close={(reason) => promptMgr?.onEvent(path, reason, onEvent)}
            />
          </ImageBackground>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      animationType={animationType}
      transparent={true}
      visible={true}
      onRequestClose={() => promptMgr?.onEvent(path, 'dismiss', onEvent)}
    >
      <TouchableWithoutFeedback
        onPress={() => {
          if (modallessDismissable) {
            promptMgr?.onEvent(path, 'dismiss', onEvent);
          }
        }}
      >
        <SafeAreaContainer>{getBanner()}</SafeAreaContainer>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalViewRoot: {
    backgroundColor: 'white',
  },
});
