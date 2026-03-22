import React, { useEffect, useRef } from 'react';
import {
  EditorView, keymap, lineNumbers,
  highlightActiveLine, drawSelection, WidgetType,
} from '@codemirror/view';
import { EditorState, Compartment, StateField, StateEffect } from '@codemirror/state';
import { Decoration } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import socket from '../socket';
import useGameStore from '../store/gameStore';

// ── Author highlight colors ────────────────────────────────────────────────
const AUTHOR_COLORS = {
  '#c0392b': { bg: 'rgba(192,57,43,0.12)',  border: '#c0392b' },
  '#2980b9': { bg: 'rgba(41,128,185,0.12)', border: '#2980b9' },
  '#27ae60': { bg: 'rgba(39,174,96,0.12)',  border: '#27ae60' },
  '#e67e22': { bg: 'rgba(230,126,34,0.12)', border: '#e67e22' },
  '#8e44ad': { bg: 'rgba(142,68,173,0.12)', border: '#8e44ad' },
};

// ── CodeMirror effect to update author decorations ─────────────────────────
const setAuthorDecorations = StateEffect.define();

const authorField = StateField.define({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setAuthorDecorations)) {
        deco = effect.value;
      }
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

function buildAuthorDecorations(view, lineAuthors) {
  const decorations = [];
  const doc = view.state.doc;

  Object.entries(lineAuthors).forEach(([lineIndexStr, author]) => {
    const lineIndex = parseInt(lineIndexStr, 10);
    const lineNo    = lineIndex + 1; // CodeMirror is 1-indexed

    if (lineNo < 1 || lineNo > doc.lines) return;

    const colors = AUTHOR_COLORS[author?.color];
    if (!colors) return;

    const line = doc.line(lineNo);

    decorations.push(
      Decoration.line({
        attributes: {
          style: `background: ${colors.bg}; border-left: 3px solid ${colors.border};`,
          title: `Last edited by ${author.playerName || author.colorName || 'unknown'}`,
        },
      }).range(line.from)
    );
  });

  // Must be sorted by position
  decorations.sort((a, b) => a.from - b.from);

  return Decoration.set(decorations, true);
}

// ── Theme ──────────────────────────────────────────────────────────────────
const pixelTheme = EditorView.theme({
  '&': {
    fontSize: '15px',
    fontFamily: "'VT323', monospace",
    height: '100%',
    background: '#1a2030',
  },
  '.cm-content': {
    fontFamily: "'VT323', monospace",
    fontSize: '15px',
    lineHeight: '1.7',
    caretColor: '#ffffff',
    padding: '8px 0',
  },
  '.cm-line':               { padding: '0 8px 0 4px' },
  '.cm-gutters': {
    background: '#141824',
    borderRight: '2px solid #2a3a4a',
    color: '#556',
    fontFamily: "'VT323', monospace",
    fontSize: '14px',
  },
  '.cm-gutter':             { minWidth: '36px' },
  '.cm-activeLineGutter':   { background: '#1e2840' },
  '.cm-activeLine':         { background: '#ffffff06' },
  '.cm-selectionBackground':{ background: '#ffffff20' },
}, { dark: true });

