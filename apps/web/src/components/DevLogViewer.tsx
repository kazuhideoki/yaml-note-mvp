import React, { useState } from 'react';
import useLogger, { LogEvent, LogLevel } from '../hooks/useLogger';

interface DevLogViewerProps {
  onClose: () => void;
}

/**
 * 開発者向けログビューアコンポーネント
 * アプリケーション内でUXログを確認するためのUI
 */
const DevLogViewer: React.FC<DevLogViewerProps> = ({ onClose }) => {
  const { events, exportLogs } = useLogger();
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');
  const [expanded, setExpanded] = useState<number | null>(null);
  
  // フィルタに基づいてイベントを絞り込む
  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(event => event.level === filter);
  
  // ログをJSONファイルとしてエクスポートする
  const handleExport = () => {
    const exportData = exportLogs();
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `yaml-note-logs-${new Date().toISOString()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  };
  
  // イベントの詳細表示を切り替える
  const toggleExpand = (index: number) => {
    setExpanded(expanded === index ? null : index);
  };
  
  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-3/4 h-3/4 p-4 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">開発者ログビューア</h2>
          <div className="flex gap-2">
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value as LogLevel | 'all')}
              className="border rounded px-2 py-1"
            >
              <option value="all">すべて</option>
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
            </select>
            <button 
              onClick={handleExport} 
              className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
              title="ログをJSONとしてエクスポート"
            >
              エクスポート
            </button>
            <button 
              onClick={onClose} 
              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
            >
              閉じる
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto border rounded">
          <table className="w-full text-left">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="p-2">時間</th>
                <th className="p-2">レベル</th>
                <th className="p-2">アクション</th>
                <th className="p-2">詳細</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-500">
                    記録されたログがありません
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event, index) => (
                  <tr 
                    key={index} 
                    className={`border-b hover:bg-gray-50 cursor-pointer ${
                      expanded === index ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => toggleExpand(index)}
                  >
                    <td className="p-2 font-mono">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </td>
                    <td className={`p-2 ${
                      event.level === 'error' ? 'text-red-500 font-bold' :
                      event.level === 'warn' ? 'text-yellow-600 font-bold' :
                      event.level === 'info' ? 'text-blue-500' :
                      'text-gray-500'
                    }`}>
                      {event.level.toUpperCase()}
                    </td>
                    <td className="p-2">{event.action}</td>
                    <td className="p-2">
                      {expanded === index && event.details ? (
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                          {JSON.stringify(event.details, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-sm">
                          {event.details 
                            ? JSON.stringify(event.details).substring(0, 50) + 
                              (JSON.stringify(event.details).length > 50 ? '...' : '')
                            : '詳細なし'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="mt-2 text-sm text-gray-500">
          セッションID: <span className="font-mono">{events[0]?.sessionId || 'N/A'}</span> •
          合計イベント数: {events.length}
        </div>
      </div>
    </div>
  );
};

export default DevLogViewer;