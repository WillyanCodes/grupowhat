import { useEffect, useRef, useState } from 'react';
import { supabase, isAdmin } from './supabase.js';

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

const hashHue = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};

function Avatar({ name, size = 38 }) {
  const hue = hashHue(name || '?');
  return (
    <div className="avatar" style={{
      width: size, height: size, fontSize: size * 0.42,
      background: `linear-gradient(135deg, hsl(${hue},70%,45%), hsl(${(hue + 40) % 360},70%,35%))`,
    }}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

function toast(msg, isErr = false) {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:${isErr ? '#e73c3c' : 'var(--panel2)'};color:#fff;padding:12px 20px;border-radius:12px;z-index:400;font-size:14px;font-weight:600;box-shadow:0 6px 24px rgba(0,0,0,.45)`;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2600);
}

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
      if (!s) setProfile(null);
    });
    return () => sub?.unsubscribe();
  }, []);

  if (loading) return <div className="boot"><span className="spin" />Carregando…</div>;
  if (!session) return <AuthScreen />;
  return <Main key={session.user.id} user={session.user} profile={profile} setProfile={setProfile} />;
}

/* ============ AUTH ============ */
function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const doEmail = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email, password: pass,
          options: { data: { display_name: name.trim() || email.split('@')[0] } },
        });
        if (error) throw error;
        if (!data.session) setErr('Conta criada! Confira o link de confirmação no seu email para entrar. ✉️');
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
      <div className="auth-glow" />
      <form className="auth-card" onSubmit={doEmail}>
        <div className="auth-logo">💬</div>
        <h1>GrupoWhat</h1>
        <div className="sub">Seus grupos, do seu jeito</div>
        <button type="button" className="btn google" onClick={doGoogle}>
          <GLogo /> Continuar com Google
        </button>
        <div className="sep">ou</div>
        {mode === 'register' && (
          <input className="input" placeholder="Seu nome (escolha à vontade)"
            value={name} onChange={(e) => setName(e.target.value)} />
        )}
        <input className="input" type="email" placeholder="Seu email" value={email}
          onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Sua senha" value={pass}
          onChange={(e) => setPass(e.target.value)} required minLength={6} />
        {mode === 'register' && <div className="hint">Senha de acesso do GrupoWhat (não é a senha do Gmail).</div>}
        <div className="err">{err}</div>
        <button type="submit" className="btn" disabled={busy}>
          {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>
        <button type="button" className="btn ghost" style={{ marginTop: 10 }}
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}>
          {mode === 'login' ? 'Criar conta com email' : 'Já tenho conta — entrar'}
        </button>
      </form>
    </div>
  );
}

const cleanErr = (m) =>
  (m || '').includes('Invalid login') ? 'Email ou senha incorretos.'
  : (m || '').includes('already') ? 'Este email já esta cadastrado. Faça login.'
  : (m || '').replace(/^.*?\b(?:API|error)\b\s*:\s*/i, '');

const GLogo = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

/* ============ MAIN ============ */
function Main({ user, profile, setProfile }) {
  const admin = isAdmin(user.email);
  const [groups, setGroups] = useState([]);
  const [active, setActive] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [mobileView, setMobileView] = useState('list');

  useEffect(() => {
    const dn = user.user_metadata?.display_name;
    if (dn && !profile) setProfile(dn);
    loadGroups();
  }, []);

  const loadGroups = async () => {
    const { data: rows, error } = await supabase
      .from('group_members')
      .select('group_id, groups!group_id(name, id, code, owner_id, locked)');
    if (error) { console.error(error); toast('Erro ao carregar grupos', true); return; }
    const list = [];
    (rows || []).forEach((r) => {
      const g = r.groups || r.group || r;
      if (g && g.id) list.push(g);
    });
    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    setGroups(list);
  };

  const joinGroup = async (code) => {
    const num = parseInt(code, 10);
    if (!Number.isInteger(num)) return { err: 'Número inválido.' };
    const { data: gid, error } = await supabase.rpc('join_by_code', { p_code: num });
    if (error) return { err: 'Erro. Confira o número e tente de novo.' };
    if (!gid) return { err: 'Grupo não encontrado. Confira o número?' };
    toast('Você entrou no grupo! 🎉');
    await loadGroups();
    return {};
  };

  const createGroupFn = async (name) => {
    const code = 1000 + Math.floor(Math.random() * 9000);
    const { data: g, error } = await supabase
      .from('groups').insert({ name, code, owner_id: user.id })
      .select().single();
    if (error) { console.error(error); return { err: 'Falha ao criar. Tente de novo.' }; }
    await supabase.rpc('join_by_code', { p_code: code });
    await loadGroups();
    return { ok: true, group: g };
  };

  const leaveOrDelete = async (gid) => {
    await supabase.from('group_members').delete().eq('group_id', gid).eq('user_id', user.id);
    const g = groups.find((x) => x.id === gid);
    if (admin && g?.owner_id === user.id) {
      await supabase.from('messages').delete().eq('group_id', gid);
      await supabase.from('groups').delete().eq('id', gid);
    }
    await loadGroups();
    if (active?.id === gid) { setActive(null); setMobileView('list'); }
  };

  return (
    <div className="app">
      <div className={`layout ${mobileView === 'chat' ? 'mobile-chat' : 'mobile-list'}`}>
        <Sidebar
          groups={groups} active={active}
          setActive={(g) => { setActive(g); setMobileView('chat'); }}
          admin={admin} user={user} profile={profile}
          onNew={() => setShowCreate(true)}
          onJoin={() => setShowJoin(true)}
          onSettings={() => setShowSettings(true)}
        />
        <div className="chat-main">
          {active
            ? <ChatView key={active.id} group={active} user={user} admin={admin} profile={profile}
                onBack={() => setMobileView('list')}
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
        <MembersModal group={active} user={user} admin={admin} onClose={() => setShowMembers(false)} onChanged={loadGroups} />}
    </div>
  );
}

