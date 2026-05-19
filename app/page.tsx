'use client'

import { useState, useRef, useCallback, DragEvent } from 'react'
import Image from 'next/image'
import { extractTextFromFile } from '@/lib/extractText'

type Tool = 'baseCV' | 'tailoredCV' | 'intro90Generic' | 'intro90RoleFocused' | 'interviewPrep'

const TOOLS: { id: Tool; label: string; tag: string; description: string; icon: string; filename: string }[] = [
  { id: 'baseCV', label: 'Master CV', tag: 'Consolidate', description: 'Merge multiple career documents into one comprehensive, ATS-safe master CV — your source of truth for all applications.', icon: '◈', filename: 'master-cv.txt' },
  { id: 'tailoredCV', label: 'Tailored CV', tag: 'Apply', description: 'Transform your base CV into a focused, ATS-optimised application tailored to a specific role and job description.', icon: '◎', filename: 'tailored-cv.txt' },
  { id: 'intro90Generic', label: '90-Sec Intro', tag: 'Generic', description: 'A polished 170–230 word professional introduction for networking events, executive meetings, and industry forums.', icon: '◉', filename: '90-second-introduction.txt' },
  { id: 'intro90RoleFocused', label: '90-Sec Intro', tag: 'Role-Specific', description: 'A strategic 180–240 word interview introduction tailored to a specific role, company, and hiring mandate.', icon: '◑', filename: '90-second-intro-role.txt' },
  { id: 'interviewPrep', label: 'Interview Prep', tag: 'Full Pack', description: 'Complete preparation pack: company intelligence, interviewer analysis, 40+ Q&As, self-calibration, and questions to ask.', icon: '◆', filename: 'interview-prep-pack.txt' },
]

const base: React.CSSProperties = {
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: '7px',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)',
  fontSize: '14px',
  lineHeight: '1.6',
  padding: '11px 13px',
  width: '100%',
  outline: 'none',
  transition: 'border-color 0.15s, background 0.15s',
  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-secondary)', marginBottom: '7px' }}>
      {children}
    </label>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column' as const }}><Label>{label}</Label>{children}</div>
}

function useDrop(onChange: (v: string) => void) {
  const [dragging, setDragging] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState('')
  const onDragOver = (e: DragEvent) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)
  const onDrop = async (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    setError('')
    const file = e.dataTransfer.files[0]
    if (!file) return
    setExtracting(true)
    try {
      const text = await extractTextFromFile(file)
      onChange(text)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not read file')
    } finally {
      setExtracting(false)
    }
  }
  return { dragging, extracting, error, onDragOver, onDragLeave, onDrop }
}

function Textarea({ placeholder, value, onChange, rows = 8 }: { placeholder: string; value: string; onChange: (v: string) => void; rows?: number }) {
  const { dragging, extracting, error, onDragOver, onDragLeave, onDrop } = useDrop(onChange)
  return (
    <div style={{ position: 'relative' as const }}>
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{ ...base, minHeight: `${rows * 22}px`, resize: 'vertical' as const, borderColor: dragging ? 'var(--accent)' : error ? 'var(--danger)' : undefined, background: dragging ? 'var(--accent-light)' : undefined }}
        onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-active)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-glow)' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)' }}
      />
      {(dragging || extracting) && (
        <div style={{ position: 'absolute' as const, inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' as const, borderRadius: '7px', background: 'var(--accent-light)' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>
            {extracting ? 'Extracting text...' : 'Drop to import'}
          </span>
        </div>
      )}
      {error && <p style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '5px' }}>{error}</p>}
    </div>
  )
}

function TextInput({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <input type="text" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} style={base}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-active)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-glow)' }}
      onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)' }}
    />
  )
}

