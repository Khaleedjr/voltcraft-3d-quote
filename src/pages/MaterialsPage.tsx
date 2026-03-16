import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { materials } from '../data/materials'
import { Material } from '../types'
import { 
  ArrowRight, 
  Info, 
  Thermometer, 
  Flame, 
  Droplets,
  Shield,
  Feather,
  Zap
} from 'lucide-react'

const PropertyBar = ({ value, max = 5, color = 'voltcraft-primary' }: { value: number; max?: number; color?: string }) => (
  <div className="flex gap-1">
    {Array.from({ length: max }).map((_, i) => (
      <div
        key={i}
        className={`h-2 w-6 rounded-full ${
          i < value ? `bg-${color}` : 'bg-gray-200 dark:bg-voltcraft-gray-700'
        }`}
      />
    ))}
  </div>
)

const MaterialsPage = () => {
  const [selectedMaterial, setSelectedMaterial] = useState<Material>(materials[0])

  const getPropertyIcon = (prop: string) => {
    switch (prop) {
      case 'strength': return Shield
      case 'flexibility': return Feather
      case 'heatResistance': return Flame
      case 'printability': return Zap
      default: return Info
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-3xl md:text-4xl   font-bold   text-gray-900 dark:text-white">
            Materials <span className="text-voltcraft-primary">Guide</span>
          </h1>
          <p className="mt-4 text-gray-600 dark:text-voltcraft-gray-400 max-w-2xl mx-auto">
            Choose the right material for your project. Each material has unique properties 
            suited for different applications.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Material List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Available Materials</h2>
            {materials.map((mat, index) => (
              <motion.button
                key={mat.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setSelectedMaterial(mat)}
                className={`w-full p-4 rounded-lg text-left transition-all ${
                  selectedMaterial.id === mat.id
                    ? 'bg-voltcraft-primary/20 border-2 border-voltcraft-primary'
                    : 'bg-white dark:bg-voltcraft-dark border-2 border-gray-200 dark:border-voltcraft-gray-800 hover:border-voltcraft-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{mat.shortName}</h3>
                    <p className="text-sm text-gray-600 dark:text-voltcraft-gray-400">{mat.name.split('(')[1]?.replace(')', '') || mat.name}</p>
                  </div>
                  <div className="text-voltcraft-primary font-semibold">
                    ₦{mat.pricePerGram}/g
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Material Details */}
          <motion.div
            key={selectedMaterial.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2"
          >
            <div className="bg-white dark:bg-voltcraft-dark rounded-lg border border-gray-200 dark:border-voltcraft-gray-800 overflow-hidden">
              {/* Header */}
              <div className="p-6 md:p-8 bg-voltcraft-primary/10 border-b border-gray-200 dark:border-voltcraft-gray-800">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl md:text-3xl   font-bold   text-gray-900 dark:text-white">
                      {selectedMaterial.shortName}
                    </h2>
                    <p className="text-gray-600 dark:text-voltcraft-gray-400 mt-1">{selectedMaterial.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-voltcraft-gray-400">Price per gram</p>
                    <p className="text-3xl  font-bold   text-voltcraft-primary">₦{selectedMaterial.pricePerGram}</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 md:p-8 space-y-8">
                {/* Description */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Info className="w-5 h-5 text-voltcraft-primary" />
                    About this material
                  </h3>
                  <p className="text-gray-700 dark:text-voltcraft-gray-300 leading-relaxed">
                    {selectedMaterial.description}
                  </p>
                </div>

                {/* Properties */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Material Properties</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(selectedMaterial.properties).map(([key, value]) => {
                      const Icon = getPropertyIcon(key)
                      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
                      
                      return (
                        <div key={key} className="p-4 bg-gray-100 dark:bg-voltcraft-gray-900/50 rounded-lg">
                          <div className="flex items-center gap-2 text-gray-600 dark:text-voltcraft-gray-400 text-sm mb-2">
                            <Icon className="w-4 h-4 text-voltcraft-primary" />
                            {label}
                          </div>
                          <PropertyBar value={value} />
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Print Settings */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recommended Print Settings</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-100 dark:bg-voltcraft-gray-900/50 rounded-lg text-center">
                      <Thermometer className="w-5 h-5 text-voltcraft-primary mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-voltcraft-gray-400">Nozzle Temp</p>
                      <p className="text-xl font-semibold text-gray-900 dark:text-white">{selectedMaterial.nozzleTemp}°C</p>
                    </div>
                    <div className="p-4 bg-gray-100 dark:bg-voltcraft-gray-900/50 rounded-lg text-center">
                      <Flame className="w-5 h-5 text-voltcraft-primary mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-voltcraft-gray-400">Bed Temp</p>
                      <p className="text-xl font-semibold text-gray-900 dark:text-white">{selectedMaterial.bedTemp}°C</p>
                    </div>
                    <div className="p-4 bg-gray-100 dark:bg-voltcraft-gray-900/50 rounded-lg text-center">
                      <Droplets className="w-5 h-5 text-voltcraft-primary mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-voltcraft-gray-400">Print Speed</p>
                      <p className="text-xl font-semibold text-gray-900 dark:text-white">{selectedMaterial.printSpeed} mm/s</p>
                    </div>
                  </div>
                </div>

                {/* Available Colors */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Available Colors</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedMaterial.colors.map((color) => (
                      <span
                        key={color}
                        className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-voltcraft-gray-900/50 text-gray-900 dark:text-white text-sm"
                      >
                        {color}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Best For */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Best Used For</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedMaterial.suitable.map((use) => (
                      <span
                        key={use}
                        className="px-4 py-2 rounded-lg bg-voltcraft-primary/10 border border-voltcraft-primary/30 text-voltcraft-primary text-sm"
                      >
                        {use}
                      </span>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <div className="pt-4 border-t border-gray-200 dark:border-voltcraft-gray-800">
                  <Link
                    to="/quote"
                    className="flex items-center justify-center gap-2 w-full px-6 py-4 bg-voltcraft-primary rounded-lg font-semibold text-white hover:opacity-90 transition-opacity"
                  >
                    Print with {selectedMaterial.shortName}
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Comparison Table */}
        <div className="mt-16">
          <h2 className="text-2xl   font-bold   text-gray-900 dark:text-white mb-8 text-center">
            Material Comparison
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-voltcraft-gray-800">
                  <th className="text-left py-4 px-4 text-gray-600 dark:text-voltcraft-gray-400 font-medium">Material</th>
                  <th className="text-center py-4 px-4 text-gray-600 dark:text-voltcraft-gray-400 font-medium">Price</th>
                  <th className="text-center py-4 px-4 text-gray-600 dark:text-voltcraft-gray-400 font-medium">Strength</th>
                  <th className="text-center py-4 px-4 text-gray-600 dark:text-voltcraft-gray-400 font-medium">Flexibility</th>
                  <th className="text-center py-4 px-4 text-gray-600 dark:text-voltcraft-gray-400 font-medium">Heat Resistance</th>
                  <th className="text-center py-4 px-4 text-gray-600 dark:text-voltcraft-gray-400 font-medium">Printability</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((mat) => (
                  <tr
                    key={mat.id}
                    className="border-b border-gray-200 dark:border-voltcraft-gray-800/50 hover:bg-gray-100 dark:bg-voltcraft-gray-900/30 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <span className="font-semibold text-gray-900 dark:text-white">{mat.shortName}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-voltcraft-primary font-semibold">₦{mat.pricePerGram}/g</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex justify-center">
                        <PropertyBar value={mat.properties.strength} />
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex justify-center">
                        <PropertyBar value={mat.properties.flexibility} />
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex justify-center">
                        <PropertyBar value={mat.properties.heatResistance} />
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex justify-center">
                        <PropertyBar value={mat.properties.printability} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MaterialsPage
