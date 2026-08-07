import { create, act } from 'react-test-renderer';
import { RecurlyInline } from '../RecurlyInline';

// ── mocks ──────────────────────────────────────────────────────────────

let capturedCloseBarProps: any = null;
jest.mock('../Components', () => ({
  CloseBar: (props: any) => {
    capturedCloseBarProps = props;
    const { View, Text } = require('react-native');
    return (
      <View testID="close-bar">
        <Text testID="close-bar-trigger" onPress={() => props.close('dismiss')}>
          CloseBar
        </Text>
      </View>
    );
  },
}));

const mockOnEvent = jest.fn();
const mockGetInlines = jest.fn();

const mockState = {
  timerFont: undefined as string | undefined,
  buttonFont: undefined as string | undefined,
  legalTextFont: undefined as string | undefined,
  promptMgr: undefined as any,
  prompt: { delaySeconds: 0 },
};

jest.mock('../usePrompt', () => ({
  usePrompt: () => ({
    state: mockState,
    dispatch: jest.fn(),
  }),
}));

jest.mock('../utils', () => ({
  gDeviceInfo: {
    device_manufacturer: 'Apple',
    device_model: 'iPhone',
    device_type: 'ios',
    device_category: 'iphone',
    device_form: 'phone',
  },
}));

// ── helpers ────────────────────────────────────────────────────────────

const {
  FlatList,
  Image,
  Pressable,
  View,
  Dimensions,
} = require('react-native');

function makePathItem(overrides: Record<string, any> = {}) {
  return {
    id: 'path-1',
    name: 'Test Path',
    order: 1,
    path_type: 5,
    action_group_id: 'ag-1',
    actions: {
      rf_settings_bg_image_ios_iphone_composite:
        'https://example.com/image.png',
      rf_settings_tile_width: '960px',
      rf_settings_tile_height: '250px',
      rf_settings_close_button_enabled: 'true',
      rf_settings_close_seconds: '5',
      rf_settings_tile_interaction: 'tap',
      rf_settings_fill_color: '#FFFFFF',
      accessibility_label: 'Test Banner',
    },
    ...overrides,
  };
}

function makeSecondPathItem() {
  return makePathItem({
    id: 'path-2',
    name: 'Test Path 2',
    order: 2,
    actions: {
      rf_settings_bg_image_ios_iphone_composite:
        'https://example.com/image2.png',
      rf_settings_tile_width: '960px',
      rf_settings_tile_height: '250px',
      rf_settings_close_button_enabled: 'true',
      rf_settings_close_seconds: '5',
      rf_settings_tile_interaction: 'tap',
      rf_settings_fill_color: '#FFFFFF',
      accessibility_label: 'Test Banner 2',
    },
  });
}

function makeMockPromptMgr() {
  return {
    getInlines: mockGetInlines,
    onEvent: mockOnEvent,
    getApi: jest.fn(),
    getLocalStorage: jest.fn().mockReturnValue({
      createNewOverlayKey: jest.fn(),
    }),
  };
}

const defaultProps = {
  zoneId: 'zone-1',
  closeButtonColor: '#FF0000',
  closeButtonBgColor: '#00FF00',
  closeButtonSize: '24',
  timerFontSize: '14',
  timerFontColor: '#0000FF',
  focusStyle: { borderWidth: 2, borderColor: '#FFFF00' },
  onEvent: jest.fn(),
};

// ── RecurlyInline ─────────────────────────────────────────────────────

