import React, { useMemo } from 'react';
import katex from 'katex';

interface MathViewProps {
  math: string;
  block?: boolean;
  className?: string;
}

/**
 * Pure KaTeX Renderer for a single LaTeX expression.
 */
export const MathView: React.FC<MathViewProps> = ({ math, block = false, className = '' }) => {
  const html = useMemo(() => {
    if (!math) return '';
    try {
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

interface MathTextProps {
  text: string;
  className?: string;
}

interface TextSegment {
  type: 'text' | 'inline-math' | 'block-math';
  content: string;
}

/**
 * Renders mixed natural text with embedded LaTeX formulas ($...$, $$...$$, \[...\], \(...\)).
 * Automatically converts all math segments into crisp, beautifully formatted KaTeX typography.
 */
export const MathText: React.FC<MathTextProps> = ({ text, className = '' }) => {
  const segments = useMemo<TextSegment[]>(() => {
    if (!text || typeof text !== 'string') return [];

    const trimmed = text.trim();

    // Check if the entire string is a raw LaTeX expression (starts with \ or contains typical LaTeX commands without $)
    const isPureLatex = (
      !trimmed.includes('$') &&
      !trimmed.includes('\\(') &&
      !trimmed.includes('\\[') &&
      (/\\(mathbf|frac|partial|nabla|ddot|dot|boldsymbol|sqrt|int|sum|times|cdot|alpha|beta|gamma|theta|rho|sigma|tau|mu|Delta|omega|text|hat|vec|pm)/.test(trimmed))
    );

    if (isPureLatex) {
      return [{ type: 'block-math', content: trimmed }];
    }

    // Check if text has any math markers or LaTeX backslash commands
    const hasMath = text.includes('$') || text.includes('\\(') || text.includes('\\[') || text.includes('\\');
    if (!hasMath) {
      return [{ type: 'text', content: text }];
    }

    const result: TextSegment[] = [];
    
    // Unified Regex to catch $$...$$, \[...\], $...$, and \(...\)
    // Group 1: $$...$$
    // Group 2: \[...\]
    // Group 3: $...$
    // Group 4: \(...\)
    const mathRegex = /(\$\$([\s\S]+?)\$\$)|(\\\[([\s\S]+?)\\\])|(\$([^\$\n]+?)\$)|(\\\(([\s\S]+?)\\\))/g;
    
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = mathRegex.exec(text)) !== null) {
      const matchIndex = match.index;
      
      // Push preceding normal text if any
      if (matchIndex > lastIndex) {
        result.push({
          type: 'text',
          content: text.slice(lastIndex, matchIndex),
        });
      }

      // Determine math type and extract content
      if (match[2] !== undefined) {
        // $$...$$
        result.push({ type: 'block-math', content: match[2] });
      } else if (match[4] !== undefined) {
        // \[...\]
        result.push({ type: 'block-math', content: match[4] });
      } else if (match[6] !== undefined) {
        // $...$
        result.push({ type: 'inline-math', content: match[6] });
      } else if (match[8] !== undefined) {
        // \(...\)
        result.push({ type: 'inline-math', content: match[8] });
      }

      lastIndex = matchIndex + match[0].length;
    }

    // Push remaining text
    if (lastIndex < text.length) {
      result.push({
        type: 'text',
        content: text.slice(lastIndex),
      });
    }

    return result;
  }, [text]);

  if (!text) return null;

  return (
    <span className={`inline leading-relaxed ${className}`}>
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          return <React.Fragment key={idx}>{seg.content}</React.Fragment>;
        }

        try {
          const isBlock = seg.type === 'block-math';
          const html = katex.renderToString(seg.content.trim(), {
            displayMode: isBlock,
            throwOnError: false,
            output: 'htmlAndMathml',
          });

          return (
            <span
              key={idx}
              className={`inline-block align-baseline mx-0.5 select-text ${
                isBlock ? 'block my-2 text-center overflow-x-auto py-1' : ''
              }`}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch (e) {
          console.warn('MathText KaTeX parse error:', e);
          return (
            <span key={idx} className="font-mono text-cyan-400">
              ${seg.content}$
            </span>
          );
        }
      })}
    </span>
  );
};
