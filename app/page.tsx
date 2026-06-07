'use client'

import { useState, useRef, useCallback, DragEvent, ChangeEvent, ReactNode } from 'react'
import Image from 'next/image'

type Tool = 'masterCV' | 'tailoredCV' | 'coverLetter' | 'intro90General' | 'intro90Role' | 'deepInterviewPrep'
type CVFormat = 'classic' | 'hybrid' | 'executive' | 'modern'

const TOOLS: { id: Tool; label: string; desc: string }[] = [
  { id: 'masterCV',          label: 'Master CV',            desc: 'Consolidate multiple CVs, notes, and career documents into one authoritative base CV.' },
  { id: 'tailoredCV',        label: 'Tailored CV',          desc: 'Tailor your CV to a specific role. Generate first, then choose your preferred format.' },
  { id: 'coverLetter',       label: 'Cover Letter',         desc: 'A targeted cover letter aligned to the role — no padding, no clichés.' },
  { id: 'intro90General',    label: '90-Sec Intro',         desc: 'A polished spoken introduction for networking events and cold meetings.' },
  { id: 'intro90Role',       label: '90-Sec Intro (Role)',  desc: 'A tailored interview opener connecting your experience to the specific role and company.' },
  { id: 'deepInterviewPrep', label: 'Deep Interview Prep',  desc: '8 competency scenarios with 3 questions each, interviewer profiling, self-calibration, and deal-breakers.' },
]

const CV_FORMATS: { id: CVFormat; label: string; tag: string }[] = [
  { id: 'classic',   label: 'Classic Chronological', tag: 'ATS-safe · Traditional'   },
  { id: 'hybrid',    label: 'Hybrid / Combination',  tag: 'Skills-forward · Modern'   },
  { id: 'executive', label: 'Executive Profile',      tag: 'Senior roles · High impact' },
  { id: 'modern',    label: 'Modern Single-Column',   tag: 'Clean · Contemporary'      },
]

// ── Inukshuk SVG ──────────────────────────────────────────────────────────────
function InukshukLogo({ size = 40, color = '#932B46' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="18" rx="12" ry="14" fill={color} />
      <rect x="28" y="34" width="44" height="11" rx="5" fill={color} />
      <rect x="34" y="47" width="32" height="9"  rx="4" fill={color} />
      <rect x="22" y="58" width="56" height="11" rx="5" fill={color} />
      <rect x="28" y="71" width="16" height="22" rx="6" fill={color} />
      <rect x="56" y="71" width="16" height="22" rx="6" fill={color} />
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
      if (code.trim().toLowerCase() === expected.toLowerCase()) {
        onUnlock()
      } else {
        setError('Incorrect access code. Please try again.')
        setChecking(false)
      }
    }, 400)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5EFF1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#FFF', borderRadius: '16px', padding: '48px 40px', width: '100%', maxWidth: '420px', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <InukshukLogo size={52} color="#932B46" />
        </div>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9E8A8E', marginBottom: '8px' }}>The Cache Group</div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A1A', margin: '0 0 6px 0' }}>CV Suite — Full Access</h1>
        <p style={{ fontSize: '14px', color: '#9E8A8E', margin: '0 0 32px 0', lineHeight: '1.6' }}>Enter your access code to continue.</p>
        <input
          type="password"
          value={code}
          onChange={e => setCode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && check()}
          placeholder="Access code"
          style={{ width: '100%', padding: '13px 16px', fontSize: '15px', color: '#1A1A1A', background: '#FAFAFA', border: '1.5px solid #D4C5C9', borderRadius: '8px', outline: 'none', marginBottom: '14px', boxSizing: 'border-box', fontFamily: 'inherit', textAlign: 'center', letterSpacing: '0.1em' }}
        />
        {error && (
          <div style={{ padding: '10px 14px', background: '#FDF0F2', border: '1px solid #F5C5CE', borderRadius: '7px', fontSize: '13px', color: '#932B46', marginBottom: '14px' }}>{error}</div>
        )}
        <button onClick={check} disabled={checking || !code.trim()}
          style={{ width: '100%', padding: '14px', background: checking ? '#C47A8E' : '#932B46', color: '#FFF', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: checking ? 'not-allowed' : 'pointer' }}>
          {checking ? 'Checking…' : 'Enter Suite'}
        </button>
      </div>
    </div>
  )
}

// ── Output renderer ───────────────────────────────────────────────────────────
function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    return part
  })
}

