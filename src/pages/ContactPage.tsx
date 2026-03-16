import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Send, 
  MessageSquare,
  Loader2,
  CheckCircle,
  Globe
} from 'lucide-react'

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    console.log('Contact form submitted:', formData)
    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  const contactInfo = [
    {
      icon: Mail,
      label: 'Email',
      value: 'info@voltcraft.org.ng',
      href: 'mailto:info@voltcraft.org.ng'
    },
    {
      icon: Phone,
      label: 'Phone',
      value: 'Contact for phone number',
      href: '#'
    },
    {
      icon: Globe,
      label: 'Website',
      value: 'voltcraft.org.ng',
      href: 'https://voltcraft.org.ng'
    },
    {
      icon: MapPin,
      label: 'Location',
      value: 'Nigeria',
      href: '#'
    }
  ]

  const businessHours = [
    { day: 'Monday - Friday', hours: '9:00 AM - 6:00 PM' },
    { day: 'Saturday', hours: '10:00 AM - 4:00 PM' },
    { day: 'Sunday', hours: 'Closed' }
  ]

  const faqs = [
    {
      question: 'What file formats do you accept?',
      answer: 'We accept STL, OBJ, and 3MF files. STL is the most common format and is supported by most 3D modeling software.'
    },
    {
      question: 'How long does printing take?',
      answer: 'Print time varies based on model size and complexity. Small items may take 2-4 hours, while larger prints can take 24+ hours. You\'ll get an estimate with your quote.'
    },
    {
      question: 'What is your turnaround time?',
      answer: 'Standard orders are typically completed within 2-5 business days. Express service is available for urgent orders at an additional fee.'
    },
    {
      question: 'Do you ship nationwide?',
      answer: 'Yes! We ship to all states in Nigeria. Shipping costs and times vary by location. Local pickup is also available.'
    },
    {
      question: 'Can you help with 3D design?',
      answer: 'While we primarily offer printing services, we can provide basic design consultation. For complex designs, we can recommend CAD designers.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept bank transfers, mobile payments, and cash on pickup. Payment is typically required before printing begins.'
    }
  ]

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl  font-bold text-gray-900 dark:text-white"
          >
            Get in <span className="text-voltcraft-primary">Touch</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-gray-600 dark:text-voltcraft-gray-400 max-w-2xl mx-auto"
          >
            Have questions about our 3D printing services? We're here to help. 
            Reach out and we'll get back to you as soon as possible.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20">
          {/* Contact Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Contact Cards */}
            {contactInfo.map((item, index) => (
              <motion.a
                key={item.label}
                href={item.href}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 p-4 bg-white dark:bg-voltcraft-dark rounded-lg border border-gray-200 dark:border-voltcraft-gray-800 hover:border-gray-300 dark:border-voltcraft-gray-700 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-voltcraft-primary/20 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-6 h-6 text-voltcraft-primary" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-voltcraft-gray-400">{item.label}</p>
                  <p className="text-gray-900 dark:text-white font-medium">{item.value}</p>
                </div>
              </motion.a>
            ))}

            {/* Business Hours */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="p-6 bg-white dark:bg-voltcraft-dark rounded-lg border border-gray-200 dark:border-voltcraft-gray-800"
            >
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-5 h-5 text-voltcraft-primary" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Business Hours</h3>
              </div>
              <div className="space-y-2">
                {businessHours.map((schedule) => (
                  <div key={schedule.day} className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-voltcraft-gray-400">{schedule.day}</span>
                    <span className="text-gray-900 dark:text-white">{schedule.hours}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2"
          >
            <div className="p-6 md:p-8 bg-white dark:bg-voltcraft-dark rounded-lg border border-gray-200 dark:border-voltcraft-gray-800">
              {isSubmitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-12 h-12 text-green-500" />
                  </div>
                  <h3 className="text-2xl  font-bold text-gray-900 dark:text-white mb-2">
                    Message Sent!
                  </h3>
                  <p className="text-gray-600 dark:text-voltcraft-gray-400 mb-6">
                    Thank you for reaching out. We'll get back to you within 24 hours.
                  </p>
                  <button
                    onClick={() => {
                      setIsSubmitted(false)
                      setFormData({ name: '', email: '', subject: '', message: '' })
                    }}
                    className="text-voltcraft-primary hover:text-voltcraft-secondary font-medium"
                  >
                    Send another message
                  </button>
                </motion.div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <MessageSquare className="w-6 h-6 text-voltcraft-primary" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Send us a message</h2>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-voltcraft-gray-300 mb-2">
                          Your Name
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-100 dark:bg-voltcraft-gray-900 border-2 border-gray-200 dark:border-voltcraft-gray-800 rounded-lg text-gray-900 dark:text-white placeholder-voltcraft-gray-500 focus:outline-none focus:border-voltcraft-primary transition-colors"
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-voltcraft-gray-300 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-100 dark:bg-voltcraft-gray-900 border-2 border-gray-200 dark:border-voltcraft-gray-800 rounded-lg text-gray-900 dark:text-white placeholder-voltcraft-gray-500 focus:outline-none focus:border-voltcraft-primary transition-colors"
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-voltcraft-gray-300 mb-2">
                        Subject
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-100 dark:bg-voltcraft-gray-900 border-2 border-gray-200 dark:border-voltcraft-gray-800 rounded-lg text-gray-900 dark:text-white placeholder-voltcraft-gray-500 focus:outline-none focus:border-voltcraft-primary transition-colors"
                        placeholder="What's this about?"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-voltcraft-gray-300 mb-2">
                        Message
                      </label>
                      <textarea
                        required
                        rows={5}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-100 dark:bg-voltcraft-gray-900 border-2 border-gray-200 dark:border-voltcraft-gray-800 rounded-lg text-gray-900 dark:text-white placeholder-voltcraft-gray-500 focus:outline-none focus:border-voltcraft-primary transition-colors resize-none"
                        placeholder="Tell us more about your project or question..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center justify-center gap-2 w-full px-6 py-4 bg-voltcraft-primary rounded-lg font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 spinner" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Send Message
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </div>

        {/* FAQs */}
        <div>
          <div className="text-center mb-12">
            <h2 className="text-3xl  font-bold text-gray-900 dark:text-white">
              Frequently Asked <span className="text-voltcraft-primary">Questions</span>
            </h2>
            <p className="mt-4 text-gray-600 dark:text-voltcraft-gray-400">
              Find answers to common questions about our services.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {faqs.map((faq, index) => (
              <motion.div
                key={faq.question}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 bg-white dark:bg-voltcraft-dark rounded-lg border border-gray-200 dark:border-voltcraft-gray-800"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{faq.question}</h3>
                <p className="text-gray-600 dark:text-voltcraft-gray-400 text-sm">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContactPage
