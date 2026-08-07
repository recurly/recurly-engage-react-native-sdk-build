import { create, act } from 'react-test-renderer';
import { Platform, Dimensions } from 'react-native';

// ── mock values ─────────────────────────────────────────────────────────

const mockApi = {
  dismiss: jest.fn().mockResolvedValue(undefined),
  impression: jest.fn().mockResolvedValue(undefined),
  goal: jest.fn().mockResolvedValue(undefined),
};

const mockLocalStorage = {
  createNewOverlayKey: jest.fn().mockResolvedValue(undefined),
};

const mockOnScreenChanged = jest.fn();
const mockOnButtonClicked = jest.fn();
const mockDecodeDeeplink = jest.fn();
const mockPreparePromptResult = jest.fn();
let capturedLocalStorage: any = null;

// ── module mocks ────────────────────────────────────────────────────────

jest.mock('@recurly/engage-core', () => ({
  PathType: {
    MODAL: 2,
    HORIZONTAL: 5,
    VIDEO: 6,
    INTERSTITIAL: 10,
    BOTTOM_BANNER: 13,
  },
  PromptResultCode: {
    ERROR: -100,
    IMPRESSION: 100,
    BUTTON1: 101,
    BUTTON2: 102,
    BUTTON3: 103,
    DISMISS: 110,
    TIMEOUT: 111,
  },
  decodeDeeplink: (...args: any[]) => mockDecodeDeeplink(...args),
  preparePromptResult: (...args: any[]) => mockPreparePromptResult(...args),
  PromptCore: class MockPromptCore {
    constructor(_a: any, _b: any, _c: any, ls?: any) {
      capturedLocalStorage = ls || null;
    }
    getApi() {
      return mockApi;
    }
    getLocalStorage() {
      return mockLocalStorage;
    }
    onScreenChanged(screen: string) {
      return mockOnScreenChanged(screen);
    }
    onButtonClicked(id: string) {
      return mockOnButtonClicked(id);
    }
  },
}));

const mockSetGlobalDeviceInfo = jest.fn();
let mockGDeviceInfo: any = {
  device_manufacturer: 'Apple',
  device_model: 'iPhone OS',
  device_type: 'ios',
  device_category: 'iphone',
  device_form: 'phone',
};

