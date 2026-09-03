export interface DeviceInfo {
  device_manufacturer: string;
  device_model: string;
  device_type: 'ios' | 'android_os' | 'tv_os' | 'android_tv' | 'unknown';
  device_category:
    | 'iphone'
    | 'ipad'
    | 'phone'
    | 'tablet'
    | 'tv'
    | 'fire_tv'
    | 'unknown';
  device_form: 'phone' | 'tablet' | 'tv';
}

export enum PathType {
  ALL = -1,
  INVISIBLE = 1,
  MODAL = 2,
  HORIZONTAL = 5,
  VIDEO = 6,
  TEXT = 7,
  VERTICAL = 8,
  TILE = 9,
  INTERSTITIAL = 10,
  NOTIFICATION = 11,
  EMAIL = 12,
  BOTTOM_BANNER = 13,
}

export const getPathTypeName = (type?: PathType): string => {
  switch (type) {
    case PathType.MODAL:
      return 'popup prompt';
    case PathType.HORIZONTAL:
      return 'horizontal banner prompt';
    case PathType.INTERSTITIAL:
      return 'interstitial prompt';
    case PathType.BOTTOM_BANNER:
      return 'bottom banner prompt';
    default:
      return 'unsupported prompt';
  }
};

export enum PromptResultCode {
  // Success codes
  OK = 1,

  // Error codes
  ERROR = -100,
  NOT_APPLICABLE = -101,
  DISABLED = -102,
  SUPPRESSED = -103,

  // Interactions
  IMPRESSION = 100,
  BUTTON1 = 101, // ACCEPT
  BUTTON2 = 102, // ACCEPT2
  BUTTON3 = 103, // DECLINE
  DISMISS = 110,
  TIMEOUT = 111,
  HOLDOUT = 120,
}

export interface PromptResult {
  code: PromptResultCode;
  value?: { [key: string]: any };
  promptMeta?: { [key: string]: any };
  meta?: { [key: string]: any };
}

