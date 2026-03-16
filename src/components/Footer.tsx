import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="w-full bg-white dark:bg-[#0D0D0D] border-t brutal-border text-gray-900 dark:text-gray-100 mt-24">
      <div className="max-w-[1500px] mx-auto px-4 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          
          <div className="space-y-4 relative">
            <Link to="/" className="flex items-center gap-2">
              <span className="w-4 h-4 bg-voltcraft-primary inline-block brutal-border"></span>
              <span className="font-bold text-xl">Voltcraft</span>
            </Link>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              3D printing on demand. Precision manufacturing for engineers, designers, and creators.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-6 text-voltcraft-primary uppercase text-sm tracking-widest">Services</h4>
            <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <li><Link to="/quote" className="hover:text-voltcraft-primary transition-colors">Instant Quote</Link></li>
              <li><Link to="/materials" className="hover:text-voltcraft-primary transition-colors">Material Guide</Link></li>
              <li><Link to="/contact" className="hover:text-voltcraft-primary transition-colors">Custom Projects</Link></li>
              <li><Link to="/faq" className="hover:text-voltcraft-primary transition-colors">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6 text-voltcraft-primary uppercase text-sm tracking-widest">Company</h4>
            <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <li><Link to="/about" className="hover:text-voltcraft-primary transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-voltcraft-primary transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6 text-voltcraft-primary uppercase text-sm tracking-widest">Contact</h4>
            <ul className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-voltcraft-primary mt-0.5" />
                <a href="mailto:info@voltcraft.org.ng" className="hover:text-voltcraft-primary transition-colors">info@voltcraft.org.ng</a>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-voltcraft-primary mt-0.5" />
                <a href="tel:+2349036225266" className="hover:text-voltcraft-primary transition-colors">+234 903 622 5266</a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-voltcraft-primary mt-0.5" />
                <span>Voltcraft Electronics<br/>Nigeria</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="mt-16 pt-8 border-t brutal-border flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Voltcraft 3D. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-gray-900 dark:hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-gray-900 dark:hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
