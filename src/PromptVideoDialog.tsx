/* eslint-disable react-native/no-inline-styles */

import React from 'react';
import {
  Button,
  Modal,
  View,
  StyleSheet,
  ImageBackground,
  Dimensions,
} from 'react-native';
import {
  extractVideoModalParams,
  type PathItem,
  type PromptResult,
} from '@recurly/engage-core';
import { modalAlignment } from './utils';
import { usePrompt } from './usePrompt';
import { useVideoPlayer, VideoView } from 'expo-video';

export const PromptVideoDialog = ({
  path,
  onEvent,
}: {
  path: PathItem;
  onEvent: (result: PromptResult) => void;
}) => {
  const {
    modalWidth,
    modalHeight,
    modalPosition,
    button1,
    button2,
    button3,
    loopVideo,
    showControls,
    url,
    mute,
    poster,
    animationType,
  } = React.useMemo(
    () =>
      extractVideoModalParams(
        path,
        Dimensions.get('window').width,
        Dimensions.get('window').height
      ),
    [path]
  );
  const {
    state: { promptMgr },
  } = usePrompt();

  React.useEffect(() => {
    promptMgr?.onEvent(path, 'impression', onEvent);
  }, [promptMgr]); // eslint-disable-line react-hooks/exhaustive-deps

  const player = useVideoPlayer(url, (vplayer) => {
    vplayer.loop = loopVideo;
    vplayer.muted = mute;
    vplayer.play();
  });

  return (
    <Modal
      animationType={animationType}
      transparent={true}
      visible={true}
      onRequestClose={() => promptMgr?.onEvent(path, 'dismiss', onEvent)}
    >
      <View
        // @ts-ignore
        style={{
          flex: 1,
          ...modalAlignment(modalPosition) /* position */,
        }}
      >
        <ImageBackground
          // @ts-ignore
          source={{ uri: poster }}
          resizeMode="stretch"
          style={{
            ...styles.modalViewRoot,
            width: modalWidth /* size */,
            height: modalHeight,
          }}
        >
          <VideoView
            style={{
              width: modalWidth /* size */,
              height: modalHeight,
            }}
            player={player}
            nativeControls={showControls}
            contentFit="cover"
          />
          <View style={styles.modalContent}>
            <View style={styles.buttonRoot}>
              <Button
                title={button1.label ?? ''}
                color={button1.bgColor}
                onPress={() => promptMgr?.onEvent(path, 'goal', onEvent)}
              />
              {button2 && (
                <Button
                  title={button2.label ?? ''}
                  color={button2.bgColor}
                  onPress={() => promptMgr?.onEvent(path, 'goal2', onEvent)}
                />
              )}
              {button3 && (
                <Button
                  title={button3.label ?? ''}
                  color={button3.bgColor}
                  onPress={() => promptMgr?.onEvent(path, 'decline', onEvent)}
                />
              )}
            </View>
            <View style={{ height: 20 }} />
          </View>
        </ImageBackground>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalViewRoot: {
    backgroundColor: 'white',
  },
  modalContent: {
    flexDirection: 'column',
    justifyContent: 'flex-end',
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    marginLeft: 20,
  },
  buttonRoot: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 10,
    width: 400,
  },
});
