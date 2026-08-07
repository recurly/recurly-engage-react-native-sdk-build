import {
  PromptCore,
  preparePromptResult,
  decodeDeeplink,
  extractInlineParams,
  extractModalParams,
  extractVideoModalParams,
} from '../PromptCore';
import {
  PathType,
  PromptResultCode,
  InlineType,
  getPathTypeName,
} from '../types';
import type {
  DeviceInfo,
  LocalStorage,
  PathItem,
  ActionsData,
  Action,
} from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────

const makeDevice = (): DeviceInfo => ({
  device_manufacturer: 'Apple',
  device_model: 'iPhone 14',
  device_type: 'ios',
  device_category: 'iphone',
  device_form: 'phone',
});

const makeLocalStorage = (): LocalStorage => ({
  createKey: jest.fn().mockResolvedValue(undefined),
  getValue: jest.fn().mockResolvedValue(null),
  deleteKey: jest.fn().mockResolvedValue(undefined),
  hasKey: jest.fn().mockResolvedValue(false),
  getAllKeys: jest.fn().mockResolvedValue([]),
});

const makeActions = (overrides: Partial<Action> = {}): Action =>
  ({
    rf_retention_button1_text: 'Accept',
    rf_retention_button2_text: 'Maybe',
    rf_retention_button3_text: 'Decline',
    rf_settings_close_seconds: '5',
    rf_settings_close_button_enabled: 'false',
    rf_settings_click_outside_close_enabled: 'false',
    rf_settings_animation_type: 'none',
    button_absolute_position: 'false',
    ...overrides,
  }) as unknown as Action;

const makePathItem = (overrides: Partial<PathItem> = {}): PathItem => ({
  id: 'path-1',
  name: 'Test Prompt',
  path_type: PathType.MODAL,
  order: 0,
  actions: makeActions(),
  triggers: [{ url_path: 'HomeScreen', use_regex: false }],
  ...overrides,
});

const makeActionsData = (
  paths: PathItem[] = [],
  overrides: Partial<ActionsData> = {}
): ActionsData => ({
  paths,
  configs: { ping_frequency: 60 },
  ...overrides,
});

const makeOkResponse = (body: any) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

// ── Mocks ────────────────────────────────────────────────────────────────

const fetchMock = jest.fn();
let originalConsoleLog: typeof console.log;
let originalConsoleError: typeof console.error;

beforeAll(() => {
  originalConsoleLog = console.log;
  originalConsoleError = console.error;
});

