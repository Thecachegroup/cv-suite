import { NextRequest, NextResponse } from 'next/server'
import {
  Document, Paragraph, TextRun, Packer, Table, TableRow, TableCell,
  BorderStyle, WidthType, ShadingType, AlignmentType, LevelFormat,
  VerticalAlign, IRunOptions
} from 'docx'

// ── Constants ──────────────────────────────────────────────────────────────
// A4 page, 0.5" margins
const PAGE_W = 11906
const PAGE_H = 16838
const MARGIN = 720
const CONTENT_W = PAGE_W - MARGIN * 2  // 10466 DXA
const SIDEBAR_W = 3200
const MAIN_W = CONTENT_W - SIDEBAR_W   // 7266 DXA
const BULLET_REF = 'cv-bullets'
const SIDEBAR_BULLET_REF = 'sidebar-bullets'

// ── Palettes ───────────────────────────────────────────────────────────────
const PALETTES: Record<string, { primary: string; accent: string; wash: string; body: string }> = {
  navy:     { primary: '1B3A5C', accent: '2E6DA4', wash: 'E8EEF4', body: '1A1A2E' },
  teal:     { primary: '1A5276', accent: '148F77', wash: 'E0F2EE', body: '17202A' },
  burgundy: { primary: '6B2737', accent: '9B4657', wash: 'F5EEF0', body: '1C1014' },
  slate:    { primary: '2C3E50', accent: '5D6D7E', wash: 'F0F2F4', body: '17202A' },
  default:  { primary: '932B46', accent: 'B05070', wash: 'F5EFF1', body: '1A1A1A' },
}

type Pal = typeof PALETTES.default
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER }

// ── Helpers ────────────────────────────────────────────────────────────────
function isAllCaps(s: string) {
  const t = s.trim()
  return t.length > 2 && /^[A-Z][A-Z\s&\/\(\)\–\-\—0-9]+$/.test(t)
}

function isBoldOnly(s: string) {
  const t = s.trim()
  return t.startsWith('**') && t.endsWith('**') && t.slice(2, -2).indexOf('**') === -1
}

function runs(text: string, color: string, size = 22, bold = false, font = 'Calibri'): TextRun[] {
  const out: TextRun[] = []
  text.split(/(\*\*[^*]+\*\*)/).forEach(part => {
    if (part.startsWith('**') && part.endsWith('**')) {
      out.push(new TextRun({ text: part.slice(2, -2), bold: true, color, size, font } as IRunOptions))
    } else if (part) {
      out.push(new TextRun({ text: part, bold, color, size, font } as IRunOptions))
    }
  })
  return out.length ? out : [new TextRun({ text: '' } as IRunOptions)]
}

function blank() {
  return new Paragraph({ children: [new TextRun({ text: '' } as IRunOptions)], spacing: { after: 40 } })
}

function rule(color: string) {
  return new Paragraph({
    border: { bottom: { color, style: BorderStyle.SINGLE, size: 6 } },
    spacing: { before: 60, after: 100 },
    children: [new TextRun({ text: '' } as IRunOptions)],
  })
}

function sidebarRule(color: string) {
  return new Paragraph({
    border: { bottom: { color, style: BorderStyle.SINGLE, size: 4 } },
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text: '' } as IRunOptions)],
  })
}

// ── Section parser ─────────────────────────────────────────────────────────
interface CVSection { heading: string; lines: string[] }
interface ParsedCV { name: string; contact: string; sections: CVSection[] }

function parseCV(text: string): ParsedCV {
  const lines = text.split('\n')
  let name = ''; let contact = ''; let nameFound = false; let contactFound = false
  const sections: CVSection[] = []
  let cur: CVSection | null = null

  for (const line of lines) {
    const t = line.trim()
    if (!t) { if (cur) cur.lines.push(line); continue }
    if (t === '---') { if (cur) cur.lines.push(line); continue }

    if (!nameFound && !t.startsWith('-') && !t.startsWith('*')) {
      name = t; nameFound = true; continue
    }
    if (nameFound && !contactFound && (t.includes('|') || t.includes('@') || t.includes('+61') || t.match(/\+\d/))) {
      contact = t; contactFound = true; continue
    }

    if (isAllCaps(t)) {
      if (cur) sections.push(cur)
      cur = { heading: t, lines: [] }
      continue
    }
    if (cur) cur.lines.push(line)
  }
  if (cur) sections.push(cur)
  return { name, contact, sections }
}

function sectionLines(section: CVSection | undefined): string[] {
  return section?.lines ?? []
}

function findSection(sections: CVSection[], ...keys: string[]): CVSection | undefined {
  return sections.find(s => keys.some(k => s.heading.includes(k)))
}

