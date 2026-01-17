'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function generateDomainNames(keywords: string) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  
  const prompt = `Given these keywords: "${keywords}"

Generate 40 domain name suggestions (without extensions):
- First 20: Similar words and synonyms related to the keywords
- Next 20: Creative combinations and derivatives of the keywords

Rules:
- Keep names short (5-12 characters)
- Easy to spell and pronounce
- Brandable and catchy
- Return ONLY the names, one per line, no explanations, no numbering`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  const names = text
    .split('\n')
    .map((n) => n.trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
    .filter((n) => n.length > 0)
  
  return names
}

export async function analyzeBestDomains(availableDomains: string[]) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  
  const prompt = `Analyze these available domain names and rank the top 10 best ones:

${availableDomains.join('\n')}

Consider:
- Brandability and memorability
- Length (shorter is better)
- Pronunciation ease
- Commercial potential
- SEO friendliness

Return ONLY the domain names in order from best to worst, one per line, no explanations.`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  const ranked = text
    .split('\n')
    .map((n) => n.trim().toLowerCase())
    .filter((n) => n.length > 0)
  
  return ranked
}

export async function checkDomain(name: string) {
  const priority = ['ai', 'to', 'com', 'dev', 'app', 'io']
  const others = ['net', 'org', 'co', 'xyz', 'me', 'tech', 'online']
  const extensions = [...priority, ...others]
  
  const results = await Promise.all(
    extensions.map(async (ext) => {
      const domain = `${name}.${ext}`
      try {
        const res = await fetch(`https://dns.google/resolve?name=${domain}`)
        const data = await res.json()
        return { 
          domain, 
          available: data.Status === 3, 
          priority: priority.includes(ext),
          price: getPriceEstimate(ext)
        }
      } catch {
        return { 
          domain, 
          available: false, 
          priority: priority.includes(ext),
          price: getPriceEstimate(ext)
        }
      }
    })
  )
  return results
}

export async function checkSocialMedia(name: string) {
  const platforms = ['twitter', 'instagram', 'github']
  const results = await Promise.all(
    platforms.map(async (platform) => {
      try {
        const urls: Record<string, string> = {
          twitter: `https://twitter.com/${name}`,
          instagram: `https://instagram.com/${name}`,
          github: `https://github.com/${name}`
        }
        const res = await fetch(urls[platform], { method: 'HEAD' })
        return { platform, available: res.status === 404 }
      } catch {
        return { platform, available: false }
      }
    })
  )
  return results
}

function getPriceEstimate(ext: string): string {
  const prices: Record<string, string> = {
    com: '$10-15',
    net: '$10-15',
    org: '$10-15',
    io: '$30-50',
    ai: '$60-100',
    dev: '$12-20',
    app: '$15-20',
    to: '$40-80',
    co: '$20-30',
    xyz: '$1-5',
    me: '$15-25',
    tech: '$10-20',
    online: '$3-8'
  }
  return prices[ext] || '$10-20'
}
