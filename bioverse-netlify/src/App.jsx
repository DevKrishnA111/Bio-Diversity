import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowDown, ArrowDownRight, ArrowRight, ArrowUpRight, Bookmark, Camera, CircleHelp,
  Database, ExternalLink, Eye, Leaf, LoaderCircle, LogIn, LogOut, MapPin, Menu,
  Microscope, PawPrint, Search, Send, ShieldCheck, Sparkles, Sprout, TreePine,
  UserRound, X,
} from 'lucide-react';
import { ecosystems, regions } from './lib/regions';
import { fetchGbifSummary, fetchIndiaObservations, fetchRecentIndiaObservations, searchGbifSpecies } from './lib/api';
import { supabase, supabaseConfigured } from './lib/supabase';
import IndiaMap from './components/IndiaMap';
import { ForestCanvas, GlobeCanvas } from './components/WorldScenes';

gsap.registerPlugin(ScrollTrigger);

const navLinks = [
  ['Discover', '#discover'], ['India explorer', '#india'], ['Ecosystems', '#ecosystems'],
  ['Species', '#species'], ['AI identifier', '#identify'], ['Impact', '#impact'],
];
const categories = ['All', 'Mammalia', 'Aves', 'Reptilia', 'Amphibia', 'Actinopterygii', 'Insecta', 'Plantae'];
const projects = [
  { n: '01', title: 'Restore a living shoreline', type: 'Habitat restoration', place: 'Coastal India', copy: 'Learn how mangroves, salt marshes and coastal communities support resilient shorelines.', org: 'UNEP ecosystem restoration', url: 'https://www.decadeonrestoration.org/' },
  { n: '02', title: 'Become a citizen observer', type: 'Citizen science', place: 'Across India', copy: 'Contribute carefully documented wildlife observations to open biodiversity research.', org: 'iNaturalist', url: 'https://www.inaturalist.org/' },
  { n: '03', title: 'Protect the wild corridors', type: 'Landscape conservation', place: 'Central India', copy: 'Understand why connected habitats matter for species movement and healthy ecosystems.', org: 'Wildlife Trust of India', url: 'https://www.wti.org.in/' },
];

function useScrollReveals() {
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.reveal').forEach((el) => {
        gsap.fromTo(el, { y: 28, autoAlpha: 0 }, {
          y: 0, autoAlpha: 1, duration: 0.8, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
      });
    });
    return () => ctx.revert();
  }, []);
}

function Brand({ light = false }) {
  return <a className={`brand ${light ? 'brand-light' : ''}`} href="#top" aria-label="BIOVERSE home">
    <span className="brand-mark"><Leaf size={18} strokeWidth={1.7} /></span>
    <span>BIO<span>VERSE</span><small>EXPLORE · PROTECT · PRESERVE</small></span>
  </a>;
}

function SectionHeading({ eyebrow, title, copy, light = false }) {
  return <div className={`section-heading reveal ${light ? 'on-dark' : ''}`}>
    <div className="eyebrow"><span />{eyebrow}</div>
    <h2>{title}</h2>
    {copy && <p>{copy}</p>}
  </div>;
}

function Stat({ value, label, note }) {
  return <div className="stat-block"><strong>{value}</strong><span>{label}</span><small>{note}</small></div>;
}

function SpeciesCard({ item, onOpen, saved, onSave }) {
  const group = item.taxonGroup || item.kingdom || 'Species';
  return <article className="species-card">
    <button className="species-image" onClick={() => onOpen(item)} aria-label={`View ${item.name}`}>
      {item.image ? <img src={item.image} alt={item.name} loading="lazy" /> : <div className="image-placeholder"><Leaf size={34} /><span>{group}</span></div>}
      <span className="image-tag">{group}</span>
      <span className="image-open"><ArrowUpRight size={16} /></span>
    </button>
    <div className="species-info">
      <div className="species-titleline"><div><h3>{item.name}</h3><em>{item.scientificName}</em></div>
        <button className={`save-icon ${saved ? 'saved' : ''}`} onClick={() => onSave(item)} aria-label={saved ? 'Remove saved species' : 'Save species'}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'} /></button>
      </div>
      <div className="species-meta"><span><MapPin size={12} />{item.place || 'India'}</span><span>{item.source}</span></div>
      <button className="text-link" onClick={() => onOpen(item)}>Explore species <ArrowUpRight size={14} /></button>
    </div>
  </article>;
}

