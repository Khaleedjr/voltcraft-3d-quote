import { useState } from 'react'
import { motion } from 'framer-motion'
import { CustomerInfo, Material, PrintSettings, QuoteResult, FileAnalysis } from '../types'
import { formatPrice, formatPrintTime } from '../utils/quoteCalculator'
import { Send, User, Mail, Phone, MapPin, MessageSquare, CheckCircle, Loader2 } from 'lucide-react'

interface OrderFormProps {
  fileName: string
  analysis: FileAnalysis
  material: Material
  settings: PrintSettings
  quote: QuoteResult
}

const OrderForm = ({ fileName, analysis, material, settings, quote }: OrderFormProps) => {
  const [formData, setFormData] = useState<CustomerInfo>({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [errors, setErrors] = useState<Partial<CustomerInfo>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<CustomerInfo> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address'
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // In production, this would send to your backend
    console.log('Order submitted:', {
      customer: formData,
      file: fileName,
      analysis,
      material: material.shortName,
      settings,
      quote
    })
    
    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  const updateField = (field: keyof CustomerInfo, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h3 className="text-2xl   font-bold   text-gray-900 dark:text-white mb-2">
          Quote Request Submitted!
        </h3>
        <p className="text-gray-600 dark:text-voltcraft-gray-400 mb-6 max-w-md mx-auto">
          Thank you for your interest. We'll review your request and get back to you 
          within 24 hours with a final quote and payment details.
        </p>
        <div className="p-4 bg-white dark:bg-voltcraft-dark rounded-lg inline-block">
          <p className="text-sm text-gray-600 dark:text-voltcraft-gray-400">Reference Number</p>
          <p className="text-xl  text-voltcraft-primary font-semibold">
            VC-{Date.now().toString(36).toUpperCase()}
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xl   font-bold   text-gray-900 dark:text-white">
          Submit Print Request
        </h3>
        <div className="text-right">
          <p className="text-sm text-gray-600 dark:text-voltcraft-gray-400">Estimated Total</p>
          <p className="text-xl  font-bold   text-voltcraft-primary">{formatPrice(quote.totalCost)}</p>
        </div>
      </div>

      {/* Order Summary */}
      <div className="p-4 bg-gray-100 dark:bg-voltcraft-gray-900/50 rounded-lg text-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-gray-500 dark:text-voltcraft-gray-500">File</span>
            <p className="text-gray-900 dark:text-white truncate">{fileName}</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-voltcraft-gray-500">Material</span>
            <p className="text-gray-900 dark:text-white">{material.shortName} ({settings.color})</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-voltcraft-gray-500">Quantity</span>
            <p className="text-gray-900 dark:text-white">{settings.quantity}</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-voltcraft-gray-500">Est. Time</span>
            <p className="text-gray-900 dark:text-white">{formatPrintTime(quote.printTime)}</p>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-voltcraft-gray-300 mb-2">
            <User className="w-4 h-4 inline mr-2" />
            Full Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            className={`w-full px-4 py-3 bg-white dark:bg-voltcraft-dark border-2 rounded-lg text-gray-900 dark:text-white placeholder-voltcraft-gray-500 focus:outline-none transition-colors ${
              errors.name ? 'border-red-500' : 'border-gray-200 dark:border-voltcraft-gray-800 focus:border-voltcraft-primary'
            }`}
            placeholder="Your full name"
          />
          {errors.name && (
            <p className="text-red-400 text-sm mt-1">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-voltcraft-gray-300 mb-2">
            <Mail className="w-4 h-4 inline mr-2" />
            Email Address *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            className={`w-full px-4 py-3 bg-white dark:bg-voltcraft-dark border-2 rounded-lg text-gray-900 dark:text-white placeholder-voltcraft-gray-500 focus:outline-none transition-colors ${
              errors.email ? 'border-red-500' : 'border-gray-200 dark:border-voltcraft-gray-800 focus:border-voltcraft-primary'
            }`}
            placeholder="your@email.com"
          />
          {errors.email && (
            <p className="text-red-400 text-sm mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-voltcraft-gray-300 mb-2">
            <Phone className="w-4 h-4 inline mr-2" />
            Phone Number *
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            className={`w-full px-4 py-3 bg-white dark:bg-voltcraft-dark border-2 rounded-lg text-gray-900 dark:text-white placeholder-voltcraft-gray-500 focus:outline-none transition-colors ${
              errors.phone ? 'border-red-500' : 'border-gray-200 dark:border-voltcraft-gray-800 focus:border-voltcraft-primary'
            }`}
            placeholder="+234 xxx xxx xxxx"
          />
          {errors.phone && (
            <p className="text-red-400 text-sm mt-1">{errors.phone}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-voltcraft-gray-300 mb-2">
            <MapPin className="w-4 h-4 inline mr-2" />
            Delivery Address
          </label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => updateField('address', e.target.value)}
            className="w-full px-4 py-3 bg-white dark:bg-voltcraft-dark border-2 border-gray-200 dark:border-voltcraft-gray-800 rounded-lg text-gray-900 dark:text-white placeholder-voltcraft-gray-500 focus:outline-none focus:border-voltcraft-primary transition-colors"
            placeholder="Your address (optional)"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-voltcraft-gray-300 mb-2">
          <MessageSquare className="w-4 h-4 inline mr-2" />
          Additional Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          rows={3}
          className="w-full px-4 py-3 bg-white dark:bg-voltcraft-dark border-2 border-gray-200 dark:border-voltcraft-gray-800 rounded-lg text-gray-900 dark:text-white placeholder-voltcraft-gray-500 focus:outline-none focus:border-voltcraft-primary transition-colors resize-none"
          placeholder="Any special requirements, preferred colors, or questions..."
        />
      </div>

      <div className="flex items-center gap-4">
        <motion.button
          type="submit"
          disabled={isSubmitting}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-voltcraft-primary rounded-lg font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 spinner" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Submit Quote Request
            </>
          )}
        </motion.button>
      </div>

      <p className="text-gray-500 dark:text-voltcraft-gray-500 text-xs text-center">
        By submitting this form, you agree to our terms of service. We'll contact you 
        within 24 hours to confirm your order and provide payment details.
      </p>
    </motion.form>
  )
}

export default OrderForm
