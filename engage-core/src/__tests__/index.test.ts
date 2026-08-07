import {
  PromptApi,
  PromptCore,
  extractModalParams,
  extractVideoModalParams,
  extractInlineParams,
  preparePromptResult,
  decodeDeeplink,
  PathType,
  PromptResultCode,
  InlineType,
  getPathTypeName,
} from '../index';

describe('index re-exports', () => {
  it('exports all public symbols', () => {
    expect(PromptApi).toBeDefined();
    expect(PromptCore).toBeDefined();
    expect(extractModalParams).toBeDefined();
    expect(extractVideoModalParams).toBeDefined();
    expect(extractInlineParams).toBeDefined();
    expect(preparePromptResult).toBeDefined();
    expect(decodeDeeplink).toBeDefined();
    expect(PathType).toBeDefined();
    expect(PromptResultCode).toBeDefined();
    expect(InlineType).toBeDefined();
    expect(getPathTypeName).toBeDefined();
  });
});