function renderOutput(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const lines = text.split('\n')
  lines.forEach((line, i) => {
    const trimmed = line.trim()
    if (trimmed === '---') {
      nodes.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid #E0E0E0', margin: '14px 0' }} />)
    } else if (trimmed.length > 2 && trimmed === trimmed.toUpperCase() && /^[A-Z][A-Z\s&\/()–\-0-9]+$/.test(trimmed)) {
      nodes.push(<div key={i} style={{ fontSize: '11px', fontWeight: 700, color: '#932B46', letterSpacing: '0.1em', marginTop: '20px', marginBottom: '6px' }}>{trimmed}</div>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      nodes.push(
        <div key={i} style={{ display: 'flex', gap: '8px', lineHeight: '1.6', marginBottom: '4px', paddingLeft: '4px' }}>
          <span style={{ color: '#932B46', flexShrink: 0, marginTop: '1px' }}>•</span>
          <span>{renderInline(line.replace(/^[-*] /, ''))}</span>
        </div>
      )
    } else if (trimmed === '') {
      nodes.push(<div key={i} style={{ height: '8px' }} />)
    } else {
      nodes.push(<div key={i} style={{ lineHeight: '1.6', marginBottom: '2px' }}>{renderInline(line)}</div>)
    }
  })
  return nodes
}

// ── DragArea ──────────────────────────────────────────────────────────────────
interface DragAreaProps {
  id: string; label: string; value: string
  onChange: (val: string) => void; onClear: () => void
  placeholder?: string; rows?: number
}

function DragArea({ id, label, value, onChange, onClear, placeholder, rows = 8 }: DragAreaProps) {
  const [dragging, setDragging] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const extractFile = async (file: File) => {
    setExtracting(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/extract', { method: 'POST', body: fd })
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

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <label htmlFor={id} style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B5B5F' }}>{label}</label>
        {value && <button onClick={onClear} style={{ fontSize: '11px', color: '#555', background: '#F0F0F0', border: '1px solid #CCC', borderRadius: '4px', cursor: 'pointer', padding: '2px 10px', fontWeight: 500 }}>Clear</button>}
      </div>
      <div onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
        style={{ borderRadius: '8px', border: `2px ${dragging ? 'solid' : 'dashed'} ${dragging ? '#932B46' : '#D4C5C9'}`, background: dragging ? '#FDF4F6' : '#FAFAFA', transition: 'all 0.15s' }}>
        <textarea id={id} value={extracting ? 'Extracting text from file…' : value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} rows={rows} disabled={extracting}
          style={{ width: '100%', padding: '12px 14px', fontSize: '14px', lineHeight: '1.6', color: '#1A1A1A', background: 'transparent', border: 'none', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px 8px', borderTop: '1px solid #EDE5E7' }}>
          <span style={{ fontSize: '11px', color: '#9E8A8E' }}>{extracting ? 'Reading file…' : 'Drop a .txt, .docx, or .pdf — or paste text above'}</span>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={extracting}
            style={{ fontSize: '11px', color: '#932B46', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', fontWeight: 600 }}>Browse file</button>
        </div>
        <input ref={inputRef} type="file" accept=".txt,.docx,.pdf" onChange={onFileChange} style={{ display: 'none' }} />
      </div>
    </div>
  )
}

// ── TextField ─────────────────────────────────────────────────────────────────
function TextField({ id, label, value, onChange, onClear, placeholder, rows }: { id: string; label: string; value: string; onChange: (v: string) => void; onClear?: () => void; placeholder?: string; rows?: number }) {
  const isMulti = rows && rows > 1
  const baseStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', fontSize: '14px', color: '#1A1A1A', background: '#FAFAFA', border: '2px dashed #D4C5C9', borderRadius: '8px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <label htmlFor={id} style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B5B5F' }}>{label}</label>
        {onClear && value && <button onClick={onClear} style={{ fontSize: '11px', color: '#555', background: '#F0F0F0', border: '1px solid #CCC', borderRadius: '4px', cursor: 'pointer', padding: '2px 10px', fontWeight: 500 }}>Clear</button>}
      </div>
      {isMulti
        ? <textarea id={id} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{ ...baseStyle, resize: 'vertical' }} />
        : <input id={id} type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={baseStyle} />
      }
    </div>
  )
}

// ── Format buttons ─────────────────────────────────────────────────────────────
function FormatBar({ active, onSelect, loading }: { active: CVFormat | null; onSelect: (f: CVFormat) => void; loading: boolean }) {
  return (
    <div style={{ marginTop: '20px', paddingTop: '18px', borderTop: '1px solid #E8DDE0' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B5B5F', marginBottom: '10px' }}>
        Reformat this CV
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {CV_FORMATS.map(f => (
          <button key={f.id} onClick={() => onSelect(f.id)} disabled={loading}
            title={f.tag}
            style={{
              padding: '9px 16px', borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '13px', fontWeight: active === f.id ? 700 : 500,
              background: active === f.id ? '#932B46' : '#F0E8EA',
              color: active === f.id ? '#FFF' : '#6B5B5F',
              transition: 'all 0.15s',
            }}>
            {f.label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: '11px', color: '#9E8A8E', marginTop: '8px' }}>
        Same content — different layout. Download whichever version you prefer.
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [unlocked, setUnlocked] = useState(false)
  const [activeTab, setActiveTab] = useState<Tool>('masterCV')

  // Shared inputs
  const [cv, setCv] = useState('')
  const [jd, setJd] = useState('')
  const [docs, setDocs] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [interviewers, setInterviewers] = useState('')

  // Output state
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [activeFormat, setActiveFormat] = useState<CVFormat | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  if (!unlocked) return <AccessGate onUnlock={() => setUnlocked(true)} />

  const switchTab = (tab: Tool) => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null }
    setActiveTab(tab); setOutput(''); setError(''); setLoading(false); setActiveFormat(null)
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

  const validate = () => {
    if (activeTab === 'masterCV' && !docs.trim()) return 'Please paste your career documents.'
    if (activeTab !== 'masterCV' && !cv.trim()) return 'Please enter your CV.'
    if (['tailoredCV', 'coverLetter', 'intro90Role', 'deepInterviewPrep'].includes(activeTab) && !jd.trim()) return 'Please enter the job description.'
    if (['coverLetter', 'intro90Role', 'deepInterviewPrep'].includes(activeTab) && !company.trim()) return 'Please enter the company name.'
    return ''
  }

  const runGenerate = async (format?: CVFormat) => {
    const err = validate(); if (err) { setError(err); return }
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController(); abortRef.current = controller
    setError(''); setOutput(''); setLoading(true)
    if (format) setActiveFormat(format)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: activeTab, inputs: getInputs(), format: format || undefined }),
        signal: controller.signal,
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Generation failed') }
      const reader = res.body?.getReader(); if (!reader) throw new Error('No stream')
      const decoder = new TextDecoder(); let acc = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        acc += decoder.decode(value, { stream: true }); setOutput(acc)
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
      const formatLabel = activeFormat ? `_${activeFormat}` : ''
      const filename = `${(tool?.label || 'output').replace(/[\s()]/g, '_')}${formatLabel}`
      const res = await fetch('/api/docx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: output, filename }) })
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `${filename}.docx`; a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Download failed. Try copying instead.') }
    finally { setDownloading(false) }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(output)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const showFormatBar = activeTab === 'tailoredCV' && output && !loading

  return (
    <div style={{ minHeight: '100vh', background: '#F5EFF1', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Header */}
      <header style={{ background: '#FFF', borderBottom: '1px solid #E8DDE0', padding: '0 24px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Image src="/tcg-icon.png" alt="The Cache Group" width={40} height={40} style={{ objectFit: 'contain' }} />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#932B46' }}>The Cache Group</div>
              <div style={{ fontSize: '11px', color: '#9E8A8E', letterSpacing: '0.05em' }}>CV Suite — Full Access</div>
            </div>
          </div>
          <a href="mailto:matt@thecachegroup.com.au"
            style={{ fontSize: '13px', fontWeight: 600, color: '#932B46', background: 'transparent', border: '1.5px solid #932B46', borderRadius: '6px', padding: '8px 18px', cursor: 'pointer', textDecoration: 'none' }}>
            Contact Us
          </a>
        </div>
      </header>

      {/* Privacy banner */}
      <div style={{ background: '#2D1F22', padding: '12px 24px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <span style={{ fontSize: '16px' }}>🔒</span>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#FFF', margin: 0, textAlign: 'center' }}>
            Your documents are never stored or saved. Nothing you enter is seen by us. All content downloads directly to your device.
          </p>
        </div>
      </div>

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '28px 24px' }}>

        {/* Tool tabs */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9E8A8E', marginBottom: '10px' }}>Your Tools</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {TOOLS.map(tab => (
              <button key={tab.id} onClick={() => switchTab(tab.id)}
                style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: activeTab === tab.id ? 700 : 500, background: activeTab === tab.id ? '#932B46' : '#FFF', color: activeTab === tab.id ? '#FFF' : '#6B5B5F', boxShadow: activeTab === tab.id ? '0 2px 8px rgba(147,43,70,0.25)' : '0 1px 3px rgba(0,0,0,0.08)', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <p style={{ fontSize: '14px', color: '#6B5B5F', marginBottom: '20px' }}>
          {TOOLS.find(t => t.id === activeTab)?.desc}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>

          {/* Input panel */}
          <div style={{ background: '#FFF', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#932B46', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 20px 0' }}>Inputs</h2>

            {/* Master CV */}
            {activeTab === 'masterCV' && (
              <DragArea id="docs" label="All Career Documents" value={docs} onChange={setDocs} onClear={() => setDocs('')}
                placeholder="Paste all your career documents here — multiple CVs, LinkedIn text, achievement lists, notes. Everything goes in one box." rows={14} />
            )}

            {/* CV input (most tools) */}
            {activeTab !== 'masterCV' && (
              <DragArea id="cv" label="Your CV" value={cv} onChange={setCv} onClear={() => setCv('')}
                placeholder="Paste your CV here, or drag and drop a file…" rows={activeTab === 'intro90General' ? 14 : 9} />
            )}

            {/* JD input */}
            {['tailoredCV', 'coverLetter', 'intro90Role', 'deepInterviewPrep'].includes(activeTab) && (
              <DragArea id="jd" label="Job Description" value={jd} onChange={setJd} onClear={() => setJd('')}
                placeholder="Paste the job description here…" rows={6} />
            )}

            {/* Company name */}
            {['coverLetter', 'intro90Role', 'deepInterviewPrep'].includes(activeTab) && (
              <TextField id="company" label="Company Name" value={company} onChange={setCompany} onClear={() => setCompany('')} placeholder="e.g. Deloitte" />
            )}

            {/* Role title (cover letter only) */}
            {activeTab === 'coverLetter' && (
              <TextField id="role" label="Role Title" value={role} onChange={setRole} onClear={() => setRole('')} placeholder="e.g. Senior Business Analyst" />
            )}

            {/* Interviewers (deep prep only) */}
            {activeTab === 'deepInterviewPrep' && (
              <TextField id="interviewers" label="Interviewer Names & Titles" value={interviewers} onChange={setInterviewers}
                onClear={() => setInterviewers('')}
                placeholder={"e.g.\nSarah Chen — Head of Finance\nMarcus Webb — CFO\nHR Panel"}
                rows={4} />
            )}

            {error && (
              <div style={{ padding: '10px 14px', background: '#FDF0F2', border: '1px solid #F5C5CE', borderRadius: '8px', fontSize: '13px', color: '#932B46', marginBottom: '16px' }}>{error}</div>
            )}

            <button onClick={() => runGenerate()} disabled={loading}
              style={{ width: '100%', padding: '13px', background: loading ? '#C47A8E' : '#932B46', color: '#FFF', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
              {loading ? 'Generating…' : 'Generate'}
            </button>
          </div>

          {/* Output panel */}
          <div style={{ background: '#FFF', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#932B46', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>Output</h2>
              {output && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={copy} style={{ fontSize: '12px', color: copied ? '#932B46' : '#6B5B5F', background: 'none', border: '1px solid #E8DDE0', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer', fontWeight: 600 }}>
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={download} disabled={downloading} style={{ fontSize: '12px', color: '#FFF', background: downloading ? '#C47A8E' : '#932B46', border: 'none', borderRadius: '6px', padding: '4px 12px', cursor: downloading ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                    {downloading ? 'Preparing…' : 'Download .docx'}
                  </button>
                </div>
              )}
            </div>

            {!output && !loading && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C4B0B4', fontSize: '14px', textAlign: 'center' }}>
                Fill in the inputs and click Generate
              </div>
            )}
            {loading && !output && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9E8A8E', fontSize: '14px' }}>Generating…</div>
            )}
            {output && (
              <div style={{ flex: 1, fontSize: '13px', color: '#1A1A1A', overflowY: 'auto', maxHeight: '680px' }}>
                {renderOutput(output)}
                {showFormatBar && <FormatBar active={activeFormat} onSelect={(f) => runGenerate(f)} loading={loading} />}
              </div>
            )}
          </div>

        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', color: '#B09CA0', marginTop: '32px' }}>
          © {new Date().getFullYear()} The Cache Group &nbsp;·&nbsp;
          <a href="https://thecachegroup.com.au" target="_blank" rel="noopener noreferrer" style={{ color: '#B09CA0', textDecoration: 'none' }}>thecachegroup.com.au</a>
        </p>
      </main>
    </div>
  )
}
