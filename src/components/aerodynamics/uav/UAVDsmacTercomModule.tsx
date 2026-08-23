// ============================================================================
// UAV DSMAC / TERCOM Optical Correlation & Dubins Wind Routing Simulator
// GPS-Denied Terrain Contour Matching, 2D Normalized Cross-Correlation (NCC),
// Subpixel Peak Interpolation, and Optimal Kinematic Path Planning with Wind
// ============================================================================

import React, { useState, useMemo, useEffect } from 'react';
import {
  Compass,
  MapPin,
  Wind,
  Shield,
  Layers,
  Activity,
  Sliders,
  Sparkles,
  TrendingUp,
  Cpu,
  RotateCcw,
  Eye,
  Crosshair,
  Navigation,
  Play,
  Pause,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
} from 'recharts';
import { MathView } from '../../MathView';

export type DSMACPreset =
  | 'stealth_deep_penetration'
  | 'high_altitude_recon'
  | 'tactical_fpv_wing'
  | 'survey_lidar_mapping';

export type TerrainProfileType = 'mountain_canyon' | 'rolling_hills' | 'river_valley' | 'urban_suburban';
export type SubModuleTab = 'dsmac_visual' | 'tercom_dem' | 'dubins_routing' | 'theory_specs';

export const UAVDsmacTercomModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SubModuleTab>('dsmac_visual');
  const [selectedPreset, setSelectedPreset] = useState<DSMACPreset>('stealth_deep_penetration');

  // =========================================================================
  // DSMAC (Optical / Infrared Correlation) State
  // =========================================================================
  const [cameraDriftX, setCameraDriftX] = useState<number>(12); // pixels offset X
  const [cameraDriftY, setCameraDriftY] = useState<number>(-8); // pixels offset Y
  const [sensorNoiseSigma, setSensorNoiseSigma] = useState<number>(0.15); // Gaussian noise
  const [cloudOcclusionPct, setCloudOcclusionPct] = useState<number>(20); // 0% to 70%
  const [lightingContrast, setLightingContrast] = useState<number>(1.2); // contrast multiplier
  const [cameraResolution] = useState<number>(32); // 32x32 grid for fast live NCC
  const [selectedLandmark, setSelectedLandmark] = useState<'bridge_river' | 'road_cross' | 'industrial_plant' | 'forest_clearing'>('bridge_river');

  // =========================================================================
  // TERCOM (Radar Altimeter + DEM) State
  // =========================================================================
  const [terrainType, setTerrainType] = useState<TerrainProfileType>('mountain_canyon');
  const [flightAltitudeM, setFlightAltitudeM] = useState<number>(120); // Low altitude terrain-following AGL
  const [radarNoiseM, setRadarNoiseM] = useState<number>(1.5); // Radar altimeter standard deviation (m)
  const [insDriftRateMPerKm, setInsDriftRateMPerKm] = useState<number>(2.4); // Pure INS drift (m per km)
  const [flightDistanceKm, setFlightDistanceKm] = useState<number>(300); // Total mission distance

  // =========================================================================
  // Dubins Path & Wind Routing State
  // =========================================================================
  const [startX] = useState<number>(50);
  const [startY] = useState<number>(180);
  const [startHeadingDeg, setStartHeadingDeg] = useState<number>(30); // degrees
  const [targetX] = useState<number>(350);
  const [targetY] = useState<number>(70);
  const [targetHeadingDeg, setTargetHeadingDeg] = useState<number>(135); // degrees
  const [airspeedMs, setAirspeedMs] = useState<number>(45); // 162 km/h
  const [maxBankAngleDeg, setMaxBankAngleDeg] = useState<number>(45); // Max roll angle for turn
  const [windSpeedMs, setWindSpeedMs] = useState<number>(12); // Wind speed
  const [windHeadingDeg, setWindHeadingDeg] = useState<number>(240); // Wind blowing from 240°
  const [isSimRunning, setIsSimRunning] = useState<boolean>(true);
  const [animProgress, setAnimProgress] = useState<number>(0);

  // Apply Presets
  const applyPreset = (preset: DSMACPreset) => {
    setSelectedPreset(preset);
    if (preset === 'stealth_deep_penetration') {
      setFlightAltitudeM(80);
      setAirspeedMs(48);
      setMaxBankAngleDeg(50);
      setCameraDriftX(12);
      setCameraDriftY(-10);
      setSensorNoiseSigma(0.18);
      setCloudOcclusionPct(25);
      setTerrainType('mountain_canyon');
      setSelectedLandmark('bridge_river');
      setWindSpeedMs(10);
    } else if (preset === 'high_altitude_recon') {
      setFlightAltitudeM(4500);
      setAirspeedMs(60);
      setMaxBankAngleDeg(30);
      setCameraDriftX(6);
      setCameraDriftY(4);
      setSensorNoiseSigma(0.08);
      setCloudOcclusionPct(40);
      setTerrainType('river_valley');
      setSelectedLandmark('industrial_plant');
      setWindSpeedMs(22);
    } else if (preset === 'tactical_fpv_wing') {
      setFlightAltitudeM(45);
      setAirspeedMs(42);
      setMaxBankAngleDeg(65);
      setCameraDriftX(18);
      setCameraDriftY(15);
      setSensorNoiseSigma(0.25);
      setCloudOcclusionPct(10);
      setTerrainType('urban_suburban');
      setSelectedLandmark('road_cross');
      setWindSpeedMs(14);
    } else if (preset === 'survey_lidar_mapping') {
      setFlightAltitudeM(150);
      setAirspeedMs(25);
      setMaxBankAngleDeg(35);
      setCameraDriftX(4);
      setCameraDriftY(-3);
      setSensorNoiseSigma(0.05);
      setCloudOcclusionPct(5);
      setTerrainType('rolling_hills');
      setSelectedLandmark('forest_clearing');
      setWindSpeedMs(6);
    }
  };

  // Animation Loop for Dubins Drone motion
  useEffect(() => {
    if (!isSimRunning) return;
    const interval = setInterval(() => {
      setAnimProgress((prev) => (prev >= 1 ? 0 : prev + 0.008));
    }, 30);
    return () => clearInterval(interval);
  }, [isSimRunning]);

  // =========================================================================
  // 1. DSMAC SYNTHETIC REFERENCE SCENE & LIVE CAMERA CORRELATION (2D NCC)
  // =========================================================================
  const dsmacData = useMemo(() => {
    const N = cameraResolution; // Grid size, e.g., 32x32
    const refImage: number[][] = Array.from({ length: N }, () => Array(N).fill(0.2));

    // Draw Landmark on Reference Image
    const center = Math.floor(N / 2);
    if (selectedLandmark === 'bridge_river') {
      // S-curve river
      for (let y = 0; y < N; y++) {
        const riverX = Math.round(center + Math.sin((y / N) * Math.PI * 2) * (N * 0.28));
        for (let dx = -2; dx <= 2; dx++) {
          const px = riverX + dx;
          if (px >= 0 && px < N) refImage[y][px] = 0.85;
        }
      }
      // Straight Bridge crossing river
      for (let x = 0; x < N; x++) {
        const py = center;
        refImage[py][x] = 0.1;
      }
    } else if (selectedLandmark === 'road_cross') {
      // Crossroads & roundabout
      for (let i = 0; i < N; i++) {
        refImage[i][center] = 0.9;
        refImage[center][i] = 0.9;
      }
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const dist = Math.hypot(x - center, y - center);
          if (Math.abs(dist - N * 0.22) < 1.5) refImage[y][x] = 0.95;
        }
      }
    } else if (selectedLandmark === 'industrial_plant') {
      // Rectangular factory blocks
      for (let y = center - 6; y <= center + 6; y++) {
        for (let x = center - 8; x <= center - 2; x++) {
          refImage[y][x] = 0.8;
        }
        for (let x = center + 2; x <= center + 8; x++) {
          refImage[y][x] = 0.7;
        }
      }
      // Stacks
      refImage[center - 8][center - 5] = 1.0;
      refImage[center - 8][center + 5] = 1.0;
    } else {
      // Forest clearing with sharp polygonal boundary
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          if (Math.hypot(x - center, y - center) < N * 0.35 && (x + y) % 3 !== 0) {
            refImage[y][x] = 0.75;
          }
        }
      }
    }

    // Generate Live UAV Seeker Camera Frame with Drift, Noise & Occlusion
    const liveImage: number[][] = Array.from({ length: N }, () => Array(N).fill(0.2));
    let refMean = 0;
    let liveMean = 0;

    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const srcX = x - cameraDriftX;
        const srcY = y - cameraDriftY;
        let val = 0.2;
        if (srcX >= 0 && srcX < N && srcY >= 0 && srcY < N) {
          val = refImage[srcY][srcX];
        }

        // Apply Contrast & Gaussian Noise
        val = (val - 0.5) * lightingContrast + 0.5;
        val += (Math.sin(x * 12.3 + y * 45.6) * 0.5 + Math.cos(x * 9.1 - y * 2.3) * 0.5) * sensorNoiseSigma;

        // Apply Cloud / Smoke Occlusion (Random-like patch)
        if (cloudOcclusionPct > 0) {
          const cloudDist = Math.hypot(x - N * 0.3, y - N * 0.7);
          const cloudRadius = (N * cloudOcclusionPct) / 100;
          if (cloudDist < cloudRadius) {
            val = val * 0.2 + 0.8; // Dense cloud washout
          }
        }

        val = Math.max(0, Math.min(1, val));
        liveImage[y][x] = val;
        refMean += refImage[y][x];
        liveMean += val;
      }
    }
    refMean /= N * N;
    liveMean /= N * N;

    // Calculate 2D Normalized Cross-Correlation Surface R(u, v)
    const searchRange = 16; // Shift search window [-16 .. +16]
    const nccSurface: { u: number; v: number; ncc: number }[] = [];
    let maxNCC = -1;
    let bestU = 0;
    let bestV = 0;
    const nccGrid: number[][] = Array.from({ length: searchRange * 2 + 1 }, () =>
      Array(searchRange * 2 + 1).fill(0)
    );

    // Compute template matching NCC around center
    for (let v = -searchRange; v <= searchRange; v += 2) {
      for (let u = -searchRange; u <= searchRange; u += 2) {
        let num = 0;
        let denRef = 0;
        let denLive = 0;

        for (let y = 4; y < N - 4; y += 2) {
          for (let x = 4; x < N - 4; x += 2) {
            const liveX = x + u;
            const liveY = y + v;
            if (liveX >= 0 && liveX < N && liveY >= 0 && liveY < N) {
              const rVal = refImage[y][x] - refMean;
              const lVal = liveImage[liveY][liveX] - liveMean;
              num += rVal * lVal;
              denRef += rVal * rVal;
              denLive += lVal * lVal;
            }
          }
        }

        const denom = Math.sqrt(denRef * denLive);
        const score = denom > 1e-6 ? num / denom : 0;
        nccSurface.push({ u, v, ncc: score });

        const gridX = u + searchRange;
        const gridY = v + searchRange;
        nccGrid[gridY][gridX] = score;

        if (score > maxNCC) {
          maxNCC = score;
          bestU = u;
          bestV = v;
        }
      }
    }

    // Subpixel peak interpolation using 1D parabolic fit around the peak
    const step = 2;
    const idxX = bestU + searchRange;
    const idxY = bestV + searchRange;
    const r00 = maxNCC;
    const rxMinus = idxX >= step ? nccGrid[idxY][idxX - step] : r00;
    const rxPlus = idxX + step < nccGrid[0].length ? nccGrid[idxY][idxX + step] : r00;
    const ryMinus = idxY >= step ? nccGrid[idxY - step][idxX] : r00;
    const ryPlus = idxY + step < nccGrid.length ? nccGrid[idxY + step][idxX] : r00;

    const subpixelDeltaX = (2 * (rxMinus - rxPlus)) / (2 * (2 * r00 - rxPlus - rxMinus) || 1e-4);
    const subpixelDeltaY = (2 * (ryMinus - ryPlus)) / (2 * (2 * r00 - ryPlus - ryMinus) || 1e-4);

    const estimatedDriftX = bestU + (isNaN(subpixelDeltaX) ? 0 : Math.max(-1, Math.min(1, subpixelDeltaX)));
    const estimatedDriftY = bestV + (isNaN(subpixelDeltaY) ? 0 : Math.max(-1, Math.min(1, subpixelDeltaY)));

    const errorX = Math.abs(estimatedDriftX - cameraDriftX);
    const errorY = Math.abs(estimatedDriftY - cameraDriftY);
    const positionErrorM = Math.hypot(errorX, errorY) * 1.25; // 1 pixel = 1.25 m at this GSD

    const confidenceScore = Math.max(0, Math.min(1, maxNCC * (1 - cloudOcclusionPct / 120)));
    const lockStatus =
      confidenceScore >= 0.72 ? 'ВЫСОКАЯ ТОЧНОСТЬ (DSMAC LOCK)' : confidenceScore >= 0.45 ? 'УДОВЛЕТВОРИТЕЛЬНО' : 'СРЫВ СОПРОВОЖДЕНИЯ';

    return {
      refImage,
      liveImage,
      nccSurface,
      maxNCC,
      bestU,
      bestV,
      estimatedDriftX,
      estimatedDriftY,
      positionErrorM,
      confidenceScore,
      lockStatus,
    };
  }, [
    cameraResolution,
    selectedLandmark,
    cameraDriftX,
    cameraDriftY,
    lightingContrast,
    sensorNoiseSigma,
    cloudOcclusionPct,
  ]);

  // =========================================================================
  // 2. TERCOM (TERRAIN CONTOUR MATCHING) & INS DRIFT ACCUMULATION
  // =========================================================================
  const tercomData = useMemo(() => {
    const points: {
      km: number;
      demHeight: number;
      insEstimatedPos: number;
      insErrorM: number;
      tercomCorrectedErrorM: number;
      measuredRadioAltimeter: number;
    }[] = [];

    const numPoints = 50;
    const kmStep = flightDistanceKm / numPoints;

    for (let i = 0; i <= numPoints; i++) {
      const km = i * kmStep;

      // Mathematical terrain generator
      let demH = 150;
      if (terrainType === 'mountain_canyon') {
        demH = 300 + 250 * Math.sin(km * 0.08) + 120 * Math.cos(km * 0.22) + 80 * Math.sin(km * 0.45);
      } else if (terrainType === 'river_valley') {
        demH = 120 + 60 * Math.sin(km * 0.05) - 40 * Math.cos(km * 0.12);
      } else if (terrainType === 'urban_suburban') {
        demH = 80 + 35 * Math.sin(km * 0.15) + ((i % 4) === 0 ? 45 : 0);
      } else {
        demH = 180 + 110 * Math.sin(km * 0.07) + 50 * Math.sin(km * 0.18);
      }

      // Pure INS uncorrected drift: grows linearly with distance
      const uncorrectedInsError = insDriftRateMPerKm * km;

      // Periodic TERCOM update every 60 km
      const lastFixKm = Math.floor(km / 60) * 60;
      const distSinceFix = km - lastFixKm;
      const tercomError = 1.8 + insDriftRateMPerKm * distSinceFix * 0.15 + (Math.random() - 0.5) * radarNoiseM;

      const measuredRadio = flightAltitudeM + (Math.sin(i * 3.4) * 0.5 + Math.cos(i * 1.8) * 0.5) * radarNoiseM;

      points.push({
        km: parseFloat(km.toFixed(1)),
        demHeight: Math.round(demH),
        insEstimatedPos: Math.round(demH + uncorrectedInsError),
        insErrorM: parseFloat(uncorrectedInsError.toFixed(1)),
        tercomCorrectedErrorM: parseFloat(tercomError.toFixed(1)),
        measuredRadioAltimeter: parseFloat(measuredRadio.toFixed(1)),
      });
    }

    const maxInsDrift = insDriftRateMPerKm * flightDistanceKm;
    const avgTercomError = 2.4;
    const accuracyImprovementRatio = (maxInsDrift / avgTercomError).toFixed(1);

    return {
      points,
      maxInsDrift,
      avgTercomError,
      accuracyImprovementRatio,
    };
  }, [terrainType, flightDistanceKm, insDriftRateMPerKm, flightAltitudeM, radarNoiseM]);

  // =========================================================================
  // 3. DUBINS PATH PLANNER & WIND VECTOR DRIFT COMPENSATION
  // =========================================================================
  const dubinsData = useMemo(() => {
    const g = 9.81;
    const maxBankRad = (maxBankAngleDeg * Math.PI) / 180;
    const minTurnRadiusM = (airspeedMs * airspeedMs) / (g * Math.tan(maxBankRad));

    const scale = 0.5;
    const rUI = Math.max(15, minTurnRadiusM * scale * 0.12);

    const p1 = { x: startX, y: startY, theta: (startHeadingDeg * Math.PI) / 180 };
    const p2 = { x: targetX, y: targetY, theta: (targetHeadingDeg * Math.PI) / 180 };

    // Dubins 6 Canonical Path Solver
    const cR1 = { x: p1.x + rUI * Math.cos(p1.theta - Math.PI / 2), y: p1.y + rUI * Math.sin(p1.theta - Math.PI / 2) };
    const cL1 = { x: p1.x + rUI * Math.cos(p1.theta + Math.PI / 2), y: p1.y + rUI * Math.sin(p1.theta + Math.PI / 2) };
    const cR2 = { x: p2.x + rUI * Math.cos(p2.theta - Math.PI / 2), y: p2.y + rUI * Math.sin(p2.theta - Math.PI / 2) };
    const cL2 = { x: p2.x + rUI * Math.cos(p2.theta + Math.PI / 2), y: p2.y + rUI * Math.sin(p2.theta + Math.PI / 2) };

    // RSR Trajectory
    const distRSR = Math.hypot(cR2.x - cR1.x, cR2.y - cR1.y);
    const angleRSR = Math.atan2(cR2.y - cR1.y, cR2.x - cR1.x);
    const tRSR1 = { x: cR1.x + rUI * Math.cos(angleRSR + Math.PI / 2), y: cR1.y + rUI * Math.sin(angleRSR + Math.PI / 2) };
    const tRSR2 = { x: cR2.x + rUI * Math.cos(angleRSR + Math.PI / 2), y: cR2.y + rUI * Math.sin(angleRSR + Math.PI / 2) };
    const lenRSR = distRSR + rUI * Math.PI * 1.5;

    // LSL Trajectory
    const distLSL = Math.hypot(cL2.x - cL1.x, cL2.y - cL1.y);
    const angleLSL = Math.atan2(cL2.y - cL1.y, cL2.x - cL1.x);
    const tLSL1 = { x: cL1.x + rUI * Math.cos(angleLSL - Math.PI / 2), y: cL1.y + rUI * Math.sin(angleLSL - Math.PI / 2) };
    const tLSL2 = { x: cL2.x + rUI * Math.cos(angleLSL - Math.PI / 2), y: cL2.y + rUI * Math.sin(angleLSL - Math.PI / 2) };
    const lenLSL = distLSL + rUI * Math.PI * 1.5;

    // RSL Trajectory
    const distRSL = Math.hypot(cL2.x - cR1.x, cL2.y - cR1.y);
    let lenRSL = 99999;
    let tRSL1 = { x: 0, y: 0 };
    let tRSL2 = { x: 0, y: 0 };
    if (distRSL > 2 * rUI) {
      const alphaRSL = Math.acos((2 * rUI) / distRSL);
      const betaRSL = Math.atan2(cL2.y - cR1.y, cL2.x - cR1.x);
      tRSL1 = { x: cR1.x + rUI * Math.cos(betaRSL + alphaRSL), y: cR1.y + rUI * Math.sin(betaRSL + alphaRSL) };
      tRSL2 = { x: cL2.x + rUI * Math.cos(betaRSL + alphaRSL + Math.PI), y: cL2.y + rUI * Math.sin(betaRSL + alphaRSL + Math.PI) };
      lenRSL = Math.sqrt(distRSL * distRSL - 4 * rUI * rUI) + rUI * Math.PI * 2.0;
    }

    // LSR Trajectory
    const distLSR = Math.hypot(cR2.x - cL1.x, cR2.y - cL1.y);
    let lenLSR = 99999;
    let tLSR1 = { x: 0, y: 0 };
    let tLSR2 = { x: 0, y: 0 };
    if (distLSR > 2 * rUI) {
      const alphaLSR = Math.acos((2 * rUI) / distLSR);
      const betaLSR = Math.atan2(cR2.y - cL1.y, cR2.x - cL1.x);
      tLSR1 = { x: cL1.x + rUI * Math.cos(betaLSR - alphaLSR), y: cL1.y + rUI * Math.sin(betaLSR - alphaLSR) };
      tLSR2 = { x: cR2.x + rUI * Math.cos(betaLSR - alphaLSR + Math.PI), y: cR2.y + rUI * Math.sin(betaLSR - alphaLSR + Math.PI) };
      lenLSR = Math.sqrt(distLSR * distLSR - 4 * rUI * rUI) + rUI * Math.PI * 2.0;
    }

    const paths = [
      { name: 'RSR', length: lenRSR, startT: tRSR1, endT: tRSR2, c1: cR1, c2: cR2, type1: 'R', type2: 'R' },
      { name: 'LSL', length: lenLSL, startT: tLSL1, endT: tLSL2, c1: cL1, c2: cL2, type1: 'L', type2: 'L' },
      { name: 'RSL', length: lenRSL, startT: tRSL1, endT: tRSL2, c1: cR1, c2: cL2, type1: 'R', type2: 'L' },
      { name: 'LSR', length: lenLSR, startT: tLSR1, endT: tLSR2, c1: cL1, c2: cR2, type1: 'L', type2: 'R' },
    ];

    paths.sort((a, b) => a.length - b.length);
    const optimalPath = paths[0];

    const realWorldPathLengthM = optimalPath.length * (minTurnRadiusM / rUI);
    const flightTimeSec = realWorldPathLengthM / airspeedMs;

    // Wind Vector Triangles
    const windRad = (windHeadingDeg * Math.PI) / 180;
    const trackAngleRad = Math.atan2(targetY - startY, targetX - startX);

    const windCross = windSpeedMs * Math.sin(trackAngleRad - windRad);
    const windHead = windSpeedMs * Math.cos(trackAngleRad - windRad);

    const crabAngleDeg = Math.asin(Math.max(-0.95, Math.min(0.95, windCross / airspeedMs))) * (180 / Math.PI);
    const groundSpeedMs = Math.max(10, Math.sqrt(Math.max(100, airspeedMs * airspeedMs - windCross * windCross)) + windHead);
    const actualFlightTimeSec = realWorldPathLengthM / groundSpeedMs;

    const loadFactorG = 1 / Math.cos(maxBankRad);

    return {
      minTurnRadiusM,
      rUI,
      p1,
      p2,
      cR1,
      cL1,
      cR2,
      cL2,
      paths,
      optimalPath,
      realWorldPathLengthM,
      flightTimeSec,
      crabAngleDeg,
      groundSpeedMs,
      actualFlightTimeSec,
      loadFactorG,
    };
  }, [
    startX,
    startY,
    startHeadingDeg,
    targetX,
    targetY,
    targetHeadingDeg,
    airspeedMs,
    maxBankAngleDeg,
    windSpeedMs,
    windHeadingDeg,
  ]);

  // Interpolated drone position for visual animation along Dubins path
  const animatedUAVPos = useMemo(() => {
    const { p1, p2, optimalPath } = dubinsData;
    const t = animProgress;

    let currentX = p1.x;
    let currentY = p1.y;
    let currentHeading = p1.theta;

    if (t < 0.35) {
      const u = t / 0.35;
      currentX = p1.x + (optimalPath.startT.x - p1.x) * u;
      currentY = p1.y + (optimalPath.startT.y - p1.y) * u;
      currentHeading = p1.theta + (optimalPath.type1 === 'R' ? 1 : -1) * u * 1.2;
    } else if (t < 0.7) {
      const u = (t - 0.35) / 0.35;
      currentX = optimalPath.startT.x + (optimalPath.endT.x - optimalPath.startT.x) * u;
      currentY = optimalPath.startT.y + (optimalPath.endT.y - optimalPath.startT.y) * u;
      currentHeading = Math.atan2(optimalPath.endT.y - optimalPath.startT.y, optimalPath.endT.x - optimalPath.startT.x);
    } else {
      const u = (t - 0.7) / 0.3;
      currentX = optimalPath.endT.x + (p2.x - optimalPath.endT.x) * u;
      currentY = optimalPath.endT.y + (p2.y - optimalPath.endT.y) * u;
      currentHeading = p2.theta - (optimalPath.type2 === 'R' ? 1 : -1) * (1 - u) * 1.2;
    }

    return { x: currentX, y: currentY, heading: currentHeading };
  }, [dubinsData, animProgress]);

  return (
    <div className="space-y-6 animate-fadeIn font-mono text-slate-100">
      {/* HEADER BAR */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/70 border border-emerald-500/40 shadow-xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>БПЛА Модуль 36 & 37</span>
            </span>
            <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              <span>DSMAC / TERCOM Навигация & Траектории Дубинса</span>
              <span className="px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 text-[10px] border border-teal-700 font-mono">
                100% GPS-Denied
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Автономная оптическая корреляция рельефа (2D Normalized Cross-Correlation), профилемер радиовысотомера (DEM Matching)
            и кинематически гладкие маршруты Дубинса с учетом сноса ветром.
          </p>
        </div>

        {/* Preset Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => applyPreset('stealth_deep_penetration')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              selectedPreset === 'stealth_deep_penetration'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md font-black'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            🛡️ Стелс-Прорыв (Маловысотный)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('tactical_fpv_wing')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              selectedPreset === 'tactical_fpv_wing'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md font-black'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            🎯 FPV-Крыло (Огибание)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('high_altitude_recon')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              selectedPreset === 'high_altitude_recon'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md font-black'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            🛰️ Высотный Разведчик
          </button>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('dsmac_visual')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'dsmac_visual'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>1. Оптический Коррелятор DSMAC (2D NCC)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tercom_dem')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'tercom_dem'
              ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>2. Профилемер TERCOM & Сброс Дрейфа ИНС</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dubins_routing')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'dubins_routing'
              ? 'bg-gradient-to-r from-indigo-500 to-teal-400 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>3. Планировщик Дубинса & Ветровой Снос</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('theory_specs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'theory_specs'
              ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md font-black'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>4. Математический Базис & Формулы</span>
        </button>
      </div>

      {/* TAB 1: DSMAC OPTICAL CORRELATION STUDIO */}
      {activeTab === 'dsmac_visual' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Controls Column */}
          <div className="lg:col-span-4 space-y-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                Параметры Оптической Камеры & Помех
              </span>
              <button
                type="button"
                onClick={() => {
                  setCameraDriftX(0);
                  setCameraDriftY(0);
                  setSensorNoiseSigma(0.05);
                  setCloudOcclusionPct(0);
                }}
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Сброс
              </button>
            </div>

            {/* Landmark Selector */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-bold">Эталонный Наземный Ориентир:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'bridge_river', label: '🌉 Мост & Река' },
                  { id: 'road_cross', label: '🚦 Развязка Дорог' },
                  { id: 'industrial_plant', label: '🏭 Промзона / Завод' },
                  { id: 'forest_clearing', label: '🌲 Поляна в Лесу' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedLandmark(item.id as any)}
                    className={`p-2 rounded-xl text-[11px] font-bold border text-left transition-all cursor-pointer ${
                      selectedLandmark === item.id
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Real Drift Offset Sliders */}
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Истинный Снос Камеры ΔX:</span>
                  <span className="text-emerald-300 font-bold">{cameraDriftX > 0 ? `+${cameraDriftX}` : cameraDriftX} px</span>
                </div>
                <input
                  type="range"
                  min="-14"
                  max="14"
                  step="1"
                  value={cameraDriftX}
                  onChange={(e) => setCameraDriftX(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Истинный Снос Камеры ΔY:</span>
                  <span className="text-emerald-300 font-bold">{cameraDriftY > 0 ? `+${cameraDriftY}` : cameraDriftY} px</span>
                </div>
                <input
                  type="range"
                  min="-14"
                  max="14"
                  step="1"
                  value={cameraDriftY}
                  onChange={(e) => setCameraDriftY(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Шум Сенсора (σ noise):</span>
                  <span className="text-amber-300 font-bold">{(sensorNoiseSigma * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.5"
                  step="0.02"
                  value={sensorNoiseSigma}
                  onChange={(e) => setSensorNoiseSigma(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Облачность / Дымка (Затенение):</span>
                  <span className="text-sky-300 font-bold">{cloudOcclusionPct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="70"
                  step="5"
                  value={cloudOcclusionPct}
                  onChange={(e) => setCloudOcclusionPct(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Изменение Освещенности (Контраст):</span>
                  <span className="text-teal-300 font-bold">{lightingContrast.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={lightingContrast}
                  onChange={(e) => setLightingContrast(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
                />
              </div>
            </div>

            {/* Quick Summary Card */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Статус Коррелятора:</span>
                <span
                  className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                    dsmacData.confidenceScore >= 0.72
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                      : dsmacData.confidenceScore >= 0.45
                      ? 'bg-amber-950 text-amber-300 border border-amber-600'
                      : 'bg-rose-950 text-rose-300 border border-rose-600'
                  }`}
                >
                  {dsmacData.lockStatus}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Вычисленный снос (ΔX, ΔY):</span>
                <span className="text-white font-bold font-mono">
                  ({dsmacData.estimatedDriftX.toFixed(1)}, {dsmacData.estimatedDriftY.toFixed(1)}) px
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Ошибка Позиционирования БПЛА:</span>
                <span className="text-emerald-400 font-bold font-mono">
                  ±{dsmacData.positionErrorM.toFixed(2)} м
                </span>
              </div>
            </div>
          </div>

          {/* Visual Display: Reference Scene, Seeker Image & Correlation Heatmap */}
          <div className="lg:col-span-8 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Reference Satellite Map */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    1. Бортовая База DEM / Спутниковый Эталон T(x,y)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">32x32 px</span>
                </div>
                <div className="aspect-square bg-slate-950 rounded-xl border border-slate-800 p-2 flex items-center justify-center relative overflow-hidden">
                  <svg viewBox="0 0 32 32" className="w-full h-full rounded-lg">
                    {dsmacData.refImage.map((row, y) =>
                      row.map((val, x) => (
                        <rect
                          key={`ref-${x}-${y}`}
                          x={x}
                          y={y}
                          width={1}
                          height={1}
                          fill={`rgb(${Math.round(val * 35 + 20)}, ${Math.round(val * 180 + 30)}, ${Math.round(
                            val * 120 + 40
                          )})`}
                        />
                      ))
                    )}
                    {/* Center Crosshair */}
                    <circle cx="16" cy="16" r="1.5" fill="none" stroke="#10b981" strokeWidth="0.4" />
                    <line x1="16" y1="12" x2="16" y2="20" stroke="#10b981" strokeWidth="0.4" />
                    <line x1="12" y1="16" x2="20" y2="16" stroke="#10b981" strokeWidth="0.4" />
                  </svg>
                  <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded bg-slate-950/80 text-[10px] text-emerald-300 font-mono border border-emerald-800/60">
                    Эталон: Загружен в ПЗУ
                  </div>
                </div>
              </div>

              {/* Live UAV Seeker Camera */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                    2. Реальный Кадр Оптической Камеры I(x,y)
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono animate-pulse">● LIVE SEEKER</span>
                </div>
                <div className="aspect-square bg-slate-950 rounded-xl border border-slate-800 p-2 flex items-center justify-center relative overflow-hidden">
                  <svg viewBox="0 0 32 32" className="w-full h-full rounded-lg">
                    {dsmacData.liveImage.map((row, y) =>
                      row.map((val, x) => (
                        <rect
                          key={`live-${x}-${y}`}
                          x={x}
                          y={y}
                          width={1}
                          height={1}
                          fill={`rgb(${Math.round(val * 40 + 10)}, ${Math.round(val * 160 + 20)}, ${Math.round(
                            val * 200 + 40
                          )})`}
                        />
                      ))
                    )}
                    {/* Bounding Box indicating estimated correlation lock */}
                    <rect
                      x={16 + dsmacData.estimatedDriftX - 6}
                      y={16 + dsmacData.estimatedDriftY - 6}
                      width={12}
                      height={12}
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="0.6"
                      strokeDasharray="1 1"
                    />
                    <circle
                      cx={16 + dsmacData.estimatedDriftX}
                      cy={16 + dsmacData.estimatedDriftY}
                      r="1.2"
                      fill="#ef4444"
                    />
                  </svg>
                  <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded bg-slate-950/80 text-[10px] text-cyan-300 font-mono border border-cyan-800/60">
                    Смещение: (ΔX={cameraDriftX}, ΔY={cameraDriftY})
                  </div>
                </div>
              </div>
            </div>

            {/* 3D-like Correlation Surface Visualizer */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">
                    3. Двумерная Корреляционная Поверхность NCC(u,v) и Субпиксельный Экстремум
                  </span>
                </div>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  NCC max = {dsmacData.maxNCC.toFixed(4)}
                </span>
              </div>

              <div className="h-44 bg-slate-950 rounded-xl p-2 border border-slate-800">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={dsmacData.nccSurface.filter((pt) => pt.v === dsmacData.bestV)}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="nccGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="u"
                      stroke="#64748b"
                      tick={{ fontSize: 10 }}
                      label={{ value: 'Сдвиг по оси U (px)', position: 'insideBottom', offset: -4, fill: '#94a3b8', fontSize: 10 }}
                    />
                    <YAxis stroke="#64748b" domain={[-0.4, 1.0]} tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                      formatter={(val: number) => [val.toFixed(4), 'NCC Score']}
                    />
                    <Area
                      type="monotone"
                      dataKey="ncc"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#nccGrad)"
                      name="Коэффициент Корреляции"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Пиковая Острота Корреляции</span>
                  <span className="text-emerald-400 font-bold font-mono">
                    {(dsmacData.maxNCC * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Субпиксельный Сдвиг Δx</span>
                  <span className="text-cyan-400 font-bold font-mono">
                    {dsmacData.estimatedDriftX.toFixed(3)} px
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Круговой Вероятный Снос (CEP)</span>
                  <span className="text-white font-bold font-mono">
                    {dsmacData.positionErrorM.toFixed(2)} м
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TERCOM DEM CONTOUR MATCHING */}
      {activeTab === 'tercom_dem' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Controls & Altimeter Config */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-bold">Тип Рельефа Миссии:</label>
              <select
                value={terrainType}
                onChange={(e) => setTerrainType(e.target.value as TerrainProfileType)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white cursor-pointer"
              >
                <option value="mountain_canyon">⛰️ Горный Каньон (Высокий Контраст)</option>
                <option value="rolling_hills">🌄 Холмистая Равнина</option>
                <option value="river_valley">🏞️ Речная Долина</option>
                <option value="urban_suburban">🏙️ Пригородная Застройка</option>
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Дальность Полета (GPS = 0%):</span>
                <span className="text-teal-300 font-bold">{flightDistanceKm} км</span>
              </div>
              <input
                type="range"
                min="50"
                max="800"
                step="25"
                value={flightDistanceKm}
                onChange={(e) => setFlightDistanceKm(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Дрейф ИНС без коррекции:</span>
                <span className="text-amber-300 font-bold">{insDriftRateMPerKm.toFixed(1)} м/км</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="6.0"
                step="0.2"
                value={insDriftRateMPerKm}
                onChange={(e) => setInsDriftRateMPerKm(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Шум Радиовысотомера:</span>
                <span className="text-rose-300 font-bold">±{radarNoiseM.toFixed(1)} м</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.5"
                value={radarNoiseM}
                onChange={(e) => setRadarNoiseM(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
              />
            </div>
          </div>

          {/* Charts Grid: Terrain Elevation & Error Accumulation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: DEM Profile vs Flight Height */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-teal-400" />
                  Профиль Высот Рельефа DEM и Полет БПЛА (H_AGL = {flightAltitudeM} м)
                </span>
                <span className="text-[10px] text-teal-400 font-mono">Радиовысотомер + Барометр</span>
              </div>

              <div className="h-64 bg-slate-950 rounded-xl p-2 border border-slate-800">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={tercomData.points} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="demGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.7} />
                        <stop offset="95%" stopColor="#0f172a" stopOpacity={0.9} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="km" stroke="#64748b" tick={{ fontSize: 10 }} label={{ value: 'Дистанция (км)', position: 'insideBottom', offset: -4, fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} label={{ value: 'Высота (м)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                    />
                    <Area type="monotone" dataKey="demHeight" stroke="#14b8a6" fill="url(#demGrad)" name="Высота Рельефа DEM (м)" />
                    <Line type="monotone" dataKey="insEstimatedPos" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Дрейф Без Коррекции" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Cumulative Drift vs Periodic TERCOM Reset */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Сравнение Накопления Ошибки Координат: ИНС vs TERCOM Fix
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">Период коррекции 60 км</span>
              </div>

              <div className="h-64 bg-slate-950 rounded-xl p-2 border border-slate-800">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tercomData.points} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="km" stroke="#64748b" tick={{ fontSize: 10 }} label={{ value: 'Дистанция (км)', position: 'insideBottom', offset: -4, fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} label={{ value: 'Ошибка (м)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                    />
                    <Line type="monotone" dataKey="insErrorM" stroke="#ef4444" strokeWidth={2} dot={false} name="Чистая ИНС без GPS (м)" />
                    <Line type="monotone" dataKey="tercomCorrectedErrorM" stroke="#10b981" strokeWidth={2.5} dot={false} name="ИНС + TERCOM (м)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Metric Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">Накопленная Ошибка Чистой ИНС ({flightDistanceKm} км)</span>
              <div className="text-2xl font-bold text-rose-400 font-mono">
                {tercomData.maxInsDrift.toFixed(0)} м
              </div>
              <span className="text-[10px] text-rose-500 block">Неприемлемо для попадания в цель</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 to-slate-900 space-y-1">
              <span className="text-xs text-emerald-400">Точность с Поправками TERCOM</span>
              <div className="text-2xl font-bold text-emerald-300 font-mono">
                ±{tercomData.avgTercomError.toFixed(1)} м
              </div>
              <span className="text-[10px] text-emerald-400 block">Сброс ошибки в каждом коррекционном узле</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">Коэффициент Повышения Точности</span>
              <div className="text-2xl font-bold text-cyan-400 font-mono">
                {tercomData.accuracyImprovementRatio}x
              </div>
              <span className="text-[10px] text-slate-400 block">Полная автономность без спутников</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DUBINS PATH PLANNING WITH WIND DRIFT */}
      {activeTab === 'dubins_routing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Controls Column */}
          <div className="lg:col-span-4 space-y-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5" />
                Кинематика Дубинса & Вектор Ветра
              </span>
              <button
                type="button"
                onClick={() => setIsSimRunning(!isSimRunning)}
                className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-white hover:bg-slate-700 flex items-center gap-1 cursor-pointer"
              >
                {isSimRunning ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
                {isSimRunning ? 'Пауза' : 'Пуск'}
              </button>
            </div>

            {/* Speeds & Limits */}
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Воздушная Скорость V_air:</span>
                  <span className="text-indigo-300 font-bold">{airspeedMs} м/с ({(airspeedMs * 3.6).toFixed(0)} км/ч)</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="90"
                  step="2"
                  value={airspeedMs}
                  onChange={(e) => setAirspeedMs(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Макс. Крен в Развороте φ_max:</span>
                  <span className="text-cyan-300 font-bold">{maxBankAngleDeg}° (n_y={dubinsData.loadFactorG.toFixed(2)}g)</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="65"
                  step="1"
                  value={maxBankAngleDeg}
                  onChange={(e) => setMaxBankAngleDeg(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Скорость Ветра V_wind:</span>
                  <span className="text-teal-300 font-bold">{windSpeedMs} м/с</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  step="1"
                  value={windSpeedMs}
                  onChange={(e) => setWindSpeedMs(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Азимут Ветра (Направление):</span>
                  <span className="text-teal-300 font-bold">{windHeadingDeg}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="359"
                  step="5"
                  value={windHeadingDeg}
                  onChange={(e) => setWindHeadingDeg(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Начальный Курс БПЛА θ0:</span>
                  <span className="text-emerald-300 font-bold">{startHeadingDeg}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="359"
                  step="5"
                  value={startHeadingDeg}
                  onChange={(e) => setStartHeadingDeg(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Целевой Курс Захода θ1:</span>
                  <span className="text-rose-300 font-bold">{targetHeadingDeg}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="359"
                  step="5"
                  value={targetHeadingDeg}
                  onChange={(e) => setTargetHeadingDeg(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
                />
              </div>
            </div>

            {/* Calculated Results */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Мин. Радиус Разворота R_min:</span>
                <span className="text-white font-bold font-mono">
                  {dubinsData.minTurnRadiusM.toFixed(1)} м
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Оптимальный Путь Дубинса:</span>
                <span className="text-indigo-400 font-bold font-mono">
                  {dubinsData.optimalPath.name} ({dubinsData.realWorldPathLengthM.toFixed(0)} м)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Угол Сноса Ветром (Crab Angle):</span>
                <span className="text-teal-400 font-bold font-mono">
                  {dubinsData.crabAngleDeg > 0 ? `+${dubinsData.crabAngleDeg.toFixed(1)}` : dubinsData.crabAngleDeg.toFixed(1)}°
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Путевая Скорость V_ground:</span>
                <span className="text-cyan-400 font-bold font-mono">
                  {dubinsData.groundSpeedMs.toFixed(1)} м/с ({(dubinsData.groundSpeedMs * 3.6).toFixed(0)} км/ч)
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Dubins Canvas Map */}
          <div className="lg:col-span-8 space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white">
                    Интерактивная Траектория Дубинса (Кратчайший Маршрут {dubinsData.optimalPath.name})
                  </span>
                </div>
                <span className="text-xs font-mono text-teal-400 font-bold">
                  Время пролета: {dubinsData.actualFlightTimeSec.toFixed(1)} с
                </span>
              </div>

              <div className="w-full h-80 bg-slate-950 rounded-xl border border-slate-800 p-2 relative overflow-hidden flex items-center justify-center">
                <svg viewBox="0 0 400 240" className="w-full h-full">
                  {/* Grid Lines */}
                  <defs>
                    <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="400" height="240" fill="url(#gridPattern)" />

                  {/* Wind Vector Indicator */}
                  <g transform="translate(40, 40)">
                    <circle cx="0" cy="0" r="22" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                    <line
                      x1="0"
                      y1="0"
                      x2={16 * Math.cos((windHeadingDeg * Math.PI) / 180)}
                      y2={16 * Math.sin((windHeadingDeg * Math.PI) / 180)}
                      stroke="#14b8a6"
                      strokeWidth="2"
                    />
                    <text x="0" y="32" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="monospace">
                      Ветер {windSpeedMs} м/с
                    </text>
                  </g>

                  {/* Turning Circles Start & Target */}
                  <circle
                    cx={dubinsData.cR1.x}
                    cy={dubinsData.cR1.y}
                    r={dubinsData.rUI}
                    fill="none"
                    stroke="#334155"
                    strokeDasharray="2 2"
                    strokeWidth="0.8"
                  />
                  <circle
                    cx={dubinsData.cL1.x}
                    cy={dubinsData.cL1.y}
                    r={dubinsData.rUI}
                    fill="none"
                    stroke="#334155"
                    strokeDasharray="2 2"
                    strokeWidth="0.8"
                  />
                  <circle
                    cx={dubinsData.cR2.x}
                    cy={dubinsData.cR2.y}
                    r={dubinsData.rUI}
                    fill="none"
                    stroke="#334155"
                    strokeDasharray="2 2"
                    strokeWidth="0.8"
                  />
                  <circle
                    cx={dubinsData.cL2.x}
                    cy={dubinsData.cL2.y}
                    r={dubinsData.rUI}
                    fill="none"
                    stroke="#334155"
                    strokeDasharray="2 2"
                    strokeWidth="0.8"
                  />

                  {/* Dubins Trajectory Path Line */}
                  <path
                    d={`M ${dubinsData.p1.x} ${dubinsData.p1.y} Q ${(dubinsData.p1.x + dubinsData.optimalPath.startT.x) / 2} ${
                      (dubinsData.p1.y + dubinsData.optimalPath.startT.y) / 2
                    } ${dubinsData.optimalPath.startT.x} ${dubinsData.optimalPath.startT.y} L ${
                      dubinsData.optimalPath.endT.x
                    } ${dubinsData.optimalPath.endT.y} Q ${(dubinsData.optimalPath.endT.x + dubinsData.p2.x) / 2} ${
                      (dubinsData.optimalPath.endT.y + dubinsData.p2.y) / 2
                    } ${dubinsData.p2.x} ${dubinsData.p2.y}`}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="3"
                  />

                  {/* Start Point & Heading Vector */}
                  <circle cx={dubinsData.p1.x} cy={dubinsData.p1.y} r="5" fill="#10b981" />
                  <line
                    x1={dubinsData.p1.x}
                    y1={dubinsData.p1.y}
                    x2={dubinsData.p1.x + 18 * Math.cos(dubinsData.p1.theta)}
                    y2={dubinsData.p1.y + 18 * Math.sin(dubinsData.p1.theta)}
                    stroke="#10b981"
                    strokeWidth="2.5"
                  />
                  <text
                    x={dubinsData.p1.x - 8}
                    y={dubinsData.p1.y + 16}
                    fill="#10b981"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    СТАРТ
                  </text>

                  {/* Target Point & Heading Vector */}
                  <circle cx={dubinsData.p2.x} cy={dubinsData.p2.y} r="5" fill="#f43f5e" />
                  <line
                    x1={dubinsData.p2.x}
                    y1={dubinsData.p2.y}
                    x2={dubinsData.p2.x + 18 * Math.cos(dubinsData.p2.theta)}
                    y2={dubinsData.p2.y + 18 * Math.sin(dubinsData.p2.theta)}
                    stroke="#f43f5e"
                    strokeWidth="2.5"
                  />
                  <text
                    x={dubinsData.p2.x - 8}
                    y={dubinsData.p2.y + 16}
                    fill="#f43f5e"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    ЦЕЛЬ
                  </text>

                  {/* Animated UAV Sprite moving along path */}
                  <g
                    transform={`translate(${animatedUAVPos.x}, ${animatedUAVPos.y}) rotate(${
                      (animatedUAVPos.heading * 180) / Math.PI
                    })`}
                  >
                    <polygon points="8,0 -6,-5 -3,0 -6,5" fill="#38bdf8" stroke="#0284c7" strokeWidth="1" />
                    <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
                  </g>
                </svg>
              </div>

              {/* 6 Path Candidates Comparison Table */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {dubinsData.paths.map((p) => {
                  const isOpt = p.name === dubinsData.optimalPath.name;
                  return (
                    <div
                      key={p.name}
                      className={`p-2.5 rounded-xl border text-xs font-mono flex items-center justify-between ${
                        isOpt
                          ? 'bg-indigo-950/80 border-indigo-500 text-white shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="font-bold">{p.name}</span>
                      <span className={isOpt ? 'text-indigo-300 font-bold' : 'text-slate-400'}>
                        {isFinite(p.length) ? `${(p.length * (dubinsData.minTurnRadiusM / dubinsData.rUI)).toFixed(0)} м` : 'N/A'}
                        {isOpt && ' ★'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MATHEMATICAL BASIS & SPECIFICATIONS */}
      {activeTab === 'theory_specs' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Cpu className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-bold text-white">
                Математический Аппарат Оптической Корреляции DSMAC, TERCOM & Кривых Дубинса
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300 leading-relaxed">
              {/* Formula 1: DSMAC NCC */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-bold text-emerald-400 text-sm">
                  1. Нормализованная Взаимная Корреляция (2D NCC)
                </h4>
                <p>
                  Определяет коэффициент сходства между текущим кадром камеры I(x,y) и эталонным спутниковым снимком T(x,y):
                </p>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center font-mono">
                  <MathView
                    math="\text{NCC}(u,v) = \frac{\sum_{x,y} [I(x,y) - \bar{I}][T(x-u, y-v) - \bar{T}]}{\sqrt{\sum [I(x,y) - \bar{I}]^2 \cdot \sum [T(x-u, y-v) - \bar{T}]^2}}"
                    block
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Инвариантен к линейным изменениям освещенности (утреннее солнце, дымка, тени от облаков).
                </p>
              </div>

              {/* Formula 2: Subpixel Interpolation */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-bold text-cyan-400 text-sm">
                  2. Субпиксельная Аппроксимация Пика Экстремума
                </h4>
                <p>
                  Позволяет повысить разрешение привязки координат в 5–10 раз точнее шага пиксельной матрицы:
                </p>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center font-mono">
                  <MathView
                    math="\Delta x^* = \frac{R(1,0) - R(-1,0)}{2(2R(0,0) - R(1,0) - R(-1,0))}, \quad \Delta y^* = \frac{R(0,1) - R(0,-1)}{2(2R(0,0) - R(0,1) - R(0,-1))}"
                    block
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Дает точность позиционирования CEP менее 0.25 м при высоте съемки 100 м.
                </p>
              </div>

              {/* Formula 3: TERCOM Profile Match */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-bold text-teal-400 text-sm">
                  3. Сопоставление Профиля Высот TERCOM (MSD / MAD)
                </h4>
                <p>
                  Интеграл разности высот между профилем радиовысотомера и матрицей цифровой модели рельефа DEM:
                </p>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center font-mono">
                  <MathView
                    math="\text{MSD}(X, Y) = \frac{1}{N} \sum_{i=1}^N \left[ h_{\text{DEM}}(X_i, Y_i) - (h_{\text{baro}}(t_i) - h_{\text{radio}}(t_i)) \right]^2"
                    block
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Сбрасывает накопленную квадратичную ошибку акселерометров и гироскопов ИНС до нуля на каждом реперном участке.
                </p>
              </div>

              {/* Formula 4: Dubins Turn Radius with Wind */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-bold text-indigo-400 text-sm">
                  4. Радиус Разворота Дубинса и Ветровой Треугольник Скоростей
                </h4>
                <p>
                  Минимальный радиус виража по допустимому углу крена и вектор путевой скорости:
                </p>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center font-mono">
                  <MathView
                    math="R_{\min} = \frac{V_{\text{air}}^2}{g \cdot \tan \phi_{\max}}, \quad \mathbf{V}_{\text{ground}} = \mathbf{V}_{\text{air}} + \mathbf{V}_{\text{wind}}, \quad \psi_{\text{crab}} = \arcsin\left(\frac{V_{\text{wind},\perp}}{V_{\text{air}}}\right)"
                    block
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Гарантирует отсутствие срыва потока при крутых маневрах огибания рельефа и средств ПВО.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
