import React, { Component, useEffect, useRef, useState } from 'react';
import { supabase, isAdmin } from './supabase.js';

const THEMES = [
  { id: 'green', label: 'Verde', bg: '#00a884' },
  { id: 'blue', label: 'Azul', bg: '#2979ff' },
  { id: 'red', label: 'Vermelho', bg: '#ef4444' },
  { id: 'purple', label: 'Roxo', bg: '#a78bfa' },
  { id: 'pink', label: 'Rosa', bg: '#f472b6' },
  { id: 'orange', label: 'Laranja', bg: '#fb923c' },
];

const fmtTime = (t) => {
  if (!t) return '';
  return new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};
const fmtDay = (t) => {
  if (!t) return '';
  const d = new Date(t);
  const hoje = new Date();
  if (d.toDateString() === hoje.toDateString()) return 'Hoje';
  const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
  if (d.toDateString() === ontem.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const hashHue = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};

const fmtDur = (s) => {
  if (!s || !isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

function AudioMsg({ src }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [prog, setProg] = useState(0);
  const [dur, setDur] = useState(0);
  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const upd = () => { setProg(a.currentTime / (a.duration || 1)); setDur(a.duration || 0); };
    const end = () => setPlaying(false);
    a.addEventListener('timeupdate', upd);
    a.addEventListener('loadedmetadata', upd);
    a.addEventListener('ended', end);
    return () => { a.removeEventListener('timeupdate', upd); a.removeEventListener('loadedmetadata', upd); a.removeEventListener('ended', end); };
  }, []);
  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) { a.play().then(() => setPlaying(true)).catch(() => {}); }
    else { a.pause(); setPlaying(false); }
  };
  return (
    <div className={`audio-player ${playing ? 'playing' : ''}`} onClick={toggle}>
      <div className="ap-play">{playing ? '❚❚' : '▶'}</div>
      <div className="ap-bars">
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i} style={{ height: `${22 + ((i * 37) % 78)}%`, animationDelay: `${(i % 8) * 0.08}s` }} />
        ))}
      </div>
      <span className="ap-time">{fmtDur(prog * (dur || 0))}</span>
      <audio ref={ref} src={src} preload="metadata" />
    </div>
  );
}

function Avatar({ name, url, size = 40, round = true }) {
  const hue = hashHue(name || '?');
  if (url) {
    return <img src={url} alt="" className="avatar-img"
      style={{ width: size, height: size, borderRadius: round ? '50%' : 14 }} />;
  }
  return (
    <div className="avatar" style={{
      width: size, height: size, fontSize: size * 0.4, borderRadius: round ? '50%' : 14,
      background: `linear-gradient(135deg, hsl(${hue},72%,47%), hsl(${(hue + 45) % 360},72%,36%))`,
    }}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

function toast(msg, isErr = false) {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = `position:fixed;bottom:26px;left:50%;transform:translateX(-50%);background:${isErr ? '#ef4444' : '#1f2c34'};color:#fff;padding:12px 22px;border-radius:14px;z-index:500;font-size:14px;font-weight:600;box-shadow:0 8px 30px rgba(0,0,0,.45);transition:opacity .3s;max-width:90vw;text-align:center`;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 320); }, 2600);
}

