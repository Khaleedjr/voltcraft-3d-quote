import { motion } from 'framer-motion'
import { FileAnalysis, Material, PrintSettings, QuoteResult } from '../types'
import { formatPrice, formatPrintTime } from '../utils/quoteCalculator'
import { Clock, Scale, Banknote, Package, Ruler, Layers, Sparkles, MessageCircle } from 'lucide-react'

interface QuoteSummaryProps {
  fileName: string
  uploadedFile?: File | null
  analysis: FileAnalysis
  material: Material
  settings: PrintSettings
  quote: QuoteResult
}

const QuoteSummary = ({ fileName, uploadedFile, analysis, material, settings, quote }: QuoteSummaryProps) => {
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
    if (uploadedFile && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      const shareData: ShareData = {
        title: 'Voltcraft Quote Request',
        text: message,
        files: [uploadedFile]
      }

      const canShareFiles = typeof navigator.canShare === 'function'
        ? navigator.canShare({ files: [uploadedFile] })
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

    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
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
              {settings.quantity > 1 ? `for ${settings.quantity} copies` : 'per unit'}
            </p>
          </div>
          
          {/* Price Breakdown */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-gray-100 dark:bg-voltcraft-gray-900/50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 dark:text-voltcraft-gray-400 text-sm mb-1">
                <Package className="w-4 h-4" />
                Material Cost
              </div>
              <div className="text-xl font-semibold text-gray-900 dark:text-white">
                {formatPrice(quote.materialCost)}
              </div>
            </div>
            
            <div className="p-4 bg-gray-100 dark:bg-voltcraft-gray-900/50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 dark:text-voltcraft-gray-400 text-sm mb-1">
                <Banknote className="w-4 h-4" />
                Service Fee
              </div>
              <div className="text-xl font-semibold text-gray-900 dark:text-white">
                {formatPrice(quote.laborCost)}
              </div>
            </div>
          </div>
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

      {uploadedFile && (
        <p className="text-gray-500 dark:text-voltcraft-gray-500 text-xs text-center">
          On supported mobile devices, this will open share options with your model file attached.
        </p>
      )}
    </motion.div>
  )
}

export default QuoteSummary
