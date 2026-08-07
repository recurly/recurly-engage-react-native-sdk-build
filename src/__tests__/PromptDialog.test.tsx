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
  modalAlignment: (_position: string) => ({
    justifyContent: 'center',
    alignItems: 'center',
  }),
}));

// ── helpers ────────────────────────────────────────────────────────────

import { PromptDialog } from '../PromptDialog';

const {
  Modal,
  ImageBackground,
  Pressable,
  TouchableOpacity,
} = require('react-native');

function makePath(overrides: Record<string, any> = {}): PathItem {
  return {
    name: 'test-dialog',
    id: 'dialog-1',
    order: 0,
    path_type: 1, // MODAL
    actions: {
      rf_settings_bg_image_unknown_unknown_composite:
        'https://example.com/dialog.png',
      rf_settings_bg_image: 'https://example.com/fallback.png',
      rf_settings_pop_up_size: '70',
      rf_settings_close_button_enabled: 'true',
      rf_settings_click_outside_close_enabled: 'false',
      rf_settings_timer_font_size: '18',
      rf_settings_animation_type: 'slide',
      rf_retention_button1_text: 'Accept',
      ...overrides,
    },
  } as PathItem;
}

function makeModalParams(overrides: Record<string, any> = {}) {
  return {
    modalWidth: 300,
    modalHeight: 400,
    modalOffsetX: 0,
    modalOffsetY: 0,
    modalPosition: 'center',
    button1: {
      label: 'Accept',
      textColor: '#FFFFFF',
      bgColor: '#3096ED',
    },
    button2: undefined as any,
    button3: undefined as any,
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

describe('PromptDialog', () => {
  let tree: ReturnType<typeof create>;
  const onEvent = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    mockIsTV(false);
    mockOnEvent.mockReset();
    onEvent.mockReset();
    mockState.buttonFont = undefined;
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
    tree = create(<PromptDialog path={path} onEvent={onEvent} />);

    const modal = tree.root.findByType(Modal);
    expect(modal.props.animationType).toBe('slide');
    expect(modal.props.transparent).toBe(true);
    expect(modal.props.visible).toBe(true);
  });

  it('calls promptMgr.onEvent with impression on mount', () => {
    const path = makePath();
    act(() => {
      tree = create(<PromptDialog path={path} onEvent={onEvent} />);
    });

    expect(mockOnEvent).toHaveBeenCalledWith(path, 'impression', onEvent);
  });

  it('renders ImageBackground with composite image uri', () => {
    const params = makeModalParams({ modalWidth: 350, modalHeight: 500 });
    mockExtractModalParams.mockReturnValue(params);

    const path = makePath({
      rf_settings_bg_image_unknown_unknown_composite:
        'https://example.com/img.png',
    });
    tree = create(<PromptDialog path={path} onEvent={onEvent} />);

    const bg = tree.root.findByType(ImageBackground);
    expect(bg.props.source).toEqual({
      uri: 'https://example.com/img.png',
    });
    expect(bg.props.resizeMode).toBe('stretch');
    expect(bg.props.style).toMatchObject({ width: 350 });
  });

  it('falls back to rf_settings_bg_image when composite field is absent', () => {
    const path = makePath({
      rf_settings_bg_image_unknown_unknown_composite: undefined,
      rf_settings_bg_image: 'https://example.com/fallback.png',
    });
    tree = create(<PromptDialog path={path} onEvent={onEvent} />);

    const bg = tree.root.findByType(ImageBackground);
    expect(bg.props.source).toEqual({
      uri: 'https://example.com/fallback.png',
    });
  });

  it('calls dismiss onEvent on Modal onRequestClose', () => {
    const path = makePath();
    tree = create(<PromptDialog path={path} onEvent={onEvent} />);

    const modal = tree.root.findByType(Modal);
    act(() => {
      modal.props.onRequestClose();
    });

    expect(mockOnEvent).toHaveBeenCalledWith(path, 'dismiss', onEvent);
  });

  it('passes path and screen dimensions to extractModalParams', () => {
    const path = makePath();
    tree = create(<PromptDialog path={path} onEvent={onEvent} />);

    expect(mockExtractModalParams).toHaveBeenCalledWith(
      path,
      expect.any(Number),
      expect.any(Number)
    );
  });

  // ── button rendering ──────────────────────────────────────────────────

  it('renders button1 and calls goal onEvent when pressed', () => {
    const path = makePath();
    tree = create(<PromptDialog path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Pressable);
    expect(buttons.length).toBeGreaterThanOrEqual(1);

    act(() => {
      buttons[0]!.props.onPress();
    });

    expect(mockOnEvent).toHaveBeenCalledWith(path, 'goal', onEvent, {
      surveySelection: null,
    });
  });

  it('renders button2 and calls goal2 onEvent when pressed', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({
        button2: {
          label: 'Maybe Later',
          textColor: '#333',
          bgColor: '#CCC',
        },
      })
    );
    const path = makePath();
    tree = create(<PromptDialog path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Pressable);
    expect(buttons.length).toBeGreaterThanOrEqual(2);

    act(() => {
      buttons[1]!.props.onPress();
    });

    expect(mockOnEvent).toHaveBeenCalledWith(path, 'goal2', onEvent);
  });

  it('renders button3 and calls decline onEvent when pressed', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({
        button2: {
          label: 'Maybe Later',
          textColor: '#333',
          bgColor: '#CCC',
        },
        button3: {
          label: 'No Thanks',
          textColor: '#999',
          bgColor: '#EEE',
        },
      })
    );
    const path = makePath();
    tree = create(<PromptDialog path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Pressable);
    expect(buttons.length).toBeGreaterThanOrEqual(3);

    act(() => {
      buttons[2]!.props.onPress();
    });

    expect(mockOnEvent).toHaveBeenCalledWith(path, 'decline', onEvent);
  });

  it('does not render button2 when it is undefined', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({ button2: undefined, button3: undefined })
    );
    const path = makePath();
    tree = create(<PromptDialog path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Pressable);
    expect(buttons.length).toBe(1);
  });

  it('does not render button3 when it is undefined', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({
        button2: {
          label: 'Maybe',
          textColor: '#333',
          bgColor: '#CCC',
        },
        button3: undefined,
      })
    );
    const path = makePath();
    tree = create(<PromptDialog path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Pressable);
    expect(buttons.length).toBe(2);
  });

  // ── button styles ─────────────────────────────────────────────────────

  it('applies buttonFont to button title styles', () => {
    mockState.buttonFont = 'CustomFont-Bold';
    const path = makePath();
    tree = create(<PromptDialog path={path} onEvent={onEvent} />);

    const { Text } = require('react-native');
    const textNodes = tree.root.findAllByType(Text);
    const buttonText = textNodes.find(
      (t: any) => t.props.children === 'Accept'
    );
    expect(buttonText).toBeTruthy();
    expect(buttonText!.props.style).toMatchObject({
      fontFamily: 'CustomFont-Bold',
    });
  });

  it('does not apply fontFamily when buttonFont is undefined', () => {
    mockState.buttonFont = undefined;
    const path = makePath();
    tree = create(<PromptDialog path={path} onEvent={onEvent} />);

    const { Text } = require('react-native');
    const textNodes = tree.root.findAllByType(Text);
    const buttonText = textNodes.find(
      (t: any) => t.props.children === 'Accept'
    );
    expect(buttonText).toBeTruthy();
    expect(buttonText!.props.style.fontFamily).toBeUndefined();
  });

  it('applies button border styles from modal params', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({
        buttonBorderRadius: 12,
        buttonBorderColor: '#FF0000',
        buttonBorderThickness: 2,
      })
    );
    const path = makePath();
    tree = create(<PromptDialog path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Pressable);
    expect(buttons[0]!.props.style).toMatchObject({
      borderRadius: 12,
      borderColor: '#FF0000',
      borderWidth: 2,
    });
  });

  it('applies button background color from modal params', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({
        button1: {
          label: 'Go',
          textColor: '#FFF',
          bgColor: '#00FF00',
        },
      })
    );
    const path = makePath();
    tree = create(<PromptDialog path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Pressable);
    expect(buttons[0]!.props.style).toMatchObject({
      backgroundColor: '#00FF00',
    });
  });

  // ── CloseBar integration ──────────────────────────────────────────────

  it('CloseBar close button triggers onEvent with dismiss', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({ closeButtonEnabled: true, countDown: 0 })
    );
    const path = makePath();
    tree = create(<PromptDialog path={path} onEvent={onEvent} />);

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
      tree = create(<PromptDialog path={path} onEvent={onEvent} />);
    });

    mockOnEvent.mockClear();

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(mockOnEvent).toHaveBeenCalledWith(path, 'timeout', onEvent);
  });

  it('forwards external closeButtonColor to CloseBar', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({ closeButtonEnabled: true, countDown: 0 })
    );
    const path = makePath();
    tree = create(
      <PromptDialog
        path={path}
        onEvent={onEvent}
        external={{
          closeButtonColor: '#FF0000',
          closeButtonBgColor: 'transparent',
          closeButtonSize: 24,
          timerFontSize: 18,
          timerFontColor: '#FFFFFF',
        }}
      />
    );

    const icon = tree.root.findByProps({ children: '✕' });
    expect(icon.props.style).toMatchObject({ color: '#FF0000' });
  });

  // ── TV platform ───────────────────────────────────────────────────────

  it('reduces modal height by 0.75 on TV', () => {
    mockIsTV(true);
    mockExtractModalParams.mockReturnValue(
      makeModalParams({ modalWidth: 300, modalHeight: 400 })
    );
    const path = makePath();
    tree = create(<PromptDialog path={path} onEvent={onEvent} />);

    const bg = tree.root.findByType(ImageBackground);
    expect(bg.props.style).toMatchObject({
      width: 300,
      height: 300, // 400 * 0.75
    });
  });

  it('uses full modal height on mobile', () => {
    mockIsTV(false);
    mockExtractModalParams.mockReturnValue(
      makeModalParams({ modalWidth: 300, modalHeight: 400 })
    );
    const path = makePath();
    tree = create(<PromptDialog path={path} onEvent={onEvent} />);

    const bg = tree.root.findByType(ImageBackground);
    expect(bg.props.style).toMatchObject({
      width: 300,
      height: 400,
    });
  });

  // ── vertical layout: buttonHeight and buttonBottomPadding ────────────

  it('applies buttonHeight from modal params to button style', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({ buttonHeight: 56 })
    );
    const path = makePath();
    tree = create(<PromptDialog path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Pressable);
    expect(buttons[0]!.props.style).toMatchObject({ height: 56 });
  });

  it('applies buttonBottomPadding as marginBottom to button style', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({ buttonBottomPadding: 20 })
    );
    const path = makePath();
    tree = create(<PromptDialog path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Pressable);
    expect(buttons[0]!.props.style).toMatchObject({ marginBottom: 20 });
  });

  // ── null button labels ─────────────────────────────────────────────────

  it('handles null labels on all buttons using ?? fallback', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({
        button1: { label: null, textColor: '#FFF', bgColor: '#000' },
        button2: { label: null, textColor: '#FFF', bgColor: '#000' },
        button3: { label: null, textColor: '#FFF', bgColor: '#000' },
      })
    );
    const path = makePath();
    tree = create(<PromptDialog path={path} onEvent={onEvent} />);

    const { Text } = require('react-native');
    const textNodes = tree.root.findAllByType(Text);
    // All button labels should be '' (from ?? '')
    const buttonTexts = textNodes.filter((t: any) => t.props.children === '');
    expect(buttonTexts.length).toBe(3);
  });

  // ── buttonFont on button2 and button3 ──────────────────────────────────

  it('applies buttonFont to button2 and button3 title styles', () => {
    mockState.buttonFont = 'CustomFont-Bold';
    mockExtractModalParams.mockReturnValue(
      makeModalParams({
        button2: {
          label: 'Maybe',
          textColor: '#333',
          bgColor: '#CCC',
        },
        button3: {
          label: 'Decline',
          textColor: '#999',
          bgColor: '#EEE',
        },
      })
    );
    const path = makePath();
    tree = create(<PromptDialog path={path} onEvent={onEvent} />);

    const { Text } = require('react-native');
    const textNodes = tree.root.findAllByType(Text);
    const btn2Text = textNodes.find((t: any) => t.props.children === 'Maybe');
    const btn3Text = textNodes.find((t: any) => t.props.children === 'Decline');
    expect(btn2Text!.props.style).toMatchObject({
      fontFamily: 'CustomFont-Bold',
    });
    expect(btn3Text!.props.style).toMatchObject({
      fontFamily: 'CustomFont-Bold',
    });
  });

  // ── button3 without button2 ───────────────────────────────────────────

  it('button3 renders with buttonHeight when button2 is absent', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({
        buttonHeight: 48,
        button2: undefined,
        button3: {
          label: 'No Thanks',
          textColor: '#999',
          bgColor: '#EEE',
        },
      })
    );
    const path = makePath();
    tree = create(<PromptDialog path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Pressable);
    // button1 + button3 (button2 is absent)
    expect(buttons.length).toBe(2);
    expect(buttons[1]!.props.style).toMatchObject({ height: 48 });
  });

  // ── survey options ──────────────────────────────────────────────────────

  it('renders survey options when surveySelected is true', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({
        surveySelected: true,
        surveyOptionsTotal: 2,
        surveyOptionsFontSize: '14',
        surveyOption1Label: 'Option A',
        surveyOption1Value: 'val_a',
        surveyOption2Label: 'Option B',
        surveyOption2Value: 'val_b',
        closeButtonEnabled: false,
        countDown: 0,
      })
    );
    const path = makePath();
    tree = create(<PromptDialog path={path} onEvent={onEvent} />);

    // closeButtonEnabled: false → no Close TouchableOpacity, only survey items
    const surveyItems = tree.root.findAllByType(TouchableOpacity);
    expect(surveyItems.length).toBe(2);
    const { Text: RNText } = require('react-native');
    const labels = tree.root
      .findAllByType(RNText)
      .map((t: any) => t.props.children);
    expect(labels).toContain('Option A');
    expect(labels).toContain('Option B');
  });

  it('shows inner radio circle after selecting a survey option', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({
        surveySelected: true,
        surveyOptionsTotal: 1,
        surveyOptionsFontSize: '14',
        surveyOption1Label: 'Only Option',
        surveyOption1Value: 'choice_1',
        closeButtonEnabled: false,
        countDown: 0,
      })
    );
    const path = makePath();
    act(() => {
      tree = create(<PromptDialog path={path} onEvent={onEvent} />);
    });

    const { View: RNView } = require('react-native');
    const viewsBefore = tree.root.findAllByType(RNView).length;

    act(() => {
      tree.root.findAllByType(TouchableOpacity)[0]!.props.onPress();
    });

    // radioInner View is now rendered, so total View count increases
    const viewsAfter = tree.root.findAllByType(RNView).length;
    expect(viewsAfter).toBeGreaterThan(viewsBefore);
  });

  it('uses fallback fontSize 14 when surveyOptionsFontSize is not a valid number', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({
        surveySelected: true,
        surveyOptionsTotal: 1,
        surveyOptionsFontSize: 'invalid',
        surveyOption1Label: 'Option',
        surveyOption1Value: 'v1',
        closeButtonEnabled: false,
        countDown: 0,
      })
    );
    const path = makePath();
    tree = create(<PromptDialog path={path} onEvent={onEvent} />);

    const { Text: RNText } = require('react-native');
    const optionText = tree.root
      .findAllByType(RNText)
      .find((t: any) => t.props.children === 'Option');
    expect(optionText).toBeTruthy();
    expect(optionText!.props.style.fontSize).toBe(14);
  });
});
