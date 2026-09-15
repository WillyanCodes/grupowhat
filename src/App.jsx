import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase, isAdmin, ADMIN_EMAIL } from './supabase.js';

const THEMES = [
  { id: 'green', label: 'Verde', bg: '#00a884' },
  { id: 'blue', label: 'Azul', bg: '#2c6bed' },
  { id: 'red', label: 'Vermelho', bg: '#e73c3c' },
  { id: 'purple', label: 'Roxo', bg: '#a88bff' },
  { id: 'pink', label: 'Rosa', bg: '#ff8bd0' },
  { id: 'orange', label: 'Laranja', bg: '#ff9e4d' },
];

const fmtTime = (t) => {
  if (!t) return '';
  const d = new Date(t);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => sub?.unsubscribe();
  }, []);

  if (loading) return <div className="auth"><Loading /></div>;
  if (!session) return <AuthScreen />;
  return <Main user={session.user} profile={profile} setProfile={setProfile} />;
}

function Loading() { return <div className="auth-card sub">Carregando…</div>; }

/* ============ AUTH ============ */
function AuthScreen() {
  const [mode, setMode] = useState('login'); // login | register
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const doEmail = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email, password: pass,
          options: { data: { display_name: name || email.split('@')[0] } },
        });
        if (error) throw error;
        if (!data.session) {
          setErr('Conta criada! Confira o link de confirmação no seu email para entrar. ✉️');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
      }
    } catch (x) {
      setErr(cleanErr(x.message));
    } finally { setBusy(false); }
  };

  const doGoogle = async () => {
    setErr('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setErr(cleanErr(error.message));
  };

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={doEmail}>
        <h1>💬 GrupoWhat</h1>
        <div className="sub">Entre para conversar nos grupos</div>
        <button type="button" className="btn google" onClick={doGoogle}>
          <GLogo /> Continuar com Google
        </button>
        <div className="sep">ou</div>
        {mode === 'register' && (
          <input className="input" placeholder="Seu nome (escolha à vontade)"
            value={name} onChange={(e) => setName(e.target.value)} />
        )}
        <input className="input" type="email" placeholder="Seu email"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Sua senha"
          value={pass} onChange={(e) => setPass(e.target.value)} required minLength={6} />
        {mode === 'register' && (
          <div className="sub" style={{ marginBottom: 8 }}>
            Senha de acesso do GrupoWhat (não é a senha do Gmail).
          </div>
        )}
        <div className="err">{err}</div>
        <button type="submit" className="btn" disabled={busy}>
          {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>
        <button type="button" className="btn ghost" style={{ marginTop: 10 }}
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}>
          {mode === 'login' ? 'Criar conta com Google' : 'Já tenho conta — entrar'}
        </button>
        <div className="sub" style={{ marginTop: 10 }}>
          {mode === 'login'
            ? 'Sem conta? Toque em “Criar conta com Google” acima.'
            : 'Criando conta com Google? Use o botão verde acima.'}
        </div>
      </form>
    </div>
  );
}

const cleanErr = (m) =>
  (m || '').includes('Invalid login') ? 'Email ou senha incorretos.'
  : (m || '').includes('already') ? 'Este email já está cadastrado. Faça login.'
  : (m || '').replace(/^.*?\b(?:API|error)\b\s*:\s*/i, '');

function GLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