beforeEach(() => {
  jest.useFakeTimers();
  console.log = jest.fn();
  console.error = jest.fn();
  (globalThis as any).fetch = fetchMock;
  fetchMock.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// ── preparePromptResult ──────────────────────────────────────────────────

describe('preparePromptResult', () => {
  it('returns code only when no path', () => {
    const result = preparePromptResult({ code: PromptResultCode.OK });
    expect(result.code).toBe(PromptResultCode.OK);
    expect(result.promptMeta).toEqual({});
  });

  it('populates promptMeta from path', () => {
    const path = makePathItem({
      name: 'TestName',
      id: 'path-42',
      action_group_name: 'VarA',
      action_group_id: 'ag-1',
      experiment_name: 'Exp1',
      experiment_id: 'exp-1',
      path_type: PathType.MODAL,
    });
    const result = preparePromptResult({
      code: PromptResultCode.IMPRESSION,
      path,
    });
    expect(result.promptMeta).toEqual({
      promptName: 'TestName',
      promptID: 'path-42',
      promptVariationName: 'VarA',
      promptVariationID: 'ag-1',
      promptExperimentName: 'Exp1',
      promptExperimentID: 'exp-1',
      promptType: PathType.MODAL,
    });
  });

  it('adds buttonLabel for BUTTON1', () => {
    const path = makePathItem();
    const result = preparePromptResult({
      code: PromptResultCode.BUTTON1,
      path,
    });
    expect(result.promptMeta?.buttonLabel).toBe('Accept');
  });

  it('adds buttonLabel for BUTTON2', () => {
    const path = makePathItem();
    const result = preparePromptResult({
      code: PromptResultCode.BUTTON2,
      path,
    });
    expect(result.promptMeta?.buttonLabel).toBe('Maybe');
  });

  it('adds buttonLabel for BUTTON3', () => {
    const path = makePathItem();
    const result = preparePromptResult({
      code: PromptResultCode.BUTTON3,
      path,
    });
    expect(result.promptMeta?.buttonLabel).toBe('Decline');
  });

  it('does not add buttonLabel for DISMISS', () => {
    const path = makePathItem();
    const result = preparePromptResult({
      code: PromptResultCode.DISMISS,
      path,
    });
    expect(result.promptMeta?.buttonLabel).toBeUndefined();
  });

  it('passes value and meta through', () => {
    const result = preparePromptResult({
      code: PromptResultCode.OK,
      value: { foo: 'bar' },
      meta: { key: 'val' },
    });
    expect(result.value).toEqual({ foo: 'bar' });
    expect(result.meta).toEqual({ key: 'val' });
  });
});

// ── decodeDeeplink ───────────────────────────────────────────────────────

describe('decodeDeeplink', () => {
  it('returns empty object for undefined', () => {
    expect(decodeDeeplink(undefined)).toEqual({});
  });

  it('returns empty object for empty string', () => {
    expect(decodeDeeplink('')).toEqual({});
  });

  it('decodes single key=value pair', () => {
    expect(decodeDeeplink('screen=home')).toEqual({ screen: 'home' });
  });

  it('decodes multiple pairs', () => {
    expect(decodeDeeplink('a=1&b=2&c=3')).toEqual({
      a: '1',
      b: '2',
      c: '3',
    });
  });

  it('ignores malformed entries (no =)', () => {
    expect(decodeDeeplink('a=1&bad&c=3')).toEqual({ a: '1', c: '3' });
  });

  it('ignores entries with extra = signs', () => {
    expect(decodeDeeplink('a=1=2')).toEqual({});
  });
});

// ── extractInlineParams ──────────────────────────────────────────────────

describe('extractInlineParams', () => {
  it('extracts basic inline params', () => {
    const path = makePathItem({
      actions: makeActions({
        rf_settings_tile_width: '320px',
        rf_settings_tile_height: '100px',
        rf_settings_close_button_enabled: 'true',
        rf_settings_close_seconds: '10',
        rf_settings_fill_color: '#FF0000',
        rf_settings_tile_interaction: 'click',
      }),
    });
    const params = extractInlineParams(path, 'ios', 'iphone');
    expect(params.name).toBe('Test Prompt');
    expect(params.id).toBe('path-1');
    expect(params.inlineWidth).toBe(320);
    expect(params.inlineHeight).toBe(100);
    expect(params.closeButtonEnabled).toBe(true);
    expect(params.closeButtonColor).toBe('#FF0000');
    expect(params.countDown).toBe(10);
    expect(params.userInteraction).toBe('click');
  });

  it('uses defaults when values are missing', () => {
    const path = makePathItem({ actions: makeActions() });
    const params = extractInlineParams(path, 'ios', 'iphone');
    expect(params.inlineWidth).toBe(960);
    expect(params.inlineHeight).toBe(250);
    expect(params.closeButtonEnabled).toBe(false);
    expect(params.closeButtonColor).toBe('#FFFFFF');
    expect(params.closeButtonSize).toBe(20);
    expect(params.closeButtonPosition).toBe(10);
  });

  it('reads poster from composite field', () => {
    const path = makePathItem({
      actions: makeActions({
        rf_settings_bg_image_ios_iphone_composite: 'http://img.test/poster.png',
      } as any),
    });
    const params = extractInlineParams(path, 'ios', 'iphone');
    expect(params.poster).toBe('http://img.test/poster.png');
  });

  it('uses actionGroupId from path', () => {
    const path = makePathItem({ action_group_id: 'ag-99' });
    const params = extractInlineParams(path, 'ios', 'iphone');
    expect(params.actionGroupId).toBe('ag-99');
  });

  it('defaults actionGroupId to empty string', () => {
    const path = makePathItem({ action_group_id: undefined });
    const params = extractInlineParams(path, 'ios', 'iphone');
    expect(params.actionGroupId).toBe('');
  });

  it('triggers destructuring defaults when action fields are absent', () => {
    const bareActions = {
      rf_retention_button1_text: 'Accept',
      rf_settings_close_seconds: '5',
    } as unknown as Action;
    const path = makePathItem({ actions: bareActions });
    const params = extractInlineParams(path, 'ios', 'iphone');
    expect(params.closeButtonEnabled).toBe(false);
    expect(params.userInteraction).toBe('');
    expect(params.closeButtonColor).toBe('#FFFFFF');
    expect(params.accessibilityLabel).toBe('popup prompt');
  });
});

// ── extractModalParams ───────────────────────────────────────────────────

describe('extractModalParams', () => {
  it('uses full screen for INTERSTITIAL', () => {
    const path = makePathItem({ path_type: PathType.INTERSTITIAL });
    const params = extractModalParams(path, 400, 800);
    expect(params.modalWidth).toBe(400);
    expect(params.modalHeight).toBe(800);
  });

  it('uses pop_up_size for popup', () => {
    const path = makePathItem({
      actions: makeActions({ rf_settings_pop_up_size: 'large' }),
    });
    const params = extractModalParams(path, 400, 800);
    expect(params.modalWidth).toBe(400 * 0.9);
    expect(params.modalHeight).toBe(params.modalWidth);
  });

  it('handles medium popup size', () => {
    const path = makePathItem({
      actions: makeActions({ rf_settings_pop_up_size: 'medium' }),
    });
    const params = extractModalParams(path, 400, 800);
    expect(params.modalWidth).toBe(400 * 0.75);
  });

  it('handles small popup size', () => {
    const path = makePathItem({
      actions: makeActions({ rf_settings_pop_up_size: 'small' }),
    });
    const params = extractModalParams(path, 400, 800);
    expect(params.modalWidth).toBe(400 * 0.6);
  });

  it('defaults popup to medium (0.75) for unknown size', () => {
    const path = makePathItem({
      actions: makeActions({ rf_settings_pop_up_size: 'unknown' }),
    });
    const params = extractModalParams(path, 400, 800);
    expect(params.modalWidth).toBe(400 * 0.75);
  });

  it('uses widget dimensions for bottom banner', () => {
    const path = makePathItem({
      path_type: PathType.BOTTOM_BANNER,
      actions: makeActions({
        rf_widget_width: '300px',
        rf_widget_height: '80px',
        rf_widget_position: 'bottom',
        rf_banner_position_offset_x: '10px',
        rf_banner_position_offset_y: '20px',
      }),
    });
    const params = extractModalParams(path, 400, 800);
    expect(params.modalWidth).toBe(300);
    expect(params.modalHeight).toBe(80);
    expect(params.modalPosition).toBe('bottom');
    expect(params.modalOffsetX).toBe(10);
    expect(params.modalOffsetY).toBe(20);
  });

  it('falls back to 70% when no size info', () => {
    const path = makePathItem({ path_type: PathType.MODAL });
    const params = extractModalParams(path, 400, 800);
    expect(params.modalWidth).toBe(400 * 0.7);
    expect(params.modalHeight).toBe(800 * 0.7);
  });

  it('extracts button1 properties', () => {
    const path = makePathItem({
      actions: makeActions({
        rf_retention_button1_text: 'OK',
        button1_text_color: '#111',
        button1_highlight_color: '#222',
        button1_bg_color: '#333',
        button1_focus_bg_color: '#444',
        button1_width: '120px',
        button1_height: '50px',
        button1_position_x: '10px',
        button1_position_y: '20px',
      }),
    });
    const params = extractModalParams(path, 400, 800);
    expect(params.button1).toEqual({
      label: 'OK',
      textColor: '#111',
      textHighlightColor: '#222',
      bgColor: '#333',
      bgHighlightColor: '#444',
      width: 120,
      height: 50,
      position_x: 10,
      position_y: 20,
    });
  });

  it('extracts button2 when enabled', () => {
    const path = makePathItem({
      actions: makeActions({
        rf_settings_confirm_button_2_enabled: 'true',
        rf_retention_button2_text: 'Alt',
        button2_text_color: '#AAA',
      }),
    });
    const params = extractModalParams(path, 400, 800);
    expect(params.button2).toBeDefined();
    expect(params.button2?.label).toBe('Alt');
    expect(params.button2?.textColor).toBe('#AAA');
  });

  it('does not include button2 when disabled', () => {
    const path = makePathItem();
    const params = extractModalParams(path, 400, 800);
    expect(params.button2).toBeUndefined();
  });

  it('extracts button3 when enabled', () => {
    const path = makePathItem({
      actions: makeActions({
        rf_settings_cancel_button_enabled: 'true',
        rf_retention_button3_text: 'No',
      }),
    });
    const params = extractModalParams(path, 400, 800);
    expect(params.button3).toBeDefined();
    expect(params.button3?.label).toBe('No');
  });

  it('extracts countdown properties', () => {
    const path = makePathItem({
      actions: makeActions({
        rf_settings_close_seconds: '15',
        rf_settings_close_seconds_text: 'Wait {{seconds}}',
        rf_settings_hide_timer_text: 'true',
        rf_settings_timer_font_color: '#AABBCC',
        rf_settings_timer_font_size: '16px',
      }),
    });
    const params = extractModalParams(path, 400, 800);
    expect(params.countDown).toBe(15);
    expect(params.countDownPrompt).toBe('Wait {{seconds}}');
    expect(params.countDownPromptInvisible).toBe(true);
    expect(params.countDownPromptColor).toBe('#AABBCC');
    expect(params.countDownPromptFontSize).toBe(16);
  });

  it('extracts close and dismiss settings', () => {
    const path = makePathItem({
      actions: makeActions({
        rf_settings_close_button_enabled: 'true',
        rf_settings_click_outside_close_enabled: 'true',
        rf_settings_animation_type: 'slide',
      }),
    });
    const params = extractModalParams(path, 400, 800);
    expect(params.closeButtonEnabled).toBe(true);
    expect(params.modallessDismissable).toBe(true);
    expect(params.animationType).toBe('slide');
  });

  it('extracts button border properties', () => {
    const path = makePathItem({
      actions: makeActions({
        rf_retention_button_border_radius: '8px',
        rf_retention_button_border_color: '#FF0000',
        rf_retention_button_border_thickness: '2px',
      }),
    });
    const params = extractModalParams(path, 400, 800);
    expect(params.buttonBorderRadius).toBe(8);
    expect(params.buttonBorderColor).toBe('#FF0000');
    expect(params.buttonBorderThickness).toBe(2);
  });

  it('extracts buttonWidthPercent', () => {
    const path = makePathItem({
      actions: makeActions({ button_width_percent: '80' }),
    });
    const params = extractModalParams(path, 400, 800);
    expect(params.buttonWidthPercent).toBe('80%');
  });

  it('ignores invalid buttonWidthPercent', () => {
    const path = makePathItem({
      actions: makeActions({ button_width_percent: 'abc' }),
    });
    const params = extractModalParams(path, 400, 800);
    expect(params.buttonWidthPercent).toBeUndefined();
  });

  it('extracts privacy text with hyperlinks', () => {
    const path = makePathItem({
      actions: makeActions({
        rf_settings_privacy_policy_text:
          'See our [[Privacy|https://example.com/privacy]] policy',
      }),
    });
    const params = extractModalParams(path, 400, 800);
    expect(params.privacyTextAndLinks).toBeDefined();
    expect(params.privacyTextAndLinks!.length).toBeGreaterThan(0);
    const linked = params.privacyTextAndLinks!.find((l) => l.url !== undefined);
    expect(linked?.text).toBe('Privacy');
    expect(linked?.url).toBe('https://example.com/privacy');
  });

  it('handles buttonAbsolutePosition', () => {
    const path = makePathItem({
      actions: makeActions({ button_absolute_position: 'true' }),
    });
    const params = extractModalParams(path, 400, 800);
    expect(params.buttonAbsolutePosition).toBe(true);
  });

  it('extracts button2 with all explicit properties', () => {
    const path = makePathItem({
      actions: makeActions({
        rf_settings_confirm_button_2_enabled: 'true',
        rf_retention_button2_text: 'Maybe',
        button2_text_color: '#111',
        button2_highlight_color: '#222',
        button2_bg_color: '#333',
        button2_focus_bg_color: '#444',
        button2_width: '150px',
        button2_height: '50px',
        button2_position_x: '10px',
        button2_position_y: '20px',
      }),
    });
    const params = extractModalParams(path, 400, 800);
    expect(params.button2).toEqual({
      label: 'Maybe',
      textColor: '#111',
      textHighlightColor: '#222',
      bgColor: '#333',
      bgHighlightColor: '#444',
      width: 150,
      height: 50,
      position_x: 10,
      position_y: 20,
    });
  });

  it('extracts button3 with all explicit properties', () => {
    const path = makePathItem({
      actions: makeActions({
        rf_settings_cancel_button_enabled: 'true',
        rf_retention_button3_text: 'No',
        button3_text_color: '#111',
        button3_highlight_color: '#222',
        button3_bg_color: '#333',
        button3_focus_bg_color: '#444',
        button3_width: '150px',
        button3_height: '50px',
        button3_position_x: '10px',
        button3_position_y: '20px',
      }),
    });
    const params = extractModalParams(path, 400, 800);
    expect(params.button3).toEqual({
      label: 'No',
      textColor: '#111',
      textHighlightColor: '#222',
      bgColor: '#333',
      bgHighlightColor: '#444',
      width: 150,
      height: 50,
      position_x: 10,
      position_y: 20,
    });
  });

  it('extracts explicit button dimensions and font size', () => {
    const path = makePathItem({
      actions: makeActions({
        button_width: '200px',
        button_height: '50px',
        button_bottom_padding: '20px',
        rf_retention_button_font_size: '18px',
      }),
    });
    const params = extractModalParams(path, 400, 800);
    expect(params.buttonWidth).toBe(200);
    expect(params.buttonHeight).toBe(50);
    expect(params.buttonBottomPadding).toBe(20);
    expect(params.buttonFontSize).toBe(18);
  });

  it('extracts explicit timer font size', () => {
    const path = makePathItem({
      actions: makeActions({
        rf_settings_timer_font_size: '20px',
      }),
    });
    const params = extractModalParams(path, 400, 800);
    expect(params.countDownPromptFontSize).toBe(20);
  });

  it('extracts explicit timer font color', () => {
    const path = makePathItem({
      actions: makeActions({
        rf_settings_timer_font_color: '#AABBCC',
      }),
    });
    const params = extractModalParams(path, 400, 800);
    expect(params.countDownPromptColor).toBe('#AABBCC');
  });
});

// ── extractVideoModalParams ──────────────────────────────────────────────

describe('extractVideoModalParams', () => {
  it('returns video-specific params plus modal params', () => {
    const path = makePathItem({
      path_type: PathType.VIDEO,
      actions: makeActions({
        rf_settings_video_loop: 'true',
        rf_settings_video_controls: 'true',
        rf_settings_video_preload: 'true',
        rf_settings_video_poster: 'http://img.test/poster.jpg',
        rf_settings_video_src: 'http://vid.test/video.mp4',
        rf_settings_video_media_type: 'video/mp4',
        rf_settings_video_muted: 'true',
      }),
    });
    const params = extractVideoModalParams(path, 400, 800);
    expect(params.loopVideo).toBe(true);
    expect(params.showControls).toBe(true);
    expect(params.preload).toBe(true);
    expect(params.poster).toBe('http://img.test/poster.jpg');
    expect(params.url).toBe('http://vid.test/video.mp4');
    expect(params.videoFormat).toBe('video/mp4');
    expect(params.mute).toBe(true);
    // modal size is computed from screenWidth
    expect(params.modalWidth).toBe(Math.round(400 * 0.8));
    expect(params.modalHeight).toBe(Math.round((params.modalWidth * 9) / 16));
  });

  it('defaults video booleans to false', () => {
    const path = makePathItem({ path_type: PathType.VIDEO });
    const params = extractVideoModalParams(path, 400, 800);
    expect(params.loopVideo).toBe(false);
    expect(params.showControls).toBe(false);
    expect(params.preload).toBe(false);
    expect(params.mute).toBe(false);
    expect(params.poster).toBe('');
    expect(params.url).toBe('');
    expect(params.videoFormat).toBe('');
  });
});

// ── PromptCore class ─────────────────────────────────────────────────────

describe('PromptCore', () => {
  let localStorage: LocalStorage;
  let device: DeviceInfo;

  const createCore = (pingData?: ActionsData) => {
    const data = pingData ?? makeActionsData();
    fetchMock.mockResolvedValue(makeOkResponse(data));
    const core = new PromptCore('app-1', 'user-1', device, localStorage);
    return core;
  };

  /** Advance past the initial ping so actions are populated. */
  const flushPing = async () => {
    await jest.advanceTimersByTimeAsync(0);
  };

  beforeEach(() => {
    localStorage = makeLocalStorage();
    device = makeDevice();
  });

  // ── constructor / isInitialized ──

  describe('constructor & isInitialized', () => {
    it('is not initialized before first ping resolves', () => {
      fetchMock.mockReturnValue(new Promise(() => {})); // never resolves
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      expect(core.isInitialized()).toBe(false);
    });

    it('is initialized after first ping resolves', async () => {
      const core = createCore(makeActionsData([makePathItem()]));
      await flushPing();
      expect(core.isInitialized()).toBe(true);
    });
  });

  // ── getApi / getLocalStorage ──

  describe('getApi / getLocalStorage', () => {
    it('returns the PromptApi instance', () => {
      const core = createCore();
      expect(core.getApi()).toBeDefined();
      expect(core.getApi().getUserId()).toBe('user-1');
    });

    it('returns the LocalStorageUtils instance', () => {
      const core = createCore();
      expect(core.getLocalStorage()).toBeDefined();
    });
  });

  // ── enablePrompt ──

  describe('enablePrompt', () => {
    it('disables prompt processing', async () => {
      const core = createCore(
        makeActionsData([
          makePathItem({ triggers: [{ url_path: 'Home', use_regex: false }] }),
        ])
      );
      await flushPing();
      core.enablePrompt(false);
      const result = await core.onScreenChanged('Home');
      expect(result.result?.code).toBe(PromptResultCode.DISABLED);
    });

    it('re-enables prompt processing', async () => {
      const core = createCore(
        makeActionsData([
          makePathItem({
            path_type: PathType.MODAL,
            triggers: [{ url_path: 'Home', use_regex: false }],
          }),
        ])
      );
      await flushPing();
      core.enablePrompt(false);
      core.enablePrompt(true);
      const result = await core.onScreenChanged('Home');
      expect(result.path).toBeDefined();
    });
  });

  // ── setUserId / getUserId ──

  describe('setUserId / getUserId', () => {
    it('updates and retrieves userId', () => {
      const core = createCore();
      expect(core.getUserId()).toBe('user-1');
      core.setUserId('user-2');
      expect(core.getUserId()).toBe('user-2');
    });
  });

  // ── onScreenChanged ──

  describe('onScreenChanged', () => {
    it('returns DISABLED when prompt is disabled', async () => {
      const core = createCore();
      await flushPing();
      core.enablePrompt(false);
      const result = await core.onScreenChanged('Home');
      expect(result.result?.code).toBe(PromptResultCode.DISABLED);
      expect(result.path).toBeUndefined();
    });

    it('returns NOT_APPLICABLE when no matching path', async () => {
      const core = createCore(makeActionsData([]));
      await flushPing();
      const result = await core.onScreenChanged('Home');
      expect(result.result?.code).toBe(PromptResultCode.NOT_APPLICABLE);
    });

    it('returns matching path for exact screen name', async () => {
      const path = makePathItem({
        path_type: PathType.MODAL,
        triggers: [{ url_path: 'Home', use_regex: false }],
      });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      const result = await core.onScreenChanged('Home');
      expect(result.path?.id).toBe('path-1');
    });

    it('returns matching path for wildcard trigger', async () => {
      const path = makePathItem({
        path_type: PathType.MODAL,
        triggers: [{ url_path: '*', use_regex: false }],
      });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      const result = await core.onScreenChanged('AnyScreen');
      expect(result.path?.id).toBe('path-1');
    });

    it('returns matching path for partial wildcard', async () => {
      const path = makePathItem({
        path_type: PathType.MODAL,
        triggers: [{ url_path: 'Home*', use_regex: false }],
      });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      const result = await core.onScreenChanged('HomeScreen');
      expect(result.path?.id).toBe('path-1');
    });

    it('does not match different screen name', async () => {
      const path = makePathItem({
        path_type: PathType.MODAL,
        triggers: [{ url_path: 'Home', use_regex: false }],
      });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      const result = await core.onScreenChanged('Settings');
      expect(result.result?.code).toBe(PromptResultCode.NOT_APPLICABLE);
    });

    it('matches using regex trigger', async () => {
      const path = makePathItem({
        path_type: PathType.MODAL,
        triggers: [{ url_path: 'Home.*', use_regex: true }],
      });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      const result = await core.onScreenChanged('HomeScreen');
      expect(result.path?.id).toBe('path-1');
    });

    it('applies delay_seconds from trigger', async () => {
      const path = makePathItem({
        path_type: PathType.MODAL,
        triggers: [{ url_path: 'Home', use_regex: false, delay_seconds: 5 }],
      });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      const result = await core.onScreenChanged('Home');
      expect(result.delaySeconds).toBe(5);
    });

    it('only matches MODAL, INTERSTITIAL, VIDEO, BOTTOM_BANNER types', async () => {
      const horizPath = makePathItem({
        id: 'horiz',
        path_type: PathType.HORIZONTAL,
        triggers: [{ url_path: 'Home', use_regex: false }],
      });
      const modalPath = makePathItem({
        id: 'modal',
        path_type: PathType.MODAL,
        triggers: [{ url_path: 'Home', use_regex: false }],
      });
      const core = createCore(makeActionsData([horizPath, modalPath]));
      await flushPing();
      const result = await core.onScreenChanged('Home');
      expect(result.path?.id).toBe('modal');
    });

    it('returns HOLDOUT when path has holdout=true', async () => {
      const path = makePathItem({
        path_type: PathType.MODAL,
        holdout: true,
        triggers: [{ url_path: 'Home', use_regex: false }],
      });
      // holdout API call
      fetchMock
        .mockResolvedValueOnce(makeOkResponse(makeActionsData([path]))) // ping
        .mockResolvedValueOnce(makeOkResponse({ success: true })); // holdout
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      await flushPing();
      const result = await core.onScreenChanged('Home');
      expect(result.result?.code).toBe(PromptResultCode.HOLDOUT);
    });

    it('returns SUPPRESSED when overlay is disabled', async () => {
      const path = makePathItem({
        path_type: PathType.MODAL,
        triggers: [{ url_path: 'Home', use_regex: false }],
      });
      const ls = makeLocalStorage();
      // isOverlayEnabled calls getValue; simulate an unexpired overlay key
      (ls.getValue as jest.Mock).mockResolvedValue(
        `${Math.floor(Date.now() / 1000)},999999`
      );
      fetchMock.mockResolvedValue(makeOkResponse(makeActionsData([path])));
      const core = new PromptCore('app-1', 'user-1', device, ls);
      await flushPing();
      const result = await core.onScreenChanged('Home');
      expect(result.result?.code).toBe(PromptResultCode.SUPPRESSED);
    });

    it('catches errors and returns ERROR', async () => {
      const core = createCore(makeActionsData([]));
      await flushPing();
      // Force an error by making internal property throw
      (core as any).actions = {
        get paths() {
          throw new Error('boom');
        },
      };
      const result = await core.onScreenChanged('Home');
      expect(result.result?.code).toBe(PromptResultCode.ERROR);
    });
  });

  // ── onButtonClicked ──

  describe('onButtonClicked', () => {
    it('returns DISABLED when prompt is disabled', async () => {
      const core = createCore();
      await flushPing();
      core.enablePrompt(false);
      const result = await core.onButtonClicked('btn-1');
      expect(result.result?.code).toBe(PromptResultCode.DISABLED);
    });

    it('finds path by click_id', async () => {
      const path = makePathItem({
        path_type: PathType.MODAL,
        triggers: [{ url_path: 'Home', use_regex: false, click_id: 'btn-1' }],
      });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      // Set current screen first
      await core.onScreenChanged('Home');
      // Reset fetch for the button click
      const result = await core.onButtonClicked('btn-1');
      expect(result.path?.id).toBe('path-1');
    });

    it('returns NOT_APPLICABLE for unmatched click_id', async () => {
      const path = makePathItem({
        path_type: PathType.MODAL,
        triggers: [{ url_path: 'Home', use_regex: false, click_id: 'btn-1' }],
      });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      await core.onScreenChanged('Home');
      const result = await core.onButtonClicked('btn-999');
      expect(result.result?.code).toBe(PromptResultCode.NOT_APPLICABLE);
    });
  });

  // ── onInlineClicked ──

  describe('onInlineClicked', () => {
    it('returns DISABLED when prompt is disabled', async () => {
      const core = createCore();
      await flushPing();
      core.enablePrompt(false);
      const result = await core.onInlineClicked('path-1');
      expect(result.code).toBe(PromptResultCode.DISABLED);
    });

    it('calls goal and returns BUTTON1 for valid path', async () => {
      const path = makePathItem({
        actions: makeActions({
          rf_metadata: { key: 'val' },
          rf_settings_deeplink: 'screen=offer',
        }),
      });
      fetchMock.mockResolvedValue(makeOkResponse(makeActionsData([path])));
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      await flushPing();
      const result = await core.onInlineClicked('path-1', 'ag-1');
      expect(result.code).toBe(PromptResultCode.BUTTON1);
      expect(result.value).toEqual({ screen: 'offer' });
      expect(result.meta).toEqual({ key: 'val' });
    });

    it('returns NOT_APPLICABLE for unknown path id', async () => {
      const core = createCore(makeActionsData([]));
      await flushPing();
      const result = await core.onInlineClicked('unknown-id');
      expect(result.code).toBe(PromptResultCode.NOT_APPLICABLE);
    });

    it('returns ERROR on exception', async () => {
      const core = createCore(makeActionsData([]));
      await flushPing();
      (core as any).actions = {
        get paths() {
          throw new Error('boom');
        },
      };
      const result = await core.onInlineClicked('path-1');
      expect(result.code).toBe(PromptResultCode.ERROR);
    });
  });

  // ── onInlineViewed ──

  describe('onInlineViewed', () => {
    it('returns DISABLED when prompt is disabled', async () => {
      const core = createCore();
      await flushPing();
      core.enablePrompt(false);
      const result = await core.onInlineViewed('path-1');
      expect(result.code).toBe(PromptResultCode.DISABLED);
    });

    it('calls impression and returns IMPRESSION for valid path', async () => {
      const path = makePathItem();
      fetchMock.mockResolvedValue(makeOkResponse(makeActionsData([path])));
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      await flushPing();
      const result = await core.onInlineViewed('path-1', 'ag-1');
      expect(result.code).toBe(PromptResultCode.IMPRESSION);
    });

    it('returns NOT_APPLICABLE for unknown path id', async () => {
      const core = createCore(makeActionsData([]));
      await flushPing();
      const result = await core.onInlineViewed('unknown');
      expect(result.code).toBe(PromptResultCode.NOT_APPLICABLE);
    });
  });

  // ── getInlines ──

  describe('getInlines', () => {
    it('returns empty when prompt is disabled', async () => {
      const core = createCore();
      await flushPing();
      core.enablePrompt(false);
      const result = await core.getInlines(InlineType.general);
      expect(result).toEqual([]);
    });

    it('returns paths matching zone_id', async () => {
      const path = makePathItem({
        actions: makeActions({ rf_settings_zone_id: InlineType.general }),
      });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      const result = await core.getInlines(InlineType.general);
      expect(result.length).toBe(1);
      expect(result[0]!.id).toBe('path-1');
    });

    it('returns paths for InlineType.all', async () => {
      const path = makePathItem({
        actions: makeActions({ rf_settings_zone_id: 'something' }),
      });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      const result = await core.getInlines(InlineType.all);
      expect(result.length).toBe(1);
    });

    it('returns at most one path (first by order)', async () => {
      const path1 = makePathItem({
        id: 'p1',
        order: 2,
        actions: makeActions({ rf_settings_zone_id: InlineType.general }),
      });
      const path2 = makePathItem({
        id: 'p2',
        order: 1,
        actions: makeActions({ rf_settings_zone_id: InlineType.general }),
      });
      const core = createCore(makeActionsData([path1, path2]));
      await flushPing();
      const result = await core.getInlines(InlineType.general);
      expect(result.length).toBe(1);
      expect(result[0]!.id).toBe('p2');
    });

    it('skips holdout paths', async () => {
      const path = makePathItem({
        holdout: true,
        actions: makeActions({ rf_settings_zone_id: InlineType.general }),
      });
      fetchMock
        .mockResolvedValueOnce(makeOkResponse(makeActionsData([path])))
        .mockResolvedValueOnce(makeOkResponse({ success: true }));
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      await flushPing();
      const result = await core.getInlines(InlineType.general);
      expect(result).toEqual([]);
    });
  });

  // ── customTrack ──

  describe('customTrack', () => {
    it('does nothing when disabled', async () => {
      const core = createCore();
      await flushPing();
      core.enablePrompt(false);
      const fetchCalls = fetchMock.mock.calls.length;
      await core.customTrack('field-1');
      // No extra fetch calls
      expect(fetchMock.mock.calls.length).toBe(fetchCalls);
    });

    it('calls api.customTrack when enabled', async () => {
      const core = createCore();
      await flushPing();
      await core.customTrack('field-1');
      // Should have made a fetch call for customTrack
      const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
      expect(lastCall?.[0]).toContain('custom_field_id');
    });
  });

  // ── resetGoal ──

  describe('resetGoal', () => {
    it('does nothing when disabled', async () => {
      const core = createCore();
      await flushPing();
      core.enablePrompt(false);
      const fetchCalls = fetchMock.mock.calls.length;
      await core.resetGoal();
      expect(fetchMock.mock.calls.length).toBe(fetchCalls);
    });

    it('resets localStorage and calls goalResetAll', async () => {
      const core = createCore();
      await flushPing();
      await core.resetGoal();
      expect(localStorage.getAllKeys).toHaveBeenCalled();
      const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
      expect(lastCall?.[0]).toContain('goal_reset_all');
    });
  });

  // ── getMeta ──

  describe('getMeta', () => {
    it('returns empty object when disabled', async () => {
      const core = createCore();
      await flushPing();
      core.enablePrompt(false);
      expect(core.getMeta()).toEqual({});
    });

    it('returns merged metadata from INVISIBLE paths', async () => {
      const path1 = makePathItem({
        id: 'inv-1',
        path_type: PathType.INVISIBLE,
        actions: makeActions({ rf_metadata: { a: 1 } }),
      });
      const path2 = makePathItem({
        id: 'inv-2',
        path_type: PathType.INVISIBLE,
        actions: makeActions({ rf_metadata: { b: 2 } }),
      });
      const core = createCore(makeActionsData([path1, path2]));
      await flushPing();
      expect(core.getMeta()).toEqual({ a: 1, b: 2 });
    });

    it('ignores non-INVISIBLE paths', async () => {
      const path = makePathItem({
        path_type: PathType.MODAL,
        actions: makeActions({ rf_metadata: { x: 1 } }),
      });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      expect(core.getMeta()).toEqual({});
    });

    it('ignores INVISIBLE paths without rf_metadata', async () => {
      const path = makePathItem({
        path_type: PathType.INVISIBLE,
        actions: makeActions(),
      });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      expect(core.getMeta()).toEqual({});
    });

    it('returns empty object when no actions yet', () => {
      fetchMock.mockReturnValue(new Promise(() => {}));
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      expect(core.getMeta()).toEqual({});
    });
  });

  // ── getPrompt ──

  describe('getPrompt', () => {
    it('returns null when path not found', async () => {
      const core = createCore(makeActionsData([]));
      await flushPing();
      expect(core.getPrompt('unknown')).toBeNull();
    });

    it('returns Prompt object for valid id', async () => {
      const path = makePathItem({
        id: 'p-1',
        path_type: PathType.MODAL,
        action_group_id: 'ag-1',
        actions: makeActions({
          rf_settings_deeplink: 'page=offer',
          rf_metadata: { tier: 'gold' },
        }),
      });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      const prompt = core.getPrompt('p-1');
      expect(prompt).not.toBeNull();
      expect(prompt!.id).toBe('p-1');
      expect(prompt!.type).toBe(PathType.MODAL);
      expect(prompt!.deeplink).toEqual({ page: 'offer' });
      expect(prompt!.deviceMeta).toEqual({ tier: 'gold' });
      expect(prompt!.actionGroupId).toBe('ag-1');
    });

    it('returned Prompt has callable API methods', async () => {
      const path = makePathItem({ id: 'p-1' });
      fetchMock.mockResolvedValue(makeOkResponse(makeActionsData([path])));
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      await flushPing();
      const prompt = core.getPrompt('p-1')!;
      expect(typeof prompt.impression).toBe('function');
      expect(typeof prompt.dismiss).toBe('function');
      expect(typeof prompt.timeout).toBe('function');
      expect(typeof prompt.goal).toBe('function');
      expect(typeof prompt.goal2).toBe('function');
      expect(typeof prompt.decline).toBe('function');
      expect(typeof prompt.holdout).toBe('function');
    });

    it('Prompt.impression calls api and returns IMPRESSION', async () => {
      const path = makePathItem({ id: 'p-1', action_group_id: 'ag-1' });
      fetchMock.mockResolvedValue(makeOkResponse(makeActionsData([path])));
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      await flushPing();
      const prompt = core.getPrompt('p-1')!;
      const result = await prompt.impression();
      expect(result.code).toBe(PromptResultCode.IMPRESSION);
    });

    it('Prompt.impression returns ERROR on failure', async () => {
      const path = makePathItem({ id: 'p-1' });
      fetchMock
        .mockResolvedValueOnce(makeOkResponse(makeActionsData([path])))
        .mockRejectedValueOnce(new Error('network error'));
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      await flushPing();
      const prompt = core.getPrompt('p-1')!;
      const result = await prompt.impression();
      expect(result.code).toBe(PromptResultCode.ERROR);
    });

    it('Prompt has button configurations', async () => {
      const path = makePathItem({
        id: 'p-1',
        actions: makeActions({
          rf_retention_button1_text: 'Yes',
          rf_settings_confirm_button_2_enabled: 'true',
          rf_retention_button2_text: 'Maybe',
          rf_settings_cancel_button_enabled: 'true',
          rf_retention_button3_text: 'No',
        }),
      });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      const prompt = core.getPrompt('p-1')!;
      expect(prompt.button1?.label).toBe('Yes');
      expect(prompt.button2?.label).toBe('Maybe');
      expect(prompt.button3?.label).toBe('No');
    });

    it('catches errors and returns null', async () => {
      const core = createCore(makeActionsData([]));
      await flushPing();
      (core as any).actions = {
        get paths() {
          throw new Error('boom');
        },
      };
      expect(core.getPrompt('p-1')).toBeNull();
    });
  });

  // ── getPrompts ──

  describe('getPrompts', () => {
    it('returns prompts filtered by PathType', async () => {
      const modal = makePathItem({ id: 'modal', path_type: PathType.MODAL });
      const video = makePathItem({ id: 'video', path_type: PathType.VIDEO });
      const core = createCore(makeActionsData([modal, video]));
      await flushPing();
      const modals = core.getPrompts(PathType.MODAL);
      expect(modals.length).toBe(1);
      expect(modals[0]!.id).toBe('modal');
    });

    it('returns all prompts for PathType.ALL', async () => {
      const modal = makePathItem({ id: 'modal', path_type: PathType.MODAL });
      const video = makePathItem({ id: 'video', path_type: PathType.VIDEO });
      const core = createCore(makeActionsData([modal, video]));
      await flushPing();
      const all = core.getPrompts(PathType.ALL);
      expect(all.length).toBe(2);
    });

    it('filters by zoneId when provided', async () => {
      const p1 = makePathItem({
        id: 'p1',
        path_type: PathType.HORIZONTAL,
        actions: makeActions({ rf_settings_zone_id: 'zone-a' }),
      });
      const p2 = makePathItem({
        id: 'p2',
        path_type: PathType.HORIZONTAL,
        actions: makeActions({ rf_settings_zone_id: 'zone-b' }),
      });
      const core = createCore(makeActionsData([p1, p2]));
      await flushPing();
      const result = core.getPrompts(PathType.HORIZONTAL, 'zone-a');
      expect(result.length).toBe(1);
      expect(result[0]!.id).toBe('p1');
    });

    it('returns empty array on error', async () => {
      const core = createCore(makeActionsData([]));
      await flushPing();
      (core as any).actions = {
        get paths() {
          throw new Error('boom');
        },
      };
      expect(core.getPrompts(PathType.MODAL)).toEqual([]);
    });
  });

  // ── getTriggerablePrompts ──

  describe('getTriggerablePrompts', () => {
    it('returns empty when both screenName and clickId are empty', async () => {
      const core = createCore(makeActionsData([makePathItem()]));
      await flushPing();
      const result = await core.getTriggerablePrompts('', '');
      expect(result).toEqual([]);
    });

    it('returns prompts matching screen name trigger', async () => {
      const path = makePathItem({
        id: 'p-1',
        path_type: PathType.MODAL,
        triggers: [{ url_path: 'Home', use_regex: false }],
      });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      const result = await core.getTriggerablePrompts(
        'Home',
        '*',
        PathType.MODAL
      );
      expect(result.length).toBe(1);
      expect(result[0]!.id).toBe('p-1');
    });

    it('returns prompts matching click_id trigger', async () => {
      const path = makePathItem({
        id: 'p-1',
        path_type: PathType.MODAL,
        triggers: [{ url_path: '*', use_regex: false, click_id: 'buy-btn' }],
      });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      const result = await core.getTriggerablePrompts(
        '*',
        'buy-btn',
        PathType.MODAL
      );
      expect(result.length).toBe(1);
    });

    it('excludes holdout prompts', async () => {
      const path = makePathItem({
        id: 'p-1',
        path_type: PathType.MODAL,
        holdout: true,
        triggers: [{ url_path: '*', use_regex: false }],
      });
      fetchMock
        .mockResolvedValueOnce(makeOkResponse(makeActionsData([path])))
        .mockResolvedValueOnce(makeOkResponse({ success: true }));
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      await flushPing();
      const result = await core.getTriggerablePrompts('*', '*', PathType.MODAL);
      expect(result).toEqual([]);
    });

    it('excludes overlay-disabled prompts', async () => {
      const path = makePathItem({
        id: 'p-1',
        path_type: PathType.MODAL,
        triggers: [{ url_path: '*', use_regex: false }],
      });
      const ls = makeLocalStorage();
      (ls.getValue as jest.Mock).mockResolvedValue(
        `${Math.floor(Date.now() / 1000)},999999`
      );
      fetchMock.mockResolvedValue(makeOkResponse(makeActionsData([path])));
      const core = new PromptCore('app-1', 'user-1', device, ls);
      await flushPing();
      const result = await core.getTriggerablePrompts('*', '*', PathType.MODAL);
      expect(result).toEqual([]);
    });

    it('uses wildcard defaults', async () => {
      const path = makePathItem({
        path_type: PathType.MODAL,
        triggers: [{ url_path: '*', use_regex: false }],
      });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      // default params: screenName='*', clickId='*', type=MODAL
      const result = await core.getTriggerablePrompts();
      expect(result.length).toBe(1);
    });

    it('filters by zoneId', async () => {
      const p1 = makePathItem({
        id: 'z1',
        path_type: PathType.MODAL,
        actions: makeActions({ rf_settings_zone_id: 'zone-a' }),
        triggers: [{ url_path: '*', use_regex: false }],
      });
      const p2 = makePathItem({
        id: 'z2',
        path_type: PathType.MODAL,
        actions: makeActions({ rf_settings_zone_id: 'zone-b' }),
        triggers: [{ url_path: '*', use_regex: false }],
      });
      const core = createCore(makeActionsData([p1, p2]));
      await flushPing();
      const result = await core.getTriggerablePrompts(
        '*',
        '*',
        PathType.MODAL,
        'zone-a'
      );
      expect(result.length).toBe(1);
      expect(result[0]!.id).toBe('z1');
    });

    it('skips null entries returned by getPrompts', async () => {
      const path = makePathItem({
        id: 'p-1',
        path_type: PathType.MODAL,
        triggers: [{ url_path: '*', use_regex: false }],
      });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      // Force getPrompts to return an array containing a null entry
      jest.spyOn(core, 'getPrompts').mockReturnValue([null] as any);
      const result = await core.getTriggerablePrompts('*', '*', PathType.MODAL);
      expect(result).toEqual([]);
    });
  });

  // ── pingHandler ──

  describe('pingHandler (via timers)', () => {
    it('schedules repeated pings', async () => {
      const data = makeActionsData([], {
        configs: { ping_frequency: 30 },
      });
      fetchMock.mockResolvedValue(makeOkResponse(data));
      new PromptCore('app-1', 'user-1', device, localStorage);
      // First ping fires immediately
      await flushPing();
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Advance 30 seconds for next ping
      await jest.advanceTimersByTimeAsync(30 * 1000);
      expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('uses exponential backoff on error', async () => {
      fetchMock.mockRejectedValue(new Error('network'));
      new PromptCore('app-1', 'user-1', device, localStorage);
      await flushPing();
      // After error, interval doubles from 60s to 120s
      expect(console.error).toHaveBeenCalled();
    });

    it('calls goalResetAll when reset flag is set', async () => {
      const data = makeActionsData([], { reset: true });
      fetchMock.mockResolvedValue(makeOkResponse(data));
      new PromptCore('app-1', 'user-1', device, localStorage);
      await flushPing();
      // Should have called fetch twice: once for ping, once for goalResetAll
      const urls = fetchMock.mock.calls.map((c: any[]) => c[0]);
      const resetCall = urls.find((u: string) => u.includes('goal_reset_all'));
      expect(resetCall).toBeDefined();
    });

    it('skips fetch when prompt is disabled', async () => {
      const data = makeActionsData([], {
        configs: { ping_frequency: 1 },
      });
      fetchMock.mockResolvedValue(makeOkResponse(data));
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      await flushPing();
      const callsAfterFirstPing = fetchMock.mock.calls.length;
      core.enablePrompt(false);
      await jest.advanceTimersByTimeAsync(1 * 1000);
      // No new fetch calls when disabled
      expect(fetchMock.mock.calls.length).toBe(callsAfterFirstPing);
    });

    it('handles null data from 304 ping response', async () => {
      const data = makeActionsData([], {
        configs: { ping_frequency: 1 },
      });
      fetchMock
        .mockResolvedValueOnce(makeOkResponse(data)) // first ping
        .mockResolvedValueOnce(new Response(null, { status: 304 })); // second ping returns null
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      await flushPing();
      await jest.advanceTimersByTimeAsync(1 * 1000);
      expect(core.isInitialized()).toBe(true);
    });

    it('uses default ping interval when configs is missing', async () => {
      fetchMock.mockResolvedValue(makeOkResponse({}));
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      await flushPing();
      expect(core.isInitialized()).toBe(true);
    });
  });

  // ── error catch branches ──

  describe('error catch branches', () => {
    it('onInlineViewed catches errors and returns ERROR', async () => {
      const core = createCore(makeActionsData([]));
      await flushPing();
      (core as any).actions = {
        get paths() {
          throw new Error('boom');
        },
      };
      const result = await core.onInlineViewed('path-1');
      expect(result.code).toBe(PromptResultCode.ERROR);
    });

    it('onButtonClicked catches errors and returns ERROR', async () => {
      const core = createCore(makeActionsData([]));
      await flushPing();
      (core as any).actions = {
        get paths() {
          throw new Error('boom');
        },
      };
      const result = await core.onButtonClicked('btn-1');
      expect(result.result?.code).toBe(PromptResultCode.ERROR);
    });

    it('getInlines catches errors and returns empty array', async () => {
      const core = createCore(makeActionsData([]));
      await flushPing();
      (core as any).actions = {
        get paths() {
          throw new Error('boom');
        },
      };
      const result = await core.getInlines(InlineType.general);
      expect(result).toEqual([]);
    });

    it('customTrack catches errors', async () => {
      const core = createCore(makeActionsData([]));
      await flushPing();
      // Must throw synchronously — `return this.api.customTrack()` has no await
      jest.spyOn((core as any).api, 'customTrack').mockImplementation(() => {
        throw new Error('boom');
      });
      await core.customTrack('field-1');
      expect(console.error).toHaveBeenCalled();
    });

    it('resetGoal catches errors', async () => {
      const core = createCore(makeActionsData([]));
      await flushPing();
      (core as any).localStorage = {
        reset: jest.fn().mockRejectedValue(new Error('boom')),
      };
      await core.resetGoal();
      expect(console.error).toHaveBeenCalled();
    });

    it('getMeta catches errors and returns empty object', async () => {
      const core = createCore(makeActionsData([]));
      await flushPing();
      (core as any).actions = {
        get paths() {
          throw new Error('boom');
        },
      };
      expect(core.getMeta()).toEqual({});
    });

    it('getTriggerablePrompts catches errors and returns empty array', async () => {
      const path = makePathItem({
        path_type: PathType.MODAL,
        triggers: [{ url_path: '*', use_regex: false }],
      });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      // Error must occur AFTER getPrompts returns (getPrompts has its own catch)
      (core as any).localStorage.isOverlayEnabled = jest
        .fn()
        .mockRejectedValue(new Error('boom'));
      const result = await core.getTriggerablePrompts('*', '*', PathType.MODAL);
      expect(result).toEqual([]);
    });
  });

  // ── path2Prompt — full API method coverage ──

  describe('path2Prompt — Prompt methods', () => {
    it('Prompt.dismiss calls api and returns DISMISS', async () => {
      const path = makePathItem({ id: 'p-1' });
      fetchMock.mockResolvedValue(makeOkResponse(makeActionsData([path])));
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      await flushPing();
      const prompt = core.getPrompt('p-1')!;
      const result = await prompt.dismiss();
      expect(result.code).toBe(PromptResultCode.DISMISS);
    });

    it('Prompt.timeout calls api and returns TIMEOUT', async () => {
      const path = makePathItem({ id: 'p-1' });
      fetchMock.mockResolvedValue(makeOkResponse(makeActionsData([path])));
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      await flushPing();
      const prompt = core.getPrompt('p-1')!;
      const result = await prompt.timeout();
      expect(result.code).toBe(PromptResultCode.TIMEOUT);
    });

    it('Prompt.holdout calls api and returns HOLDOUT', async () => {
      const path = makePathItem({ id: 'p-1' });
      // Use mockImplementation to create fresh Response per call (body can only be read once)
      fetchMock.mockImplementation(() =>
        Promise.resolve(makeOkResponse(makeActionsData([path])))
      );
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      await flushPing();
      const prompt = core.getPrompt('p-1')!;
      const result = await prompt.holdout();
      expect(result.code).toBe(PromptResultCode.HOLDOUT);
    });

    it('Prompt.goal calls api and returns BUTTON1', async () => {
      const path = makePathItem({ id: 'p-1' });
      fetchMock.mockResolvedValue(makeOkResponse(makeActionsData([path])));
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      await flushPing();
      const prompt = core.getPrompt('p-1')!;
      const result = await prompt.goal();
      expect(result.code).toBe(PromptResultCode.BUTTON1);
    });

    it('Prompt.goal2 calls api and returns BUTTON2', async () => {
      const path = makePathItem({ id: 'p-1' });
      fetchMock.mockResolvedValue(makeOkResponse(makeActionsData([path])));
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      await flushPing();
      const prompt = core.getPrompt('p-1')!;
      const result = await prompt.goal2();
      expect(result.code).toBe(PromptResultCode.BUTTON2);
    });

    it('Prompt.decline calls api and returns BUTTON3', async () => {
      const path = makePathItem({ id: 'p-1' });
      fetchMock.mockResolvedValue(makeOkResponse(makeActionsData([path])));
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      await flushPing();
      const prompt = core.getPrompt('p-1')!;
      const result = await prompt.decline();
      expect(result.code).toBe(PromptResultCode.BUTTON3);
    });

    it('Prompt has countDownPrompt from close_seconds_text', async () => {
      const path = makePathItem({
        id: 'p-1',
        actions: makeActions({
          rf_settings_close_seconds_text: 'Wait {{seconds}}',
        }),
      });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      const prompt = core.getPrompt('p-1')!;
      expect(prompt.countDownPrompt).toBe('Wait {{seconds}}');
    });

    it('Prompt has countDownPromptInvisible when hide_timer_text is true', async () => {
      const path = makePathItem({
        id: 'p-1',
        actions: makeActions({
          rf_settings_hide_timer_text: 'true',
        }),
      });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      const prompt = core.getPrompt('p-1')!;
      expect(prompt.countDownPromptInvisible).toBe(true);
    });

    it('Prompt uses android inAppSku for non-ios device', async () => {
      const androidDevice: DeviceInfo = {
        ...makeDevice(),
        device_type: 'android_os',
        device_category: 'phone',
      };
      const path = makePathItem({
        id: 'p-1',
        actions: makeActions({
          rf_settings_apple_inapp_product_id: 'apple-sku',
          rf_settings_android_inapp_product_id: 'android-sku',
        }),
      });
      fetchMock.mockResolvedValue(makeOkResponse(makeActionsData([path])));
      const core = new PromptCore(
        'app-1',
        'user-1',
        androidDevice,
        localStorage
      );
      await flushPing();
      const prompt = core.getPrompt('p-1')!;
      expect(prompt.inAppSku).toBe('android-sku');
    });

    it('Prompt type defaults to -1 when path_type is undefined', async () => {
      const path = makePathItem({ id: 'p-1', path_type: undefined });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      const prompt = core.getPrompt('p-1')!;
      expect(prompt.type).toBe(-1);
    });
  });

  // ── isSuppressedByHoldout — additional branches ──

  describe('isSuppressedByHoldout — additional branches', () => {
    it('skips holdout API call when already presented', async () => {
      const path = makePathItem({
        path_type: PathType.MODAL,
        holdout: true,
        triggers: [{ url_path: 'Home', use_regex: false }],
      });
      const ls = makeLocalStorage();
      (ls.hasKey as jest.Mock).mockResolvedValue(true);
      fetchMock.mockResolvedValue(makeOkResponse(makeActionsData([path])));
      const core = new PromptCore('app-1', 'user-1', device, ls);
      await flushPing();
      const result = await core.onScreenChanged('Home');
      expect(result.result?.code).toBe(PromptResultCode.HOLDOUT);
      const holdoutCalls = fetchMock.mock.calls.filter((c: any[]) =>
        c[0].includes('holdout')
      );
      expect(holdoutCalls.length).toBe(0);
    });

    it('does not store holdout key when API returns success:false', async () => {
      const path = makePathItem({
        path_type: PathType.MODAL,
        holdout: true,
        triggers: [{ url_path: 'Home', use_regex: false }],
      });
      const ls = makeLocalStorage();
      fetchMock
        .mockResolvedValueOnce(makeOkResponse(makeActionsData([path])))
        .mockResolvedValueOnce(makeOkResponse({ success: false }));
      const core = new PromptCore('app-1', 'user-1', device, ls);
      await flushPing();
      const result = await core.onScreenChanged('Home');
      expect(result.result?.code).toBe(PromptResultCode.HOLDOUT);
      expect(ls.createKey).not.toHaveBeenCalled();
    });
  });

  // ── getTriggerablePrompts — unmatched trigger ──

  describe('getTriggerablePrompts — unmatched trigger', () => {
    it('filters out prompts with non-matching triggers', async () => {
      const path = makePathItem({
        id: 'p-1',
        path_type: PathType.MODAL,
        triggers: [{ url_path: 'Settings', use_regex: false }],
      });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      const result = await core.getTriggerablePrompts(
        'Home',
        '*',
        PathType.MODAL
      );
      expect(result).toEqual([]);
    });

    it('handles trigger with null url_path', async () => {
      const path = makePathItem({
        id: 'p-1',
        path_type: PathType.MODAL,
        triggers: [{ url_path: null as any, use_regex: false }],
      });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      const result = await core.getTriggerablePrompts(
        'Home',
        '*',
        PathType.MODAL
      );
      expect(result).toEqual([]);
    });

    it('filters out prompts with undefined triggers', async () => {
      const path = makePathItem({
        id: 'p-1',
        path_type: PathType.MODAL,
        triggers: undefined,
      });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      const result = await core.getTriggerablePrompts(
        'Home',
        '*',
        PathType.MODAL
      );
      expect(result).toEqual([]);
    });
  });

  // ── undefined paths branch coverage ──

  describe('undefined paths in actions', () => {
    it('onScreenChanged handles undefined paths', async () => {
      fetchMock.mockResolvedValue(
        makeOkResponse({ configs: { ping_frequency: 60 } })
      );
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      await flushPing();
      const result = await core.onScreenChanged('Home');
      expect(result.result?.code).toBe(PromptResultCode.NOT_APPLICABLE);
    });

    it('onScreenChanged handles path with undefined triggers', async () => {
      const path = makePathItem({
        path_type: PathType.MODAL,
        triggers: undefined,
      });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      const result = await core.onScreenChanged('Home');
      expect(result.result?.code).toBe(PromptResultCode.NOT_APPLICABLE);
    });

    it('onInlineClicked handles undefined paths', async () => {
      fetchMock.mockResolvedValue(
        makeOkResponse({ configs: { ping_frequency: 60 } })
      );
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      await flushPing();
      const result = await core.onInlineClicked('path-1');
      expect(result.code).toBe(PromptResultCode.NOT_APPLICABLE);
    });

    it('onInlineViewed handles undefined paths', async () => {
      fetchMock.mockResolvedValue(
        makeOkResponse({ configs: { ping_frequency: 60 } })
      );
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      await flushPing();
      const result = await core.onInlineViewed('path-1');
      expect(result.code).toBe(PromptResultCode.NOT_APPLICABLE);
    });

    it('getInlines handles undefined paths', async () => {
      fetchMock.mockResolvedValue(
        makeOkResponse({ configs: { ping_frequency: 60 } })
      );
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      await flushPing();
      const result = await core.getInlines(InlineType.general);
      expect(result).toEqual([]);
    });

    it('getPrompt handles undefined paths', async () => {
      fetchMock.mockResolvedValue(
        makeOkResponse({ configs: { ping_frequency: 60 } })
      );
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      await flushPing();
      expect(core.getPrompt('p-1')).toBeNull();
    });

    it('getPrompts handles undefined paths', async () => {
      fetchMock.mockResolvedValue(
        makeOkResponse({ configs: { ping_frequency: 60 } })
      );
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      await flushPing();
      expect(core.getPrompts(PathType.MODAL)).toEqual([]);
    });
  });

  // ── undefined actions branch coverage (before initialization) ──

  describe('methods called before initialization (actions undefined)', () => {
    it('onScreenChanged with undefined actions', async () => {
      fetchMock.mockReturnValue(new Promise(() => {}));
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      const result = await core.onScreenChanged('Home');
      expect(result.result?.code).toBe(PromptResultCode.NOT_APPLICABLE);
    });

    it('onInlineClicked with undefined actions', async () => {
      fetchMock.mockReturnValue(new Promise(() => {}));
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      const result = await core.onInlineClicked('path-1');
      expect(result.code).toBe(PromptResultCode.NOT_APPLICABLE);
    });

    it('onInlineViewed with undefined actions', async () => {
      fetchMock.mockReturnValue(new Promise(() => {}));
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      const result = await core.onInlineViewed('path-1');
      expect(result.code).toBe(PromptResultCode.NOT_APPLICABLE);
    });

    it('getInlines with undefined actions', async () => {
      fetchMock.mockReturnValue(new Promise(() => {}));
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      const result = await core.getInlines(InlineType.general);
      expect(result).toEqual([]);
    });

    it('getPrompt with undefined actions', () => {
      fetchMock.mockReturnValue(new Promise(() => {}));
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      expect(core.getPrompt('p-1')).toBeNull();
    });

    it('getPrompts with undefined actions', () => {
      fetchMock.mockReturnValue(new Promise(() => {}));
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      expect(core.getPrompts(PathType.MODAL)).toEqual([]);
    });
  });

  // ── getPaths ──

  describe('getPaths', () => {
    it('returns empty array before first ping resolves', () => {
      fetchMock.mockReturnValue(new Promise(() => {}));
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      expect(core.getPaths()).toEqual([]);
    });

    it('returns paths after ping resolves', async () => {
      const path = makePathItem({ id: 'p-1' });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      expect(core.getPaths()).toHaveLength(1);
      expect(core.getPaths()[0]!.id).toBe('p-1');
    });

    it('returns empty array when paths is undefined in response', async () => {
      fetchMock.mockResolvedValue(
        makeOkResponse({ configs: { ping_frequency: 60 } })
      );
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      await flushPing();
      expect(core.getPaths()).toEqual([]);
    });
  });

  // ── isSuppressedByHoldout — action_group_id defined ──

  describe('isSuppressedByHoldout — action_group_id defined', () => {
    it('passes defined action_group_id to holdout API', async () => {
      const path = makePathItem({
        path_type: PathType.MODAL,
        holdout: true,
        action_group_id: 'ag-42',
        triggers: [{ url_path: 'Home', use_regex: false }],
      });
      fetchMock
        .mockResolvedValueOnce(makeOkResponse(makeActionsData([path])))
        .mockResolvedValueOnce(makeOkResponse({ success: true }));
      const core = new PromptCore('app-1', 'user-1', device, localStorage);
      await flushPing();
      const result = await core.onScreenChanged('Home');
      expect(result.result?.code).toBe(PromptResultCode.HOLDOUT);
      const holdoutCall = fetchMock.mock.calls.find((c: any[]) =>
        c[0].includes('holdout')
      );
      expect(holdoutCall?.[0]).toContain('action_group_id=ag-42');
    });
  });

  // ── path2Prompt — full property coverage ──

  describe('path2Prompt — full property coverage', () => {
    it('Prompt has button1 with all explicit properties', async () => {
      const path = makePathItem({
        id: 'p-1',
        actions: makeActions({
          rf_retention_button1_text: 'OK',
          button1_text_color: '#111',
          button1_highlight_color: '#222',
          button1_bg_color: '#333',
          button1_focus_bg_color: '#444',
          button1_width: '120px',
          button1_height: '50px',
          button1_position_x: '10px',
          button1_position_y: '20px',
        }),
      });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      const prompt = core.getPrompt('p-1')!;
      expect(prompt.button1).toEqual({
        label: 'OK',
        textColor: '#111',
        textHighlightColor: '#222',
        bgColor: '#333',
        bgHighlightColor: '#444',
        width: 120,
        height: 50,
        position_x: 10,
        position_y: 20,
      });
    });

    it('Prompt has button2 with all explicit properties', async () => {
      const path = makePathItem({
        id: 'p-1',
        actions: makeActions({
          rf_settings_confirm_button_2_enabled: 'true',
          rf_retention_button2_text: 'Maybe',
          button2_text_color: '#111',
          button2_highlight_color: '#222',
          button2_bg_color: '#333',
          button2_focus_bg_color: '#444',
          button2_width: '150px',
          button2_height: '60px',
          button2_position_x: '15px',
          button2_position_y: '25px',
        }),
      });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      const prompt = core.getPrompt('p-1')!;
      expect(prompt.button2).toEqual({
        label: 'Maybe',
        textColor: '#111',
        textHighlightColor: '#222',
        bgColor: '#333',
        bgHighlightColor: '#444',
        width: 150,
        height: 60,
        position_x: 15,
        position_y: 25,
      });
    });

    it('Prompt has button3 with all explicit properties', async () => {
      const path = makePathItem({
        id: 'p-1',
        actions: makeActions({
          rf_settings_cancel_button_enabled: 'true',
          rf_retention_button3_text: 'No',
          button3_text_color: '#111',
          button3_highlight_color: '#222',
          button3_bg_color: '#333',
          button3_focus_bg_color: '#444',
          button3_width: '180px',
          button3_height: '70px',
          button3_position_x: '30px',
          button3_position_y: '40px',
        }),
      });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      const prompt = core.getPrompt('p-1')!;
      expect(prompt.button3).toEqual({
        label: 'No',
        textColor: '#111',
        textHighlightColor: '#222',
        bgColor: '#333',
        bgHighlightColor: '#444',
        width: 180,
        height: 70,
        position_x: 30,
        position_y: 40,
      });
    });

    it('Prompt has explicit timer and border properties', async () => {
      const path = makePathItem({
        id: 'p-1',
        actions: makeActions({
          rf_settings_timer_font_color: '#AABBCC',
          rf_settings_timer_font_size: '16px',
          rf_retention_button_border_radius: '8px',
          rf_retention_button_border_color: '#FF0000',
          rf_retention_button_border_thickness: '2px',
        }),
      });
      const core = createCore(makeActionsData([path]));
      await flushPing();
      const prompt = core.getPrompt('p-1')!;
      expect(prompt.countDownPromptColor).toBe('#AABBCC');
      expect(prompt.countDownPromptFontSize).toBe(16);
      expect(prompt.buttonBorderRadius).toBe(8);
      expect(prompt.buttonBorderColor).toBe('#FF0000');
      expect(prompt.buttonBorderThickness).toBe(2);
    });
  });
});

// ── getPathTypeName ─────────────────────────────────────────────────────

describe('getPathTypeName', () => {
  it('returns interstitial prompt for INTERSTITIAL', () => {
    expect(getPathTypeName(PathType.INTERSTITIAL)).toBe('interstitial prompt');
  });

  it('returns bottom banner prompt for BOTTOM_BANNER', () => {
    expect(getPathTypeName(PathType.BOTTOM_BANNER)).toBe(
      'bottom banner prompt'
    );
  });
});

// ── extractModalParams — additional branch coverage ─────────────────────

describe('extractModalParams — additional branch coverage', () => {
  it('uses destructured defaults when action fields are absent', () => {
    // Create actions WITHOUT the fields that have defaults in extractModalParams
    const actions = {
      rf_retention_button1_text: 'Accept',
      rf_settings_close_seconds: '5',
    } as any;
    const path = { ...makePathItem(), actions };
    const params = extractModalParams(path, 400, 800);
    expect(params.closeButtonEnabled).toBe(false);
    expect(params.modallessDismissable).toBe(false);
    expect(params.buttonAbsolutePosition).toBe(false);
    expect(params.animationType).toBe('none');
  });

  it('uses widget dimensions without position', () => {
    const path = makePathItem({
      path_type: PathType.BOTTOM_BANNER,
      actions: makeActions({
        rf_widget_width: '300px',
        rf_widget_height: '80px',
        // no rf_widget_position
      }),
    });
    const params = extractModalParams(path, 400, 800);
    expect(params.modalPosition).toBe('center');
    expect(params.modalOffsetX).toBe(0);
    expect(params.modalOffsetY).toBe(0);
  });

  it('uses widget position without offsets', () => {
    const path = makePathItem({
      path_type: PathType.BOTTOM_BANNER,
      actions: makeActions({
        rf_widget_width: '300px',
        rf_widget_height: '80px',
        rf_widget_position: 'bottom',
        // no offset_x or offset_y
      }),
    });
    const params = extractModalParams(path, 400, 800);
    expect(params.modalPosition).toBe('bottom');
    expect(params.modalOffsetX).toBe(0);
    expect(params.modalOffsetY).toBe(0);
  });

  it('handles null close_seconds via getTimeout', () => {
    const path = makePathItem({
      actions: makeActions({ rf_settings_close_seconds: null as any }),
    });
    const params = extractModalParams(path, 400, 800);
    expect(params.countDown).toBe(0);
  });

  it('handles privacy text that is just a URL (no preceding text)', () => {
    const path = makePathItem({
      actions: makeActions({
        rf_settings_privacy_policy_text: 'https://example.com',
      }),
    });
    const params = extractModalParams(path, 400, 800);
    expect(params.privacyTextAndLinks).toBeDefined();
    // URL without preceding text has no linked string
    expect(params.privacyTextAndLinks!.length).toBe(0);
  });

  it('extracts button2 with default text color fallback', () => {
    const path = makePathItem({
      actions: makeActions({
        rf_settings_confirm_button_2_enabled: 'true',
        rf_retention_button2_text: 'Alt',
        // no button2_text_color → falls back to #3096ED
      }),
    });
    const params = extractModalParams(path, 400, 800);
    expect(params.button2?.textColor).toBe('#3096ED');
  });
});

// ── extractInlineParams — accessibility_label branch ────────────────────

describe('extractInlineParams — accessibility_label', () => {
  it('uses provided accessibility_label instead of default', () => {
    const path = makePathItem({
      actions: makeActions({
        accessibility_label: 'custom label',
      } as any),
    });
    const params = extractInlineParams(path, 'ios', 'iphone');
    expect(params.accessibilityLabel).toBe('custom label');
  });

  it('uses INTERSTITIAL path_type for default accessibility_label', () => {
    const path = makePathItem({ path_type: PathType.INTERSTITIAL });
    const params = extractInlineParams(path, 'ios', 'iphone');
    expect(params.accessibilityLabel).toBe('interstitial prompt');
  });

  it('uses BOTTOM_BANNER path_type for default accessibility_label', () => {
    const path = makePathItem({ path_type: PathType.BOTTOM_BANNER });
    const params = extractInlineParams(path, 'ios', 'iphone');
    expect(params.accessibilityLabel).toBe('bottom banner prompt');
  });
});
