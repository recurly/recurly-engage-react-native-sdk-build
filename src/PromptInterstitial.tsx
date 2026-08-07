/* eslint-disable react-native/no-inline-styles */

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Linking,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import {
  extractModalParams,
  type PathItem,
  type PromptResult,
  type LinkedString,
} from '@recurly/engage-core';
import { getImageCompositeFieldName, dp } from './utils';
import { CloseBar, CustomButton, SafeAreaContainer } from './Components';
import { usePrompt } from './usePrompt';

const HyperlinkedText = ({
  privacyTextAndLinks,
}: {
  privacyTextAndLinks: LinkedString[];
}) => {
  const {
    state: { legalTextFont },
  } = usePrompt();

  return (
    <Text
      style={{ ...(legalTextFont ? { fontFamily: legalTextFont } : {}) }}
      accessible={true}
      accessibilityLabel={legalTextFont}
    >
      {privacyTextAndLinks.map((link, index) => {
        if (link.url) {
          return (
            <Text
              key={index}
              style={{
                color: 'blue',
                textDecorationLine: 'underline',
                ...(legalTextFont ? { fontFamily: legalTextFont } : {}),
              }}
              onPress={() => link.url && Linking.openURL(link.url)}
            >
              {link.text}
            </Text>
          );
        } else {
          return (
            <Text
              key={index}
              style={{
                ...(legalTextFont ? { fontFamily: legalTextFont } : {}),
              }}
            >
              {link.text}
            </Text>
          );
        }
      })}
    </Text>
  );
};

