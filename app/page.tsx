'use client'

import { useState, useEffect } from 'react'
import { Search, CheckCircle2, XCircle, Sparkles, Heart, Copy, Download, Filter, Clock, Share2, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { ThemeToggle } from '@/components/theme-toggle'
import { checkDomain, generateDomainNames, checkSocialMedia } from './actions'

type DomainResult = {
  domain: string
  available: boolean
  priority: boolean
  price: string
}

export default function Home() {
  const [keywords, setKeywords] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [results, setResults] = useState<Record<string, DomainResult[]>>({})
  const [favorites, setFavorites] = useState<string[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState('')
  const [sortBy, setSortBy] = useState('default')
  const [lengthFilter, setLengthFilter] = useState('all')
  const [socialResults, setSocialResults] = useState<Record<string, any[]>>({})

  useEffect(() => {
    const saved = localStorage.getItem('favorites')
    if (saved) setFavorites(JSON.parse(saved))
    const hist = localStorage.getItem('history')
    if (hist) setHistory(JSON.parse(hist))
  }, [])

  const handleGenerate = async () => {
    if (!keywords.trim()) return
    setLoading(true)
    setProgress(0)
    setSuggestions([])
    setResults({})
    setSocialResults({})
    
    setProgressText('AI domain isimleri oluşturuluyor...')
    setProgress(10)
    
    const names = await generateDomainNames(keywords)
    setSuggestions(names)
    setProgress(20)
    
    const allResults: Record<string, DomainResult[]> = {}
    const allSocial: Record<string, any[]> = {}
    
    const totalSteps = names.length
    
    for (let i = 0; i < names.length; i++) {
      const name = names[i]
      setProgressText(`${i + 1}/${totalSteps} domain taranıyor: ${name}`)
      setProgress(20 + ((i + 1) / totalSteps) * 80)
      
      const [domainResults, socialRes] = await Promise.all([
        checkDomain(name),
        checkSocialMedia(name)
      ])
      allResults[name] = domainResults
      allSocial[name] = socialRes
    }
    
    setResults(allResults)
    setSocialResults(allSocial)
    setProgressText('Tamamlandı!')
    setProgress(100)
    
    setTimeout(() => {
      setLoading(false)
      setProgress(0)
      setProgressText('')
    }, 500)
    
    const newHistory = [keywords, ...history.filter(h => h !== keywords)].slice(0, 10)
    setHistory(newHistory)
    localStorage.setItem('history', JSON.stringify(newHistory))
  }

  const toggleFavorite = (domain: string) => {
    const newFavs = favorites.includes(domain)
      ? favorites.filter(f => f !== domain)
      : [...favorites, domain]
    setFavorites(newFavs)
    localStorage.setItem('favorites', JSON.stringify(newFavs))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const exportResults = (format: 'csv' | 'json') => {
    const data = Object.entries(results).flatMap(([name, domains]) =>
      domains.filter(d => d.available).map(d => ({
        name,
        domain: d.domain,
        price: d.price
      }))
    )
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'domains.json'
      a.click()
    } else {
      const csv = ['Name,Domain,Price', ...data.map(d => `${d.name},${d.domain},${d.price}`)].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'domains.csv'
      a.click()
    }
  }

  const getSortedSuggestions = () => {
    let sorted = [...suggestions]
    
    if (lengthFilter === 'short') sorted = sorted.filter(s => s.length <= 8)
    if (lengthFilter === 'long') sorted = sorted.filter(s => s.length > 8)
    
    if (sortBy === 'length') sorted.sort((a, b) => a.length - b.length)
    if (sortBy === 'alpha') sorted.sort()
    if (sortBy === 'available') {
      sorted.sort((a, b) => {
        const aAvail = results[a]?.filter(r => r.available).length || 0
        const bAvail = results[b]?.filter(r => r.available).length || 0
        return bAvail - aAvail
      })
    }
    
    return sorted
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8 transition-colors">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1 space-y-2">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Domain Bulucu</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Anahtar kelimeler girin, AI domain önerileri alsın
            </p>
          </div>
          <ThemeToggle />
        </div>

        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardContent className="pt-6 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="örnek: tech, startup, innovation"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                className="flex-1 dark:bg-slate-900 dark:text-white"
                disabled={loading}
              />
              <Button onClick={handleGenerate} disabled={loading}>
                <Sparkles className="w-4 h-4 mr-2" />
                {loading ? 'Taranıyor...' : 'Öner'}
              </Button>
            </div>
            
            {loading && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                  {progressText}
                </p>
              </div>
            )}
            
            {history.length > 0 && !loading && (
              <div className="flex gap-2 flex-wrap">
                <Clock className="w-4 h-4 text-slate-500 mt-1" />
                {history.slice(0, 5).map(h => (
                  <Badge 
                    key={h} 
                    variant="outline" 
                    className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                    onClick={() => setKeywords(h)}
                  >
                    {h}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {suggestions.length > 0 && (
          <>
            <div className="flex gap-4 items-center">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40 dark:bg-slate-800">
                  <SelectValue placeholder="Sırala" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Varsayılan</SelectItem>
                  <SelectItem value="available">Müsaitlik</SelectItem>
                  <SelectItem value="length">Uzunluk</SelectItem>
                  <SelectItem value="alpha">Alfabetik</SelectItem>
                </SelectContent>
              </Select>

              <Select value={lengthFilter} onValueChange={setLengthFilter}>
                <SelectTrigger className="w-40 dark:bg-slate-800">
                  <SelectValue placeholder="Filtre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="short">Kısa (≤8)</SelectItem>
                  <SelectItem value="long">Uzun (&gt;8)</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2 ml-auto">
                <Button variant="outline" size="sm" onClick={() => exportResults('csv')}>
                  <Download className="w-4 h-4 mr-2" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportResults('json')}>
                  <Download className="w-4 h-4 mr-2" />
                  JSON
                </Button>
              </div>
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="dark:bg-slate-800">
                <TabsTrigger value="all">Tümü ({getSortedSuggestions().length})</TabsTrigger>
                <TabsTrigger value="favorites">Favoriler ({favorites.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-6 mt-6">
                {getSortedSuggestions().map((name) => {
                  const domainResults = results[name] || []
                  const priorityDomains = domainResults.filter((r) => r.priority)
                  const otherDomains = domainResults.filter((r) => !r.priority)
                  const hasAvailable = domainResults.some((r) => r.available)
                  const social = socialResults[name] || []

                  return (
                    <Card key={name} className={`${hasAvailable ? 'border-green-300 dark:border-green-700' : ''} dark:bg-slate-800`}>
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{name}</h3>
                            <Badge variant="outline">{name.length} karakter</Badge>
                          </div>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Share2 className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="dark:bg-slate-800">
                                <DialogHeader>
                                  <DialogTitle>Sosyal Medya Durumu</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-2">
                                  {social.map(s => (
                                    <div key={s.platform} className="flex items-center justify-between p-3 border rounded dark:border-slate-700">
                                      <span className="capitalize">{s.platform}</span>
                                      {s.available ? (
                                        <Badge variant="outline" className="bg-green-50 dark:bg-green-900">Müsait</Badge>
                                      ) : (
                                        <Badge variant="outline">Kayıtlı</Badge>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                        
                        {priorityDomains.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {priorityDomains.map(({ domain, available, price }) => (
                              <div
                                key={domain}
                                className={`flex items-center gap-2 p-3 rounded-lg border ${
                                  available
                                    ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700'
                                    : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700'
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    {available ? (
                                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                                    ) : (
                                      <XCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                    )}
                                    <span className="font-mono text-sm truncate dark:text-white">{domain}</span>
                                  </div>
                                  {available && (
                                    <div className="text-xs text-slate-500 dark:text-slate-400 ml-6">{price}</div>
                                  )}
                                </div>
                                {available && (
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => window.open(`https://www.godaddy.com/tr-tr/domainsearch/find?domainToCheck=${domain}`, '_blank')}
                                      title="GoDaddy'de Satın Al"
                                    >
                                      <ShoppingCart className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => copyToClipboard(domain)}
                                    >
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => toggleFavorite(domain)}
                                    >
                                      <Heart className={`w-3 h-3 ${favorites.includes(domain) ? 'fill-red-500 text-red-500' : ''}`} />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {otherDomains.length > 0 && (
                          <details className="group">
                            <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300">
                              Diğer uzantılar ({otherDomains.filter(d => d.available).length} müsait)
                            </summary>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                              {otherDomains.map(({ domain, available, price }) => (
                                <div
                                  key={domain}
                                  className={`flex items-center gap-2 p-3 rounded-lg border ${
                                    available
                                      ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700'
                                      : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700'
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      {available ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                                      ) : (
                                        <XCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                      )}
                                      <span className="font-mono text-sm truncate dark:text-white">{domain}</span>
                                    </div>
                                    {available && (
                                      <div className="text-xs text-slate-500 dark:text-slate-400 ml-6">{price}</div>
                                    )}
                                  </div>
                                  {available && (
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => window.open(`https://www.godaddy.com/tr-tr/domainsearch/find?domainToCheck=${domain}`, '_blank')}
                                        title="GoDaddy'de Satın Al"
                                      >
                                        <ShoppingCart className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => copyToClipboard(domain)}
                                      >
                                        <Copy className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => toggleFavorite(domain)}
                                      >
                                        <Heart className={`w-3 h-3 ${favorites.includes(domain) ? 'fill-red-500 text-red-500' : ''}`} />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </TabsContent>

              <TabsContent value="favorites" className="space-y-3 mt-6">
                {favorites.length === 0 ? (
                  <Card className="dark:bg-slate-800">
                    <CardContent className="py-12 text-center text-slate-500 dark:text-slate-400">
                      Henüz favori eklemediniz
                    </CardContent>
                  </Card>
                ) : (
                  favorites.map(domain => (
                    <Card key={domain} className="dark:bg-slate-800">
                      <CardContent className="flex items-center justify-between py-4">
                        <span className="font-mono dark:text-white">{domain}</span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(domain)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleFavorite(domain)}
                          >
                            <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </main>
  )
}