export interface Action {
  rf_retention_title?: string;
  rf_retention_signature?: string;
  rf_retention_message?: string;
  rf_retention_confirm_button_text?: string;
  rf_retention_cancel_button_text?: string;
  rf_retention_offer_value?: string;
  rf_retention_signature_header?: string;
  rf_retention_acceptance_message?: string;
  rf_retention_acceptance_title?: string;
  rf_settings_redirect_location?: string;
  rf_settings_close_seconds?: string;
  rf_settings_close_seconds_text?: string;
  rf_settings_fill_color?: string;
  rf_retention_confirm_button_text_color?: string;
  rf_retention_cancel_button_text_color?: string;
  rf_settings_timer_font_color?: string;
  rf_settings_background_color?: string;
  rf_settings_email?: string;
  rf_settings_bg_image?: string;
  rf_settings_bg_image_composite?: string;
  rf_settings_close_button_enabled?: string;
  rf_settings_text_container_max_width?: string;
  rf_settings_bg_image_ios_iphone_composite?: string;
  rf_settings_bg_image_ios_ipad_composite?: string;
  rf_settings_bg_image_android_os_phone_composite?: string;
  rf_settings_bg_image_android_os_tablet_composite?: string;
  rf_settings_bg_image_android_tv_tv_composite?: string;
  rf_settings_bg_image_roku_os_tv_composite?: string;
  rf_settings_roku_product_id?: string;
  rf_settings_zone_id?: string;
  rf_settings_timeout_interval?: string;
  rf_settings_accept_interval?: string;
  rf_settings_decline_interval?: string;
  rf_settings_dismiss_interval?: string;
  rf_settings_deeplink?: string;
  rf_settings_cancel_button_enabled?: string;
  rf_settings_timer_font_size?: string;
  rf_metadata?: { [key: string]: any };
  rf_retention_confirm_button_2_text?: string;
  rf_retention_confirm_button_2_text_color?: string;
  rf_settings_pop_up_size?: string;
  rf_widget_position?: string;
  rf_settings_tile_width?: string;
  rf_settings_tile_height?: string;
  rf_banner_position_offset_x?: string;
  rf_banner_position_offset_y?: string;
  rf_settings_title_font_size?: string;
  rf_settings_message_font_size?: string;
  rf_settings_video_src?: string;
  rf_settings_bg_image_color?: string;
  rf_retention_align?: string;
  rf_settings_title_padding_top?: string;
  rf_retention_button_border_radius?: string;
  rf_retention_button_border_color?: string;
  rf_retention_button_border_thickness?: string;
  rf_settings_privacy_policy_text?: string;
  rf_settings_bg_image_android_phone_composite?: string;
  rf_retention_button1_text?: string;
  rf_retention_button2_text?: string;
  rf_retention_button3_text?: string;
  rf_settings_bg_image_android_os_phone_2x_composite?: string;
  rf_settings_bg_image_ios_iphone_2x_composite?: string;
  button1_bg_color?: string;
  button1_focus_bg_color?: string;
  button1_text_color?: string;
  button1_highlight_color?: string;
  button2_bg_color?: string;
  button2_focus_bg_color?: string;
  button2_text_color?: string;
  button2_highlight_color?: string;
  button3_bg_color?: string;
  button3_focus_bg_color?: string;
  button3_text_color?: string;
  button3_highlight_color?: string;
  button1_width?: string;
  button1_height?: string;
  button1_position_x?: string;
  button1_position_y?: string;
  button2_width?: string;
  button2_height?: string;
  button2_position_x?: string;
  button2_position_y?: string;
  button3_width?: string;
  button3_height?: string;
  button3_position_x?: string;
  button3_position_y?: string;
  button_absolute_position?: string;
  button_width?: string;
  button_width_percent?: string;
  button_height?: string;
  button_bottom_padding?: string;
  rf_retention_button_font_size?: string;
  rf_settings_confirm_button_2_enabled?: string;
  rf_settings_hide_timer_text?: string;
  rf_widget_height?: string;
  rf_widget_width?: string;
  rf_settings_video_width?: string;
  rf_settings_video_height?: string;
  rf_settings_video_loop?: string;
  rf_settings_video_controls?: string;
  rf_settings_video_preload?: string;
  rf_settings_video_poster?: string;
  rf_settings_video_media_type?: string;
  rf_settings_video_muted?: string;
  rf_settings_apple_inapp_product_id?: string;
  rf_settings_android_inapp_product_id?: string;
  rf_settings_click_outside_close_enabled?: string;
  rf_settings_tile_interaction?: string;
  accessibility_label?: string;
  rf_settings_animation_type?: 'none' | 'slide' | 'fade' | undefined;
  rf_retention_survey_selected?: string;
  rf_retention_survey_options_total?: string;
  rf_retention_survey_options_font_size?: string;
  rf_retention_survey_option_1_label?: string;
  rf_retention_survey_option_2_label?: string;
  rf_retention_survey_option_3_label?: string;
  rf_retention_survey_option_4_label?: string;
  rf_retention_survey_option_5_label?: string;
  rf_retention_survey_option_1_value?: string;
  rf_retention_survey_option_2_value?: string;
  rf_retention_survey_option_3_value?: string;
  rf_retention_survey_option_4_value?: string;
  rf_retention_survey_option_5_value?: string;
  rf_retention_survey_top_margin?: string;
}

export interface Trigger {
  url_path: string;
  use_regex: boolean;
  trigger_type?: string;
  delay_seconds?: number;
  click_id?: string;
}

export interface Sequence {
  id: number;
  order: number;
  continue_interaction_types: string[];
}

export interface PathItem {
  actions: Action;
  path_type?: number;
  device_type?: string;
  name: string;
  id: string;
  holdout?: boolean;
  action_group_id?: string;
  action_group_name?: string;
  experiment_name?: string;
  experiment_id?: string;
  triggers?: Trigger[];
  order: number;
  sequence?: Sequence;
  consent_categories?: string[];
}

export interface Usage {
  values: string[];
  event: string;
  id: string;
  type: string;
}

export interface Configs {
  ping_frequency?: number;
  usage?: Usage[];
}

export interface ActionsData {
  paths?: PathItem[];
  configs?: Configs;
  reset?: boolean;
  anonymous_user_id?: string;
}

export interface PromptResultCodeObject {
  value: PromptResultCode;
  extra: {
    meta?: any;
    deeplink?: string;
  };
}

