import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  Cpu, 
  Target, 
  Users, 
  Award, 
  ArrowRight,
  Box,
  Layers,
  Zap,
  CheckCircle
} from 'lucide-react'

const AboutPage = () => {
  const printerSpecs = [
    { label: 'Build Volume', value: '256 × 256 × 256 mm' },
    { label: 'Layer Resolution', value: '0.08 - 0.28 mm' },
    { label: 'Print Speed', value: 'Up to 500 mm/s' },
    { label: 'Nozzle Diameter', value: '0.4 mm (default)' },
    { label: 'Filament Diameter', value: '1.75 mm' },
    { label: 'Supported Materials', value: 'PLA, PETG, TPU, ABS, PA' },
  ]

  const services = [
    {
      icon: Box,
      title: 'Rapid Prototyping',
      description: 'Turn your designs into physical prototypes quickly for testing and validation.'
    },
    {
      icon: Layers,
      title: 'Custom Parts',
      description: 'Need a specific part? We can print custom components for your projects.'
    },
    {
      icon: Users,
      title: 'Small Batch Production',
      description: 'Perfect for small production runs of 10-100 units without tooling costs.'
    },
    {
      icon: Zap,
      title: 'Express Service',
      description: 'Need it fast? Our express service prioritizes your order for quick delivery.'
    }
  ]

  const timeline = [
    { year: 'Founded', event: 'Voltcraft started as an IC and electronics components retailer' },
    { year: '2024', event: 'Expanded into 3D printing services with Bambu Lab technology' },
    { year: 'Today', event: 'Serving customers across Nigeria with professional 3D printing' },
  ]

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl   font-bold   text-gray-900 dark:text-white"
          >
            About <span className="text-voltcraft-primary">Voltcraft</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 text-lg text-gray-600 dark:text-voltcraft-gray-400 max-w-3xl mx-auto"
          >
            We're a Nigerian electronics company that's passionate about bringing 
            cutting-edge technology to makers, engineers, and innovators. Our 3D printing 
            service is an extension of our commitment to empowering creators.
          </motion.p>
        </div>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-8 bg-white dark:bg-voltcraft-dark rounded-lg border border-gray-200 dark:border-voltcraft-gray-800"
          >
            <div className="w-12 h-12 rounded-lg bg-voltcraft-primary/20 flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-voltcraft-primary" />
            </div>
            <h2 className="text-2xl   font-bold   text-gray-900 dark:text-white mb-4">Our Mission</h2>
            <p className="text-gray-600 dark:text-voltcraft-gray-400 leading-relaxed">
              To democratize access to advanced manufacturing technology in Nigeria. 
              We believe everyone should have the ability to bring their ideas to life, 
              whether it's a student working on a school project or an engineer developing 
              the next big innovation.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-8 bg-white dark:bg-voltcraft-dark rounded-lg border border-gray-200 dark:border-voltcraft-gray-800"
          >
            <div className="w-12 h-12 rounded-lg bg-voltcraft-secondary/20 flex items-center justify-center mb-4">
              <Award className="w-6 h-6 text-voltcraft-secondary" />
            </div>
            <h2 className="text-2xl   font-bold   text-gray-900 dark:text-white mb-4">Our Vision</h2>
            <p className="text-gray-600 dark:text-voltcraft-gray-400 leading-relaxed">
              To become the leading 3D printing and electronics hub in West Africa, 
              known for quality, reliability, and exceptional customer service. We're 
              building a community of makers and innovators who shape the future.
            </p>
          </motion.div>
        </div>

        {/* The Printer */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl   font-bold   text-gray-900 dark:text-white">
              Our <span className="text-voltcraft-primary">Equipment</span>
            </h2>
            <p className="mt-4 text-gray-600 dark:text-voltcraft-gray-400 max-w-2xl mx-auto">
              We use the Bambu Lab A1 Combo, one of the most advanced consumer-grade 
              3D printers available, ensuring consistent, high-quality results.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-lg bg-voltcraft-primary/10 p-1"
          >
            <div className="bg-white dark:bg-voltcraft-dark rounded-lg p-8 md:p-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <Cpu className="w-8 h-8 text-voltcraft-primary" />
                    <h3 className="text-2xl   font-bold   text-gray-900 dark:text-white">
                      Bambu Lab A1 Combo
                    </h3>
                  </div>
                  <p className="text-gray-600 dark:text-voltcraft-gray-400 mb-8 leading-relaxed">
                    The A1 Combo features multi-color printing capabilities with the AMS Lite, 
                    high-speed printing up to 500mm/s, automatic bed leveling, and exceptional 
                    print quality. It's the perfect balance of speed, quality, and reliability.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {printerSpecs.map((spec) => (
                      <div key={spec.label} className="p-3 bg-gray-100 dark:bg-voltcraft-gray-900/50 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-voltcraft-gray-500">{spec.label}</p>
                        <p className="text-gray-900 dark:text-white font-medium">{spec.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <div className="aspect-square rounded-lg bg-gray-100 dark:bg-voltcraft-gray-900 flex items-center justify-center overflow-hidden">
                    <div className="text-center p-8">
                      <Box className="w-32 h-32 text-voltcraft-primary mx-auto mb-4 animate-float" />
                      <p className="text-gray-600 dark:text-voltcraft-gray-400">Bambu Lab A1 Combo</p>
                      <p className="text-sm text-gray-500 dark:text-voltcraft-gray-500">High-speed, multi-color 3D printer</p>
                    </div>
                  </div>
                  
                  {/* Feature badges */}
                  <div className="absolute -right-4 top-8 glass rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-sm text-gray-900 dark:text-white">Multi-Color</span>
                    </div>
                  </div>
                  <div className="absolute -left-4 bottom-8 glass rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-500" />
                      <span className="text-sm text-gray-900 dark:text-white">500mm/s Speed</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Services */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl   font-bold   text-gray-900 dark:text-white">
              What We <span className="text-voltcraft-primary">Offer</span>
            </h2>
            <p className="mt-4 text-gray-600 dark:text-voltcraft-gray-400 max-w-2xl mx-auto">
              From quick prototypes to small production runs, we've got you covered.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 bg-white dark:bg-voltcraft-dark rounded-lg border border-gray-200 dark:border-voltcraft-gray-800 hover:border-gray-300 dark:border-voltcraft-gray-700 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-voltcraft-primary/20 to-voltcraft-secondary/20 flex items-center justify-center mb-4">
                  <service.icon className="w-6 h-6 text-voltcraft-primary" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{service.title}</h3>
                <p className="text-gray-600 dark:text-voltcraft-gray-400 text-sm">{service.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl   font-bold   text-gray-900 dark:text-white">
              Our <span className="text-voltcraft-primary">Journey</span>
            </h2>
          </div>

          <div className="max-w-2xl mx-auto">
            {timeline.map((item, index) => (
              <motion.div
                key={item.year}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-6 mb-8 last:mb-0"
              >
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full bg-voltcraft-primary" />
                  {index < timeline.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-200 dark:bg-voltcraft-gray-800 mt-2" />
                  )}
                </div>
                <div className="flex-1 pb-8">
                  <span className="text-voltcraft-primary font-semibold">{item.year}</span>
                  <p className="text-gray-700 dark:text-voltcraft-gray-300 mt-1">{item.event}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="p-8 md:p-12 bg-white dark:bg-voltcraft-dark rounded-lg border border-gray-200 dark:border-voltcraft-gray-800">
            <h2 className="text-2xl md:text-3xl   font-bold   text-gray-900 dark:text-white mb-4">
              Ready to start your project?
            </h2>
            <p className="text-gray-600 dark:text-voltcraft-gray-400 mb-8 max-w-xl mx-auto">
              Upload your 3D model and get an instant quote. We're here to help bring 
              your ideas to life.
            </p>
            <Link
              to="/quote"
              className="inline-flex items-center gap-2 px-8 py-4 bg-voltcraft-primary rounded-lg font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default AboutPage