function SpeciesModal({ item, onClose, saved, onSave }) {
  if (!item) return null;
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <motion.div className="species-modal" initial={{ opacity: 0, y: 20, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }}>
      <button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button>
      {item.image && <img className="modal-photo" src={item.image} alt={item.name} />}
      <div className="modal-content"><span className="eyebrow">FIELD RECORD · {item.source}</span><h2>{item.name}</h2><em>{item.scientificName}</em>
        <div className="modal-facts"><span><b>Group</b>{item.taxonGroup || item.kingdom || item.rank || 'Not supplied'}</span><span><b>Observed</b>{item.observedOn || 'Not supplied'}</span><span><b>Place</b>{item.place || 'India'}</span></div>
        {item.conservation && <p className="status-note">Conservation status reported by source: <strong>{item.conservation}</strong>. Check the original record for context and assessment date.</p>}
        {item.description && <p className="modal-description">{item.description.replace(/<[^>]*>/g, ' ').slice(0, 460)}</p>}
        {item.observationCount && <p className="modal-description">The taxon page has {Number(item.observationCount).toLocaleString()} observations in iNaturalist at the time of retrieval. This is a community observation count, not a population estimate.</p>}
        <div className="modal-actions"><a className="button button-dark" href={item.sourceUrl} target="_blank" rel="noreferrer">Open source record <ExternalLink size={15} /></a><button className="button button-outline" onClick={() => onSave(item)}><Bookmark size={15} />{saved ? 'Saved' : 'Save species'}</button></div>
      </div>
    </motion.div>
  </div>;
}

function AuthPanel({ session, onSession }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const signIn = async (event) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setMessage('');
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    setMessage(error ? error.message : 'Check your inbox for your secure sign-in link.');
    setBusy(false);
  };
  const signOut = async () => { await supabase.auth.signOut(); onSession(null); };
  if (!supabaseConfigured) return <div className="auth-state"><ShieldCheck size={22} /><div><strong>Accounts are ready to connect</strong><p>Add Supabase environment variables and run the included SQL schema to enable secure accounts and cross-device saving.</p></div></div>;
  if (session?.user) return <div className="auth-state"><UserRound size={22} /><div><strong>Signed in</strong><p>{session.user.email}</p><button className="text-link" onClick={signOut}>Sign out <LogOut size={14} /></button></div></div>;
  return <form className="auth-form" onSubmit={signIn}><label htmlFor="auth-email">Sign in with email</label><div className="inline-form"><input id="auth-email" type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /><button className="button button-dark" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <LogIn size={16} />} Send link</button></div>{message && <small className="form-message">{message}</small>}</form>;
}

