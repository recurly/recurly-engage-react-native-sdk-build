import {
  PathType,
  PromptCore,
  PromptResultCode,
  decodeDeeplink,
  preparePromptResult,
} from '@recurly/engage-core';
import type { PathItem, PromptResult, Prompt } from '@recurly/engage-core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dimensions, PixelRatio, Platform } from 'react-native';
import { PromptDialog } from './PromptDialog';
import type { ExternalStyles } from './Components';
import { PromptVideoDialog } from './PromptVideoDialog';
import { PromptInterstitial } from './PromptInterstitial';
import { PromptBottomBanner } from './PromptBottomBanner';
import { gDeviceInfo, setGlobalDeviceInfo } from './utils';
import React, { type ReactNode } from 'react';
import {
  PromptAction_Set_Prompt,
  PromptAction_Init,
  PromptContext,
  PromptReducer,
  initialState,
  usePrompt,
  type PromptAction,
} from './usePrompt';

console.log(`@recurly/engage-react-native 2.0.9`);

interface PromptProviderProps {
  children: ReactNode;
  appId: string;
  userId: string;
}

export const PromptProvider: React.FC<PromptProviderProps> = ({
  children,
  appId,
  userId,
}) => {
  const [state, dispatch] = React.useReducer(PromptReducer, initialState);

  React.useEffect(() => {
    const promptMgr = new PromptManager(appId, userId, dispatch);
    dispatch({
      type: PromptAction_Init,
      data: promptMgr,
    });
  }, [dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PromptContext.Provider value={{ state, dispatch }}>
      {children}
    </PromptContext.Provider>
  );
};

export const PromptOverlay = ({
  onEvent,
  dialogExternal,
}: {
  onEvent: (result: PromptResult) => void;
  dialogExternal?: ExternalStyles;
}) => {
  const {
    dispatch,
    state: { promptMgr, prompt },
  } = usePrompt();
  const { path, delaySeconds } = prompt;
  const width = Dimensions.get('window').width;
  const height = Dimensions.get('window').height;
  const [showPrompt, setShowPrompt] = React.useState(false);

  const handleClose = (result: PromptResult) => {
    if (result.code !== PromptResultCode.IMPRESSION) {
      setShowPrompt(false);
      // Clear path from context so that re-triggering the same prompt produces
      // a reference change (undefined → pathObject) that the useEffect detects.
      // Without this, same-object pings (304 cached) cause the effect to skip.
      dispatch({ type: PromptAction_Set_Prompt, data: { delaySeconds: 0 } });

      // path is always defined here: handleClose is only reachable from child
      // components rendered inside `if (path && showPrompt)`.
      const closedPath = path as PathItem;
      switch (closedPath.path_type) {
        case PathType.MODAL:
        case PathType.BOTTOM_BANNER:
        case PathType.INTERSTITIAL:
          if (closedPath.sequence) {
            let reason = '';
            switch (result.code) {
              case PromptResultCode.BUTTON1:
                reason = closedPath.actions.rf_retention_button1_text ?? '';
                break;
              case PromptResultCode.BUTTON2:
                reason = closedPath.actions.rf_retention_button2_text ?? '';
                break;
              case PromptResultCode.BUTTON3:
                reason = 'declined';
                break;
              case PromptResultCode.DISMISS:
                reason = 'dismissed';
                break;
              case PromptResultCode.TIMEOUT:
                reason = 'timeout';
                break;
              default:
                break;
            }
            const sequence = closedPath.sequence;
            if (sequence.continue_interaction_types.includes(reason)) {
              const sequences = promptMgr
                ?.getPaths()
                .filter((p) => p.sequence?.id === sequence.id);
              const next = sequences?.find(
                (p) => p.sequence?.order === sequence.order + 1
              );
              if (next) {
                dispatch({
                  type: PromptAction_Set_Prompt,
                  data: { path: next, delaySeconds: 0 },
                });
              }
            }
          }
          break;
        default:
          break;
      }
    }
    onEvent(result);
  };

  React.useEffect(() => {
    if (!path) {
      return;
    }
    if (showPrompt) {
      console.log('there is one prompt currently shown');
      return;
    }
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, delaySeconds * 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delaySeconds, path]);

  if (path && showPrompt) {
    switch (path.path_type) {
      case PathType.VIDEO:
        return <PromptVideoDialog path={path} onEvent={handleClose} />;
      case PathType.MODAL:
        return (
          <PromptDialog
            path={path}
            onEvent={handleClose}
            external={dialogExternal}
          />
        );
      case PathType.BOTTOM_BANNER:
        return <PromptBottomBanner path={path} onEvent={handleClose} />;
      case PathType.INTERSTITIAL:
        return (
          ((gDeviceInfo.device_form === 'phone' && width < height) ||
            gDeviceInfo.device_form === 'tv') && (
            <PromptInterstitial path={path} onEvent={handleClose} />
          )
        );
      default:
        return null;
    }
  }
  return null;
};

// remove the libarary dependency on expo-device
import * as Device from 'expo-device';

const initDeviceInfo = () => {
  let os = 'unknown';
  let manufacturer = 'unknown';
  let modelName = 'unknown';
  let category = 'unknown';
  let form = 'unknown';

  switch (Platform.OS) {
    case 'ios':
      os = Platform.isTV ? 'tv_os' : 'ios';
      manufacturer = 'Apple';
      modelName = Platform.constants.systemName;
      if (Platform.isPad) {
        category = 'ipad';
        form = 'tablet';
      } else if (Platform.isTV) {
        category = 'tv';
        form = 'tv';
      } else {
        category = 'iphone';
        form = 'phone';
      }
      break;
    case 'android':
      os = Platform.constants?.uiMode === 'tv' ? 'android_tv' : 'android_os';
      manufacturer = Platform.constants.Manufacturer;
      modelName = Platform.constants.Model;
      if (Platform.constants.uiMode === 'tv') {
        category = 'tv';
        form = 'tv';
      } else {
        if (Device.deviceType === Device.DeviceType.TABLET) {
          category = 'tablet';
          form = 'tablet';
        } else {
          category = 'phone';
          form = 'phone';
        }
      }
      break;
    // @ts-ignore TS2678
    case 'kepler':
      // @ts-ignore
      os = 'android_tv';
      category = 'tv';
      manufacturer = 'Amazon';
      modelName = 'Vega';
      form = 'tv';
      break;
    default:
      break;
  }

  const deviceInfo = {
    device_manufacturer: manufacturer,
    device_model: modelName,
    device_type: os,
    device_category: category,
    device_form: form,
  };
  // @ts-ignore
  setGlobalDeviceInfo(deviceInfo);
  console.log(`device info is ${JSON.stringify(gDeviceInfo)}`);
};

export class PromptManager extends PromptCore {
  private dispatch: React.Dispatch<PromptAction>;

  constructor(
    appId: string,
    userId: string,
    dispatch: React.Dispatch<PromptAction>
  ) {
    console.log(
      `screen resolution is ${Dimensions.get('window').width} * ${Dimensions.get('window').height}, pixel density ${PixelRatio.get()}`
    );
    initDeviceInfo();
    super(appId, userId, gDeviceInfo, {
      createKey: AsyncStorage.setItem,
      getValue: async (key: string) => AsyncStorage.getItem(key),
      deleteKey: AsyncStorage.removeItem,
      hasKey: async (key: string): Promise<boolean> => {
        const value = await AsyncStorage.getItem(key);
        return value !== null;
      },
      getAllKeys: async (): Promise<readonly string[]> =>
        AsyncStorage.getAllKeys(),
    });
    this.dispatch = dispatch;
  }

  onEvent(
    path: PathItem,
    reason: string,
    onEvent: (result: PromptResult) => void,
    extra?: any
  ) {
    const {
      id,
      action_group_id,
      path_type,
      actions: {
        rf_settings_timeout_interval,
        rf_settings_accept_interval,
        rf_settings_decline_interval,
        rf_settings_dismiss_interval,
        rf_metadata,
        rf_settings_deeplink,
      },
    } = path;
    const deeplink = decodeDeeplink(rf_settings_deeplink);
    const result: PromptResult = {
      code: PromptResultCode.ERROR,
      meta: rf_metadata,
    };
    switch (reason) {
      case 'timeout':
        result.code = PromptResultCode.TIMEOUT;
        break;
      case 'dismiss':
        result.code = PromptResultCode.DISMISS;
        break;
      case 'impression':
        result.code = PromptResultCode.IMPRESSION;
        break;
      case 'goal':
        result.code = PromptResultCode.BUTTON1;
        result.value = deeplink;
        break;
      case 'goal2':
        result.code = PromptResultCode.BUTTON2;
        result.value = deeplink;
        break;
      case 'decline':
        result.code = PromptResultCode.BUTTON3;
        break;
      default:
        break;
    }
    (async () => {
      switch (reason) {
        case 'timeout':
          await this.getApi().dismiss(id, 'timeout', action_group_id);
          if (path_type !== PathType.HORIZONTAL) {
            await this.getLocalStorage().createNewOverlayKey(
              id,
              rf_settings_timeout_interval
            );
          }
          break;
        case 'dismiss':
          await this.getApi().dismiss(id, 'dismiss', action_group_id);
          if (path_type !== PathType.HORIZONTAL) {
            await this.getLocalStorage().createNewOverlayKey(
              id,
              rf_settings_dismiss_interval
            );
          }
          break;
        case 'impression':
          await this.getApi().impression(path.id, path.action_group_id);

          break;
        case 'goal':
          await this.getApi().goal(
            id,
            action_group_id,
            undefined,
            undefined,
            extra?.surveySelection
          );
          if (path_type !== PathType.HORIZONTAL) {
            await this.getLocalStorage().createNewOverlayKey(
              id,
              rf_settings_accept_interval
            );
          }
          break;
        case 'goal2':
          await this.getApi().goal(id, action_group_id, undefined, 'accept2');
          if (path_type !== PathType.HORIZONTAL) {
            await this.getLocalStorage().createNewOverlayKey(
              id,
              rf_settings_accept_interval
            );
          }
          break;
        case 'decline':
          await this.getApi().dismiss(id, 'decline', action_group_id);
          if (path_type !== PathType.HORIZONTAL) {
            await this.getLocalStorage().createNewOverlayKey(
              id,
              rf_settings_decline_interval
            );
          }
          break;
        default:
          break;
      }
    })();
    onEvent(preparePromptResult({ ...result, path }));
  }

  screenChanged(screen: string) {
    (async () => {
      const prompt = await this.onScreenChanged(screen);
      this.dispatch({
        type: PromptAction_Set_Prompt,
        data: prompt,
      });
    })();
  }

  buttonClicked(buttonId: string) {
    (async () => {
      const prompt = await this.onButtonClicked(buttonId);
      this.dispatch({
        type: PromptAction_Set_Prompt,
        data: prompt,
      });
    })();
  }

  showPrompt(prompt: Prompt) {
    this.dispatch({
      type: PromptAction_Set_Prompt,
      data: { path: prompt.pathItem, delaySeconds: 0 },
    });
  }

  getIapItems() {
    throw new Error('not implemented');
  }

  getPurchasedItems() {
    throw new Error('not implemented');
  }

  purchaseIap() {
    throw new Error('not implemented');
  }
}