// ── Paragraph builders ─────────────────────────────────────────────────────
function buildLines(lines: string[], pal: Pal, bulletRef: string): Paragraph[] {
  const out: Paragraph[] = []
  for (const line of lines) {
    const t = line.trim()
    if (t === '---') { out.push(rule(pal.accent)); continue }
    if (!t) { out.push(blank()); continue }
    if (isAllCaps(t)) {
      out.push(new Paragraph({
        children: [new TextRun({ text: t, bold: true, size: 22, color: pal.primary, font: 'Calibri' } as IRunOptions)],
        spacing: { before: 240, after: 80 },
        border: { bottom: { color: pal.accent, style: BorderStyle.SINGLE, size: 4 } },
      }))
      continue
    }
    if (isBoldOnly(t)) {
      out.push(new Paragraph({
        children: [new TextRun({ text: t.slice(2, -2), bold: true, size: 22, color: pal.body, font: 'Calibri' } as IRunOptions)],
        spacing: { before: 120, after: 40 },
      }))
      continue
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      out.push(new Paragraph({
        numbering: { reference: bulletRef, level: 0 },
        children: runs(line.replace(/^[-*] /, ''), pal.body),
        spacing: { after: 60 },
      }))
      continue
    }
    out.push(new Paragraph({ children: runs(line, pal.body), spacing: { after: 60 } }))
  }
  return out
}

function buildSidebarLines(lines: string[], pal: Pal): Paragraph[] {
  const WHITE = 'FFFFFF'
  const LIGHT = 'E0E8F0'
  const out: Paragraph[] = []
  for (const line of lines) {
    const t = line.trim()
    if (t === '---') { out.push(sidebarRule('FFFFFF')); continue }
    if (!t) { out.push(blank()); continue }
    if (isAllCaps(t)) {
      out.push(new Paragraph({
        children: [new TextRun({ text: t, bold: true, size: 20, color: WHITE, font: 'Calibri' } as IRunOptions)],
        spacing: { before: 160, after: 60 },
      }))
      continue
    }
    if (isBoldOnly(t)) {
      out.push(new Paragraph({
        children: [new TextRun({ text: t.slice(2, -2), bold: true, size: 20, color: LIGHT, font: 'Calibri' } as IRunOptions)],
        spacing: { before: 80, after: 40 },
      }))
      continue
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      out.push(new Paragraph({
        numbering: { reference: SIDEBAR_BULLET_REF, level: 0 },
        children: runs(line.replace(/^[-*] /, ''), WHITE, 20),
        spacing: { after: 60 },
      }))
      continue
    }
    out.push(new Paragraph({ children: runs(line, WHITE, 20), spacing: { after: 60 } }))
  }
  return out
}

// ── CLASSIC layout ────────────────────────────────────────────────────────
function buildClassic(parsed: ParsedCV, pal: Pal): Paragraph[] {
  const out: Paragraph[] = []
  if (parsed.name) {
    out.push(new Paragraph({
      children: [new TextRun({ text: parsed.name, bold: true, size: 40, color: pal.primary, font: 'Calibri' } as IRunOptions)],
      spacing: { after: 60 },
    }))
  }
  if (parsed.contact) {
    out.push(new Paragraph({
      children: [new TextRun({ text: parsed.contact, size: 20, color: '777777', font: 'Calibri' } as IRunOptions)],
      spacing: { after: 180 },
    }))
  }
  for (const sec of parsed.sections) {
    out.push(new Paragraph({
      children: [new TextRun({ text: sec.heading, bold: true, size: 22, color: pal.primary, font: 'Calibri' } as IRunOptions)],
      spacing: { before: 240, after: 80 },
      border: { bottom: { color: pal.accent, style: BorderStyle.SINGLE, size: 4 } },
    }))
    out.push(...buildLines(sec.lines, pal, BULLET_REF))
  }
  return out
}