function Identifier() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const handleFile = (f) => {
    setError(''); setResult(null);
    if (!f) return;
    if (!f.type.startsWith('image/')) { setError('Please choose an image file.'); return; }
    if (f.size > 4 * 1024 * 1024) { setError('Image size must be 4 MB or less.'); return; }
    setFile(f); setPreview(URL.createObjectURL(f));
  };
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const identify = async () => {
    if (!file) return;
    setBusy(true); setError(''); setResult(null);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file);
      });
      const response = await fetch('/.netlify/functions/identify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: dataUrl }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Identification service returned ${response.status}`);
      setResult(data);
    } catch (e) {
      setError(e.message.includes('Failed to fetch') ? 'The identification function is unavailable. Deploy through Netlify and set GEMINI_API_KEY to enable AI identification.' : e.message);
    } finally { setBusy(false); }
  };
  return <div className="identifier-grid">
    <div className="upload-panel">
      <div className="upload-top"><span className="eyebrow">IMAGE-BASED DISCOVERY</span><span className="file-limit">JPG · PNG · WEBP · MAX 4 MB</span></div>
      <button className={`upload-drop ${preview ? 'has-preview' : ''}`} onClick={() => inputRef.current?.click()}>
        {preview ? <img src={preview} alt="Selected upload preview" /> : <><span className="upload-icon"><Camera size={25} /></span><strong>Drop a field photo here</strong><span>or browse your device</span></>}
      </button>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
      <div className="upload-controls"><span>{file ? file.name : 'No image selected'}</span><button className="button button-light" onClick={identify} disabled={!file || busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />} Identify species</button></div>
      {error && <p className="error-message">{error}</p>}
    </div>
    <div className="identify-result">
      {!result && !busy && <div className="result-empty"><div className="result-orbit"><Microscope size={28} /></div><h3>Your field notes start here.</h3><p>Upload a clear photograph. BIOVERSE will ask its configured vision model for candidate identifications and explain what to verify next.</p><div className="result-note"><ShieldCheck size={16} />AI suggestions are not expert confirmation. Never approach or handle wildlife to take a photo.</div></div>}
      {busy && <div className="result-empty"><LoaderCircle className="spin" size={30} /><h3>Reading the field image…</h3><p>Checking visible features and preparing candidate matches.</p></div>}
      {result && <div className="result-populated"><span className="eyebrow">AI-ASSISTED CANDIDATE</span><h3>{result.commonName || result.scientificName || 'Possible identification'}</h3><em>{result.scientificName}</em>{result.confidence && <div className="confidence-bar"><span style={{ width: `${Math.max(0, Math.min(100, Number(result.confidence)))}%` }} /></div>}<p>{result.confidence ? `Model confidence estimate: ${result.confidence}%` : 'Confidence was not returned by the provider.'}</p><p>{result.reasoning || result.notes || 'Compare the features with authoritative field guides and verified observations.'}</p>{result.candidates?.length > 0 && <div className="candidate-list">{result.candidates.slice(0, 4).map((c, i) => <div key={i}><strong>{c.name}</strong><span>{c.scientificName || ''}</span></div>)}</div>}<p className="result-disclaimer">Use this as a starting point, not a definitive identification. Sensitive species locations should not be shared publicly.</p></div>}
    </div>
  </div>;
}

function ObservationForm({ session, onSubmitted }) {
  const [species, setSpecies] = useState('');
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setStatus('');
    const item = { species_name: species.trim(), place_label: place.trim() || null, notes: note.trim() || null };
    try {
      if (supabase && session?.user) {
        const { error } = await supabase.from('observations').insert({ ...item, user_id: session.user.id });
        if (error) throw error;
        setStatus('Observation submitted to your BIOVERSE account.');
      } else {
        const existing = JSON.parse(localStorage.getItem('bioverse-local-observations') || '[]');
        localStorage.setItem('bioverse-local-observations', JSON.stringify([{ ...item, created_at: new Date().toISOString() }, ...existing].slice(0, 30)));
        setStatus(supabaseConfigured ? 'Saved on this device. Sign in to submit to your account.' : 'Saved on this device only. Connect Supabase for shared, persistent community records.');
      }
      setSpecies(''); setPlace(''); setNote(''); onSubmitted?.();
    } catch (error) { setStatus(`Could not submit: ${error.message}`); }
    finally { setBusy(false); }
  };
  return <form className="observation-form" onSubmit={submit}>
    <div className="form-row"><label>Species or field identification<input required value={species} onChange={(e) => setSpecies(e.target.value)} placeholder="e.g. Indian peafowl" maxLength={100} /></label><label>General area (optional)<input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="e.g. Hazaribagh district" maxLength={100} /></label></div>
    <label>Observation notes<textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Describe what you noticed. Avoid sharing exact nest, den or rare-species coordinates." rows={3} maxLength={800} /></label>
    <div className="form-bottom"><small><ShieldCheck size={14} /> Exact coordinates are not collected by this form.</small><button className="button button-dark" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <Send size={15} />} Submit observation</button></div>
    {status && <p className="form-message">{status}</p>}
  </form>;
}

