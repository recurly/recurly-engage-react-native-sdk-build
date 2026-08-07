import { create, act } from 'react-test-renderer';
import { Platform } from 'react-native';
import type { PathItem } from '@recurly/engage-core';

// ── mocks ──────────────────────────────────────────────────────────────

const mockOnEvent = jest.fn();

const mockState = {
  timerFont: undefined as string | undefined,
  buttonFont: undefined as string | undefined,
  legalTextFont: undefined as string | undefined,
  promptMgr: {
    onEvent: mockOnEvent,
  },
  prompt: { delaySeconds: 0 },
};

jest.mock('../usePrompt', () => ({
  usePrompt: () => ({
    state: mockState,
    dispatch: jest.fn(),
  }),
}));

const mockExtractModalParams = jest.fn();

jest.mock('@recurly/engage-core', () => ({
  extractModalParams: (...args: any[]) => mockExtractModalParams(...args),
}));

jest.mock('../utils', () => ({
  getImageCompositeFieldName: () =>
    'rf_settings_bg_image_unknown_unknown_composite',
  modalAlignment: (_position: string, _offsetX: number, offsetY: number) => ({
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: offsetY,
  }),
}));

// ── helpers ────────────────────────────────────────────────────────────

import { PromptBottomBanner } from '../PromptBottomBanner';

const {
  Modal,
  TouchableWithoutFeedback,
  TouchableOpacity,
  ImageBackground,
} = require('react-native');

function makePath(overrides: Record<string, any> = {}): PathItem {
  return {
    name: 'test-banner',
    id: 'banner-1',
    order: 0,
    path_type: 3, // BOTTOM_BANNER
    actions: {
      rf_settings_bg_image_unknown_unknown_composite:
        'https://example.com/banner.png',
      rf_widget_width: '375px',
      rf_widget_height: '100px',
      rf_widget_position: 'bottom_center',
      rf_banner_position_offset_x: '0px',
      rf_banner_position_offset_y: '0px',
      rf_settings_close_button_enabled: 'true',
      rf_settings_click_outside_close_enabled: 'false',
      rf_settings_timer_font_size: '18',
      rf_settings_animation_type: 'slide',
      ...overrides,
    },
  } as PathItem;
}

function makeModalParams(overrides: Record<string, any> = {}) {
  return {
    modalWidth: 375,
    modalHeight: 100,
    modalOffsetX: 0,
    modalOffsetY: 0,
    modalPosition: 'bottom_center',
    button1: {
      text: 'OK',
      color: '#FFF',
      bgColor: '#000',
      action: 'accept',
    },
    buttonWidth: 100,
    buttonHeight: 48,
    buttonBottomPadding: 10,
    buttonFontSize: 16,
    buttonBorderRadius: 8,
    buttonBorderColor: '#000',
    buttonBorderThickness: 1,
    countDownPrompt: '',
    countDownPromptColor: '#FFFFFF',
    countDownPromptFontSize: 18,
    countDownPromptInvisible: false,
    countDown: 5,
    closeButtonEnabled: true,
    modallessDismissable: false,
    animationType: 'slide' as const,
    ...overrides,
  };
}

// ── Platform.isTV helper ───────────────────────────────────────────────

const isTVDescriptor = Object.getOwnPropertyDescriptor(Platform, 'isTV')!;

function mockIsTV(value: boolean) {
  Object.defineProperty(Platform, 'isTV', {
    get: () => value,
    configurable: true,
  });
}

function restoreIsTV() {
  Object.defineProperty(Platform, 'isTV', isTVDescriptor);
}

// ── tests ──────────────────────────────────────────────────────────────

