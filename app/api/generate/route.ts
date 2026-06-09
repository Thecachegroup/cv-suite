import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { PROMPTS, FORMAT_PROMPTS } from '@/lib/prompts'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not set')
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const body = await req.json()
    const { tool, inputs, format } = body

    if (!tool || !inputs) return NextResponse.json({ error: 'Missing tool or inputs' }, { status: 400 })

    let systemPrompt: string
    if (tool === 'tailoredCV' && format && FORMAT_PROMPTS[format]) {
      systemPrompt = FORMAT_PROMPTS[format]
    } else {
      systemPrompt = PROMPTS[tool]
    }
    if (!systemPrompt) return NextResponse.json({ error: 'Unknown tool' }, { status: 400 })

    let userMessage = ''
    if (tool === 'masterCV') {
      userMessage = `CANDIDATE CAREER DOCUMENTS:\n${inputs.docs}`
    } else if (tool === 'tailoredCV') {
      userMessage = `CANDIDATE CV:\n${inputs.cv}\n\nJOB DESCRIPTION:\n${inputs.jd}`
    } else if (tool === 'coverLetter') {
      userMessage = `CANDIDATE CV:\n${inputs.cv}\n\nJOB DESCRIPTION:\n${inputs.jd}\n\nCOMPANY NAME: ${inputs.company || ''}\nROLE TITLE: ${inputs.role || ''}`
    } else if (tool === 'intro90General') {
      userMessage = `CANDIDATE CV:\n${inputs.cv}`
    } else if (tool === 'intro90Role') {
      userMessage = `CANDIDATE CV:\n${inputs.cv}\n\nJOB DESCRIPTION:\n${inputs.jd}\n\nCOMPANY NAME: ${inputs.company || ''}`
    } else if (tool === 'deepInterviewPrep') {
      userMessage = `CANDIDATE CV:\n${inputs.cv}\n\nJOB DESCRIPTION:\n${inputs.jd}\n\nCOMPANY NAME: ${inputs.company || ''}\n\nINTERVIEWER NAMES AND TITLES:\n${inputs.interviewers || 'Not provided'}`
    }

    const anthropic = new Anthropic({ apiKey })

    // Test the connection before streaming — catches bad API keys immediately
    let stream
    try {
      stream = await anthropic.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
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
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Generate error:', message)
    return NextResponse.json({ error: `Generation failed: ${message}` }, { status: 500 })
  }
}
