import { PromptApi } from './PromptApi';
import {
  PathType,
  PromptResultCode,
  InlineType,
  getPathTypeName,
} from './types';
import type {
  ActionsData,
  DeviceInfo,
  PathItem,
  LocalStorage,
  ModalParameters,
  VideoModalParameters,
  PromptResult,
  InlineParams,
  Prompt,
  LinkedString,
} from './types';
import { LocalStorageUtils } from './localStorageUtils';

console.log(`@recurly/engage-core 2.0.4`);

const InitPingInterval = 60 * 1000;
const MaxPingBackoffSeconds = 3084;

export interface CandidatePathItem {
  path?: PathItem;
  delaySeconds: number;
  result?: PromptResult;
}

const getTimeout = (timeoutString: string | undefined) => {
  if (
    timeoutString === null ||
    timeoutString === undefined ||
    timeoutString === ''
  ) {
    return '0';
  }
  return timeoutString;
};

const pxToInteger = (pxString: string) =>
  parseInt(pxString.replace('px', ''), 10);

const matchWildCharStrings = (
  trigger: string | null | undefined,
  name: string | null | undefined
): boolean => {
  if (trigger === name || trigger === '*' || name === '*') {
    return true;
  }
  if (
    trigger === null ||
    trigger === undefined ||
    name === null ||
    name === undefined
  ) {
    return false;
  }
  const specialChars = [
    '?',
    '+',
    '.',
    '(',
    ')',
    '[',
    ']',
    '{',
    '}',
    '\\',
    '^',
    '$',
    '|',
  ];
  for (const char of specialChars) {
    const escaped = '\\' + char;
    trigger = trigger.split(char).join(escaped);
  }
  // Convert wildcard '*' into regex equivalent '.*'
  trigger = trigger.split('*').join('.*');
  const pattern = new RegExp(`^${trigger}$`);
  return pattern.test(name);
};

export const preparePromptResult = ({
  code,
  path,
  value,
  meta,
}: {
  code: PromptResultCode;
  path?: PathItem;
  value?: { [key: string]: any };
  meta?: { [key: string]: any };
}): PromptResult => {
  let promptMeta: { [key: string]: any } = {};
  if (path) {
    promptMeta = {
      promptName: path.name,
      promptID: path.id,
      promptVariationName: path.action_group_name,
      promptVariationID: path.action_group_id,
      promptExperimentName: path.experiment_name,
      promptExperimentID: path.experiment_id,
      promptType: path.path_type,
    };
    switch (code) {
      case PromptResultCode.BUTTON1:
        promptMeta.buttonLabel = path.actions.rf_retention_button1_text;
        break;
      case PromptResultCode.BUTTON2:
        promptMeta.buttonLabel = path.actions.rf_retention_button2_text;
        break;
      case PromptResultCode.BUTTON3:
        promptMeta.buttonLabel = path.actions.rf_retention_button3_text;
        break;
      default:
        break;
    }
  }
  return {
    code,
    value,
    meta,
    promptMeta,
  };
};

export const decodeDeeplink = (deeplinkString: string | undefined) => {
  const deeplink: { [key: string]: string } = {};
  if (deeplinkString) {
    const pairs = deeplinkString.split('&');
    pairs.forEach((pair) => {
      const keyValue = pair.split('=');
      if (keyValue.length === 2) {
        deeplink[keyValue[0]!] = keyValue[1]!;
      }
    });
  }
  return deeplink;
};

export const extractInlineParams = (
  path: PathItem,
  os: string,
  deviceType: string
): InlineParams => {
  const name = path.name;
  const id = path.id;
  const actionGroupId = path.action_group_id ?? '';
  const poster =
    // @ts-ignore
    path.actions[`rf_settings_bg_image_${os}_${deviceType}_composite`];
  const {
    rf_settings_fill_color: closeButtonColor = '#FFFFFF',
    rf_settings_tile_width,
    rf_settings_tile_height,
    rf_settings_close_button_enabled = 'false',
    rf_settings_close_seconds,
    rf_settings_tile_interaction = '',
    accessibility_label: accessibilityLabel = getPathTypeName(path.path_type),
  } = path.actions;
  const closeButtonSize = 20;
  const closeButtonPosition = 10;

  return {
    name,
    id,
    actionGroupId,
    poster,
    inlineWidth: pxToInteger(rf_settings_tile_width ?? '960px'),
    inlineHeight: pxToInteger(rf_settings_tile_height ?? '250px'),
    closeButtonEnabled: rf_settings_close_button_enabled === 'true',
    closeButtonColor,
    closeButtonSize,
    closeButtonPosition,
    countDown: parseInt(getTimeout(rf_settings_close_seconds), 10),
    userInteraction: rf_settings_tile_interaction,
    accessibilityLabel,
  };
};

