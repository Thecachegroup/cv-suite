import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { FORMAT_PROMPTS, COVER_TONE_PROMPTS, PROMPT_MASTER_CV, PROMPT_INTRO_GENERAL, PROMPT_INTRO_ROLE, PROMPT_DEEP_INTERVIEW } from '@/lib/prompts'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 })

    const body = await req.json()
    const { tool, inputs, format = 'classic', tone = 'professional', length = '' } = body

    if (!tool || !inputs) return NextResponse.json({ error: 'Missing tool or inputs' }, { status: 400 })

    let systemPrompt: string

    if (tool === 'tailoredCV') {
      const fn = FORMAT_PROMPTS[format] || FORMAT_PROMPTS.classic
      systemPrompt = fn(length)
    } else if (tool === 'masterCV') {
      systemPrompt = typeof PROMPT_MASTER_CV === 'function' ? PROMPT_MASTER_CV : PROMPT_MASTER_CV
    } else if (tool === 'coverLetter') {
      systemPrompt = COVER_TONE_PROMPTS[tone] || COVER_TONE_PROMPTS.professional
    } else if (tool === 'intro90General') {
      systemPrompt = PROMPT_INTRO_GENERAL
    } else if (tool === 'intro90Role') {
      systemPrompt = PROMPT_INTRO_ROLE
    } else if (tool === 'deepInterviewPrep') {
      systemPrompt = PROMPT_DEEP_INTERVIEW
    } else {
      return NextResponse.json({ error: 'Unknown tool' }, { status: 400 })
    }

    let userMessage = ''
    if (tool === 'masterCV') {
      userMessage = `CANDIDATE CAREER DOCUMENTS:\n${inputs.docs}`
    } else if (tool === 'tailoredCV') {
      userMessage = `CANDIDATE CV:\n${inputs.cv}\n\nJOB DESCRIPTION:\n${inputs.jd}`
    } else if (tool === 'coverLetter') {
      userMessage = `CANDIDATE CV:\n${inputs.cv}\n\nJOB DESCRIPTION:\n${inputs.jd}\n\nCOMPANY NAME: ${inputs.company || 'Not provided'}\nROLE TITLE: ${inputs.role || 'Not provided'}`
    } else if (tool === 'intro90General') {
      userMessage = `CANDIDATE CV:\n${inputs.cv}`
    } else if (tool === 'intro90Role') {
      userMessage = `CANDIDATE CV:\n${inputs.cv}\n\nJOB DESCRIPTION:\n${inputs.jd}\n\nCOMPANY NAME: ${inputs.company || 'Not provided'}`
    } else if (tool === 'deepInterviewPrep') {
      userMessage = `CANDIDATE CV:\n${inputs.cv}\n\nJOB DESCRIPTION:\n${inputs.jd}\n\nCOMPANY NAME: ${inputs.company || 'Not provided'}\n\nINTERVIEWER NAMES AND TITLES:\n${inputs.interviewers || 'Not provided'}`
    }

    const anthropic = new Anthropic({ apiKey })

    let stream
    try {
      stream = await anthropic.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      })
    } catch (apiErr: unknown) {
      const msg = apiErr instanceof Error ? apiErr.message : 'Anthropic API error'
      console.error('Anthropic connection error:', msg)
      return NextResponse.json({ error: `API error: ${msg}` }, { status: 502 })
    }

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }
        } catch (streamErr) {
          console.error('Streaming error:', streamErr)
          controller.enqueue(encoder.encode('\n\n[Generation error — please try again]'))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Generate error:', message)
    return NextResponse.json({ error: `Generation failed: ${message}` }, { status: 500 })
  }
}
