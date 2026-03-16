import { useRef, useEffect, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Center, Environment, Grid } from '@react-three/drei'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { Box, RotateCcw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

interface ModelViewerProps {
  file: File | null
  dimensions?: { x: number; y: number; z: number }
  className?: string
}

// Component to load and display the STL model
const STLModel = ({ file }: { file: File }) => {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const { camera } = useThree()

  useEffect(() => {
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result
      if (result instanceof ArrayBuffer) {
        const loader = new STLLoader()
        const geo = loader.parse(result)
        geo.computeBoundingBox()
        geo.center()
        
        // Calculate scale to fit model in view
        const bbox = geo.boundingBox!
        const size = new THREE.Vector3()
        bbox.getSize(size)
        const maxDim = Math.max(size.x, size.y, size.z)
        const scale = 100 / maxDim // Scale to fit in 100 unit box
        
        geo.scale(scale, scale, scale)
        setGeometry(geo)

        // Adjust camera position
        if (camera instanceof THREE.PerspectiveCamera) {
          camera.position.set(150, 150, 150)
          camera.lookAt(0, 0, 0)
        }
      }
    }
    reader.readAsArrayBuffer(file)

    return () => {
      if (geometry) {
        geometry.dispose()
      }
    }
  }, [file])

  if (!geometry) return null

  return (
    <Center>
      <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial 
          color="#0066FF" 
          metalness={0.3} 
          roughness={0.4}
          flatShading={false}
        />
      </mesh>
    </Center>
  )
}

// Box preview for manual dimensions
const DimensionBox = ({ dimensions }: { dimensions: { x: number; y: number; z: number } }) => {
  const { x, y, z } = dimensions
  
  // Scale to fit in view (max 100 units)
  const maxDim = Math.max(x, y, z)
  const scale = maxDim > 0 ? 80 / maxDim : 1

  return (
    <Center>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[x * scale, z * scale, y * scale]} />
        <meshStandardMaterial 
          color="#00D4AA" 
          metalness={0.2} 
          roughness={0.5}
          transparent
          opacity={0.8}
        />
      </mesh>
      {/* Wireframe overlay */}
      <mesh>
        <boxGeometry args={[x * scale, z * scale, y * scale]} />
        <meshBasicMaterial 
          color="#ffffff" 
          wireframe
          transparent
          opacity={0.3}
        />
      </mesh>
    </Center>
  )
}

const ModelViewer = ({ file, dimensions, className }: ModelViewerProps) => {
  const controlsRef = useRef<any>(null)
  const [autoRotate, setAutoRotate] = useState(true)

  const handleReset = () => {
    if (controlsRef.current) {
      controlsRef.current.reset()
    }
  }

  const handleZoomIn = () => {
    if (controlsRef.current) {
      const camera = controlsRef.current.object
      camera.position.multiplyScalar(0.8)
      controlsRef.current.update()
    }
  }

  const handleZoomOut = () => {
    if (controlsRef.current) {
      const camera = controlsRef.current.object
      camera.position.multiplyScalar(1.2)
      controlsRef.current.update()
    }
  }

  const showDimensionBox = !file && dimensions && (dimensions.x > 0 || dimensions.y > 0 || dimensions.z > 0)

  return (
    <div className={`relative w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-voltcraft-gray-900 ${className || 'h-[400px] md:h-[500px] lg:h-[600px]'}`}>
      {/* 3D Canvas */}
      <Canvas
        shadows
        camera={{ position: [150, 150, 150], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* <color attach="background" args={['#0a0f1c']} /> */}
        
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[100, 100, 50]} 
          intensity={1} 
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-100, -100, -50]} intensity={0.3} />
        <pointLight position={[0, 100, 0]} intensity={0.5} />
        
        {/* Grid */}
        <Grid 
          args={[200, 200]} 
          cellSize={10}
          cellThickness={0.5}
          cellColor="#1a2035"
          sectionSize={50}
          sectionThickness={1}
          sectionColor="#2a3555"
          fadeDistance={300}
          fadeStrength={1}
          followCamera={false}
          position={[0, -50, 0]}
        />
        
        {/* Model or Dimension Box */}
        {file && <STLModel file={file} />}
        {showDimensionBox && <DimensionBox dimensions={dimensions} />}
        
        {/* Placeholder when no model */}
        {!file && !showDimensionBox && (
          <Center>
            <mesh>
              <boxGeometry args={[40, 40, 40]} />
              <meshStandardMaterial 
                color="#1a2035" 
                transparent 
                opacity={0.5}
                wireframe
              />
            </mesh>
          </Center>
        )}
        
        {/* Controls */}
        <OrbitControls 
          ref={controlsRef}
          autoRotate={autoRotate}
          autoRotateSpeed={2}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={50}
          maxDistance={500}
        />
        
        <Environment preset="city" />
      </Canvas>

      {/* Placeholder overlay when no content */}
      {!file && !showDimensionBox && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <Box className="w-16 h-16 mx-auto text-voltcraft-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-voltcraft-gray-500">Upload a model or enter dimensions</p>
            <p className="text-voltcraft-gray-600 text-sm mt-1">to see preview</p>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div className="absolute bottom-4 left-4 flex gap-2">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`p-2 rounded-lg transition-colors ${
            autoRotate 
              ? 'bg-voltcraft-primary text-white' 
              : 'bg-white dark:bg-voltcraft-dark/80 text-gray-600 dark:text-voltcraft-gray-400 hover:text-gray-900 dark:text-white'
          }`}
          title={autoRotate ? 'Stop rotation' : 'Auto rotate'}
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomIn}
          className="p-2 rounded-lg bg-white dark:bg-voltcraft-dark/80 text-gray-600 dark:text-voltcraft-gray-400 hover:text-gray-900 dark:text-white transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 rounded-lg bg-white dark:bg-voltcraft-dark/80 text-gray-600 dark:text-voltcraft-gray-400 hover:text-gray-900 dark:text-white transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleReset}
          className="p-2 rounded-lg bg-white dark:bg-voltcraft-dark/80 text-gray-600 dark:text-voltcraft-gray-400 hover:text-gray-900 dark:text-white transition-colors"
          title="Reset view"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Dimension label */}
      {showDimensionBox && (
        <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg bg-white dark:bg-voltcraft-dark/80 text-sm">
          <span className="text-gray-600 dark:text-voltcraft-gray-400">Preview: </span>
          <span className="text-gray-900 dark:text-white font-medium">
            {dimensions.x} × {dimensions.y} × {dimensions.z} mm
          </span>
        </div>
      )}

      {/* File info */}
      {file && (
        <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg bg-white dark:bg-voltcraft-dark/80 text-sm">
          <span className="text-gray-600 dark:text-voltcraft-gray-400">Model: </span>
          <span className="text-gray-900 dark:text-white font-medium truncate max-w-[200px] inline-block align-bottom">
            {file.name}
          </span>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-white dark:bg-voltcraft-dark/80 text-xs text-gray-600 dark:text-voltcraft-gray-400">
        Drag to rotate • Scroll to zoom
      </div>
    </div>
  )
}

export default ModelViewer
