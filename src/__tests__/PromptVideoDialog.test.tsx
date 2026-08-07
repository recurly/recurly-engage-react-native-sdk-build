import { create, act } from 'react-test-renderer';

// ── mocks ──────────────────────────────────────────────────────────────

const mockOnEvent = jest.fn();

const mockState = {
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

const mockExtractVideoModalParams = jest.fn();

jest.mock('@recurly/engage-core', () => ({
  extractVideoModalParams: (...args: any[]) =>
    mockExtractVideoModalParams(...args),
}));

jest.mock('../utils', () => ({
  modalAlignment: (_position: string) => ({
    justifyContent: 'center',
    alignItems: 'center',
  }),
}));

const mockPlay = jest.fn();
const mockPlayer = { loop: false, muted: false, play: mockPlay };

jest.mock('expo-video', () => {
  const { View } = require('react-native');
  return {
    useVideoPlayer: (_url: string, setup: (p: any) => void) => {
      setup(mockPlayer);
      return mockPlayer;
    },
    VideoView: (props: any) => <View testID="video-view" {...props} />,
  };
});

// ── helpers ────────────────────────────────────────────────────────────

import { PromptVideoDialog } from '../PromptVideoDialog';

const { Modal, ImageBackground, Button } = require('react-native');

function makePath(overrides: Record<string, any> = {}) {
  return {
    name: 'test-video',
    id: 'video-1',
    order: 0,
    path_type: 4, // VIDEO
    actions: {
      rf_settings_video_url: 'https://example.com/video.mp4',
      rf_settings_video_poster: 'https://example.com/poster.png',
      rf_settings_pop_up_size: '70',
      rf_retention_button1_text: 'Watch',
      ...overrides,
    },
  };
}

function makeVideoParams(overrides: Record<string, any> = {}) {
  return {
    modalWidth: 400,
    modalHeight: 300,
    modalPosition: 'center',
    button1: {
      label: 'Watch',
      textColor: '#FFFFFF',
      bgColor: '#3096ED',
    },
    button2: undefined as any,
    button3: undefined as any,
    loopVideo: false,
    showControls: true,
    url: 'https://example.com/video.mp4',
    mute: false,
    poster: 'https://example.com/poster.png',
    animationType: 'slide',
    ...overrides,
  };
}

// ── tests ──────────────────────────────────────────────────────────────

describe('PromptVideoDialog', () => {
  let tree: ReturnType<typeof create>;
  const onEvent = jest.fn();

  beforeEach(() => {
    mockOnEvent.mockReset();
    onEvent.mockReset();
    mockPlay.mockReset();
    mockPlayer.loop = false;
    mockPlayer.muted = false;
    mockExtractVideoModalParams.mockReturnValue(makeVideoParams());
  });

  afterEach(() => {
    act(() => {
      tree.unmount();
    });
  });

  it('renders a visible slide-in Modal', () => {
    const path = makePath();
    tree = create(<PromptVideoDialog path={path} onEvent={onEvent} />);

    const modal = tree.root.findByType(Modal);
    expect(modal.props.animationType).toBe('slide');
    expect(modal.props.transparent).toBe(true);
    expect(modal.props.visible).toBe(true);
  });

  it('calls promptMgr.onEvent with impression on mount', () => {
    const path = makePath();
    act(() => {
      tree = create(<PromptVideoDialog path={path} onEvent={onEvent} />);
    });

    expect(mockOnEvent).toHaveBeenCalledWith(path, 'impression', onEvent);
  });

  it('calls dismiss onEvent on Modal onRequestClose', () => {
    const path = makePath();
    tree = create(<PromptVideoDialog path={path} onEvent={onEvent} />);

    const modal = tree.root.findByType(Modal);
    act(() => {
      modal.props.onRequestClose();
    });

    expect(mockOnEvent).toHaveBeenCalledWith(path, 'dismiss', onEvent);
  });

  it('passes path and screen dimensions to extractVideoModalParams', () => {
    const path = makePath();
    tree = create(<PromptVideoDialog path={path} onEvent={onEvent} />);

    expect(mockExtractVideoModalParams).toHaveBeenCalledWith(
      path,
      expect.any(Number),
      expect.any(Number)
    );
  });

  // ── ImageBackground / poster ─────────────────────────────────────────

  it('renders ImageBackground with poster uri', () => {
    mockExtractVideoModalParams.mockReturnValue(
      makeVideoParams({ poster: 'https://example.com/poster.png' })
    );
    const path = makePath();
    tree = create(<PromptVideoDialog path={path} onEvent={onEvent} />);

    const bg = tree.root.findByType(ImageBackground);
    expect(bg.props.source).toEqual({
      uri: 'https://example.com/poster.png',
    });
    expect(bg.props.resizeMode).toBe('stretch');
  });

  it('applies modal dimensions to ImageBackground', () => {
    mockExtractVideoModalParams.mockReturnValue(
      makeVideoParams({ modalWidth: 500, modalHeight: 350 })
    );
    const path = makePath();
    tree = create(<PromptVideoDialog path={path} onEvent={onEvent} />);

    const bg = tree.root.findByType(ImageBackground);
    expect(bg.props.style).toMatchObject({ width: 500, height: 350 });
  });

  // ── video player ─────────────────────────────────────────────────────

  it('creates player with the video url and calls play()', () => {
    const path = makePath();
    tree = create(<PromptVideoDialog path={path} onEvent={onEvent} />);

    expect(mockPlay).toHaveBeenCalled();
  });

  it('sets player.loop from loopVideo param', () => {
    mockExtractVideoModalParams.mockReturnValue(
      makeVideoParams({ loopVideo: true })
    );
    const path = makePath();
    tree = create(<PromptVideoDialog path={path} onEvent={onEvent} />);

    expect(mockPlayer.loop).toBe(true);
  });

  it('sets player.muted from mute param', () => {
    mockExtractVideoModalParams.mockReturnValue(
      makeVideoParams({ mute: true })
    );
    const path = makePath();
    tree = create(<PromptVideoDialog path={path} onEvent={onEvent} />);

    expect(mockPlayer.muted).toBe(true);
  });

  it('renders VideoView with correct dimensions and nativeControls', () => {
    mockExtractVideoModalParams.mockReturnValue(
      makeVideoParams({
        modalWidth: 500,
        modalHeight: 350,
        showControls: true,
      })
    );
    const path = makePath();
    tree = create(<PromptVideoDialog path={path} onEvent={onEvent} />);

    const videoView = tree.root.findByProps({ testID: 'video-view' });
    expect(videoView.props.style).toMatchObject({ width: 500, height: 350 });
    expect(videoView.props.nativeControls).toBe(true);
    expect(videoView.props.contentFit).toBe('cover');
  });

  it('hides native controls when showControls is false', () => {
    mockExtractVideoModalParams.mockReturnValue(
      makeVideoParams({ showControls: false })
    );
    const path = makePath();
    tree = create(<PromptVideoDialog path={path} onEvent={onEvent} />);

    const videoView = tree.root.findByProps({ testID: 'video-view' });
    expect(videoView.props.nativeControls).toBe(false);
  });

  // ── button rendering ─────────────────────────────────────────────────

  it('renders button1 and calls goal onEvent when pressed', () => {
    const path = makePath();
    tree = create(<PromptVideoDialog path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Button);
    expect(buttons.length).toBe(1);
    expect(buttons[0]!.props.title).toBe('Watch');

    act(() => {
      buttons[0]!.props.onPress();
    });

    expect(mockOnEvent).toHaveBeenCalledWith(path, 'goal', onEvent);
  });

  it('renders button2 and calls goal2 onEvent when pressed', () => {
    mockExtractVideoModalParams.mockReturnValue(
      makeVideoParams({
        button2: {
          label: 'Maybe Later',
          textColor: '#333',
          bgColor: '#CCC',
        },
      })
    );
    const path = makePath();
    tree = create(<PromptVideoDialog path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Button);
    expect(buttons.length).toBe(2);
    expect(buttons[1]!.props.title).toBe('Maybe Later');

    act(() => {
      buttons[1]!.props.onPress();
    });

    expect(mockOnEvent).toHaveBeenCalledWith(path, 'goal2', onEvent);
  });

  it('renders button3 and calls decline onEvent when pressed', () => {
    mockExtractVideoModalParams.mockReturnValue(
      makeVideoParams({
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
    tree = create(<PromptVideoDialog path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Button);
    expect(buttons.length).toBe(3);
    expect(buttons[2]!.props.title).toBe('No Thanks');

    act(() => {
      buttons[2]!.props.onPress();
    });

    expect(mockOnEvent).toHaveBeenCalledWith(path, 'decline', onEvent);
  });

  it('does not render button2 when it is undefined', () => {
    mockExtractVideoModalParams.mockReturnValue(
      makeVideoParams({ button2: undefined, button3: undefined })
    );
    const path = makePath();
    tree = create(<PromptVideoDialog path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Button);
    expect(buttons.length).toBe(1);
  });

  it('does not render button3 when it is undefined', () => {
    mockExtractVideoModalParams.mockReturnValue(
      makeVideoParams({
        button2: {
          label: 'Maybe',
          textColor: '#333',
          bgColor: '#CCC',
        },
        button3: undefined,
      })
    );
    const path = makePath();
    tree = create(<PromptVideoDialog path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Button);
    expect(buttons.length).toBe(2);
  });

  it('falls back to empty string when button1.label is null', () => {
    mockExtractVideoModalParams.mockReturnValue(
      makeVideoParams({
        button1: { label: null, textColor: '#FFF', bgColor: '#000' },
      })
    );
    const path = makePath();
    tree = create(<PromptVideoDialog path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Button);
    expect(buttons[0]!.props.title).toBe('');
  });

  it('falls back to empty string when button2.label is null', () => {
    mockExtractVideoModalParams.mockReturnValue(
      makeVideoParams({
        button2: { label: null, textColor: '#333', bgColor: '#CCC' },
      })
    );
    const path = makePath();
    tree = create(<PromptVideoDialog path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Button);
    expect(buttons[1]!.props.title).toBe('');
  });

  it('falls back to empty string when button3.label is null', () => {
    mockExtractVideoModalParams.mockReturnValue(
      makeVideoParams({
        button2: { label: 'Maybe', textColor: '#333', bgColor: '#CCC' },
        button3: { label: null, textColor: '#999', bgColor: '#EEE' },
      })
    );
    const path = makePath();
    tree = create(<PromptVideoDialog path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Button);
    expect(buttons[2]!.props.title).toBe('');
  });

  it('applies button background color from params', () => {
    mockExtractVideoModalParams.mockReturnValue(
      makeVideoParams({
        button1: {
          label: 'Go',
          textColor: '#FFF',
          bgColor: '#00FF00',
        },
      })
    );
    const path = makePath();
    tree = create(<PromptVideoDialog path={path} onEvent={onEvent} />);

    const buttons = tree.root.findAllByType(Button);
    expect(buttons[0]!.props.color).toBe('#00FF00');
  });
});
