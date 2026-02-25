import { useState, useEffect } from 'react'

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navLinks = [
    { label: 'Why Metar', href: '#why' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Endpoints', href: '#endpoints' },
    { label: 'Docs', href: '#' },
    { label: 'GitHub', href: '#' },
  ]

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-[#050505]/90 backdrop-blur-md border-b border-[#1a1a1a]' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-[#0066FF] flex items-center justify-center relative">
              <div className="w-3 h-3 rounded-sm bg-white rotate-45" />
              <div className="absolute inset-0 rounded-lg bg-[#0066FF] opacity-50 blur-sm group-hover:opacity-80 transition-opacity" />
            </div>
            <span className="font-semibold text-[#f0f0f0] tracking-tight">metar</span>
            <span className="hidden sm:inline text-[#888] text-sm font-mono">/x-data</span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-[#888] hover:text-[#f0f0f0] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="#install"
              className="text-sm px-4 py-1.5 rounded-md border border-[#1a1a1a] text-[#888] hover:border-[#333] hover:text-[#f0f0f0] transition-all"
            >
              Install
            </a>
            <a
              href="#pricing"
              className="text-sm px-4 py-1.5 rounded-md bg-[#0066FF] text-white hover:bg-[#0052cc] transition-colors font-medium"
            >
              View Pricing
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-[#888] hover:text-[#f0f0f0]"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <div className={`w-5 h-0.5 bg-current mb-1 transition-all ${mobileOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
            <div className={`w-5 h-0.5 bg-current mb-1 transition-all ${mobileOpen ? 'opacity-0' : ''}`} />
            <div className={`w-5 h-0.5 bg-current transition-all ${mobileOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden bg-[#080808] border-t border-[#1a1a1a] px-4 py-4">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="block py-3 text-[#888] hover:text-[#f0f0f0] border-b border-[#111] last:border-0"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="flex gap-3 mt-4">
            <a href="#pricing" className="flex-1 text-center py-2 rounded-md bg-[#0066FF] text-white text-sm font-medium">
              View Pricing
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
