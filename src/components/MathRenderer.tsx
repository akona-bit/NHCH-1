import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useSettings } from '../contexts/SettingsContext';

interface MathRendererProps {
  content: string;
  className?: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content, className }) => {
  const { theme } = useSettings();
  
  return (
    <div className={`prose ${theme === 'dark' ? 'prose-invert' : ''} prose-p:leading-relaxed prose-pre:bg-surface shadow-sm-high max-w-none ${className || ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export const MathInline: React.FC<{ math: string }> = ({ math }) => {
  return <MathRenderer content={`$${math}$`} />;
};

export const MathBlock: React.FC<{ math: string }> = ({ math }) => {
  return <MathRenderer content={`$$${math}$$`} />;
};
