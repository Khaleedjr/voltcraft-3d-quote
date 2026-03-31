import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileAnalysis, Material, PrintSettings, QuoteResult } from '../types'
import { formatPrice, formatPrintTime } from '../utils/quoteCalculator'
import { buildApiUrl, fetchWithTimeout, getApiErrorMessage, isAbortTimeoutError, parseApiResponse } from '../utils/api'
import { Clock, Scale, Ruler, Layers, Sparkles, MessageCircle, Mail } from 'lucide-react'

interface QuoteSummaryProps {
  fileName: string
  uploadedFiles?: File[]
  analysis: FileAnalysis
  material: Material
  settings: PrintSettings
  quote: QuoteResult
  fileBreakdown?: Array<{
    fileName: string
    materialShortName?: string
    analysis: FileAnalysis
    quote: QuoteResult
  }>
}

const QuoteSummary = ({ fileName, uploadedFiles = [], analysis, material, settings, quote, fileBreakdown = [] }: QuoteSummaryProps) => {
  const [estimateEmail, setEstimateEmail] = useState('')
  const [isSendingEstimate, setIsSendingEstimate] = useState(false)
  const [estimateEmailError, setEstimateEmailError] = useState('')
  const [estimateEmailSuccess, setEstimateEmailSuccess] = useState('')

  const handleWhatsAppQuote = async () => {
    const phoneNumber = '2349036225266'
    const message = `
Hello Voltcraft,

I would like to proceed with this 3D print quote:

File: ${fileName}
Material: ${material.shortName}
Layer Height: ${settings.layerHeight}mm
Infill: ${settings.infillPercentage}%
Quantity: ${settings.quantity}
Dimensions: ${analysis.dimensions.x} x ${analysis.dimensions.y} x ${analysis.dimensions.z} mm
Estimated Weight: ${quote.weight}g
Estimated Print Time: ${formatPrintTime(quote.printTime)}
Estimated Total: ${formatPrice(quote.totalCost)}

Please confirm next steps. Thank you.
    `.trim()

    // Prefer native share with file attachment when supported (best on mobile devices).
    if (uploadedFiles.length > 0 && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      const shareData: ShareData = {
        title: 'Voltcraft Quote Request',
        text: message,
        files: uploadedFiles
      }

      const canShareFiles = typeof navigator.canShare === 'function'
        ? navigator.canShare({ files: uploadedFiles })
        : true

      if (canShareFiles) {
        try {
          await navigator.share(shareData)
          return
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return
          }
        }
      }
    }

    const encodedMessage = encodeURIComponent(message)
    const targetUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`

    const openedWindow = window.open(targetUrl, '_blank', 'noopener,noreferrer')

    // Fallback for aggressive popup blockers.
    if (!openedWindow) {
      window.location.href = targetUrl
    }
  }

  const handleEstimateEmail = async () => {
    const normalizedEmail = estimateEmail.trim().toLowerCase()

    setEstimateEmailError('')
    setEstimateEmailSuccess('')

    if (!normalizedEmail) {
      setEstimateEmailError('Please enter an email address.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setEstimateEmailError('Please enter a valid email address.')
      return
    }

    setIsSendingEstimate(true)

    try {
      const payload = new FormData()
      payload.append('recipientEmail', normalizedEmail)
      payload.append('fileName', fileName)
      payload.append('materialName', material.shortName)
      payload.append('settings', JSON.stringify(settings))
      payload.append('analysis', JSON.stringify(analysis))
      payload.append('quote', JSON.stringify(quote))

      for (const uploadedFile of uploadedFiles) {
        payload.append('modelFiles', uploadedFile, uploadedFile.name)
      }

      const response = await fetchWithTimeout(buildApiUrl('/api/send-estimate'), {
        method: 'POST',
        body: payload
      }, 30000)

      const { data, rawText } = await parseApiResponse(response)

      if (!response.ok) {
        throw new Error(getApiErrorMessage({
          response,
          data,
          rawText,
          fallback: 'Could not send estimate email at the moment.'
        }))
      }

      if (!data) {
        throw new Error('Server returned an invalid response. Check API configuration and try again.')
      }

      setEstimateEmailSuccess('Estimate sent successfully. Please check your inbox.')
    } catch (error) {
      if (isAbortTimeoutError(error)) {
        setEstimateEmailError('Request timed out. Please try again in a few seconds.')
        return
      }

      const fallbackMessage = 'Could not send estimate email at the moment.'
      setEstimateEmailError(error instanceof Error ? error.message : fallbackMessage)
    } finally {
      setIsSendingEstimate(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Main Quote Card */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-voltcraft-primary/20 to-voltcraft-secondary/20 p-1">
        <div className="absolute inset-0 bg-gradient-to-r from-voltcraft-primary to-voltcraft-secondary opacity-20 blur-3xl" />
        
        <div className="relative bg-white dark:bg-voltcraft-dark rounded-lg p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl  font-bold text-gray-900 dark:text-white">Your Quote</h3>
            <span className="px-3 py-1 rounded-full bg-voltcraft-primary/20 text-voltcraft-primary text-sm font-medium">
              Instant Quote
            </span>
          </div>
          
          {/* Total Price */}
          <div className="text-center py-8 border-y border-gray-200 dark:border-voltcraft-gray-800">
            <p className="text-gray-600 dark:text-voltcraft-gray-400 text-sm mb-2">Estimated Total</p>
            <motion.div
              key={quote.totalCost}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-5xl md:text-6xl  font-bold text-voltcraft-primary"
            >
              {formatPrice(quote.totalCost)}
            </motion.div>
            <p className="text-gray-600 dark:text-voltcraft-gray-400 text-sm mt-2">
              {settings.quantity > 1 ? `for ${settings.quantity} copies` : 'per unit'} • includes material and printing service
            </p>
          </div>

          {fileBreakdown.length > 0 && (
            <div className="mt-6 space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-voltcraft-gray-300">Per-file pricing</p>
              <div className="space-y-2">
                {fileBreakdown.map((item, index) => (
                  <div
                    key={`${item.fileName}-${index}`}
                    className="p-3 rounded-lg bg-gray-100 dark:bg-voltcraft-gray-900/50 border border-gray-200 dark:border-voltcraft-gray-800"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {index + 1}. {item.fileName}
                      </p>
                      <p className="text-sm font-semibold text-voltcraft-primary whitespace-nowrap">
                        {formatPrice(item.quote.totalCost)}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-voltcraft-gray-500">
                      {item.materialShortName ? `${item.materialShortName} • ` : ''}
                      {Math.round(item.analysis.volume)} cm³ • {item.quote.weight}g • {formatPrintTime(item.quote.printTime)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-voltcraft-gray-800">
                <p className="text-sm font-medium text-gray-700 dark:text-voltcraft-gray-300">Grand Total</p>
                <p className="text-base font-bold text-voltcraft-primary">{formatPrice(quote.totalCost)}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-3 sm:p-4 bg-white dark:bg-voltcraft-dark rounded-lg border border-gray-200 dark:border-voltcraft-gray-800"
        >
          <div className="flex items-center gap-2 text-gray-600 dark:text-voltcraft-gray-400 text-xs sm:text-sm mb-2">
            <Clock className="w-4 h-4 flex-shrink-0 text-voltcraft-primary" />
            <span className="truncate">Print Time</span>
          </div>
          <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            {formatPrintTime(quote.printTime)}
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-3 sm:p-4 bg-white dark:bg-voltcraft-dark rounded-lg border border-gray-200 dark:border-voltcraft-gray-800"
        >
          <div className="flex items-center gap-2 text-gray-600 dark:text-voltcraft-gray-400 text-xs sm:text-sm mb-2">
            <Scale className="w-4 h-4 flex-shrink-0 text-voltcraft-primary" />
            <span className="truncate">Weight</span>
          </div>
          <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            {quote.weight}g
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-3 sm:p-4 bg-white dark:bg-voltcraft-dark rounded-lg border border-gray-200 dark:border-voltcraft-gray-800"
        >
          <div className="flex items-center gap-2 text-gray-600 dark:text-voltcraft-gray-400 text-xs sm:text-sm mb-2">
            <Ruler className="w-4 h-4 flex-shrink-0 text-voltcraft-primary" />
            <span className="truncate">Volume</span>
          </div>
          <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            {analysis.volume} cm³
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="p-3 sm:p-4 bg-white dark:bg-voltcraft-dark rounded-lg border border-gray-200 dark:border-voltcraft-gray-800"
        >
          <div className="flex items-center gap-2 text-gray-600 dark:text-voltcraft-gray-400 text-xs sm:text-sm mb-2">
            <Layers className="w-4 h-4 flex-shrink-0 text-voltcraft-primary" />
            <span className="truncate">Triangles</span>
          </div>
          <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            {analysis.triangleCount.toLocaleString()}
          </div>
        </motion.div>
      </div>
      
      {/* Model Info */}
      <div className="p-4 bg-white dark:bg-voltcraft-dark rounded-lg border border-gray-200 dark:border-voltcraft-gray-800">
        <h4 className="text-sm font-medium text-gray-600 dark:text-voltcraft-gray-400 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-voltcraft-primary" />
          Print Configuration
        </h4>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-voltcraft-gray-500">File</span>
            <p className="text-gray-900 dark:text-white font-medium truncate">{fileName}</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-voltcraft-gray-500">Material</span>
            <p className="text-gray-900 dark:text-white font-medium">{material.shortName}</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-voltcraft-gray-500">Layer Height</span>
            <p className="text-gray-900 dark:text-white font-medium">{settings.layerHeight}mm</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-voltcraft-gray-500">Infill</span>
            <p className="text-gray-900 dark:text-white font-medium">{settings.infillPercentage}%</p>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-voltcraft-gray-800">
          <span className="text-gray-500 dark:text-voltcraft-gray-500 text-sm">Dimensions: </span>
          <span className="text-gray-900 dark:text-white text-sm font-medium">
            {analysis.dimensions.x} × {analysis.dimensions.y} × {analysis.dimensions.z} mm
          </span>
        </div>
      </div>
      
      {/* Disclaimer */}
      <p className="text-gray-500 dark:text-voltcraft-gray-500 text-xs text-center">
        * This is an estimated quote. Final price may vary based on model complexity and 
        post-processing requirements. Quote valid for 7 days.
      </p>

      <button
        type="button"
        onClick={handleWhatsAppQuote}
        className="w-full mt-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-gray-900 dark:text-white transition-colors flex items-center justify-center gap-2"
      >
        <MessageCircle className="w-5 h-5" />
        Send Quote via WhatsApp
      </button>

      <div className="p-4 bg-white dark:bg-voltcraft-dark rounded-lg border border-gray-200 dark:border-voltcraft-gray-800 space-y-3">
        <p className="text-sm font-medium text-gray-700 dark:text-voltcraft-gray-300">
          Prefer email? Send this estimate to your inbox.
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={estimateEmail}
            onChange={(event) => setEstimateEmail(event.target.value)}
            placeholder="you@example.com"
            className="flex-1 px-4 py-3 bg-gray-50 dark:bg-voltcraft-darker border border-gray-300 dark:border-voltcraft-gray-700 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-voltcraft-primary"
          />

          <button
            type="button"
            onClick={handleEstimateEmail}
            disabled={isSendingEstimate}
            className="px-4 py-3 rounded-lg bg-voltcraft-primary text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Mail className="w-4 h-4" />
            {isSendingEstimate ? 'Sending...' : 'Email Estimate'}
          </button>
        </div>

        {estimateEmailError && (
          <p className="text-red-500 text-xs">{estimateEmailError}</p>
        )}

        {estimateEmailSuccess && (
          <p className="text-green-600 dark:text-green-400 text-xs">{estimateEmailSuccess}</p>
        )}
      </div>

      {uploadedFiles.length > 0 && (
        <p className="text-gray-500 dark:text-voltcraft-gray-500 text-xs text-center">
          On supported mobile devices, this will open share options with your model file(s) attached.
        </p>
      )}
    </motion.div>
  )
}

export default QuoteSummary
