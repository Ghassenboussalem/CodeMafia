import React, { useRef, useEffect, useState } from 'react';
import socket from '../socket';
import useGameStore from '../store/gameStore';

const CHAT_DISABLED_SCREENS = ['assigning', 'role_reveal'];

export default function Chat({ mini = false }) {
  const chatLog  = useGameStore((s) => s.chatLog);
  const screen   = useGameStore((s) => s.screen);
  const [text, setText] = useState('');
  const bottomRef = useRef();

  const disabled = CHAT_DISABLED_SCREENS.includes(screen);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  function send() {
    if (disabled) return;
    const msg = text.trim();
    if (!msg) return;
    socket.emit('send_message', { text: msg });
    setText('');
  }

  const containerStyle = mini
    ? { display:'flex', flexDirection:'column', width:'260px', height:'460px', background:'#f5e6c0', border:'3px solid #8b7355', boxShadow:'4px 4px 0 #5a4a30' }
    : { display:'flex', flexDirection:'column', flex:1 };

  return (
    <div style={containerStyle}>
      <div className="chat-title">Chat</div>
      <div className="chat-messages">
        {chatLog.length === 0 ? (
          <div className="chat-empty">No messages<br />yet...</div>
        ) : (
          chatLog.map((m, i) => (
            <div key={i} className="chat-msg">
              <span className="chat-msg-name" style={{ color: m.color }}>{m.name}:</span>{' '}
              {m.text}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-row">
        <input
          className="chat-input"
          type="text"
          placeholder={disabled ? 'Chat disabled...' : 'Type...'}
          maxLength={200}
          value={text}
          disabled={disabled}
          style={{ opacity: disabled ? 0.5 : 1 }}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button
          className="chat-send"
          onClick={send}
          disabled={disabled}
          style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? 'default' : 'pointer' }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
