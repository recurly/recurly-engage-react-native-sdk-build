import { createContext, useContext } from 'react';
import { type PromptManager } from './PromptManager';
import { type CandidatePathItem } from '@recurly/engage-core';

interface PromptState {
  promptMgr?: PromptManager;
  buttonFont: string | undefined;
  timerFont: string | undefined;
  legalTextFont: string | undefined;
  prompt: CandidatePathItem;
}

export const initialState: PromptState = {
  promptMgr: undefined,
  buttonFont: undefined,
  timerFont: undefined,
  legalTextFont: undefined,
  prompt: { delaySeconds: 0 },
};

export interface PromptAction {
  type: string;
  data: any;
}

export const PromptAction_Init = 'promo_init';
export const PromptAction_Font_Button = 'promo_font_button';
export const PromptAction_Font_Timer = 'promo_font_timer';
export const PromptAction_Font_LegalText = 'promo_font_legal_text';
export const PromptAction_Set_Prompt = 'promo_set_prompt';

export const PromptReducer = (
  state: PromptState,
  action: PromptAction
): PromptState => {
  let newState;
  switch (action.type) {
    case PromptAction_Init:
      newState = { ...state, promptMgr: action.data };
      break;
    case PromptAction_Font_Button:
      newState = { ...state, buttonFont: action.data };
      break;
    case PromptAction_Font_Timer:
      newState = { ...state, timerFont: action.data };
      break;
    case PromptAction_Font_LegalText:
      newState = { ...state, legalTextFont: action.data };
      break;
    case PromptAction_Set_Prompt:
      newState = { ...state, prompt: action.data };
      break;
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
  // console.log(JSON.stringify(newState, null, 2));
  return newState;
};

interface PromptContextType {
  state: PromptState;
  dispatch: React.Dispatch<PromptAction>;
}

export const PromptContext = createContext<PromptContextType | undefined>(
  undefined
);

export const usePrompt = () => {
  const context = useContext(PromptContext);
  if (context === undefined) {
    throw new Error('usePrompt must be used within a PromptProvider');
  }
  return context;
};
