import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import 'prismjs/themes/prism.css';
import useLogger from '../hooks/useLogger';
import { createPerformanceMarker } from '../utils/logUtils';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

/**
 * Markdownプレビューコンポーネント
 *
 * @component
 * @param {MarkdownPreviewProps} props - プレビューのプロパティ
 * @param {string} props.content - Markdownとして表示する内容
 * @param {string} [props.className] - 追加のCSSクラス
 * @returns {JSX.Element}
 *
 * @description
 * YAMLノートのcontentフィールドをMarkdownとして安全にプレビュー表示する。
 * パフォーマンス計測やUXログも記録。remark/rehypeによる拡張Markdown対応。
 */

export default MarkdownPreview;
