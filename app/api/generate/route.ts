import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { PROMPTS } from '@/lib/prompts'

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    console.error('GOOGLE_API_KEY is not set')
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  const genAI = new GoogleGenerativeAI(apiKey)

  const { tool, inputs } = await req.json()

  const systemPrompt = PROMPTS[tool as keyof typeof PROMPTS]
  if (!systemPrompt) {
    return NextResponse.json({ error: 'Invalid tool selected' }, { status: 400 })
  }

  let userMessage = ''

  switch (tool) {
    case 'baseCV':
      userMessage = `Please consolidate the following career documents into a master CV.\n\n${inputs.documents}`
      break
    case 'tailoredCV':
      userMessage = `Please tailor this CV to the job description below.\n\nBASE CV:\n${inputs.cv}\n\nJOB DESCRIPTION:\n${inputs.jobDescription}${inputs.notes ? `\n\nADDITIONAL NOTES:\n${inputs.notes}` : ''}`
      break
    case 'intro90Generic':
      userMessage = `Please write a 90-second professional introduction based on this CV.\n\nCV:\n${inputs.cv}`
      break
    case 'intro90RoleFocused':
      userMessage = `Please write a role-focused 90-second introduction.\n\nCV:\n${inputs.cv}\n\nJOB DESCRIPTION:\n${inputs.jobDescription}\n\nCOMPANY NAME: ${inputs.companyName}`
      break
    case 'interviewPrep':
      userMessage = `Please produce a full interview preparation pack.\n\nCV:\n${inputs.cv}\n\nJOB DESCRIPTION:\n${inputs.jobDescription}\n\nCOMPANY NAME: ${inputs.companyName}${inputs.interviewers ? `\n\nINTERVIEWERS:\n${inputs.interviewers}` : ''}${inputs.additionalContext ? `\n\nADDITIONAL CONTEXT:\n${inputs.additionalContext}` : ''}`
      break
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: systemPrompt,
  })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await model.generateContentStream(userMessage)
        for await (const chunk of result.stream) {
          const text = chunk.text()
          if (text) {
            controller.enqueue(encoder.encode(text))
          }
        }
        controller.close()
      } catch (error) {
        console.error('Gemini error:', JSON.stringify(error))
        controller.error(error)
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
}
