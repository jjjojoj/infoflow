/**
 * Simple Markdown → React nodes renderer.
 * Supports: ### h3, - bullet, numbered lists, paragraphs, blank lines.
 * No external dependencies.
 */
import React from 'react';

interface Props {
  content: string;
  className?: string;
}

function mdToNodes(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ### Heading
    const h3Match = line.match(/^###\s+(.+)/);
    if (h3Match) {
      nodes.push(
        <h4 key={key++} className="mt-3 mb-1.5 text-sm font-semibold text-[var(--color-text-primary)]">
          {h3Match[1]}
        </h4>
      );
      i++;
      continue;
    }

    const h2Match = line.match(/^##\s+(.+)/);
    if (h2Match) {
      nodes.push(
        <h3 key={key++} className="mt-3 mb-1.5 text-sm font-bold text-[var(--color-text-primary)]">
          {h2Match[1]}
        </h3>
      );
      i++;
      continue;
    }

    // - bullet list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      nodes.push(
        <ul key={key++} className="my-1.5 space-y-1">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      nodes.push(
        <ol key={key++} className="my-1.5 space-y-1">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              <span className="shrink-0 text-xs text-[var(--color-text-muted)]">{j + 1}.</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Blank line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Plain paragraph
    nodes.push(
      <p key={key++} className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
        {line}
      </p>
    );
    i++;
  }

  return nodes;
}

export default function MarkdownRenderer({ content, className }: Props) {
  if (!content) return null;
  return <div className={className}>{mdToNodes(content)}</div>;
}