class ErrorBoundary extends Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error('crash:', err, info); }
  render() {
    if (this.state.err) {
      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center', background: 'var(--bg)', color: 'var(--text)' }}>
          <div style={{ fontSize: 44 }}>😵</div>
          <h3>Ops, algo deu errado</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13, maxWidth: 420 }}>{String(this.state.err?.message || this.state.err)}</p>
          <button className="btn" style={{ maxWidth: 220, marginTop: 6 }} onClick={() => location.reload()}>Recarregar</button>
        </div>
      );
    }
    return this.props.children;
  }
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

  // garante tema salvo ao abrir
  useEffect(() => {
    try {
      const th = localStorage.getItem('gw_theme') || 'green';
      const md = localStorage.getItem('gw_mode') || 'dark';
      document.body.classList.remove('light', ...THEMES.map((t) => 'theme-' + t.id));
      document.body.classList.add(md === 'light' ? 'light' : '', 'theme-' + th);
    } catch (_) {}
  }, []);

  let body;
  if (loading) body = <div className="boot"><span className="spin" />Carregando…</div>;
  else if (!session) body = <AuthScreen />;
  else body = <Main key={session.user.id} user={session.user} profile={profile} setProfile={setProfile} />;

  return <ErrorBoundary>{body}</ErrorBoundary>;
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
        if (!data.session) setErr('Conta criada! Confira o link no seu email para entrar. ✉️');
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
      <div className="auth-bg" />
      <div className="auth-card">
        <div className="auth-logo">💬</div>
        <h1>GrupoWhat</h1>
        <div className="sub">Seus grupos, do seu jeito — grátis e sem limites</div>
        <button type="button" className="btn google" onClick={doGoogle}>
          <GLogo /> Continuar com Google
        </button>
        <div className="sep">ou</div>
        <form onSubmit={doEmail}>
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
        </form>
        <button type="button" className="btn ghost" style={{ marginTop: 12 }}
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}>
          {mode === 'login' ? 'Criar conta com email' : 'Já tenho conta — entrar'}
        </button>
      </div>
    </div>
  );
}

