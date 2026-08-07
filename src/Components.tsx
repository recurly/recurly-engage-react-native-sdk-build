import {
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
  SafeAreaView,
} from 'react-native';
import React from 'react';
import type { ModalParameters, InlineParams } from '@recurly/engage-core';
import { usePrompt } from './usePrompt';
/* eslint-disable react-native/no-inline-styles */

export interface ExternalStyles {
  closeButtonColor?: string;
  closeButtonBgColor?: string;
  closeButtonSize?: number;
  timerFontSize?: number;
  timerFontColor?: string;
}

export const CloseBar = ({
  params,
  close,
  external,
}: {
  params: ModalParameters | InlineParams;
  close: (reason: string) => void;
  external?: ExternalStyles;
}) => {
  const { countDown, closeButtonEnabled } = params;
  const countDownPromptInvisible =
    'countDownPromptInvisible' in params
      ? params.countDownPromptInvisible
      : false;
  const countDownPromptColor =
    external?.timerFontColor ??
    ('countDownPromptColor' in params
      ? params.countDownPromptColor
      : '#FFFFFF');
  const countDownPromptFontSize =
    external?.timerFontSize ??
    ('countDownPromptFontSize' in params ? params.countDownPromptFontSize : 24);
  const closeButtonSize =
    external?.closeButtonSize ??
    ('closeButtonSize' in params ? params.closeButtonSize : 24);
  const closeButtonPosition =
    'closeButtonPosition' in params ? params.closeButtonPosition : null;
  const closeButtonBgColor = external?.closeButtonBgColor ?? 'transparent';
  const closeButtonColor = external?.closeButtonColor ?? countDownPromptColor;

  const {
    state: { timerFont },
  } = usePrompt();
  const [seconds, setSeconds] = React.useState(countDown);

  React.useEffect(() => {
    if (seconds <= 0) return;
    const timerId = setInterval(() => {
      if (seconds === 1) {
        close('timeout');
      }
      setSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timerId);
  }, [seconds]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View
      style={[
        styles.closeBarRoot,
        closeButtonPosition
          ? {
              top: closeButtonPosition,
              right: closeButtonPosition,
              position: 'absolute',
              paddingRight: 0,
              alignItems: 'flex-start',
            }
          : {},
      ]}
    >
      {!countDownPromptInvisible && seconds > 0 && (
        <Text
          style={{
            color: countDownPromptColor,
            fontSize: countDownPromptFontSize,
            ...(timerFont && { fontFamily: timerFont }),
          }}
          accessible={true}
          accessibilityLabel={`${seconds} seconds`}
        >
          {`${seconds}s`}
        </Text>
      )}
      {closeButtonEnabled && !Platform.isTV && (
        <TouchableOpacity
          style={{ backgroundColor: closeButtonBgColor }}
          onPress={() => close('dismiss')}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Text
            style={{
              fontSize: closeButtonSize,
              color: closeButtonColor,
              lineHeight: closeButtonSize,
            }}
          >
            {'✕'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export const CustomButton = ({
  title,
  onPress,
  titleStyle,
  borderStyle,
  initialFocus,
  focusStyle,
}: {
  title: string;
  onPress: () => void;
  titleStyle: any;
  borderStyle: any;
  initialFocus?: boolean;
  focusStyle?: any;
}) => {
  const [isFocused, setIsFocused] = React.useState(initialFocus ?? false);
  const buttonRef = React.useRef<React.ElementRef<typeof Pressable>>(null);

  const bgStyle = { ...styles.customButton, ...borderStyle };
  const textStyle = { ...styles.customButtonText, ...titleStyle };
  if (focusStyle) {
    const { textHighlightColor, bgHighlightColor } = focusStyle;
    if (isFocused && bgHighlightColor) {
      bgStyle.backgroundColor = bgHighlightColor;
    }
    if (isFocused && textHighlightColor) {
      textStyle.color = textHighlightColor;
    }
  }

  return (
    <Pressable
      ref={buttonRef}
      style={{ ...bgStyle }}
      onPress={onPress}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      hasTVPreferredFocus={initialFocus}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Text style={{ ...textStyle }} numberOfLines={1}>
        {title}
      </Text>
    </Pressable>
  );
};

export const SafeAreaContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return Platform.isTV ? (
    <View
      style={{
        flex: 1,
      }}
    >
      {children}
    </View>
  ) : (
    <SafeAreaView
      style={{
        flex: 1,
      }}
    >
      {children}
    </SafeAreaView>
  );
};

/* eslint-enable react-native/no-inline-styles */

const styles = StyleSheet.create({
  customButton: {
    alignItems: 'center', // Center text horizontally
    justifyContent: 'center', // center text vertically
    height: 48,
    paddingHorizontal: 12,
  },
  customButtonText: {
    fontSize: 16,
  },
  closeBarRoot: {
    flexDirection: 'row',
    width: '100%',
    height: 36,
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 5,
    paddingRight: 10,
  },
});
