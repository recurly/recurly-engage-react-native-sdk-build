import { create, act } from 'react-test-renderer';
import { Platform } from 'react-native';
import { CloseBar, CustomButton, SafeAreaContainer } from '../Components';
import type { ExternalStyles } from '../Components';

// ── mocks ──────────────────────────────────────────────────────────────

const mockState = {
  timerFont: undefined as string | undefined,
  buttonFont: undefined as string | undefined,
  legalTextFont: undefined as string | undefined,
  promptMgr: undefined,
  prompt: { delaySeconds: 0 },
};

jest.mock('../usePrompt', () => ({
  usePrompt: () => ({
    state: mockState,
    dispatch: jest.fn(),
  }),
}));

// ── helpers ────────────────────────────────────────────────────────────

const {
  Text,
  View,
  TouchableOpacity,
  Pressable,
  SafeAreaView,
} = require('react-native');

function makeModalParams(overrides: Record<string, any> = {}) {
  return {
    modalWidth: 300,
    modalHeight: 400,
    modalOffsetX: 0,
    modalOffsetY: 0,
    modalPosition: 'center',
    button1: {
      text: 'OK',
      color: '#FFF',
      bgColor: '#000',
      action: 'accept',
      textColor: '#FFF',
      textHighlightColor: '#CCC',
      bgHighlightColor: '#333',
      width: 100,
      height: 48,
      position_x: 0,
      position_y: 0,
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
    countDownPromptFontSize: 24,
    countDownPromptInvisible: false,
    countDown: 5,
    closeButtonEnabled: true,
    modallessDismissable: false,
    animationType: 'none' as const,
    surveySelected: false,
    surveyOptionsTotal: 0,
    surveyOptionsFontSize: '16',
    surveyOption1Label: '',
    surveyOption2Label: '',
    surveyOption3Label: '',
    surveyOption4Label: '',
    surveyOption5Label: '',
    surveyOption1Value: '',
    surveyOption2Value: '',
    surveyOption3Value: '',
    surveyOption4Value: '',
    surveyOption5Value: '',
    surveyTopMargin: '0px',
    fillColor: '',
    ...overrides,
  };
}

function makeInlineParams(overrides: Record<string, any> = {}) {
  return {
    name: 'test-inline',
    id: 'inline-1',
    actionGroupId: 'ag-1',
    poster: '',
    inlineWidth: 300,
    inlineHeight: 200,
    closeButtonEnabled: true,
    closeButtonColor: '#000',
    closeButtonSize: 20,
    closeButtonPosition: 10,
    countDown: 5,
    userInteraction: 'tap',
    ...overrides,
  };
}

function findTimerText(root: any) {
  const texts = root.findAllByType(Text);
  return texts.find((t: any) => {
    try {
      return (
        typeof t.props.children === 'string' && t.props.children.endsWith('s')
      );
    } catch {
      return false;
    }
  });
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

// ── CloseBar ───────────────────────────────────────────────────────────

describe('CloseBar', () => {
  let tree: ReturnType<typeof create>;

  beforeEach(() => {
    jest.useFakeTimers();
    mockIsTV(false);
    mockState.timerFont = undefined;
  });

  afterEach(() => {
    // Unmount before clearing timers to run useEffect cleanup (clears intervals)
    act(() => {
      tree.unmount();
    });
    jest.clearAllTimers();
    jest.useRealTimers();
    restoreIsTV();
  });

  it('renders countdown text with default colors', () => {
    const params = makeModalParams({ countDown: 10 });
    tree = create(<CloseBar params={params} close={jest.fn()} />);

    const timerText = findTimerText(tree.root);
    expect(timerText).toBeTruthy();
    expect(timerText!.props.children).toBe('10s');
    expect(timerText!.props.style).toMatchObject({
      color: '#FFFFFF',
      fontSize: 24,
    });
  });

  it('hides countdown text when countDownPromptInvisible is true', () => {
    const params = makeModalParams({
      countDown: 5,
      countDownPromptInvisible: true,
    });
    tree = create(<CloseBar params={params} close={jest.fn()} />);

    expect(findTimerText(tree.root)).toBeUndefined();
  });

  it('decrements countdown every second', async () => {
    const params = makeModalParams({ countDown: 3 });
    act(() => {
      tree = create(<CloseBar params={params} close={jest.fn()} />);
    });

    expect(findTimerText(tree.root)!.props.children).toBe('3s');

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(findTimerText(tree.root)!.props.children).toBe('2s');

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(findTimerText(tree.root)!.props.children).toBe('1s');
  });

  it('calls close("timeout") when countdown reaches zero', async () => {
    const close = jest.fn();
    const params = makeModalParams({ countDown: 2 });
    act(() => {
      tree = create(<CloseBar params={params} close={close} />);
    });

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(close).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(close).toHaveBeenCalledWith('timeout');
  });

  it('does not render countdown when countDown is 0', () => {
    const params = makeModalParams({ countDown: 0 });
    tree = create(<CloseBar params={params} close={jest.fn()} />);

    expect(findTimerText(tree.root)).toBeUndefined();
  });

  it('renders close button when closeButtonEnabled is true', () => {
    const params = makeModalParams({ closeButtonEnabled: true });
    tree = create(<CloseBar params={params} close={jest.fn()} />);

    const btn = tree.root.findAllByType(TouchableOpacity);
    expect(btn.length).toBe(1);
    expect(btn[0]!.props.accessibilityLabel).toBe('Close');
  });

  it('hides close button when closeButtonEnabled is false', () => {
    const params = makeModalParams({ closeButtonEnabled: false });
    tree = create(<CloseBar params={params} close={jest.fn()} />);

    expect(tree.root.findAllByType(TouchableOpacity).length).toBe(0);
  });

  it('hides close button on TV platform', () => {
    mockIsTV(true);
    const params = makeModalParams({ closeButtonEnabled: true });
    tree = create(<CloseBar params={params} close={jest.fn()} />);

    expect(tree.root.findAllByType(TouchableOpacity).length).toBe(0);
  });

  it('calls close("dismiss") when close button is pressed', () => {
    const close = jest.fn();
    const params = makeModalParams({ closeButtonEnabled: true });
    tree = create(<CloseBar params={params} close={close} />);

    const btn = tree.root.findByType(TouchableOpacity);
    act(() => {
      btn.props.onPress();
    });
    expect(close).toHaveBeenCalledWith('dismiss');
  });

  it('applies external style overrides', () => {
    const params = makeModalParams({ closeButtonEnabled: true });
    const external: ExternalStyles = {
      closeButtonColor: '#FF0000',
      closeButtonBgColor: '#00FF00',
      closeButtonSize: 32,
      timerFontSize: 18,
      timerFontColor: '#0000FF',
    };
    tree = create(
      <CloseBar params={params} close={jest.fn()} external={external} />
    );

    const timerText = findTimerText(tree.root);
    expect(timerText!.props.style).toMatchObject({
      color: '#0000FF',
      fontSize: 18,
    });

    const btn = tree.root.findByType(TouchableOpacity);
    expect(btn.props.style).toMatchObject({
      backgroundColor: '#00FF00',
    });

    const icon = tree.root.findByProps({ children: '✕' });
    expect(icon.props.style).toMatchObject({ fontSize: 32, color: '#FF0000' });
  });

  it('applies timerFont when set', () => {
    mockState.timerFont = 'CustomFont-Bold';
    const params = makeModalParams({ countDown: 5 });
    tree = create(<CloseBar params={params} close={jest.fn()} />);

    const timerText = findTimerText(tree.root);
    expect(timerText!.props.style).toMatchObject({
      fontFamily: 'CustomFont-Bold',
    });
  });

  it('uses InlineParams closeButtonPosition for absolute positioning', () => {
    const params = makeInlineParams({ closeButtonPosition: 15 });
    tree = create(<CloseBar params={params} close={jest.fn()} />);

    const root = tree.root.findAllByType(View)[0];
    const flatStyle = Array.isArray(root!.props.style)
      ? Object.assign({}, ...root!.props.style)
      : root!.props.style;
    expect(flatStyle).toMatchObject({
      top: 15,
      right: 15,
      position: 'absolute',
    });
  });

  it('uses InlineParams closeButtonSize and closeButtonColor', () => {
    const params = makeInlineParams({
      closeButtonSize: 28,
      closeButtonColor: '#ABC123',
      closeButtonEnabled: true,
    });
    tree = create(<CloseBar params={params} close={jest.fn()} />);

    const icon = tree.root.findByProps({ children: '✕' });
    expect(icon.props.style).toMatchObject({ fontSize: 28 });
  });

  it('has correct accessibility on timer text', () => {
    const params = makeModalParams({ countDown: 7 });
    tree = create(<CloseBar params={params} close={jest.fn()} />);

    const timerText = findTimerText(tree.root);
    expect(timerText!.props.accessible).toBe(true);
    expect(timerText!.props.accessibilityLabel).toBe('7 seconds');
  });
});

// ── CustomButton ───────────────────────────────────────────────────────

describe('CustomButton', () => {
  it('renders button with title', () => {
    const tree = create(
      <CustomButton
        title="Click me"
        onPress={jest.fn()}
        titleStyle={{}}
        borderStyle={{}}
      />
    );

    const text = tree.root.findByType(Text);
    expect(text.props.children).toBe('Click me');
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const tree = create(
      <CustomButton
        title="Submit"
        onPress={onPress}
        titleStyle={{}}
        borderStyle={{}}
      />
    );

    const btn = tree.root.findByType(Pressable);
    act(() => {
      btn.props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('applies titleStyle and borderStyle', () => {
    const tree = create(
      <CustomButton
        title="Styled"
        onPress={jest.fn()}
        titleStyle={{ color: '#FF0000', fontSize: 20 }}
        borderStyle={{ borderWidth: 2, borderColor: '#00FF00' }}
      />
    );

    const text = tree.root.findByType(Text);
    expect(text.props.style).toMatchObject({
      color: '#FF0000',
      fontSize: 20,
    });

    const pressable = tree.root.findByType(Pressable);
    expect(pressable.props.style).toMatchObject({
      borderWidth: 2,
      borderColor: '#00FF00',
    });
  });

  it('applies focus highlight styles on focus', () => {
    const tree = create(
      <CustomButton
        title="Focusable"
        onPress={jest.fn()}
        titleStyle={{}}
        borderStyle={{}}
        focusStyle={{
          textHighlightColor: '#AAAAAA',
          bgHighlightColor: '#BBBBBB',
        }}
      />
    );

    const pressable = tree.root.findByType(Pressable);
    expect(pressable.props.style.backgroundColor).not.toBe('#BBBBBB');

    act(() => {
      pressable.props.onFocus();
    });

    const text = tree.root.findByType(Text);
    expect(text.props.style).toMatchObject({ color: '#AAAAAA' });
    expect(pressable.props.style).toMatchObject({
      backgroundColor: '#BBBBBB',
    });
  });

  it('removes focus highlight styles on blur', () => {
    const tree = create(
      <CustomButton
        title="Blur test"
        onPress={jest.fn()}
        titleStyle={{}}
        borderStyle={{}}
        initialFocus={true}
        focusStyle={{
          textHighlightColor: '#AAAAAA',
          bgHighlightColor: '#BBBBBB',
        }}
      />
    );

    const pressable = tree.root.findByType(Pressable);
    expect(pressable.props.style).toMatchObject({
      backgroundColor: '#BBBBBB',
    });

    act(() => {
      pressable.props.onBlur();
    });

    expect(pressable.props.style.backgroundColor).not.toBe('#BBBBBB');
  });

  it('sets hasTVPreferredFocus when initialFocus is true', () => {
    const tree = create(
      <CustomButton
        title="TV Focus"
        onPress={jest.fn()}
        titleStyle={{}}
        borderStyle={{}}
        initialFocus={true}
      />
    );

    const pressable = tree.root.findByType(Pressable);
    expect(pressable.props.hasTVPreferredFocus).toBe(true);
  });

  it('has correct accessibility props', () => {
    const tree = create(
      <CustomButton
        title="Accessible"
        onPress={jest.fn()}
        titleStyle={{}}
        borderStyle={{}}
      />
    );

    const pressable = tree.root.findByType(Pressable);
    expect(pressable.props.accessible).toBe(true);
    expect(pressable.props.accessibilityRole).toBe('button');
    expect(pressable.props.accessibilityLabel).toBe('Accessible');
  });

  it('limits text to one line', () => {
    const tree = create(
      <CustomButton
        title="Long title text"
        onPress={jest.fn()}
        titleStyle={{}}
        borderStyle={{}}
      />
    );

    const text = tree.root.findByType(Text);
    expect(text.props.numberOfLines).toBe(1);
  });
});

// ── SafeAreaContainer ──────────────────────────────────────────────────

describe('SafeAreaContainer', () => {
  afterEach(() => {
    restoreIsTV();
  });

  it('renders SafeAreaView on mobile', () => {
    mockIsTV(false);
    const tree = create(
      <SafeAreaContainer>
        <></>
      </SafeAreaContainer>
    );

    expect(tree.root.findAllByType(SafeAreaView).length).toBe(1);
    expect(tree.root.findAllByType(SafeAreaView)[0]!.props.style).toEqual({
      flex: 1,
    });
  });

  it('renders plain View on TV', () => {
    mockIsTV(true);
    const tree = create(
      <SafeAreaContainer>
        <></>
      </SafeAreaContainer>
    );

    expect(tree.root.findAllByType(SafeAreaView).length).toBe(0);
    const views = tree.root.findAllByType(View);
    expect(views.length).toBeGreaterThanOrEqual(1);
    expect(views[0]!.props.style).toEqual({ flex: 1 });
  });

  it('renders children correctly', () => {
    mockIsTV(false);
    const tree = create(
      <SafeAreaContainer>
        <Text>Hello</Text>
      </SafeAreaContainer>
    );

    const text = tree.root.findByType(Text);
    expect(text.props.children).toBe('Hello');
  });
});