function stripHtml(str) {
  return String(str || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// ── Remote cursor widget ────────────────────────────────────────────────
class CursorWidget extends WidgetType {
  constructor(color, name) {
    super();
    this.color = color;
    this.name  = name;
  }
  toDOM() {
    const wrap = document.createElement('span');
    wrap.style.cssText = `
      position: relative;
      display: inline-block;
      pointer-events: none;
    `;
    // The 1px caret line
    const caret = document.createElement('span');
    caret.style.cssText = `
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 2px;
      background: ${this.color};
      animation: cursorBlink 1s step-end infinite;
    `;
    // The floating name chip above
    const label = document.createElement('span');
    label.textContent = this.name;
    label.style.cssText = `
      position: absolute;
      bottom: 100%;
      left: 0;
      background: ${this.color};
      color: #fff;
      font-size: 10px;
      font-family: 'VT323', monospace;
      padding: 1px 4px;
      white-space: nowrap;
      pointer-events: none;
      border-radius: 2px;
      line-height: 1.3;
    `;
    wrap.appendChild(caret);
    wrap.appendChild(label);
    return wrap;
  }
  ignoreEvent() { return true; }
  eq(other) { return other.color === this.color && other.name === this.name; }
}

// Inject the blink keyframe once
if (!document.getElementById('cursor-blink-style')) {
  const s = document.createElement('style');
  s.id = 'cursor-blink-style';
  s.textContent = `@keyframes cursorBlink{0%,100%{opacity:1}50%{opacity:0}}`;
  document.head.appendChild(s);
}

function buildRemoteCursorDecorations(view, remoteCursors) {
  const decs = [];
  for (const cur of remoteCursors) {
    const lineNo = (cur.lineIndex ?? 0) + 1;
    if (lineNo < 1 || lineNo > view.state.doc.lines) continue;
    const line = view.state.doc.line(lineNo);
    const col  = Math.min(cur.col ?? 0, line.length);
    const pos  = line.from + col;
    decs.push(
      Decoration.widget({
        widget: new CursorWidget(cur.color, cur.colorName),
        side: 1,
      }).range(pos)
    );
  }
  decs.sort((a, b) => a.from - b.from);
  return Decoration.set(decs, true);
}

// StateEffect + StateField for remote cursors
const setRemoteCursorDecos = StateEffect.define();
const remoteCursorField = StateField.define({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setRemoteCursorDecos)) deco = e.value;
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const editableCompartment = new Compartment();
const langCompartment     = new Compartment();

export default function CodeEditor({ frozen = false }) {
  const codeLines     = useGameStore((s) => s.codeLines);
  const language      = useGameStore((s) => s.gameLanguage);
  const lineAuthors   = useGameStore((s) => s.lineAuthors);
  const remoteCursors = useGameStore((s) => s.remoteCursors);
  const updateLine    = useGameStore((s) => s.updateCodeLine);
  const clearEdited   = useGameStore((s) => s.clearEditedLines);

  const editorRef         = useRef(null);
  const viewRef           = useRef(null);
  const debounceRef       = useRef(null);
  const cursorDebounceRef = useRef(null);
  const autoTestRef       = useRef(null);
  const isRemote          = useRef(false);
  const pendingChanges    = useRef(new Set()); // accumulates changed line indices between debounce intervals

  const initialDoc = codeLines.map(stripHtml).join('\n');

  // ── Create editor on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    const lang = language === 'javascript' ? javascript() : python();

    const state = EditorState.create({
      doc: initialDoc,
      extensions: [
        lineNumbers(),
        history(),
        highlightActiveLine(),
        drawSelection(),
        oneDark,
        pixelTheme,
        authorField,
        remoteCursorField,
        langCompartment.of(lang),
        editableCompartment.of(EditorState.readOnly.of(frozen)),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged || isRemote.current) return;

          // ── Collect ALL lines touched by this change ─────────────────
          // iterChangedRanges fires once per change group (e.g. a paste
          // is one big range). We walk every line inside [fromB, toB] so
          // multi-line paste / undo / redo all sync correctly.
          update.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
            const startLineNo = update.state.doc.lineAt(fromB).number;
            const endLineNo   = update.state.doc.lineAt(toB).number;
            for (let n = startLineNo; n <= endLineNo; n++) {
              const lineContent = update.state.doc.line(n).text;
              updateLine(n - 1, lineContent);      // update local store immediately
              pendingChanges.current.add(n - 1);   // queue for socket emit
            }
          });

          // ── Debounced socket emit ──────────────────────────────────────
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            const view = viewRef.current;
            if (!view) return;
            // Read current content from the live view (handles rapid typing)
            pendingChanges.current.forEach((lineNo) => {
              if (lineNo < view.state.doc.lines) {
                const content = view.state.doc.line(lineNo + 1).text;
                socket.emit('code_change', { lineIndex: lineNo, content });
              }
            });
            pendingChanges.current.clear();
          }, 120);

          // ── Auto-run tests ─────────────────────────────────────────────
          clearTimeout(autoTestRef.current);
          autoTestRef.current = setTimeout(() => {
            socket.emit('run_tests');
            clearEdited();
          }, 1800);
        }),

        // ── Cursor / selection change → emit cursor_move ─────────────────
        EditorView.updateListener.of((update) => {
          if (!update.selectionSet || isRemote.current) return;
          clearTimeout(cursorDebounceRef.current);
          cursorDebounceRef.current = setTimeout(() => {
            const view = viewRef.current;
            if (!view) return;
            const head  = view.state.selection.main.head;
            const line  = view.state.doc.lineAt(head);
            socket.emit('cursor_move', {
              lineIndex: line.number - 1,
              col:       head - line.from,
            });
          }, 50);
        }),
      ],
    });

    viewRef.current = new EditorView({ state, parent: editorRef.current });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, []);

  // ── Update frozen state ────────────────────────────────────────────────
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: editableCompartment.reconfigure(EditorState.readOnly.of(frozen)),
    });
  }, [frozen]);

  // ── Apply remote code changes ──────────────────────────────────────────
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentDoc  = view.state.doc.toString();
    const newDoc      = codeLines.map(stripHtml).join('\n');
    if (newDoc === currentDoc) return;

    isRemote.current = true;
    const cursorPos = Math.min(view.state.selection.main.head, newDoc.length);
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: newDoc },
      selection: { anchor: cursorPos },
      scrollIntoView: false,
    });
    isRemote.current = false;
  }, [codeLines]);

  // ── Apply author highlight decorations ─────────────────────────────────
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const decorations = buildAuthorDecorations(view, lineAuthors);
    view.dispatch({
      effects: setAuthorDecorations.of(decorations),
    });
  }, [lineAuthors]);

  // ── Render remote cursor decorations ────────────────────────────────
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const decs = buildRemoteCursorDecorations(view, remoteCursors);
    view.dispatch({ effects: setRemoteCursorDecos.of(decs) });
  }, [remoteCursors]);

  // ── Update language ────────────────────────────────────────────────────
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const lang = language === 'javascript' ? javascript() : python();
    view.dispatch({
      effects: langCompartment.reconfigure(lang),
    });
  }, [language]);

  return (
    <div
      ref={editorRef}
      style={{
        flex: 1,
        minHeight: 0,
        height: '100%',
        overflow: 'hidden',
        border: '3px solid #4a7aaa',
      }}
    />
  );
}