export const PromptInterstitial = ({
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
    button1,
    button2,
    button3,
    buttonAbsolutePosition,
    buttonWidth,
    buttonWidthPercent,
    buttonHeight,
    buttonBottomPadding,
    buttonFontSize,
    buttonBorderRadius,
    buttonBorderColor,
    buttonBorderThickness,
    privacyTextAndLinks,
    animationType,
  } = modalParams;
  const modalHeight = Dimensions.get('window').height;
  const {
    actions: {
      rf_settings_bg_image_android_os_phone_2x_composite,
      rf_settings_bg_image_ios_iphone_2x_composite,
    },
  } = path;
  const image2x =
    Platform.OS === 'ios'
      ? rf_settings_bg_image_ios_iphone_2x_composite
      : rf_settings_bg_image_android_os_phone_2x_composite;
  const imageFieldName = image2x
    ? Platform.OS === 'ios'
      ? 'rf_settings_bg_image_ios_iphone_2x_composite'
      : 'rf_settings_bg_image_android_os_phone_2x_composite'
    : getImageCompositeFieldName();
  const {
    state: { promptMgr, buttonFont },
  } = usePrompt();

  React.useEffect(() => {
    promptMgr?.onEvent(path, 'impression', onEvent);
  }, [promptMgr]); // eslint-disable-line react-hooks/exhaustive-deps

  const getAndroidMarginBottom = () => {
    if (Platform.OS !== 'android') return 0;
    // Get status bar height (works on all Android API levels)
    const statusBarHeight = StatusBar.currentHeight || 0;
    return statusBarHeight;
  };

  const tvLayout = () => {
    return (
      <View style={{ position: 'relative' }}>
        <CustomButton
          title={button1.label ?? ''}
          titleStyle={{
            color: button1.textColor ?? 'white',
            ...(buttonFont ? { fontFamily: buttonFont } : {}),
            fontSize: buttonFontSize,
          }}
          borderStyle={{
            backgroundColor: button1.bgColor,
            borderRadius: buttonBorderRadius,
            borderColor: buttonBorderColor,
            borderWidth: buttonBorderThickness,
            position: 'absolute',
            width: dp(button1.width),
            height: dp(button1.height),
            left: dp(button1.position_x),
            top: modalHeight - dp(button1.position_y),
          }}
          initialFocus={true}
          focusStyle={{
            textHighlightColor: button1.textHighlightColor,
            bgHighlightColor: button1.bgHighlightColor,
          }}
          onPress={() => promptMgr?.onEvent(path, 'goal', onEvent)}
        />
        {button2 && (
          <CustomButton
            title={button2.label ?? ''}
            titleStyle={{
              color: button2.textColor ?? 'white',
              ...(buttonFont ? { fontFamily: buttonFont } : {}),
              fontSize: buttonFontSize,
            }}
            borderStyle={{
              backgroundColor: button2.bgColor,
              borderRadius: buttonBorderRadius,
              borderColor: buttonBorderColor,
              borderWidth: buttonBorderThickness,
              position: 'absolute',
              width: dp(button2.width),
              height: dp(button2.height),
              left: dp(button2.position_x),
              top: modalHeight - dp(button2.position_y),
            }}
            focusStyle={{
              textHighlightColor: button2.textHighlightColor,
              bgHighlightColor: button2.bgHighlightColor,
            }}
            onPress={() => promptMgr?.onEvent(path, 'goal2', onEvent)}
          />
        )}
        {button3 && (
          <CustomButton
            title={button3.label ?? ''}
            titleStyle={{
              color: button3.textColor ?? 'white',
              ...(buttonFont ? { fontFamily: buttonFont } : {}),
              fontSize: buttonFontSize,
            }}
            borderStyle={{
              backgroundColor: button3.bgColor,
              borderRadius: buttonBorderRadius,
              borderColor: buttonBorderColor,
              borderWidth: buttonBorderThickness,
              position: 'absolute',
              width: dp(button3.width),
              height: dp(button3.height),
              left: dp(button3.position_x),
              top: modalHeight - dp(button3.position_y),
            }}
            focusStyle={{
              textHighlightColor: button3.textHighlightColor,
              bgHighlightColor: button3.bgHighlightColor,
            }}
            onPress={() => promptMgr?.onEvent(path, 'decline', onEvent)}
          />
        )}
        <View style={{ flexBasis: '80%' }} />
        <View
          style={{
            flexDirection: 'row',
            marginBottom: 20,
            justifyContent: 'center',
          }}
        >
          {privacyTextAndLinks && (
            <HyperlinkedText privacyTextAndLinks={privacyTextAndLinks} />
          )}
        </View>
      </View>
    );
  };

  // @ts-ignore
  const mobileLayout = () => {
    return (
      <View style={{ flex: 1, marginBottom: getAndroidMarginBottom() }}>
        <View style={styles.buttonRoot}>
          {
            // @ts-ignore TS2769
            <View style={{ width: buttonWidthPercent ?? buttonWidth }}>
              <CustomButton
                title={button1.label ?? ''}
                titleStyle={{
                  color: button1.textColor ?? 'white',
                  ...(buttonFont ? { fontFamily: buttonFont } : {}),
                  fontSize: buttonFontSize,
                }}
                borderStyle={{
                  backgroundColor: button1.bgColor,
                  borderRadius: buttonBorderRadius,
                  borderColor: buttonBorderColor,
                  borderWidth: buttonBorderThickness,
                  height: buttonHeight,
                  marginBottom: buttonBottomPadding,
                }}
                onPress={() => promptMgr?.onEvent(path, 'goal', onEvent)}
              />
            </View>
          }
          {button2 && (
            // @ts-ignore TS2769
            <View style={{ width: buttonWidthPercent ?? buttonWidth }}>
              <CustomButton
                title={button2.label ?? ''}
                titleStyle={{
                  color: button2.textColor ?? 'white',
                  ...(buttonFont ? { fontFamily: buttonFont } : {}),
                  fontSize: buttonFontSize,
                }}
                borderStyle={{
                  backgroundColor: button2.bgColor,
                  borderRadius: buttonBorderRadius,
                  borderColor: buttonBorderColor,
                  borderWidth: buttonBorderThickness,
                  height: buttonHeight,
                  marginBottom: buttonBottomPadding,
                }}
                onPress={() => promptMgr?.onEvent(path, 'goal2', onEvent)}
              />
            </View>
          )}
          {button3 && (
            // @ts-ignore TS2769
            <View style={{ width: buttonWidthPercent ?? buttonWidth }}>
              <CustomButton
                title={button3.label ?? ''}
                titleStyle={{
                  color: button3.textColor ?? 'white',
                  ...(buttonFont ? { fontFamily: buttonFont } : {}),
                  fontSize: buttonFontSize,
                }}
                borderStyle={{
                  backgroundColor: button3.bgColor,
                  borderRadius: buttonBorderRadius,
                  borderColor: buttonBorderColor,
                  borderWidth: buttonBorderThickness,
                  height: buttonHeight,
                  marginBottom: buttonBottomPadding,
                }}
                onPress={() => promptMgr?.onEvent(path, 'decline', onEvent)}
              />
            </View>
          )}
        </View>
        <View
          style={{
            flexDirection: 'row',
            marginBottom: 20,
            justifyContent: 'center',
          }}
        >
          {privacyTextAndLinks && (
            <HyperlinkedText privacyTextAndLinks={privacyTextAndLinks} />
          )}
        </View>
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
      <ImageBackground
        // @ts-ignore
        source={{ uri: path.actions[imageFieldName] }}
        resizeMode="stretch"
        style={{
          flex: 1,
          ...styles.modalViewRoot,
        }}
      >
        <SafeAreaContainer>
          <CloseBar
            params={modalParams}
            close={(reason) => promptMgr?.onEvent(path, reason, onEvent)}
          />
          <View style={styles.modalContent}>
            {buttonAbsolutePosition || Platform.isTV
              ? tvLayout()
              : mobileLayout()}
          </View>
        </SafeAreaContainer>
      </ImageBackground>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalViewRoot: {
    backgroundColor: 'white',
  },
  modalContent: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    flex: 1,
    marginLeft: 20,
    marginRight: 20,
    marginBottom: 20,
  },
  buttonRoot: {
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'center',
    flex: 1,
  },
});
