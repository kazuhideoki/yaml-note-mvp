/**
 * 競合検知ダイアログコンポーネント
 * @component
 * @param {ConflictDialogProps} props - ダイアログのプロパティ
 * @param {boolean} props.open - ダイアログ表示状態
 * @param {() => void} props.onClose - 閉じるボタン押下時のハンドラ
 * @param {boolean} props.hasConflict - 競合が存在するか
 * @param {any[]} props.conflicts - 競合詳細（パス・値などの配列）
 * @description
 * YAML差分・競合検知APIの結果をもとに、競合内容をユーザーに警告・表示するダイアログ。
 */
import React from "react";

/**
 * 競合検知ダイアログのprops型
 * @property {boolean} open - ダイアログ表示状態
 * @property {() => void} onClose - 閉じるボタン押下時のハンドラ
 * @property {boolean} hasConflict - 競合が存在するか
 * @property {any[]} conflicts - 競合詳細（パス・値などの配列）
 */
export interface ConflictDialogProps {
  open: boolean;
  onClose: () => void;
  hasConflict: boolean;
  conflicts: any[];
}

export const ConflictDialog: React.FC<ConflictDialogProps> = ({
  open,
  onClose,
  hasConflict,
  conflicts,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-lg">
        <h2 className="text-lg font-bold mb-2 text-red-600">編集競合が検出されました</h2>
        <p className="mb-4 text-gray-700">
          他のタブまたは編集内容と競合が発生しています。下記の競合箇所を確認してください。
        </p>
        <ul className="mb-4 max-h-48 overflow-y-auto text-sm">
          {conflicts.length === 0 ? (
            <li>詳細情報はありません。</li>
          ) : (
            conflicts.map((conflict, idx) => (
              <li key={idx} className="mb-2">
                <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">
                  {conflict.path}
                </span>
                ：
                <span className="ml-1">{JSON.stringify(conflict.value)}</span>
              </li>
            ))
          )}
        </ul>
        <div className="flex justify-end">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
