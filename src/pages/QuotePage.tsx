import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import FileUpload from '../components/FileUpload'
import ManualDimensions from '../components/ManualDimensions'
import ModelViewer from '../components/ModelViewer'
import MaterialSelector from '../components/MaterialSelector'
import PrintSettingsForm from '../components/PrintSettingsForm'
import QuoteSummary from '../components/QuoteSummary'
import OrderForm from '../components/OrderForm'
import { Material, PrintSettings, FileAnalysis, QuoteResult } from '../types'
import { getDefaultMaterial } from '../data/materials'
import { calculateQuote, validateDimensions, BUILD_VOLUME } from '../utils/quoteCalculator'
import { AlertTriangle, ChevronDown, ChevronUp, Upload, Ruler } from 'lucide-react'

type Step = 'upload' | 'configure' | 'order'
type InputMode = 'file' | 'manual'

const QuotePage = () => {
  const [currentStep, setCurrentStep] = useState<Step>('upload')
  const [inputMode, setInputMode] = useState<InputMode>('file')
  const [file, setFile] = useState<File | null>(null)
  const [analysis, setAnalysis] = useState<FileAnalysis | null>(null)
  const [manualAnalysis, setManualAnalysis] = useState<FileAnalysis | null>(null)
  const [material, setMaterial] = useState<Material>(getDefaultMaterial())
  const [settings, setSettings] = useState<PrintSettings>({
    layerHeight: 0.2,
    infillPercentage: 20,
    supportEnabled: false,
    quantity: 1,
    color: getDefaultMaterial().colors[0]
  })
  const [quote, setQuote] = useState<QuoteResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [dimensionWarning, setDimensionWarning] = useState(false)

  // Get the active analysis (from file or manual)
  const activeAnalysis = inputMode === 'file' ? analysis : manualAnalysis

  // Recalculate quote when settings change
  useEffect(() => {
    if (activeAnalysis && activeAnalysis.isValid) {
      const newQuote = calculateQuote(activeAnalysis, material, settings)
      setQuote(newQuote)
      setDimensionWarning(!validateDimensions(activeAnalysis.dimensions))
    } else {
      setQuote(null)
    }
  }, [activeAnalysis, material, settings, inputMode])

  const handleFileAnalyzed = (uploadedFile: File, fileAnalysis: FileAnalysis) => {
    setFile(uploadedFile)
    setAnalysis(fileAnalysis)
    setInputMode('file')
    // Stay on upload step to show 3D preview first - user clicks to continue
  }

  const handleManualDimensionsChange = useCallback((newAnalysis: FileAnalysis | null) => {
    setManualAnalysis(newAnalysis)
    if (newAnalysis && newAnalysis.isValid) {
      setInputMode('manual')
    }
  }, [])

  const handleProceedToOrder = () => {
    setCurrentStep('order')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetToUpload = () => {
    setFile(null)
    setAnalysis(null)
    setManualAnalysis(null)
    setQuote(null)
    setCurrentStep('upload')
  }

  // Get dimensions for the 3D viewer
  const viewerDimensions = inputMode === 'manual' && manualAnalysis 
    ? manualAnalysis.dimensions 
    : analysis?.dimensions

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl   font-bold   text-gray-900 dark:text-white">
            Get Your <span className="text-voltcraft-primary">Instant Quote</span>
          </h1>
          <p className="mt-4 text-gray-600 dark:text-voltcraft-gray-400 max-w-2xl mx-auto">
            Upload your 3D model or enter dimensions manually to receive 
            an instant price estimate.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {[
            { key: 'upload', label: '1. Model' },
            { key: 'configure', label: '2. Configure' },
            { key: 'order', label: '3. Order' }
          ].map((step, index) => (
            <div key={step.key} className="flex items-center">
              <button
                onClick={() => {
                  if (step.key === 'upload') setCurrentStep('upload')
                  else if (step.key === 'configure' && activeAnalysis) setCurrentStep('configure')
                  else if (step.key === 'order' && quote) setCurrentStep('order')
                }}
                disabled={
                  (step.key === 'configure' && !activeAnalysis) ||
                  (step.key === 'order' && !quote)
                }
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  currentStep === step.key
                    ? 'bg-voltcraft-primary'
                    : activeAnalysis && (step.key === 'upload' || (step.key === 'configure') || (step.key === 'order' && quote))
                    ? 'bg-white dark:bg-voltcraft-dark text-gray-700 dark:text-voltcraft-gray-300 hover:bg-white dark:bg-voltcraft-dark/80'
                    : 'bg-gray-50 dark:bg-voltcraft-darker text-voltcraft-gray-600 cursor-not-allowed'
                }`}
              >
                {step.label}
              </button>
              {index < 2 && (
                <div className={`w-8 h-0.5 mx-2 ${
                  (index === 0 && activeAnalysis) || (index === 1 && quote)
                    ? 'bg-voltcraft-secondary'
                    : 'bg-gray-200 dark:bg-voltcraft-gray-800'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {currentStep === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Upload & Manual Input */}
                <div className="space-y-6">
                  {/* Input Mode Tabs */}
                  <div className="flex gap-2 p-1 bg-gray-50 dark:bg-voltcraft-darker rounded-lg">
                    <button
                      onClick={() => setInputMode('file')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                        inputMode === 'file'
                          ? 'bg-voltcraft-primary text-white'
                          : 'text-gray-600 dark:text-voltcraft-gray-400 hover:text-gray-900 dark:text-white'
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      Upload File
                    </button>
                    <button
                      onClick={() => setInputMode('manual')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                        inputMode === 'manual'
                          ? 'bg-voltcraft-primary text-white'
                          : 'text-gray-600 dark:text-voltcraft-gray-400 hover:text-gray-900 dark:text-white'
                      }`}
                    >
                      <Ruler className="w-4 h-4" />
                      Enter Dimensions
                    </button>
                  </div>

                  {/* File Upload */}
                  <AnimatePresence mode="wait">
                    {inputMode === 'file' && (
                      <motion.div
                        key="file-upload"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                      >
                        <FileUpload
                          onFileAnalyzed={handleFileAnalyzed}
                          isAnalyzing={isAnalyzing}
                          setIsAnalyzing={setIsAnalyzing}
                        />
                      </motion.div>
                    )}

                    {inputMode === 'manual' && (
                      <motion.div
                        key="manual-input"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                      >
                        <ManualDimensions 
                          onDimensionsChange={handleManualDimensionsChange}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Quick proceed button */}
                  {activeAnalysis && currentStep === 'upload' && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => setCurrentStep('configure')}
                      className="w-full px-6 py-4 bg-voltcraft-primary rounded-lg font-semibold text-white hover:opacity-90 transition-opacity"
                    >
                      Continue to Configure →
                    </motion.button>
                  )}
                </div>

                {/* Right: 3D Preview */}
                <div className="lg:sticky lg:top-24 lg:self-start w-full">
                  <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 h-[400px] md:h-[500px] lg:h-[600px]">
                    <ModelViewer 
                      file={inputMode === 'file' ? file : null}
                      dimensions={viewerDimensions}
                      className="h-full"
                    />
                  </div>
                  <p className="text-center text-gray-500 dark:text-voltcraft-gray-500 text-sm mt-3">
                    {file ? '3D Model Preview' : inputMode === 'manual' && manualAnalysis ? 'Dimension Preview' : 'Preview will appear here'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 'configure' && activeAnalysis && (
            <motion.div
              key="configure"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Dimension Warning */}
              {dimensionWarning && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-3"
                >
                  <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-400 font-medium">Model exceeds build volume</p>
                    <p className="text-yellow-400/80 text-sm mt-1">
                      Your model dimensions ({activeAnalysis.dimensions.x} × {activeAnalysis.dimensions.y} × {activeAnalysis.dimensions.z} mm) 
                      exceed our printer's build volume ({BUILD_VOLUME.x} × {BUILD_VOLUME.y} × {BUILD_VOLUME.z} mm). 
                      The model may need to be scaled down or printed in parts.
                    </p>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Settings */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Model info & 3D Preview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Info card */}
                    <div className="p-4 bg-white dark:bg-voltcraft-dark rounded-lg border border-gray-200 dark:border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-voltcraft-gray-400">
                            {inputMode === 'file' ? 'Uploaded File' : 'Manual Dimensions'}
                          </p>
                          <p className="text-gray-900 dark:text-white font-medium">
                            {inputMode === 'file' ? file?.name : `${activeAnalysis.dimensions.x} × ${activeAnalysis.dimensions.y} × ${activeAnalysis.dimensions.z} mm`}
                          </p>
                        </div>
                        <button
                          onClick={resetToUpload}
                          className="text-voltcraft-secondary hover:text-voltcraft-primary text-sm font-medium"
                        >
                          Change
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 bg-gray-50 dark:bg-voltcraft-darker rounded-lg">
                          <span className="text-gray-500 dark:text-voltcraft-gray-500">Volume</span>
                          <p className="text-gray-900 dark:text-white font-medium">{activeAnalysis.volume} cm³</p>
                        </div>
                        <div className="p-2 bg-gray-50 dark:bg-voltcraft-darker rounded-lg">
                          <span className="text-gray-500 dark:text-voltcraft-gray-500">Type</span>
                          <p className="text-gray-900 dark:text-white font-medium">{inputMode === 'file' ? 'STL File' : 'Estimated'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Mini 3D Preview */}
                    <div className="h-64 md:h-80 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10">
                      <ModelViewer 
                        file={inputMode === 'file' ? file : null}
                        dimensions={activeAnalysis.dimensions}
                        className="h-full"
                      />
                    </div>
                  </div>

                  {/* Material Selector */}
                  <MaterialSelector
                    selectedMaterial={material}
                    onSelectMaterial={(newMaterial) => {
                      setMaterial(newMaterial)
                      if (!newMaterial.colors.includes(settings.color)) {
                        setSettings(prev => ({ ...prev, color: newMaterial.colors[0] || 'Black' }))
                      }
                    }}
                  />

                  {/* Print Settings */}
                  <div className="space-y-4">
                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="flex items-center gap-2 text-gray-700 dark:text-voltcraft-gray-300 hover:text-gray-900 dark:text-white transition-colors"
                    >
                      {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      <span className="font-medium">Print Settings</span>
                      <span className="text-sm text-gray-500 dark:text-voltcraft-gray-500">
                        ({settings.layerHeight}mm layer, {settings.infillPercentage}% infill)
                      </span>
                    </button>

                    <AnimatePresence>
                      {showAdvanced && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-6 bg-white dark:bg-voltcraft-dark rounded-lg border border-gray-200 dark:border-voltcraft-gray-800">
                            <PrintSettingsForm
                              settings={settings}
                              onSettingsChange={setSettings}
                              availableColors={material.colors}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Right Column - Quote */}
                <div className="lg:col-span-1">
                  <div className="sticky top-24">
                    {quote && (
                      <>
                        <QuoteSummary
                          fileName={inputMode === 'file' ? (file?.name || 'model.stl') : 'Manual Dimensions'}
                          uploadedFile={inputMode === 'file' ? file : null}
                          analysis={activeAnalysis}
                          material={material}
                          settings={settings}
                          quote={quote}
                        />
                        
                        <motion.button
                          onClick={handleProceedToOrder}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full mt-6 px-6 py-4 bg-voltcraft-primary rounded-lg font-semibold text-white hover:opacity-90 transition-opacity text-lg"
                        >
                          Proceed to Order
                        </motion.button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 'order' && activeAnalysis && quote && (
            <motion.div
              key="order"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="p-6 md:p-8 bg-white dark:bg-voltcraft-dark rounded-lg border border-gray-200 dark:border-white/10">
                <OrderForm
                  fileName={inputMode === 'file' ? (file?.name || 'model.stl') : 'Manual Dimensions Entry'}
                  analysis={activeAnalysis}
                  material={material}
                  settings={settings}
                  quote={quote}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default QuotePage
