import { lazy, Suspense, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import FileUpload from '../components/FileUpload'
import ManualDimensions from '../components/ManualDimensions'
import MaterialSelector from '../components/MaterialSelector'
import PrintSettingsForm from '../components/PrintSettingsForm'
import QuoteSummary from '../components/QuoteSummary'
import { Material, PrintSettings, FileAnalysis, QuoteResult } from '../types'
import { getDefaultMaterial } from '../data/materials'
import { calculateQuote, validateDimensions, BUILD_VOLUME } from '../utils/quoteCalculator'
import { AlertTriangle, ChevronDown, ChevronUp, Upload, Ruler, Maximize2 } from 'lucide-react'

const ModelViewer = lazy(() => import('../components/ModelViewer'))
const CheckoutForm = lazy(() => import('../components/CheckoutForm'))

type Step = 'upload' | 'configure' | 'order'
type InputMode = 'file' | 'manual'

interface FileQuoteBreakdownItem {
  file: File
  analysis: FileAnalysis
  material: Material
  quote: QuoteResult
}

interface FileConfig {
  scale: number
  material: Material
}

const QuotePage = () => {
  const [currentStep, setCurrentStep] = useState<Step>('upload')
  const [inputMode, setInputMode] = useState<InputMode>('file')
  const [files, setFiles] = useState<File[]>([])
  const [analysis, setAnalysis] = useState<FileAnalysis | null>(null)
  const [fileAnalyses, setFileAnalyses] = useState<Array<{ file: File; analysis: FileAnalysis }>>([])
  const [fileConfigs, setFileConfigs] = useState<Record<number, FileConfig>>({})
  const [fileQuoteBreakdown, setFileQuoteBreakdown] = useState<FileQuoteBreakdownItem[]>([])
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(0)
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
  const [modelScale, setModelScale] = useState(1.0) // 1.0 = 100% of original size

  const activeAnalysis = inputMode === 'file' ? analysis : manualAnalysis

  // Calculate max scale that fits printer
  const getMaxScale = (baseAnalysis: FileAnalysis | null): number => {
    if (!baseAnalysis) return 2.0
    const { x, y, z } = baseAnalysis.dimensions
    const maxByX = x > 0 ? BUILD_VOLUME.x / x : 2.0
    const maxByY = y > 0 ? BUILD_VOLUME.y / y : 2.0
    const maxByZ = z > 0 ? BUILD_VOLUME.z / z : 2.0
    return Math.floor(Math.min(maxByX, maxByY, maxByZ) * 10) / 10 // Round down to 0.1
  }

  const getScaledAnalysis = (baseAnalysis: FileAnalysis | null, scale: number): FileAnalysis | null => {
    if (!baseAnalysis) return null
    
    const scaledDimensions = {
      x: baseAnalysis.dimensions.x * scale,
      y: baseAnalysis.dimensions.y * scale,
      z: baseAnalysis.dimensions.z * scale
    }
    
    // Volume scales cubically
    const scaledVolume = baseAnalysis.volume * (scale ** 3)
    
    return {
      ...baseAnalysis,
      dimensions: scaledDimensions,
      volume: scaledVolume
    }
  }

  const selectedFileAnalysis = inputMode === 'file' ? fileAnalyses[selectedPreviewIndex]?.analysis || null : null
  const selectedFileScale = inputMode === 'file'
    ? (fileConfigs[selectedPreviewIndex]?.scale ?? 1)
    : modelScale

  const maxModelScale = getMaxScale(inputMode === 'file' ? selectedFileAnalysis : activeAnalysis)

  const selectedScaledAnalysis = inputMode === 'file'
    ? getScaledAnalysis(selectedFileAnalysis, selectedFileScale)
    : getScaledAnalysis(activeAnalysis, modelScale)

  const scaledAnalysis = (() => {
    if (inputMode === 'file' && fileAnalyses.length > 0) {
      const scaledPerFile = fileAnalyses
        .map((entry, index) => getScaledAnalysis(entry.analysis, fileConfigs[index]?.scale ?? 1))
        .filter((entry): entry is FileAnalysis => Boolean(entry))

      if (scaledPerFile.length === 0) {
        return null
      }

      return {
        volume: scaledPerFile.reduce((sum, entry) => sum + entry.volume, 0),
        dimensions: {
          x: Math.max(...scaledPerFile.map((entry) => entry.dimensions.x)),
          y: Math.max(...scaledPerFile.map((entry) => entry.dimensions.y)),
          z: Math.max(...scaledPerFile.map((entry) => entry.dimensions.z))
        },
        triangleCount: scaledPerFile.reduce((sum, entry) => sum + entry.triangleCount, 0),
        isValid: true,
        errors: []
      }
    }

    return getScaledAnalysis(activeAnalysis, modelScale)
  })()

  // Recalculate quote when settings or scale change
  useEffect(() => {
    if (scaledAnalysis && scaledAnalysis.isValid) {
      if (inputMode === 'file' && fileAnalyses.length > 0) {
        const breakdown = fileAnalyses.map(({ file, analysis: singleAnalysis }, index) => {
          const fileConfig = fileConfigs[index] || { scale: 1, material }
          const scaledSingleAnalysis = getScaledAnalysis(singleAnalysis, fileConfig.scale) as FileAnalysis
          const singleQuote = calculateQuote(scaledSingleAnalysis, fileConfig.material, settings)
          return {
            file,
            analysis: scaledSingleAnalysis,
            material: fileConfig.material,
            quote: singleQuote
          }
        })

        setFileQuoteBreakdown(breakdown)

        const aggregatedQuote: QuoteResult = {
          materialCost: breakdown.reduce((sum, item) => sum + item.quote.materialCost, 0),
          printTime: breakdown.reduce((sum, item) => sum + item.quote.printTime, 0),
          laborCost: breakdown.reduce((sum, item) => sum + item.quote.laborCost, 0),
          totalCost: breakdown.reduce((sum, item) => sum + item.quote.totalCost, 0),
          weight: Math.round(breakdown.reduce((sum, item) => sum + item.quote.weight, 0) * 10) / 10
        }

        setQuote(aggregatedQuote)
        setDimensionWarning(
          breakdown.some((entry) => !validateDimensions(entry.analysis.dimensions))
        )
      } else {
        const newQuote = calculateQuote(scaledAnalysis, material, settings)
        setFileQuoteBreakdown([])
        setQuote(newQuote)
        setDimensionWarning(!validateDimensions(scaledAnalysis.dimensions))
      }
    } else {
      setFileQuoteBreakdown([])
      setQuote(null)
      setDimensionWarning(false)
    }
  }, [scaledAnalysis, material, settings, inputMode, modelScale, fileAnalyses, fileConfigs])

  const handleFilesAnalyzed = (
    uploadedFiles: File[],
    fileAnalysis: FileAnalysis,
    perFileAnalyses: Array<{ file: File; analysis: FileAnalysis }>
  ) => {
    setFiles(uploadedFiles)
    setAnalysis(fileAnalysis)
    setFileAnalyses(perFileAnalyses)
    setFileConfigs(
      uploadedFiles.reduce<Record<number, FileConfig>>((acc, _file, index) => {
        acc[index] = {
          scale: 1,
          material: getDefaultMaterial()
        }
        return acc
      }, {})
    )
    setSelectedPreviewIndex(0)
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
    setFiles([])
    setAnalysis(null)
    setFileAnalyses([])
    setFileConfigs({})
    setFileQuoteBreakdown([])
    setManualAnalysis(null)
    setQuote(null)
    setCurrentStep('upload')
    setModelScale(1.0)
    setSelectedPreviewIndex(0)
  }

  const viewerDimensions = inputMode === 'file'
    ? (selectedScaledAnalysis?.dimensions || selectedFileAnalysis?.dimensions)
    : (scaledAnalysis?.dimensions || activeAnalysis?.dimensions)

  const selectedMaterial = inputMode === 'file'
    ? (fileConfigs[selectedPreviewIndex]?.material || material)
    : material

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
        <AnimatePresence mode="wait" initial={false}>
          {currentStep === 'upload' && (
            <motion.div
              key="upload"
              initial={false}
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
                  <AnimatePresence mode="wait" initial={false}>
                    {inputMode === 'file' && (
                      <motion.div
                        key="file-upload"
                        initial={false}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                      >
                        <FileUpload
                          onFilesAnalyzed={handleFilesAnalyzed}
                          isAnalyzing={isAnalyzing}
                          setIsAnalyzing={setIsAnalyzing}
                        />
                      </motion.div>
                    )}

                    {inputMode === 'manual' && (
                      <motion.div
                        key="manual-input"
                        initial={false}
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
                      file={inputMode === 'file' ? files[selectedPreviewIndex] ?? null : null}
                      dimensions={viewerDimensions}
                      className="h-full"
                    />
                  </div>
                  {inputMode === 'file' && files.length > 1 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {files.map((previewFile, index) => (
                        <button
                          key={previewFile.name + index}
                          onClick={() => setSelectedPreviewIndex(index)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            selectedPreviewIndex === index
                              ? 'bg-voltcraft-primary text-white border-voltcraft-primary'
                              : 'bg-white dark:bg-voltcraft-dark text-gray-700 dark:text-voltcraft-gray-300 border-gray-200 dark:border-white/10 hover:border-voltcraft-primary/50'
                          }`}
                        >
                          {index + 1}. {previewFile.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-center text-gray-500 dark:text-voltcraft-gray-500 text-sm mt-3">
                    {files.length > 0 ? '3D Model Preview (switch files using buttons above)' : inputMode === 'manual' && manualAnalysis ? 'Dimension Preview' : 'Preview will appear here'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 'configure' && activeAnalysis && (
            <motion.div
              key="configure"
              initial={false}
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
                      {inputMode === 'file' && files.length > 1
                        ? 'One or more selected files currently exceed build volume. Switch file tabs and reduce the scale for each oversized file.'
                        : `Your model dimensions (${Math.round(selectedScaledAnalysis?.dimensions.x || 0)} × ${Math.round(selectedScaledAnalysis?.dimensions.y || 0)} × ${Math.round(selectedScaledAnalysis?.dimensions.z || 0)} mm) exceed our printer's build volume (${BUILD_VOLUME.x} × ${BUILD_VOLUME.y} × ${BUILD_VOLUME.z} mm). Use the scale slider above to reduce the size.`}
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
                            {inputMode === 'file'
                              ? (files.length > 1 ? `${files.length} models uploaded` : files[0]?.name)
                              : `${activeAnalysis.dimensions.x} × ${activeAnalysis.dimensions.y} × ${activeAnalysis.dimensions.z} mm`}
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
                        <div className="p-4 bg-gray-50 dark:bg-voltcraft-darker rounded-lg">
                          <span className="text-gray-500 dark:text-voltcraft-gray-500">Volume</span>
                          <p className="text-gray-900 dark:text-white font-medium">{Math.round(scaledAnalysis?.volume || 0)} cm³</p>
                        </div>
                        <div className="p-2 bg-gray-50 dark:bg-voltcraft-darker rounded-lg">
                          <span className="text-gray-500 dark:text-voltcraft-gray-500">Type</span>
                          <p className="text-gray-900 dark:text-white font-medium">{inputMode === 'file' ? 'STL File' : 'Estimated'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Mini 3D Preview */}
                    <div className="h-64 md:h-80 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10">
                      <Suspense
                        fallback={
                          <div className="h-full flex items-center justify-center text-sm text-gray-500 dark:text-voltcraft-gray-500">
                            Loading 3D preview...
                          </div>
                        }
                      >
                        <ModelViewer 
                          file={inputMode === 'file' ? files[selectedPreviewIndex] ?? null : null}
                          dimensions={viewerDimensions}
                          className="h-full"
                        />
                      </Suspense>
                    </div>
                  </div>

                  {inputMode === 'file' && files.length > 1 && (
                    <div className="flex flex-wrap gap-2">
                      {files.map((previewFile, index) => (
                        <button
                          key={`configure-${previewFile.name}-${index}`}
                          onClick={() => setSelectedPreviewIndex(index)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            selectedPreviewIndex === index
                              ? 'bg-voltcraft-primary text-white border-voltcraft-primary'
                              : 'bg-white dark:bg-voltcraft-dark text-gray-700 dark:text-voltcraft-gray-300 border-gray-200 dark:border-white/10 hover:border-voltcraft-primary/50'
                          }`}
                        >
                          {index + 1}. {previewFile.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Model Scale Slider */}
                  <div className="p-4 bg-white dark:bg-voltcraft-dark rounded-lg border border-gray-200 dark:border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-voltcraft-gray-300 flex items-center gap-2">
                        <Maximize2 className="w-4 h-4 text-voltcraft-primary" />
                        {inputMode === 'file' ? `Scale: ${files[selectedPreviewIndex]?.name || 'Selected file'}` : 'Model Scale'}
                      </h4>
                      <span className="text-sm font-semibold text-voltcraft-primary">
                        {Math.round(selectedFileScale * 100)}% (max {Math.round(maxModelScale * 100)}%)
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0.25"
                      max={maxModelScale}
                      step="0.01"
                      value={selectedFileScale}
                      onChange={(e) => {
                        const nextScale = Number(e.target.value)
                        if (inputMode === 'file') {
                          setFileConfigs((prev) => ({
                            ...prev,
                            [selectedPreviewIndex]: {
                              scale: nextScale,
                              material: prev[selectedPreviewIndex]?.material || material
                            }
                          }))
                        } else {
                          setModelScale(nextScale)
                        }
                      }}
                      className="w-full h-2 bg-gray-200 dark:bg-voltcraft-gray-800 rounded-lg appearance-none cursor-pointer accent-voltcraft-primary"
                    />

                    <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-gray-500 dark:text-voltcraft-gray-500 mb-1">Scaled Dimensions</p>
                        <p className="text-gray-900 dark:text-white font-medium">
                          {Math.round(viewerDimensions?.x || 0)} × {Math.round(viewerDimensions?.y || 0)} × {Math.round(viewerDimensions?.z || 0)} mm
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-voltcraft-gray-500 mb-1">Max Build Volume</p>
                        <p className="text-gray-900 dark:text-white font-medium">
                          {BUILD_VOLUME.x} × {BUILD_VOLUME.y} × {BUILD_VOLUME.z} mm
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-voltcraft-gray-500 mt-3">
                      Adjust the scale to fit your model within the printer's build volume. All costs will update automatically.
                    </p>
                  </div>

                  {/* Material Selector */}
                  <MaterialSelector
                    selectedMaterial={selectedMaterial}
                    onSelectMaterial={(newMaterial) => {
                      if (inputMode === 'file') {
                        setFileConfigs((prev) => ({
                          ...prev,
                          [selectedPreviewIndex]: {
                            scale: prev[selectedPreviewIndex]?.scale ?? 1,
                            material: newMaterial
                          }
                        }))
                      } else {
                        setMaterial(newMaterial)
                      }

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
                              availableColors={selectedMaterial.colors}
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
                    {quote && scaledAnalysis && (
                      <>
                        <QuoteSummary
                          fileName={
                            inputMode === 'file'
                              ? (files.length > 1 ? `${files.length} models` : (files[0]?.name || 'model.stl'))
                              : 'Manual Dimensions'
                          }
                          uploadedFiles={inputMode === 'file' ? files : []}
                          analysis={scaledAnalysis}
                          material={selectedMaterial}
                          settings={settings}
                          quote={quote}
                          fileBreakdown={fileQuoteBreakdown.map((item) => ({
                            fileName: item.file.name,
                            materialShortName: item.material.shortName,
                            analysis: item.analysis,
                            quote: item.quote
                          }))}
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

          {currentStep === 'order' && scaledAnalysis && quote && (
            <motion.div
              key="order"
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="p-6 md:p-8 bg-white dark:bg-voltcraft-dark rounded-lg border border-gray-200 dark:border-white/10">
                <Suspense
                  fallback={
                    <div className="py-12 text-center text-sm text-gray-500 dark:text-voltcraft-gray-500">
                      Loading checkout...
                    </div>
                  }
                >
                  <CheckoutForm
                    fileName={
                      inputMode === 'file'
                        ? (files.length > 1 ? `${files.length} models` : (files[0]?.name || 'model.stl'))
                        : 'Manual Dimensions Entry'
                    }
                    uploadedFiles={inputMode === 'file' ? files : []}
                    analysis={scaledAnalysis}
                    material={material}
                    settings={settings}
                    quote={quote}
                  />
                </Suspense>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default QuotePage

