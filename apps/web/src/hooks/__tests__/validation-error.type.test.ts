/**
 * @file validation-error.type.test.ts
 * @description mapNumericToStringErrorCode のテスト
 */

import { describe, it, expect } from 'vitest';
import { mapNumericToStringErrorCode, ErrorCode } from '../validation-error.type';

describe('mapNumericToStringErrorCode', () => {
  it('数値コードを正しく変換する', () => {
    expect(mapNumericToStringErrorCode(4)).toBe(ErrorCode.SchemaValidation);
  });

  it('文字列コードを正しく変換する', () => {
    expect(mapNumericToStringErrorCode('SchemaValidation')).toBe(ErrorCode.SchemaValidation);
  });

  it('不正な入力は Unknown を返す', () => {
    expect(mapNumericToStringErrorCode('invalid')).toBe(ErrorCode.Unknown);
    expect(mapNumericToStringErrorCode(null)).toBe(ErrorCode.Unknown);
  });
});