jest.mock('../utils', () => ({
  get gDeviceInfo() {
    return mockGDeviceInfo;
  },
  setGlobalDeviceInfo: (...args: any[]) => {
    mockSetGlobalDeviceInfo(...args);
    if (args[0]) mockGDeviceInfo = args[0];
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn(),
  getAllKeys: jest.fn().mockResolvedValue([]),
}));

let mockDeviceType = 1;
jest.mock('expo-device', () => ({
  DeviceType: { PHONE: 1, TABLET: 2 },
  get deviceType() {
    return mockDeviceType;
  },
}));

// Mock prompt UI components
jest.mock('../PromptDialog', () => ({
  PromptDialog: function MockDialog() {
    return null;
  },
}));
jest.mock('../PromptVideoDialog', () => ({
  PromptVideoDialog: function MockVideo() {
    return null;
  },
}));
jest.mock('../PromptInterstitial', () => ({
  PromptInterstitial: function MockInterstitial() {
    return null;
  },
}));
jest.mock('../PromptBottomBanner', () => ({
  PromptBottomBanner: function MockBanner() {
    return null;
  },
}));

// ── imports after mocks ─────────────────────────────────────────────────

import { useReducer } from 'react';
import { PromptManager, PromptOverlay, PromptProvider } from '../PromptManager';
import {
  PromptAction_Set_Prompt,
  PromptContext,
  PromptReducer,
  initialState,
} from '../usePrompt';
import { PromptDialog } from '../PromptDialog';
import { PromptVideoDialog } from '../PromptVideoDialog';
import { PromptInterstitial } from '../PromptInterstitial';
import { PromptBottomBanner } from '../PromptBottomBanner';

// ── helpers ─────────────────────────────────────────────────────────────

function makePath(overrides: Record<string, any> = {}): any {
  return {
    name: 'test-path',
    id: 'path-1',
    order: 0,
    path_type: 2, // MODAL
    action_group_id: 'ag-1',
    actions: {
      rf_settings_timeout_interval: '86400',
      rf_settings_accept_interval: '86400',
      rf_settings_decline_interval: '86400',
      rf_settings_dismiss_interval: '86400',
      rf_metadata: { key: 'value' },
      rf_settings_deeplink: 'screen=home&tab=1',
      ...overrides,
    },
  };
}

// ── PromptManager class tests ───────────────────────────────────────────

describe('PromptManager', () => {
  let dispatch: jest.Mock;
  let mgr: PromptManager;

  beforeEach(() => {
    jest.useFakeTimers();
    dispatch = jest.fn();
    mockDecodeDeeplink.mockReturnValue({ screen: 'home', tab: '1' });
    mockPreparePromptResult.mockImplementation((arg: any) => arg);
    mockApi.dismiss.mockResolvedValue(undefined);
    mockApi.impression.mockResolvedValue(undefined);
    mockApi.goal.mockResolvedValue(undefined);
    mockLocalStorage.createNewOverlayKey.mockResolvedValue(undefined);
    mockOnScreenChanged.mockResolvedValue({
      path: makePath(),
      delaySeconds: 0,
    });
    mockOnButtonClicked.mockResolvedValue({
      path: makePath(),
      delaySeconds: 0,
    });
    mgr = new PromptManager('app-id', 'user-1', dispatch);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  // ── constructor ──

  describe('constructor', () => {
    it('calls setGlobalDeviceInfo during construction', () => {
      expect(mockSetGlobalDeviceInfo).toHaveBeenCalled();
    });
  });

  // ── onEvent ──

  describe('onEvent', () => {
    const onEventCb = jest.fn();

    beforeEach(() => {
      onEventCb.mockReset();
    });

    it('sets IMPRESSION code and calls api.impression', async () => {
      const path = makePath();
      mgr.onEvent(path, 'impression', onEventCb);

      const call = mockPreparePromptResult.mock.calls[0][0];
      expect(call.code).toBe(100); // IMPRESSION
      expect(onEventCb).toHaveBeenCalled();

      await act(async () => {
        await Promise.resolve();
      });
      expect(mockApi.impression).toHaveBeenCalledWith('path-1', 'ag-1');
      expect(mockLocalStorage.createNewOverlayKey).not.toHaveBeenCalled();
    });

    it('sets TIMEOUT code and calls api.dismiss with timeout', async () => {
      const path = makePath();
      mgr.onEvent(path, 'timeout', onEventCb);

      const call = mockPreparePromptResult.mock.calls[0][0];
      expect(call.code).toBe(111); // TIMEOUT

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(mockApi.dismiss).toHaveBeenCalledWith('path-1', 'timeout', 'ag-1');
      expect(mockLocalStorage.createNewOverlayKey).toHaveBeenCalledWith(
        'path-1',
        '86400'
      );
    });

    it('sets DISMISS code and calls api.dismiss with dismiss', async () => {
      const path = makePath();
      mgr.onEvent(path, 'dismiss', onEventCb);

      const call = mockPreparePromptResult.mock.calls[0][0];
      expect(call.code).toBe(110); // DISMISS

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(mockApi.dismiss).toHaveBeenCalledWith('path-1', 'dismiss', 'ag-1');
      expect(mockLocalStorage.createNewOverlayKey).toHaveBeenCalledWith(
        'path-1',
        '86400'
      );
    });

    it('sets BUTTON1 code with deeplink for goal', async () => {
      mockDecodeDeeplink.mockReturnValue({ screen: 'upgrade' });
      const path = makePath();
      mgr.onEvent(path, 'goal', onEventCb);

      const call = mockPreparePromptResult.mock.calls[0][0];
      expect(call.code).toBe(101); // BUTTON1
      expect(call.value).toEqual({ screen: 'upgrade' });

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(mockApi.goal).toHaveBeenCalledWith(
        'path-1',
        'ag-1',
        undefined,
        undefined,
        undefined
      );
      expect(mockLocalStorage.createNewOverlayKey).toHaveBeenCalledWith(
        'path-1',
        '86400'
      );
    });

    it('sets BUTTON2 code with deeplink for goal2', async () => {
      mockDecodeDeeplink.mockReturnValue({ screen: 'later' });
      const path = makePath();
      mgr.onEvent(path, 'goal2', onEventCb);

      const call = mockPreparePromptResult.mock.calls[0][0];
      expect(call.code).toBe(102); // BUTTON2
      expect(call.value).toEqual({ screen: 'later' });

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(mockApi.goal).toHaveBeenCalledWith(
        'path-1',
        'ag-1',
        undefined,
        'accept2'
      );
    });

    it('sets BUTTON3 code for decline', async () => {
      const path = makePath();
      mgr.onEvent(path, 'decline', onEventCb);

      const call = mockPreparePromptResult.mock.calls[0][0];
      expect(call.code).toBe(103); // BUTTON3

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(mockApi.dismiss).toHaveBeenCalledWith('path-1', 'decline', 'ag-1');
      expect(mockLocalStorage.createNewOverlayKey).toHaveBeenCalledWith(
        'path-1',
        '86400'
      );
    });

    it('does not create overlay key for HORIZONTAL path type', async () => {
      const path = makePath();
      path.path_type = 5; // HORIZONTAL
      mgr.onEvent(path, 'timeout', onEventCb);

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(mockApi.dismiss).toHaveBeenCalledWith('path-1', 'timeout', 'ag-1');
      expect(mockLocalStorage.createNewOverlayKey).not.toHaveBeenCalled();
    });

    it.each(['dismiss', 'goal', 'goal2', 'decline'])(
      'does not create overlay key for HORIZONTAL path type on %s',
      async (reason) => {
        const path = makePath();
        path.path_type = 5; // HORIZONTAL
        mgr.onEvent(path, reason, onEventCb);

        await act(async () => {
          await Promise.resolve();
          await Promise.resolve();
        });
        expect(mockLocalStorage.createNewOverlayKey).not.toHaveBeenCalled();
      }
    );

    it('passes rf_metadata in result', () => {
      const path = makePath();
      mgr.onEvent(path, 'impression', onEventCb);

      const call = mockPreparePromptResult.mock.calls[0][0];
      expect(call.meta).toEqual({ key: 'value' });
    });

    it('defaults to ERROR code for unknown reason', () => {
      const path = makePath();
      mgr.onEvent(path, 'unknown_reason', onEventCb);

      const call = mockPreparePromptResult.mock.calls[0][0];
      expect(call.code).toBe(-100); // ERROR
    });

    it('calls preparePromptResult with path included', () => {
      const path = makePath();
      mgr.onEvent(path, 'goal', onEventCb);

      const call = mockPreparePromptResult.mock.calls[0][0];
      expect(call.path).toBe(path);
    });
  });

  // ── screenChanged ──

  describe('screenChanged', () => {
    it('calls onScreenChanged and dispatches Set_Prompt', async () => {
      const candidate = { path: makePath(), delaySeconds: 2 };
      mockOnScreenChanged.mockResolvedValue(candidate);

      mgr.screenChanged('settings');

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockOnScreenChanged).toHaveBeenCalledWith('settings');
      expect(dispatch).toHaveBeenCalledWith({
        type: PromptAction_Set_Prompt,
        data: candidate,
      });
    });
  });

  // ── buttonClicked ──

  describe('buttonClicked', () => {
    it('calls onButtonClicked and dispatches Set_Prompt', async () => {
      const candidate = { path: makePath(), delaySeconds: 0 };
      mockOnButtonClicked.mockResolvedValue(candidate);

      mgr.buttonClicked('btn-upgrade');

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockOnButtonClicked).toHaveBeenCalledWith('btn-upgrade');
      expect(dispatch).toHaveBeenCalledWith({
        type: PromptAction_Set_Prompt,
        data: candidate,
      });
    });
  });

  // ── showPrompt ──

  describe('showPrompt', () => {
    it('dispatches Set_Prompt with path and zero delay', () => {
      const pathItem = makePath();
      const prompt = { pathItem } as any;
      mgr.showPrompt(prompt);

      expect(dispatch).toHaveBeenCalledWith({
        type: PromptAction_Set_Prompt,
        data: { path: pathItem, delaySeconds: 0 },
      });
    });
  });

  // ── unimplemented methods ──

  describe('unimplemented methods', () => {
    it('getIapItems throws', () => {
      expect(() => mgr.getIapItems()).toThrow('not implemented');
    });

    it('getPurchasedItems throws', () => {
      expect(() => mgr.getPurchasedItems()).toThrow('not implemented');
    });

    it('purchaseIap throws', () => {
      expect(() => mgr.purchaseIap()).toThrow('not implemented');
    });
  });

  // ── initDeviceInfo platform branches ──

  describe('initDeviceInfo', () => {
    const savedDescriptors: Record<string, PropertyDescriptor | undefined> = {};

    function setPlatform(props: Record<string, any>) {
      for (const [key, value] of Object.entries(props)) {
        if (!(key in savedDescriptors)) {
          savedDescriptors[key] = Object.getOwnPropertyDescriptor(
            Platform,
            key
          );
        }
        Object.defineProperty(Platform, key, {
          value,
          configurable: true,
          writable: true,
        });
      }
    }

    beforeEach(() => {
      mockSetGlobalDeviceInfo.mockClear();
    });

    afterEach(() => {
      for (const [key, desc] of Object.entries(savedDescriptors)) {
        if (desc) {
          Object.defineProperty(Platform, key, desc);
        }
      }
      // clear for next test
      for (const key of Object.keys(savedDescriptors)) {
        delete savedDescriptors[key];
      }
    });

    it('detects iPad', () => {
      setPlatform({
        OS: 'ios',
        isPad: true,
        isTV: false,
        constants: { systemName: 'iPadOS' },
      });

      new PromptManager('app-id', 'user-1', jest.fn());

      expect(mockSetGlobalDeviceInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          device_type: 'ios',
          device_category: 'ipad',
          device_form: 'tablet',
          device_manufacturer: 'Apple',
        })
      );
    });

    it('detects Apple TV', () => {
      setPlatform({
        OS: 'ios',
        isPad: false,
        isTV: true,
        constants: { systemName: 'tvOS' },
      });

      new PromptManager('app-id', 'user-1', jest.fn());

      expect(mockSetGlobalDeviceInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          device_type: 'tv_os',
          device_category: 'tv',
          device_form: 'tv',
          device_manufacturer: 'Apple',
        })
      );
    });

    it('detects Android phone', () => {
      setPlatform({
        OS: 'android',
        isTV: false,
        constants: {
          Manufacturer: 'Samsung',
          Model: 'Galaxy S21',
          uiMode: 'normal',
        },
      });
      mockDeviceType = 1; // PHONE

      new PromptManager('app-id', 'user-1', jest.fn());

      expect(mockSetGlobalDeviceInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          device_type: 'android_os',
          device_category: 'phone',
          device_form: 'phone',
          device_manufacturer: 'Samsung',
          device_model: 'Galaxy S21',
        })
      );
    });

    it('detects Android tablet', () => {
      setPlatform({
        OS: 'android',
        isTV: false,
        constants: {
          Manufacturer: 'Samsung',
          Model: 'Galaxy Tab',
          uiMode: 'normal',
        },
      });
      mockDeviceType = 2; // TABLET

      new PromptManager('app-id', 'user-1', jest.fn());

      expect(mockSetGlobalDeviceInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          device_type: 'android_os',
          device_category: 'tablet',
          device_form: 'tablet',
        })
      );

      mockDeviceType = 1; // restore
    });

    it('detects Android TV', () => {
      setPlatform({
        OS: 'android',
        isTV: true,
        constants: {
          Manufacturer: 'Sony',
          Model: 'Bravia',
          uiMode: 'tv',
        },
      });

      new PromptManager('app-id', 'user-1', jest.fn());

      expect(mockSetGlobalDeviceInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          device_type: 'android_tv',
          device_category: 'tv',
          device_form: 'tv',
        })
      );
    });

    it('detects kepler (Amazon Fire TV)', () => {
      setPlatform({ OS: 'kepler', isTV: false, constants: {} });

      new PromptManager('app-id', 'user-1', jest.fn());

      expect(mockSetGlobalDeviceInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          device_type: 'android_tv',
          device_category: 'tv',
          device_form: 'tv',
          device_manufacturer: 'Amazon',
          device_model: 'Vega',
        })
      );
    });

    it('uses unknown defaults for unrecognized platform', () => {
      setPlatform({ OS: 'windows', isTV: false, constants: {} });

      new PromptManager('app-id', 'user-1', jest.fn());

      expect(mockSetGlobalDeviceInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          device_type: 'unknown',
          device_category: 'unknown',
          device_form: 'unknown',
          device_manufacturer: 'unknown',
          device_model: 'unknown',
        })
      );
    });
  });

  // ── localStorage adapter lambdas ──

  describe('localStorage adapter', () => {
    it('getValue delegates to AsyncStorage.getItem', async () => {
      const AsyncStorageMock = require('@react-native-async-storage/async-storage');
      AsyncStorageMock.getItem.mockResolvedValueOnce('test-value');

      const result = await capturedLocalStorage.getValue('test-key');

      expect(AsyncStorageMock.getItem).toHaveBeenCalledWith('test-key');
      expect(result).toBe('test-value');
    });

    it('hasKey returns true when value exists', async () => {
      const AsyncStorageMock = require('@react-native-async-storage/async-storage');
      AsyncStorageMock.getItem.mockResolvedValueOnce('some-value');

      const result = await capturedLocalStorage.hasKey('test-key');

      expect(result).toBe(true);
    });

    it('hasKey returns false when value is null', async () => {
      const AsyncStorageMock = require('@react-native-async-storage/async-storage');
      AsyncStorageMock.getItem.mockResolvedValueOnce(null);

      const result = await capturedLocalStorage.hasKey('test-key');

      expect(result).toBe(false);
    });

    it('getAllKeys delegates to AsyncStorage.getAllKeys', async () => {
      const AsyncStorageMock = require('@react-native-async-storage/async-storage');
      AsyncStorageMock.getAllKeys.mockResolvedValueOnce(['key1', 'key2']);

      const result = await capturedLocalStorage.getAllKeys();

      expect(AsyncStorageMock.getAllKeys).toHaveBeenCalled();
      expect(result).toEqual(['key1', 'key2']);
    });
  });
});

