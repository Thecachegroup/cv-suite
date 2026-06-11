'use client'
import { useState, useRef, useCallback, DragEvent, ChangeEvent, ReactNode, useEffect } from 'react'
import Image from 'next/image'

type Tool = 'masterCV' | 'tailoredCV' | 'coverLetter' | 'intro90General' | 'intro90Role' | 'deepInterviewPrep'
type CVFormat = 'classic' | 'hybrid' | 'executive' | 'modern'
type Palette = 'navy' | 'teal' | 'burgundy' | 'slate'

const TOOLS: { id: Tool; label: string; desc: string }[] = [
  { id: 'masterCV',          label: 'Master CV',                 desc: 'Consolidate multiple CVs, notes, and career documents into one authoritative base CV.' },
  { id: 'tailoredCV',        label: 'Tailored CV',               desc: 'Tailor your CV to a specific role. Choose your format and colour palette before generating.' },
  { id: 'coverLetter',       label: 'Cover Letter',              desc: 'A targeted cover letter aligned to the role. Choose your tone before generating.' },
  { id: 'intro90General',    label: '90-Sec Intro',              desc: 'A polished spoken introduction for networking events and cold meetings.' },
  { id: 'intro90Role',       label: '90-Sec Intro (Role-Specific)', desc: 'A tailored interview opener connecting your experience to the specific role and company.' },
  { id: 'deepInterviewPrep', label: 'Deep Interview Prep',       desc: '8 competency scenarios, interviewer profiling, technical questions, self-calibration, and deal-breakers.' },
]

const CV_FORMATS: { id: CVFormat; label: string; tag: string }[] = [
  { id: 'classic',   label: 'Classic Chronological', tag: 'ATS-safe · Traditional'    },
  { id: 'hybrid',    label: 'Hybrid / Combination',  tag: 'Skills-forward · Modern'   },
  { id: 'executive', label: 'Executive Profile',      tag: 'Senior roles · High impact' },
  { id: 'modern',    label: 'Modern Single-Column',   tag: 'Clean · Contemporary'      },
]

const PALETTES: { id: Palette; label: string; tag: string; colors: string[] }[] = [
  { id: 'navy',     label: 'Navy Professional', tag: 'Finance · Legal · Govt',    colors: ['#1B3A5C','#2E6DA4','#E8EEF4'] },
  { id: 'teal',     label: 'Deep Teal',         tag: 'Tech · Consulting',          colors: ['#1A5276','#148F77','#E8F5F2'] },
  { id: 'burgundy', label: 'Muted Burgundy',    tag: 'HR · Marketing · NFP',       colors: ['#6B2737','#9B4657','#F5EEF0'] },
  { id: 'slate',    label: 'Charcoal Slate',    tag: 'Engineering · PM',           colors: ['#2C3E50','#5D6D7E','#F2F3F4'] },
]

const COVER_TONES = [
  { id: 'professional', label: 'Professional', tag: 'Corporate · Government' },
  { id: 'direct',       label: 'Direct',       tag: 'Commercial · Private sector' },
  { id: 'warm',         label: 'Warm',         tag: 'Culture-led · NFP' },
]

const LENGTH_OPTIONS = [
  { value: '',            label: 'Let content decide' },
  { value: 'concise',     label: 'Concise  (1–2 pages)' },
  { value: 'standard',    label: 'Standard  (2–3 pages)' },
  { value: 'comprehensive', label: 'Comprehensive  (3–4 pages)' },
]

// ── Logo ──────────────────────────────────────────────────────────────────────
function InukshukLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="18" rx="12" ry="14" fill="#932B46" />
      <rect x="28" y="34" width="44" height="11" rx="5" fill="#932B46" />
      <rect x="34" y="47" width="32" height="9"  rx="4" fill="#932B46" />
      <rect x="22" y="58" width="56" height="11" rx="5" fill="#932B46" />
      <rect x="28" y="71" width="16" height="22" rx="6" fill="#932B46" />
      <rect x="56" y="71" width="16" height="22" rx="6" fill="#932B46" />
    </svg>
  )
}

