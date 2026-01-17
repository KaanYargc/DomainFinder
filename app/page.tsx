'use client'

import { useState, useEffect } from 'react'
import { Search, CheckCircle2, XCircle, Sparkles, Heart, Copy, Download, Filter, Clock, Share2, ShoppingCart, Trash2, Command as CommandIcon, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { ThemeToggle } from '@/components/theme-toggle'
import { checkDomain, generateDomainNames, checkSocialMedia, analyzeBestDomains } from './actions'

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
  const [extensionFilter, setExtensionFilter] = useState('all')
  const [socialResults, setSocialResults] = useState<Record<string, any[]>>({})
  const [phase, setPhase] = useState<1 | 2>(1)
  const [bestDomains, setBestDomains] = useState<string[]>([])
  const [analyzingPhase2, setAnalyzingPhase2] = useState(false)
  const [selectedDomains, setSelectedDomains] = useState<string[]>([])
  const [commandOpen, setCommandOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('favorites')
    if (saved) setFavorites(JSON.parse(saved))
    const hist = localStorage.getItem('history')
    if (hist) setHistory(JSON.parse(hist))
    const savedResults = localStorage.getItem('domainResults')
    if (savedResults) {
      const parsed = JSON.parse(savedResults)
      setResults(parsed.results || {})
      setSuggestions(parsed.suggestions || [])
      setSocialResults(parsed.socialResults || {})
      setBestDomains(parsed.bestDomains || [])
    }

    // Command palette shortcut
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const handleGenerate = async () => {
    if (!keywords.trim()) return
    setLoading(true)
    setProgress(0)
    setPhase(1)
    setBestDomains([])
    
    setProgressText('AI domain isimleri oluşturuluyor...')
    setProgress(10)
    
    const names = await generateDomainNames(keywords)
    
    // Mevcut sonuçları koru, yeni önerileri ekle
    setSuggestions(prev => [...prev, ...names.filter(n => !prev.includes(n))])
    setProgress(20)
    
    const allResults: Record<string, DomainResult[]> = { ...results }
    const allSocial: Record<string, any[]> = { ...socialResults }
    
    const totalSteps = names.length
    const batchSize = 20 // 20 domain aynı anda tara
    
    for (let i = 0; i < names.length; i += batchSize) {
      const batch = names.slice(i, i + batchSize)
      setProgressText(`Faz 1: ${Math.min(i + batchSize, totalSteps)}/${totalSteps} domain taranıyor...`)
      
      await Promise.all(
        batch.map(async (name) => {
          // Sadece daha önce taranmamış domainleri tara
          if (!allResults[name]) {
            const [domainResults, socialRes] = await Promise.all([
              checkDomain(name),
              checkSocialMedia(name)
            ])
            allResults[name] = domainResults
            allSocial[name] = socialRes
          }
        })
      )
      
      setProgress(20 + ((i + batchSize) / totalSteps) * 80)
    }
    
    setResults(allResults)
    setSocialResults(allSocial)
    setProgressText('Tamamlandı!')
    setProgress(100)
    
    // Save to localStorage
    const savedData = JSON.parse(localStorage.getItem('domainResults') || '{}')
    const existingResults = savedData.results || {}
    const existingSuggestions = savedData.suggestions || []
    const existingSocial = savedData.socialResults || {}
    
    // Merge new results with existing ones
    const mergedResults = { ...existingResults, ...allResults }
    const mergedSuggestions = [...new Set([...existingSuggestions, ...names])]
    const mergedSocial = { ...existingSocial, ...allSocial }
    
    localStorage.setItem('domainResults', JSON.stringify({
      results: mergedResults,
      suggestions: mergedSuggestions,
      socialResults: mergedSocial,
      bestDomains: []
    }))
    
    setTimeout(() => {
      setLoading(false)
      setProgress(0)
      setProgressText('')
    }, 500)
    
    const newHistory = [keywords, ...history.filter(h => h !== keywords)].slice(0, 10)
    setHistory(newHistory)
    localStorage.setItem('history', JSON.stringify(newHistory))
  }

  const handlePhase2 = async () => {
    if (bestDomains.length > 0) {
      setPhase(2)
      return
    }
    
    setAnalyzingPhase2(true)
    setProgressText('Faz 2: En iyi domainler analiz ediliyor...')
    
    const availableDomains = Object.entries(results)
      .flatMap(([name, domains]) => 
        domains.filter(d => d.available).map(d => d.domain)
      )
    
    if (availableDomains.length === 0) {
      setAnalyzingPhase2(false)
      setProgressText('')
      return
    }
    
    const ranked = await analyzeBestDomains(availableDomains)
    setBestDomains(ranked)
    setPhase(2)
    setAnalyzingPhase2(false)
    setProgressText('')
    
    // Save phase 2 results
    const savedData = JSON.parse(localStorage.getItem('domainResults') || '{}')
    localStorage.setItem('domainResults', JSON.stringify({
      ...savedData,
      bestDomains: ranked
    }))
  }

  const toggleFavorite = (domain: string) => {
    const newFavs = favorites.includes(domain)
      ? favorites.filter(f => f !== domain)
      : [...favorites, domain]
    setFavorites(newFavs)
    localStorage.setItem('favorites', JSON.stringify(newFavs))
    
    if (newFavs.includes(domain)) {
      toast.success('Favorilere eklendi!', { description: domain })
    } else {
      toast.info('Favorilerden çıkarıldı', { description: domain })
    }
  }

  const clearAllDomains = () => {
    if (confirm('Tüm domain sonuçlarını silmek istediğinize emin misiniz?')) {
      setSuggestions([])
      setResults({})
      setSocialResults({})
      setBestDomains([])
      setPhase(1)
      setSelectedDomains([])
      localStorage.removeItem('domainResults')
      toast.success('Tüm domainler temizlendi')
    }
  }

  const exportSelected = (format: 'csv' | 'json') => {
    const data = selectedDomains.map(domain => {
      const [name] = domain.split('.')
      const domainData = results[name]?.find(d => d.domain === domain)
      return {
        domain,
        price: domainData?.price || 'N/A'
      }
    })
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'selected-domains.json'
      a.click()
    } else {
      const csv = ['Domain,Price', ...data.map(d => `${d.domain},${d.price}`)].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'selected-domains.csv'
      a.click()
    }
    toast.success(`${selectedDomains.length} domain ${format.toUpperCase()} olarak indirildi`)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Kopyalandı!', {
      description: text
    })
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
    
    if (extensionFilter !== 'all') {
      sorted = sorted.filter(name => {
        const domains = results[name] || []
        return domains.some(d => d.available && d.domain.endsWith(`.${extensionFilter}`))
      })
    }
    
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
    <TooltipProvider>
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8 transition-colors">
        <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1 space-y-2">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Domain Bulucu</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Anahtar kelimeler girin, AI domain önerileri alsın
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCommandOpen(true)}
                >
                  <CommandIcon className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Komut Paleti (⌘K)</p>
              </TooltipContent>
            </Tooltip>
            <ThemeToggle />
          </div>
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
              {suggestions.length > 0 && (
                <Button 
                  variant="destructive" 
                  onClick={clearAllDomains}
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Sıfırla
                </Button>
              )}
            </div>
            
            {loading && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                  {progressText}
                </p>
                <Separator className="my-4" />
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Card key={i} className="dark:bg-slate-800">
                      <CardContent className="pt-6 space-y-3">
                        <Skeleton className="h-6 w-32" />
                        <div className="grid grid-cols-3 gap-2">
                          <Skeleton className="h-12 w-full" />
                          <Skeleton className="h-12 w-full" />
                          <Skeleton className="h-12 w-full" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
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
            <div className="flex gap-4 items-center flex-wrap">
              <div className="flex gap-2">
                <Button 
                  variant={phase === 1 ? 'default' : 'outline'} 
                  onClick={() => setPhase(1)}
                >
                  Faz 1: Tüm Sonuçlar
                </Button>
                <Button 
                  variant={phase === 2 ? 'default' : 'outline'} 
                  onClick={handlePhase2}
                  disabled={analyzingPhase2}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {analyzingPhase2 ? 'Analiz ediliyor...' : 'Faz 2: En İyiler'}
                </Button>
              </div>

              {phase === 1 && (
                <>
                  <Select value={extensionFilter} onValueChange={setExtensionFilter}>
                    <SelectTrigger className="w-40 dark:bg-slate-800">
                      <SelectValue placeholder="Uzantı" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Uzantılar</SelectItem>
                      <SelectItem value="ai">.ai</SelectItem>
                      <SelectItem value="to">.to</SelectItem>
                      <SelectItem value="io">.io</SelectItem>
                    </SelectContent>
                  </Select>

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
                </>
              )}
            </div>

            {phase === 1 && (
              <>
                {suggestions.length > 0 && (() => {
                  const availableCount = Object.values(results).flat().filter(d => d.available).length
                  return availableCount > 0 && (
                    <Alert className="border-green-300 dark:border-green-700">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertTitle>Müsait Domainler Bulundu!</AlertTitle>
                      <AlertDescription>
                        Toplam {availableCount} müsait domain bulundu. Faz 2'ye geçerek en iyilerini görebilirsiniz.
                      </AlertDescription>
                    </Alert>
                  )
                })()}
                
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
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                          onClick={() => window.open(`https://www.godaddy.com/tr-tr/domainsearch/find?domainToCheck=${domain}`, '_blank')}
                                        >
                                          <ShoppingCart className="w-3 h-3" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Satın Al</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                          onClick={() => copyToClipboard(domain)}
                                        >
                                          <Copy className="w-3 h-3" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Kopyala</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          onClick={() => toggleFavorite(domain)}
                                        >
                                          <Heart className={`w-3 h-3 ${favorites.includes(domain) ? 'fill-red-500 text-red-500' : ''}`} />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Favorilere Ekle</TooltipContent>
                                    </Tooltip>
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

            {phase === 2 && bestDomains.length > 0 && (
              <div className="space-y-4">
                <Card className="dark:bg-slate-800 border-yellow-300 dark:border-yellow-700">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-yellow-600" />
                      <h2 className="text-xl font-bold dark:text-white">AI Tarafından Seçilen En İyi Domainler</h2>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Müsait domainler arasından marka değeri, telaffuz kolaylığı ve SEO potansiyeline göre sıralandı.
                    </p>
                  </CardContent>
                </Card>

                {bestDomains.map((domain, index) => {
                  const [name, ext] = domain.split('.')
                  const domainData = results[name]?.find(d => d.domain === domain)
                  const social = socialResults[name] || []

                  return (
                    <Card key={domain} className="dark:bg-slate-800 border-green-300 dark:border-green-700">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 font-bold text-lg flex-shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-2xl font-bold font-mono dark:text-white">{domain}</h3>
                                <Badge variant="outline" className="bg-green-50 dark:bg-green-900">Müsait</Badge>
                                {domainData && (
                                  <Badge variant="outline">{domainData.price}</Badge>
                                )}
                              </div>
                              
                              {social.length > 0 && (
                                <div className="flex gap-2 flex-wrap mb-3">
                                  {social.map(s => (
                                    <Badge 
                                      key={s.platform} 
                                      variant="outline"
                                      className={s.available ? 'bg-green-50 dark:bg-green-900' : ''}
                                    >
                                      {s.platform}: {s.available ? '✓' : '✗'}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => window.open(`https://www.godaddy.com/tr-tr/domainsearch/find?domainToCheck=${domain}`, '_blank')}
                                >
                                  <ShoppingCart className="w-4 h-4 mr-2" />
                                  Satın Al
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyToClipboard(domain)}
                                >
                                  <Copy className="w-4 h-4 mr-2" />
                                  Kopyala
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleFavorite(domain)}
                                >
                                  <Heart className={`w-4 h-4 ${favorites.includes(domain) ? 'fill-red-500 text-red-500' : ''}`} />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Command Palette */}
        <Command open={commandOpen} onOpenChange={setCommandOpen} className="rounded-lg border shadow-md">
          <CommandInput placeholder="Komut veya domain ara..." />
          <CommandList>
            <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>
            <CommandGroup heading="Hızlı Eylemler">
              <CommandItem onSelect={() => { handleGenerate(); setCommandOpen(false) }}>
                <Sparkles className="mr-2 h-4 w-4" />
                <span>Yeni Domain Öner</span>
              </CommandItem>
              <CommandItem onSelect={() => { clearAllDomains(); setCommandOpen(false) }}>
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Tüm Domainleri Sil</span>
              </CommandItem>
              <CommandItem onSelect={() => { setPhase(phase === 1 ? 2 : 1); setCommandOpen(false) }}>
                <Filter className="mr-2 h-4 w-4" />
                <span>Faz {phase === 1 ? '2' : '1'}'e Geç</span>
              </CommandItem>
            </CommandGroup>
            {history.length > 0 && (
              <CommandGroup heading="Son Aramalar">
                {history.map(h => (
                  <CommandItem key={h} onSelect={() => { setKeywords(h); setCommandOpen(false) }}>
                    <Clock className="mr-2 h-4 w-4" />
                    <span>{h}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </div>
    </main>
    </TooltipProvider>
  )
}