/* ============ MAIN ============ */
function Main({ user, profile, setProfile }) {
  const admin = isAdmin(user.email);
  const [groups, setGroups] = useState([]);
  const [active, setActive] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [mobileView, setMobileView] = useState('list'); // list | chat

  useEffect(() => {
    // carrega nome de exibição
    const dn = user.user_metadata?.display_name;
    if (dn && !profile) setProfile(dn);
    loadGroups();
  }, []);

  const loadGroups = async () => {
    const { data: rows } = await supabase
      .from('group_members')
      .select('group_id, groups!group_id(name, id, code, owner_id, locked)');
    // fallback robusto para diferentes formatos de aninhamento
    const list = [];
    (rows || []).forEach((r) => {
      const g = r.groups || r.group || r;
      if (g && g.id) list.push(g);
    });
    // ordena por nome
    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    setGroups(list);
  };

  const joinGroup = async (code) => {
    const num = parseInt(code, 10);
    if (!Number.isInteger(num)) return { err: 'Número inválido.' };
    const { data: gid, error } = await supabase.rpc('join_by_code', { p_code: num });
    if (error) return { err: 'Erro. Confira o número.' };
    if (!gid) return { err: 'Grupo não encontrado. Confira o número?' };
    await reload();
    return {};
  };

  const createGroupFn = async (name) => {
    const code = 1000 + Math.floor(Math.random() * 9000); // 4 dígitos
    const { data: g, error } = await supabase
      .from('groups').insert({ name, code, owner_id: user.id })
      .select().single();
    if (error) return { err: error.message };
    await supabase.rpc('join_by_code', { p_code: code }); // entra o criador
    await reload();
    return {};
  };

  const reload = async () => { await loadGroups(); };

  const leaveOrDelete = async (gid) => {
    await supabase.from('group_members').delete().eq('group_id', gid).eq('user_id', user.id);
    if (admin) {
      const g = groups.find((x) => x.id === gid);
      if (g?.owner_id === user.id) {
        await supabase.from('messages').delete().eq('group_id', gid);
        await supabase.from('groups').delete().eq('id', gid);
      }
    }
    await reload();
    if (active?.id === gid) { setActive(null); setMobileView('list'); }
  };

  return (
    <div className="app">
      <div className={`layout ${mobileView === 'chat' ? 'mobile-chat' : 'mobile-list'}`}>
        <Sidebar
          groups={groups} active={active} setActive={(g) => { setActive(g); setMobileView('chat'); }}
          admin={admin} user={user}
          onNew={() => setShowCreate(true)}
          onJoin={() => setShowJoin(true)}
          onSettings={() => setShowSettings(true)}
        />
        <div className="chat-main">
          {active
            ? <ChatView key={active.id} group={active} user={user} admin={admin}
                onBack={admin ? undefined : () => setMobileView('list')}
                onMembers={() => setShowMembers(true)}
                onLeft={async () => { await leaveOrDelete(active.id); }} />
            : <EmptyChat />}
        </div>
      </div>

      {showCreate && <CreateModal admin={admin} onClose={() => setShowCreate(false)} onCreate={createGroupFn} />}
      {showJoin && <JoinModal onClose={() => setShowJoin(false)} onJoin={joinGroup} />}
      {showSettings && <SettingsModal user={user} profile={profile} setProfile={setProfile}
        onClose={() => setShowSettings(false)} />}
      {showMembers && active &&
        <MembersModal group={active} user={user} admin={admin} onClose={() => setShowMembers(false)}
          onChanged={reload} />}
    </div>
  );
}

function EmptyChat() {
  return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
    Selecione um grupo para começar
  </div>;
}

