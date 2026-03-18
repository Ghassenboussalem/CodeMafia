// client/src/components/CodeEditor.jsx

import React, { useRef, useCallback, useEffect } from 'react';
import socket from '../socket';
import useGameStore from '../store/gameStore';

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlight(line) {
  if (!line && line !== 0) return '\u00a0';
  const str = String(line);
  if (/^\s*#\s*TODO|^\s*\/\/\s*TODO/.test(str))
    return `<span class="c-todo">${escHtml(str)}</span>`;
  if (/^\s*#/.test(str) || /^\s*\/\//.test(str))
    return `<span class="c-cm">${escHtml(str)}</span>`;
  return escHtml(str)
    .replace(/\b(class|def|return|if|else|elif|for|while|pass|import|from|and|or|not|in|is|None|True|False|const|let|var|function|new|this|typeof|instanceof|async|await|try|catch|throw|export|default)\b/g,
      '<span class="c-kw">$1</span>')
    .replace(/\b([A-Z][A-Za-z0-9_]*)\b/g, '<span class="c-cls">$1</span>')
    .replace(/\b(self)\b/g, '<span class="c-self">self</span>')
    .replace(/"([^"]*)"/g, '<span class="c-str">"$1"</span>')
    .replace(/'([^']*)'/g, "<span class=\"c-str\">'$1'</span>")
    .replace(/`([^`]*)`/g, '<span class="c-str">`$1`</span>')
    .replace(/\b(\d+)\b/g, '<span class="c-num">$1</span>')
    .replace(/\b([a-z_][a-z0-9_]*)\s*(?=\()/g, '<span class="c-fn">$1</span>');
}

export default function CodeEditor({ frozen = false }) {
  const codeLines       = useGameStore((s) => s.codeLines);
  const updateLine      = useGameStore((s) => s.updateCodeLine);
  const markLineEdited  = useGameStore((s) => s.markLineEdited);
  const clearEditedLines = useGameStore((s) => s.clearEditedLines);

  const debounceMap   = useRef({});
  const autoTestTimer = useRef(null);
  const lineRefs      = useRef([]);
  const prevLines     = useRef([]);

  // Apply remote changes without clobbering focused line
  useEffect(() => {
    codeLines.forEach((line, idx) => {
      if (line !== prevLines.current[idx]) {
        const el = lineRefs.current[idx];
        if (el && document.activeElement !== el) {
          el.innerHTML = highlight(line);
        }
      }
    });
    prevLines.current = [...codeLines];
  }, [codeLines]);

  const handleInput = useCallback((e, idx) => {
    const content = e.currentTarget.innerText;
    updateLine(idx, content);
    markLineEdited(idx);

    // Debounce the socket emit per line (100ms)
    clearTimeout(debounceMap.current[idx]);
    debounceMap.current[idx] = setTimeout(() => {
      socket.emit('code_change', { lineIndex: idx, content });
    }, 100);

    // Auto-run tests 1.5 seconds after the user stops typing
    // This gives them time to finish a fix before tests fire
    clearTimeout(autoTestTimer.current);
    autoTestTimer.current = setTimeout(() => {
      socket.emit('run_tests');
      clearEditedLines();
    }, 1500);
  }, [updateLine, markLineEdited, clearEditedLines]);

  return (
    <div className="game-editor-wrap">
      <div className="game-editor">
        {codeLines.map((line, idx) => (
          <div key={idx} className="code-line">
            <span className="code-linenum">{idx + 1}</span>
            <span
              ref={(el) => (lineRefs.current[idx] = el)}
              className="code-content"
              contentEditable={!frozen}
              suppressContentEditableWarning
              dangerouslySetInnerHTML={{ __html: highlight(line) }}
              onInput={(e) => !frozen && handleInput(e, idx)}
              spellCheck={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}