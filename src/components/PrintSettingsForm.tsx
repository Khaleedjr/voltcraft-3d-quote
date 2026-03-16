import { motion } from 'framer-motion'
import { PrintSettings } from '../types'
import { Layers, Grid3X3, Combine, Hash, Palette } from 'lucide-react'

interface PrintSettingsFormProps {
  settings: PrintSettings
  onSettingsChange: (settings: PrintSettings) => void
  availableColors: string[]
}

const layerHeightOptions = [
  { value: 0.28, label: 'Draft', description: '0.28mm - Fastest, visible layers' },
  { value: 0.2, label: 'Standard', description: '0.20mm - Good balance' },
  { value: 0.16, label: 'Quality', description: '0.16mm - Better detail' },
  { value: 0.12, label: 'Fine', description: '0.12mm - High detail' },
  { value: 0.08, label: 'Ultra Fine', description: '0.08mm - Best detail, slowest' },
]

const infillPresets = [
  { value: 10, label: 'Light', description: 'Decorative items' },
  { value: 20, label: 'Standard', description: 'General purpose' },
  { value: 40, label: 'Strong', description: 'Functional parts' },
  { value: 60, label: 'Very Strong', description: 'High stress parts' },
  { value: 80, label: 'Solid', description: 'Maximum strength' },
]

const PrintSettingsForm = ({ settings, onSettingsChange, availableColors }: PrintSettingsFormProps) => {
  const updateSetting = <K extends keyof PrintSettings>(
    key: K,
    value: PrintSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value })
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Print Settings</h3>
      
      {/* Color */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-voltcraft-gray-300">
          <Palette className="w-4 h-4 text-voltcraft-primary" />
          Material Color
        </label>
        <div className="flex flex-wrap gap-2">
          {availableColors.map((color) => (
            <motion.button
              key={color}
              onClick={() => updateSetting('color', color)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                settings.color === color
                  ? 'bg-voltcraft-primary text-white'
                  : 'bg-white dark:bg-voltcraft-dark border-2 border-gray-200 dark:border-voltcraft-gray-800 text-gray-900 dark:text-white hover:border-voltcraft-gray-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full border border-voltcraft-gray-600 shadow-sm"
                  style={{ backgroundColor: color.toLowerCase() === 'white' ? '#f0f0f0' : color.toLowerCase() }}
                />
                {color}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Layer Height */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-voltcraft-gray-300">
          <Layers className="w-4 h-4 text-voltcraft-primary" />
          Layer Height (Quality)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {layerHeightOptions.map((option) => (
            <motion.button
              key={option.value}
              onClick={() => updateSetting('layerHeight', option.value)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`p-3 rounded-lg text-left transition-all ${
                settings.layerHeight === option.value
                  ? 'bg-voltcraft-primary/20 border-2 border-voltcraft-primary'
                  : 'bg-white dark:bg-voltcraft-dark border-2 border-gray-200 dark:border-voltcraft-gray-800 hover:border-voltcraft-gray-600'
              }`}
            >
              <div className="font-medium text-gray-900 dark:text-white text-sm">{option.label}</div>
              <div className="text-xs text-gray-600 dark:text-voltcraft-gray-400 mt-0.5">{option.value}mm</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Infill */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-voltcraft-gray-300">
          <Grid3X3 className="w-4 h-4 text-voltcraft-primary" />
          Infill Density (Strength)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {infillPresets.map((option) => (
            <motion.button
              key={option.value}
              onClick={() => updateSetting('infillPercentage', option.value)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`p-3 rounded-lg text-left transition-all ${
                settings.infillPercentage === option.value
                  ? 'bg-voltcraft-primary/20 border-2 border-voltcraft-primary'
                  : 'bg-white dark:bg-voltcraft-dark border-2 border-gray-200 dark:border-voltcraft-gray-800 hover:border-voltcraft-gray-600'
              }`}
            >
              <div className="font-medium text-gray-900 dark:text-white text-sm">{option.label}</div>
              <div className="text-xs text-gray-600 dark:text-voltcraft-gray-400 mt-0.5">{option.value}%</div>
            </motion.button>
          ))}
        </div>
        
        {/* Custom infill slider */}
        <div className="pt-2">
          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={settings.infillPercentage}
            onChange={(e) => updateSetting('infillPercentage', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-voltcraft-gray-800 rounded-lg appearance-none cursor-pointer accent-voltcraft-primary"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-voltcraft-gray-500 mt-1">
            <span>5%</span>
            <span className="text-voltcraft-primary font-medium">{settings.infillPercentage}%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Support */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-voltcraft-gray-300">
          <Combine className="w-4 h-4 text-voltcraft-primary" />
          Support Structures
        </label>
        <div className="flex gap-3">
          <motion.button
            onClick={() => updateSetting('supportEnabled', false)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`flex-1 p-4 rounded-lg text-left transition-all ${
              !settings.supportEnabled
                ? 'bg-voltcraft-primary/20 border-2 border-voltcraft-primary'
                : 'bg-white dark:bg-voltcraft-dark border-2 border-gray-200 dark:border-voltcraft-gray-800 hover:border-voltcraft-gray-600'
            }`}
          >
            <div className="font-medium text-gray-900 dark:text-white">No Support</div>
            <div className="text-xs text-gray-600 dark:text-voltcraft-gray-400 mt-1">
              For models with no overhangs
            </div>
          </motion.button>
          
          <motion.button
            onClick={() => updateSetting('supportEnabled', true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`flex-1 p-4 rounded-lg text-left transition-all ${
              settings.supportEnabled
                ? 'bg-voltcraft-primary/20 border-2 border-voltcraft-primary'
                : 'bg-white dark:bg-voltcraft-dark border-2 border-gray-200 dark:border-voltcraft-gray-800 hover:border-voltcraft-gray-600'
            }`}
          >
            <div className="font-medium text-gray-900 dark:text-white">With Support</div>
            <div className="text-xs text-gray-600 dark:text-voltcraft-gray-400 mt-1">
              For complex geometries (+15% material)
            </div>
          </motion.button>
        </div>
      </div>

      {/* Quantity */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-voltcraft-gray-300">
          <Hash className="w-4 h-4 text-voltcraft-primary" />
          Quantity
        </label>
        <div className="flex items-center gap-4">
          <motion.button
            onClick={() => updateSetting('quantity', Math.max(1, settings.quantity - 1))}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 rounded-lg bg-white dark:bg-voltcraft-dark border-2 border-gray-200 dark:border-voltcraft-gray-800 hover:border-voltcraft-gray-600 flex items-center justify-center text-gray-900 dark:text-white text-xl font-bold"
          >
            -
          </motion.button>
          
          <input
            type="number"
            min="1"
            max="100"
            value={settings.quantity}
            onChange={(e) => updateSetting('quantity', Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
            className="w-20 h-12 bg-white dark:bg-voltcraft-dark border-2 border-gray-200 dark:border-voltcraft-gray-800 rounded-lg text-center text-gray-900 dark:text-white text-lg font-semibold focus:outline-none focus:border-voltcraft-primary"
          />
          
          <motion.button
            onClick={() => updateSetting('quantity', Math.min(100, settings.quantity + 1))}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 rounded-lg bg-white dark:bg-voltcraft-dark border-2 border-gray-200 dark:border-voltcraft-gray-800 hover:border-voltcraft-gray-600 flex items-center justify-center text-gray-900 dark:text-white text-xl font-bold"
          >
            +
          </motion.button>
          
          <span className="text-gray-600 dark:text-voltcraft-gray-400 text-sm">
            {settings.quantity > 1 ? 'copies' : 'copy'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default PrintSettingsForm