const extractHyperLinkedText = (text?: string): LinkedString[] | undefined => {
  if (!text) return undefined;
  const pattern = /\[\[(.*?)\|(.*?)]]/g;
  const textComponents = text.split(pattern);
  const isValidUrl = (urlString: string) => {
    try {
      // eslint-disable-next-line no-new
      new URL(urlString);
      return true;
    } catch (e) {
      return false;
    }
  };

  const result = textComponents.reduce(
    (accu: Array<LinkedString>, curr: string) => {
      if (isValidUrl(curr)) {
        const prev = accu[accu.length - 1];
        if (prev) {
          accu[accu.length - 1] = { text: prev.text, url: curr };
        }
      } else {
        accu.push({ text: curr, url: undefined });
      }
      return accu;
    },
    []
  );
  return result;
};

const getPopupSize = (
  sizeType: string,
  screenWidth: number,
  screenHeight: number
) => {
  let popupSize = Math.min(screenWidth, screenHeight);
  switch (sizeType) {
    case 'large':
      popupSize *= 0.9;
      break;
    case 'medium':
      popupSize *= 0.75;
      break;
    case 'small':
      popupSize *= 0.6;
      break;
    default:
      popupSize *= 0.75;
      break;
  }
  return popupSize;
};

export const extractModalParams = (
  path: PathItem,
  screenWidth: number,
  screenHeight: number
): ModalParameters => {
  const {
    actions: {
      rf_settings_pop_up_size,
      rf_widget_height,
      rf_widget_width,
      rf_widget_position,
      rf_banner_position_offset_x,
      rf_banner_position_offset_y,
      rf_settings_privacy_policy_text,
      rf_settings_timer_font_size,
      rf_retention_button_border_radius,
      rf_retention_button_border_color,
      rf_retention_button_border_thickness,
      rf_settings_close_button_enabled = 'false',
      rf_settings_click_outside_close_enabled = 'false',
      button_absolute_position = 'false',
      button_width,
      button_width_percent,
      button_height,
      button_bottom_padding,
      rf_retention_button_font_size,
      rf_settings_animation_type = 'none',
      rf_retention_survey_selected = 'false',
      rf_retention_survey_options_total = '0',
      rf_retention_survey_options_font_size = '16px',
      rf_retention_survey_option_1_label = '',
      rf_retention_survey_option_2_label = '',
      rf_retention_survey_option_3_label = '',
      rf_retention_survey_option_4_label = '',
      rf_retention_survey_option_5_label = '',
      rf_retention_survey_option_1_value = '',
      rf_retention_survey_option_2_value = '',
      rf_retention_survey_option_3_value = '',
      rf_retention_survey_option_4_value = '',
      rf_retention_survey_option_5_value = '',
      rf_retention_survey_top_margin = '0px',
      rf_settings_fill_color = '#FFFFFF',
    },
    path_type,
  } = path;
  const { actions } = path;
  let modalWidth: number = 0;
  let modalHeight: number = 0;
  let modalOffsetX = 0;
  let modalOffsetY = 0;
  let modalPosition = 'center';

  if (path_type === PathType.INTERSTITIAL) {
    modalWidth = screenWidth;
    modalHeight = screenHeight;
  } else if (rf_settings_pop_up_size) {
    // popup only
    modalWidth = getPopupSize(
      rf_settings_pop_up_size,
      screenWidth,
      screenHeight
    );
    modalHeight = modalWidth;
  } else {
    if (rf_widget_height && rf_widget_width) {
      // bottom banner only
      modalWidth = pxToInteger(rf_widget_width);
      modalHeight = pxToInteger(rf_widget_height);
      if (rf_widget_position) {
        modalPosition = rf_widget_position;
        if (rf_banner_position_offset_x)
          modalOffsetX = pxToInteger(rf_banner_position_offset_x);
        if (rf_banner_position_offset_y) {
          modalOffsetY = pxToInteger(rf_banner_position_offset_y);
        }
      }
    } else {
      // popup only
      const prompt_width_percent = 70 / 100; // future
      modalWidth = screenWidth * prompt_width_percent;
      modalHeight = screenHeight * prompt_width_percent;
    }
  }

  const button1 = {
    label: actions.rf_retention_button1_text,
    textColor: actions.button1_text_color ?? '#3096ED',
    textHighlightColor: actions.button1_highlight_color ?? '#3096ED',
    bgColor: actions.button1_bg_color ?? '#3096ED',
    bgHighlightColor: actions.button1_focus_bg_color ?? '#3096ED',
    width: pxToInteger(actions.button1_width ?? '100px'),
    height: pxToInteger(actions.button1_height ?? '100px'),
    position_x: pxToInteger(actions.button1_position_x ?? '100px'),
    position_y: pxToInteger(actions.button1_position_y ?? '100px'),
  };
  let button2;
  if (actions.rf_settings_confirm_button_2_enabled === 'true') {
    button2 = {
      label: actions.rf_retention_button2_text,
      textColor: actions.button2_text_color ?? '#3096ED',
      textHighlightColor: actions.button2_highlight_color ?? '#3096ED',
      bgColor: actions.button2_bg_color ?? '#3096ED',
      bgHighlightColor: actions.button2_focus_bg_color ?? '#3096ED',
      width: pxToInteger(actions.button2_width ?? '100px'),
      height: pxToInteger(actions.button2_height ?? '100px'),
      position_x: pxToInteger(actions.button2_position_x ?? '200px'),
      position_y: pxToInteger(actions.button2_position_y ?? '200px'),
    };
  }
  let button3;
  if (actions.rf_settings_cancel_button_enabled === 'true') {
    button3 = {
      label: actions.rf_retention_button3_text,
      textColor: actions.button3_text_color ?? '#3096ED',
      textHighlightColor: actions.button3_highlight_color ?? '#3096ED',
      bgColor: actions.button3_bg_color ?? '#3096ED',
      bgHighlightColor: actions.button3_focus_bg_color ?? '#3096ED',
      width: pxToInteger(actions.button3_width ?? '100px'),
      height: pxToInteger(actions.button3_height ?? '100px'),
      position_x: pxToInteger(actions.button3_position_x ?? '300px'),
      position_y: pxToInteger(actions.button3_position_y ?? '300px'),
    };
  }
  let countDownPrompt = ' seconds remaining';
  if (actions.rf_settings_close_seconds_text) {
    countDownPrompt = actions.rf_settings_close_seconds_text;
  }
  let countDownPromptInvisible = false;
  if (actions.rf_settings_hide_timer_text === 'true') {
    countDownPromptInvisible = true;
  }
  const countDownPromptFontSize = pxToInteger(
    rf_settings_timer_font_size ?? '12px'
  );
  const countDownPromptColor =
    actions.rf_settings_timer_font_color ?? '#FFFFFF';
  const countDown = parseInt(getTimeout(actions.rf_settings_close_seconds), 10);
  const privacyTextAndLinks = extractHyperLinkedText(
    rf_settings_privacy_policy_text
  );
  const buttonBorderRadius = pxToInteger(
    rf_retention_button_border_radius ?? '4px'
  );
  const buttonBorderColor = rf_retention_button_border_color ?? '#00000000';
  const buttonBorderThickness = pxToInteger(
    rf_retention_button_border_thickness ?? '1px'
  );
  let buttonWidthPercent;
  if (button_width_percent) {
    const numValue = parseInt(button_width_percent, 10);
    if (!isNaN(numValue)) {
      buttonWidthPercent = `${numValue}%`;
    }
  }

  return {
    modalWidth,
    modalHeight,
    modalOffsetX,
    modalOffsetY,
    modalPosition,
    button1,
    button2,
    button3,
    buttonAbsolutePosition: button_absolute_position === 'true',
    buttonWidth: pxToInteger(button_width ?? '0px'),
    buttonWidthPercent,
    buttonHeight: pxToInteger(button_height ?? '40px'),
    buttonBottomPadding: pxToInteger(button_bottom_padding ?? '10px'),
    buttonFontSize: pxToInteger(rf_retention_button_font_size ?? '14px'),
    buttonBorderRadius,
    buttonBorderColor,
    buttonBorderThickness,
    countDownPrompt,
    countDownPromptColor,
    countDownPromptFontSize,
    countDownPromptInvisible,
    countDown,
    privacyTextAndLinks,
    closeButtonEnabled: rf_settings_close_button_enabled === 'true',
    modallessDismissable: rf_settings_click_outside_close_enabled === 'true',
    animationType: rf_settings_animation_type,
    surveySelected: rf_retention_survey_selected === 'true',
    surveyOptionsTotal: parseInt(rf_retention_survey_options_total, 10),
    surveyOptionsFontSize: rf_retention_survey_options_font_size,
    surveyOption1Label: rf_retention_survey_option_1_label,
    surveyOption2Label: rf_retention_survey_option_2_label,
    surveyOption3Label: rf_retention_survey_option_3_label,
    surveyOption4Label: rf_retention_survey_option_4_label,
    surveyOption5Label: rf_retention_survey_option_5_label,
    surveyOption1Value: rf_retention_survey_option_1_value,
    surveyOption2Value: rf_retention_survey_option_2_value,
    surveyOption3Value: rf_retention_survey_option_3_value,
    surveyOption4Value: rf_retention_survey_option_4_value,
    surveyOption5Value: rf_retention_survey_option_5_value,
    surveyTopMargin: rf_retention_survey_top_margin,
    fillColor: rf_settings_fill_color,
  };
};

