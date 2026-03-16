import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { parseSTL, isValidFileType, formatFileSize } from '../utils/stlParser'
import { FileAnalysis } from '../types'

interface FileUploadProps {
  onFileAnalyzed: (file: File, analysis: FileAnalysis) => void
  isAnalyzing: boolean
  setIsAnalyzing: (value: boolean) => void
}

const FileUpload = ({ onFileAnalyzed, isAnalyzing, setIsAnalyzing }: FileUploadProps) => {
  const [error, setError] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null)
    
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    
    if (!isValidFileType(file)) {
      setError('Invalid file type. Please upload an STL, OBJ, or 3MF file.')
      return
    }

    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      setError('File too large. Maximum size is 100MB.')
      return
    }

    setUploadedFile(file)
    setIsAnalyzing(true)

    try {
      const analysis = await parseSTL(file)
      
      if (!analysis.isValid) {
        setError(analysis.errors[0] || 'Failed to analyze file')
        setIsAnalyzing(false)
        return
      }

      onFileAnalyzed(file, analysis)
    } catch (err) {
      setError('Error analyzing file. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }, [onFileAnalyzed, setIsAnalyzing])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/sla': ['.stl'],
      'model/stl': ['.stl'],
      'application/octet-stream': ['.stl', '.obj', '.3mf'],
      'model/obj': ['.obj'],
      'model/3mf': ['.3mf']
    },
    maxFiles: 1,
    disabled: isAnalyzing
  })

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-lg p-8 md:p-12 text-center cursor-pointer transition-all duration-300 ${
          isDragActive
            ? 'border-voltcraft-secondary bg-voltcraft-secondary/10'
            : 'border-gray-300 dark:border-white/20 hover:border-white/30 bg-white dark:bg-voltcraft-dark'
        } ${isAnalyzing ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input {...getInputProps()} />
        
        <AnimatePresence mode="wait">
          {isAnalyzing ? (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-4"
            >
              <Loader2 className="w-16 h-16 text-voltcraft-secondary spinner" />
              <div>
                <p className="text-gray-900 dark:text-white font-semibold text-lg">Analyzing your model...</p>
                <p className="text-gray-600 dark:text-voltcraft-gray-400 text-sm mt-1">
                  Calculating volume and dimensions
                </p>
              </div>
            </motion.div>
          ) : uploadedFile && !error ? (
            <motion.div
              key="uploaded"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <div>
                <p className="text-gray-900 dark:text-white font-semibold text-lg">{uploadedFile.name}</p>
                <p className="text-gray-600 dark:text-voltcraft-gray-400 text-sm mt-1">
                  {formatFileSize(uploadedFile.size)}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setUploadedFile(null)
                }}
                className="text-voltcraft-secondary hover:text-voltcraft-primary text-sm font-medium"
              >
                Upload different file
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="dropzone"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-4"
            >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${
                isDragActive ? 'bg-voltcraft-secondary/20' : 'bg-gray-50 dark:bg-voltcraft-darker'
              }`}>
                <Upload className={`w-10 h-10 transition-colors ${
                  isDragActive ? 'text-voltcraft-secondary' : 'text-gray-600 dark:text-voltcraft-gray-400'
                }`} />
              </div>
              <div>
                <p className="text-gray-900 dark:text-white font-semibold text-lg">
                  {isDragActive ? 'Drop your file here' : 'Drag & drop your 3D model'}
                </p>
                <p className="text-gray-600 dark:text-voltcraft-gray-400 text-sm mt-1">
                  or click to browse files
                </p>
              </div>
              <div className="flex items-center gap-2 text-gray-500 dark:text-voltcraft-gray-500 text-sm">
                <FileText className="w-4 h-4" />
                <span>Supports STL, OBJ, 3MF (max 100MB)</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium">{error}</p>
              <button
                onClick={() => {
                  setError(null)
                  setUploadedFile(null)
                }}
                className="text-red-500 text-sm mt-1 hover:underline"
              >
                Try again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default FileUpload
