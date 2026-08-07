import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';
import {
  initialState,
  PromptReducer,
  PromptAction_Init,
  PromptAction_Font_Button,
  PromptAction_Font_Timer,
  PromptAction_Font_LegalText,
  PromptAction_Set_Prompt,
  PromptContext,
  usePrompt,
} from '../usePrompt';

// ── initialState ──────────────────────────────────────────────────────────────

describe('initialState', () => {
  it('has correct defaults', () => {
    expect(initialState).toEqual({
      promptMgr: undefined,
      buttonFont: undefined,
      timerFont: undefined,
      legalTextFont: undefined,
      prompt: { delaySeconds: 0 },
    });
  });
});

// ── PromptReducer ─────────────────────────────────────────────────────────────

describe('PromptReducer', () => {
  it('handles PromptAction_Init', () => {
    const mockMgr = { fake: 'manager' };
    const result = PromptReducer(initialState, {
      type: PromptAction_Init,
      data: mockMgr,
    });
    expect(result.promptMgr).toBe(mockMgr);
    expect(result.buttonFont).toBeUndefined();
  });

  it('handles PromptAction_Font_Button', () => {
    const result = PromptReducer(initialState, {
      type: PromptAction_Font_Button,
      data: 'Roboto-Bold',
    });
    expect(result.buttonFont).toBe('Roboto-Bold');
  });

  it('handles PromptAction_Font_Timer', () => {
    const result = PromptReducer(initialState, {
      type: PromptAction_Font_Timer,
      data: 'Courier',
    });
    expect(result.timerFont).toBe('Courier');
  });

  it('handles PromptAction_Font_LegalText', () => {
    const result = PromptReducer(initialState, {
      type: PromptAction_Font_LegalText,
      data: 'Georgia',
    });
    expect(result.legalTextFont).toBe('Georgia');
  });

  it('handles PromptAction_Set_Prompt', () => {
    const promptData = { delaySeconds: 5, path: { id: 'p1' } };
    const result = PromptReducer(initialState, {
      type: PromptAction_Set_Prompt,
      data: promptData,
    });
    expect(result.prompt).toBe(promptData);
  });

  it('preserves other state fields on update', () => {
    const stateWithFont = {
      ...initialState,
      buttonFont: 'Arial',
      timerFont: 'Helvetica',
    };
    const result = PromptReducer(stateWithFont, {
      type: PromptAction_Font_LegalText,
      data: 'Georgia',
    });
    expect(result.buttonFont).toBe('Arial');
    expect(result.timerFont).toBe('Helvetica');
    expect(result.legalTextFont).toBe('Georgia');
  });

  it('throws on unknown action type', () => {
    expect(() =>
      PromptReducer(initialState, { type: 'UNKNOWN', data: null })
    ).toThrow('Unhandled action type: UNKNOWN');
  });
});

// ── usePrompt hook ────────────────────────────────────────────────────────────

describe('usePrompt', () => {
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  it('throws when used outside PromptContext provider', () => {
    const Bad = () => {
      usePrompt();
      return null;
    };
    expect(() => {
      create(<Bad />);
    }).toThrow('usePrompt must be used within a PromptProvider');
  });

  it('returns context value when inside provider', () => {
    let captured: ReturnType<typeof usePrompt> | undefined;
    const dispatch = jest.fn();

    const Consumer = () => {
      captured = usePrompt();
      return <Text>{captured.state.buttonFont ?? 'none'}</Text>;
    };

    act(() => {
      create(
        <PromptContext.Provider value={{ state: initialState, dispatch }}>
          <Consumer />
        </PromptContext.Provider>
      );
    });

    expect(captured).toBeDefined();
    expect(captured!.state).toBe(initialState);
    expect(captured!.dispatch).toBe(dispatch);
  });

  it('reflects updated state from provider', () => {
    let captured: ReturnType<typeof usePrompt> | undefined;
    const customState = { ...initialState, buttonFont: 'Custom-Font' };

    const Consumer = () => {
      captured = usePrompt();
      return null;
    };

    act(() => {
      create(
        <PromptContext.Provider
          value={{ state: customState, dispatch: jest.fn() }}
        >
          <Consumer />
        </PromptContext.Provider>
      );
    });

    expect(captured!.state.buttonFont).toBe('Custom-Font');
  });
});