export const extractVideoModalParams = (
  path: PathItem,
  screenWidth: number,
  screenHeight: number
): VideoModalParameters => {
  const {
    actions: {
      // rf_settings_video_width,
      // rf_settings_video_height,
      rf_settings_video_loop: loopVideo = '',
      rf_settings_video_controls: showControls = '',
      rf_settings_video_preload: preload = '',
      rf_settings_video_poster: poster = '',
      rf_settings_video_src: url = '',
      rf_settings_video_media_type: videoFormat = '',
      rf_settings_video_muted: mute = '',
      rf_settings_privacy_policy_text,
    },
  } = path;
  const modalParams = extractModalParams(path, screenWidth, screenHeight);
  const modalWidth = Math.round(screenWidth * 0.8);
  const modalHeight = Math.round((modalWidth * 9) / 16);
  let privacyTextAndLinks = extractHyperLinkedText(
    rf_settings_privacy_policy_text
  );

  // const modalWidth = rf_settings_video_width
  //   ? pxToInteger(rf_settings_video_width)
  //   : Math.round(screenWidth * 0.7);
  // const modalHeight = rf_settings_video_height
  //   ? pxToInteger(rf_settings_video_height)
  //   : Math.round(screenHeight * 0.7);
  return {
    ...modalParams,
    modalWidth,
    modalHeight,
    loopVideo: loopVideo === 'true',
    showControls: showControls === 'true',
    preload: preload === 'true',
    poster,
    url,
    videoFormat,
    mute: mute === 'true',
    privacyTextAndLinks,
  };
};