export interface Holdout {
  success: boolean;
}

export interface LocalStorage {
  createKey(keyName: string, keyValue: string): Promise<void>;
  getValue(keyName: string): Promise<string | null>;
  deleteKey(keyName: string): Promise<void>;
  hasKey(keyName: string): Promise<boolean>;
  getAllKeys(): Promise<readonly string[]>;
}

export enum InlineType {
  all = 'all',
  general = 'android-banner',
  featured = 'featured',
  horizontal = 'horizontal',
  billboard = 'billboard',
  redfit_shop_banner = 'redfit-shop-banner',
  redflix = 'redflix-featured',
}

export interface ModalButton {
  label?: string;
  textColor: string;
  textHighlightColor: string;
  bgColor: string;
  bgHighlightColor: string;
  width: number;
  height: number;
  position_x: number;
  position_y: number;
}

export interface ModalParameters {
  modalWidth: number;
  modalHeight: number;
  modalOffsetX: number;
  modalOffsetY: number;
  modalPosition: string;
  button1: ModalButton;
  button2?: ModalButton;
  button3?: ModalButton;
  buttonAbsolutePosition?: boolean;
  buttonWidth: number;
  buttonWidthPercent?: string;
  buttonHeight: number;
  buttonBottomPadding: number;
  buttonFontSize: number;
  buttonBorderRadius: number;
  buttonBorderColor: string;
  buttonBorderThickness: number;
  countDownPrompt: string;
  countDownPromptColor: string;
  countDownPromptFontSize: number;
  countDownPromptInvisible: boolean;
  countDown: number;
  privacyTextAndLinks?: LinkedString[];
  closeButtonEnabled: boolean;
  modallessDismissable: boolean;
  animationType: 'none' | 'slide' | 'fade';
  surveySelected: boolean;
  surveyOptionsTotal: number;
  surveyOptionsFontSize: string;
  surveyOption1Label: string;
  surveyOption2Label: string;
  surveyOption3Label: string;
  surveyOption4Label: string;
  surveyOption5Label: string;
  surveyOption1Value: string;
  surveyOption2Value: string;
  surveyOption3Value: string;
  surveyOption4Value: string;
  surveyOption5Value: string;
  surveyTopMargin: string;
  fillColor: string;
}

export interface VideoModalParameters extends ModalParameters {
  loopVideo: boolean;
  showControls: boolean;
  preload: boolean;
  url: string;
  videoFormat: string;
  mute: boolean;
  poster: string;
}

export type LinkedString = {
  text: string;
  url: string | undefined;
};

export interface InlineParams {
  name: string;
  id: string;
  actionGroupId: string;
  poster: string;
  inlineWidth: number;
  inlineHeight: number;
  closeButtonEnabled: boolean;
  closeButtonColor: string;
  closeButtonSize: number;
  closeButtonPosition: number;
  countDown: number;
  userInteraction: string;
  accessibilityLabel?: string;
}

export interface Prompt {
  id: string;
  type: PathType;
  actions: Action;
  actionGroupId?: string;
  inAppSku?: string;
  deviceMeta?: { [key: string]: any };
  deeplink?: { [key: string]: any };
  button1?: ModalButton;
  button2?: ModalButton;
  button3?: ModalButton;
  buttonBorderRadius: number;
  buttonBorderColor: string;
  buttonBorderThickness: number;
  countDownPrompt: string;
  countDownPromptColor: string;
  countDownPromptFontSize: number;
  countDownPromptInvisible: boolean;
  countDown: number;
  horizontalPoster?: string;
  accessibilityLabel?: string;
  consent_categories?: string[];
  impression: () => Promise<PromptResult>;
  dismiss: () => Promise<PromptResult>;
  timeout: () => Promise<PromptResult>;
  holdout: () => Promise<PromptResult>;
  goal: () => Promise<PromptResult>;
  goal2: () => Promise<PromptResult>;
  decline: () => Promise<PromptResult>;
  // internal
  pathItem: PathItem;
}

export enum PrivacyConsentCategory {
  strictlyNecessary = 'strictly_necessary',
  performance = 'performance',
  functional = 'functional',
  targeting = 'targeting',
}