// ── Access gate ───────────────────────────────────────────────────────────────
function AccessGate({ onUnlock }: { onUnlock: () => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const check = () => {
    setChecking(true); setError('')
    const expected = process.env.NEXT_PUBLIC_ACCESS_CODE || 'tcg2025'
    setTimeout(() => {
      if (code.trim().toLowerCase() === expected.toLowerCase()) { onUnlock() }
      else { setError('Incorrect access code.'); setChecking(false) }
    }, 400)
  }
  return (
    <div style={{ minHeight:'100vh', background:'#F5EFF1', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
      <div style={{ background:'#fff', borderRadius:'16px', padding:'48px 40px', width:'100%', maxWidth:'400px', boxShadow:'0 4px 24px rgba(0,0,0,.1)', textAlign:'center' }}>
        <div style={{ display:'flex', justifyContent:'center', marginBottom:'18px' }}><InukshukLogo size={52} /></div>
        <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#9E8A8E', marginBottom:'8px' }}>The Cache Group</div>
        <h1 style={{ fontSize:'22px', fontWeight:700, color:'#1A1A1A', margin:'0 0 6px' }}>CV Suite — Full Access</h1>
        <p style={{ fontSize:'14px', color:'#9E8A8E', margin:'0 0 28px', lineHeight:'1.6' }}>Enter your access code to continue.</p>
        <input type="password" value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key==='Enter' && check()} placeholder="Access code"
          style={{ width:'100%', padding:'13px 16px', fontSize:'15px', color:'#1A1A1A', background:'#FAFAFA', border:'1.5px solid #D4C5C9', borderRadius:'8px', outline:'none', marginBottom:'12px', boxSizing:'border-box', fontFamily:'inherit', textAlign:'center', letterSpacing:'.1em' }} />
        {error && <div style={{ padding:'9px 12px', background:'#FDF0F2', border:'1px solid #F5C5CE', borderRadius:'7px', fontSize:'13px', color:'#932B46', marginBottom:'12px' }}>{error}</div>}
        <button onClick={check} disabled={checking || !code.trim()}
          style={{ width:'100%', padding:'13px', background:checking?'#C47A8E':'#932B46', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:700, cursor:checking?'not-allowed':'pointer', fontFamily:'inherit' }}>
          {checking ? 'Checking…' : 'Enter Suite'}
        </button>
        <div style={{ marginTop:'16px', fontSize:'12px', color:'#B09CA0' }}>
          <a href="mailto:matt@thecachegroup.com.au" style={{ color:'#932B46', textDecoration:'none' }}>Contact us for access</a>
        </div>
      </div>
    </div>
  )
}

// ── Inline renderer ───────────────────────────────────────────────────────────
function renderInline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/).map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2,-2)}</strong> : p
  )
}

function renderOutput(text: string): ReactNode[] {
  return text.split('\n').map((line, i) => {
    const t = line.trim()
    if (t === '---') return <hr key={i} style={{ border:'none', borderTop:'1px solid #E0E0E0', margin:'12px 0' }} />
    if (t.length > 2 && /^[A-Z][A-Z\s&\/\(\)\–\-0-9]+$/.test(t))
      return <div key={i} style={{ fontSize:'11px', fontWeight:700, color:'#932B46', letterSpacing:'.1em', marginTop:'18px', marginBottom:'4px' }}>{t}</div>
    if (line.startsWith('- ') || line.startsWith('* '))
      return <div key={i} style={{ display:'flex', gap:'8px', lineHeight:'1.6', marginBottom:'3px', paddingLeft:'4px' }}><span style={{ color:'#932B46', flexShrink:0 }}>•</span><span>{renderInline(line.replace(/^[-*] /,''))}</span></div>
    if (t === '') return <div key={i} style={{ height:'7px' }} />
    return <div key={i} style={{ lineHeight:'1.6', marginBottom:'2px' }}>{renderInline(line)}</div>
  })
}

// ── Word count helper ─────────────────────────────────────────────────────────
const wc = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

// ── Collapsed field ───────────────────────────────────────────────────────────
function CollapsedField({ label, value, onClear }: { label: string; value: string; onClear: () => void }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'#F0FBF0', border:'1.5px solid #A8D5A2', borderRadius:'8px', marginBottom:'14px' }}>
      <span style={{ fontSize:'13px', color:'#2D6A27' }}>✓ {label} — {wc(value).toLocaleString()} words</span>
      <button onClick={onClear} style={{ fontSize:'11px', color:'#555', background:'#E8E8E8', border:'1px solid #CCC', borderRadius:'4px', cursor:'pointer', padding:'2px 10px', fontWeight:500, fontFamily:'inherit' }}>Clear</button>
    </div>
  )
}