// ── HYBRID layout ─────────────────────────────────────────────────────────
function buildHybrid(parsed: ParsedCV, pal: Pal): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = []

  if (parsed.name) {
    out.push(new Paragraph({
      children: [new TextRun({ text: parsed.name, bold: true, size: 40, color: pal.primary, font: 'Calibri' } as IRunOptions)],
      spacing: { after: 60 },
    }))
  }
  if (parsed.contact) {
    out.push(new Paragraph({
      children: [new TextRun({ text: parsed.contact, size: 20, color: '777777', font: 'Calibri' } as IRunOptions)],
      spacing: { after: 160 },
    }))
  }

  const skillsSec = findSection(parsed.sections, 'COMPETENC', 'SKILLS')
  const otherSecs = parsed.sections.filter(s => s !== skillsSec)

  // Skills block in a shaded table
  if (skillsSec) {
    const skillParagraphs = buildLines(skillsSec.lines, { ...pal, body: pal.primary }, BULLET_REF)
    out.push(new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [CONTENT_W],
      rows: [new TableRow({
        children: [new TableCell({
          width: { size: CONTENT_W, type: WidthType.DXA },
          shading: { fill: pal.wash, type: ShadingType.SOLID },
          margins: { top: 160, bottom: 160, left: 200, right: 200 },
          borders: { top: { style: BorderStyle.SINGLE, size: 4, color: pal.primary }, bottom: { style: BorderStyle.SINGLE, size: 4, color: pal.primary }, left: NO_BORDER, right: NO_BORDER },
          children: [
            new Paragraph({
              children: [new TextRun({ text: skillsSec.heading, bold: true, size: 22, color: pal.primary, font: 'Calibri' } as IRunOptions)],
              spacing: { after: 80 },
            }),
            ...skillParagraphs,
          ],
        })]
      })]
    }))
    out.push(blank())
  }

  for (const sec of otherSecs) {
    out.push(new Paragraph({
      children: [new TextRun({ text: sec.heading, bold: true, size: 22, color: pal.primary, font: 'Calibri' } as IRunOptions)],
      spacing: { before: 220, after: 80 },
      border: { bottom: { color: pal.accent, style: BorderStyle.SINGLE, size: 4 } },
    }))
    out.push(...buildLines(sec.lines, pal, BULLET_REF))
  }

  return out
}

// ── EXECUTIVE layout ──────────────────────────────────────────────────────
function buildExecutive(parsed: ParsedCV, pal: Pal): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = []

  // Name — full width above the table
  if (parsed.name) {
    out.push(new Paragraph({
      children: [new TextRun({ text: parsed.name, bold: true, size: 44, color: pal.primary, font: 'Calibri' } as IRunOptions)],
      spacing: { after: 80 },
      border: { bottom: { color: pal.accent, style: BorderStyle.SINGLE, size: 8 } },
    }))
    out.push(blank())
  }

  // Partition sections into sidebar vs main
  // MAIN column: profile, experience, highlights, achievements, summary, alignment
  // SIDEBAR column: skills, competencies, education, certs, tools
  // Unmatched sections default to main (safer than hiding in sidebar)
  const MAIN_KEYS = [
    'PROFILE', 'HIGHLIGHT', 'EXPERIENCE', 'SUMMARY', 'ALIGNMENT',
    'CAREER', 'ACHIEVEMENT', 'PROFESSIONAL', 'OBJECTIVE', 'ROLE FIT',
  ]
  const SIDEBAR_KEYS = [
    'COMPETENC', 'SKILL', 'EDUCATION', 'CERTIF', 'TECHNICAL',
    'PLATFORM', 'TOOL', 'LANGUAGE', 'METHODOLOGY', 'FRAMEWORK',
  ]

  const mainSecs = parsed.sections.filter(s =>
    MAIN_KEYS.some(k => s.heading.includes(k)) ||
    (!MAIN_KEYS.some(k => s.heading.includes(k)) && !SIDEBAR_KEYS.some(k => s.heading.includes(k)))
  )
  const sidebarSecs = parsed.sections.filter(s =>
    !MAIN_KEYS.some(k => s.heading.includes(k)) &&
    SIDEBAR_KEYS.some(k => s.heading.includes(k))
  )

  // Build sidebar content
  const sidebarContent: Paragraph[] = []

  if (parsed.contact) {
    parsed.contact.split('|').map(p => p.trim()).filter(Boolean).forEach(part => {
      sidebarContent.push(new Paragraph({
        children: [new TextRun({ text: part, size: 19, color: 'E8E8E8', font: 'Calibri' } as IRunOptions)],
        spacing: { after: 40 },
      }))
    })
    sidebarContent.push(sidebarRule('FFFFFF'))
  }

  for (const sec of sidebarSecs) {
    sidebarContent.push(new Paragraph({
      children: [new TextRun({ text: sec.heading, bold: true, size: 20, color: 'FFFFFF', font: 'Calibri' } as IRunOptions)],
      spacing: { before: 120, after: 60 },
    }))
    sidebarContent.push(...buildSidebarLines(sec.lines, pal))
    sidebarContent.push(sidebarRule('FFFFFF'))
  }

  // Build main content
  const mainContent: Paragraph[] = []
  for (const sec of mainSecs) {
    mainContent.push(new Paragraph({
      children: [new TextRun({ text: sec.heading, bold: true, size: 22, color: pal.primary, font: 'Calibri' } as IRunOptions)],
      spacing: { before: 200, after: 80 },
      border: { bottom: { color: pal.accent, style: BorderStyle.SINGLE, size: 4 } },
    }))
    mainContent.push(...buildLines(sec.lines, pal, BULLET_REF))
  }

  // Ensure at least one paragraph in each cell
  if (sidebarContent.length === 0) sidebarContent.push(blank())
  if (mainContent.length === 0) mainContent.push(blank())

  out.push(new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [SIDEBAR_W, MAIN_W],
    rows: [new TableRow({
      children: [
        new TableCell({
          width: { size: SIDEBAR_W, type: WidthType.DXA },
          shading: { fill: pal.primary, type: ShadingType.SOLID },
          margins: { top: 240, bottom: 240, left: 220, right: 220 },
          verticalAlign: VerticalAlign.TOP,
          borders: NO_BORDERS,
          children: sidebarContent,
        }),
        new TableCell({
          width: { size: MAIN_W, type: WidthType.DXA },
          shading: { fill: 'FFFFFF', type: ShadingType.SOLID },
          margins: { top: 200, bottom: 200, left: 280, right: 160 },
          verticalAlign: VerticalAlign.TOP,
          borders: { ...NO_BORDERS, left: { style: BorderStyle.SINGLE, size: 2, color: pal.accent } },
          children: mainContent,
        }),
      ],
    })],
  }))

  return out
}

