import { Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'

const HomePage = lazy(() => import('./pages/HomePage'))
const QuotePage = lazy(() => import('./pages/QuotePage'))
const MaterialsPage = lazy(() => import('./pages/MaterialsPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <Suspense
            fallback={
              <div className="min-h-[40vh] flex items-center justify-center text-gray-600 dark:text-voltcraft-gray-400">
                Loading...
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/quote" element={<QuotePage />} />
              <Route path="/materials" element={<MaterialsPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App