export class PromptCore {
  private promptEnabled: boolean = true;
  private pingInterval: number = InitPingInterval;
  private api: PromptApi;
  private currentScreenName: string;
  private actions?: ActionsData = undefined;
  private localStorage: LocalStorageUtils;

  private async pingHandler(): Promise<void> {
    try {
      if (this.promptEnabled) {
        const data = await this.api.ping({
          event: this.currentScreenName,
          type: 'screen',
        });
        if (data) {
          this.pingInterval = data.configs?.ping_frequency ?? InitPingInterval;
          this.actions = data;
          console.log(
            `ping received with ${data.paths?.length ?? 0} available paths. next ping in ${this.pingInterval} seconds`
          );
          if (this.actions.reset) {
            await this.api.goalResetAll();
          }
        }
      }
    } catch (error) {
      console.error(JSON.stringify(error));
      this.pingInterval = Math.min(
        this.pingInterval * 2,
        MaxPingBackoffSeconds
      );
    }
    setTimeout(() => this.pingHandler(), this.pingInterval * 1000);
  }

  constructor(
    appId: string,
    userId: string,
    device: DeviceInfo,
    localStorage: LocalStorage
  ) {
    this.api = new PromptApi(appId, userId, device);
    this.currentScreenName = '';
    this.localStorage = new LocalStorageUtils(localStorage);
    this.pingHandler();
  }