describe('PromptBottomBanner', () => {
  let tree: ReturnType<typeof create>;
  const onEvent = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    mockIsTV(false);
    mockOnEvent.mockReset();
    onEvent.mockReset();
    mockExtractModalParams.mockReturnValue(makeModalParams());
  });

  afterEach(() => {
    act(() => {
      tree.unmount();
    });
    jest.clearAllTimers();
    jest.useRealTimers();
    restoreIsTV();
  });

  it('renders a visible slide-in Modal', () => {
    const path = makePath();
    tree = create(<PromptBottomBanner path={path} onEvent={onEvent} />);

    const modal = tree.root.findByType(Modal);
    expect(modal.props.animationType).toBe('slide');
    expect(modal.props.transparent).toBe(true);
    expect(modal.props.visible).toBe(true);
  });

  it('calls promptMgr.onEvent with impression on mount', () => {
    const path = makePath();
    act(() => {
      tree = create(<PromptBottomBanner path={path} onEvent={onEvent} />);
    });

    expect(mockOnEvent).toHaveBeenCalledWith(path, 'impression', onEvent);
  });

  it('renders ImageBackground with correct image uri and dimensions', () => {
    const params = makeModalParams({ modalWidth: 400, modalHeight: 120 });
    mockExtractModalParams.mockReturnValue(params);

    const path = makePath({
      rf_settings_bg_image_unknown_unknown_composite:
        'https://example.com/img.png',
    });
    tree = create(<PromptBottomBanner path={path} onEvent={onEvent} />);

    const bg = tree.root.findByType(ImageBackground);
    expect(bg.props.source).toEqual({
      uri: 'https://example.com/img.png',
    });
    expect(bg.props.resizeMode).toBe('cover');
    expect(bg.props.style).toMatchObject({ width: 400, height: 120 });
  });

  it('calls goal onEvent when banner is tapped', () => {
    const path = makePath();
    tree = create(<PromptBottomBanner path={path} onEvent={onEvent} />);

    const touchable = tree.root.findByType(TouchableOpacity);
    act(() => {
      touchable.props.onPress();
    });

    expect(mockOnEvent).toHaveBeenCalledWith(path, 'goal', onEvent);
  });

  it('calls dismiss onEvent on Modal onRequestClose', () => {
    const path = makePath();
    tree = create(<PromptBottomBanner path={path} onEvent={onEvent} />);

    const modal = tree.root.findByType(Modal);
    act(() => {
      modal.props.onRequestClose();
    });

    expect(mockOnEvent).toHaveBeenCalledWith(path, 'dismiss', onEvent);
  });

  it('dismisses when tapping outside if modallessDismissable is true', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({ modallessDismissable: true })
    );
    const path = makePath();
    tree = create(<PromptBottomBanner path={path} onEvent={onEvent} />);

    const overlay = tree.root.findByType(TouchableWithoutFeedback);
    act(() => {
      overlay.props.onPress();
    });

    expect(mockOnEvent).toHaveBeenCalledWith(path, 'dismiss', onEvent);
  });

  it('does NOT dismiss when tapping outside if modallessDismissable is false', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({ modallessDismissable: false })
    );
    const path = makePath();
    act(() => {
      tree = create(<PromptBottomBanner path={path} onEvent={onEvent} />);
    });

    // Reset after impression call
    mockOnEvent.mockReset();

    const overlay = tree.root.findByType(TouchableWithoutFeedback);
    act(() => {
      overlay.props.onPress();
    });

    expect(mockOnEvent).not.toHaveBeenCalled();
  });

  it('CloseBar close button triggers onEvent with dismiss', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({ closeButtonEnabled: true, countDown: 0 })
    );
    const path = makePath();
    tree = create(<PromptBottomBanner path={path} onEvent={onEvent} />);

    // CloseBar renders a TouchableOpacity for the close button
    const closeButtons = tree.root
      .findAllByType(TouchableOpacity)
      .filter((node: any) => node.props.accessibilityLabel === 'Close');
    expect(closeButtons.length).toBe(1);

    act(() => {
      closeButtons[0]!.props.onPress();
    });

    expect(mockOnEvent).toHaveBeenCalledWith(path, 'dismiss', onEvent);
  });

  it('CloseBar calls timeout onEvent when countdown expires', async () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({ countDown: 2, closeButtonEnabled: false })
    );
    const path = makePath();
    act(() => {
      tree = create(<PromptBottomBanner path={path} onEvent={onEvent} />);
    });

    // Clear impression call
    mockOnEvent.mockClear();

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(mockOnEvent).toHaveBeenCalledWith(path, 'timeout', onEvent);
  });

  it('passes extracted modal params to extractModalParams', () => {
    const path = makePath();
    tree = create(<PromptBottomBanner path={path} onEvent={onEvent} />);

    expect(mockExtractModalParams).toHaveBeenCalledWith(
      path,
      expect.any(Number),
      expect.any(Number)
    );
  });

  it('sets activeOpacity to 0.2 on non-TV iOS', () => {
    Platform.OS = 'ios';
    mockIsTV(false);
    const path = makePath();
    tree = create(<PromptBottomBanner path={path} onEvent={onEvent} />);

    const touchable = tree.root.findByType(TouchableOpacity);
    expect(touchable.props.activeOpacity).toBe(0.2);
  });

  it('sets activeOpacity to 1 on iOS TV', () => {
    Platform.OS = 'ios';
    mockIsTV(true);
    const path = makePath();
    tree = create(<PromptBottomBanner path={path} onEvent={onEvent} />);

    const touchable = tree.root.findByType(TouchableOpacity);
    expect(touchable.props.activeOpacity).toBe(1);
  });

  it('sets activeOpacity to 0.2 on Android', () => {
    Platform.OS = 'android';
    mockIsTV(false);
    const path = makePath();
    tree = create(<PromptBottomBanner path={path} onEvent={onEvent} />);

    const touchable = tree.root.findByType(TouchableOpacity);
    expect(touchable.props.activeOpacity).toBe(0.2);
  });
});
