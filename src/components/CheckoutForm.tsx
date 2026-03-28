import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CustomerInfo, FileAnalysis, Material, PrintSettings, QuoteResult } from '../types'
import { formatPrice, formatPrintTime } from '../utils/quoteCalculator'
import { buildApiUrl, fetchWithTimeout, getApiErrorMessage, isAbortTimeoutError, parseApiResponse } from '../utils/api'
import { FREE_DELIVERY_THRESHOLD_NGN, SHIPPING_ZONES, getShippingZoneById } from '../data/shippingRates'
import { CheckCircle, CreditCard, Loader2, MapPin, Truck, Wallet } from 'lucide-react'

interface CheckoutFormProps {
  fileName: string
  uploadedFile?: File | null
  analysis: FileAnalysis
  material: Material
  settings: PrintSettings
  quote: QuoteResult
}

interface SolanaInvoice {
  reference: string
  paymentUrl: string
  qrUrl: string
  amountSol: number
  solToNgnRate: number
}

interface PaymentSuccess {
  referenceNumber: string
  paymentMethod: string
}

const INITIAL_FORM_DATA: CustomerInfo = {
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  country: 'Nigeria',
  postalCode: '',
  notes: ''
}

const CheckoutForm = ({ fileName, uploadedFile, analysis, material, settings, quote }: CheckoutFormProps) => {
  const [formData, setFormData] = useState<CustomerInfo>(INITIAL_FORM_DATA)
  const [shippingZoneId, setShippingZoneId] = useState<string>(SHIPPING_ZONES[0]?.id || '')
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerInfo | 'shippingZone', string>>>({})
  const [isPaystackLoading, setIsPaystackLoading] = useState(false)
  const [isSolanaLoading, setIsSolanaLoading] = useState(false)
  const [isSolanaVerifying, setIsSolanaVerifying] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [solanaInvoice, setSolanaInvoice] = useState<SolanaInvoice | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState<PaymentSuccess | null>(null)

  const selectedShippingZone = useMemo(() => {
    return getShippingZoneById(shippingZoneId)
  }, [shippingZoneId])

  const isFreeDeliveryEligible = quote.totalCost >= FREE_DELIVERY_THRESHOLD_NGN
  const baseShippingFee = selectedShippingZone?.fee || 0
  const shippingFee = isFreeDeliveryEligible ? 0 : baseShippingFee
  const totalWithShipping = quote.totalCost + shippingFee

  const paymentReference = useMemo(() => {
    if (typeof window === 'undefined') {
      return null
    }

    const params = new URLSearchParams(window.location.search)
    return {
      provider: params.get('payment'),
      reference: params.get('reference') || params.get('trxref')
    }
  }, [])

  useEffect(() => {
    const verifyPaystackRedirect = async () => {
      if (!paymentReference || paymentReference.provider !== 'paystack' || !paymentReference.reference) {
        return
      }

      try {
        setIsPaystackLoading(true)
        setSubmitError(null)

        const response = await fetchWithTimeout(buildApiUrl('/api/payments/paystack/verify'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference: paymentReference.reference })
        }, 30000)

        const { data, rawText } = await parseApiResponse(response)

        if (!response.ok) {
          throw new Error(getApiErrorMessage({
            response,
            data,
            rawText,
            fallback: 'Unable to verify Paystack payment right now.'
          }))
        }

        if (!data) {
          throw new Error('Server returned an invalid response. Check API configuration and try again.')
        }

        setPaymentSuccess({
          referenceNumber: String(data.referenceNumber || ''),
          paymentMethod: 'Paystack'
        })

        const cleanUrl = `${window.location.origin}${window.location.pathname}`
        window.history.replaceState({}, document.title, cleanUrl)
      } catch (error) {
        if (isAbortTimeoutError(error)) {
          setSubmitError('Verification timed out. Please try again in a few seconds.')
          return
        }

        setSubmitError(error instanceof Error ? error.message : 'Unable to verify Paystack payment right now.')
      } finally {
        setIsPaystackLoading(false)
      }
    }

    void verifyPaystackRedirect()
  }, [paymentReference])

  const updateField = (field: keyof CustomerInfo, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = () => {
    const nextErrors: Partial<Record<keyof CustomerInfo | 'shippingZone', string>> = {}

    if (!formData.name.trim()) nextErrors.name = 'Full name is required.'
    if (!formData.email.trim()) {
      nextErrors.email = 'Email address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = 'Please enter a valid email address.'
    }
    if (!formData.phone.trim()) nextErrors.phone = 'Phone number is required.'
    if (!formData.address?.trim()) nextErrors.address = 'Shipping address is required.'
    if (!formData.city?.trim()) nextErrors.city = 'City is required.'
    if (!formData.state?.trim()) nextErrors.state = 'State/Province is required.'
    if (!formData.country?.trim()) nextErrors.country = 'Country is required.'
    if (!shippingZoneId || !selectedShippingZone) nextErrors.shippingZone = 'Please select a shipping zone.'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const createOrderPayload = () => {
    const payload = new FormData()

    payload.append('name', formData.name)
    payload.append('email', formData.email)
    payload.append('phone', formData.phone)
    payload.append('address', formData.address || '')
    payload.append('city', formData.city || '')
    payload.append('state', formData.state || '')
    payload.append('country', formData.country || '')
    payload.append('postalCode', formData.postalCode || '')
    payload.append('notes', formData.notes || '')
    payload.append('shippingZone', shippingZoneId)
    payload.append('fileName', fileName)
    payload.append('materialName', material.shortName)
    payload.append('color', settings.color)
    payload.append('analysis', JSON.stringify(analysis))
    payload.append('settings', JSON.stringify(settings))
    payload.append('quote', JSON.stringify(quote))

    if (uploadedFile) {
      payload.append('modelFile', uploadedFile, uploadedFile.name)
    }

    return payload
  }

  const handlePaystackPayment = async () => {
    if (!validateForm()) return

    try {
      setIsPaystackLoading(true)
      setSubmitError(null)

      const payload = createOrderPayload()
      payload.append('callbackUrl', `${window.location.origin}/quote?payment=paystack`)

      const response = await fetchWithTimeout(buildApiUrl('/api/payments/paystack/initialize'), {
        method: 'POST',
        body: payload
      }, 30000)

      const { data, rawText } = await parseApiResponse(response)

      if (!response.ok) {
        throw new Error(getApiErrorMessage({
          response,
          data,
          rawText,
          fallback: 'Unable to initialize Paystack payment right now.'
        }))
      }

      if (!data) {
        throw new Error('Server returned an invalid response. Check API configuration and try again.')
      }

      const authorizationUrl = data.authorizationUrl

      if (typeof authorizationUrl !== 'string' || !authorizationUrl) {
        throw new Error('No Paystack authorization URL returned.')
      }

      window.location.href = authorizationUrl
    } catch (error) {
      if (isAbortTimeoutError(error)) {
        setSubmitError('Payment initialization timed out. Please try again.')
        setIsPaystackLoading(false)
        return
      }

      setSubmitError(error instanceof Error ? error.message : 'Unable to initialize Paystack payment right now.')
      setIsPaystackLoading(false)
    }
  }

  const handleCreateSolanaInvoice = async () => {
    if (!validateForm()) return

    try {
      setIsSolanaLoading(true)
      setSubmitError(null)

      const payload = createOrderPayload()

      const response = await fetchWithTimeout(buildApiUrl('/api/payments/solana/create'), {
        method: 'POST',
        body: payload
      }, 30000)

      const { data, rawText } = await parseApiResponse(response)

      if (!response.ok) {
        throw new Error(getApiErrorMessage({
          response,
          data,
          rawText,
          fallback: 'Unable to create Solana payment invoice right now.'
        }))
      }

      if (!data) {
        throw new Error('Server returned an invalid response. Check API configuration and try again.')
      }

      const reference = data.reference
      const paymentUrl = data.paymentUrl
      const qrUrl = data.qrUrl
      const amountSol = Number(data.amountSol)
      const solToNgnRate = Number(data.solToNgnRate)

      if (typeof reference !== 'string' || typeof paymentUrl !== 'string' || typeof qrUrl !== 'string') {
        throw new Error('Incomplete Solana invoice response from server.')
      }

      setSolanaInvoice({
        reference,
        paymentUrl,
        qrUrl,
        amountSol,
        solToNgnRate
      })
    } catch (error) {
      if (isAbortTimeoutError(error)) {
        setSubmitError('Creating Solana invoice timed out. Please try again.')
        return
      }

      setSubmitError(error instanceof Error ? error.message : 'Unable to create Solana payment invoice right now.')
    } finally {
      setIsSolanaLoading(false)
    }
  }

  const handleVerifySolanaPayment = async () => {
    if (!solanaInvoice) return

    try {
      setIsSolanaVerifying(true)
      setSubmitError(null)

      const response = await fetchWithTimeout(buildApiUrl('/api/payments/solana/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: solanaInvoice.reference })
      }, 90000)

      const { data, rawText } = await parseApiResponse(response)

      if (!response.ok) {
        throw new Error(getApiErrorMessage({
          response,
          data,
          rawText,
          fallback: 'Unable to verify Solana payment right now.'
        }))
      }

      if (!data) {
        throw new Error('Server returned an invalid response. Check API configuration and try again.')
      }

      if (!data.paid) {
        throw new Error('Payment not found yet. Wait a few seconds and verify again.')
      }

      setPaymentSuccess({
        referenceNumber: String(data.referenceNumber || ''),
        paymentMethod: 'Solana Pay'
      })
    } catch (error) {
      if (isAbortTimeoutError(error)) {
        setSubmitError('Verification is taking longer than expected. Wait a bit and click verify again.')
        return
      }

      setSubmitError(error instanceof Error ? error.message : 'Unable to verify Solana payment right now.')
    } finally {
      setIsSolanaVerifying(false)
    }
  }

  if (paymentSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Payment Received!</h3>
        <p className="text-gray-600 dark:text-voltcraft-gray-400 max-w-md mx-auto mb-6">
          Your order has been placed successfully. We have received your payment and shipping details.
          A confirmation email has been sent to you.
        </p>
        <div className="inline-block rounded-lg bg-white dark:bg-voltcraft-dark border border-gray-200 dark:border-voltcraft-gray-800 p-4 text-left">
          <p className="text-sm text-gray-500 dark:text-voltcraft-gray-500">Order Reference</p>
          <p className="text-lg font-semibold text-voltcraft-primary">{paymentSuccess.referenceNumber}</p>
          <p className="text-sm text-gray-500 dark:text-voltcraft-gray-500 mt-2">Payment Method</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{paymentSuccess.paymentMethod}</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Checkout & Shipping</h3>
        <div className="text-right">
          <p className="text-sm text-gray-600 dark:text-voltcraft-gray-400">Total to Pay</p>
          <p className="text-xl font-bold text-voltcraft-primary">{formatPrice(totalWithShipping)}</p>
        </div>
      </div>

      <div className="p-4 bg-gray-100 dark:bg-voltcraft-gray-900/50 rounded-lg text-sm space-y-3">
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-gray-300/60 dark:border-voltcraft-gray-700 pt-3">
          <div>
            <span className="text-gray-500 dark:text-voltcraft-gray-500">Print Subtotal</span>
            <p className="text-gray-900 dark:text-white font-medium">{formatPrice(quote.totalCost)}</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-voltcraft-gray-500">Shipping Fee</span>
            <p className="text-gray-900 dark:text-white font-medium">
              {isFreeDeliveryEligible ? `FREE (was ${formatPrice(baseShippingFee)})` : formatPrice(shippingFee)}
            </p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-voltcraft-gray-500">Grand Total</span>
            <p className="text-voltcraft-primary font-semibold">{formatPrice(totalWithShipping)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { key: 'name', label: 'Full Name *', type: 'text', placeholder: 'Your full name' },
          { key: 'email', label: 'Email Address *', type: 'email', placeholder: 'you@example.com' },
          { key: 'phone', label: 'Phone Number *', type: 'tel', placeholder: '+234 xxx xxx xxxx' },
          { key: 'address', label: 'Street Address *', type: 'text', placeholder: 'House number and street' },
          { key: 'city', label: 'City *', type: 'text', placeholder: 'Lagos' },
          { key: 'state', label: 'State/Province *', type: 'text', placeholder: 'Lagos State' },
          { key: 'country', label: 'Country *', type: 'text', placeholder: 'Nigeria' },
          { key: 'postalCode', label: 'Postal Code', type: 'text', placeholder: '100001' }
        ].map((field) => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 dark:text-voltcraft-gray-300 mb-2">
              {field.label}
            </label>
            <input
              type={field.type}
              value={formData[field.key as keyof CustomerInfo] || ''}
              onChange={(event) => updateField(field.key as keyof CustomerInfo, event.target.value)}
              className={`w-full px-4 py-3 bg-white dark:bg-voltcraft-dark border-2 rounded-lg text-gray-900 dark:text-white placeholder-voltcraft-gray-500 focus:outline-none transition-colors ${
                errors[field.key as keyof CustomerInfo]
                  ? 'border-red-500'
                  : 'border-gray-200 dark:border-voltcraft-gray-800 focus:border-voltcraft-primary'
              }`}
              placeholder={field.placeholder}
            />
            {errors[field.key as keyof CustomerInfo] && (
              <p className="text-red-500 text-xs mt-1">{errors[field.key as keyof CustomerInfo]}</p>
            )}
          </div>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-voltcraft-gray-300 mb-2 flex items-center gap-2">
          <Truck className="w-4 h-4 text-voltcraft-primary" />
          Shipping Zone *
        </label>
        <select
          value={shippingZoneId}
          onChange={(event) => {
            setShippingZoneId(event.target.value)
            if (errors.shippingZone) {
              setErrors((prev) => ({ ...prev, shippingZone: undefined }))
            }
          }}
          className={`w-full px-4 py-3 bg-white dark:bg-voltcraft-dark border-2 rounded-lg text-gray-900 dark:text-white focus:outline-none transition-colors ${
            errors.shippingZone
              ? 'border-red-500'
              : 'border-gray-200 dark:border-voltcraft-gray-800 focus:border-voltcraft-primary'
          }`}
        >
          {SHIPPING_ZONES.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.label} - {formatPrice(zone.fee)} ({zone.eta})
            </option>
          ))}
        </select>
        {errors.shippingZone && <p className="text-red-500 text-xs mt-1">{errors.shippingZone}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-voltcraft-gray-300 mb-2">Additional Notes</label>
        <textarea
          value={formData.notes || ''}
          onChange={(event) => updateField('notes', event.target.value)}
          rows={3}
          className="w-full px-4 py-3 bg-white dark:bg-voltcraft-dark border-2 border-gray-200 dark:border-voltcraft-gray-800 rounded-lg text-gray-900 dark:text-white placeholder-voltcraft-gray-500 focus:outline-none focus:border-voltcraft-primary transition-colors resize-none"
          placeholder="Delivery instructions, color preferences, or special requirements."
        />
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-voltcraft-gray-800 p-4 space-y-3 bg-white dark:bg-voltcraft-dark">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <MapPin className="w-4 h-4 text-voltcraft-primary" />
          Payment Methods
        </h4>
        <p className="text-xs text-gray-500 dark:text-voltcraft-gray-500">
          {isFreeDeliveryEligible
            ? `You unlocked free delivery for orders above ${formatPrice(FREE_DELIVERY_THRESHOLD_NGN)}.`
            : `Shipping fee is included in checkout total. Free delivery applies above ${formatPrice(FREE_DELIVERY_THRESHOLD_NGN)}.`}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handlePaystackPayment}
            disabled={isPaystackLoading || isSolanaLoading || isSolanaVerifying}
            className="px-4 py-3 rounded-lg bg-voltcraft-primary text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPaystackLoading ? <Loader2 className="w-4 h-4 spinner" /> : <CreditCard className="w-4 h-4" />}
            {isPaystackLoading ? 'Preparing Paystack...' : 'Pay with Paystack'}
          </button>

          <button
            type="button"
            onClick={handleCreateSolanaInvoice}
            disabled={isPaystackLoading || isSolanaLoading || isSolanaVerifying}
            className="px-4 py-3 rounded-lg bg-gray-900 dark:bg-voltcraft-darker text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSolanaLoading ? <Loader2 className="w-4 h-4 spinner" /> : <Wallet className="w-4 h-4" />}
            {isSolanaLoading ? 'Creating Invoice...' : 'Pay with Solana Pay'}
          </button>
        </div>
      </div>

      {solanaInvoice && (
        <div className="rounded-lg border border-gray-200 dark:border-voltcraft-gray-800 p-4 bg-white dark:bg-voltcraft-dark space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Solana Pay Invoice</h4>
          <p className="text-xs text-gray-600 dark:text-voltcraft-gray-400">
            Send exactly <strong>{solanaInvoice.amountSol} SOL</strong> using the QR code or wallet link below, then click verify.
          </p>
          <p className="text-xs text-gray-500 dark:text-voltcraft-gray-500">
            Live rate used: 1 SOL = {formatPrice(solanaInvoice.solToNgnRate)}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <img src={solanaInvoice.qrUrl} alt="Solana Pay QR" className="w-40 h-40 rounded-md border border-gray-200 dark:border-voltcraft-gray-800" />
            <div className="space-y-2">
              <a
                href={solanaInvoice.paymentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block px-3 py-2 rounded-lg bg-voltcraft-primary text-white text-sm font-semibold"
              >
                Open in Wallet
              </a>
              <p className="text-xs text-gray-500 break-all max-w-xs">Reference: {solanaInvoice.reference}</p>
              <button
                type="button"
                onClick={handleVerifySolanaPayment}
                disabled={isSolanaVerifying || isPaystackLoading || isSolanaLoading}
                className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSolanaVerifying ? <Loader2 className="w-4 h-4 spinner" /> : <CheckCircle className="w-4 h-4" />}
                {isSolanaVerifying ? 'Verifying...' : 'I Have Paid, Verify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {submitError && <p className="text-red-500 text-sm text-center">{submitError}</p>}

      <p className="text-gray-500 dark:text-voltcraft-gray-500 text-xs text-center">
        By paying, you authorize Voltcraft to process this order and ship it to the provided address.
      </p>
    </motion.div>
  )
}

export default CheckoutForm
