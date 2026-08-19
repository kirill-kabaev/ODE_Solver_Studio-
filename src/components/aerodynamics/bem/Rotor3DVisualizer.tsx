// ============================================================================
// 3D Rotor & Slipstream Visualizer Component (Interactive Canvas)
// Renders 3D rotating blades, contracted slipstream wake tube, ducted shroud,
// force vectors, velocity triangles, and section aero colormaps.
// ============================================================================

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Eye, Layers, Wind, Disc, Compass } from 'lucide-react';
import { RotorBEMResults, RotorGeometryConfig, FlowOperatingCondition } from './bemTypes';
import { createHardware2DContext } from '../../../utils/gpuHardwareEnforcer';

interface Rotor3DVisualizerProps {
  config: RotorGeometryConfig;
  flow: FlowOperatingCondition;
  results: RotorBEMResults;
}

export const Rotor3DVisualizer: React.FC<Rotor3DVisualizerProps> = ({
  config,
  flow,
  results,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Animation & View Controls
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showSlipstream, setShowSlipstream] = useState<boolean>(true);
  const [showForceVectors, setShowForceVectors] = useState<boolean>(true);
  const [showDuctShroud, setShowDuctShroud] = useState<boolean>(config.isDucted);
  const [showVelocityTriangle, setShowVelocityTriangle] = useState<boolean>(false);
  const [colorMode, setColorMode] = useState<'thrust' | 'alpha' | 'mach' | 'twist'>('thrust');

  // Camera Orbit State
  const [rotX, setRotX] = useState<number>(25);
  const [rotY, setRotY] = useState<number>(-35);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Rotor Angle for Rotation
  const rotorAngleRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);

  // Sync shroud toggle with config changes
  useEffect(() => {
    setShowDuctShroud(config.isDucted);
  }, [config.isDucted]);

  // Handle Mouse Drag for Orbiting
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    setRotY((prev) => prev + dx * 0.5);
    setRotX((prev) => Math.max(-85, Math.min(85, prev - dy * 0.5)));
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setZoom((prev) => Math.max(0.4, Math.min(2.5, prev - e.deltaY * 0.0015)));
  };

  // Color Mapping Helper
  const getSectionColor = useCallback(
    (elemIndex: number) => {
      const el = results.elements[elemIndex] || results.elements[0];
      let val = 0; // 0 to 1

      if (colorMode === 'thrust') {
        const maxThrust = Math.max(1, ...results.elements.map((e) => e.dThrust_dr));
        val = el.dThrust_dr / maxThrust;
      } else if (colorMode === 'alpha') {
        val = Math.max(0, Math.min(1, (el.angleAttackAlphaDeg + 2) / 16));
      } else if (colorMode === 'mach') {
        val = Math.min(1, el.machNumber / 0.85);
      } else if (colorMode === 'twist') {
        val = Math.max(0, Math.min(1, el.twistDeg / 40));
      }

      // Turbo / Jet colormap (Blue -> Cyan -> Green -> Yellow -> Red)
      const r = Math.floor(Math.sin(val * Math.PI - Math.PI / 2) * 127 + 128);
      const g = Math.floor(Math.sin(val * Math.PI) * 200 + 40);
      const b = Math.floor(Math.cos(val * Math.PI - Math.PI / 2) * 127 + 128);
      return `rgb(${Math.max(0, Math.min(255, r))}, ${Math.max(0, Math.min(255, g))}, ${Math.max(0, Math.min(255, b))})`;
    },
    [results.elements, colorMode]
  );

  // Main 3D Canvas Rendering Loop
  useEffect(() => {
    let active = true;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = createHardware2DContext(canvas);
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      // Clear Canvas
      ctx.fillStyle = '#060913';
      ctx.fillRect(0, 0, w, h);

      // Draw Subtle Background Tech Grid
      ctx.strokeStyle = '#101726';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Update Rotation Angle
      if (isPlaying) {
        // Spin rate scaled to RPM for visual clarity (clamped for comfortable FPS)
        const spinSpeed = Math.min(0.25, Math.max(0.02, (flow.rpm / 2000) * 0.04));
        rotorAngleRef.current += spinSpeed;
      }

      const currentAngle = rotorAngleRef.current;

      // 3D Projection Matrix Transformation
      const radX = (rotX * Math.PI) / 180;
      const radY = (rotY * Math.PI) / 180;
      const cosX = Math.cos(radX);
      const sinX = Math.sin(radX);
      const cosY = Math.cos(radY);
      const sinY = Math.sin(radY);

      const baseScale = (Math.min(w, h) * 0.38 * zoom) / Math.max(0.1, config.diameterMeters / 2);

      // 3D to 2D Screen Projection (X = Lateral, Y = Up/Vertical, Z = Axial Thrust Axis)
      const project = (x3: number, y3: number, z3: number): { x: number; y: number; z: number } => {
        // Rotate around Y-axis (Yaw)
        const x1 = x3 * cosY - z3 * sinY;
        const z1 = x3 * sinY + z3 * cosY;

        // Rotate around X-axis (Pitch)
        const y2 = y3 * cosX - z1 * sinX;
        const z2 = y3 * sinX + z1 * cosX;

        // Perspective division
        const dist = 500;
        const fov = dist / (dist + z2 * 0.3);
        return {
          x: cx + x1 * baseScale * fov,
          y: cy - y2 * baseScale * fov,
          z: z2,
        };
      };

      // 1. Draw Inflow Ambient Streamlines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 1.2;
      const numStreamlines = 8;
      const R = config.diameterMeters / 2;

      for (let i = 0; i < numStreamlines; i++) {
        const streamAngle = (i / numStreamlines) * Math.PI * 2 + currentAngle * 0.2;
        const streamRadius = R * 1.35;
        const xStart = Math.cos(streamAngle) * streamRadius;
        const yStart = Math.sin(streamAngle) * streamRadius;

        ctx.beginPath();
        const p1 = project(xStart, yStart, -R * 2.2);
        const p2 = project(xStart * 0.88, yStart * 0.88, 0);
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      // 2. Draw Contracted Slipstream Wake Tube (Actuator Disk Theory)
      if (showSlipstream) {
        const numRings = 6;
        const numSegments = 24;
        const meanA = Math.min(0.4, Math.max(0.05, results.elements[Math.floor(results.elements.length * 0.6)]?.axialInduction_a || 0.15));

        for (let ring = 0; ring <= numRings; ring++) {
          const zAxial = (ring / numRings) * (R * 2.5); // Downstream wake distance
          // Slipstream tube radius contraction formula: R_wake = R * sqrt((1-a)/(1+b))
          const contractionFactor = Math.sqrt(Math.max(0.5, (1 - meanA) / (1 + meanA * (ring / numRings) * 1.5)));
          const wakeRadius = R * contractionFactor;

          ctx.strokeStyle = ring === 0 ? 'rgba(56, 189, 248, 0.6)' : 'rgba(99, 102, 241, 0.25)';
          ctx.lineWidth = ring === 0 ? 1.8 : 1.0;
          ctx.setLineDash(ring === 0 ? [] : [4, 4]);

          ctx.beginPath();
          for (let s = 0; s <= numSegments; s++) {
            const theta = (s / numSegments) * Math.PI * 2;
            const x3 = Math.cos(theta) * wakeRadius;
            const y3 = Math.sin(theta) * wakeRadius;
            const p = project(x3, y3, zAxial);
            if (s === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Draw Helical Tip Vortex Filaments trailing from blade tips
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.45)';
        ctx.lineWidth = 1.5;
        for (let b = 0; b < config.numBlades; b++) {
          const bladeBaseAngle = (b * (Math.PI * 2)) / config.numBlades + currentAngle;
          ctx.beginPath();
          for (let t = 0; t <= 40; t++) {
            const zAxial = (t / 40) * (R * 2.5);
            const helicalAngle = bladeBaseAngle - t * 0.22;
            const contraction = Math.sqrt(Math.max(0.5, (1 - meanA) / (1 + meanA * (t / 40) * 1.5)));
            const rTip = R * contraction;
            const p = project(Math.cos(helicalAngle) * rTip, Math.sin(helicalAngle) * rTip, zAxial);
            if (t === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
        }
      }

      // 3. Draw Ducted Fan Shroud (Кольцевой Обтекатель)
      if (showDuctShroud && config.isDucted) {
        const ductLength = R * 0.9;
        const inletRadius = R * 1.08;
        const exitRadius = R * (config.ductAreaRatio ? Math.sqrt(config.ductAreaRatio) : 1.06);

        // Draw Shroud Outer Shell
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
        ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
        ctx.lineWidth = 2.0;

        const numDuctSlices = 32;
        // Front Inlet Lip
        ctx.beginPath();
        for (let s = 0; s <= numDuctSlices; s++) {
          const ang = (s / numDuctSlices) * Math.PI * 2;
          const p = project(Math.cos(ang) * inletRadius, Math.sin(ang) * inletRadius, -ductLength * 0.35);
          if (s === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();

        // Rear Exit Nozzle
        ctx.beginPath();
        for (let s = 0; s <= numDuctSlices; s++) {
          const ang = (s / numDuctSlices) * Math.PI * 2;
          const p = project(Math.cos(ang) * exitRadius, Math.sin(ang) * exitRadius, ductLength * 0.65);
          if (s === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();

        // Duct Longitudinal Profile Struts
        for (let s = 0; s < 4; s++) {
          const ang = (s / 4) * Math.PI * 2;
          const pIn = project(Math.cos(ang) * inletRadius, Math.sin(ang) * inletRadius, -ductLength * 0.35);
          const pMid = project(Math.cos(ang) * (R + (config.tipClearanceMm || 1) * 0.001), Math.sin(ang) * (R + (config.tipClearanceMm || 1) * 0.001), 0);
          const pOut = project(Math.cos(ang) * exitRadius, Math.sin(ang) * exitRadius, ductLength * 0.65);

          ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(pIn.x, pIn.y);
          ctx.lineTo(pMid.x, pMid.y);
          ctx.lineTo(pOut.x, pOut.y);
          ctx.stroke();
        }
      }

      // 4. Draw Central Rotor Hub & Spinner Cone
      const hubR = config.hubRadiusMeters;
      const pHubCenter = project(0, 0, 0);
      const pHubNose = project(0, 0, -hubR * 1.8);

      // Hub base circle
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let s = 0; s <= 16; s++) {
        const ang = (s / 16) * Math.PI * 2;
        const p = project(Math.cos(ang) * hubR, Math.sin(ang) * hubR, 0);
        if (s === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.fill();
      ctx.stroke();

      // Spinner Cone
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      for (let s = 0; s <= 16; s++) {
        const ang = (s / 16) * Math.PI * 2;
        const pBase = project(Math.cos(ang) * hubR, Math.sin(ang) * hubR, 0);
        if (s === 0) ctx.moveTo(pHubNose.x, pHubNose.y);
        ctx.lineTo(pBase.x, pBase.y);
      }
      ctx.fill();

      // 5. Draw Parameterized Aerodynamic Blades
      const numBlades = config.numBlades;
      const numElements = results.elements.length;

      for (let b = 0; b < numBlades; b++) {
        const bladeAngle = (b * (Math.PI * 2)) / numBlades + currentAngle;
        const cosB = Math.cos(bladeAngle);
        const sinB = Math.sin(bladeAngle);

        // Perpendicular vector along blade chord plane
        const perpX = -sinB;
        const perpY = cosB;

        // Render blade strip panels
        for (let i = 0; i < numElements - 1; i++) {
          const el1 = results.elements[i];
          const el2 = results.elements[i + 1];

          const r1 = el1.radiusMeters;
          const r2 = el2.radiusMeters;

          const c1 = el1.chordMeters;
          const c2 = el2.chordMeters;

          // Local pitch rotation around blade span axis
          const twist1Rad = (el1.twistDeg * Math.PI) / 180;
          const twist2Rad = (el2.twistDeg * Math.PI) / 180;

          // Leading edge & Trailing edge 3D coordinates
          const le1_x = cosB * r1 + perpX * (c1 * 0.35) * Math.cos(twist1Rad);
          const le1_y = sinB * r1 + perpY * (c1 * 0.35) * Math.cos(twist1Rad);
          const le1_z = -(c1 * 0.35) * Math.sin(twist1Rad);

          const te1_x = cosB * r1 - perpX * (c1 * 0.65) * Math.cos(twist1Rad);
          const te1_y = sinB * r1 - perpY * (c1 * 0.65) * Math.cos(twist1Rad);
          const te1_z = (c1 * 0.65) * Math.sin(twist1Rad);

          const le2_x = cosB * r2 + perpX * (c2 * 0.35) * Math.cos(twist2Rad);
          const le2_y = sinB * r2 + perpY * (c2 * 0.35) * Math.cos(twist2Rad);
          const le2_z = -(c2 * 0.35) * Math.sin(twist2Rad);

          const te2_x = cosB * r2 - perpX * (c2 * 0.65) * Math.cos(twist2Rad);
          const te2_y = sinB * r2 - perpY * (c2 * 0.65) * Math.cos(twist2Rad);
          const te2_z = (c2 * 0.65) * Math.sin(twist2Rad);

          // Project to 2D screen
          const pLE1 = project(le1_x, le1_y, le1_z);
          const pTE1 = project(te1_x, te1_y, te1_z);
          const pLE2 = project(le2_x, le2_y, le2_z);
          const pTE2 = project(te2_x, te2_y, te2_z);

          // Draw Quad Panel with Colormap Fill
          ctx.fillStyle = getSectionColor(i);
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 0.8;

          ctx.beginPath();
          ctx.moveTo(pLE1.x, pLE1.y);
          ctx.lineTo(pLE2.x, pLE2.y);
          ctx.lineTo(pTE2.x, pTE2.y);
          ctx.lineTo(pTE1.x, pTE1.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // 6. Draw Section Force Vectors on Primary Blade (b=0)
        if (b === 0 && showForceVectors) {
          const sampleIndices = [Math.floor(numElements * 0.4), Math.floor(numElements * 0.75)];
          sampleIndices.forEach((idx) => {
            const el = results.elements[idx];
            if (!el) return;

            const rMid = el.radiusMeters;
            const pMid = project(cosB * rMid, sinB * rMid, 0);

            // Vector lengths scaled for visibility
            const thrustLen = (el.dThrust_dr / Math.max(1, results.elements[Math.floor(numElements * 0.7)].dThrust_dr)) * 45;
            const dragLen = (el.dTorque_dr / Math.max(0.01, results.elements[Math.floor(numElements * 0.7)].dTorque_dr)) * 25;

            // Thrust Force Vector (Axial Z-direction, Forward)
            const pThrustEnd = project(cosB * rMid, sinB * rMid, -thrustLen * 0.01 * (R / 0.5));
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(pMid.x, pMid.y);
            ctx.lineTo(pThrustEnd.x, pThrustEnd.y);
            ctx.stroke();

            // Arrow head
            ctx.fillStyle = '#22c55e';
            ctx.beginPath();
            ctx.arc(pThrustEnd.x, pThrustEnd.y, 3.5, 0, Math.PI * 2);
            ctx.fill();

            // Torque / Drag Force Vector (Tangential, opposite to rotation)
            const pDragEnd = project(cosB * rMid - perpX * (dragLen * 0.006 * (R / 0.5)), sinB * rMid - perpY * (dragLen * 0.006 * (R / 0.5)), 0);
            ctx.strokeStyle = '#f43f5e';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.moveTo(pMid.x, pMid.y);
            ctx.lineTo(pDragEnd.x, pDragEnd.y);
            ctx.stroke();

            // Text Labels
            ctx.fillStyle = '#22c55e';
            ctx.font = 'bold 10px monospace';
            ctx.fillText(`dT=${el.dThrust_dr.toFixed(0)}N/m`, pThrustEnd.x + 5, pThrustEnd.y);
          });
        }
      }

      // 7. Coaxial Twin-Rotor Lower Blade (if enabled)
      if (config.isCoaxial) {
        const zLower = config.coaxialSpacingMeters || 0.08;
        const lowerAngle = -currentAngle * 1.05; // Contra-rotation

        for (let b = 0; b < config.numBlades; b++) {
          const bladeAngle = (b * (Math.PI * 2)) / config.numBlades + lowerAngle;
          const cosB = Math.cos(bladeAngle);
          const sinB = Math.sin(bladeAngle);

          const pTip = project(cosB * R, sinB * R, zLower);
          const pRoot = project(cosB * hubR, sinB * hubR, zLower);

          ctx.strokeStyle = 'rgba(168, 85, 247, 0.8)';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(pRoot.x, pRoot.y);
          ctx.lineTo(pTip.x, pTip.y);
          ctx.stroke();
        }
      }

      // 8. Visual Orientation Overlay Compass
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.fillRect(12, 12, 110, 68);
      ctx.strokeRect(12, 12, 110, 68);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(`Yaw: ${rotY.toFixed(0)}°`, 20, 28);
      ctx.fillText(`Pitch: ${rotX.toFixed(0)}°`, 20, 44);
      ctx.fillText(`Zoom: ${zoom.toFixed(2)}x`, 20, 60);
      ctx.fillText(`RPM: ${flow.rpm.toLocaleString()}`, 20, 74);

      if (active) {
        animFrameIdRef.current = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      active = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [
    config,
    flow,
    results,
    isPlaying,
    showSlipstream,
    showForceVectors,
    showDuctShroud,
    rotX,
    rotY,
    zoom,
    colorMode,
    getSectionColor,
  ]);

  return (
    <div className="space-y-3">
      {/* Canvas Viewport Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
        <canvas
          ref={canvasRef}
          width={840}
          height={420}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="w-full h-80 sm:h-96 cursor-grab active:cursor-grabbing block"
        />

        {/* Top Floating Control Bar */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-lg">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              isPlaying
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title={isPlaying ? 'Приостановить вращение' : 'Запустить вращение'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setRotX(25);
              setRotY(-35);
              setZoom(1.0);
            }}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 text-xs transition-all cursor-pointer"
            title="Сбросить ракурс камеры"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bottom Floating Legend & Overlay Toggles */}
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          {/* Layer Toggles */}
          <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 pointer-events-auto">
            <button
              type="button"
              onClick={() => setShowSlipstream(!showSlipstream)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                showSlipstream
                  ? 'bg-indigo-950 text-indigo-300 border border-indigo-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wind className="w-3 h-3 text-cyan-400" />
              <span>Спутная струя</span>
            </button>

            <button
              type="button"
              onClick={() => setShowForceVectors(!showForceVectors)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                showForceVectors
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3 h-3 text-emerald-400" />
              <span>Векторы сил</span>
            </button>

            {config.isDucted && (
              <button
                type="button"
                onClick={() => setShowDuctShroud(!showDuctShroud)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  showDuctShroud
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Disc className="w-3 h-3 text-cyan-400" />
                <span>Кольцевой канал</span>
              </button>
            )}
          </div>

          {/* Colormap Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-700/80 pointer-events-auto text-[10px] font-mono">
            <span className="text-slate-400">Поле:</span>
            {(['thrust', 'alpha', 'mach', 'twist'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setColorMode(mode)}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  colorMode === mode
                    ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode === 'thrust' ? 'Тяга dT' : mode === 'alpha' ? 'Угол α' : mode === 'mach' ? 'Мах M' : 'Крутка θ'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