// ── DragArea ──────────────────────────────────────────────────────────────────
interface DragAreaProps { id:string; label:string; value:string; onChange:(v:string)=>void; onClear:()=>void; placeholder?:string; rows?:number }
function DragArea({ id, label, value, onChange, onClear, placeholder, rows=8 }: DragAreaProps) {
  const [dragging, setDragging] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const extractFile = async (file: File) => {
    setExtracting(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/extract', { method:'POST', body:fd })
      const data = await res.json()
      if (data.text) onChange(data.text)
      else alert(data.error || 'Could not extract text.')
    } catch { alert('Failed to extract file. Try pasting text instead.') }
    finally { setExtracting(false) }
  }

  const onDrop = useCallback(async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]; if (file) await extractFile(file)
  }, [])

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (file) await extractFile(file); e.target.value = ''
  }

  if (value && !extracting) return <CollapsedField label={label} value={value} onClear={onClear} />

  return (
    <div style={{ marginBottom:'14px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'5px' }}>
        <label htmlFor={id} style={{ fontSize:'11px', fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', color:'#6B5B5F' }}>{label}</label>
      </div>
      <div onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={onDrop}
        style={{ borderRadius:'8px', border:`2px ${dragging?'solid':'dashed'} ${dragging?'#932B46':'#D4C5C9'}`, background:dragging?'#FDF4F6':'#FAFAFA' }}>
        <textarea id={id} value={extracting?'Extracting text from file…':value} onChange={e=>onChange(e.target.value)}
          placeholder={placeholder} rows={rows} disabled={extracting}
          style={{ width:'100%', padding:'11px 13px', fontSize:'13px', lineHeight:'1.6', color:'#1A1A1A', background:'transparent', border:'none', outline:'none', resize:'vertical', fontFamily:'inherit', boxSizing:'border-box' }} />
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'5px 11px 7px', borderTop:'1px solid #EDE5E7' }}>
          <span style={{ fontSize:'11px', color:'#9E8A8E' }}>{extracting?'Reading file…':'Drop .txt, .docx, or .pdf — or paste text'}</span>
          <button type="button" onClick={()=>inputRef.current?.click()} disabled={extracting}
            style={{ fontSize:'11px', color:'#fff', background:'#932B46', border:'none', borderRadius:'5px', cursor:'pointer', padding:'4px 12px', fontWeight:600, fontFamily:'inherit' }}>Browse Files</button>
        </div>
        <input ref={inputRef} type="file" accept=".txt,.docx,.pdf" onChange={onFileChange} style={{ display:'none' }} />
      </div>
    </div>
  )
}

// ── TextField ─────────────────────────────────────────────────────────────────
function TextField({ id, label, value, onChange, onClear, placeholder, rows }: { id:string; label:string; value:string; onChange:(v:string)=>void; onClear?:()=>void; placeholder?:string; rows?:number }) {
  const isMulti = rows && rows > 1
  const base: React.CSSProperties = { width:'100%', padding:'9px 13px', fontSize:'13px', color:'#1A1A1A', background:'#FAFAFA', border:'2px dashed #D4C5C9', borderRadius:'8px', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }
  return (
    <div style={{ marginBottom:'14px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'5px' }}>
        <label htmlFor={id} style={{ fontSize:'11px', fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', color:'#6B5B5F' }}>{label}</label>
        {onClear && value && <button onClick={onClear} style={{ fontSize:'11px', color:'#555', background:'#F0F0F0', border:'1px solid #CCC', borderRadius:'4px', cursor:'pointer', padding:'2px 10px', fontWeight:500, fontFamily:'inherit' }}>Clear</button>}
      </div>
      {isMulti
        ? <textarea id={id} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{ ...base, resize:'vertical' }} />
        : <input id={id} type="text" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={base} />}
    </div>
  )
}

// ── Format thumbnail previews ─────────────────────────────────────────────────
function PreviewClassic() {
  return (
    <div style={{ width:'100%', height:'60px', background:'#F5EFF1', borderRadius:'4px', padding:'5px', display:'flex', flexDirection:'column', gap:'2px' }}>
      <div style={{ height:'4px', width:'100%', background:'#932B46', borderRadius:'2px' }} />
      <div style={{ height:'3px', width:'68%', background:'#C8A0AA', borderRadius:'2px' }} />
      <div style={{ height:'3px', width:'43%', background:'#DDD', borderRadius:'2px' }} />
      <div style={{ height:'8px', width:'100%', background:'#EDE5E7', borderRadius:'2px', marginTop:'2px' }} />
      <div style={{ height:'3px', width:'82%', background:'#DDD', borderRadius:'2px' }} />
      <div style={{ height:'3px', width:'60%', background:'#DDD', borderRadius:'2px' }} />
      <div style={{ height:'8px', width:'100%', background:'#EDE5E7', borderRadius:'2px', marginTop:'2px' }} />
    </div>
  )
}
function PreviewHybrid() {
  return (
    <div style={{ width:'100%', height:'60px', background:'#F5EFF1', borderRadius:'4px', padding:'5px', display:'flex', flexDirection:'column' }}>
      <div style={{ height:'4px', width:'100%', background:'#932B46', borderRadius:'2px', marginBottom:'4px' }} />
      <div style={{ display:'flex', gap:'3px', flex:1 }}>
        <div style={{ width:'35%', display:'flex', flexDirection:'column', gap:'3px' }}>
          <div style={{ height:'7px', background:'#C8A0AA', borderRadius:'2px' }} />
          <div style={{ height:'3px', background:'#DDD', borderRadius:'2px' }} />
          <div style={{ height:'7px', background:'#C8A0AA', borderRadius:'2px' }} />
          <div style={{ height:'3px', background:'#DDD', borderRadius:'2px' }} />
        </div>
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'3px' }}>
          <div style={{ height:'3px', background:'#DDD', borderRadius:'2px' }} />
          <div style={{ height:'3px', width:'85%', background:'#DDD', borderRadius:'2px' }} />
          <div style={{ height:'3px', background:'#DDD', borderRadius:'2px' }} />
          <div style={{ height:'3px', width:'70%', background:'#DDD', borderRadius:'2px' }} />
        </div>
      </div>
    </div>
  )
}
function PreviewExecutive() {
  return (
    <div style={{ width:'100%', height:'60px', background:'#F5EFF1', borderRadius:'4px', padding:'5px', display:'flex', gap:'4px' }}>
      <div style={{ width:'28%', background:'#932B46', borderRadius:'3px', padding:'4px', display:'flex', flexDirection:'column', gap:'3px' }}>
        {[100,80,100,70].map((w,i) => <div key={i} style={{ height:'3px', width:`${w}%`, background:`rgba(255,255,255,${i%2===0?.5:.3})`, borderRadius:'2px' }} />)}
      </div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'3px', paddingTop:'3px' }}>
        {[100,88,100,88,72,100].map((w,i) => <div key={i} style={{ height:'3px', width:`${w}%`, background:i%3===0?'#AAA':'#DDD', borderRadius:'2px' }} />)}
      </div>
    </div>
  )
}
function PreviewModern() {
  return (
    <div style={{ width:'100%', height:'60px', background:'#F5EFF1', borderRadius:'4px', padding:'5px', display:'flex', flexDirection:'column', gap:'2px' }}>
      <div style={{ height:'4px', width:'26%', background:'#932B46', borderRadius:'2px' }} />
      <div style={{ height:'5px', width:'56%', background:'#333', borderRadius:'2px', margin:'2px 0' }} />
      <div style={{ height:'1px', background:'#DDD', width:'100%' }} />
      <div style={{ height:'3px', width:'88%', background:'#DDD', borderRadius:'2px', marginTop:'2px' }} />
      <div style={{ height:'3px', width:'65%', background:'#DDD', borderRadius:'2px' }} />
      <div style={{ height:'1px', background:'#DDD', width:'100%', marginTop:'2px' }} />
      <div style={{ height:'3px', width:'88%', background:'#DDD', borderRadius:'2px', marginTop:'2px' }} />
    </div>
  )
}
const FORMAT_PREVIEWS: Record<CVFormat, () => JSX.Element> = { classic:PreviewClassic, hybrid:PreviewHybrid, executive:PreviewExecutive, modern:PreviewModern }

