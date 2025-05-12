import { useState, useCallback, useEffect } from 'react';

const VALIDATION_ENABLED_KEY = 'yaml-note-validation-enabled';

/**
 * バリデーション有効/無効を切り替えるためのフック
 * 
 * @returns {{
 *   isValidationEnabled: boolean;
 *   toggleValidation: () => void;
 *   enableValidation: () => void;
 *   disableValidation: () => void;
 * }}
 */
export function useValidationToggle(initialState: boolean = true) {
  // localStorageから初期状態を読み込む
  const [isValidationEnabled, setIsValidationEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem(VALIDATION_ENABLED_KEY);
    return stored !== null ? stored === 'true' : initialState;
  });

  // バリデーションを切り替える
  const toggleValidation = useCallback(() => {
    setIsValidationEnabled(prev => !prev);
  }, []);

  // バリデーションを有効にする
  const enableValidation = useCallback(() => {
    setIsValidationEnabled(true);
  }, []);

  // バリデーションを無効にする
  const disableValidation = useCallback(() => {
    setIsValidationEnabled(false);
  }, []);

  // 状態変更時にlocalStorageに保存
  useEffect(() => {
    localStorage.setItem(VALIDATION_ENABLED_KEY, String(isValidationEnabled));
  }, [isValidationEnabled]);

  return {
    isValidationEnabled,
    toggleValidation,
    enableValidation,
    disableValidation
  };
}

export default useValidationToggle;

