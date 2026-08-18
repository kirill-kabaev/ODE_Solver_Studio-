import React, { useMemo } from 'react';
import katex from 'katex';

interface MathViewProps {
  math: string;
  block?: boolean;
  className?: string;
}

export const MathView: React.FC<MathViewProps> = ({ math, block = false, className = '' }) => {
  const html = useMemo(() => {
    if (!math) return '';
    try {
      // Clean up common issues if any
      const cleaned = math.trim();
      return katex.renderToString(cleaned, {
        displayMode: block,
        throwOnError: false,
        output: 'htmlAndMathml',
      });
    } catch (err) {
      console.warn('KaTeX render error:', err);
      return `<span class="text-rose-400 font-mono">${math}</span>`;
    }
  }, [math, block]);

  if (!html) return null;

  return (
    <span
      className={`inline-block select-text ${block ? 'block my-1 text-center overflow-x-auto py-1 max-w-full' : ''} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
