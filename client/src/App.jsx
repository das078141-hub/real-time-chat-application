import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io({ autoConnect: false });

function initials(name) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export default function App() {
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    const handleRoomState = (state) => {
      setRoom(state.room);
      setMembers(state.members);
      setMessages(state.messages);
      setError('');
    };
    const handleMembers = (nextMembers) => setMembers(nextMembers);
    const handleMessage = (message) => setMessages((current) => [...current, message]);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('room:state', handleRoomState);
    socket.on('room:members', handleMembers);
    socket.on('room:message', handleMessage);
    socket.connect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('room:state', handleRoomState);
      socket.off('room:members', handleMembers);
      socket.off('room:message', handleMessage);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function joinOrCreate(event, action) {
    event.preventDefault();
    setError('');
    const payload = {
      username: username.trim(),
      ...(action === 'create'
        ? { name: roomName.trim() }
        : { roomId: roomCode.trim().toUpperCase() }),
    };

    socket.emit(`room:${action}`, payload, (result) => {
      if (!result?.ok) setError(result?.error || 'Could not connect to that room.');
    });
  }

  function sendMessage(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    socket.emit('chat:send', { text }, (result) => {
      if (result?.ok) {
        setDraft('');
        setError('');
      } else {
        setError(result?.error || 'Your message could not be sent.');
      }
    });
  }

  function leaveRoom() {
    socket.emit('room:leave');
    setRoom(null);
    setMessages([]);
    setMembers([]);
    setDraft('');
    setError('');
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(room.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Could not copy the invite code. Please copy it manually.');
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Gather home">
          <span className="brand-mark">g</span>
          <span>gather<span className="brand-period">.</span></span>
        </a>
        <div className={`connection ${connected ? 'is-online' : ''}`}>
          <span className="connection-dot" />
          {connected ? 'Connected' : 'Connecting'}
        </div>
      </header>

      {!room ? (
        <section className="welcome-layout">
          <div className="welcome-copy">
            <div className="eyebrow"><span /> YOUR SPACE TO CONNECT</div>
            <h1>Good conversations<br />start <span>together.</span></h1>
            <p>Create a room for your people or join one with an invite code. No noise, just the conversation.</p>
            <div className="feature-list">
              <div><span className="feature-icon purple">✳</span><span><b>Instant by design</b><small>Messages arrive in real time</small></span></div>
              <div><span className="feature-icon peach">↗</span><span><b>Made for your group</b><small>Private rooms, shared with a code</small></span></div>
            </div>
          </div>

          <div className="entry-card">
            <div className="card-heading">
              <span className="card-icon">✦</span>
              <div><h2>Make it a gathering</h2><p>Pick a name and find your people.</p></div>
            </div>
            <label className="field-label" htmlFor="username">YOUR NAME</label>
            <input
              id="username"
              className="text-input"
              maxLength={24}
              placeholder="How should we call you?"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
            <form onSubmit={(event) => joinOrCreate(event, 'create')}>
              <label className="field-label" htmlFor="room-name">ROOM NAME</label>
              <div className="input-with-icon">
                <span>✳</span>
                <input
                  id="room-name"
                  className="text-input"
                  maxLength={40}
                  placeholder="e.g. Friday plans"
                  value={roomName}
                  onChange={(event) => setRoomName(event.target.value)}
                  required
                />
              </div>
              <button className="primary-button" disabled={!connected || !username.trim()}>
                Create a room <span>↗</span>
              </button>
            </form>

            <div className="divider"><span />OR JOIN WITH A CODE<span /></div>
            <form className="join-form" onSubmit={(event) => joinOrCreate(event, 'join')}>
              <input
                className="text-input code-input"
                aria-label="Room invite code"
                maxLength={6}
                placeholder="ENTER CODE"
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                required
              />
              <button className="join-button" disabled={!connected || !username.trim()}>Join</button>
            </form>
            {error && <p className="error-message" role="alert">{error}</p>}
            <p className="privacy-note"><span>♢</span> Your room stays yours. Share the code only with people you trust.</p>
          </div>
          <div className="decor decor-one" />
          <div className="decor decor-two" />
        </section>
      ) : (
        <section className="chat-layout">
          <aside className="room-sidebar">
            <button className="back-link" onClick={leaveRoom}>← <span>All rooms</span></button>
            <div className="room-identity">
              <div className="room-avatar">{initials(room.name)}</div>
              <div><h2>{room.name}</h2><p>Gathering space</p></div>
            </div>
            <button className="invite-card" onClick={copyInvite}>
              <span className="invite-icon">↗</span>
              <span><b>{copied ? 'Code copied!' : 'Invite people'}</b><small>Code: {room.id}</small></span>
              <span className="copy-glyph">{copied ? '✓' : '▢'}</span>
            </button>
            <div className="member-heading"><span>HERE TOGETHER</span><span>{members.length}</span></div>
            <div className="member-list">
              {members.map((member, index) => (
                <div className="member" key={`${member}-${index}`}>
                  <span className={`member-avatar avatar-${index % 4}`}>{initials(member)}</span>
                  <span>{member}{member === username.trim() ? ' (you)' : ''}</span>
                  <i />
                </div>
              ))}
            </div>
            <div className="sidebar-footer"><span className="brand-mark small">g</span> A little room for good things.</div>
          </aside>

          <div className="chat-main">
            <header className="chat-header">
              <div><span className="mobile-room-avatar">{initials(room.name)}</span><div><h1>{room.name}</h1><p>{members.length} {members.length === 1 ? 'person' : 'people'} in this room</p></div></div>
              <button className="mobile-invite" onClick={copyInvite}>{copied ? 'Copied!' : 'Invite ↗'}</button>
            </header>
            <div className="message-list">
              {messages.length === 0 ? (
                <div className="empty-chat"><span>✦</span><h2>It starts here.</h2><p>Say hello and get the conversation going.</p></div>
              ) : (
                messages.map((message, index) => (
                  <article className={`message ${message.username === username.trim() ? 'own-message' : ''}`} key={message.id}>
                    <span className={`message-avatar avatar-${index % 4}`}>{initials(message.username)}</span>
                    <div className="message-content">
                      <div className="message-meta"><b>{message.username}</b><time>{formatTime(message.timestamp)}</time></div>
                      <p>{message.text}</p>
                    </div>
                  </article>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            <form className="composer" onSubmit={sendMessage}>
              <input
                aria-label="Write a message"
                maxLength={1000}
                placeholder={`Message ${room.name}...`}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
              <span className="composer-hint">Press Enter to send</span>
              <button type="submit" disabled={!draft.trim()} aria-label="Send message">↑</button>
            </form>
            {error && <p className="chat-error" role="alert">{error}</p>}
          </div>
        </section>
      )}
    </main>
  );
}
