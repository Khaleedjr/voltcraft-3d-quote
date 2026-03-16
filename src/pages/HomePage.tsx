import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Upload, Cpu, Watch, ShieldCheck } from 'lucide-react'

const features = [
  {
    icon: Upload,
    title: 'Easy Upload',
    description: 'Simply upload your 3D models and instantly get a quote.'
  },
  {
    icon: Cpu,
    title: 'Advanced Materials',
    description: 'Wide variety of materials suitable for prototyping or production.'
  },
  {
    icon: Watch,
    title: 'Fast Turnaround',
    description: 'Rapid production times to keep your projects on schedule.'
  },
  {
    icon: ShieldCheck,
    title: 'Quality Guaranteed',
    description: 'Rigorous inspection standards for every printed part.'
  }
]

export default function HomePage() {
  return (
    <div className="w-full h-full min-h-screen bg-white dark:bg-[#0D0D0D] text-gray-900 dark:text-gray-100 flex flex-col pt-8 lg:pt-16 max-w-[1500px] mx-auto px-4 lg:px-8 pb-12">
      
      {/* 
        HERO SECTION: 3-column Layout 
        Left: Text & CTA
        Middle: 3D Printer overlapping absolute
        Right: 3 Mini info cards
      */}
      <section className="relative w-full grid grid-cols-1 lg:grid-cols-10 gap-6 lg:gap-8 items-start lg:items-stretch mb-24">
        
        {/* Left Column: Main Value Prop */}
        <div className="brutal-border border bg-gray-50 dark:bg-[#141414] p-8 lg:p-12 relative flex flex-col justify-center min-h-[500px] z-10 w-full lg:col-span-7">
          <div className="grid-node node-tl"></div>
          <div className="grid-node node-tr"></div>
          <div className="grid-node node-bl"></div>
          <div className="grid-node node-br"></div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl lg:text-7xl font-bold leading-[1.1] mb-6 text-gray-900 dark:text-white"
          >
            Precision <br />
            <span className="text-voltcraft-primary">3D Printing</span> <br />
            On Demand.
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-600 dark:text-gray-400 max-w-md mb-10"
          >
            Precision manufacturing for engineers and creators. Upload your models for an instant, accurate quote.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap gap-4"
          >
            <Link 
              to="/quote" 
              className="bg-voltcraft-primary text-white font-bold px-8 py-4 brutal-border hover:bg-opacity-90 transition-all border border-transparent shadow-lg"
            >
              Get Instant Quote
            </Link>
            <Link 
              to="/materials" 
              className="px-8 py-4 brutal-border border bg-white dark:bg-[#0D0D0D] text-gray-900 dark:text-white font-medium hover:bg-gray-100 dark:hover:bg-[#1A1A1A] transition-colors"
            >
              View Materials
            </Link>
          </motion.div>
        </div>

        {/* Right Column: Key Stats/Cards */}
        <div className="w-full lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6 z-10 lg:flex lg:flex-col lg:gap-4 lg:h-full">
          {[
            { title: "24h", subtitle: "Average Turnaround", desc: "For standard PLA/PETG parts" },
            { title: "0.05mm", subtitle: "Layer Resolution", desc: "Ultra-fine detail printing" },
            { title: "PLA + PETG", subtitle: "Available Materials", desc: "Two reliable options right now" }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + (i * 0.1) }}
              className="brutal-border border bg-gray-50 dark:bg-[#141414] p-4 sm:p-5 relative flex flex-col justify-center w-full lg:flex-1"
            >
              <div className="grid-node node-tl"></div>
              <div className="grid-node node-br"></div>
              
              <h3 className={`font-bold text-voltcraft-primary mb-1 ${i === 2 ? 'text-2xl lg:text-3xl' : 'text-3xl lg:text-4xl'}`}>
                {stat.title}
              </h3>
              <p className="font-bold text-gray-900 dark:text-white mb-2">{stat.subtitle}</p>
              <p className="text-sm text-gray-500">{stat.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* WHY CHOOSE US - Grid layout */}
      <section className="mt-12">
        <h2 className="text-3xl lg:text-4xl font-bold mb-8 text-gray-900 dark:text-white">Our Process</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="brutal-border border bg-gray-50 dark:bg-[#141414] p-8 relative flex flex-col group hover:border-voltcraft-primary transition-colors"
            >
              <div className="grid-node node-tl"></div>
              <div className="grid-node node-br"></div>
              
              <div className="w-12 h-12 bg-white dark:bg-[#1A1A1A] brutal-border border flex items-center justify-center text-voltcraft-primary mb-6">
                <feature.icon className="w-6 h-6" />
              </div>
              <div className="text-5xl font-bold text-gray-200 dark:text-[#222] absolute top-6 right-6 z-0 pointer-events-none transition-colors group-hover:text-gray-300 dark:group-hover:text-[#333]">
                0{idx + 1}
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 relative z-10">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 relative z-10 text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>
      
    </div>
  )
}