  isInitialized(): boolean {
    return this.actions !== undefined;
  }

  getApi(): PromptApi {
    return this.api;
  }

  getPaths(): PathItem[] {
    return this.actions?.paths ?? [];
  }

  getLocalStorage(): LocalStorageUtils {
    return this.localStorage;
  }

  enablePrompt(enabled: boolean) {
    this.promptEnabled = enabled;
  }

  private async getPath(clickId: string): Promise<CandidatePathItem> {
    const nameMatches = (
      nameSrc: string,
      nameToCompare: string,
      useRegex: boolean
    ): boolean => {
      let matched = false;
      if (useRegex) {
        const regex = new RegExp(nameSrc);
        matched = regex.test(nameToCompare);
      } else {
        matched = matchWildCharStrings(nameSrc, nameToCompare);
      }
      return matched;
    };

    const paths =
      this.actions?.paths?.filter(
        (path) =>
          path.path_type === PathType.MODAL ||
          path.path_type === PathType.INTERSTITIAL ||
          path.path_type === PathType.VIDEO ||
          path.path_type === PathType.BOTTOM_BANNER
      ) ?? [];

    let delaySeconds = 0;
    const matchedPath = paths.find((path) => {
      const matchedTrigger = path.triggers?.find((trigger) => {
        const urlPath = trigger.url_path;
        const useRegex = trigger.use_regex;
        const matched = nameMatches(urlPath, this.currentScreenName, useRegex);
        if (matched) {
          if ((!trigger.click_id && !clickId) || trigger.click_id === clickId) {
            delaySeconds = trigger.delay_seconds ?? 0;
            return true;
          }
        }
        return false;
      });
      return matchedTrigger;
    });
    if (matchedPath) {
      const suppressed = await this.isSuppressedByHoldout(matchedPath);
      if (suppressed) {
        return {
          path: undefined,
          delaySeconds: 0,
          result: { code: PromptResultCode.HOLDOUT },
        };
      }
      const overlayEnabled = await this.localStorage.isOverlayEnabled(
        matchedPath.id
      );
      if (!overlayEnabled) {
        return {
          path: undefined,
          delaySeconds: 0,
          result: { code: PromptResultCode.SUPPRESSED },
        };
      }
      return { path: matchedPath, delaySeconds };
    }
    return {
      path: undefined,
      delaySeconds: 0,
      result: {
        code: PromptResultCode.NOT_APPLICABLE,
        value: { error: `applicable Prompt not found` },
      },
    };
  }

  async onInlineClicked(
    pathId: string,
    actionGroupId?: string
  ): Promise<PromptResult> {
    try {
      if (!this.promptEnabled) {
        return {
          code: PromptResultCode.DISABLED,
        };
      }
      const path = this.actions?.paths?.find((item) => item.id === pathId);
      if (path) {
        await this.api.goal(pathId, actionGroupId);
        return {
          code: PromptResultCode.BUTTON1,
          meta: path.actions.rf_metadata,
          value: decodeDeeplink(path.actions.rf_settings_deeplink),
        };
      }
      return {
        code: PromptResultCode.NOT_APPLICABLE,
        value: { error: `invalid path id, ${pathId}` },
      };
    } catch (error: any) {
      console.error(JSON.stringify(error));
      return {
        code: PromptResultCode.ERROR,
        value: { error },
      };
    }
  }