// ── MODERN layout ─────────────────────────────────────────────────────────
function buildModern(parsed: ParsedCV, pal: Pal): Paragraph[] {
  const out: Paragraph[] = []

  // Accent top bar
  out.push(new Paragraph({
    children: [new TextRun({ text: '', size: 2 } as IRunOptions)],
    border: { bottom: { color: pal.primary, style: BorderStyle.SINGLE, size: 20 } },
    spacing: { after: 120 },
  }))

  if (parsed.name) {
    out.push(new Paragraph({
      children: [new TextRun({ text: parsed.name, bold: true, size: 44, color: pal.body, font: 'Calibri' } as IRunOptions)],
      spacing: { after: 60 },
    }))
  }
  if (parsed.contact) {
    out.push(new Paragraph({
      children: [new TextRun({ text: parsed.contact, size: 20, color: pal.accent, font: 'Calibri' } as IRunOptions)],
      spacing: { after: 180 },
    }))
  }

  for (const sec of parsed.sections) {
    // Section heading with accent left border
    out.push(new Paragraph({
      children: [new TextRun({ text: sec.heading, bold: true, size: 20, color: pal.accent, font: 'Calibri' } as IRunOptions)],
      spacing: { before: 200, after: 60 },
      border: { bottom: { color: pal.wash, style: BorderStyle.SINGLE, size: 4 } },
    }))

    for (const line of sec.lines) {
      const t = line.trim()
      if (t === '---') { out.push(blank()); continue }
      if (!t) { out.push(blank()); continue }
      if (isAllCaps(t)) {
        out.push(new Paragraph({
          children: [new TextRun({ text: t, bold: true, size: 20, color: pal.primary, font: 'Calibri' } as IRunOptions)],
          spacing: { before: 120, after: 40 },
        }))
        continue
      }
      if (isBoldOnly(t)) {
        out.push(new Paragraph({
          children: [new TextRun({ text: t.slice(2, -2), bold: true, size: 21, color: pal.body, font: 'Calibri' } as IRunOptions)],
          spacing: { before: 100, after: 40 },
        }))
        continue
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        out.push(new Paragraph({
          numbering: { reference: BULLET_REF, level: 0 },
          children: runs(line.replace(/^[-*] /, ''), pal.body, 21),
          spacing: { after: 50 },
        }))
        continue
      }
      out.push(new Paragraph({ children: runs(line, pal.body, 21), spacing: { after: 50 } }))
    }
  }

  return out
}

// ── POST handler ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { text, filename, palette: palName, format = 'classic' } = await req.json()
    const pal = PALETTES[palName] || PALETTES.default
    const parsed = parseCV(text)

    let content: (Paragraph | Table)[]
    if (format === 'executive') {
      content = buildExecutive(parsed, pal)
    } else if (format === 'hybrid') {
      content = buildHybrid(parsed, pal)
    } else if (format === 'modern') {
      content = buildModern(parsed, pal)
    } else {
      content = buildClassic(parsed, pal)
    }

    const doc = new Document({
      numbering: {
        config: [
          {
            reference: BULLET_REF,
            levels: [{
              level: 0, format: LevelFormat.BULLET, text: '\u2022',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 180 } } },
            }],
          },
          {
            reference: SIDEBAR_BULLET_REF,
            levels: [{
              level: 0, format: LevelFormat.BULLET, text: '\u2013',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 280, hanging: 140 } } },
            }],
          },
        ],
      },
      sections: [{
        properties: {
          page: {
            size: { width: PAGE_W, height: PAGE_H },
            margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
          },
        },
        children: content,
      }],
    })

    const buffer = await Packer.toBuffer(doc)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}.docx"`,
      },
    })
  } catch (err) {
    console.error('Docx error:', err)
    return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 })
  }
}
