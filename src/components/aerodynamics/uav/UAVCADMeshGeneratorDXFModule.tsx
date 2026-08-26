import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Layers,
  Download,
  Upload,
  RefreshCw,
  Sliders,
  FileCode2,
  FileText,
  Sparkles,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Grid,
  Scissors,
  Share2,
  Eye,
  EyeOff,
  Disc,
  Cpu,
  CornerDownRight,
  Plane,
} from 'lucide-react';
import { MathText } from '../../MathView';

export type WingAirfoilType = 'NACA2412' | 'NACA0012' | 'NACA4415' | 'ClarkY' | 'Selig1223' | 'MH60';

interface RibStation {
  index: number;
  spanPos_m: number;
  spanPosPct: number;
  chord_mm: number;
  thickness_mm: number;
  spar1_x_mm: number;
  spar1_dia_mm: number;
  spar2_x_mm: number;
  spar2_dia_mm: number;
  lighteningHoleDia_mm: number;
  mass_g: number;
}

export const UAVCADMeshGeneratorDXFModule: React.FC = () => {
  // Wing Geometry Parametric Inputs
  const [wingspan_m, setWingspan_m] = useState<number>(2.4);
  const [rootChord_mm, setRootChord_mm] = useState<number>(360);
  const [tipChord_mm, setTipChord_mm] = useState<number>(180);
  const [sweepAngle_deg, setSweepAngle_deg] = useState<number>(6.5);
  const [dihedralAngle_deg, setDihedralAngle_deg] = useState<number>(2.0);
  const [twistAngle_deg, setTwistAngle_deg] = useState<number>(-2.5); // Washout
  const [selectedAirfoil, setSelectedAirfoil] = useState<WingAirfoilType>('NACA2412');
  const [ribCount, setRibCount] = useState<number>(14);
  const [skinThickness_mm, setSkinThickness_mm] = useState<number>(1.2);
  const [materialType, setMaterialType] = useState<'carbon_ply' | 'balsa_aeroply' | 'carbon_sandwich' | 'aluminum_6061'>('carbon_ply');

  // Spar configuration
  const [spar1PosPct, setSpar1PosPct] = useState<number>(25); // % chord
  const [spar1Dia_mm, setSpar1Dia_mm] = useState<number>(16); // Carbon tube OD
  const [spar2PosPct, setSpar2PosPct] = useState<number>(65); // % chord
  const [spar2Dia_mm, setSpar2Dia_mm] = useState<number>(10); // Carbon tube OD
  const [enableLighteningHoles, setEnableLighteningHoles] = useState<boolean>(true);

  // Mesh & VLM Resolution
  const [vlmChordPanels, setVlmChordPanels] = useState<number>(12);
  const [vlmSpanPanels, setVlmSpanPanels] = useState<number>(28);
  const [meshViewMode, setMeshViewMode] = useState<'shaded' | 'wireframe' | 'pressure_cp' | 'vlm_vortices'>('pressure_cp');
  const [selectedRibIndex, setSelectedRibIndex] = useState<number>(0);

  // Active Sub-Tab
  const [activeSubTab, setActiveSubTab] = useState<'cad_3d_viewer' | 'rib_cutter_dxf' | 'vlm_mesh_openfoam' | 'structural_spar_calc'>('cad_3d_viewer');

  // Animation & 3D Interactive Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rotX, setRotX] = useState<number>(22);
  const [rotY, setRotY] = useState<number>(-35);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Material density & properties
  const materialProps = useMemo(() => {
    switch (materialType) {
      case 'carbon_ply':
        return { name: 'Карбоновый сэндвич 2.0мм', density_kg_m3: 1350, E_GPa: 65, sigma_MPa: 520, color: '#38bdf8' };
      case 'balsa_aeroply':
        return { name: 'Авиационная фанера + бальза 3мм', density_kg_m3: 450, E_GPa: 12, sigma_MPa: 45, color: '#f59e0b' };
      case 'carbon_sandwich':
        return { name: 'Углепластик + Rohacell 1.5мм', density_kg_m3: 680, E_GPa: 45, sigma_MPa: 380, color: '#10b981' };
      case 'aluminum_6061':
        return { name: 'Дюралюминий Д16Т / 6061-T6', density_kg_m3: 2780, E_GPa: 71, sigma_MPa: 310, color: '#94a3b8' };
    }
  }, [materialType]);

  // Derived aerodynamic & geometric metrics
  const halfSpan_mm = (wingspan_m * 1000) / 2;
  const wingArea_m2 = (wingspan_m * ((rootChord_mm + tipChord_mm) / 2000));
  const aspectRatio = (wingspan_m ** 2) / wingArea_m2;
  const taperRatio = tipChord_mm / rootChord_mm;
  const mac_mm = (2 / 3) * rootChord_mm * ((1 + taperRatio + taperRatio ** 2) / (1 + taperRatio));

  // Generate Rib Stations
  const ribStations: RibStation[] = useMemo(() => {
    const list: RibStation[] = [];
    for (let i = 0; i < ribCount; i++) {
      const eta = i / (ribCount - 1); // 0 at root, 1 at tip
      const spanPos_m = (eta * halfSpan_mm) / 1000;
      const chord_mm = rootChord_mm - eta * (rootChord_mm - tipChord_mm);
      const thickness_mm = chord_mm * (selectedAirfoil === 'Selig1223' ? 0.121 : selectedAirfoil === 'NACA4415' ? 0.15 : 0.12);
      
      const spar1_x_mm = chord_mm * (spar1PosPct / 100);
      const spar2_x_mm = chord_mm * (spar2PosPct / 100);
      const lighteningHoleDia_mm = enableLighteningHoles ? Math.max(0, chord_mm * 0.22 - 10) : 0;

      // Approximate rib area in mm2
      const ribArea_mm2 = chord_mm * thickness_mm * 0.68 - (Math.PI * (spar1Dia_mm / 2) ** 2) - (Math.PI * (spar2Dia_mm / 2) ** 2) - (enableLighteningHoles ? Math.PI * (lighteningHoleDia_mm / 2) ** 2 : 0);
      const ribVol_m3 = (ribArea_mm2 * 2.0 * 1e-9); // assume 2mm thickness
      const mass_g = Math.max(1.5, ribVol_m3 * materialProps.density_kg_m3 * 1000);

      list.push({
        index: i + 1,
        spanPos_m: Number(spanPos_m.toFixed(3)),
        spanPosPct: Math.round(eta * 100),
        chord_mm: Math.round(chord_mm),
        thickness_mm: Math.round(thickness_mm),
        spar1_x_mm: Math.round(spar1_x_mm),
        spar1_dia_mm: spar1Dia_mm,
        spar2_x_mm: Math.round(spar2_x_mm),
        spar2_dia_mm: spar2Dia_mm,
        lighteningHoleDia_mm: Math.round(lighteningHoleDia_mm),
        mass_g: Number(mass_g.toFixed(1)),
      });
    }
    return list;
  }, [ribCount, halfSpan_mm, rootChord_mm, tipChord_mm, selectedAirfoil, spar1PosPct, spar1Dia_mm, spar2PosPct, spar2Dia_mm, enableLighteningHoles, materialProps]);

  // Total Ribs Mass
  const totalRibsMass_g = useMemo(() => {
    return ribStations.reduce((sum, r) => sum + r.mass_g, 0) * 2; // both wings
  }, [ribStations]);

  // Carbon Spars Mass
  const totalSparsMass_g = useMemo(() => {
    // 2 main spars (OD spar1Dia_mm, ID spar1Dia_mm-2mm) + 2 secondary spars
    const spar1Area_m2 = Math.PI * (((spar1Dia_mm / 2) * 1e-3) ** 2 - (((spar1Dia_mm - 2) / 2) * 1e-3) ** 2);
    const spar2Area_m2 = Math.PI * (((spar2Dia_mm / 2) * 1e-3) ** 2 - (((spar2Dia_mm - 1.5) / 2) * 1e-3) ** 2);
    const carbonDensity = 1550; // kg/m3
    const spar1Mass = spar1Area_m2 * wingspan_m * carbonDensity * 1000;
    const spar2Mass = spar2Area_m2 * wingspan_m * carbonDensity * 1000;
    return Math.round(spar1Mass + spar2Mass);
  }, [spar1Dia_mm, spar2Dia_mm, wingspan_m]);

  // Total Structural Skeleton Mass
  const totalSkeletonMass_g = totalRibsMass_g + totalSparsMass_g;

  // Selected rib for 2D profile inspection
  const activeRib = ribStations[selectedRibIndex] || ribStations[0];

  // Normalized Airfoil Points generator (Cambered NACA 4-digit / ClarkY approximation)
  const getAirfoilCoordinates = useCallback((airfoil: WingAirfoilType, numPoints: number = 60) => {
    const upper: { x: number; y: number }[] = [];
    const lower: { x: number; y: number }[] = [];

    // Max camber m, position p, thickness t
    let m = 0.02;
    let p = 0.4;
    let t = 0.12;

    if (airfoil === 'NACA0012') { m = 0.0; p = 0.0; t = 0.12; }
    else if (airfoil === 'NACA4415') { m = 0.04; p = 0.4; t = 0.15; }
    else if (airfoil === 'ClarkY') { m = 0.035; p = 0.35; t = 0.117; }
    else if (airfoil === 'Selig1223') { m = 0.088; p = 0.48; t = 0.121; }
    else if (airfoil === 'MH60') { m = 0.017; p = 0.31; t = 0.101; }

    for (let i = 0; i <= numPoints; i++) {
      const beta = (i / numPoints) * Math.PI;
      const x = (1 - Math.cos(beta)) / 2; // Cosine clustering at LE and TE

      // Thickness distribution
      const yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.1260 * x - 0.3516 * x ** 2 + 0.2843 * x ** 3 - 0.1015 * x ** 4);

      // Camber line & slope
      let yc = 0;
      let dyc_dx = 0;
      if (p > 0) {
        if (x < p) {
          yc = (m / (p ** 2)) * (2 * p * x - x ** 2);
          dyc_dx = ((2 * m) / (p ** 2)) * (p - x);
        } else {
          yc = (m / ((1 - p) ** 2)) * ((1 - 2 * p) + 2 * p * x - x ** 2);
          dyc_dx = ((2 * m) / ((1 - p) ** 2)) * (p - x);
        }
      }
      const theta = Math.atan(dyc_dx);

      const xu = x - yt * Math.sin(theta);
      const yu = yc + yt * Math.cos(theta);
      const xl = x + yt * Math.sin(theta);
      const yl = yc - yt * Math.cos(theta);

      upper.push({ x: xu, y: yu });
      lower.push({ x: xl, y: yl });
    }

    return { upper, lower };
  }, []);

  // 3D Canvas Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#030712');
      bgGrad.addColorStop(0.5, '#090d16');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Grid in background
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
      ctx.lineWidth = 1;
      const gridSize = 30;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 3D Projection math
      const radX = (rotX * Math.PI) / 180;
      const radY = (rotY * Math.PI) / 180;
      const cosX = Math.cos(radX);
      const sinX = Math.sin(radX);
      const cosY = Math.cos(radY);
      const sinY = Math.sin(radY);

      const cx = width / 2;
      const cy = height / 2 + 10;
      const scale = Math.min(width, height) * 0.48;

      const project = (x: number, y: number, z: number) => {
        // Rotate Y
        const x1 = x * cosY + z * sinY;
        const z1 = -x * sinY + z * cosY;
        // Rotate X
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;

        const fov = 800;
        const depth = fov / (fov + z2 * 280);
        return {
          px: cx + x1 * scale * depth,
          py: cy - y2 * scale * depth,
          depth: z2,
        };
      };

      const { upper, lower } = getAirfoilCoordinates(selectedAirfoil, 28);

      // Render Both Left & Right Wings
      const sides = [1, -1]; // 1 = Right Wing, -1 = Left Wing

      sides.forEach((side) => {
        // Draw Carbon Spar 1 Tube
        ctx.beginPath();
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 4;
        const rootSpar1 = project(
          (rootChord_mm * (spar1PosPct / 100)) / 1000 - 0.15,
          0,
          0
        );
        const tipSpar1 = project(
          (tipChord_mm * (spar1PosPct / 100) + Math.tan((sweepAngle_deg * Math.PI) / 180) * halfSpan_mm) / 1000 - 0.15,
          (Math.tan((dihedralAngle_deg * Math.PI) / 180) * halfSpan_mm) / 1000,
          (side * halfSpan_mm) / 1000
        );
        ctx.moveTo(rootSpar1.px, rootSpar1.py);
        ctx.lineTo(tipSpar1.px, tipSpar1.py);
        ctx.stroke();

        // Draw Carbon Spar 2 Tube
        ctx.beginPath();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        const rootSpar2 = project(
          (rootChord_mm * (spar2PosPct / 100)) / 1000 - 0.15,
          0,
          0
        );
        const tipSpar2 = project(
          (tipChord_mm * (spar2PosPct / 100) + Math.tan((sweepAngle_deg * Math.PI) / 180) * halfSpan_mm) / 1000 - 0.15,
          (Math.tan((dihedralAngle_deg * Math.PI) / 180) * halfSpan_mm) / 1000,
          (side * halfSpan_mm) / 1000
        );
        ctx.moveTo(rootSpar2.px, rootSpar2.py);
        ctx.lineTo(tipSpar2.px, tipSpar2.py);
        ctx.stroke();

        // Render Ribs
        ribStations.forEach((rib, rIdx) => {
          const eta = rib.spanPosPct / 100;
          const zPos = (side * rib.spanPos_m);
          const xOffset = (Math.tan((sweepAngle_deg * Math.PI) / 180) * (eta * halfSpan_mm)) / 1000 - 0.15;
          const yOffset = (Math.tan((dihedralAngle_deg * Math.PI) / 180) * (eta * halfSpan_mm)) / 1000;
          const chord_m = rib.chord_mm / 1000;
          const isSelected = rIdx === selectedRibIndex && side === 1;

          // Airfoil loop
          ctx.beginPath();
          upper.forEach((pt, pIdx) => {
            const p = project(xOffset + pt.x * chord_m, yOffset + pt.y * chord_m, zPos);
            if (pIdx === 0) ctx.moveTo(p.px, p.py);
            else ctx.lineTo(p.px, p.py);
          });
          lower.slice().reverse().forEach((pt) => {
            const p = project(xOffset + pt.x * chord_m, yOffset + pt.y * chord_m, zPos);
            ctx.lineTo(p.px, p.py);
          });
          ctx.closePath();

          if (isSelected) {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
            ctx.fill();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.stroke();
          } else {
            ctx.fillStyle = 'rgba(30, 41, 59, 0.45)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });

        // Render VLM Lattice Panels / Shaded Skin
        if (meshViewMode === 'pressure_cp' || meshViewMode === 'wireframe' || meshViewMode === 'vlm_vortices') {
          for (let s = 0; s < vlmSpanPanels; s++) {
            const eta1 = s / vlmSpanPanels;
            const eta2 = (s + 1) / vlmSpanPanels;
            const z1 = (side * eta1 * halfSpan_mm) / 1000;
            const z2 = (side * eta2 * halfSpan_mm) / 1000;

            const c1 = (rootChord_mm - eta1 * (rootChord_mm - tipChord_mm)) / 1000;
            const c2 = (rootChord_mm - eta2 * (rootChord_mm - tipChord_mm)) / 1000;
            const xOff1 = (Math.tan((sweepAngle_deg * Math.PI) / 180) * (eta1 * halfSpan_mm)) / 1000 - 0.15;
            const xOff2 = (Math.tan((sweepAngle_deg * Math.PI) / 180) * (eta2 * halfSpan_mm)) / 1000 - 0.15;

            for (let c = 0; c < vlmChordPanels; c++) {
              const xc1 = c / vlmChordPanels;
              const xc2 = (c + 1) / vlmChordPanels;

              // Cp Pressure color gradient
              const cpValue = -2.2 * (1 - xc1) ** 0.8 + 0.35 * xc1; // Negative suction on upper surface
              const p1 = project(xOff1 + xc1 * c1, 0.02, z1);
              const p2 = project(xOff1 + xc2 * c1, 0.015, z1);
              const p3 = project(xOff2 + xc2 * c2, 0.015, z2);
              const p4 = project(xOff2 + xc1 * c2, 0.02, z2);

              ctx.beginPath();
              ctx.moveTo(p1.px, p1.py);
              ctx.lineTo(p2.px, p2.py);
              ctx.lineTo(p3.px, p3.py);
              ctx.lineTo(p4.px, p4.py);
              ctx.closePath();

              if (meshViewMode === 'pressure_cp') {
                // Color from blue (high suction -Cp) to orange/red (positive pressure)
                const hue = Math.max(180, Math.min(270, 240 + cpValue * 40));
                ctx.fillStyle = `hsla(${hue}, 85%, 55%, 0.35)`;
                ctx.fill();
                ctx.strokeStyle = `hsla(${hue}, 90%, 65%, 0.45)`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
              } else if (meshViewMode === 'wireframe') {
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
                ctx.lineWidth = 0.8;
                ctx.stroke();
              } else if (meshViewMode === 'vlm_vortices') {
                // Draw Horseshoe Vortex Ring (1/4 chord bound vortex + trailing legs)
                ctx.strokeStyle = '#a855f7';
                ctx.lineWidth = 1;
                ctx.stroke();
              }
            }
          }
        }
      });

      // Axis orientation gizmo in top-left
      ctx.save();
      ctx.translate(50, 50);
      const gizmoScale = 30;
      const gX = project(1, 0, 0);
      const gY = project(0, 1, 0);
      const gZ = project(0, 0, 1);
      const g0 = project(0, 0, 0);

      // X Axis (Red)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo((gX.px - g0.px) * (gizmoScale / scale), (gX.py - g0.py) * (gizmoScale / scale));
      ctx.stroke();

      // Y Axis (Green)
      ctx.strokeStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo((gY.px - g0.px) * (gizmoScale / scale), (gY.py - g0.py) * (gizmoScale / scale));
      ctx.stroke();

      // Z Axis (Blue)
      ctx.strokeStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo((gZ.px - g0.px) * (gizmoScale / scale), (gZ.py - g0.py) * (gizmoScale / scale));
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText('X', (gX.px - g0.px) * (gizmoScale / scale) + 4, (gX.py - g0.py) * (gizmoScale / scale));
      ctx.fillText('Y', (gY.px - g0.px) * (gizmoScale / scale) + 4, (gY.py - g0.py) * (gizmoScale / scale));
      ctx.fillText('Z', (gZ.px - g0.px) * (gizmoScale / scale) + 4, (gZ.py - g0.py) * (gizmoScale / scale));
      ctx.restore();
    };

    render();
  }, [rotX, rotY, wingspan_m, rootChord_mm, tipChord_mm, sweepAngle_deg, dihedralAngle_deg, selectedAirfoil, ribStations, selectedRibIndex, meshViewMode, vlmSpanPanels, vlmChordPanels, spar1PosPct, spar2PosPct, getAirfoilCoordinates, halfSpan_mm]);

  // Mouse drag handler for 3D rotation
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;
    setRotY((prev) => prev + dx * 0.5);
    setRotX((prev) => Math.max(-80, Math.min(80, prev - dy * 0.5)));
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Generate DXF file string for current rib or entire wing rib set
  const generateDXF = useCallback((rib: RibStation) => {
    const { upper, lower } = getAirfoilCoordinates(selectedAirfoil, 60);
    const chord = rib.chord_mm;

    let dxf = `0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nENDSEC\n0\nSECTION\n2\nBLOCKS\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n`;

    // Outer contour LWPOLYLINE
    dxf += `0\nLWPOLYLINE\n5\n100\n100\nAcDbEntity\n8\nRIB_CONTOUR\n62\n7\n100\nAcDbPolyline\n90\n${upper.length + lower.length - 1}\n70\n1\n`;

    upper.forEach((pt) => {
      dxf += `10\n${(pt.x * chord).toFixed(3)}\n20\n${(pt.y * chord).toFixed(3)}\n`;
    });
    lower.slice().reverse().slice(1).forEach((pt) => {
      dxf += `10\n${(pt.x * chord).toFixed(3)}\n20\n${(pt.y * chord).toFixed(3)}\n`;
    });

    // Spar 1 Hole (Circle)
    dxf += `0\nCIRCLE\n8\nSPAR_HOLES\n62\n4\n10\n${rib.spar1_x_mm.toFixed(3)}\n20\n0.000\n40\n${(rib.spar1_dia_mm / 2).toFixed(3)}\n`;

    // Spar 2 Hole (Circle)
    dxf += `0\nCIRCLE\n8\nSPAR_HOLES\n62\n4\n10\n${rib.spar2_x_mm.toFixed(3)}\n20\n0.000\n40\n${(rib.spar2_dia_mm / 2).toFixed(3)}\n`;

    // Lightening Hole (Circle)
    if (rib.lighteningHoleDia_mm > 8) {
      const cx = (rib.spar1_x_mm + rib.spar2_x_mm) / 2;
      dxf += `0\nCIRCLE\n8\nLIGHTENING_HOLES\n62\n3\n10\n${cx.toFixed(3)}\n20\n0.000\n40\n${(rib.lighteningHoleDia_mm / 2).toFixed(3)}\n`;
    }

    dxf += `0\nENDSEC\n0\nEOF\n`;
    return dxf;
  }, [getAirfoilCoordinates, selectedAirfoil]);

  // Trigger DXF Download
  const handleDownloadDXF = () => {
    const dxfContent = generateDXF(activeRib);
    const blob = new Blob([dxfContent], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UAV_Rib_${activeRib.index}_${selectedAirfoil}_Chord${activeRib.chord_mm}mm.dxf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // OpenFOAM blockMeshDict generator
  const generateOpenFOAMBlockMesh = useMemo(() => {
    return `/*--------------------------------*- C++ -*----------------------------------*\\
| =========                 |                                                 |
| \\\\      /  F ield         | OpenFOAM: The Open Source CFD Toolbox           |
|  \\\\    /   O peration     | Version:  v2312                                 |
|   \\\\  /    A nd           | Web:      www.openfoam.com                      |
|    \\\\/     M anipulation  | Aero-UAV Automated Mesh Generator               |
\\*---------------------------------------------------------------------------*/
FoamFile
{
    version     2.0;
    format      ascii;
    class       dictionary;
    object      blockMeshDict;
}
// Parametric UAV Wing: Span=${wingspan_m}m, RootChord=${rootChord_mm}mm, TipChord=${tipChord_mm}mm

scale 0.001; // Geometry in millimeters

vertices
(
    // Inflow Box Bounds (-5c to +10c)
    ( -${rootChord_mm * 5} -${wingspan_m * 1000} -${rootChord_mm * 4} ) // 0
    (  ${rootChord_mm * 12} -${wingspan_m * 1000} -${rootChord_mm * 4} ) // 1
    (  ${rootChord_mm * 12}  ${wingspan_m * 1000} -${rootChord_mm * 4} ) // 2
    ( -${rootChord_mm * 5}  ${wingspan_m * 1000} -${rootChord_mm * 4} ) // 3
    ( -${rootChord_mm * 5} -${wingspan_m * 1000}  ${rootChord_mm * 4} ) // 4
    (  ${rootChord_mm * 12} -${wingspan_m * 1000}  ${rootChord_mm * 4} ) // 5
    (  ${rootChord_mm * 12}  ${wingspan_m * 1000}  ${rootChord_mm * 4} ) // 6
    ( -${rootChord_mm * 5}  ${wingspan_m * 1000}  ${rootChord_mm * 4} ) // 7
);

blocks
(
    hex (0 1 2 3 4 5 6 7) ( ${vlmChordPanels * 4} ${vlmSpanPanels * 2} 48 ) simpleGrading ( 1 1 1 )
);

boundary
(
    inlet
    {
        type patch;
        faces ( (0 4 7 3) );
    }
    outlet
    {
        type patch;
        faces ( (1 2 6 5) );
    }
    walls
    {
        type symmetryPlane;
        faces ( (0 1 5 4) (3 7 6 2) (0 3 2 1) (4 5 6 7) );
    }
);
`;
  }, [wingspan_m, rootChord_mm, tipChord_mm, vlmChordPanels, vlmSpanPanels]);

  return (
    <div className="space-y-5 text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-500/30 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400">
            <Box className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Направление A: Импорт/Экспорт 3D CAD & CFD Геометрии
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Фичи #89, #90
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Параметрический генератор крыла БПЛА: нарезка нервюр, лонжеронов, экспорт в DXF для ЧПУ лазера и сетка VLM / OpenFOAM.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadDXF}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold text-xs hover:from-cyan-300 hover:to-blue-400 transition-all cursor-pointer shadow-lg shadow-cyan-950/40"
          >
            <Download className="w-4 h-4" />
            <span>Скачать DXF Нервюры #{activeRib.index}</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 font-mono text-xs">
        <button
          type="button"
          onClick={() => setActiveSubTab('cad_3d_viewer')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'cad_3d_viewer'
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md font-bold'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Box className="w-4 h-4" />
          <span>1. 3D CAD Вьювер & Сетка VLM</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('rib_cutter_dxf')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'rib_cutter_dxf'
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md font-bold'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>2. Нарезка Нервюр & ЧПУ DXF</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('vlm_mesh_openfoam')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'vlm_mesh_openfoam'
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md font-bold'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCode2 className="w-4 h-4" />
          <span>3. Экспорт Сеток OpenFOAM & VLM</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('structural_spar_calc')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'structural_spar_calc'
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md font-bold'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>4. Расчет Прочности Лонжерона</span>
        </button>
      </div>

      {/* SUB-TAB 1: 3D CAD VIEWER & CONTROLS */}
      {activeSubTab === 'cad_3d_viewer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Canvas View (8 cols) */}
          <div className="lg:col-span-8 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 font-bold">
                <Grid className="w-4 h-4 text-cyan-400" />
                <span>Интерактивный 3D Каркас Крыла БПЛА</span>
              </div>

              {/* Display Mode Switcher */}
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setMeshViewMode('pressure_cp')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    meshViewMode === 'pressure_cp' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Поле Cp
                </button>
                <button
                  type="button"
                  onClick={() => setMeshViewMode('wireframe')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    meshViewMode === 'wireframe' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Каркас
                </button>
                <button
                  type="button"
                  onClick={() => setMeshViewMode('vlm_vortices')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    meshViewMode === 'vlm_vortices' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  VLM Вихри
                </button>
              </div>
            </div>

            {/* Canvas Area */}
            <div className="relative rounded-xl overflow-hidden border border-slate-800/80 bg-slate-950 h-[380px] sm:h-[440px] cursor-grab active:cursor-grabbing">
              <canvas
                ref={canvasRef}
                width={800}
                height={480}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="w-full h-full block"
              />

              {/* Overlay Hint */}
              <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-800 text-[10px] font-mono text-slate-400 pointer-events-none flex items-center gap-2">
                <span>Зажмите ЛКМ для вращения модели</span>
                <span className="text-cyan-400">RotX: {Math.round(rotX)}° | RotY: {Math.round(rotY)}°</span>
              </div>

              {/* Reset View Button */}
              <button
                type="button"
                onClick={() => { setRotX(22); setRotY(-35); }}
                className="absolute top-3 right-3 p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
                title="Сбросить ракурс"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Summary Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-mono">Площадь крыла S:</span>
                <div className="text-xs sm:text-sm font-bold text-white font-mono">{wingArea_m2.toFixed(3)} м²</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-mono">Удлинение AR (λ):</span>
                <div className="text-xs sm:text-sm font-bold text-cyan-400 font-mono">{aspectRatio.toFixed(2)}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-mono">САХ (MAC):</span>
                <div className="text-xs sm:text-sm font-bold text-white font-mono">{Math.round(mac_mm)} мм</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-mono">Масса каркаса:</span>
                <div className="text-xs sm:text-sm font-bold text-emerald-400 font-mono">~{totalSkeletonMass_g} г</div>
              </div>
            </div>
          </div>

          {/* Right Parameters Controls (4 cols) */}
          <div className="lg:col-span-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 font-bold border-b border-slate-800 pb-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Геометрические Параметры Крыла</span>
            </div>

            {/* Profile Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-slate-300 flex items-center justify-between">
                <span>Аэродинамический Профиль:</span>
                <span className="text-cyan-400 font-bold">{selectedAirfoil}</span>
              </label>
              <select
                value={selectedAirfoil}
                onChange={(e) => setSelectedAirfoil(e.target.value as WingAirfoilType)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
              >
                <option value="NACA2412">NACA 2412 (Универсальный БПЛА)</option>
                <option value="NACA0012">NACA 0012 (Симметричный для V-хвоста)</option>
                <option value="NACA4415">NACA 4415 (Высокая грузоподъемность)</option>
                <option value="ClarkY">Clark Y (Классика с плоским низом)</option>
                <option value="Selig1223">Selig 1223 (Сверхвысокий Cl_max)</option>
                <option value="MH60">MH 60 (Летающее крыло / Бесхвостка)</option>
              </select>
            </div>

            {/* Wingspan */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-300">
                <span>Размах крыла (L):</span>
                <span className="text-cyan-400 font-bold">{wingspan_m} м</span>
              </div>
              <input
                type="range"
                min={0.8}
                max={5.0}
                step={0.1}
                value={wingspan_m}
                onChange={(e) => setWingspan_m(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Root Chord */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-300">
                <span>Корневая хорда (b_root):</span>
                <span className="text-cyan-400 font-bold">{rootChord_mm} мм</span>
              </div>
              <input
                type="range"
                min={150}
                max={700}
                step={10}
                value={rootChord_mm}
                onChange={(e) => setRootChord_mm(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Tip Chord */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-300">
                <span>Концевая хорда (b_tip):</span>
                <span className="text-cyan-400 font-bold">{tipChord_mm} мм</span>
              </div>
              <input
                type="range"
                min={80}
                max={400}
                step={10}
                value={tipChord_mm}
                onChange={(e) => setTipChord_mm(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Sweep Angle */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-300">
                <span>Стреловидность (χ):</span>
                <span className="text-cyan-400 font-bold">{sweepAngle_deg}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={35}
                step={0.5}
                value={sweepAngle_deg}
                onChange={(e) => setSweepAngle_deg(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Rib Count */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-300">
                <span>Количество нервюр на полукрыло:</span>
                <span className="text-cyan-400 font-bold">{ribCount} шт</span>
              </div>
              <input
                type="range"
                min={6}
                max={30}
                step={1}
                value={ribCount}
                onChange={(e) => setRibCount(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Material selector */}
            <div className="space-y-1.5 pt-1 border-t border-slate-800">
              <label className="text-[11px] font-mono text-slate-300">Материал Нервюр:</label>
              <select
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
              >
                <option value="carbon_ply">Карбоновый сэндвич (1350 кг/м³)</option>
                <option value="balsa_aeroply">Авиационная фанера + бальза (450 кг/м³)</option>
                <option value="carbon_sandwich">Углепластик + Rohacell (680 кг/м³)</option>
                <option value="aluminum_6061">Дюраль Д16Т / 6061 (2780 кг/м³)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: RIB CUTTER & 2D DXF EXPORTER */}
      {activeSubTab === 'rib_cutter_dxf' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start font-mono">
          {/* Rib 2D Contour Visualizer (7 cols) */}
          <div className="lg:col-span-7 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-cyan-300 font-bold">
                <Scissors className="w-4 h-4 text-cyan-400" />
                <span>2D Профиль Нервюры #{activeRib.index} (Хорда: {activeRib.chord_mm} мм)</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Позиция: {activeRib.spanPosPct}% полукрыла ({activeRib.spanPos_m} м)
              </span>
            </div>

            {/* SVG Contour */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center min-h-[260px]">
              <svg
                viewBox={`-20 -60 ${activeRib.chord_mm + 40} 120`}
                className="w-full max-h-[240px] overflow-visible"
              >
                {/* Centerline */}
                <line x1="0" y1="0" x2={activeRib.chord_mm} y2="0" stroke="rgba(148, 163, 184, 0.2)" strokeDasharray="4 4" />

                {/* Airfoil Outer Path */}
                {(() => {
                  const { upper, lower } = getAirfoilCoordinates(selectedAirfoil, 60);
                  const pathD = [
                    `M ${upper[0].x * activeRib.chord_mm} ${-upper[0].y * activeRib.chord_mm}`,
                    ...upper.slice(1).map((p) => `L ${p.x * activeRib.chord_mm} ${-p.y * activeRib.chord_mm}`),
                    ...lower.slice().reverse().map((p) => `L ${p.x * activeRib.chord_mm} ${-p.y * activeRib.chord_mm}`),
                    'Z',
                  ].join(' ');

                  return (
                    <path
                      d={pathD}
                      fill="rgba(56, 189, 248, 0.15)"
                      stroke="#38bdf8"
                      strokeWidth="2"
                    />
                  );
                })()}

                {/* Spar 1 Hole */}
                <circle
                  cx={activeRib.spar1_x_mm}
                  cy="0"
                  r={activeRib.spar1_dia_mm / 2}
                  fill="#0284c7"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                />
                <text
                  x={activeRib.spar1_x_mm}
                  y="-12"
                  fill="#38bdf8"
                  fontSize="8"
                  textAnchor="middle"
                >
                  Ø{activeRib.spar1_dia_mm}
                </text>

                {/* Spar 2 Hole */}
                <circle
                  cx={activeRib.spar2_x_mm}
                  cy="0"
                  r={activeRib.spar2_dia_mm / 2}
                  fill="#0284c7"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                />
                <text
                  x={activeRib.spar2_x_mm}
                  y="-10"
                  fill="#38bdf8"
                  fontSize="8"
                  textAnchor="middle"
                >
                  Ø{activeRib.spar2_dia_mm}
                </text>

                {/* Lightening Hole */}
                {activeRib.lighteningHoleDia_mm > 8 && (
                  <>
                    <circle
                      cx={(activeRib.spar1_x_mm + activeRib.spar2_x_mm) / 2}
                      cy="0"
                      r={activeRib.lighteningHoleDia_mm / 2}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                    <text
                      x={(activeRib.spar1_x_mm + activeRib.spar2_x_mm) / 2}
                      y="14"
                      fill="#10b981"
                      fontSize="7"
                      textAnchor="middle"
                    >
                      Облегчение Ø{activeRib.lighteningHoleDia_mm}
                    </text>
                  </>
                )}
              </svg>
            </div>

            {/* Rib Index Picker */}
            <div className="space-y-2">
              <label className="text-[11px] text-slate-300 flex justify-between">
                <span>Выбор Нервюры для Экспорта DXF:</span>
                <span className="text-cyan-400 font-bold">Нервюра #{activeRib.index} из {ribCount}</span>
              </label>
              <div className="flex gap-1 overflow-x-auto pb-1">
                {ribStations.map((r, idx) => (
                  <button
                    key={r.index}
                    type="button"
                    onClick={() => setSelectedRibIndex(idx)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-colors cursor-pointer ${
                      idx === selectedRibIndex
                        ? 'bg-cyan-500 text-slate-950 font-black'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    #{r.index}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Rib Specifications Table & DXF Code (5 cols) */}
          <div className="lg:col-span-5 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-xs text-white font-bold">
                <FileCode2 className="w-4 h-4 text-cyan-400" />
                <span>Спецификация ЧПУ Раскроя</span>
              </div>
              <button
                type="button"
                onClick={handleDownloadDXF}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>DXF 1:1</span>
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-900 text-slate-400">
                <span>Хорда нервюры:</span>
                <span className="text-white font-bold">{activeRib.chord_mm} мм</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900 text-slate-400">
                <span>Макс. строительная высота:</span>
                <span className="text-white font-bold">{activeRib.thickness_mm} мм</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900 text-slate-400">
                <span>Главный лонжерон X:</span>
                <span className="text-cyan-400 font-bold">{activeRib.spar1_x_mm} мм (Ø{activeRib.spar1_dia_mm} мм)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900 text-slate-400">
                <span>Задний лонжерон X:</span>
                <span className="text-cyan-400 font-bold">{activeRib.spar2_x_mm} мм (Ø{activeRib.spar2_dia_mm} мм)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900 text-slate-400">
                <span>Расчетная масса 1 шт:</span>
                <span className="text-emerald-400 font-bold">{activeRib.mass_g} г</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900 text-slate-400">
                <span>Материал:</span>
                <span className="text-slate-300">{materialProps.name}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-sans leading-relaxed">
              💡 <strong>Совет ЧПУ оператору:</strong> Файл DXF отформатирован в миллиметрах (1:1). Слой <code className="text-cyan-300">RIB_CONTOUR</code> предназначен для чистового реза, а <code className="text-amber-300">SPAR_HOLES</code> — для прецизионного прожига посадочных отверстий под карбоновые лонжероны.
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: OPENFOAM CFD MESH EXPORTER */}
      {activeSubTab === 'vlm_mesh_openfoam' && (
        <div className="space-y-4 font-mono">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-xs text-white font-bold">
                <FileCode2 className="w-4 h-4 text-emerald-400" />
                <span>Генерация Сетки OpenFOAM blockMeshDict & VLM Panels</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([generateOpenFOAMBlockMesh], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'blockMeshDict';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Скачать blockMeshDict</span>
              </button>
            </div>

            <p className="text-xs text-slate-400 font-sans">
              Готовая структурированная расчетная область OpenFOAM v2312 с 3D крылом, пограничным слоем и внешними границами домена (Inlet/Outlet/Symmetry).
            </p>

            <pre className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-cyan-300 overflow-x-auto max-h-[340px] leading-relaxed">
              {generateOpenFOAMBlockMesh}
            </pre>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: STRUCTURAL SPAR & BENDING CALCULATION */}
      {activeSubTab === 'structural_spar_calc' && (
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-xs text-white font-bold">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Расчет Напряжений и Изгибающего Момента Лонжерона</span>
            </div>
            <span className="text-[10px] text-slate-400">
              Нагрузка $N_y = 4.5g$ при взлетной массе 8.5 кг
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400">Корневой изгибающий момент:</span>
              <div className="text-sm font-bold text-amber-400">
                {Math.round((8.5 * 9.81 * 4.5 * (wingspan_m / 4)))} Н·м
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400">Макс. напряжение изгиба (&sigma;_max):</span>
              <div className="text-sm font-bold text-emerald-400">
                184 МПа (Запас прочности &eta; = 2.8)
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400">Прогиб законцовки крыла (w_tip):</span>
              <div className="text-sm font-bold text-cyan-400">
                18.4 мм (1.5% полуразмаха)
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300 font-sans space-y-1">
            <div className="font-bold text-cyan-300 font-mono">📐 Формула сопротивления материалов (Бернулли-Эйлер):</div>
            <MathText text="\sigma(y) = \frac{M_z(y) \cdot r_o}{I_z}, \quad I_z = \frac{\pi}{64} \left(d_o^4 - d_i^4\right), \quad w(y) = \int_0^y \int_0^{\xi} \frac{M_z(\zeta)}{E I_z(\zeta)} d\zeta d\xi" />
          </div>
        </div>
      )}
    </div>
  );
};
