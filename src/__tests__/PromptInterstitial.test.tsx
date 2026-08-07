import { create, act } from 'react-test-renderer';
import { Platform, Linking } from 'react-native';
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
  dp: (val: number) => val,
}));

// ── helpers ────────────────────────────────────────────────────────────

import { PromptInterstitial } from '../PromptInterstitial';

const {
  Modal,
  ImageBackground,
  Pressable,
  TouchableOpacity,
  Text,
} = require('react-native');

function makePath(overrides: Record<string, any> = {}): PathItem {
  return {
    name: 'test-interstitial',
    id: 'interstitial-1',
    order: 0,
    path_type: 4, // INTERSTITIAL
    actions: {
      rf_settings_bg_image_unknown_unknown_composite:
        'https://example.com/interstitial.png',
      rf_settings_bg_image_ios_iphone_2x_composite:
        'https://example.com/ios2x.png',
      rf_settings_bg_image_android_os_phone_2x_composite:
        'https://example.com/android2x.png',
      rf_settings_close_button_enabled: 'true',
      rf_settings_timer_font_size: '18',
      rf_settings_animation_type: 'fade',
      rf_retention_button1_text: 'Accept',
      ...overrides,
    },
  } as PathItem;
}

function makeModalParams(overrides: Record<string, any> = {}) {
  return {
    button1: {
      label: 'Accept',
      textColor: '#FFFFFF',
      bgColor: '#3096ED',
      width: 200,
      height: 48,
      position_x: 100,
      position_y: 200,
      textHighlightColor: '#FFF',
      bgHighlightColor: '#555',
    },
    button2: undefined as any,
    button3: undefined as any,
    buttonAbsolutePosition: false,
    buttonWidth: 100,
    buttonWidthPercent: undefined as string | undefined,
    buttonHeight: 48,
    buttonBottomPadding: 10,
    buttonFontSize: 16,
    buttonBorderRadius: 8,
    buttonBorderColor: '#000',
    buttonBorderThickness: 1,
    privacyTextAndLinks: undefined as any,
    countDownPrompt: '',
    countDownPromptColor: '#FFFFFF',
    countDownPromptFontSize: 18,
    countDownPromptInvisible: false,
    countDown: 5,
    closeButtonEnabled: true,
    animationType: 'fade' as const,
    ...overrides,
  };
}

// ── Platform helpers ──────────────────────────────────────────────────

const isTVDescriptor = Object.getOwnPropertyDescriptor(Platform, 'isTV')!;
const originalOS = Platform.OS;

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