/* ============ SIDEBAR ============ */
function Sidebar({ groups, active, setActive, admin, user, onNew, onJoin, onSettings }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const initial = (user.email || '?')[0].toUpperCase();
  return (
    <div className="sidebar">
      <header>
        <div className="logo">💬 GrupoWhat</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{admin ? '👑' : ''}</span>
          <div className="avatar" onClick={() => setMenuOpen((v) => !v)}>{initial}</div>
          {menuOpen && (
            <div style={{ position: 'absolute', top: 42, right: 0, background: 'var(--panel)',
              border: '1px solid var(--border)', borderRadius: 8, padding: 6, minWidth: 180, zIndex: 50 }}>
              <div style={{ padding: '8px 10px', fontSize: 13, color: 'var(--muted)' }}>{user.email}</div>
              <button className="btn ghost" style={{ margin: 4, width: 'calc(100% - 8px)' }}
                onClick={() => { setMenuOpen(false); onSettings(); }}>⚙️ Aparência</button>
              <button className="btn ghost" style={{ margin: 4, width: 'calc(100% - 8px)' }}
                onClick={async () => { setMenuOpen(false); await supabase.auth.signOut(); }}>🚪 Sair</button>
            </div>
          )}
        </div>
      </header>
      <div style={{ padding: '8px 14px', display: 'flex', gap: 8 }}>
        <button className="btn" onClick={onJoin}>🔢 Entrar com nº do grupo</button>
        <button className="btn ghost" onClick={onNew}>➕ Novo</button>
      </div>
      <div className="groups">
        {groups.length === 0 && <div style={{ padding: 20, color: 'var(--muted)', textAlign: 'center' }}>
          Você ainda não está em nenhum grupo.</div>}
        {groups.map((g) => (
          <div key={g.id} className={`group-item ${active?.id === g.id ? 'active' : ''}`}
            onClick={() => setActive(g)}>
            <div className="avatar">{g.name[0]?.toUpperCase()}</div>
            <div className="col">
              <div className="gp-name">{g.name}</div>
              <div className="gp-meta">{g.owner_id === user.id ? '👑 Sua criação' : 'Grupo'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ CHAT ============ */
function ChatView({ group, user, admin, onBack, onMembers, onLeft }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [room, setRoom] = useState('idle'); // idle | calling | inCall
  const [callKind, setCallKind] = useState(null);
  const messagesEnd = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    const sub = supabase
      .channel(`msg:${group.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages',
        filter: `group_id=eq.${group.id}` }, (payload) => {
        setMessages((m) => [...m, payload.new]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages',
        filter: `group_id=eq.${group.id}` }, () => fetchMessages())
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [group.id]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages').select('*').eq('group_id', group.id).order('created_at', { ascending: true }).limit(500);
    setMessages(data || []);
  };

  const send = async (e) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText('');
    await supabase.from('messages').insert({ group_id: group.id, user_id: user.id, content: body, kind: 'text' });
  };

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const kind = f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : f.type.startsWith('audio/') ? 'audio' : 'file';
    toast('Enviando mídia…');
    const path = `${group.id}/${Date.now()}_${f.name.replace(/[^\w.\-]/g, '_')}`;
    const { error } = await supabase.storage.from('media').upload(path, f);
    if (error) { toast('Falha no upload'); return; }
    const url = supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
    await supabase.from('messages').insert({ group_id: group.id, user_id: user.id, kind, media_url: url });
    toast('Enviado ✔');
  };

  const doCall = (kind) => { setCallKind(kind); setRoom('calling'); };

  return (
    <>
      <div className="chat-header">
        {onBack && <button className="icon-btn" onClick={onBack}>←</button>}
        <div className="avatar">{group.name[0]?.toUpperCase()}</div>
        <div className="gp-info" onClick={onMembers}>
          <h3>{group.name}</h3>
          <div className="cnt">👑 {group.numberLabel || 'Grupo'} · toque p/ ver membros</div>
        </div>
        <button className="icon-btn" title="Chamada de voz" onClick={() => doCall('voice')}>📞</button>
        <button className="icon-btn" title="Chamada de vídeo" onClick={() => doCall('video')}>📹</button>
        <button className="icon-btn" title="Sair do grupo" onClick={() => {
          if (confirm('Sair deste grupo?')) onLeft();
        }}>🚪</button>
      </div>

      <div className="messages">
        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.user_id === user.id ? 'out' : 'in'}`}>
            {m.user_id !== user.id && <div className="author print">{m.author_name || 'Alguém'}</div>}
            {m.kind === 'image' && <span className="media-space"><img src={m.media_url} alt="" onClick={() => window.open(m.media_url, '_blank')} /></span>}
            {m.kind === 'video' && <span className="media-space"><video src={m.media_url} controls /></span>}
            {m.kind === 'audio' && <span className="media-space"><audio src={m.media_url} controls /></span>}
            {m.kind === 'file' && <div><a href={m.media_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent2)' }}>📎 {m.media_name || 'Arquivo'}</a></div>}
            {m.content && <div className="body">{m.content}</div>}
            <span className="time">{fmtTime(m.created_at)}</span>
          </div>
        ))}
        <div ref={messagesEnd} />
      </div>

      {typing && <div className="typing">alguém digitando…</div>}

      <form className="inputbar" onSubmit={send}>
        <input ref={fileRef} type="file" hidden accept="image/*,video/*,audio/*" onChange={onFile} />
        <button type="button" className="atc" onClick={() => fileRef.current?.click()}>📎</button>
        <textarea rows={1} placeholder="Mensagem"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setTyping(true);
            clearTimeout(window.__t);
            window.__t = setTimeout(() => setTyping(false), 1500);
          }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <button type="submit" className="snd">➤</button>
      </form>

      {room !== 'idle' && (
        <CallOverlay kind={callKind} group={group} room={room} setRoom={setRoom} />
      )}
    </>
  );
}

/* ============ CHAMADAS (WebRTC) ============ */
function CallOverlay({ kind, group, room, setRoom }) {
  const peerRef = useRef(null);
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const [remoteOn, setRemoteOn] = useState(false);
  const [status, setStatus] = useState('Chamando…');

  // Precisa de um servidor de sinalização para chamadas entre dispositivos.
  // Supabase Realtime envia mensagens broadcast para o canal do grupo.
  useEffect(() => {
    if (room === 'idle') return;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peerRef.current = pc;

    if (kind === 'video') {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((s) => {
          localRef.current = s;
          s.getTracks().forEach((t) => pc.addTrack(t, s));
          const el = document.getElementById('local-media');
          if (el) { el.srcObject = s; }
        }).catch(() => setStatus('Sem câmera — modo só voz'));
    } else {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((s) => {
          localRef.current = s;
          s.getTracks().forEach((t) => pc.addTrack(t, s));
        }).catch(() => {});
    }

    const ch = supabase.channel(`call:${group.id}`);
    ch.on('broadcast', { event: 'signal' }, async ({ payload }) => {
      await pc.setRemoteDescription(payload.desc);
      if (payload.desc.type === 'offer') {
        const ans = await pc.createAnswer();
        await pc.setLocalDescription(ans);
        ch.send({ type: 'broadcast', event: 'signal', payload: { desc: ans, from: supabase.auth.getUser() } });
        setStatus('Conectado');
      } else { setStatus('Conectado'); }
    }).subscribe();

    const makeOffer = async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      ch.send({ type: 'broadcast', event: 'signal', payload: { desc: offer } });
      setStatus('Chamando…');
    };
    // pequeno atraso para se inscrever antes de enviar oferta
    setTimeout(makeOffer, 500);

    pc.ontrack = (ev) => {
      const el = document.getElementById('remote-media');
      if (el) { el.srcObject = ev.streams[0]; setRemoteOn(true); }
    };

    return () => {
      pc.close();
      ch.unsubscribe();
      localRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [room]);

  const endCall = () => {
    peerRef.current?.close();
    localRef.current?.getTracks().forEach((t) => t.stop());
    setRoom('idle');
  };

  if (room === 'calling') {
    return (
      <div className="call-overlay">
        <div className="avatar">{group.name[0]?.toUpperCase()}</div>
        <h2>{group.name}</h2>
        <div className="status">{status} — {kind === 'voice' ? '📞 voz' : '📹 vídeo'}</div>
        <div className="callbar">
          <button className="call-btn red" onClick={endCall}>✕</button>
        </div>
      </div>
    );
  }
  return null;
}

/* ============ MODAIS ============ */
function CreateModal({ admin, onClose, onCreate }) {
  const [name, setName] = useState('');
  if (!admin) {
    return (
      <div className="modal-back" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h3>🔒 Acesso restrito</h3>
          <div className="muted">Apenas Willyan pode criar grupos.<br/>Você entrou como visitante — peça o número de um grupo para entrar.</div>
          <div className="actions"><button className="btn" onClick={onClose}>Entendi</button></div>
        </div>
      </div>
    );
  }
  return (
    <div className="modal-back" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        const r = await onCreate(name.trim());
        if (!r?.err) onClose();
      }}>
        <h3>➕ Criar grupo</h3>
        <div className="muted">Gere um nome. Um número de 4 dígitos será sorteado — <b>só você</b> verá e poderá compartilhar.</div>
        <input className="input" placeholder="Nome do grupo" value={name}
          onChange={(e) => setName(e.target.value)} required />
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn">Criar</button>
        </div>
      </form>
    </div>
  );
}

function JoinModal({ onClose, onJoin }) {
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  return (
    <div className="modal-back" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={async (e) => {
        e.preventDefault();
        const r = await onJoin(code);
        if (r?.err) setErr(r.err); else onClose();
      }}>
        <h3>🔢 Entrar num grupo</h3>
        <div className="muted">Digite o número de 4 dígitos que o criador do grupo compartilhou com você.</div>
        <input className="input" placeholder="Ex.: 4712" value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))} required />
        <div className="err">{err}</div>
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn">Entrar</button>
        </div>
      </form>
    </div>
  );
}

