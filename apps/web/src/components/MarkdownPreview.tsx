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

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  className = ''
}) => {
  const { log } = useLogger();
  const previousContentLength = useRef<number>(0);

  // コンテンツが変更されたときにレンダリングパフォーマンスを計測
  useEffect(() => {
    // コンテンツ長さが変わったときだけログを記録
    if (content.length !== previousContentLength.current) {
      const endMeasure = createPerformanceMarker('markdown_render');

      // ここでレンダリングされる（次のレンダリングサイクル）
      setTimeout(() => {
        const perfData = endMeasure();

        // 50ms以上かかった場合のみログに記録
        if (perfData.duration > 50) {
          log('debug', 'markdown_render_performance', {
            ...perfData,
            contentLength: content.length,
            headings: (content.match(/^#+\s.+$/gm) || []).length,
            lists: (content.match(/^[\s-]*[-*+]\s.+$/gm) || []).length,
            codeBlocks: (content.match(/```[\s\S]*?```/g) || []).length,
          });
        }
      }, 0);

      // マークダウン変更があったことを記録（内容は記録しない）
      log('info', 'markdown_content_update', {
        contentSize: content.length,
        // プライバシー保護のため、コンテンツそのものでなく特徴を記録
        features: {
          hasHeadings: content.includes('#'),
          hasLists: /^[-*+]\s/m.test(content),
          hasCodeBlocks: content.includes('```'),
          hasLinks: content.includes(']('),
          hasImages: content.includes('!['),
        }
      });

      previousContentLength.current = content.length;
    }
  }, [content, log]);

  return (
    <div className={`prose prose-slate max-w-none p-4 overflow-auto ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize, rehypeRaw, rehypeHighlight]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownPreview;