import type { PathItem, PromptResult } from '@recurly/engage-core';
import { extractInlineParams, type InlineParams } from '@recurly/engage-core';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
  Dimensions,
} from 'react-native';
import React from 'react';
import { usePrompt } from './usePrompt';
import { CloseBar } from './Components';
import { gDeviceInfo } from './utils';

const Banner = ({
  pathItem,
  height,
  focusStyle,
  onEvent,
}: {
  pathItem: PathItem;
  height: number;
  focusStyle: object;
  onEvent: (result: PromptResult) => void;
}) => {
  const { poster, userInteraction, accessibilityLabel } = React.useMemo(
    () =>
      extractInlineParams(
        pathItem,
        gDeviceInfo.device_type,
        gDeviceInfo.device_category
      ),
    [pathItem]
  );
  const {
    state: { promptMgr },
  } = usePrompt();
  const [isFocused, setIsFocused] = React.useState(false);

  React.useEffect(() => {
    promptMgr?.onEvent(pathItem, 'impression', onEvent);
  }, [promptMgr]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Pressable
      disabled={userInteraction === 'none'}
      onPress={() => {
        if (promptMgr && userInteraction !== 'none') {
          promptMgr?.onEvent(pathItem, 'goal', onEvent);
        }
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      // eslint-disable-next-line react-native/no-inline-styles
      style={{ opacity: 1 }}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Image
        source={{ uri: poster }}
        style={{
          ...styles.imageRow,
          height: height,
          ...(isFocused ? focusStyle : {}),
        }}
        resizeMode="stretch"
      />
    </Pressable>
  );
};

export const RecurlyInline = ({
  zoneId,
  closeButtonColor,
  closeButtonBgColor,
  closeButtonSize,
  timerFontSize,
  timerFontColor,
  focusStyle,
  onEvent,
}: {
  zoneId: string;
  closeButtonColor: string;
  closeButtonBgColor: string;
  closeButtonSize: string;
  timerFontSize: string;
  timerFontColor: string;
  focusStyle: object;
  onEvent: (result: PromptResult) => void;
}) => {
  const {
    state: { promptMgr },
  } = usePrompt();
  const [pathItems, setPathItems] = React.useState<PathItem[]>([]);
  const [height, setHeight] = React.useState(0);
  const [show, setShow] = React.useState(true);
  const [inlineParams, setInlineParams] = React.useState<InlineParams>();

  React.useEffect(() => {
    if (promptMgr) {
      (async () => {
        const inlines = await promptMgr.getInlines(zoneId);
        if (inlines.length > 0) {
          setPathItems(inlines);
          const params = extractInlineParams(
            inlines[0]!,
            gDeviceInfo.device_type,
            gDeviceInfo.device_category
          );
          setInlineParams(params);
          const { inlineWidth, inlineHeight } = params;
          setHeight(
            (Dimensions.get('window').width * inlineHeight) / inlineWidth
          );
        }
      })();
    }
  }, [promptMgr]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    pathItems.length > 0 &&
    show && (
      <View style={{ ...styles.container, height }}>
        <FlatList
          data={pathItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Banner
              pathItem={item}
              height={height}
              focusStyle={focusStyle}
              onEvent={onEvent}
            />
          )}
        />
        <CloseBar
          params={inlineParams!}
          close={(reason) => {
            setShow(false);
            promptMgr?.onEvent(pathItems[0]!, reason, onEvent);
          }}
          external={{
            closeButtonColor,
            closeButtonBgColor,
            closeButtonSize: parseInt(closeButtonSize, 10),
            timerFontColor,
            timerFontSize: parseInt(timerFontSize, 10),
          }}
        />
      </View>
    )
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  imageRow: {
    width: '100%',
    borderRadius: 10,
  },
});
