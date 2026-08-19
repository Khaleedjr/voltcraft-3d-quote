import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Loader2, AlertTriangle } from 'lucide-react'
import { buildApiUrl, fetchWithTimeout, getApiErrorMessage, isAbortTimeoutError, parseApiResponse } from '../utils/api'

export interface PaymentReturnInfo {
  provider: string
  reference: string
}

/**
 * Detects a payment provider redirect back to the site, e.g.
 * /quote?payment=paystack&reference=VCPS-... (Paystack also sends trxref).
 * Returns null when the current URL is a normal visit.
 */
export const getPaymentReturn = (): PaymentReturnInfo | null => {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const provider = params.get('payment')
  const reference = params.get('reference') || params.get('trxref')
  if (provider === 'paystack' && reference) {
    return { provider, reference }
  }
  return null
}

type Status = 'verifying' | 'success' | 'error'

interface Props {
  info: PaymentReturnInfo
}

/**
 * Verifies a payment on redirect-return, at the page level, so it works even
 * on a fresh reload where the checkout form is no longer mounted. Previously
 * verification lived inside CheckoutForm, which only renders on the final
 * wizard step, so returning from Paystack left the order unconfirmed.
 */
const PaymentReturn = ({ info }: Props) => {
  const [status, setStatus] = useState<Status>('verifying')
  const [referenceNumber, setReferenceNumber] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')

  const verify = useCallback(async () => {
    setStatus('verifying')
    setErrorMessage('')

    try {
      const response = await fetchWithTimeout(
        buildApiUrl('/api/payments/paystack/verify'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference: info.reference })
        },
        30000
      )

      const { data, rawText } = await parseApiResponse(response)

      if (!response.ok) {
        throw new Error(
          getApiErrorMessage({ response, data, rawText, fallback: 'Unable to verify your payment right now.' })
        )
      }

      if (!data) {
        throw new Error('The server returned an unexpected response while verifying your payment.')
      }

      setReferenceNumber(String(data.referenceNumber || ''))
      setStatus('success')

      // Drop the ?payment=... params so a refresh does not re-verify.
      const cleanUrl = `${window.location.origin}${window.location.pathname}`
      window.history.replaceState({}, document.title, cleanUrl)
    } catch (error) {
      if (isAbortTimeoutError(error)) {
        setErrorMessage('Verification timed out. Your payment may still have gone through — try again in a few seconds.')
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to verify your payment right now.')
      }
      setStatus('error')
    }
  }, [info.reference])

  useEffect(() => {
    void verify()
  }, [verify])

  return (
    <div className="max-w-xl mx-auto">
      <div className="p-6 md:p-10 bg-white dark:bg-voltcraft-dark rounded-lg border border-gray-200 dark:border-white/10 text-center">
        {status === 'verifying' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-6">
            <Loader2 className="w-14 h-14 text-voltcraft-primary spinner mx-auto mb-5" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Confirming your payment…</h2>
            <p className="text-gray-600 dark:text-voltcraft-gray-400 text-sm">
              Please wait, this only takes a moment. Do not close this tab.
            </p>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-4">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Payment received!</h2>
            <p className="text-gray-600 dark:text-voltcraft-gray-400 max-w-md mx-auto mb-6">
              Your order is confirmed. A confirmation email is on its way with your order details.
            </p>
            {referenceNumber && (
              <div className="inline-block rounded-lg bg-gray-50 dark:bg-voltcraft-darker border border-gray-200 dark:border-voltcraft-gray-800 px-5 py-3 mb-6">
                <p className="text-sm text-gray-500 dark:text-voltcraft-gray-500">Order Reference</p>
                <p className="text-lg font-semibold text-voltcraft-primary">{referenceNumber}</p>
              </div>
            )}
            <div>
              <a
                href="/quote"
                className="inline-block px-6 py-3 rounded-lg bg-voltcraft-primary text-white font-semibold hover:opacity-90 transition-opacity"
              >
                Start a new order
              </a>
            </div>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4">
            <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-11 h-11 text-yellow-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">We couldn&apos;t confirm the payment</h2>
            <p className="text-gray-600 dark:text-voltcraft-gray-400 max-w-md mx-auto mb-2">{errorMessage}</p>
            <p className="text-gray-500 dark:text-voltcraft-gray-500 text-sm max-w-md mx-auto mb-6">
              If you were charged, keep this reference and contact us:{' '}
              <span className="font-mono text-gray-700 dark:text-voltcraft-gray-300">{info.reference}</span>
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                onClick={() => void verify()}
                className="px-6 py-3 rounded-lg bg-voltcraft-primary text-white font-semibold hover:opacity-90 transition-opacity"
              >
                Try again
              </button>
              <a
                href="/quote"
                className="px-6 py-3 rounded-lg border border-gray-300 dark:border-voltcraft-gray-700 text-gray-700 dark:text-voltcraft-gray-300 font-medium hover:border-voltcraft-primary/60 transition-colors"
              >
                Back to quote
              </a>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default PaymentReturn