function App() {
  const reduceMotion = useReducedMotion();
  useScrollReveals();
  const [menuOpen, setMenuOpen] = useState(false);
  const [observations, setObservations] = useState([]);
  const [observationTotal, setObservationTotal] = useState(null);
  const [gbifCount, setGbifCount] = useState(null);
  const [dataStatus, setDataStatus] = useState('loading');
  const [dataError, setDataError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [query, setQuery] = useState('');
  const [searchBusy, setSearchBusy] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [savedIds, setSavedIds] = useState(() => JSON.parse(localStorage.getItem('bioverse-saved') || '[]'));
  const [selectedRegion, setSelectedRegion] = useState(regions.find((r) => r.name === 'Jharkhand'));
  const [session, setSession] = useState(null);
  const [localObservationCount, setLocalObservationCount] = useState(() => JSON.parse(localStorage.getItem('bioverse-local-observations') || '[]').length);
  const [ecosystem, setEcosystem] = useState(ecosystems[1]);
  const heroRef = useRef(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    if (!session?.user?.id) {
      setLocalObservationCount(JSON.parse(localStorage.getItem('bioverse-local-observations') || '[]').length);
      return;
    }
    let alive = true;
    Promise.all([
      supabase.from('saved_species').select('source_id').eq('user_id', session.user.id),
      supabase.from('observations').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id),
    ]).then(([savedResult, observationResult]) => {
      if (!alive) return;
      if (!savedResult.error && savedResult.data) {
        const ids = savedResult.data.map((row) => String(row.source_id));
        setSavedIds(ids);
        localStorage.setItem('bioverse-saved', JSON.stringify(ids));
      }
      if (!observationResult.error && observationResult.count != null) setLocalObservationCount(observationResult.count);
    }).catch((error) => console.warn('Could not sync BIOVERSE account data:', error.message));
    return () => { alive = false; };
  }, [session]);

  const loadDashboard = useCallback(async () => {
    setDataStatus('loading'); setDataError('');
    try {
      const [inat, gbif] = await Promise.all([fetchRecentIndiaObservations(), fetchGbifSummary()]);
      setObservations(inat.results); setObservationTotal(inat.count); setGbifCount(gbif.count);
      setLastUpdated(new Date()); setDataStatus('ready');
    } catch (error) {
      setDataError(error.message); setDataStatus('error');
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const runSearch = async (e) => {
    e?.preventDefault(); setSearchBusy(true); setDataError('');
    try {
      if (!query.trim()) { await loadDashboard(); setSearchBusy(false); return; }
      const [inat, gbif] = await Promise.all([
        fetchIndiaObservations({ q: query, limit: 36 }),
        searchGbifSpecies(query, 12),
      ]);
      const merged = [...inat.results];
      const seen = new Set(merged.map((x) => x.scientificName.toLowerCase()));
      gbif.forEach((x) => { if (!seen.has((x.scientificName || '').toLowerCase())) merged.push(x); });
      setObservations(merged); setObservationTotal(inat.total); setActiveCategory('All'); setDataStatus('ready'); setLastUpdated(new Date());
    } catch (error) { setDataError(error.message); }
    finally { setSearchBusy(false); }
  };

  const chooseRegion = async (region) => {
    setSelectedRegion(region); setQuery(''); setActiveCategory('All'); setSearchBusy(true);
    try {
      const margin = 1.45;
      const data = await fetchIndiaObservations({ limit: 36, bounds: { nelat: region.lat + margin, nelng: region.lng + margin, swlat: region.lat - margin, swlng: region.lng - margin } });
      setObservations(data.results); setObservationTotal(data.total); setDataStatus('ready'); setLastUpdated(new Date());
      document.getElementById('species')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    } catch (error) { setDataError(error.message); }
    finally { setSearchBusy(false); }
  };

  const filteredSpecies = useMemo(() => observations.filter((item) => activeCategory === 'All' || item.taxonGroup === activeCategory), [observations, activeCategory]);
  const toggleSave = async (item) => {
    const id = String(item.taxonId || item.id);
    const next = savedIds.includes(id) ? savedIds.filter((x) => x !== id) : [...savedIds, id];
    setSavedIds(next); localStorage.setItem('bioverse-saved', JSON.stringify(next));
    if (supabase && session?.user) {
      try {
        if (next.includes(id)) await supabase.from('saved_species').upsert({ user_id: session.user.id, source_id: id, common_name: item.name, scientific_name: item.scientificName, source: item.source, source_url: item.sourceUrl });
        else await supabase.from('saved_species').delete().eq('user_id', session.user.id).eq('source_id', id);
      } catch (error) { console.warn('Saved locally; cloud sync failed:', error.message); }
    }
  };

  const scrollTo = (id) => { setMenuOpen(false); document.querySelector(id)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); };

  return <>
    <header className="site-header">
      <div className="header-inner"><Brand />
        <nav className={`desktop-nav ${menuOpen ? 'nav-open' : ''}`} aria-label="Main navigation">
          {navLinks.map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}
        </nav>
        <div className="header-actions"><button className="header-join" onClick={() => scrollTo('#community')}>Join the movement <ArrowUpRight size={14} /></button><button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}</button></div>
      </div>
    </header>

    <main id="top">
      <section className="hero" ref={heroRef}>
        <div className="hero-noise" />
        <div className="hero-copy">
          <div className="hero-kicker"><span className="live-dot" /> A LIVING ATLAS OF INDIA'S NATURAL WORLD</div>
          <h1>One planet.<br /><em>Millions</em> of species.<br /><span>One responsibility.</span></h1>
          <p>Discover the incredible web of life. Understand our ecosystems. Become part of the movement protecting Earth's biodiversity.</p>
          <div className="hero-buttons"><button className="button button-lime" onClick={() => scrollTo('#india')}>Explore biodiversity <ArrowUpRight size={16} /></button><button className="hero-text-button" onClick={() => scrollTo('#community')}>Join the movement <ArrowDownRight size={16} /></button></div>
          <div className="hero-footnote"><span>06° 45′ N — 37° 06′ N</span><span>FIELD NOTES FROM INDIA</span></div>
        </div>
        <div className="hero-globe" aria-label="Interactive three-dimensional Earth visualization"><GlobeCanvas /><div className="globe-caption"><span className="caption-pulse" /> LIVE PLANET VIEW <span>INTERACTIVE 3D</span></div><div className="globe-coordinates">INDIAN SUBCONTINENT<br />BIODIVERSITY HOTSPOTS</div></div>
        <div className="hero-index"><span>01 / 06</span><span>SCROLL TO EXPLORE</span><ArrowDown size={16} /></div>
        <div className="hero-side-note">THE NATURE OF<br />OUR FUTURE</div>
      </section>

      <section className="intro-strip" id="discover">
        <div className="intro-label"><span>THE BIG PICTURE</span><div className="line" /></div>
        <div className="intro-content reveal"><p className="intro-lead">Biodiversity is not just the variety of life.<br /><em>It is the system that makes life possible.</em></p><p className="intro-small">From the smallest soil organism to the largest ocean wanderer, every living thing is part of a connected story. BIOVERSE brings those connections into focus.</p></div>
        <div className="intro-stats"><Stat value="4 / 36" label="Global biodiversity hotspots" note="India is home to 4 of 36 identified hotspots" /><Stat value="≈8%" label="Share of global biodiversity" note="NITI dashboard · WII & MoEFCC source" /><Stat value="1" label="Shared living planet" note="A responsibility without borders" /></div><p className="data-footnote intro-source-note">Hotspot and global biodiversity share figures: NITI Aayog India Climate & Energy Dashboard, sourced to the Wildlife Institute of India and MoEFCC.</p>
      </section>

      <section className="india-section section-pad" id="india">
        <div className="section-topline"><span>02 / FIELD ATLAS</span><span>INDIA · 06.7°N—35.7°N</span></div>
        <SectionHeading eyebrow="Explore the subcontinent" title={<>A country of <em>many worlds.</em></>} copy="Follow the ecological gradients that shape India's extraordinary natural heritage. Choose a region to explore nearby community observations." />
        <div className="india-explorer reveal">
          <div className="india-map-column"><IndiaMap selected={selectedRegion} onSelect={chooseRegion} /><div className="map-foot"><span>MAP BASE: OPENSTREETMAP</span><span>MARKERS: SELECTED LANDSCAPES</span></div></div>
          <div className="region-panel"><div className="panel-eyebrow"><span className="live-dot" /> REGIONAL FIELD GUIDE</div><h3>Choose a region</h3><p>Each selection searches a broad area around the regional centre. Results are community observations, not a complete biodiversity inventory.</p>
            <div className="region-selected"><span>ACTIVE REGION</span><strong>{selectedRegion?.name || 'Choose a region'}</strong><small>{selectedRegion?.habitat || 'Regional habitat context'}</small></div>
            <div className="region-list">{regions.map((region) => <button key={region.name} className={selectedRegion?.name === region.name ? 'active' : ''} onClick={() => chooseRegion(region)}><span>{region.name}</span><ArrowUpRight size={14} /></button>)}</div>
            <button className="button button-dark region-search" onClick={() => scrollTo('#species')}>Explore observations <ArrowRight size={15} /></button>
          </div>
        </div>
        <p className="data-footnote">Regional centres are approximate discovery anchors. They do not represent administrative boundaries. The map does not display sensitive wildlife coordinates.</p>
      </section>

      <section className="ecosystems-section" id="ecosystems">
        <div className="ecosystems-top section-pad"><div className="section-topline"><span>03 / LIVING SYSTEMS</span><span>LAND · WATER · AIR</span></div><SectionHeading eyebrow="Connected habitats" title={<>Every ecosystem tells<br /><em>a different story.</em></>} copy="Explore the living architecture of India's landscapes — and the relationships that keep them resilient." /></div>
        <div className="ecosystem-layout">
          <div className="ecosystem-list">{ecosystems.map((eco) => <button key={eco.id} className={`ecosystem-row ${ecosystem.id === eco.id ? 'selected' : ''}`} onClick={() => setEcosystem(eco)}><span className="eco-number">{eco.position}</span><span className="eco-main"><strong>{eco.name}</strong><small>{eco.type}</small></span><span className="eco-arrow"><ArrowUpRight size={17} /></span></button>)}</div>
          <div className="ecosystem-visual" style={{ '--eco-tint': ecosystem.color }}><div className="eco-visual-top"><span>SELECTED ECOSYSTEM / {ecosystem.position}</span><span>{ecosystem.count}</span></div><div className="eco-art"><div className={`eco-art-orb ${ecosystem.id}`}><div className="orb-ring one" /><div className="orb-ring two" /><div className="orb-core"><TreePine size={54} strokeWidth={1} /></div></div><div className="eco-coordinate">BIOME STUDY<br />INDIA / 2026</div></div><div className="eco-description"><div><span className="eyebrow">{ecosystem.type}</span><h3>{ecosystem.name}</h3><p>{ecosystem.description}</p></div><div className="eco-species"><span>SPECIES TO DISCOVER</span><strong>{ecosystem.species}</strong></div></div></div>
        </div>
        <div className="ecosystem-note"><span>FIELD NOTE</span><p>Boundaries between ecosystems are not fixed lines. Rivers, seasons, pollinators and migration connect habitats across landscapes.</p></div>
      </section>

      <section className="forest-section">
        <div className="forest-copy"><div className="eyebrow"><span /> IMMERSIVE FIELD EXPERIENCE</div><h2>Step into the<br /><em>living forest.</em></h2><p>Move around a small 3D forest scene, discover its layers, and see how habitat structure creates space for life.</p><div className="forest-tags"><span><TreePine size={14} /> Canopy</span><span><Sprout size={14} /> Understory</span><span><PawPrint size={14} /> Wildlife</span></div><div className="forest-credit">3D WILDLIFE ASSET: FOX · KH​​RONOS GLTF SAMPLE ASSETS · CC BY 4.0</div></div>
        <div className="forest-viewer"><ForestCanvas /><div className="viewer-label"><span className="caption-pulse" /> INTERACTIVE 3D SCENE <span>DRAG TO ORBIT · SCROLL TO ZOOM</span></div><div className="viewer-corner">WESTERN GHATS<br />FOREST STUDY</div></div>
      </section>

      <section className="species-section section-pad" id="species">
        <div className="section-topline"><span>04 / SPECIES INDEX</span><span>COMMUNITY-SOURCED FIELD RECORDS</span></div>
        <SectionHeading eyebrow="The living library" title={<>Meet the <em>neighbours</em><br />we share this planet with.</>} copy="Search current community observations and taxonomic records. Each result links back to its data provider." />
        <form className="species-search reveal" onSubmit={runSearch}><Search size={19} /><input aria-label="Search species" placeholder="Search a common or scientific name…" value={query} onChange={(e) => setQuery(e.target.value)} /><button type="submit" disabled={searchBusy}>{searchBusy ? <LoaderCircle className="spin" size={17} /> : 'Search records'} <ArrowUpRight size={15} /></button></form>
        <div className="species-toolbar"><div className="category-scroll">{categories.map((cat) => <button key={cat} className={activeCategory === cat ? 'active' : ''} onClick={() => setActiveCategory(cat)}>{cat === 'Mammalia' ? 'Mammals' : cat === 'Aves' ? 'Birds' : cat === 'Reptilia' ? 'Reptiles' : cat === 'Amphibia' ? 'Amphibians' : cat === 'Actinopterygii' ? 'Fish' : cat === 'Insecta' ? 'Insects' : cat === 'Plantae' ? 'Plants' : cat}</button>)}</div><div className="results-count"><Database size={13} /> {filteredSpecies.length} records shown</div></div>
        {dataError && <div className="inline-alert"><CircleHelp size={16} />{dataError}<button onClick={loadDashboard}>Retry</button></div>}
        {dataStatus === 'loading' || searchBusy ? <div className="loading-state"><LoaderCircle className="spin" size={24} /><span>Connecting to biodiversity records…</span></div> : filteredSpecies.length ? <div className="species-grid">{filteredSpecies.slice(0, 12).map((item) => <SpeciesCard key={item.id} item={item} onOpen={setSelectedSpecies} saved={savedIds.includes(String(item.taxonId || item.id))} onSave={toggleSave} />)}</div> : <div className="empty-state"><Leaf size={26} /><h3>No records in this view</h3><p>Try another name, region or taxonomic group. Provider coverage varies by place and species.</p><button className="text-link" onClick={() => { setQuery(''); setActiveCategory('All'); loadDashboard(); }}>Reset search <ArrowUpRight size={14} /></button></div>}
        <div className="species-data-footer"><div><span>DATA PROVIDER</span><strong>iNaturalist · GBIF</strong></div><div><span>OBSERVATION COVERAGE</span><strong>{observationTotal == null ? 'Loading' : Number(observationTotal).toLocaleString('en-IN')} iNaturalist matches</strong></div><div><span>LAST REFRESHED</span><strong>{lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not yet refreshed'}</strong></div><button className="text-link" onClick={loadDashboard}>Refresh data <ArrowUpRight size={14} /></button></div>
        <p className="data-footnote">Observation records are not population estimates. iNaturalist observations are community-submitted; GBIF taxonomic suggestions are nomenclatural records. Photo licences and attribution are controlled by their original contributors.</p>
      </section>

      <section className="identifier-section section-pad" id="identify">
        <div className="section-topline"><span>05 / FIELD TECHNOLOGY</span><span>AI-ASSISTED IDENTIFICATION</span></div>
        <div className="identifier-heading"><SectionHeading eyebrow="Look closer" title={<>A photograph can<br />open a <em>new world.</em></>} copy="Use a field image to request candidate species identifications. The model's suggestions should always be checked against expert sources." /><div className="identifier-badge"><Sparkles size={16} /> VISION-POWERED TOOL</div></div>
        <Identifier />
      </section>

      <section className="impact-section" id="impact">
        <div className="impact-backdrop" />
        <div className="section-pad impact-content"><div className="section-topline"><span>06 / SIGNALS FROM THE FIELD</span><span>LIVE DATA SNAPSHOT</span></div><SectionHeading eyebrow="A living evidence base" title={<>Look at the data.<br /><em>See the connections.</em></>} copy="A snapshot of records indexed by global biodiversity infrastructure. Counts update when this page retrieves fresh data." light />
          <div className="impact-stats"><div className="impact-stat"><span className="impact-icon"><Database size={18} /></span><strong>{gbifCount == null ? '—' : gbifCount.toLocaleString('en-IN')}</strong><span>GBIF occurrence records</span><small>Indexed records with country code IN</small></div><div className="impact-stat"><span className="impact-icon"><Eye size={18} /></span><strong>{observationTotal == null ? '—' : observationTotal.toLocaleString('en-IN')}</strong><span>iNaturalist observations</span><small>Research-grade observations matching India bounds</small></div><div className="impact-stat"><span className="impact-icon"><Bookmark size={18} /></span><strong>{savedIds.length}</strong><span>Your field library</span><small>Species saved in this browser</small></div><div className="impact-stat"><span className="impact-icon"><Sprout size={18} /></span><strong>{localObservationCount}</strong><span>Your contributions</span><small>Submissions saved in this browser or account</small></div></div>
          <div className="impact-foot"><span><span className="live-dot" /> {dataStatus === 'ready' ? 'DATA CONNECTION ACTIVE' : dataStatus === 'error' ? 'DATA CONNECTION ISSUE' : 'CONNECTING TO DATA'}</span><span>{lastUpdated ? `UPDATED ${lastUpdated.toLocaleString()}` : 'WAITING FOR FIRST RESPONSE'}</span><span>GBIF API · iNATURALIST API</span></div>
        </div>
      </section>

      <section className="conservation-section section-pad" id="conservation">
        <div className="section-topline"><span>07 / TAKE PART</span><span>FROM KNOWLEDGE TO ACTION</span></div>
        <SectionHeading eyebrow="Conservation action center" title={<>Protection begins<br />with <em>participation.</em></>} copy="Explore trusted conservation learning resources and practical ways to support biodiversity knowledge." />
        <div className="project-grid">{projects.map((project) => <article className="project-card" key={project.n}><div className="project-top"><span>{project.n} / RESOURCE</span><ArrowUpRight size={18} /></div><span className="project-type">{project.type}</span><h3>{project.title}</h3><p>{project.copy}</p><div className="project-foot"><span>{project.org}<small>{project.place}</small></span><a href={project.url} target="_blank" rel="noreferrer" aria-label={`Open ${project.org}`}><ExternalLink size={16} /></a></div></article>)}</div>
        <p className="data-footnote">These are learning and discovery links, not endorsements or a list of verified open volunteer vacancies. Check each organisation's current guidance before participating.</p>
      </section>

      <section className="community-section" id="community">
        <div className="community-left"><div className="eyebrow"><span /> THE BIOVERSE COMMUNITY</div><h2>Every observation<br />adds to the <em>story.</em></h2><p>Record what you see. Save species that inspire you. Help build a more connected picture of the natural world.</p><div className="community-mini-stats"><span><strong>{savedIds.length.toString().padStart(2, '0')}</strong> SAVED SPECIES</span><span><strong>{localObservationCount.toString().padStart(2, '0')}</strong> YOUR NOTES</span></div></div>
        <div className="community-right"><div className="community-card auth-card"><div className="community-card-head"><span>01 / YOUR ACCOUNT</span><UserRound size={18} /></div><AuthPanel session={session} onSession={setSession} /></div>
          <div className="community-card contribute-card"><div className="community-card-head"><span>02 / ADD A FIELD NOTE</span><Sprout size={18} /></div><ObservationForm session={session} onSubmitted={() => setLocalObservationCount((count) => count + 1)} /></div>
          <div className="saved-row"><span><Bookmark size={15} /> SAVED SPECIES IN THIS BROWSER</span><strong>{savedIds.length}</strong></div>
        </div>
      </section>

      <section className="closing-section"><div className="closing-ornament"><Leaf size={35} strokeWidth={1} /></div><span className="eyebrow">THE FUTURE IS A SHARED HABITAT</span><h2>Explore with wonder.<br /><em>Protect with purpose.</em></h2><button className="button button-lime" onClick={() => scrollTo('#india')}>Return to the field atlas <ArrowUpRight size={16} /></button></section>
    </main>

    <footer className="site-footer"><div className="footer-top"><Brand light /><p>A digital field guide for India's<br />extraordinary living world.</p><div className="footer-links"><a href="#discover">Discover</a><a href="#species">Species index</a><a href="#identify">AI identifier</a><a href="#community">Community</a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} BIOVERSE · HACKATHON EDITION</span><span>DATA: GBIF · iNATURALIST · © OPENSTREETMAP CONTRIBUTORS</span><span><a href="https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox" target="_blank" rel="noreferrer">3D FOX CREDIT: PIXELMANNEN / KH​RONOS · CC BY 4.0</a></span></div><p className="footer-disclaimer">BIOVERSE is an independent educational project. API results may be incomplete or change over time. It is not a substitute for expert biodiversity assessment.</p></footer>

    <AnimatePresence>{selectedSpecies && <SpeciesModal item={selectedSpecies} onClose={() => setSelectedSpecies(null)} saved={savedIds.includes(String(selectedSpecies.taxonId || selectedSpecies.id))} onSave={toggleSave} />}</AnimatePresence>
  </>;
}

export default App;