function MembersModal({ group, user, admin, onClose, onChanged }) {
  const [members, setMembers] = useState([]);
  const [lock, setLock] = useState(!!group.locked);
  useEffect(() => {
    load();
  }, []);
  const load = async () => {
    const { data } = await supabase.from('group_members')
      .select('user_id').eq('group_id', group.id);
    setMembers(data || []);
  };
  const isOwner = admin && group.owner_id === user.id;
  const kick = async (uid) => {
    if (uid === user.id) return;
    await supabase.from('group_members').delete()
      .eq('group_id', group.id).eq('user_id', uid);
    await load();
  };
  const toggleLock = async () => {
    const nl = !lock;
    setLock(nl);
    await supabase.from('groups').update({ locked: nl }).eq('id', group.id);
  };
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>👥 Membros — {group.name}</h3>
        <div className="muted">
          {isOwner && <>Você é o 👑 criador. Pode expulsar pessoas e travar o grupo.<br/></>}
          Código do grupo: <b>{group.code}</b> → {isOwner ? 'Compartilhe só com quem deve entrar.' : 'Somente o criador vê o código aqui.'}
        </div>
        {isOwner && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={lock} onChange={toggleLock} />
              Somente o criador pode enviar mensagem
            </label>
          </div>
        )}
        <div style={{ maxHeight: 260, overflowY: 'auto' }}>
          {members.map((m) => (
            <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="avatar">{m.user_id === user.id ? 'Você' : '👤'}</div>
              <span style={{ flex: 1, fontSize: 14 }}>
                {m.user_id === user.id ? 'Você' : (m.user_id === group.owner_id ? '👑 Criador' : 'Membro')}
              </span>
              {isOwner && m.user_id !== user.id && (
                <button className="btn ghost" style={{ margin: 0, padding: '6px 10px', color: 'var(--danger)' }}
                  onClick={() => kick(m.user_id)}>Excluir</button>
              )}
            </div>
          ))}
        </div>
        <div className="actions"><button className="btn" onClick={onClose}>Fechar</button></div>
      </div>
    </div>
  );
}