// ── PromptOverlay tests ─────────────────────────────────────────────────

describe('PromptOverlay', () => {
  let tree: ReturnType<typeof create>;
  const onEvent = jest.fn();
  let mockDispatch: jest.Mock;
  let dimensionsSpy: jest.SpyInstance;

  function renderOverlay(prompt: any) {
    const state = { ...initialState, prompt };
    return create(
      <PromptContext.Provider value={{ state, dispatch: mockDispatch }}>
        <PromptOverlay onEvent={onEvent} />
      </PromptContext.Provider>
    );
  }

  beforeEach(() => {
    jest.useFakeTimers();
    onEvent.mockReset();
    mockDispatch = jest.fn();
    mockGDeviceInfo = {
      device_manufacturer: 'Apple',
      device_model: 'iPhone OS',
      device_type: 'ios',
      device_category: 'iphone',
      device_form: 'phone',
    };
    dimensionsSpy = jest.spyOn(Dimensions, 'get').mockReturnValue({
      width: 375,
      height: 812,
      scale: 2,
      fontScale: 1,
    });
  });

  afterEach(() => {
    if (tree) {
      act(() => {
        tree.unmount();
      });
    }
    jest.clearAllTimers();
    jest.useRealTimers();
    dimensionsSpy.mockRestore();
  });

  it('renders null when path is undefined', () => {
    const prompt = { delaySeconds: 0 };
    tree = renderOverlay(prompt);
    expect(tree.toJSON()).toBeNull();
  });

  it('delays rendering by delaySeconds', async () => {
    const path = makePath();
    const prompt = { path, delaySeconds: 3 };
    act(() => {
      tree = renderOverlay(prompt);
    });

    // Not shown yet
    expect(tree.root.findAllByType(PromptDialog).length).toBe(0);

    // Advance past delay
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(tree.root.findAllByType(PromptDialog).length).toBe(1);
  });

  it('renders immediately when delaySeconds is 0', async () => {
    const path = makePath();
    path.path_type = 2; // MODAL
    const prompt = { path, delaySeconds: 0 };
    act(() => {
      tree = renderOverlay(prompt);
    });

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(tree.root.findAllByType(PromptDialog).length).toBe(1);
  });

  it('renders PromptDialog for MODAL path type', async () => {
    const path = makePath();
    path.path_type = 2; // MODAL
    const prompt = { path, delaySeconds: 0 };
    act(() => {
      tree = renderOverlay(prompt);
    });
    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(tree.root.findAllByType(PromptDialog).length).toBe(1);
    expect(tree.root.findAllByType(PromptVideoDialog).length).toBe(0);
  });

  it('forwards dialogExternal to PromptDialog as external prop', async () => {
    const path = makePath();
    path.path_type = 2; // MODAL
    const prompt = { path, delaySeconds: 0 };
    const dialogExternal = {
      closeButtonColor: '#FF0000',
      closeButtonBgColor: 'transparent',
      closeButtonSize: 24,
      timerFontSize: 18,
      timerFontColor: '#FFFFFF',
    };
    const state = { ...initialState, prompt };
    act(() => {
      tree = create(
        <PromptContext.Provider value={{ state, dispatch: mockDispatch }}>
          <PromptOverlay onEvent={onEvent} dialogExternal={dialogExternal} />
        </PromptContext.Provider>
      );
    });
    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    const dialog = tree.root.findByType(PromptDialog);
    expect(dialog.props.external).toEqual(dialogExternal);
  });

  it('renders PromptVideoDialog for VIDEO path type', async () => {
    const path = makePath();
    path.path_type = 6; // VIDEO
    const prompt = { path, delaySeconds: 0 };
    act(() => {
      tree = renderOverlay(prompt);
    });
    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(tree.root.findAllByType(PromptVideoDialog).length).toBe(1);
  });

  it('renders PromptBottomBanner for BOTTOM_BANNER path type', async () => {
    const path = makePath();
    path.path_type = 13; // BOTTOM_BANNER
    const prompt = { path, delaySeconds: 0 };
    act(() => {
      tree = renderOverlay(prompt);
    });
    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(tree.root.findAllByType(PromptBottomBanner).length).toBe(1);
  });

  it('renders PromptInterstitial on phone in portrait mode', async () => {
    mockGDeviceInfo = { device_form: 'phone' };
    dimensionsSpy.mockReturnValue({
      width: 375,
      height: 812,
      scale: 2,
      fontScale: 1,
    });

    const path = makePath();
    path.path_type = 10; // INTERSTITIAL
    const prompt = { path, delaySeconds: 0 };
    act(() => {
      tree = renderOverlay(prompt);
    });
    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(tree.root.findAllByType(PromptInterstitial).length).toBe(1);
  });

  it('does not render PromptInterstitial on phone in landscape mode', async () => {
    mockGDeviceInfo = { device_form: 'phone' };
    dimensionsSpy.mockReturnValue({
      width: 812,
      height: 375,
      scale: 2,
      fontScale: 1,
    });

    const path = makePath();
    path.path_type = 10; // INTERSTITIAL
    const prompt = { path, delaySeconds: 0 };
    act(() => {
      tree = renderOverlay(prompt);
    });
    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(tree.root.findAllByType(PromptInterstitial).length).toBe(0);
  });

  it('renders PromptInterstitial on TV regardless of dimensions', async () => {
    mockGDeviceInfo = { device_form: 'tv' };
    dimensionsSpy.mockReturnValue({
      width: 1920,
      height: 1080,
      scale: 1,
      fontScale: 1,
    });

    const path = makePath();
    path.path_type = 10; // INTERSTITIAL
    const prompt = { path, delaySeconds: 0 };
    act(() => {
      tree = renderOverlay(prompt);
    });
    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(tree.root.findAllByType(PromptInterstitial).length).toBe(1);
  });

  it('logs and returns early when prompt is already showing and path changes', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const path1 = makePath();
    path1.path_type = 2; // MODAL
    const prompt1 = { path: path1, delaySeconds: 0 };

    act(() => {
      tree = renderOverlay(prompt1);
    });
    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    // Prompt is now showing
    expect(tree.root.findAllByType(PromptDialog).length).toBe(1);

    consoleSpy.mockClear();

    // Update with a different path to trigger the effect re-run
    const path2 = { ...makePath(), id: 'path-2', path_type: 2 };
    const prompt2 = { path: path2, delaySeconds: 0 };

    act(() => {
      tree.update(
        <PromptContext.Provider
          value={{
            state: { ...initialState, prompt: prompt2 },
            dispatch: mockDispatch,
          }}
        >
          <PromptOverlay onEvent={onEvent} />
        </PromptContext.Provider>
      );
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'there is one prompt currently shown'
    );
    consoleSpy.mockRestore();
  });

  it('returns null for unknown path types', async () => {
    const path = makePath();
    path.path_type = 999;
    const prompt = { path, delaySeconds: 0 };
    act(() => {
      tree = renderOverlay(prompt);
    });
    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(tree.toJSON()).toBeNull();
  });

  it('handleClose hides prompt for non-impression result', async () => {
    const path = makePath();
    path.path_type = 2; // MODAL
    const prompt = { path, delaySeconds: 0 };
    act(() => {
      tree = renderOverlay(prompt);
    });
    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    const dialog = tree.root.findByType(PromptDialog);
    act(() => {
      dialog.props.onEvent({ code: 110 }); // DISMISS
    });

    expect(tree.root.findAllByType(PromptDialog).length).toBe(0);
    expect(onEvent).toHaveBeenCalledWith({ code: 110 });
  });

  it('handleClose does not hide prompt for impression result', async () => {
    const path = makePath();
    path.path_type = 2; // MODAL
    const prompt = { path, delaySeconds: 0 };
    act(() => {
      tree = renderOverlay(prompt);
    });
    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    const dialog = tree.root.findByType(PromptDialog);
    act(() => {
      dialog.props.onEvent({ code: 100 }); // IMPRESSION
    });

    // Prompt should still be visible
    expect(tree.root.findAllByType(PromptDialog).length).toBe(1);
    expect(onEvent).toHaveBeenCalledWith({ code: 100 });
  });

  it('passes path and onEvent to child component', async () => {
    const path = makePath();
    path.path_type = 6; // VIDEO
    const prompt = { path, delaySeconds: 0 };
    act(() => {
      tree = renderOverlay(prompt);
    });
    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    const video = tree.root.findByType(PromptVideoDialog);
    expect(video.props.path).toBe(path);
    expect(video.props.onEvent).toBeDefined();
  });

  // ── handleClose: sequence logic and outer switch default ─────────────────

  describe('handleClose: sequence logic and outer switch default', () => {
    function makeSeqPath(
      actionOverrides: Record<string, any> = {},
      seqOverrides: Record<string, any> = {}
    ): any {
      const path = makePath(actionOverrides);
      path.path_type = 2; // MODAL
      path.sequence = {
        id: 'seq-1',
        order: 1,
        continue_interaction_types: [],
        ...seqOverrides,
      };
      return path;
    }

    // Covers line 124: outer switch default case (VIDEO is not MODAL/BANNER/INTERSTITIAL)
    it('hits outer default case for VIDEO path type with non-impression close', async () => {
      const path = makePath();
      path.path_type = 6; // VIDEO
      act(() => {
        tree = renderOverlay({ path, delaySeconds: 0 });
      });
      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      const video = tree.root.findByType(PromptVideoDialog);
      act(() => {
        video.props.onEvent({ code: 110 }); // DISMISS — non-impression
      });

      expect(tree.root.findAllByType(PromptVideoDialog).length).toBe(0);
      expect(onEvent).toHaveBeenCalledWith({ code: 110 });
    });

    // Covers: path.sequence true branch, BUTTON1 case, rf_retention_button1_text ?? '' (defined),
    // continue_interaction_types true, getPaths with next found → dispatch (if(next) true)
    it('BUTTON1 with defined text dispatches next sequence path', async () => {
      const path = makeSeqPath(
        { rf_retention_button1_text: 'upgrade' },
        { id: 'seq-1', order: 1, continue_interaction_types: ['upgrade'] }
      );
      const nextPath: any = { ...makePath(), id: 'path-next' };
      nextPath.sequence = {
        id: 'seq-1',
        order: 2,
        continue_interaction_types: [],
      };

      // Include a path without sequence so nullish branch of p.sequence?.id is also covered
      const mockMgr = {
        getPaths: jest.fn().mockReturnValue([makePath(), nextPath]),
      };
      const state = {
        ...initialState,
        prompt: { path, delaySeconds: 0 },
        promptMgr: mockMgr as any,
      };

      act(() => {
        tree = create(
          <PromptContext.Provider value={{ state, dispatch: mockDispatch }}>
            <PromptOverlay onEvent={onEvent} />
          </PromptContext.Provider>
        );
      });
      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      const dialog = tree.root.findByType(PromptDialog);
      act(() => {
        dialog.props.onEvent({ code: 101 }); // BUTTON1
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: PromptAction_Set_Prompt,
        data: { path: nextPath, delaySeconds: 0 },
      });
    });

    // Covers: BUTTON1 with undefined rf_retention_button1_text (reason = '' via ?? ''),
    // continue_interaction_types = [''] → true, promptMgr undefined → if(next) false
    it('BUTTON1 with undefined text, continue matches empty string, no next', async () => {
      const path = makeSeqPath({}, { continue_interaction_types: [''] });
      act(() => {
        tree = renderOverlay({ path, delaySeconds: 0 });
      });
      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      const dialog = tree.root.findByType(PromptDialog);
      act(() => {
        dialog.props.onEvent({ code: 101 }); // BUTTON1 → reason = ''
      });

      // Clear dispatch is always sent on close; no next-path dispatch expected
      expect(mockDispatch).toHaveBeenCalledWith({
        type: PromptAction_Set_Prompt,
        data: { delaySeconds: 0 },
      });
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: PromptAction_Set_Prompt,
          data: expect.objectContaining({ path: expect.anything() }),
        })
      );
      expect(tree.root.findAllByType(PromptDialog).length).toBe(0);
    });

    // Covers: BUTTON2 case, rf_retention_button2_text ?? '' (defined), continue does NOT match
    it('BUTTON2 with defined text, continue_interaction_types does not match', async () => {
      const path = makeSeqPath(
        { rf_retention_button2_text: 'later' },
        { continue_interaction_types: ['other'] }
      );
      act(() => {
        tree = renderOverlay({ path, delaySeconds: 0 });
      });
      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      const dialog = tree.root.findByType(PromptDialog);
      act(() => {
        dialog.props.onEvent({ code: 102 }); // BUTTON2
      });

      // Clear dispatch is always sent on close; no next-path dispatch expected
      expect(mockDispatch).toHaveBeenCalledWith({
        type: PromptAction_Set_Prompt,
        data: { delaySeconds: 0 },
      });
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: PromptAction_Set_Prompt,
          data: expect.objectContaining({ path: expect.anything() }),
        })
      );
      expect(tree.root.findAllByType(PromptDialog).length).toBe(0);
    });

    // Covers: BUTTON2 with undefined rf_retention_button2_text (reason = '' via ?? '')
    it('BUTTON2 with undefined text, reason stays empty', async () => {
      const path = makeSeqPath({}, { continue_interaction_types: ['other'] });
      act(() => {
        tree = renderOverlay({ path, delaySeconds: 0 });
      });
      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      const dialog = tree.root.findByType(PromptDialog);
      act(() => {
        dialog.props.onEvent({ code: 102 }); // BUTTON2 → reason = ''
      });

      expect(tree.root.findAllByType(PromptDialog).length).toBe(0);
    });

    // Covers: BUTTON3 case (reason = 'declined'), continue matches, getPaths returns empty → if(next) false
    it('BUTTON3: reason "declined", continue matches, no next path found', async () => {
      const path = makeSeqPath(
        {},
        { continue_interaction_types: ['declined'] }
      );
      const mockMgr = { getPaths: jest.fn().mockReturnValue([]) };
      const state = {
        ...initialState,
        prompt: { path, delaySeconds: 0 },
        promptMgr: mockMgr as any,
      };

      act(() => {
        tree = create(
          <PromptContext.Provider value={{ state, dispatch: mockDispatch }}>
            <PromptOverlay onEvent={onEvent} />
          </PromptContext.Provider>
        );
      });
      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      const dialog = tree.root.findByType(PromptDialog);
      act(() => {
        dialog.props.onEvent({ code: 103 }); // BUTTON3
      });

      // Clear dispatch is always sent on close; no next-path dispatch expected
      expect(mockDispatch).toHaveBeenCalledWith({
        type: PromptAction_Set_Prompt,
        data: { delaySeconds: 0 },
      });
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: PromptAction_Set_Prompt,
          data: expect.objectContaining({ path: expect.anything() }),
        })
      );
      expect(tree.root.findAllByType(PromptDialog).length).toBe(0);
    });

    // Covers: DISMISS case in inner switch (reason = 'dismissed'), continue does not match
    it('DISMISS in sequence: reason "dismissed", continue does not include it', async () => {
      const path = makeSeqPath({}, { continue_interaction_types: ['timeout'] });
      act(() => {
        tree = renderOverlay({ path, delaySeconds: 0 });
      });
      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      const dialog = tree.root.findByType(PromptDialog);
      act(() => {
        dialog.props.onEvent({ code: 110 }); // DISMISS
      });

      expect(tree.root.findAllByType(PromptDialog).length).toBe(0);
    });

    // Covers: TIMEOUT case in inner switch (reason = 'timeout'), continue matches, promptMgr undefined
    it('TIMEOUT in sequence: reason "timeout", continue matches, no promptMgr', async () => {
      const path = makeSeqPath({}, { continue_interaction_types: ['timeout'] });
      act(() => {
        tree = renderOverlay({ path, delaySeconds: 0 });
      });
      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      const dialog = tree.root.findByType(PromptDialog);
      act(() => {
        dialog.props.onEvent({ code: 111 }); // TIMEOUT
      });

      expect(tree.root.findAllByType(PromptDialog).length).toBe(0);
    });

    // Covers: inner switch default case (unknown code keeps reason = '')
    it('inner switch default: unknown code, reason stays empty', async () => {
      const path = makeSeqPath({}, { continue_interaction_types: ['other'] });
      act(() => {
        tree = renderOverlay({ path, delaySeconds: 0 });
      });
      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      const dialog = tree.root.findByType(PromptDialog);
      act(() => {
        dialog.props.onEvent({ code: 999 }); // unknown → default branch
      });

      expect(tree.root.findAllByType(PromptDialog).length).toBe(0);
    });
  });

  // ── Regression: re-trigger same prompt after dismiss on cached ping ──────
  // Root cause: useEffect([delaySeconds, path]) skips when path is the same
  // object reference (304 ping → actions not replaced → same PathItem ref).
  // Fix: clear dispatch (path → undefined) on every close so the next trigger
  // produces a genuine undefined → pathObject reference change.
  describe('re-trigger same prompt after dismiss', () => {
    function renderWithRealReducer(initialPath: any) {
      let dispatchRef: any;

      const Wrapper = () => {
        const [state, dispatch] = useReducer(PromptReducer, {
          ...initialState,
          prompt: { path: initialPath, delaySeconds: 0 },
        });
        dispatchRef = dispatch;
        return (
          <PromptContext.Provider value={{ state, dispatch }}>
            <PromptOverlay onEvent={onEvent} />
          </PromptContext.Provider>
        );
      };

      act(() => {
        tree = create(<Wrapper />);
      });

      return { getDispatch: () => dispatchRef };
    }

    it('prompt re-appears after dismiss when same path reference is re-dispatched', async () => {
      const path = makePath();
      path.path_type = 2; // MODAL

      const { getDispatch } = renderWithRealReducer(path);

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      // Prompt is visible
      expect(tree.root.findAllByType(PromptDialog).length).toBe(1);

      // User dismisses
      act(() => {
        tree.root.findByType(PromptDialog).props.onEvent({ code: 110 }); // DISMISS
      });
      expect(tree.root.findAllByType(PromptDialog).length).toBe(0);

      // screenChanged dispatches the SAME path object reference (304-cached ping scenario)
      act(() => {
        getDispatch()({
          type: PromptAction_Set_Prompt,
          data: { path, delaySeconds: 0 },
        });
      });
      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      // Without fix: prompt stays hidden (useEffect skips, same ref).
      // With fix: clear dispatch makes path go undefined → path → effect fires.
      expect(tree.root.findAllByType(PromptDialog).length).toBe(1);
    });

    it('impression event does not trigger clear dispatch or hide prompt', async () => {
      const path = makePath();
      path.path_type = 2; // MODAL

      renderWithRealReducer(path);

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      expect(tree.root.findAllByType(PromptDialog).length).toBe(1);

      // Impression fires — must NOT hide the prompt
      act(() => {
        tree.root.findByType(PromptDialog).props.onEvent({ code: 100 }); // IMPRESSION
      });

      expect(tree.root.findAllByType(PromptDialog).length).toBe(1);
    });

    it('sequence next prompt shows immediately after dismiss without waiting for new ping', async () => {
      const nextPath = { ...makePath(), id: 'path-next' };
      (nextPath as any).sequence = {
        id: 'seq-1',
        order: 2,
        continue_interaction_types: [],
      };

      const path = makePath({ rf_retention_button1_text: 'upgrade' });
      (path as any).sequence = {
        id: 'seq-1',
        order: 1,
        continue_interaction_types: ['upgrade'],
      };

      const mockMgr = { getPaths: jest.fn().mockReturnValue([nextPath]) };

      const Wrapper = () => {
        const [state, dispatch] = useReducer(PromptReducer, {
          ...initialState,
          prompt: { path, delaySeconds: 0 },
          promptMgr: mockMgr as any,
        });
        return (
          <PromptContext.Provider value={{ state, dispatch }}>
            <PromptOverlay onEvent={onEvent} />
          </PromptContext.Provider>
        );
      };

      act(() => {
        tree = create(<Wrapper />);
      });
      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      expect(tree.root.findAllByType(PromptDialog).length).toBe(1);

      // BUTTON1 triggers sequence — next prompt must appear even with the clear dispatch
      act(() => {
        tree.root.findByType(PromptDialog).props.onEvent({ code: 101 }); // BUTTON1
      });
      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      // Next sequence path should be showing (clear + next dispatches are batched)
      expect(tree.root.findAllByType(PromptDialog).length).toBe(1);
    });
  });
});

// ── PromptProvider tests ────────────────────────────────────────────────

describe('PromptProvider', () => {
  it('renders children', () => {
    const { Text } = require('react-native');
    let tree: ReturnType<typeof create>;
    act(() => {
      tree = create(
        <PromptProvider appId="app-1" userId="user-1">
          <Text>child content</Text>
        </PromptProvider>
      );
    });

    const textNode = tree!.root.findByType(Text);
    expect(textNode.props.children).toBe('child content');

    act(() => {
      tree!.unmount();
    });
  });
});