describe('RecurlyInline', () => {
  let tree: ReturnType<typeof create>;

  beforeEach(() => {
    mockGetInlines.mockReset();
    mockOnEvent.mockReset();
    defaultProps.onEvent.mockReset();
    capturedCloseBarProps = null;
    mockState.promptMgr = undefined;
    mockState.timerFont = undefined;
  });

  afterEach(() => {
    if (tree) {
      act(() => {
        tree.unmount();
      });
    }
  });

  it('renders nothing when promptMgr is undefined', () => {
    mockState.promptMgr = undefined;
    tree = create(<RecurlyInline {...defaultProps} />);

    expect(tree.root.findAllByType(FlatList).length).toBe(0);
  });

  it('renders nothing when getInlines returns empty array', async () => {
    mockGetInlines.mockResolvedValue([]);
    mockState.promptMgr = makeMockPromptMgr();

    await act(async () => {
      tree = create(<RecurlyInline {...defaultProps} />);
    });

    expect(mockGetInlines).toHaveBeenCalledWith('zone-1');
    expect(tree.root.findAllByType(FlatList).length).toBe(0);
  });

  it('renders FlatList with banners when inlines are available', async () => {
    const pathItem = makePathItem();
    mockGetInlines.mockResolvedValue([pathItem]);
    mockState.promptMgr = makeMockPromptMgr();

    await act(async () => {
      tree = create(<RecurlyInline {...defaultProps} />);
    });

    expect(mockGetInlines).toHaveBeenCalledWith('zone-1');
    expect(tree.root.findAllByType(FlatList).length).toBe(1);
  });

  it('renders multiple banners from FlatList data', async () => {
    const items = [makePathItem(), makeSecondPathItem()];
    mockGetInlines.mockResolvedValue(items);
    mockState.promptMgr = makeMockPromptMgr();

    await act(async () => {
      tree = create(<RecurlyInline {...defaultProps} />);
    });

    const flatList = tree.root.findByType(FlatList);
    expect(flatList.props.data).toHaveLength(2);
    expect(flatList.props.data[0].id).toBe('path-1');
    expect(flatList.props.data[1].id).toBe('path-2');
  });

  it('uses item.id as keyExtractor', async () => {
    const pathItem = makePathItem({ id: 'custom-id-123' });
    mockGetInlines.mockResolvedValue([pathItem]);
    mockState.promptMgr = makeMockPromptMgr();

    await act(async () => {
      tree = create(<RecurlyInline {...defaultProps} />);
    });

    const flatList = tree.root.findByType(FlatList);
    expect(flatList.props.keyExtractor(pathItem)).toBe('custom-id-123');
  });

  it('calculates height based on window width and inline aspect ratio', async () => {
    const windowWidth = Dimensions.get('window').width;
    const pathItem = makePathItem();
    mockGetInlines.mockResolvedValue([pathItem]);
    mockState.promptMgr = makeMockPromptMgr();

    await act(async () => {
      tree = create(<RecurlyInline {...defaultProps} />);
    });

    const container = tree.root
      .findAllByType(View)
      .find((v: any) => v.props.style?.position === 'relative');
    const expectedHeight = (windowWidth * 250) / 960;
    expect(container!.props.style.height).toBeCloseTo(expectedHeight);
  });

  // ── Banner component (rendered via FlatList) ──────────────────────────

  describe('Banner', () => {
    beforeEach(() => {
      mockGetInlines.mockResolvedValue([makePathItem()]);
      mockState.promptMgr = makeMockPromptMgr();
    });

    it('calls onEvent with impression on mount', async () => {
      await act(async () => {
        tree = create(<RecurlyInline {...defaultProps} />);
      });

      expect(mockOnEvent).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'path-1' }),
        'impression',
        defaultProps.onEvent
      );
    });

    it('renders Image with correct poster URI', async () => {
      await act(async () => {
        tree = create(<RecurlyInline {...defaultProps} />);
      });

      const images = tree.root.findAllByType(Image);
      const bannerImage = images.find(
        (img: any) => img.props.source?.uri === 'https://example.com/image.png'
      );
      expect(bannerImage).toBeTruthy();
      expect(bannerImage!.props.resizeMode).toBe('stretch');
    });

    it('calls onEvent with goal when banner is pressed', async () => {
      await act(async () => {
        tree = create(<RecurlyInline {...defaultProps} />);
      });

      const pressable = tree.root
        .findAllByType(Pressable)
        .find((p: any) => p.props.accessibilityLabel === 'Test Banner');
      expect(pressable).toBeTruthy();

      mockOnEvent.mockReset();
      act(() => {
        pressable!.props.onPress();
      });

      expect(mockOnEvent).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'path-1' }),
        'goal',
        defaultProps.onEvent
      );
    });

    it('disables press when userInteraction is none', async () => {
      const pathItem = makePathItem({
        actions: {
          ...makePathItem().actions,
          rf_settings_tile_interaction: 'none',
        },
      });
      mockGetInlines.mockResolvedValue([pathItem]);

      await act(async () => {
        tree = create(<RecurlyInline {...defaultProps} />);
      });

      const pressable = tree.root
        .findAllByType(Pressable)
        .find((p: any) => p.props.accessibilityRole === 'button');
      expect(pressable!.props.disabled).toBe(true);
    });

    it('does not fire goal event when userInteraction is none', async () => {
      const pathItem = makePathItem({
        actions: {
          ...makePathItem().actions,
          rf_settings_tile_interaction: 'none',
        },
      });
      mockGetInlines.mockResolvedValue([pathItem]);

      await act(async () => {
        tree = create(<RecurlyInline {...defaultProps} />);
      });

      mockOnEvent.mockReset();
      const pressable = tree.root
        .findAllByType(Pressable)
        .find((p: any) => p.props.accessibilityRole === 'button');
      act(() => {
        pressable!.props.onPress();
      });

      expect(mockOnEvent).not.toHaveBeenCalled();
    });

    it('applies focusStyle when banner is focused', async () => {
      await act(async () => {
        tree = create(<RecurlyInline {...defaultProps} />);
      });

      const pressable = tree.root
        .findAllByType(Pressable)
        .find((p: any) => p.props.accessibilityLabel === 'Test Banner');

      act(() => {
        pressable!.props.onFocus();
      });

      const image = tree.root
        .findAllByType(Image)
        .find(
          (img: any) =>
            img.props.source?.uri === 'https://example.com/image.png'
        );
      expect(image!.props.style).toMatchObject({
        borderWidth: 2,
        borderColor: '#FFFF00',
      });
    });

    it('removes focusStyle when banner is blurred', async () => {
      await act(async () => {
        tree = create(<RecurlyInline {...defaultProps} />);
      });

      const pressable = tree.root
        .findAllByType(Pressable)
        .find((p: any) => p.props.accessibilityLabel === 'Test Banner');

      act(() => {
        pressable!.props.onFocus();
      });
      act(() => {
        pressable!.props.onBlur();
      });

      const image = tree.root
        .findAllByType(Image)
        .find(
          (img: any) =>
            img.props.source?.uri === 'https://example.com/image.png'
        );
      expect(image!.props.style).not.toMatchObject({
        borderWidth: 2,
        borderColor: '#FFFF00',
      });
    });

    it('has correct accessibility props', async () => {
      await act(async () => {
        tree = create(<RecurlyInline {...defaultProps} />);
      });

      const pressable = tree.root
        .findAllByType(Pressable)
        .find((p: any) => p.props.accessibilityLabel === 'Test Banner');
      expect(pressable!.props.accessible).toBe(true);
      expect(pressable!.props.accessibilityRole).toBe('button');
    });
  });

  // ── CloseBar integration ──────────────────────────────────────────────

  describe('CloseBar integration', () => {
    it('passes inlineParams to CloseBar', async () => {
      mockGetInlines.mockResolvedValue([makePathItem()]);
      mockState.promptMgr = makeMockPromptMgr();

      await act(async () => {
        tree = create(<RecurlyInline {...defaultProps} />);
      });

      expect(capturedCloseBarProps).toBeTruthy();
      expect(capturedCloseBarProps.params).toMatchObject({
        name: 'Test Path',
        id: 'path-1',
        inlineWidth: 960,
        inlineHeight: 250,
        poster: 'https://example.com/image.png',
      });
    });

    it('passes external style overrides to CloseBar', async () => {
      mockGetInlines.mockResolvedValue([makePathItem()]);
      mockState.promptMgr = makeMockPromptMgr();

      await act(async () => {
        tree = create(<RecurlyInline {...defaultProps} />);
      });

      expect(capturedCloseBarProps.external).toEqual({
        closeButtonColor: '#FF0000',
        closeButtonBgColor: '#00FF00',
        closeButtonSize: 24,
        timerFontColor: '#0000FF',
        timerFontSize: 14,
      });
    });

    it('hides component when CloseBar close is triggered', async () => {
      mockGetInlines.mockResolvedValue([makePathItem()]);
      mockState.promptMgr = makeMockPromptMgr();

      await act(async () => {
        tree = create(<RecurlyInline {...defaultProps} />);
      });

      expect(tree.root.findAllByType(FlatList).length).toBe(1);

      act(() => {
        capturedCloseBarProps.close('dismiss');
      });

      expect(tree.root.findAllByType(FlatList).length).toBe(0);
    });

    it('calls onEvent on first pathItem when closed', async () => {
      mockGetInlines.mockResolvedValue([makePathItem()]);
      mockState.promptMgr = makeMockPromptMgr();

      await act(async () => {
        tree = create(<RecurlyInline {...defaultProps} />);
      });

      mockOnEvent.mockReset();

      act(() => {
        capturedCloseBarProps.close('dismiss');
      });

      expect(mockOnEvent).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'path-1' }),
        'dismiss',
        defaultProps.onEvent
      );
    });

    it('parses closeButtonSize and timerFontSize as integers', async () => {
      mockGetInlines.mockResolvedValue([makePathItem()]);
      mockState.promptMgr = makeMockPromptMgr();

      await act(async () => {
        tree = create(
          <RecurlyInline
            {...defaultProps}
            closeButtonSize="32"
            timerFontSize="18"
          />
        );
      });

      expect(capturedCloseBarProps.external.closeButtonSize).toBe(32);
      expect(capturedCloseBarProps.external.timerFontSize).toBe(18);
    });
  });
});
