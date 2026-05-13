import React from 'react';

// Parses [[highlighted text::hover note]] syntax into annotated spans.
// Raw syntax is only visible in edit mode; display mode shows highlights with tooltip.
export function renderAnnotatedText(text: string): React.ReactNode {
  const pattern = /\[\[([^\]]+?)::([^\]]+?)\]\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={key++} className="annotation-mark">
        {match[1]}
        <span className="annotation-tooltip">{match[2]}</span>
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : text;
}