function SettingsModal({ user, profile, setProfile, onClose }) {
  const [theme, setTheme] = useState(localStorage.getItem('gw_theme') || 'green');
  const [mode, setMode] = useState(localStorage.getItem('gw_mode') || 'dark');
  const [name, setName] = useState(profile || '');

  const apply = (th, md) => {
    document.body.classList.remove('light', ...THEMES.map((t) => 'theme-' + t.id));
    document.body.classList.add(md === 'light' ? 'light' : '', 'theme-' + th);
    localStorage.setItem('gw_theme', th);
    localStorage.setItem('gw_mode', md);
  };

  useEffect(() => { apply(theme, mode); }, []);

  const saveName = async () => {
    if (name.trim()) {
      await supabase.auth.updateUser({ data: { display_name: name.trim() } });
      setProfile(name.trim());
    }
    onClose();
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>⚙️ Aparência</h3>
        <div className="muted">Cor de destaque</div>
        <div className="theme-grid">
          {THEMES.map((t) => (
            <button key={t.id} className={`theme-swatch theme-${t.id} ${theme === t.id ? 'active' : ''}`}
              style={{ background: t.bg }} onClick={() => { setTheme(t.id); apply(t.id, mode); }}>
              <span className="dot" />{t.label}
            </button>
          ))}
        </div>
        <div className="muted" style={{ marginTop: 8 }}>Modo</div>
        <div className="mode-row">
          <button className={`btn ${mode === 'dark' ? '' : 'ghost'}`} onClick={() => { setMode('dark'); apply(theme, 'dark'); }}>🌙 Escuro</button>
          <button className={`btn ${mode === 'light' ? '' : 'ghost'}`} onClick={() => { setMode('light'); apply(theme, 'light'); }}>☀️ Claro</button>
        </div>
        <div className="muted" style={{ marginTop: 16 }}>Seu nome no app</div>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="actions">
          <button className="btn ghost" onClick={onClose}>Fechar</button>
          <button className="btn" onClick={saveName}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

function toast(msg) {
  let el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--panel2);color:var(--text);padding:10px 16px;border-radius:8px;z-index:300;font-size:14px;box-shadow:0 2px 10px rgba(0,0,0,.3)';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}