import { Canvas, useThree } from '@react-three/fiber'
import { Component, useEffect, useState, type ReactNode } from 'react'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { cityCells } from '../src/render.ts'
import { themes, type Config, type Day } from '../src/model.ts'

function Controls() {
  const { camera, gl, invalidate } = useThree()
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement)
    controls.target.set(0, 0, 0)
    controls.minZoom = .55
    controls.maxZoom = 3
    controls.maxPolarAngle = Math.PI / 2.05
    controls.addEventListener('change', () => invalidate())
    controls.update()
    return () => controls.dispose()
  }, [camera, gl, invalidate])
  return null
}
class ViewerBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <p className="viewer-fallback">WebGL is unavailable. Switch to the SVG preview.</p> : this.props.children }
}
export default function Viewer({ days, settings }: { days: Day[]; settings: Config }) {
  const [selected, select] = useState<Day>()
  const [pose, reset] = useState(0)
  const [, bg, accent, secondary, violet] = themes[settings.theme]
  const cells = cityCells(days)
  const shift = (cells.at(-1)?.week ?? 0) * .5
  return <div className="viewer">
    <ViewerBoundary>
      <Canvas key={pose} orthographic camera={{ position: [35, 33, 37], zoom: 26, near: .1, far: 220 }}
        frameloop="demand" dpr={[1, 1.65]} fallback={<p>WebGL is unavailable.</p>}
        onPointerMissed={() => select(undefined)}>
        <color attach="background" args={[settings.background || (bg === 'none' ? '#17243a' : bg)]} />
        <ambientLight intensity={1.6} />
        <directionalLight color="#c4e4ff" position={[5, 12, 10]} intensity={2} />
        <directionalLight color={violet} position={[-8, 7, -9]} intensity={1.5} />
        {cells.map(cell => {
          const h = Math.max(.065, cell.intensity * 4.4)
          const color = cell.intensity > .43 ? settings.accent || accent : settings.accent2 || secondary
          return <mesh key={cell.date} position={[cell.week - shift, h / 2, cell.weekday - 3]}
            onPointerOver={event => { event.stopPropagation(); select(cell) }} onClick={() => select(cell)}>
            <boxGeometry args={[.78, h, .78]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={cell.count > 0 ? .4 : .08}
              wireframe={settings.style === 'outline'} />
          </mesh>
        })}
        <Controls />
      </Canvas>
    </ViewerBoundary>
    <div className="viewer-controls">
      <span aria-live="polite">{selected ? selected.date + ' · ' + selected.count + ' contributions' : 'Drag to orbit · Scroll or pinch to zoom'}</span>
      <button type="button" onClick={() => { reset(pose + 1); select(undefined) }}>Reset camera</button>
    </div>
  </div>
}