  async onInlineViewed(
    pathId: string,
    actionGroupId?: string
  ): Promise<PromptResult> {
    try {
      if (!this.promptEnabled) {
        return {
          code: PromptResultCode.DISABLED,
        };
      }
      const path = this.actions?.paths?.find((item) => item.id === pathId);
      if (path) {
        await this.api.impression(pathId, actionGroupId);
        return {
          code: PromptResultCode.IMPRESSION,
        };
      }
      return {
        code: PromptResultCode.NOT_APPLICABLE,
        value: { error: `invalid path id, ${pathId}` },
      };
    } catch (error: any) {
      console.error(JSON.stringify(error));
      return {
        code: PromptResultCode.ERROR,
        value: { error },
      };
    }
  }

  async onButtonClicked(clickId: string): Promise<CandidatePathItem> {
    try {
      if (!this.promptEnabled) {
        return {
          path: undefined,
          delaySeconds: 0,
          result: { code: PromptResultCode.DISABLED },
        };
      }
      const candidate = await this.getPath(clickId);
      return candidate;
    } catch (error: any) {
      console.error(JSON.stringify(error));
      return {
        path: undefined,
        delaySeconds: 0,
        result: {
          code: PromptResultCode.ERROR,
          value: { error },
        },
      };
    }
  }

  async onScreenChanged(screenName: string): Promise<CandidatePathItem> {
    try {
      if (!this.promptEnabled) {
        return {
          path: undefined,
          delaySeconds: 0,
          result: { code: PromptResultCode.DISABLED },
        };
      }
      this.currentScreenName = screenName;
      const candidate = await this.getPath('');
      return candidate;
    } catch (error: any) {
      console.error(JSON.stringify(error));
      return {
        path: undefined,
        delaySeconds: 0,
        result: {
          code: PromptResultCode.ERROR,
          value: { error },
        },
      };
    }
  }

  setUserId(userId: string) {
    this.api.setUserId(userId);
  }

  getUserId() {
    return this.api.getUserId();
  }

  private async isSuppressedByHoldout(path: PathItem) {
    const isPresented = await this.localStorage
      .get()
      .hasKey(this.localStorage.getHoldoutKey(path.id));
    if (path.holdout) {
      if (!isPresented) {
        const actionGroupId = path.action_group_id ?? '';
        const holdout = await this.api.holdout(path.id, actionGroupId);
        if (holdout.success) {
          await this.localStorage
            .get()
            .createKey(this.localStorage.getHoldoutKey(path.id), 'true');
        }
      }
      return true;
    }
    return false;
  }

  async getInlines(type: string): Promise<PathItem[]> {
    try {
      if (!this.promptEnabled) return [];
      let inlines: PathItem[] = [];
      for (const path of this.actions?.paths ?? []) {
        const isSuppressed = await this.isSuppressedByHoldout(path);
        if (
          (!isSuppressed &&
            path.actions.rf_settings_zone_id &&
            path.actions.rf_settings_zone_id === type) ||
          type === InlineType.all
        ) {
          inlines.push(path);
        }
      }
      inlines = inlines.sort((a, b) => a.order - b.order);
      return inlines.length > 0 ? [inlines[0] as PathItem] : [];
    } catch (error: any) {
      console.error(JSON.stringify(error));
      return [];
    }
  }

  async customTrack(customFieldId: string) {
    try {
      if (!this.promptEnabled) return;
      return this.api.customTrack(customFieldId);
    } catch (error: any) {
      console.error(JSON.stringify(error));
    }
  }

  async resetGoal() {
    try {
      if (!this.promptEnabled) return;
      await this.localStorage.reset(false);
      return this.api.goalResetAll();
    } catch (error: any) {
      console.error(JSON.stringify(error));
    }
  }

  getMeta(): {
    [key: string]: any;
  } {
    try {
      if (!this.promptEnabled) return {};
      const paths = this.actions?.paths?.filter(
        (path) =>
          path.path_type === PathType.INVISIBLE && path.actions.rf_metadata
      );
      return (
        paths?.reduce(
          (sum, path) => {
            const pathMeta = path.actions.rf_metadata!;
            return { ...sum, ...pathMeta };
          },
          {} as { [key: string]: any }
        ) ?? {}
      );
    } catch (error: any) {
      console.error(JSON.stringify(error));
      return {};
    }
  }

