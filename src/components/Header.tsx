import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Sun, Moon } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/quote', label: 'Services' },
    { path: '/materials', label: 'Materials' },
    { path: '/contact', label: 'Contact' },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <header className="w-full relative z-50 pt-2 lg:pt-6 pb-2 px-4 lg:px-8 bg-transparent">
      <div className="max-w-[1500px] mx-auto flex justify-between items-stretch gap-4 md:gap-8 h-20">
        
        {/* Left Nav Box - Enclosed in Brutalist Border */}
        <div className="flex-1 flex justify-between items-center brutal-border border bg-white dark:bg-[#141414] px-6 lg:px-8 relative">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src={theme === 'light' ? '/media/logo-light.png' : '/media/logo-dark.png'}
              alt="Voltcraft Logo" 
              className="h-10 md:h-12 w-auto object-contain"
              // Fallback text if the image fails to load
              onError={(e) => { 
                e.currentTarget.style.display = 'none'; 
                e.currentTarget.nextElementSibling?.classList.remove('hidden'); 
              }} 
            />
            <div className="hidden font-bold text-xl text-gray-900 dark:text-white items-center gap-2">
              <span className="w-4 h-4 bg-voltcraft-primary inline-block rounded-sm"></span>
              Voltcraft
            </div>
          </Link>

          {/* Desktop Links */}
          <nav className="hidden md:flex items-center gap-8 lg:gap-12">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-[15px] transition-colors ${
                  isActive(link.path)
                    ? 'text-voltcraft-primary font-medium'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Mobile Toggles */}
          <div className="md:hidden flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="text-gray-600 dark:text-gray-300 transition-colors"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 dark:text-gray-300 transition-colors"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Right Action Box - Desktop Only */}
        <div className="hidden md:flex items-center brutal-border border bg-white dark:bg-[#141414] group hover:border-voltcraft-primary transition-colors">
          <button
            onClick={toggleTheme}
            className="px-6 h-full flex items-center justify-center brutal-border border-r text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
          <Link
            to="/quote"
            className="px-8 h-full flex items-center justify-center text-gray-900 dark:text-white font-medium hover:text-voltcraft-primary transition-colors whitespace-nowrap"
          >
            Get Instant Quote
          </Link>
        </div>
      </div>

      {/* Mobile Nav Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden absolute top-24 left-4 right-4 z-40 brutal-border border bg-white dark:bg-[#141414] p-6 flex flex-col gap-4 shadow-xl"
          >
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className="text-lg font-medium text-gray-900 dark:text-white py-2 brutal-border border-b border-opacity-50"
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/quote"
              onClick={() => setIsMenuOpen(false)}
              className="mt-4 px-6 py-4 bg-voltcraft-primary text-white text-center font-bold"
            >
              Get Instant Quote
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

export default Header