// ── Section nav for interview prep ────────────────────────────────────────────
const INTERVIEW_SECTIONS = [
  { label: 'Company Brief', marker: 'COMPANY INTELLIGENCE BRIEF' },
  { label: 'Interviewers',  marker: 'INTERVIEWER BACKGROUND' },
  { label: 'Scenarios',     marker: 'BEHAVIOURAL INTERVIEW QUESTIONS' },
  { label: 'Technical',     marker: 'TECHNICAL' },
  { label: 'Self-Cal',      marker: 'SELF-CALIBRATION' },
  { label: 'Questions',     marker: 'QUESTIONS TO ASK' },
]

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [unlocked, setUnlocked]           = useState(false)
  const [activeTab, setActiveTab]         = useState<Tool>('masterCV')
  const [cv, setCv]                       = useState('')
  const [jd, setJd]                       = useState('')
  const [docs, setDocs]                   = useState('')
  const [company, setCompany]             = useState('')
  const [role, setRole]                   = useState('')
  const [interviewers, setInterviewers]   = useState('')
  const [candidateName, setCandidateName] = useState('')
  const [cvFormat, setCvFormat]           = useState<CVFormat>('classic')
  const [palette, setPalette]             = useState<Palette>('burgundy')
  const [coverTone, setCoverTone]         = useState('professional')
  const [length, setLength]               = useState('')
  const [output, setOutput]               = useState('')
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')
  const [warning, setWarning]             = useState('')
  const [warningDismissed, setWarningDismissed] = useState(false)
  const [copied, setCopied]               = useState(false)
  const [downloading, setDownloading]     = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  const wordCount = output ? wc(output) : 0
  const estPages = output ? Math.max(1, Math.round(wordCount / 450)) : 0

  if (!unlocked) return <AccessGate onUnlock={() => setUnlocked(true)} />

  const switchTab = (tab: Tool) => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null }
    setActiveTab(tab); setOutput(''); setError(''); setWarning(''); setLoading(false)
  }

  const resetAll = () => {
    setCv(''); setJd(''); setDocs(''); setCompany(''); setRole(''); setInterviewers('')
    setOutput(''); setError(''); setWarning(''); setLoading(false); setWarningDismissed(false)
  }

  const getInputs = () => {
    switch (activeTab) {
      case 'masterCV':          return { docs }
      case 'tailoredCV':        return { cv, jd }
      case 'coverLetter':       return { cv, jd, company, role }
      case 'intro90General':    return { cv }
      case 'intro90Role':       return { cv, jd, company }
      case 'deepInterviewPrep': return { cv, jd, company, interviewers }
    }
  }

  const hardValidate = () => {
    if (activeTab === 'masterCV' && !docs.trim()) return 'Please paste your career documents.'
    if (activeTab !== 'masterCV' && !cv.trim()) return 'Please enter your CV.'
    if (['tailoredCV','coverLetter','intro90Role','deepInterviewPrep'].includes(activeTab) && !jd.trim()) return 'Please enter the job description.'
    return ''
  }

  const softValidate = () => {
    if (['coverLetter','intro90Role','deepInterviewPrep'].includes(activeTab) && !company.trim() && !warningDismissed)
      return 'No company name entered — the output may be less targeted.'
    return ''
  }

  const runGenerate = async (skipWarning = false) => {
    const hard = hardValidate(); if (hard) { setError(hard); setWarning(''); return }
    const soft = softValidate(); if (soft && !skipWarning) { setWarning(soft); return }
    if (skipWarning) setWarningDismissed(true)
    setWarning(''); setError('')
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController(); abortRef.current = controller
    setOutput(''); setLoading(true)

    try {
      const res = await fetch('/api/generate', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ tool: activeTab, inputs: getInputs(), format: cvFormat, tone: coverTone, length }),
        signal: controller.signal,
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Generation failed') }
      const reader = res.body?.getReader(); if (!reader) throw new Error('No stream')
      const decoder = new TextDecoder(); let acc = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        acc += decoder.decode(value, { stream:true }); setOutput(acc)
      }
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally { setLoading(false); abortRef.current = null }
  }

  const download = async () => {
    if (!output || downloading) return
    setDownloading(true)
    try {
      const tool = TOOLS.find(t => t.id === activeTab)
      const nameSlug = candidateName.trim() ? `_${candidateName.trim().replace(/\s+/g,'_')}` : ''
      const filename = `${(tool?.label||'output').replace(/[\s\(\)]/g,'_')}${nameSlug}`
      const res = await fetch('/api/docx', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ text: output, filename, palette, format: activeTab === "tailoredCV" ? cvFormat : "classic" }) })
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href=url; a.download=`${filename}.docx`; a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Download failed. Try copying instead.') }
    finally { setDownloading(false) }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(output)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const scrollToSection = (marker: string) => {
    if (!outputRef.current) return
    const divs = outputRef.current.querySelectorAll('div')
    for (const div of Array.from(divs)) {
      if (div.textContent?.includes(marker)) { div.scrollIntoView({ behavior:'smooth', block:'start' }); break }
    }
  }

  const showFormatPalette = activeTab === 'tailoredCV'
  const showCoverTone = activeTab === 'coverLetter'
  const showLength = ['tailoredCV','masterCV'].includes(activeTab)
  const showInterviewNav = activeTab === 'deepInterviewPrep' && output && !loading

  const S: React.CSSProperties = { fontFamily:"'Inter', system-ui, sans-serif" }

  return (
    <div style={{ minHeight:'100vh', background:'#F5EFF1', ...S }}>

      {/* Header */}
      <header style={{ background:'#fff', borderBottom:'1px solid #E8DDE0', padding:'0 24px' }}>
        <div style={{ maxWidth:'1320px', margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', height:'62px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'11px' }}>
            <InukshukLogo size={38} />
            <div>
              <div style={{ fontSize:'15px', fontWeight:700, color:'#932B46' }}>The Cache Group</div>
              <div style={{ fontSize:'11px', color:'#9E8A8E', letterSpacing:'.05em' }}>CV Suite — Full Access</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
            <TextField id="candidateName" label="" value={candidateName} onChange={setCandidateName} placeholder="Candidate name (for filename)" />
            <a href="mailto:matt@thecachegroup.com.au" style={{ fontSize:'13px', fontWeight:600, color:'#932B46', border:'1.5px solid #932B46', borderRadius:'6px', padding:'7px 16px', textDecoration:'none', whiteSpace:'nowrap' }}>Contact Us</a>
          </div>
        </div>
      </header>

      {/* Privacy banner */}
      <div style={{ background:'#2D1F22', padding:'10px 24px' }}>
        <p style={{ fontSize:'12px', fontWeight:600, color:'#fff', margin:0, textAlign:'center' }}>
          🔒 Your documents are never stored or saved. Nothing you enter is seen by us. All outputs download directly to your device.
        </p>
      </div>

      <main style={{ maxWidth:'1320px', margin:'0 auto', padding:'22px 24px' }}>

        {/* Tool tabs */}
        <div style={{ marginBottom:'18px' }}>
          <div style={{ fontSize:'11px', fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', color:'#9E8A8E', marginBottom:'8px' }}>Your Tools</div>
          <div style={{ display:'flex', gap:'7px', flexWrap:'wrap', alignItems:'center' }}>
            {TOOLS.map(tab => (
              <button key={tab.id} onClick={() => switchTab(tab.id)}
                style={{ padding:'9px 16px', borderRadius:'8px', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:activeTab===tab.id?700:500, background:activeTab===tab.id?'#932B46':'#fff', color:activeTab===tab.id?'#fff':'#6B5B5F', boxShadow:activeTab===tab.id?'0 2px 8px rgba(147,43,70,.25)':'0 1px 3px rgba(0,0,0,.07)', whiteSpace:'nowrap', fontFamily:'inherit' }}>
                {tab.label}
              </button>
            ))}
            <button onClick={resetAll} style={{ marginLeft:'auto', padding:'7px 14px', borderRadius:'7px', border:'1px solid #D4C5C9', background:'#fff', color:'#888', fontSize:'12px', cursor:'pointer', fontFamily:'inherit' }}>
              ↺ Reset all
            </button>
          </div>
        </div>

        <p style={{ fontSize:'13px', color:'#6B5B5F', marginBottom:'18px' }}>{TOOLS.find(t=>t.id===activeTab)?.desc}</p>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'18px', alignItems:'start' }}>

          {/* INPUT PANEL */}
          <div style={{ background:'#fff', borderRadius:'12px', padding:'22px', boxShadow:'0 1px 4px rgba(0,0,0,.08)' }}>
            <h2 style={{ fontSize:'12px', fontWeight:700, color:'#932B46', letterSpacing:'.08em', textTransform:'uppercase', margin:'0 0 18px' }}>Inputs</h2>

            {activeTab === 'masterCV' && (
              <DragArea id="docs" label="All Career Documents" value={docs} onChange={setDocs} onClear={()=>setDocs('')}
                placeholder="Paste all career documents here — CVs, LinkedIn, notes, achievements…" rows={12} />
            )}

            {activeTab !== 'masterCV' && (
              <DragArea id="cv" label="Your CV" value={cv} onChange={setCv} onClear={()=>setCv('')}
                placeholder="Paste your CV here, or drag and drop a file…" rows={7} />
            )}

            {['tailoredCV','coverLetter','intro90Role','deepInterviewPrep'].includes(activeTab) && (
              <DragArea id="jd" label="Job Description" value={jd} onChange={setJd} onClear={()=>setJd('')}
                placeholder="Paste the job description here…" rows={5} />
            )}

            {['coverLetter','intro90Role','deepInterviewPrep'].includes(activeTab) && (
              <TextField id="company" label="Company Name" value={company} onChange={setCompany} onClear={()=>setCompany('')} placeholder="e.g. Deloitte" />
            )}

            {activeTab === 'coverLetter' && (
              <TextField id="role" label="Role Title" value={role} onChange={setRole} onClear={()=>setRole('')} placeholder="e.g. Senior Business Analyst" />
            )}

            {activeTab === 'deepInterviewPrep' && (
              <TextField id="interviewers" label="Interviewer Names & Titles" value={interviewers} onChange={setInterviewers} onClear={()=>setInterviewers('')}
                placeholder={"e.g.\nSarah Chen — Head of Finance\nhttps://linkedin.com/in/sarahchen\n\nMarcus Webb — CFO\nhttps://linkedin.com/in/marcuswebb"} rows={5} />
            )}

            {/* Divider before options */}
            {(showFormatPalette || showCoverTone || showLength) && (
              <div style={{ height:'1px', background:'#EDE5E7', margin:'16px 0' }} />
            )}

            {/* Cover letter tone */}
            {showCoverTone && (
              <div style={{ marginBottom:'16px' }}>
                <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#6B5B5F', marginBottom:'8px' }}>Tone</div>
                <div style={{ display:'flex', gap:'7px' }}>
                  {COVER_TONES.map(t => (
                    <button key={t.id} onClick={() => setCoverTone(t.id)}
                      style={{ flex:1, padding:'9px 6px', borderRadius:'8px', border:`2px solid ${coverTone===t.id?'#932B46':'#E8DDE0'}`, background:coverTone===t.id?'#FDF5F7':'#fff', cursor:'pointer', textAlign:'center', fontFamily:'inherit' }}>
                      <div style={{ fontSize:'12px', fontWeight:coverTone===t.id?700:500, color:coverTone===t.id?'#932B46':'#1A1A1A' }}>{t.label}</div>
                      <div style={{ fontSize:'10px', color:'#AAA', marginTop:'1px' }}>{t.tag}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CV format thumbnails */}
            {showFormatPalette && (
              <div style={{ marginBottom:'14px' }}>
                <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#6B5B5F', marginBottom:'8px' }}>CV Format</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'7px' }}>
                  {CV_FORMATS.map(f => {
                    const Preview = FORMAT_PREVIEWS[f.id]
                    const on = cvFormat === f.id
                    return (
                      <button key={f.id} onClick={() => setCvFormat(f.id)}
                        style={{ padding:'9px 7px', borderRadius:'9px', border:`2px solid ${on?'#932B46':'#E8DDE0'}`, background:on?'#FDF5F7':'#fff', cursor:'pointer', textAlign:'center', fontFamily:'inherit', boxShadow:on?'0 2px 8px rgba(147,43,70,.12)':'none' }}>
                        <Preview />
                        <div style={{ fontSize:'10px', fontWeight:on?700:500, color:on?'#932B46':'#1A1A1A', marginTop:'6px', lineHeight:'1.3' }}>{f.label}</div>
                        <div style={{ fontSize:'9px', color:'#AAA', marginTop:'1px' }}>{f.tag}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Colour palette */}
            {showFormatPalette && (
              <div style={{ marginBottom:'14px' }}>
                <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#6B5B5F', marginBottom:'8px' }}>Colour Palette</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'7px' }}>
                  {PALETTES.map(p => {
                    const on = palette === p.id
                    return (
                      <button key={p.id} onClick={() => setPalette(p.id)}
                        style={{ padding:'9px 7px', borderRadius:'9px', border:`2px solid ${on?'#932B46':'#E8DDE0'}`, background:on?'#FDF5F7':'#fff', cursor:'pointer', textAlign:'center', fontFamily:'inherit', boxShadow:on?'0 2px 8px rgba(147,43,70,.12)':'none' }}>
                        <div style={{ display:'flex', height:'22px', borderRadius:'4px', overflow:'hidden', marginBottom:'6px' }}>
                          {p.colors.map((c,i) => <div key={i} style={{ flex:1, background:c }} />)}
                        </div>
                        <div style={{ fontSize:'10px', fontWeight:on?700:500, color:on?'#932B46':'#1A1A1A', lineHeight:'1.3' }}>{p.label}</div>
                        <div style={{ fontSize:'9px', color:'#AAA', marginTop:'1px' }}>{p.tag}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Length */}
            {showLength && (
              <div style={{ marginBottom:'16px' }}>
                <label htmlFor="length" style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#6B5B5F', display:'block', marginBottom:'6px' }}>Length Preference</label>
                <select id="length" value={length} onChange={e => setLength(e.target.value)}
                  style={{ width:'100%', padding:'9px 13px', fontSize:'13px', color:'#1A1A1A', background:'#FAFAFA', border:'2px solid #D4C5C9', borderRadius:'8px', outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
                  {LENGTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}

            {/* Errors & warnings */}
            {error && (
              <div style={{ padding:'10px 13px', background:'#FDF0F2', border:'1px solid #F5C5CE', borderRadius:'8px', fontSize:'13px', color:'#932B46', marginBottom:'14px' }}>{error}</div>
            )}
            {warning && (
              <div style={{ padding:'11px 13px', background:'#FFF8E8', border:'1px solid #F5D87A', borderRadius:'8px', fontSize:'13px', color:'#7A5C00', marginBottom:'12px' }}>
                <div style={{ marginBottom:'8px' }}>⚠️ {warning}</div>
                <button onClick={() => runGenerate(true)}
                  style={{ padding:'6px 14px', background:'#7A5C00', color:'#fff', border:'none', borderRadius:'6px', fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  Generate Anyway
                </button>
              </div>
            )}

            <button onClick={() => runGenerate()} disabled={loading}
              style={{ width:'100%', padding:'13px', background:loading?'#C47A8E':'#932B46', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:700, cursor:loading?'not-allowed':'pointer', fontFamily:'inherit' }}>
              {loading ? 'Generating…' : 'Generate'}
            </button>
          </div>

          {/* OUTPUT PANEL */}
          <div style={{ background:'#fff', borderRadius:'12px', padding:'22px', boxShadow:'0 1px 4px rgba(0,0,0,.08)', minHeight:'500px', display:'flex', flexDirection:'column' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <h2 style={{ fontSize:'12px', fontWeight:700, color:'#932B46', letterSpacing:'.08em', textTransform:'uppercase', margin:0 }}>Output</h2>
                {output && <span style={{ fontSize:'11px', color:'#9E8A8E' }}>{wordCount.toLocaleString()} words · ~{estPages} {estPages === 1 ? 'page' : 'pages'}</span>}
              </div>
              {output && (
                <div style={{ display:'flex', gap:'7px' }}>
                  <button onClick={copy} style={{ fontSize:'12px', color:copied?'#932B46':'#6B5B5F', background:'none', border:'1px solid #E8DDE0', borderRadius:'6px', padding:'4px 12px', cursor:'pointer', fontWeight:600, fontFamily:'inherit' }}>
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={download} disabled={downloading}
                    style={{ fontSize:'12px', color:'#fff', background:downloading?'#C47A8E':'#932B46', border:'none', borderRadius:'6px', padding:'4px 12px', cursor:downloading?'not-allowed':'pointer', fontWeight:600, fontFamily:'inherit' }}>
                    {downloading ? 'Preparing…' : 'Download .docx'}
                  </button>
                </div>
              )}
            </div>

            {/* Interview prep section nav */}
            {showInterviewNav && (
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'14px', paddingBottom:'12px', borderBottom:'1px solid #EDE5E7' }}>
                {INTERVIEW_SECTIONS.map(s => (
                  <button key={s.marker} onClick={() => scrollToSection(s.marker)}
                    style={{ padding:'4px 10px', borderRadius:'6px', border:'1px solid #E8DDE0', background:'#FAFAFA', fontSize:'11px', color:'#6B5B5F', cursor:'pointer', fontFamily:'inherit', fontWeight:500 }}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {!output && !loading && (
              <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#C4B0B4', fontSize:'14px', textAlign:'center' }}>
                Fill in the inputs and click Generate
              </div>
            )}
            {loading && !output && (
              <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#9E8A8E', fontSize:'14px' }}>Generating…</div>
            )}
            {output && (
              <div ref={outputRef} style={{ flex:1, fontSize:'13px', color:'#1A1A1A', overflowY:'auto', maxHeight:'700px', lineHeight:'1.6' }}>
                {renderOutput(output)}
              </div>
            )}
          </div>
        </div>

        <p style={{ textAlign:'center', fontSize:'11px', color:'#B09CA0', marginTop:'28px' }}>
          © {new Date().getFullYear()} The Cache Group &nbsp;·&nbsp;
          <a href="https://thecachegroup.com.au" target="_blank" rel="noopener noreferrer" style={{ color:'#B09CA0', textDecoration:'none' }}>thecachegroup.com.au</a>
        </p>
      </main>
    </div>
  )
}