function EmptyChat() {
  return (
    <div className="empty">
      <div className="empty-icon">💬</div>
      <h2>GrupoWhat</h2>
      <p>Escolha um grupo na lista ao lado<br />ou entre num grupo pelo número.</p>
    </div>
  );
}

/* ============ SIDEBAR ============ */
function Sidebar({ groups, active, setActive, admin, user, profile, onNew, onJoin, onSettings }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="sidebar">
      <header>
        <div className="logo">💬 GrupoWhat</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
          {admin && <span className="crown">👑</span>}
          <div className="avatar-wrap" onClick={() => setMenuOpen((v) => !v)}>
            <Avatar name={profile || user.email} size={36} />
          </div>
          {menuOpen && (
            <div className="menu-pop">
              <div className="menu-email">{user.email}</div>
              <div className="menu-name">{(profile || 'Você') + (admin ? ' · 👑 Admin' : '')}</div>
              <button className="btn ghost" onClick={() => { setMenuOpen(false); onSettings(); }}>⚙️ Aparência</button>
              <button className="btn ghost" onClick={async () => { setMenuOpen(false); await supabase.auth.signOut(); }}>🚪 Sair</button>
            </div>
          )}
        </div>
      </header>
      <div className="side-actions">
        <button className="btn" onClick={onJoin}>🔢 Entrar com nº</button>
        <button className="btn ghost" onClick={onNew}>➕ Novo grupo</button>
      </div>
      <div className="groups">
        {groups.length === 0 && (
          <div className="side-empty">
            <span>Você ainda não está em nenhum grupo.</span>
            {!admin && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Peça o número de um grupo pra alguém entrar.</span>}
          </div>
        )}
        {groups.map((g) => (
          <div key={g.id} className={`group-item ${active?.id === g.id ? 'active' : ''}`}
            onClick={() => setActive(g)}>
            <Avatar name={g.name} />
            <div className="col">
              <div className="gp-name">{g.name}</div>
              <div className="gp-meta">{g.owner_id === user.id ? '👑 Seu grupo' : 'Grupo'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ CHAT ============ */
function ChatView({ group, user, profile, onBack, onMembers, onLeft }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [call, setCall] = useState(null);
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
    const { data, error } = await supabase
      .from('messages').select('*').eq('group_id', group.id)
      .order('created_at', { ascending: true }).limit(500);
    if (error) { console.error(error); toast('Erro ao carregar mensagens', true); }
    setMessages(data || []);
  };

  const send = async (e) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText('');
    const { error } = await supabase.from('messages').insert({
      group_id: group.id, user_id: user.id, content: body, kind: 'text',
      author_name: profile || user.email?.split('@')[0],
    });
    if (error) { console.error(error); toast('Erro ao enviar mensagem', true); }
  };

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const kind = f.type.startsWith('image/') ? 'image'
      : f.type.startsWith('video/') ? 'video'
      : f.type.startsWith('audio/') ? 'audio' : 'file';
    toast('Enviando mídia…');
    const path = `${group.id}/${Date.now()}_${f.name.replace(/[^\w.\-]/g, '_')}`;
    const { error } = await supabase.storage.from('media').upload(path, f);
    if (error) { console.error(error); toast('Falha no upload', true); return; }
    const url = supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
    await supabase.from('messages').insert({
      group_id: group.id, user_id: user.id, kind, media_url: url,
      author_name: profile || user.email?.split('@')[0],
    });
    toast('Enviado ✔');
  };

  return (
    <>
      <div className="chat-header">
        <button className="icon-btn" onClick={onBack}>←</button>
        <Avatar name={group.name} size={38} />
        <div className="gp-info" onClick={onMembers}>
          <h3>{group.name}</h3>
          <div className="cnt">{group.owner_id === user.id ? '👑 Seu grupo · toque p/ membros' : 'Toque p/ ver membros'}</div>
        </div>
        <button className="icon-btn" title="Chamada de voz" onClick={() => setCall('voice')}>📞</button>
        <button className="icon-btn" title="Chamada de vídeo" onClick={() => setCall('video')}>📹</button>
        <button className="icon-btn" title="Sair do grupo" onClick={() => {
          if (confirm('Sair deste grupo?')) onLeft();
        }}>🚪</button>
      </div>

      <div className="messages">
        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.user_id === user.id ? 'out' : 'in'}`}>
            {m.user_id !== user.id && <div className="author">{m.author_name || 'Alguém'}</div>}
            {m.kind === 'image' && <span className="media-space"><img src={m.media_url} alt="" onClick={() => window.open(m.media_url, '_blank')} /></span>}
            {m.kind === 'video' && <span className="media-space"><video src={m.media_url} controls /></span>}
            {m.kind === 'audio' && <span className="media-space"><audio src={m.media_url} controls /></span>}
            {m.kind === 'file' && (
              <div className="body"><a href={m.media_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent2)' }}>📎 Arquivo</a></div>
            )}
            {m.content && <div className="body">{m.content}</div>}
            <span className="time">{fmtTime(m.created_at)}{m.user_id === user.id ? ' ✓✓' : ''}</span>
          </div>
        ))}
        <div ref={messagesEnd} />
      </div>

      <form className="inputbar" onSubmit={send}>
        <input ref={fileRef} type="file" hidden accept="image/*,video/*,audio/*" onChange={onFile} />
        <button type="button" className="atc" onClick={() => fileRef.current?.click()}>📎</button>
        <textarea rows={1} placeholder="Mensagem" value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <button type="submit" className="snd" disabled={!text.trim()}>➤</button>
      </form>

      {call && <CallOverlay kind={call} group={group} onEnd={() => setCall(null)} />}
    </>
  );
}

/* ============ CHAMADAS ============ */
function CallOverlay({ kind, group, onEnd }) {
  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('Chamando…');

  useEffect(() => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pcRef.current = pc;
    const wantVideo = kind === 'video';
    navigator.mediaDevices.getUserMedia({ video: wantVideo, audio: true })
      .then((s) => {
        streamRef.current = s;
        s.getTracks().forEach((t) => pc.addTrack(t, s));
        const el = document.getElementById('local-media');
        if (wantVideo && el) { el.srcObject = s; el.play().catch(() => {}); }
      }).catch(() => setStatus('Sem câmera/micro — chamada em silêncio'));

    const ch = supabase.channel(`call:${group.id}`);
    ch.on('broadcast', { event: 'signal' }, async ({ payload }) => {
      try {
        await pc.setRemoteDescription(payload.desc);
        if (payload.desc.type === 'offer') {
          const ans = await pc.createAnswer();
          await pc.setLocalDescription(ans);
          ch.send({ type: 'broadcast', event: 'signal', payload: { desc: ans } });
          setStatus('Conectado');
        } else { setStatus('Conectado'); }
      } catch (err) { console.error(err); }
    }).subscribe();

    const t = setTimeout(async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      ch.send({ type: 'broadcast', event: 'signal', payload: { desc: offer } });
    }, 600);

    pc.ontrack = (ev) => {
      const el = document.getElementById('remote-media');
      if (el) { el.srcObject = ev.streams[0]; el.play().catch(() => {}); }
    };

    return () => {
      clearTimeout(t);
      pc.close(); ch.unsubscribe();
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
    };
  }, []);

  const end = () => {
    pcRef.current?.close();
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    onEnd();
  };

  return (
    <div className="call-overlay">
      <Avatar name={group.name} size={84} />
      <h2>{group.name}</h2>
      <div className="status">{status} — {kind === 'voice' ? '📞 voz' : '📹 vídeo'}</div>
      <div className="callbar">
        <button className="call-btn red" onClick={end}>✕</button>
      </div>
    </div>
  );
}

/* ============ MODAIS ============ */
function CreateModal({ admin, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [created, setCreated] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (!admin) {
    return (
      <div className="modal-back" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-icon">🔒</div>
          <h3>Acesso restrito</h3>
          <div className="muted">Apenas <b>Willyan</b> pode criar grupos.<br />Você entrou como visitante — peça um número de grupo pra entrar.</div>
          <div className="actions"><button className="btn" onClick={onClose}>Entendi</button></div>
        </div>
      </div>
    );
  }

  if (created) {
    return (
      <div className="modal-back" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-icon">🎉</div>
          <h3>Grupo criado!</h3>
          <div className="muted">Este é o <b>número secreto</b> do seu grupo. <b>Só você vê</b> — compartilhe com quem quiser que entre:</div>
          <div className="code-big">{created.code}</div>
          <div className="actions">
            <button className="btn" onClick={onClose}>Fechar</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim() || busy) return;
        setBusy(true); setErr('');
        const r = await onCreate(name.trim());
        setBusy(false);
        if (r?.err) setErr(r.err);
        else if (r?.ok) setCreated(r.group);
      }}>
        <div className="modal-icon">➕</div>
        <h3>Criar grupo</h3>
        <div className="muted">Escolha um nome. O número de 4 dígitos é sorteado e <b>só você vê</b> pra compartilhar.</div>
        <input className="input" placeholder="Nome do grupo" value={name}
          onChange={(e) => setName(e.target.value)} maxLength={40} required autoFocus />
        <div className="err">{err}</div>
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn" disabled={busy}>{busy ? 'Criando…' : 'Criar'}</button>
        </div>
      </form>
    </div>
  );
}

function JoinModal({ onClose, onJoin }) {
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="modal-back" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true); setErr('');
        const r = await onJoin(code);
        setBusy(false);
        if (r?.err) setErr(r.err); else onClose();
      }}>
        <div className="modal-icon">🔢</div>
        <h3>Entrar num grupo</h3>
        <div className="muted">Digite o número de 4 dígitos que o criador do grupo compartilhou.</div>
        <input className="input" placeholder="Ex.: 4712" value={code} inputMode="numeric"
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))} required autoFocus />
        <div className="err">{err}</div>
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        </div>
      </form>
    </div>
  );
}

function MembersModal({ group, user, admin, onClose, onChanged }) {
  const [members, setMembers] = useState([]);
  const [lock, setLock] = useState(!!group.locked);
  useEffect(() => { load(); }, []);
  const load = async () => {
    const { data } = await supabase.from('group_members')
      .select('user_id').eq('group_id', group.id);
    setMembers(data || []);
  };
  const isOwner = admin && group.owner_id === user.id;
  const kick = async (uid) => {
    if (uid === user.id) return;
    await supabase.rpc('remove_member', { gid: group.id, uid });
    await load(); onChanged();
    toast('Membro removido');
  };
  const toggleLock = async () => {
    const nl = !lock;
    setLock(nl);
    await supabase.from('groups').update({ locked: nl }).eq('id', group.id);
    toast(nl ? '🔒 Só você pode enviar mensagem agora' : '🔓 Todos podem enviar mensagem');
  };
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>👥 Membros — {group.name}</h3>
        <div className="muted">
          {isOwner ? (
            <>Você é o 👑 criador. Número do grupo: <b>{group.code}</b> — compartilhe só com quem deve entrar.</>
          ) : (
            <>Número do grupo: <b>{group.code}</b></>
          )}
        </div>
        {isOwner && (
          <label className="lock-row">
            <input type="checkbox" checked={lock} onChange={toggleLock} />
            🔒 Somente o criador pode enviar mensagem
          </label>
        )}
        <div className="member-list">
          {members.map((m) => (
            <div key={m.user_id} className="member-item">
              <Avatar name={m.user_id === user.id ? 'Você' : '👤'} size={34} />
              <div className="col">
                <div className="gp-name" style={{ fontSize: 14 }}>
                  {m.user_id === user.id ? 'Você' : (m.user_id === group.owner_id ? 'Criador' : 'Membro')}
                </div>
                <div className="gp-meta">{m.user_id === group.owner_id ? '👑' : '—'}</div>
              </div>
              {isOwner && m.user_id !== user.id && (
                <button className="btn ghost danger" onClick={() => kick(m.user_id)}>Expulsar</button>
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
      toast('Nome salvo ✔');
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
        <div className="muted" style={{ marginTop: 12 }}>Modo</div>
        <div className="mode-row">
          <button className={`btn ${mode === 'dark' ? '' : 'ghost'}`} onClick={() => { setMode('dark'); apply(theme, 'dark'); }}>🌙 Escuro</button>
          <button className={`btn ${mode === 'light' ? '' : 'ghost'}`} onClick={() => { setMode('light'); apply(theme, 'light'); }}>☀️ Claro</button>
        </div>
        <div className="muted" style={{ marginTop: 12 }}>Seu nome no app</div>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="actions">
          <button className="btn ghost" onClick={onClose}>Fechar</button>
          <button className="btn" onClick={saveName}>Salvar</button>
        </div>
      </div>
    </div>
  );
}