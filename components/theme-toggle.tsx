'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Switch } from '@/components/ui/switch'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark'
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  const toggle = () => {
    const newDark = !dark
    setDark(newDark)
    localStorage.setItem('theme', newDark ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', newDark)
  }

  return (
    <div className="flex items-center gap-2">
      <Sun className="w-4 h-4" />
      <Switch checked={dark} onCheckedChange={toggle} />
      <Moon className="w-4 h-4" />
    </div>
  )
}
