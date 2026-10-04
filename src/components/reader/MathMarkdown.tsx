import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { rehypeSupSub } from './rehype-supsub';
import 'katex/dist/katex.min.css';

/**
 * KaTeX-enabled markdown (101 pages, and any block that carries $$…$$). Loaded lazily. Single-dollar inline maths is
 * off: this pack is full of dollar amounts ("$5.5 million and … $4,500,000"), which must stay prose.
 */
export default function MathMarkdown({ md, components, className }: { md: string; components?: Components; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: false }]]} rehypePlugins={[rehypeSupSub, [rehypeKatex, { output: 'html' }]]} components={components}>{md}</ReactMarkdown>
    </div>
  );
}