const cleanErr = (m) =>
  (m || '').includes('Invalid login') ? 'Email ou senha incorretos.'
  : (m || '').includes('already') ? 'Este email já está cadastrado. Faça login.'
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
  const [showInfo, setShowInfo] = useState(false);
  const [mobileView, setMobileView] = useState('list');

  useEffect(() => {
    const dn = user.user_metadata?.display_name;
    if (dn && !profile) setProfile(dn);
    loadGroups();
  }, []);

  const loadGroups = async () => {
    const { data: rows, error } = await supabase
      .from('group_members')
      .select('group_id, status, joined_at, groups!group_id(id, name, code, owner_id, locked, avatar_url, description)');
    if (error) { console.error(error); toast('Erro ao carregar grupos', true); return; }
    const seen = new Set();
    const list = [];
    (rows || []).forEach((r) => {
      const g = r.groups || r.group || r;
      if (!g || !g.id || seen.has(g.id)) return; // dedupe (corrige "2 abas do mesmo grupo")
      seen.add(g.id);
      list.push({ ...g, member_status: r.status || 'approved', joined_at: r.joined_at });
    });
    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    setGroups(list);
    setActive((cur) => cur ? list.find((g) => g.id === cur.id) || null : null);
  };

  const joinGroup = async (code) => {
    const num = parseInt(code, 10);
    if (!Number.isInteger(num)) return { err: 'Número inválido.' };
    const { data: gid, error } = await supabase.rpc('request_join', { p_code: num });
    if (error) { console.error(error); return { err: 'Erro. Confira o número e tente de novo.' }; }
    if (!gid) return { err: 'Grupo não encontrado. Confira o número?' };
    toast('Pedido enviado! Aguarde o criador aprovar. ⏳');
    await loadGroups();
    return {};
  };

  const createGroupFn = async (name) => {
    const code = 1000 + Math.floor(Math.random() * 9000);
    const { data: g, error } = await supabase
      .from('groups').insert({ name, code, owner_id: user.id })
      .select().single();
    if (error) { console.error(error); return { err: 'Falha ao criar. Tente de novo.' }; }
    await supabase.from('group_members').insert({ group_id: g.id, user_id: user.id, status: 'approved' });
    await loadGroups();
    return { ok: true, group: g };
  };

  const leaveOrDelete = async (gid) => {
    const g = groups.find((x) => x.id === gid);
    if (g?.owner_id === user.id) {
      // dono saindo = apaga o grupo
      await supabase.from('messages').delete().eq('group_id', gid);
      await supabase.from('groups').delete().eq('id', gid);
    } else {
      await supabase.from('group_members').delete().eq('group_id', gid).eq('user_id', user.id);
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
            ? <ChatView key={active.id} group={active} user={user} profile={profile}
                onBack={() => setMobileView('list')}
                onInfo={() => setShowInfo(true)}
                onLeft={async () => { await leaveOrDelete(active.id); }} />
            : <EmptyChat />}
        </div>
      </div>

      {showCreate && <CreateModal admin={admin} onClose={() => setShowCreate(false)} onCreate={createGroupFn} />}
      {showJoin && <JoinModal onClose={() => setShowJoin(false)} onJoin={joinGroup} />}
      {showSettings && <SettingsModal user={user} profile={profile} setProfile={setProfile}
        onClose={() => setShowSettings(false)} />}
      {showInfo && active &&
        <GroupInfoModal group={active} user={user} admin={admin} onClose={() => setShowInfo(false)}
          onChanged={loadGroups} />}
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
  const [search, setSearch] = useState('');
  const filtered = groups.filter((g) =>
    (g.name || '').toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="sidebar">
      <header>
        <div className="logo">💬 GrupoWhat</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
          {admin && <span className="crown" title="Admin">👑</span>}
          <div className="avatar-wrap" onClick={() => setMenuOpen((v) => !v)}>
            <Avatar name={profile || user.email} size={36} />
          </div>
          {menuOpen && (
            <div className="menu-pop">
              <div className="menu-email">{user.email}</div>
              <div className="menu-name">{(profile || 'Você') + (admin ? ' · 👑 Admin' : '')}</div>
              <button className="btn ghost" onClick={() => { setMenuOpen(false); onSettings(); }}>🎨 Aparência</button>
              <button className="btn ghost" onClick={async () => { setMenuOpen(false); await supabase.auth.signOut(); }}>🚪 Sair</button>
            </div>
          )}
        </div>
      </header>
      <div className="side-actions">
        <button className="btn" onClick={onJoin}>🔢 Entrar com nº</button>
        <button className="btn ghost" onClick={onNew}>➕ Novo grupo</button>
      </div>
      <div className="search-bar">
        <span>🔍</span>
        <input placeholder="Pesquisar grupos…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="groups">
        {filtered.length === 0 && (
          <div className="side-empty">
            <span>{search ? 'Nenhum grupo encontrado.' : 'Você ainda não está em nenhum grupo.'}</span>
            {!search && !admin && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Peça o número de um grupo pra alguém entrar.</span>}
          </div>
        )}
        {filtered.map((g) => (
          <div key={g.id} className={`group-item ${active?.id === g.id ? 'active' : ''}`}
            onClick={() => setActive(g)}>
            <Avatar name={g.name} url={g.avatar_url} />
            <div className="col">
              <div className="gp-name">{g.name}</div>
              <div className="gp-meta">
                {g.member_status === 'pending' ? '⏳ Aguardando aprovação' : (g.owner_id === user.id ? '👑 Seu grupo' : 'Grupo')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ CHAT ============ */
function ChatView({ group, user, profile, onBack, onInfo, onLeft }) {
  const pending = group.member_status === 'pending';
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [call, setCall] = useState(null);
  const [hidden, setHidden] = useState(() => new Set());
  const [viewed, setViewed] = useState(() => new Map());
  const [menuMsg, setMenuMsg] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [recording, setRecording] = useState(false);
    const [recTime, setRecTime] = useState(0);
    const [oneView, setOneView] = useState(null);
    const [shotWarned, setShotWarned] = useState(false);
    const messagesEnd = useRef(null);

    // screenshot deterrent: detect PrintScreen key + visibility change
    useEffect(() => {
      const onKey = (e) => { if (e.key === 'PrintScreen' && oneView) { e.preventDefault(); toast('🔒 Captura bloqueada — visualização única', true); setShotWarned(true); setTimeout(() => setShotWarned(false), 2000); } };
      const onVis = () => { if (document.hidden && oneView && !shotWarned) { toast('🔒 Captura detectada — visualização única', true); setShotWarned(true); setTimeout(() => setShotWarned(false), 2000); } };
      window.addEventListener('keydown', onKey);
      document.addEventListener('visibilitychange', onVis);
      return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis); };
    }, [oneView, shotWarned]);
  const fileRef = useRef(null);
  const recRef = useRef(null);
  const recTimer = useRef(null);

  useEffect(() => {
    if (pending) return;
    fetchMessages();
    fetchEvents();
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
  }, [group.id, pending]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, hidden]);

  const fetchMessages = async () => {
    let q = supabase
      .from('messages').select('*').eq('group_id', group.id)
      .order('created_at', { ascending: true }).limit(500);
    // só mensagens a partir do momento em que a pessoa entrou no grupo
    if (group.joined_at) q = q.gte('created_at', group.joined_at);
    const { data, error } = await q;
    if (error) { console.error(error); toast('Erro ao carregar mensagens', true); }
    setMessages(data || []);
  };

  const fetchEvents = async () => {
    // só eventos do próprio usuário (visualização única é por usuário)
    const { data, error } = await supabase.from('message_events')
      .select('message_id, kind').eq('user_id', user.id);
    if (error || !data) return;
    const h = new Set();
    const v = new Map();
    data.forEach((e) => {
      if (e.kind === 'hidden') h.add(e.message_id);
      if (e.kind === 'viewed') v.set(e.message_id, (v.get(e.message_id) || 0) + 1);
    });
    setHidden(h);
    setViewed(v);
  };

  const insertMsg = async (payload) => {
    const { error } = await supabase.from('messages').insert(payload);
    if (error) { console.error(error); toast('Erro ao enviar mensagem', true); return false; }
    return true;
  };

  const send = async (e) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText('');
    await insertMsg({
      group_id: group.id, user_id: user.id, content: body, kind: 'text',
      author_name: profile || user.email?.split('@')[0],
    });
  };

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setPendingFile(f);
  };

  const sendFile = async (oneView) => {
    const f = pendingFile;
    setPendingFile(null);
    if (!f) return;
    const kind = f.type.startsWith('image/') ? 'image'
      : f.type.startsWith('video/') ? 'video'
      : f.type.startsWith('audio/') ? 'audio' : 'file';
    toast('Enviando mídia…');
    const path = `${group.id}/${Date.now()}_${f.name.replace(/[^\w.\-]/g, '_')}`;
    const { error } = await supabase.storage.from('media').upload(path, f);
    if (error) { console.error(error); toast('Falha no upload', true); return; }
    const url = supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
    await insertMsg({
      group_id: group.id, user_id: user.id, kind, media_url: url,
      one_view: !!oneView, author_name: profile || user.email?.split('@')[0],
    });
    toast('Enviado ✔');
  };

  /* ===== gravação de áudio ===== */
  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks = [];
      rec.ondataavailable = (ev) => { if (ev.data.size) chunks.push(ev.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (!chunks.length) return;
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        const ext = (rec.mimeType || '').includes('mp4') ? 'm4a' : 'webm';
        const path = `${group.id}/${Date.now()}_audio.${ext}`;
        const { error } = await supabase.storage.from('media').upload(path, blob);
        if (error) { console.error(error); toast('Falha no áudio', true); return; }
        const url = supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
        await insertMsg({
          group_id: group.id, user_id: user.id, kind: 'audio', media_url: url,
          author_name: profile || user.email?.split('@')[0],
        });
        toast('Áudio enviado ✔');
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
      setRecTime(0);
      recTimer.current = setInterval(() => setRecTime((t) => t + 1), 1000);
    } catch (err) {
      console.error(err);
      toast('Não consegui acessar o microfone', true);
    }
  };
  const stopRec = () => {
    clearInterval(recTimer.current);
    setRecording(false);
    try { recRef.current?.stop(); } catch (_) {}
  };

  const hideMsg = async (id) => {
    await supabase.rpc('hide_msg', { mid: id });
    setHidden((h) => new Set(h).add(id));
    setMenuMsg(null);
  };
  const deleteMsg = async (id) => {
    if (!confirm('Apagar para todos?')) return;
    await supabase.rpc('delete_msg', { mid: id });
    setMessages((ms) => ms.filter((m) => m.id !== id));
    setMenuMsg(null);
  };
  const viewOne = async (id) => {
    await supabase.rpc('view_msg', { mid: id });
    setViewed((v) => new Map(v).set(id, (v.get(id) || 0) + 1));
    setHidden((h) => new Set(h).add(id));
    setOneView(id);
  };
  const closeOneView = () => setOneView(null);

  const replyTo = (m) => {
    setText(`↩️ ${(m.author_name || 'Alguém')}: ${m.content ? m.content.slice(0, 80) : (m.kind === 'image' ? '[Imagem]' : m.kind === 'audio' ? '[Áudio]' : m.kind === 'video' ? '[Vídeo]' : '[Mídia]')}\n`);
    setMenuMsg(null);
  };
  const forwardMsg = async (m) => {
    const target = prompt('Encaminhar para qual grupo? Digite o nome:', '');
    if (!target) return;
    const dest = groups.find((g) => g.name.toLowerCase() === target.toLowerCase() && g.id !== group.id);
    if (!dest) { toast('Grupo não encontrado', true); return; }
    await supabase.from('messages').insert({
      group_id: dest.id, user_id: user.id, content: m.content || null, kind: m.kind,
      media_url: m.media_url || null, one_view: false, author_name: profile || user.email?.split('@')[0],
    });
    toast('Encaminhado ✔');
    setMenuMsg(null);
  };

  const visible = messages.filter((m) => !(m.one_view && m.user_id !== user.id && hidden.has(m.id)));
  const canDeleteAll = (m) => m.user_id === user.id;

  if (pending) {
    return (
      <>
        <div className="chat-header">
          <button className="icon-btn" onClick={onBack}>←</button>
          <Avatar name={group.name} url={group.avatar_url} size={42} />
          <div className="gp-info"><h3>{group.name}</h3></div>
          <button className="icon-btn" title="Sair" onClick={() => { if (confirm('Sair deste grupo?')) onLeft(); }}>🚪</button>
        </div>
        <div className="gate">
          <div className="gate-icon">⏳</div>
          <h3>Aguardando aprovação</h3>
          <p>O criador do grupo precisa aprovar sua entrada.<br />Você verá as mensagens novas assim que for aprovado.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="chat-header">
        <button className="icon-btn" onClick={onBack}>←</button>
        <div className="gp-avatar" onClick={onInfo}>
          <Avatar name={group.name} url={group.avatar_url} size={42} />
        </div>
        <div className="gp-info" onClick={onInfo}>
          <h3>{group.name}</h3>
          <div className="cnt">
            {group.description ? group.description.slice(0, 40) : (group.owner_id === user.id ? '👑 Seu grupo' : 'Grupo')}
            {group.description && '…'} · toque p/ detalhes
          </div>
        </div>
        <button className="icon-btn" title="Chamada de voz" onClick={() => setCall('voice')}>📞</button>
        <button className="icon-btn" title="Chamada de vídeo" onClick={() => setCall('video')}>📹</button>
        <button className="icon-btn" title="Sair do grupo" onClick={() => {
          if (confirm('Sair deste grupo?')) onLeft();
        }}>🚪</button>
      </div>

      <div className="messages">
        {visible.map((m, i) => {
          const prev = visible[i - 1];
          const showDay = !prev || fmtDay(m.created_at) !== fmtDay(prev.created_at);
          return (
            <React.Fragment key={m.id}>
              {showDay && <div className="day-divider">{fmtDay(m.created_at)}</div>}
              <div className={`msg ${m.user_id === user.id ? 'out' : 'in'}`}
                onContextMenu={(e) => { e.preventDefault(); setMenuMsg(m.id); }}>
                {m.user_id !== user.id && <div className="author">{m.author_name || 'Alguém'}</div>}
                {m.one_view && m.user_id === user.id && (
                  <div className="one-badge">🕐 Visualização única{viewed.has(m.id) ? ' · vista' : ''}</div>
                )}
                {m.kind === 'image' && (
                  <span className="media-space">
                    {m.one_view && m.user_id !== user.id
                      ? <div className="one-view-box" onClick={() => viewOne(m.id)}>
                          <img src={m.media_url} alt="" />
                          <div className="one-overlay">🕐 Visualização única<br />toque para ver</div>
                        </div>
                      : <img src={m.media_url} alt="" onClick={() => window.open(m.media_url, '_blank')} />}
                  </span>
                )}
                {m.kind === 'video' && (
                  <span className="media-space">
                    {m.one_view && m.user_id !== user.id
                      ? <div className="one-view-box" onClick={() => viewOne(m.id)}>
                          <video src={m.media_url} muted preload="metadata" />
                          <div className="one-overlay">🕐 Visualização única<br />toque para ver</div>
                        </div>
                      : <video src={m.media_url} controls />}
                  </span>
                )}
                {m.kind === 'audio' && <span className="media-space"><AudioMsg src={m.media_url} /></span>}
                {m.kind === 'file' && (
                  <div className="body"><a href={m.media_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent2)' }}>📎 Arquivo</a></div>
                )}
                {m.content && <div className="body">{m.content}</div>}
                <span className="time">
                  {fmtTime(m.created_at)}
                  {m.user_id === user.id ? ' ✓✓' : ''}
                </span>
                <button className="msg-menu-btn" onClick={() => setMenuMsg(menuMsg === m.id ? null : m.id)}>⋮</button>
                {menuMsg === m.id && (
                  <div className="msg-menu" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => hideMsg(m.id)}>🗑️ Apagar pra mim</button>
                    {canDeleteAll(m) && <button onClick={() => deleteMsg(m.id)}>❌ Apagar pra todos</button>}
                    <button onClick={() => replyTo(m)}>↩️ Responder</button>
                    <button onClick={() => forwardMsg(m)}>➡️ Encaminhar</button>
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
        <div ref={messagesEnd} />
      </div>

      {recording && (
        <div className="rec-bar">
          <span className="rec-dot" /> Gravando… {recTime}s
          <button className="btn" style={{ width: 'auto', margin: 0, padding: '8px 14px' }} onClick={stopRec}>Enviar</button>
        </div>
      )}

      <form className="inputbar" onSubmit={send}>
        <input ref={fileRef} type="file" hidden accept="image/*,video/*,audio/*" onChange={onPickFile} />
        <button type="button" className="atc" onClick={() => fileRef.current?.click()}>📎</button>
        {!recording && <button type="button" className="atc rec-btn" onClick={startRec}>🎤</button>}
        <textarea rows={1} placeholder="Mensagem" value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <button type="submit" className="snd" disabled={!text.trim()}>➤</button>
      </form>

      {pendingFile && (
        <MediaModal file={pendingFile} onCancel={() => setPendingFile(null)} onSend={sendFile} />
      )}

      {call && <CallOverlay kind={call} group={group} onEnd={() => setCall(null)} />}
      {oneView && (
        <div className="modal-back no-screenshot" onClick={closeOneView} onContextMenu={(e) => e.preventDefault()}>
          <div className="modal one-view-modal no-screenshot" onClick={(e) => e.stopPropagation()} onContextMenu={(e) => e.preventDefault()}>
            <button className="icon-btn" style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }} onClick={closeOneView}>✕</button>
            <div className="screenshot-warning" style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.7)', fontSize: 11, textAlign: 'center', pointerEvents: 'none', zIndex: 5 }}>
              🔒 Visualização única — capturas de tela são monitoradas
            </div>
            {messages.find((m) => m.id === oneView)?.kind === 'image' && (
              <img src={messages.find((m) => m.id === oneView)?.media_url} alt="" className="one-view-full" onContextMenu={(e) => e.preventDefault()} />
            )}
            {messages.find((m) => m.id === oneView)?.kind === 'video' && (
              <video src={messages.find((m) => m.id === oneView)?.media_url} controls className="one-view-full" autoPlay disablePictureInPicture controlsList="nodownload noremoteplayback" onContextMenu={(e) => e.preventDefault()} />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function MediaModal({ file, onCancel, onSend }) {
  const [one, setOne] = useState(false);
  const url = URL.createObjectURL(file);
  const isImg = file.type.startsWith('image/');
  const isVid = file.type.startsWith('video/');
  return (
    <div className="modal-back" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon">📎</div>
        <h3>Enviar mídia</h3>
        {isImg && <img src={url} alt="" className="media-preview" />}
        {isVid && <video src={url} controls className="media-preview" />}
        {!isImg && !isVid && <div className="media-preview file-preview">📄 {file.name}</div>}
        <label className="lock-row" style={{ marginTop: 10 }}>
          <input type="checkbox" checked={one} onChange={(e) => setOne(e.target.checked)} />
          🕐 Visualização única (some ao ser vista)
        </label>
        <div className="actions">
          <button className="btn ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn" onClick={() => onSend(one ? true : null)}>Enviar</button>
        </div>
      </div>
    </div>
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
      {kind === 'video' && (
        <div className="call-vid">
          <video id="remote-media" autoPlay playsInline />
          <video id="local-media" autoPlay playsInline muted className="local-vid" />
        </div>
      )}
      <Avatar name={group.name} url={group.avatar_url} size={kind === 'video' ? 72 : 88} />
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
          <div className="actions"><button className="btn" onClick={onClose}>Fechar</button></div>
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
        <div className="muted">Digite o número de 4 dígitos que o criador do grupo compartilhou. <b>O criador precisa aprovar sua entrada.</b></div>
        <input className="input" placeholder="Ex.: 4712" value={code} inputMode="numeric"
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))} required autoFocus />
        <div className="err">{err}</div>
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn" disabled={busy}>{busy ? 'Enviando…' : 'Pedir entrada'}</button>
        </div>
      </form>
    </div>
  );
}

function GroupInfoModal({ group, user, admin, onClose, onChanged }) {
  const [members, setMembers] = useState([]);
  const [lock, setLock] = useState(!!group.locked);
  const [name, setName] = useState(group.name);
  const [desc, setDesc] = useState(group.description || '');
  const [avatarUrl, setAvatarUrl] = useState(group.avatar_url || '');
  const isOwner = admin && group.owner_id === user.id;
  const fileRef = useRef(null);

  useEffect(() => { load(); }, []);
  const load = async () => {
    const { data } = await supabase.from('group_members')
      .select('user_id, status, joined_at').eq('group_id', group.id);
    setMembers(data || []);
  };

  const kick = async (uid) => {
    if (uid === user.id) return;
    await supabase.rpc('remove_member', { gid: group.id, uid });
    await load(); onChanged();
    toast('Membro removido');
  };
  const approve = async (uid) => {
    await supabase.rpc('approve_member', { gid: group.id, uid });
    await load(); onChanged();
    toast('Membro aprovado ✔');
  };
  const reject = async (uid) => {
    await supabase.rpc('reject_member', { gid: group.id, uid });
    await load(); onChanged();
    toast('Pedido recusado');
  };
  const toggleLock = async () => {
    const nl = !lock;
    setLock(nl);
    await supabase.from('groups').update({ locked: nl }).eq('id', group.id);
    toast(nl ? '🔒 Só você pode enviar mensagem agora' : '🔓 Todos podem enviar mensagem');
  };
  const saveInfo = async () => {
    await supabase.from('groups').update({ name: name.trim() || group.name, description: desc.trim() })
      .eq('id', group.id);
    toast('Informações salvas ✔');
    onChanged();
  };
  const uploadAvatar = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const path = `avatars/${group.id}_${Date.now()}.${f.name.split('.').pop() || 'jpg'}`;
    const { error } = await supabase.storage.from('media').upload(path, f);
    if (error) { toast('Falha na foto', true); return; }
    const url = supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
    await supabase.from('groups').update({ avatar_url: url }).eq('id', group.id);
    setAvatarUrl(url);
    onChanged();
    toast('Foto atualizada ✔');
  };

  const pendentes = members.filter((m) => m.status === 'pending').length;

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="gi-head">
          <Avatar name={name} url={avatarUrl} size={64} />
          {isOwner && (
            <div className="gi-edit-avatar">
              <input ref={fileRef} type="file" hidden accept="image/*" onChange={uploadAvatar} />
              <button className="btn ghost" style={{ margin: 0, padding: '8px 10px' }} onClick={() => fileRef.current?.click()}>📷 Foto</button>
            </div>
          )}
          <h3>{name}</h3>
          <div className="muted">{isOwner ? 'Você é o 👑 criador' : 'Grupo'}</div>
        </div>

        {isOwner && (
          <>
            <div className="muted" style={{ marginTop: 8 }}>Nome</div>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
            <div className="muted">Descrição</div>
            <textarea className="input" rows={2} placeholder="Descrição do grupo…" value={desc}
              onChange={(e) => setDesc(e.target.value)} maxLength={120} />
            <button className="btn" style={{ marginTop: 0 }} onClick={saveInfo}>Salvar informações</button>
            <label className="lock-row" style={{ marginTop: 10 }}>
              <input type="checkbox" checked={lock} onChange={toggleLock} />
              🔒 Somente o criador pode enviar mensagem
            </label>
          </>
        )}

        {isOwner && pendentes > 0 && (
          <div className="pending-note" style={{ marginTop: 10 }}>
            ✋ {pendentes} pedido(s) de entrada aguardando sua aprovação
          </div>
        )}

        {isOwner && (
          <div className="muted" style={{ marginTop: 8 }}>
            Número secreto do grupo: <b>{group.code}</b> — compartilhe só com quem deve entrar.
          </div>
        )}
        {!isOwner && <div className="muted" style={{ marginTop: 8 }}>Código do grupo: visível apenas para o criador.</div>}

        <div className="muted" style={{ marginTop: 12 }}>Membros ({members.length})</div>
        <div className="member-list">
          {members.map((m) => (
            <div key={m.user_id} className="member-item">
              <Avatar name={m.user_id === user.id ? 'Você' : (m.user_id === group.owner_id ? 'Criador' : 'Membro')} size={34} />
              <div className="col">
                <div className="gp-name" style={{ fontSize: 14 }}>
                  {m.user_id === user.id ? 'Você' : (m.user_id === group.owner_id ? 'Criador' : 'Membro')}
                </div>
                <div className="gp-meta">
                  {m.user_id === group.owner_id ? '👑' : m.status === 'pending' ? '⏳ Pendente' : '—'}
                </div>
              </div>
              {isOwner && m.user_id !== user.id && (
                <>
                  {m.status === 'pending' ? (
                    <div className="member-actions">
                      <button className="btn ghost ok" onClick={() => approve(m.user_id)}>✓</button>
                      <button className="btn ghost danger" onClick={() => reject(m.user_id)}>✕</button>
                    </div>
                  ) : (
                    <button className="btn ghost danger" onClick={() => kick(m.user_id)}>Expulsar</button>
                  )}
                </>
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
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('gw_theme') || 'green'; } catch (_) { return 'green'; } });
  const [mode, setMode] = useState(() => { try { return localStorage.getItem('gw_mode') || 'dark'; } catch (_) { return 'dark'; } });
  const [name, setName] = useState(profile || '');

  const apply = (th, md) => {
    try {
      document.body.classList.remove('light', ...THEMES.map((t) => 'theme-' + t.id));
      document.body.classList.add(md === 'light' ? 'light' : '', 'theme-' + th);
      localStorage.setItem('gw_theme', th);
      localStorage.setItem('gw_mode', md);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    apply(theme, mode);
    return () => {};
  }, []);

  const saveName = async () => {
    try {
      if (name.trim()) {
        await supabase.auth.updateUser({ data: { display_name: name.trim() } });
        setProfile(name.trim());
        toast('Nome salvo ✔');
      }
    } catch (err) { console.error(err); }
    onClose();
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon">🎨</div>
        <h3>Aparência</h3>
        <div className="muted">Cor de destaque do app</div>
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