  private path2Prompt(pathItem: PathItem): Prompt {
    const { id, path_type, actions, action_group_id: actionGroupId } = pathItem;
    const {
      rf_settings_deeplink,
      rf_metadata,
      rf_settings_apple_inapp_product_id,
      rf_settings_android_inapp_product_id,
      rf_settings_timer_font_size,
      rf_retention_button_border_radius,
      rf_retention_button_border_color,
      rf_retention_button_border_thickness,
    } = actions;

    const button1 = {
      label: actions.rf_retention_button1_text,
      textColor: actions.button1_text_color ?? '#3096ED',
      textHighlightColor: actions.button1_highlight_color ?? '#3096ED',
      bgColor: actions.button1_bg_color ?? '#3096ED',
      bgHighlightColor: actions.button1_focus_bg_color ?? '#3096ED',
      width: pxToInteger(actions.button1_width ?? '100px'),
      height: pxToInteger(actions.button1_height ?? '100px'),
      position_x: pxToInteger(actions.button1_position_x ?? '100px'),
      position_y: pxToInteger(actions.button1_position_y ?? '100px'),
    };
    let button2;
    if (actions.rf_settings_confirm_button_2_enabled === 'true') {
      button2 = {
        label: actions.rf_retention_button2_text,
        textColor: actions.button2_text_color ?? '#3096ED',
        textHighlightColor: actions.button2_highlight_color ?? '#3096ED',
        bgColor: actions.button2_bg_color ?? '#3096ED',
        bgHighlightColor: actions.button2_focus_bg_color ?? '#3096ED',
        width: pxToInteger(actions.button2_width ?? '100px'),
        height: pxToInteger(actions.button2_height ?? '100px'),
        position_x: pxToInteger(actions.button2_position_x ?? '200px'),
        position_y: pxToInteger(actions.button2_position_y ?? '200px'),
      };
    }
    let button3;
    if (actions.rf_settings_cancel_button_enabled === 'true') {
      button3 = {
        label: actions.rf_retention_button3_text,
        textColor: actions.button3_text_color ?? '#3096ED',
        textHighlightColor: actions.button3_highlight_color ?? '#3096ED',
        bgColor: actions.button3_bg_color ?? '#3096ED',
        bgHighlightColor: actions.button3_focus_bg_color ?? '#3096ED',
        width: pxToInteger(actions.button3_width ?? '100px'),
        height: pxToInteger(actions.button3_height ?? '100px'),
        position_x: pxToInteger(actions.button3_position_x ?? '300px'),
        position_y: pxToInteger(actions.button3_position_y ?? '300px'),
      };
    }
    let countDownPrompt = '';
    if (actions.rf_settings_close_seconds_text) {
      countDownPrompt = actions.rf_settings_close_seconds_text;
    }
    let countDownPromptInvisible = false;
    if (actions.rf_settings_hide_timer_text === 'true') {
      countDownPromptInvisible = true;
    }
    const countDownPromptColor =
      actions.rf_settings_timer_font_color ?? '#FFFFFF';
    const countDown = parseInt(
      getTimeout(actions.rf_settings_close_seconds),
      10
    );
    const inAppSku =
      this.api.getDevice().device_type === 'ios'
        ? rf_settings_apple_inapp_product_id
        : rf_settings_android_inapp_product_id;
    const { poster: horizontalPoster, accessibilityLabel } =
      extractInlineParams(
        pathItem,
        this.api.getDevice().device_type,
        this.api.getDevice().device_category
      );
    const countDownPromptFontSize = pxToInteger(
      rf_settings_timer_font_size ?? '12px'
    );
    const buttonBorderRadius = pxToInteger(
      rf_retention_button_border_radius ?? '4px'
    );
    const buttonBorderColor = rf_retention_button_border_color ?? '#00000000';
    const buttonBorderThickness = pxToInteger(
      rf_retention_button_border_thickness ?? '1px'
    );

    const safeApiCall = async (
      functor: any,
      successCode: PromptResultCode
    ): Promise<PromptResult> => {
      try {
        await functor();
        return {
          code: successCode,
        };
      } catch (error) {
        console.error(JSON.stringify(error));
        return {
          code: PromptResultCode.ERROR,
          value: { error },
        };
      }
    };

    const prompt = {
      id,
      type: (path_type ?? -1) as PathType,
      actions,
      actionGroupId,
      inAppSku,
      deviceMeta: rf_metadata,
      deeplink: decodeDeeplink(rf_settings_deeplink),
      button1,
      button2,
      button3,
      buttonBorderRadius,
      buttonBorderColor,
      buttonBorderThickness,
      countDownPrompt,
      countDownPromptColor,
      countDownPromptFontSize,
      countDownPromptInvisible,
      countDown,
      horizontalPoster,
      accessibilityLabel,
      impression: async () =>
        safeApiCall(
          async () => this.api.impression(id, actionGroupId),
          PromptResultCode.IMPRESSION
        ),
      dismiss: async () =>
        safeApiCall(
          async () => this.api.dismiss(id, 'dismiss', actionGroupId),
          PromptResultCode.DISMISS
        ),
      timeout: async () =>
        safeApiCall(
          async () => this.api.dismiss(id, 'timeout', actionGroupId),
          PromptResultCode.TIMEOUT
        ),
      holdout: async () =>
        safeApiCall(
          async () => this.api.holdout(id, actionGroupId),
          PromptResultCode.HOLDOUT
        ),
      goal: async () =>
        safeApiCall(
          async () => this.api.goal(id, actionGroupId),
          PromptResultCode.BUTTON1
        ),
      goal2: async () =>
        safeApiCall(
          async () => this.api.goal(id, actionGroupId, undefined, 'accept2'),
          PromptResultCode.BUTTON2
        ),
      decline: async () =>
        safeApiCall(
          async () => this.api.dismiss(id, 'decline', actionGroupId),
          PromptResultCode.BUTTON3
        ),
      pathItem,
    };
    return prompt;
  }