export default function Home() {
  const [activeTool, setActiveTool] = useState<Tool>('tailoredCV')
  const [output, setOutput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const [cvText, setCvText] = useState('')
  const [documents, setDocuments] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [interviewers, setInterviewers] = useState('')
  const [additionalContext, setAdditionalContext] = useState('')
  const [notes, setNotes] = useState('')

  const getInputs = useCallback(() => {
    switch (activeTool) {
      case 'baseCV': return { documents }
      case 'tailoredCV': return { cv: cvText, jobDescription, notes }
      case 'intro90Generic': return { cv: cvText }
      case 'intro90RoleFocused': return { cv: cvText, jobDescription, companyName }
      case 'interviewPrep': return { cv: cvText, jobDescription, companyName, interviewers, additionalContext }
    }
  }, [activeTool, cvText, documents, jobDescription, companyName, interviewers, additionalContext, notes])

  const isValid = useCallback(() => {
    switch (activeTool) {
      case 'baseCV': return documents.trim().length > 50
      case 'tailoredCV': return cvText.trim().length > 50 && jobDescription.trim().length > 50
      case 'intro90Generic': return cvText.trim().length > 50
      case 'intro90RoleFocused': return cvText.trim().length > 50 && jobDescription.trim().length > 50
      case 'interviewPrep': return cvText.trim().length > 50 && jobDescription.trim().length > 50
    }
  }, [activeTool, cvText, documents, jobDescription])

  const generate = useCallback(async () => {
    if (!isValid() || isGenerating) return
    abortRef.current = new AbortController()
    setIsGenerating(true)
    setOutput('')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: activeTool, inputs: getInputs() }),
        signal: abortRef.current.signal,
      })
      if (!res.ok) throw new Error('Failed')
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setOutput(acc)
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        setOutput('Generation failed. Please check your connection and try again.')
      }
    } finally {
      setIsGenerating(false)
    }
  }, [activeTool, getInputs, isValid, isGenerating])

  const stop = () => { abortRef.current?.abort(); setIsGenerating(false) }

  const copyOutput = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadOutput = () => {
    const tool = TOOLS.find(t => t.id === activeTool)!
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = tool.filename; a.click()
    URL.revokeObjectURL(url)
  }

  const clearAll = () => {
    setOutput('')
    switch (activeTool) {
      case 'baseCV': setDocuments(''); break
      case 'tailoredCV': setCvText(''); setJobDescription(''); setNotes(''); break
      case 'intro90Generic': setCvText(''); break
      case 'intro90RoleFocused': setCvText(''); setJobDescription(''); setCompanyName(''); break
      case 'interviewPrep': setCvText(''); setJobDescription(''); setCompanyName(''); setInterviewers(''); setAdditionalContext(''); break
    }
  }

  const currentTool = TOOLS.find(t => t.id === activeTool)!

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--border)', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', boxShadow: 'var(--shadow)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Image src="/logo.jpg" alt="The Cache Group" width={140} height={40} style={{ objectFit: 'contain', height: '36px', width: 'auto' }} priority />
          <div style={{ width: '1px', height: '28px', background: 'var(--border)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>CV Suite</span>
            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)' }}>AI-Powered</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '5px', padding: '5px 10px' }}>
          <span style={{ color: 'var(--success)', fontSize: '8px' }}>●</span>
          Nothing you enter is saved or stored
        </div>
      </header>

      {/* Tool Nav */}
      <nav style={{ borderBottom: '1px solid var(--border)', padding: '0 32px', display: 'flex', overflowX: 'auto', background: '#fff', flexShrink: 0 }}>
        {TOOLS.map(tool => (
          <button key={tool.id} onClick={() => { setActiveTool(tool.id); setOutput('') }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: '7px', borderBottom: activeTool === tool.id ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: '-1px', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: activeTool === tool.id ? 'var(--accent)' : 'var(--text-secondary)' }}>{tool.label}</span>
            <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: activeTool === tool.id ? 'var(--accent)' : 'var(--text-muted)', background: activeTool === tool.id ? 'var(--accent-light)' : 'transparent', padding: '2px 7px', borderRadius: '3px', border: `1px solid ${activeTool === tool.id ? 'var(--accent-dim)' : 'transparent'}` }}>
              {tool.tag}
            </span>
          </button>
        ))}
      </nav>

      {/* Main */}
      <main style={{ flex: 1, display: 'grid', gridTemplateColumns: '460px 1fr', minHeight: 0, overflow: 'hidden' }}>
        {/* Left */}
        <div style={{ borderRight: '1px solid var(--border)', padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px', background: 'var(--bg)' }}>
          <div style={{ padding: '13px 15px', background: 'var(--accent-light)', border: '1px solid #e8c0cc', borderRadius: '8px', display: 'flex', gap: '11px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '16px', color: 'var(--accent)', marginTop: '1px' }}>{currentTool.icon}</span>
            <p style={{ fontSize: '13px', color: '#5a2030', lineHeight: 1.65 }}>{currentTool.description}</p>
          </div>

          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '-6px' }}>
            Paste text or drag and drop a .txt, .docx, or .pdf file into any field.
          </p>

          {activeTool === 'baseCV' && (
            <Field label="Career Documents">
              <Textarea placeholder={"Paste all career documents here — multiple CV versions, LinkedIn text, achievement lists, notes, performance reviews.\n\nSeparate sources clearly (e.g. --- CV Version 1 ---, --- LinkedIn ---)"} value={documents} onChange={setDocuments} rows={18} />
            </Field>
          )}

          {activeTool !== 'baseCV' && (
            <Field label="Base CV / Resume">
              <Textarea placeholder="Paste the candidate's full CV or master CV here..." value={cvText} onChange={setCvText} rows={10} />
            </Field>
          )}

          {(activeTool === 'tailoredCV' || activeTool === 'intro90RoleFocused' || activeTool === 'interviewPrep') && (
            <Field label="Job Description">
              <Textarea placeholder="Paste the full job description or job advertisement here..." value={jobDescription} onChange={setJobDescription} rows={8} />
            </Field>
          )}

          {(activeTool === 'intro90RoleFocused' || activeTool === 'interviewPrep') && (
            <Field label="Company Name">
              <TextInput placeholder="e.g. Westpac Group, Telstra, KPMG Australia" value={companyName} onChange={setCompanyName} />
            </Field>
          )}

          {activeTool === 'tailoredCV' && (
            <Field label="Additional Notes (optional)">
              <Textarea placeholder="Recruiter notes, candidate notes, client or company context..." value={notes} onChange={setNotes} rows={4} />
            </Field>
          )}

          {activeTool === 'interviewPrep' && (
            <>
              <Field label="Interviewers (optional)">
                <Textarea placeholder={"List interviewers with names and titles, e.g.\nSarah Chen — Chief People Officer\nJames Wright — Head of Finance"} value={interviewers} onChange={setInterviewers} rows={4} />
              </Field>
              <Field label="Additional Context (optional)">
                <Textarea placeholder="Company announcements, strategic priorities, known challenges, cultural context..." value={additionalContext} onChange={setAdditionalContext} rows={4} />
              </Field>
            </>
          )}

          <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
            {!isGenerating ? (
              <button onClick={generate} disabled={!isValid()}
                style={{ flex: 1, background: isValid() ? 'var(--accent)' : '#e8dde0', color: isValid() ? '#fff' : 'var(--text-muted)', border: 'none', borderRadius: '7px', padding: '12px 20px', fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-body)', cursor: isValid() ? 'pointer' : 'not-allowed', transition: 'background 0.15s', boxShadow: isValid() ? 'var(--shadow-md)' : 'none' }}
                onMouseOver={e => { if (isValid()) e.currentTarget.style.background = 'var(--accent-hover)' }}
                onMouseOut={e => { if (isValid()) e.currentTarget.style.background = 'var(--accent)' }}>
                Generate {currentTool.label}
              </button>
            ) : (
              <button onClick={stop} style={{ flex: 1, background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: '7px', padding: '12px 20px', fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
                Stop
              </button>
            )}
            {(output || isGenerating) && (
              <button onClick={clearAll} style={{ background: 'none', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '7px', padding: '12px 16px', fontSize: '13px', fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}>
          {(output || isGenerating) && (
            <div style={{ padding: '12px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', flexShrink: 0 }}>
              <div>
                {isGenerating && <span className="shimmer-text" style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Generating...</span>}
                {!isGenerating && output && <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--success)' }}>✓ Complete</span>}
              </div>
              {output && !isGenerating && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={copyOutput} style={{ background: copied ? 'var(--accent-light)' : 'none', color: copied ? 'var(--accent)' : 'var(--text-secondary)', border: `1px solid ${copied ? 'var(--accent-dim)' : 'var(--border)'}`, borderRadius: '5px', padding: '5px 14px', fontSize: '12px', fontFamily: 'var(--font-body)', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}>
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={downloadOutput} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '5px', padding: '5px 16px', fontSize: '12px', fontFamily: 'var(--font-body)', fontWeight: 600, cursor: 'pointer', boxShadow: 'var(--shadow)' }}>
                    ↓ Download
                  </button>
                </div>
              )}
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', padding: output || isGenerating ? '32px 36px' : '0', display: 'flex', flexDirection: 'column' }}>
            {!output && !isGenerating && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '60px', opacity: 0.3 }}>
                <span style={{ fontSize: '48px', color: 'var(--accent)' }}>{currentTool.icon}</span>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '260px', lineHeight: 1.6 }}>Fill in the required fields and click Generate</p>
              </div>
            )}
            {(output || isGenerating) && (
              <div className={`output-content ${isGenerating ? 'generating-cursor' : 'fade-up'}`} style={{ maxWidth: '780px' }}>
                {output || ' '}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