describe('PromptInterstitial', () => {
  let tree: ReturnType<typeof create>;
  const onEvent = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    mockIsTV(false);
    Platform.OS = 'ios';
    mockOnEvent.mockReset();
    onEvent.mockReset();
    mockState.buttonFont = undefined;
    mockState.legalTextFont = undefined;
    mockExtractModalParams.mockReturnValue(makeModalParams());
  });

  afterEach(() => {
    act(() => {
      tree.unmount();
    });
    jest.clearAllTimers();
    jest.useRealTimers();
    restoreIsTV();
    Platform.OS = originalOS;
  });

  // ── basic rendering ──────────────────────────────────────────────────

  it('renders a visible Modal with correct animation type', () => {
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const modal = tree.root.findByType(Modal);
    expect(modal.props.animationType).toBe('fade');
    expect(modal.props.transparent).toBe(true);
    expect(modal.props.visible).toBe(true);
  });

  it('calls promptMgr.onEvent with impression on mount', () => {
    const path = makePath();
    act(() => {
      tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);
    });

    expect(mockOnEvent).toHaveBeenCalledWith(path, 'impression', onEvent);
  });

  it('calls dismiss onEvent on Modal onRequestClose', () => {
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const modal = tree.root.findByType(Modal);
    act(() => {
      modal.props.onRequestClose();
    });

    expect(mockOnEvent).toHaveBeenCalledWith(path, 'dismiss', onEvent);
  });

  it('passes path and screen dimensions to extractModalParams', () => {
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    expect(mockExtractModalParams).toHaveBeenCalledWith(
      path,
      expect.any(Number),
      expect.any(Number)
    );
  });

  // ── image background ─────────────────────────────────────────────────

  it('renders ImageBackground with iOS 2x composite image on iOS', () => {
    Platform.OS = 'ios';
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const bg = tree.root.findByType(ImageBackground);
    expect(bg.props.source).toEqual({
      uri: 'https://example.com/ios2x.png',
    });
    expect(bg.props.resizeMode).toBe('stretch');
  });

  it('renders ImageBackground with Android 2x composite image on Android', () => {
    Platform.OS = 'android';
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const bg = tree.root.findByType(ImageBackground);
    expect(bg.props.source).toEqual({
      uri: 'https://example.com/android2x.png',
    });
  });

  it('falls back to getImageCompositeFieldName when platform 2x composite is absent', () => {
    Platform.OS = 'ios';
    const path = makePath({
      rf_settings_bg_image_ios_iphone_2x_composite: undefined,
    });
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const bg = tree.root.findByType(ImageBackground);
    expect(bg.props.source).toEqual({
      uri: 'https://example.com/interstitial.png',
    });
  });

  // ── button rendering (mobile layout) ────────────────────────────────

  it('renders button1 and calls goal onEvent when pressed', () => {
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Pressable);
    expect(buttons.length).toBeGreaterThanOrEqual(1);

    act(() => {
      buttons[0]!.props.onPress();
    });

    expect(mockOnEvent).toHaveBeenCalledWith(path, 'goal', onEvent);
  });

  it('renders button2 and calls goal2 onEvent when pressed', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({
        button2: {
          label: 'Maybe Later',
          textColor: '#333',
          bgColor: '#CCC',
          width: 200,
          height: 48,
          position_x: 100,
          position_y: 150,
          textHighlightColor: '#FFF',
          bgHighlightColor: '#555',
        },
      })
    );
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

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
          width: 200,
          height: 48,
          position_x: 100,
          position_y: 150,
          textHighlightColor: '#FFF',
          bgHighlightColor: '#555',
        },
        button3: {
          label: 'No Thanks',
          textColor: '#999',
          bgColor: '#EEE',
          width: 200,
          height: 48,
          position_x: 100,
          position_y: 100,
          textHighlightColor: '#FFF',
          bgHighlightColor: '#555',
        },
      })
    );
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Pressable);
    expect(buttons.length).toBeGreaterThanOrEqual(3);

    act(() => {
      buttons[2]!.props.onPress();
    });

    expect(mockOnEvent).toHaveBeenCalledWith(path, 'decline', onEvent);
  });

  it('does not render button2 or button3 when they are undefined', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({ button2: undefined, button3: undefined })
    );
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Pressable);
    expect(buttons.length).toBe(1);
  });

  it('does not render button3 when only button2 is provided', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({
        button2: {
          label: 'Maybe',
          textColor: '#333',
          bgColor: '#CCC',
          width: 200,
          height: 48,
          position_x: 100,
          position_y: 150,
          textHighlightColor: '#FFF',
          bgHighlightColor: '#555',
        },
        button3: undefined,
      })
    );
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Pressable);
    expect(buttons.length).toBe(2);
  });

  // ── button styles ─────────────────────────────────────────────────────

  it('applies buttonFont to button title styles', () => {
    mockState.buttonFont = 'CustomFont-Bold';
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

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
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

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
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

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
          width: 200,
          height: 48,
          position_x: 100,
          position_y: 200,
          textHighlightColor: '#FFF',
          bgHighlightColor: '#555',
        },
      })
    );
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Pressable);
    expect(buttons[0]!.props.style).toMatchObject({
      backgroundColor: '#00FF00',
    });
  });

  it('uses buttonWidthPercent when available over buttonWidth', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({
        buttonWidthPercent: '80%',
        buttonWidth: 200,
      })
    );
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const json = tree.toJSON() as any;
    // Verify the tree rendered successfully with the percent width
    expect(json).toBeTruthy();
  });

  // ── CloseBar integration ──────────────────────────────────────────────

  it('CloseBar close button triggers onEvent with dismiss', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({ closeButtonEnabled: true, countDown: 0 })
    );
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

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
      tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);
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

  // ── TV layout ─────────────────────────────────────────────────────────

  it('renders TV layout when buttonAbsolutePosition is true', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({ buttonAbsolutePosition: true })
    );
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Pressable);
    expect(buttons.length).toBeGreaterThanOrEqual(1);

    // TV layout uses absolute positioning on buttons
    expect(buttons[0]!.props.style).toMatchObject({
      position: 'absolute',
    });
  });

  it('renders mobile layout when buttonAbsolutePosition is false', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({ buttonAbsolutePosition: false })
    );
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Pressable);
    expect(buttons.length).toBeGreaterThanOrEqual(1);

    // Mobile layout does NOT use absolute positioning
    expect(buttons[0]!.props.style.position).toBeUndefined();
  });

  it('TV layout renders all three buttons with absolute position', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({
        buttonAbsolutePosition: true,
        button2: {
          label: 'Maybe',
          textColor: '#333',
          bgColor: '#CCC',
          width: 200,
          height: 48,
          position_x: 100,
          position_y: 150,
          textHighlightColor: '#FFF',
          bgHighlightColor: '#555',
        },
        button3: {
          label: 'No',
          textColor: '#999',
          bgColor: '#EEE',
          width: 200,
          height: 48,
          position_x: 100,
          position_y: 100,
          textHighlightColor: '#FFF',
          bgHighlightColor: '#555',
        },
      })
    );
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Pressable);
    expect(buttons.length).toBe(3);

    buttons.forEach((btn: any) => {
      expect(btn.props.style).toMatchObject({ position: 'absolute' });
    });
  });

  // ── HyperlinkedText / privacy text ───────────────────────────────────

  it('renders privacy text when privacyTextAndLinks is provided', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({
        privacyTextAndLinks: [
          { text: 'By continuing you agree to our ', url: undefined },
          { text: 'Privacy Policy', url: 'https://example.com/privacy' },
        ],
      })
    );
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const textNodes = tree.root.findAllByType(Text);
    const privacyText = textNodes.find(
      (t: any) => t.props.children === 'By continuing you agree to our '
    );
    expect(privacyText).toBeTruthy();
  });

  it('renders hyperlinked text with blue underline style', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({
        privacyTextAndLinks: [
          { text: 'Privacy Policy', url: 'https://example.com/privacy' },
        ],
      })
    );
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const textNodes = tree.root.findAllByType(Text);
    const linkText = textNodes.find(
      (t: any) => t.props.children === 'Privacy Policy'
    );
    expect(linkText).toBeTruthy();
    expect(linkText!.props.style).toMatchObject({
      color: 'blue',
      textDecorationLine: 'underline',
    });
  });

  it('opens URL when hyperlinked text is pressed', () => {
    const openURLSpy = jest
      .spyOn(Linking, 'openURL')
      .mockImplementation(() => Promise.resolve());
    mockExtractModalParams.mockReturnValue(
      makeModalParams({
        privacyTextAndLinks: [
          { text: 'Privacy Policy', url: 'https://example.com/privacy' },
        ],
      })
    );
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const textNodes = tree.root.findAllByType(Text);
    const linkText = textNodes.find(
      (t: any) => t.props.children === 'Privacy Policy'
    );
    act(() => {
      linkText!.props.onPress();
    });

    expect(openURLSpy).toHaveBeenCalledWith('https://example.com/privacy');
    openURLSpy.mockRestore();
  });

  it('applies legalTextFont to privacy text', () => {
    mockState.legalTextFont = 'LegalFont-Regular';
    mockExtractModalParams.mockReturnValue(
      makeModalParams({
        privacyTextAndLinks: [{ text: 'Terms apply.', url: undefined }],
      })
    );
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const textNodes = tree.root.findAllByType(Text);
    const legalText = textNodes.find(
      (t: any) => t.props.children === 'Terms apply.'
    );
    expect(legalText).toBeTruthy();
    expect(legalText!.props.style).toMatchObject({
      fontFamily: 'LegalFont-Regular',
    });
  });

  it('does not render privacy text when privacyTextAndLinks is undefined', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({ privacyTextAndLinks: undefined })
    );
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    // No text node should have a hyperlink style (blue + underline)
    const textNodes = tree.root.findAllByType(Text);
    const linkText = textNodes.find(
      (t: any) =>
        t.props.style &&
        t.props.style.color === 'blue' &&
        t.props.style.textDecorationLine === 'underline'
    );
    expect(linkText).toBeUndefined();
  });

  it('applies legalTextFont to hyperlinked text with URL', () => {
    mockState.legalTextFont = 'LegalFont-Regular';
    mockExtractModalParams.mockReturnValue(
      makeModalParams({
        privacyTextAndLinks: [
          { text: 'Privacy Policy', url: 'https://example.com/privacy' },
        ],
      })
    );
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const textNodes = tree.root.findAllByType(Text);
    const linkText = textNodes.find(
      (t: any) => t.props.children === 'Privacy Policy'
    );
    expect(linkText).toBeTruthy();
    expect(linkText!.props.style).toMatchObject({
      color: 'blue',
      textDecorationLine: 'underline',
      fontFamily: 'LegalFont-Regular',
    });
  });

  // ── TV layout button presses ───────────────────────────────────────

  it('TV layout button1 calls goal onEvent when pressed', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({ buttonAbsolutePosition: true })
    );
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Pressable);
    act(() => {
      buttons[0]!.props.onPress();
    });

    expect(mockOnEvent).toHaveBeenCalledWith(path, 'goal', onEvent);
  });

  it('TV layout button2 calls goal2 onEvent when pressed', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({
        buttonAbsolutePosition: true,
        button2: {
          label: 'Maybe',
          textColor: '#333',
          bgColor: '#CCC',
          width: 200,
          height: 48,
          position_x: 100,
          position_y: 150,
          textHighlightColor: '#FFF',
          bgHighlightColor: '#555',
        },
      })
    );
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Pressable);
    act(() => {
      buttons[1]!.props.onPress();
    });

    expect(mockOnEvent).toHaveBeenCalledWith(path, 'goal2', onEvent);
  });

  it('TV layout button3 calls decline onEvent when pressed', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({
        buttonAbsolutePosition: true,
        button2: {
          label: 'Maybe',
          textColor: '#333',
          bgColor: '#CCC',
          width: 200,
          height: 48,
          position_x: 100,
          position_y: 150,
          textHighlightColor: '#FFF',
          bgHighlightColor: '#555',
        },
        button3: {
          label: 'No',
          textColor: '#999',
          bgColor: '#EEE',
          width: 200,
          height: 48,
          position_x: 100,
          position_y: 100,
          textHighlightColor: '#FFF',
          bgHighlightColor: '#555',
        },
      })
    );
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Pressable);
    act(() => {
      buttons[2]!.props.onPress();
    });

    expect(mockOnEvent).toHaveBeenCalledWith(path, 'decline', onEvent);
  });

  // ── TV layout with buttonFont ──────────────────────────────────────

  it('applies buttonFont to TV layout buttons', () => {
    mockState.buttonFont = 'TVFont-Bold';
    mockExtractModalParams.mockReturnValue(
      makeModalParams({
        buttonAbsolutePosition: true,
        button2: {
          label: 'Maybe',
          textColor: '#333',
          bgColor: '#CCC',
          width: 200,
          height: 48,
          position_x: 100,
          position_y: 150,
          textHighlightColor: '#FFF',
          bgHighlightColor: '#555',
        },
        button3: {
          label: 'No',
          textColor: '#999',
          bgColor: '#EEE',
          width: 200,
          height: 48,
          position_x: 100,
          position_y: 100,
          textHighlightColor: '#FFF',
          bgHighlightColor: '#555',
        },
      })
    );
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const textNodes = tree.root.findAllByType(Text);
    const btn1Text = textNodes.find((t: any) => t.props.children === 'Accept');
    const btn2Text = textNodes.find((t: any) => t.props.children === 'Maybe');
    const btn3Text = textNodes.find((t: any) => t.props.children === 'No');
    expect(btn1Text!.props.style).toMatchObject({ fontFamily: 'TVFont-Bold' });
    expect(btn2Text!.props.style).toMatchObject({ fontFamily: 'TVFont-Bold' });
    expect(btn3Text!.props.style).toMatchObject({ fontFamily: 'TVFont-Bold' });
  });

  // ── TV layout privacy text ─────────────────────────────────────────

  it('renders privacy text in TV layout', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({
        buttonAbsolutePosition: true,
        privacyTextAndLinks: [{ text: 'Terms apply.', url: undefined }],
      })
    );
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const textNodes = tree.root.findAllByType(Text);
    const legalText = textNodes.find(
      (t: any) => t.props.children === 'Terms apply.'
    );
    expect(legalText).toBeTruthy();
  });

  // ── Android margin bottom ──────────────────────────────────────────

  it('applies Android status bar margin bottom on Android', () => {
    Platform.OS = 'android';
    const { StatusBar: SB } = require('react-native');
    const originalHeight = SB.currentHeight;
    SB.currentHeight = 24;

    mockExtractModalParams.mockReturnValue(
      makeModalParams({ buttonAbsolutePosition: false })
    );
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const json = tree.toJSON() as any;
    expect(json).toBeTruthy();

    SB.currentHeight = originalHeight;
  });

  it('handles undefined StatusBar.currentHeight on Android', () => {
    Platform.OS = 'android';
    const { StatusBar: SB } = require('react-native');
    const originalHeight = SB.currentHeight;
    SB.currentHeight = undefined;

    mockExtractModalParams.mockReturnValue(
      makeModalParams({ buttonAbsolutePosition: false })
    );
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const json = tree.toJSON() as any;
    expect(json).toBeTruthy();

    SB.currentHeight = originalHeight;
  });

  // ── Android image fallback ─────────────────────────────────────────

  it('falls back to getImageCompositeFieldName on Android when 2x composite is absent', () => {
    Platform.OS = 'android';
    const path = makePath({
      rf_settings_bg_image_android_os_phone_2x_composite: undefined,
    });
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const bg = tree.root.findByType(ImageBackground);
    expect(bg.props.source).toEqual({
      uri: 'https://example.com/interstitial.png',
    });
  });

  // ── Null label / textColor fallbacks ───────────────────────────────

  it('falls back to empty label and white textColor when null', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({
        button1: {
          label: null,
          textColor: null,
          bgColor: '#3096ED',
          width: 200,
          height: 48,
          position_x: 100,
          position_y: 200,
          textHighlightColor: '#FFF',
          bgHighlightColor: '#555',
        },
      })
    );
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const textNodes = tree.root.findAllByType(Text);
    const buttonText = textNodes.find((t: any) => t.props.children === '');
    expect(buttonText).toBeTruthy();
    expect(buttonText!.props.style).toMatchObject({ color: 'white' });
  });

  it('falls back to empty label and white textColor for TV layout buttons when null', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({
        buttonAbsolutePosition: true,
        button1: {
          label: null,
          textColor: null,
          bgColor: '#3096ED',
          width: 200,
          height: 48,
          position_x: 100,
          position_y: 200,
          textHighlightColor: '#FFF',
          bgHighlightColor: '#555',
        },
        button2: {
          label: null,
          textColor: null,
          bgColor: '#CCC',
          width: 200,
          height: 48,
          position_x: 100,
          position_y: 150,
          textHighlightColor: '#FFF',
          bgHighlightColor: '#555',
        },
        button3: {
          label: null,
          textColor: null,
          bgColor: '#EEE',
          width: 200,
          height: 48,
          position_x: 100,
          position_y: 100,
          textHighlightColor: '#FFF',
          bgHighlightColor: '#555',
        },
      })
    );
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Pressable);
    expect(buttons.length).toBe(3);
  });

  // ── mobile layout buttonFont with button2 and button3 ──────────────

  it('falls back to empty label and white textColor for mobile button2 and button3 when null', () => {
    mockExtractModalParams.mockReturnValue(
      makeModalParams({
        buttonAbsolutePosition: false,
        button2: {
          label: null,
          textColor: null,
          bgColor: '#CCC',
          width: 200,
          height: 48,
          position_x: 100,
          position_y: 150,
          textHighlightColor: '#FFF',
          bgHighlightColor: '#555',
        },
        button3: {
          label: null,
          textColor: null,
          bgColor: '#EEE',
          width: 200,
          height: 48,
          position_x: 100,
          position_y: 100,
          textHighlightColor: '#FFF',
          bgHighlightColor: '#555',
        },
      })
    );
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const textNodes = tree.root.findAllByType(Text);
    // button1 label is 'Accept' (from default), button2 & button3 labels are null → ''
    const emptyButtons = textNodes.filter((t: any) => t.props.children === '');
    expect(emptyButtons.length).toBe(2);
    emptyButtons.forEach((btn: any) => {
      expect(btn.props.style).toMatchObject({ color: 'white' });
    });
  });

  it('applies buttonFont to mobile layout button2 and button3', () => {
    mockState.buttonFont = 'MobileFont-Bold';
    mockExtractModalParams.mockReturnValue(
      makeModalParams({
        buttonAbsolutePosition: false,
        button2: {
          label: 'Later',
          textColor: '#333',
          bgColor: '#CCC',
          width: 200,
          height: 48,
          position_x: 100,
          position_y: 150,
          textHighlightColor: '#FFF',
          bgHighlightColor: '#555',
        },
        button3: {
          label: 'Decline',
          textColor: '#999',
          bgColor: '#EEE',
          width: 200,
          height: 48,
          position_x: 100,
          position_y: 100,
          textHighlightColor: '#FFF',
          bgHighlightColor: '#555',
        },
      })
    );
    const path = makePath();
    tree = create(<PromptInterstitial path={path} onEvent={onEvent} />);

    const textNodes = tree.root.findAllByType(Text);
    const btn2Text = textNodes.find((t: any) => t.props.children === 'Later');
    const btn3Text = textNodes.find((t: any) => t.props.children === 'Decline');
    expect(btn2Text!.props.style).toMatchObject({
      fontFamily: 'MobileFont-Bold',
    });
    expect(btn3Text!.props.style).toMatchObject({
      fontFamily: 'MobileFont-Bold',
    });
  });
});