  getPrompt(id: string): Prompt | null {
    try {
      let prompt = null;
      const pathItem = this.actions?.paths?.find((path) => path.id === id);
      if (pathItem) {
        prompt = this.path2Prompt(pathItem);
      }
      return prompt;
    } catch (error: any) {
      console.error(JSON.stringify(error));
      return null;
    }
  }

  getPrompts(type: PathType, zoneId?: string): Prompt[] {
    try {
      const pathItems =
        this.actions?.paths?.filter((path) => {
          if (
            path.path_type === (type as PathType) ||
            PathType.ALL === (type as PathType)
          ) {
            if (!zoneId) return true;
            if (zoneId && zoneId === path.actions.rf_settings_zone_id)
              return true;
          }
          return false;
        }) ?? [];
      const prompts = pathItems.map((pathItem) => this.path2Prompt(pathItem));
      return prompts;
    } catch (error: any) {
      console.error(JSON.stringify(error));
      return [];
    }
  }

  async getTriggerablePrompts(
    screenName: string = '*',
    clickId: string = '*',
    type: PathType = PathType.MODAL,
    zoneId?: string
  ): Promise<Prompt[]> {
    try {
      if (!screenName && !clickId) return [];
      let prompts: (Prompt | null)[] = this.getPrompts(type, zoneId);
      prompts = await Promise.all(
        prompts.map(async (prompt) => {
          if (prompt) {
            const matchedTrigger = prompt.pathItem.triggers?.find((trigger) => {
              const matchedScreenName = matchWildCharStrings(
                trigger.url_path,
                screenName
              );
              const matchedClickId = matchWildCharStrings(
                trigger.click_id ?? '',
                clickId
              );
              return matchedScreenName && matchedClickId;
            });
            if (matchedTrigger) {
              const suppressed = await this.isSuppressedByHoldout(
                prompt.pathItem
              );
              if (suppressed) return null;
              const overlayEnabled = await this.localStorage.isOverlayEnabled(
                prompt.pathItem.id
              );
              if (!overlayEnabled) return null;
              return prompt;
            }
          }
          return null;
        })
      );
      prompts = prompts.filter((prompt) => prompt);
      return prompts as Prompt[];
    } catch (error: any) {
      console.error(JSON.stringify(error));
      return [];
    }
  }
}
