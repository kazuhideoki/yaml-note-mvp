import { renderHook } from '@testing-library/react-hooks';
import useMarkdownContent from '../useMarkdownContent';

describe('useMarkdownContent', () => {
  it('extracts markdown content from valid YAML', () => {
    const validYaml = `
title: Test Note
content: |
  # Test Heading
  This is a test paragraph.
  - List item 1
  - List item 2
`;

    const { result } = renderHook(() => useMarkdownContent(validYaml));
    
    expect(result.current.markdownContent).toContain('# Test Heading');
    expect(result.current.markdownContent).toContain('This is a test paragraph.');
    expect(result.current.error).toBeNull();
  });

  it('returns error for YAML without content field', () => {
    const invalidYaml = `
title: Test Note
description: This YAML doesn't have a content field
`;

    const { result } = renderHook(() => useMarkdownContent(invalidYaml));
    
    expect(result.current.markdownContent).toBe('');
    expect(result.current.error).toBe('YAMLにcontentフィールドが見つかりません');
  });

  it('returns error for invalid YAML syntax', () => {
    const invalidYaml = `
title: Test Note
content: |
  # Test Heading
invalid indentation
`;

    const { result } = renderHook(() => useMarkdownContent(invalidYaml));
    
    expect(result.current.markdownContent).toBe('');
    expect(result.current.error).toContain('YAMLのパースに失敗しました');
  });
});