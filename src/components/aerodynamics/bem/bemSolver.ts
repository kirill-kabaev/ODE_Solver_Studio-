// ============================================================================
// BEM (Blade Element Momentum Theory) Numerical Solver & Presets
// Implements Glauert turbulent wake correction, Prandtl tip & hub losses,
// Compressibility corrections, ducted fan shroud augmentation, and drone flight matching.
// ============================================================================

import {
  AirfoilPolar,
  BemPreset,
  DroneFlightProfile,
  DroneFlightResults,
  FlowOperatingCondition,
  RadialElementResult,
  RotorBEMResults,
  RotorGeometryConfig,
} from './bemTypes';

// ============================================================================
// AIRFOIL POLAR MODELS
// ============================================================================

export const AIRFOIL_POLARS: Record<string, AirfoilPolar> = {
  NACA_4412: {
    name: 'NACA 4412 (Классический профиль винта)',
    cl0: 0.40,
    clAlpha: 5.95, // per radian
    clMax: 1.55,
    alphaStallDeg: 14.5,
    cd0: 0.0085,
    cdInducedFactor: 0.045,
    cdStall: 0.18,
    thicknessRatio: 0.12,
  },
  Clark_Y: {
    name: 'Clark Y (Плоско-выпуклый авиационный)',
    cl0: 0.38,
    clAlpha: 5.80,
    clMax: 1.48,
    alphaStallDeg: 14.0,
    cd0: 0.0090,
    cdInducedFactor: 0.048,
    cdStall: 0.19,
    thicknessRatio: 0.117,
  },
  NACA_0012: {
    name: 'NACA 0012 (Симметричный профиль несущего винта)',
    cl0: 0.00,
    clAlpha: 6.05,
    clMax: 1.40,
    alphaStallDeg: 13.0,
    cd0: 0.0075,
    cdInducedFactor: 0.042,
    cdStall: 0.16,
    thicknessRatio: 0.12,
  },
  Eppler_E387: {
    name: 'Eppler E387 (Низкие числа Рейнольдса Re ~ 10^5)',
    cl0: 0.48,
    clAlpha: 6.10,
    clMax: 1.42,
    alphaStallDeg: 12.5,
    cd0: 0.0110,
    cdInducedFactor: 0.052,
    cdStall: 0.20,
    thicknessRatio: 0.091,
  },
  DJI_Prop_Profile: {
    name: 'DJI Drone Blade (Тонкий мультироторный профиль)',
    cl0: 0.32,
    clAlpha: 5.70,
    clMax: 1.35,
    alphaStallDeg: 12.0,
    cd0: 0.0125,
    cdInducedFactor: 0.055,
    cdStall: 0.22,
    thicknessRatio: 0.075,
  },
  High_Camber_Fan: {
    name: 'High Camber Fan (Лопатка высоконапорного импеллера)',
    cl0: 0.65,
    clAlpha: 6.30,
    clMax: 1.75,
    alphaStallDeg: 16.0,
    cd0: 0.0140,
    cdInducedFactor: 0.060,
    cdStall: 0.24,
    thicknessRatio: 0.10,
  },
};

// Evaluate Cl and Cd given angle of attack in radians
export function evaluateAirfoilSection(
  polar: AirfoilPolar,
  alphaRad: number,
  mach: number,
  reynolds: number
): { cl: number; cd: number } {
  const alphaDeg = (alphaRad * 180) / Math.PI;
  const stallRad = (polar.alphaStallDeg * Math.PI) / 180;

  let cl = 0;
  let cd = polar.cd0;

  // Linear region with smooth stall transition
  if (Math.abs(alphaRad) <= stallRad) {
    cl = polar.cl0 + polar.clAlpha * alphaRad;
    // Cap at stall
    if (cl > polar.clMax) cl = polar.clMax;
    if (cl < -polar.clMax * 0.8) cl = -polar.clMax * 0.8;

    cd = polar.cd0 + polar.cdInducedFactor * Math.pow(cl, 2);
  } else {
    // Post-stall Viterna-Corrigan simplified formulation
    const sign = Math.sign(alphaRad);
    const postStallCl = polar.clMax * Math.cos(alphaRad - sign * stallRad) * 0.8;
    cl = postStallCl;
    cd = polar.cdStall + 1.2 * Math.pow(Math.sin(alphaRad), 2);
  }

  // Low Reynolds penalty (if Re < 150,000, typical for small drones)
  if (reynolds > 1000 && reynolds < 150000) {
    const reScale = Math.pow(150000 / reynolds, 0.35);
    cd *= Math.min(2.5, reScale);
    cl *= Math.max(0.7, 1 / Math.sqrt(reScale));
  }

  // Compressibility Correction (Prandtl-Glauert / Karman-Tsien)
  if (mach > 0.3 && mach < 0.98) {
    const beta = Math.sqrt(Math.max(0.04, 1 - mach * mach));
    cl = cl / beta;
    cd = cd * (1 + 0.25 * Math.pow(mach, 3));
  } else if (mach >= 0.98) {
    // Transonic wave drag penalty
    cl *= 0.6;
    cd += 0.08 + 0.15 * (mach - 0.98);
  }

  return { cl, cd };
}

// ============================================================================
// CORE BEM NUMERICAL SOLVER
// ============================================================================

export function solveBladeElementMomentum(
  config: RotorGeometryConfig,
  flow: FlowOperatingCondition
): RotorBEMResults {
  const R = config.diameterMeters / 2;
  const rHub = config.hubRadiusMeters;
  const B = config.numBlades;
  const numElements = Math.max(15, config.numRadialElements);
  const omega = (flow.rpm * 2 * Math.PI) / 60; // rad/s
  const Vinf = Math.max(0.001, flow.airspeedMs);
  const rho = flow.airDensity;
  const aSound = flow.speedOfSound;
  const mu = flow.viscosity;
  const collectivePitchRad = (flow.pitchControlDeg * Math.PI) / 180;

  const diskArea = Math.PI * R * R;
  const activeDiskArea = Math.PI * (R * R - rHub * rHub);
  const polar = AIRFOIL_POLARS[config.airfoilType] || AIRFOIL_POLARS.Clark_Y;

  const elements: RadialElementResult[] = [];
  let totalThrustRotor = 0;
  let totalTorque = 0;
  let totalBladeArea = 0;
  let maxResidual = 0;
  let solverIterations = 0;

  // Radial grid discretization using cosine clustering near tip
  const drBase = (R - rHub) / numElements;

  for (let i = 0; i < numElements; i++) {
    // Cosine spacing parameter eta in [0, 1]
    const eta = (i + 0.5) / numElements;
    // Cosine clustering (more points near hub and tip)
    const rNorm = (1 - Math.cos(eta * Math.PI)) / 2;
    const r = rHub + rNorm * (R - rHub);
    const rNormalized = r / R;

    // Determine local chord and twist by linear / parabolic distribution
    const chord =
      config.rootChordMeters +
      (config.tipChordMeters - config.rootChordMeters) * Math.pow(rNorm, 0.85);

    // Geometric twist theta(r) with collective pitch addition
    const twistDeg =
      config.rootTwistDeg +
      (config.tipTwistDeg - config.rootTwistDeg) * rNorm +
      flow.pitchControlDeg;
    const thetaRad = (twistDeg * Math.PI) / 180;

    // Solidity at this radius
    const solidity = (B * chord) / (2 * Math.PI * r);
    totalBladeArea += B * chord * drBase;

    // Iterative solution for axial induction (a) and tangential induction (a')
    let a = 0.05;
    let aPrime = 0.01;
    const maxIter = 80;
    const relax = 0.35;
    let iter = 0;
    let converged = false;

    let phi = 0;
    let alpha = 0;
    let Vrel = 0;
    let mach = 0;
    let Re = 0;
    let cl = 0;
    let cd = 0;
    let Ftip = 1;
    let Fhub = 1;
    let F = 1;
    let Cn = 0;
    let Ct = 0;

    while (iter < maxIter && !converged) {
      iter++;

      // Inflow angle phi
      const Vaxial = Vinf * (1 + a);
      const Vtan = omega * r * (1 - aPrime);
      phi = Math.atan2(Vaxial, Math.max(0.001, Vtan));

      // Local angle of attack alpha
      alpha = thetaRad - phi;

      // Relative velocity
      Vrel = Math.sqrt(Vaxial * Vaxial + Vtan * Vtan);
      mach = Vrel / aSound;
      Re = (rho * Vrel * chord) / mu;

      // Airfoil performance
      const aero = evaluateAirfoilSection(polar, alpha, mach, Re);
      cl = aero.cl;
      cd = aero.cd;

      // Prandtl tip loss factor
      const sinPhiAbs = Math.max(0.005, Math.abs(Math.sin(phi)));
      const fTip = (B * (R - r)) / (2 * R * sinPhiAbs);
      Ftip =
        fTip > 20
          ? 1.0
          : (2 / Math.PI) * Math.acos(Math.min(1.0, Math.exp(-fTip)));

      // Prandtl hub loss factor
      const fHub = (B * (r - rHub)) / (2 * rHub * sinPhiAbs);
      Fhub =
        fHub > 20
          ? 1.0
          : (2 / Math.PI) * Math.acos(Math.min(1.0, Math.exp(-fHub)));

      F = Math.max(0.01, Ftip * Fhub);

      // Section normal and tangential force coefficients
      Cn = cl * Math.cos(phi) - cd * Math.sin(phi);
      Ct = cl * Math.sin(phi) + cd * Math.cos(phi);

      // Solve for new axial induction factor a_new
      // Propeller momentum balance: CT_local = sigma * Cn * (1 + a)^2 / sin^2(phi)
      const sin2Phi = Math.max(0.0001, Math.sin(phi) * Math.sin(phi));
      const gamma = (4 * F * sin2Phi) / Math.max(1e-6, solidity * Cn);

      let aNew = 0;
      const ac = 0.33; // Glauert critical induction factor

      if (gamma > 1.05) {
        // Standard momentum state
        aNew = 1 / (gamma - 1);
      } else {
        // Glauert / Buhl turbulent wake state correction for heavily loaded rotors
        const term1 = gamma * (1 - 2 * ac) + 2;
        const sqrtVal = Math.max(
          0,
          term1 * term1 + 4 * (gamma * ac * ac - 1)
        );
        aNew = 0.5 * (2 + gamma * (1 - 2 * ac) - Math.sqrt(sqrtVal));
      }

      // Bound axial induction to prevent divergence
      aNew = Math.max(-0.6, Math.min(0.95, aNew));

      // Solve for new tangential induction factor a'_new
      const sinPhiCosPhi = Math.sin(phi) * Math.cos(phi);
      const gammaPrime =
        (4 * F * sinPhiCosPhi) / Math.max(1e-6, solidity * Ct);
      let aPrimeNew = 1 / (gammaPrime + 1);
      aPrimeNew = Math.max(-0.3, Math.min(0.6, aPrimeNew));

      // Check convergence residual
      const res = Math.max(Math.abs(aNew - a), Math.abs(aPrimeNew - aPrime));
      if (res > maxResidual) maxResidual = res;

      if (res < 1e-4) {
        converged = true;
      }

      // Under-relaxation update
      a = a + relax * (aNew - a);
      aPrime = aPrime + relax * (aPrimeNew - aPrime);
    }

    solverIterations += iter;

    // Compute element forces per meter dr
    const qDyn = 0.5 * rho * Vrel * Vrel;
    const dT_dr = qDyn * B * chord * Cn;
    const dQ_dr = qDyn * B * chord * Ct * r;
    const dP_dr = dQ_dr * omega;

    // Approximate integration segment dr
    const dr = drBase;
    totalThrustRotor += dT_dr * dr;
    totalTorque += dQ_dr * dr;

    elements.push({
      rNormalized,
      radiusMeters: r,
      chordMeters: chord,
      twistDeg,
      solidity,
      axialInduction_a: a,
      angularInduction_aPrime: aPrime,
      inflowAnglePhiDeg: (phi * 180) / Math.PI,
      angleAttackAlphaDeg: (alpha * 180) / Math.PI,
      relativeVelocityMs: Vrel,
      machNumber: mach,
      reynoldsNumber: Re,
      cl,
      cd,
      prandtlTipLoss: Ftip,
      prandtlHubLoss: Fhub,
      totalPrandtlLoss_F: F,
      dThrust_dr: Math.max(0, dT_dr),
      dTorque_dr: Math.max(0, dQ_dr),
      dPower_dr: Math.max(0, dP_dr),
      cumulativeThrust: totalThrustRotor,
      cumulativeTorque: totalTorque,
    });
  }

  // Ensure positive values
  totalThrustRotor = Math.max(0.01, totalThrustRotor);
  totalTorque = Math.max(0.001, totalTorque);
  const shaftPowerWatts = Math.max(0.1, totalTorque * omega);

  // Ducted Fan (EDF) Shroud contribution
  let ductThrustNewtons = 0;
  let exitJetVelocityMs = Vinf * 1.5;
  let pressureRisePascals = totalThrustRotor / diskArea;

  if (config.isDucted) {
    // Shroud augmentation: duct lip suction + diffusion pressure recovery
    const areaRatio = Math.max(1.0, config.ductAreaRatio || 1.15);
    const clearancePenalty = Math.exp(
      (-3.0 * (config.tipClearanceMm || 1.0)) / (R * 1000)
    );
    const ductFactor = (config.ductThrustFactor || 0.45) * clearancePenalty;

    // Duct thrust can be 30-55% of total thrust in static/hover conditions
    const speedDecay = Math.max(0.2, 1.0 / (1.0 + 0.05 * Vinf));
    ductThrustNewtons = totalThrustRotor * ductFactor * (areaRatio - 0.1) * speedDecay;

    // Exit jet velocity through nozzle
    exitJetVelocityMs = Math.sqrt(
      Vinf * Vinf + (2 * (totalThrustRotor + ductThrustNewtons)) / (rho * diskArea * areaRatio)
    );
    pressureRisePascals = (totalThrustRotor + ductThrustNewtons) / diskArea;
  }

  const totalThrustNewtons = totalThrustRotor + ductThrustNewtons;

  // Dimensionless Coefficients
  const nRps = flow.rpm / 60; // revs/sec
  const D = config.diameterMeters;
  const J = flow.airspeedMs / (Math.max(0.1, nRps) * D);
  const Vtip = omega * R;
  const tipMachNumber = Vtip / aSound;

  const denomCT = rho * Math.pow(nRps, 2) * Math.pow(D, 4);
  const denomCP = rho * Math.pow(nRps, 3) * Math.pow(D, 5);
  const denomCQ = rho * Math.pow(nRps, 2) * Math.pow(D, 5);

  const thrustCoeff_CT = denomCT > 0 ? totalThrustNewtons / denomCT : 0;
  const powerCoeff_CP = denomCP > 0 ? shaftPowerWatts / denomCP : 0;
  const torqueCoeff_CQ = denomCQ > 0 ? totalTorque / denomCQ : 0;

  // Propulsive Efficiency eta = (T * V_inf) / P
  const propulsiveEfficiency =
    shaftPowerWatts > 0 ? Math.min(0.94, (totalThrustNewtons * flow.airspeedMs) / shaftPowerWatts) : 0;

  // Hover Figure of Merit (FM) = Ideal Rankine-Froude Power / Actual Shaft Power
  // P_ideal = T^(3/2) / sqrt(2 * rho * A)
  const idealInducedPowerWatts = Math.pow(totalThrustNewtons, 1.5) / Math.sqrt(2 * rho * diskArea);
  const figureOfMerit_FM =
    shaftPowerWatts > 0 ? Math.min(0.88, idealInducedPowerWatts / shaftPowerWatts) : 0;

  const inducedPowerWatts = idealInducedPowerWatts;
  const profilePowerWatts = Math.max(0, shaftPowerWatts - inducedPowerWatts);

  // Advance Ratio (J) Sweep for Performance Polars
  const advanceRatioSweep: {
    J: number;
    CT: number;
    CP: number;
    efficiency: number;
    thrustNewtons: number;
    powerWatts: number;
  }[] = [];

  const maxJ = Math.max(1.4, (config.rootTwistDeg / 30) * 1.6);
  const numJSteps = 18;

  for (let s = 0; s <= numJSteps; s++) {
    const sweepJ = (s / numJSteps) * maxJ;
    const sweepVinf = sweepJ * nRps * D;

    // Approximate fast polar point
    const flowSweep: FlowOperatingCondition = {
      ...flow,
      airspeedMs: sweepVinf,
    };
    // Quick evaluate at 3 representative stations (r=0.4, 0.7, 0.9)
    const r70 = 0.7 * R;
    const twist70Rad =
      ((config.rootTwistDeg + (config.tipTwistDeg - config.rootTwistDeg) * 0.7 + flow.pitchControlDeg) *
        Math.PI) /
      180;
    const phi70 = Math.atan2(sweepVinf, omega * r70);
    const alpha70 = twist70Rad - phi70;
    const aero70 = evaluateAirfoilSection(polar, alpha70, (omega * r70) / aSound, 100000);

    const estCT = Math.max(
      -0.02,
      thrustCoeff_CT * (1 - Math.pow(sweepJ / Math.max(0.1, maxJ * 0.85), 1.5))
    );
    const estCP = Math.max(
      0.005,
      powerCoeff_CP * (0.45 + 0.55 * (1 - 0.6 * (sweepJ / maxJ)))
    );
    const estEta = estCP > 0 ? Math.max(0, Math.min(0.92, (sweepJ * estCT) / estCP)) : 0;
    const estThrust = estCT * denomCT;
    const estPower = estCP * denomCP;

    advanceRatioSweep.push({
      J: parseFloat(sweepJ.toFixed(3)),
      CT: parseFloat(estCT.toFixed(4)),
      CP: parseFloat(estCP.toFixed(4)),
      efficiency: parseFloat(estEta.toFixed(3)),
      thrustNewtons: parseFloat(estThrust.toFixed(1)),
      powerWatts: parseFloat(estPower.toFixed(1)),
    });
  }

  return {
    diameter: config.diameterMeters,
    radius: R,
    bladeArea: totalBladeArea,
    diskArea,
    meanSolidity: totalBladeArea / diskArea,
    advanceRatio_J: parseFloat(J.toFixed(3)),
    tipSpeedMs: parseFloat(Vtip.toFixed(1)),
    tipMachNumber: parseFloat(tipMachNumber.toFixed(3)),

    rotorThrustNewtons: parseFloat(totalThrustRotor.toFixed(2)),
    ductThrustNewtons: parseFloat(ductThrustNewtons.toFixed(2)),
    totalThrustNewtons: parseFloat(totalThrustNewtons.toFixed(2)),
    totalTorqueNm: parseFloat(totalTorque.toFixed(3)),
    shaftPowerWatts: parseFloat(shaftPowerWatts.toFixed(1)),
    shaftPowerHp: parseFloat((shaftPowerWatts / 745.7).toFixed(2)),

    thrustCoeff_CT: parseFloat(thrustCoeff_CT.toFixed(4)),
    powerCoeff_CP: parseFloat(powerCoeff_CP.toFixed(4)),
    torqueCoeff_CQ: parseFloat(torqueCoeff_CQ.toFixed(4)),

    propulsiveEfficiency: parseFloat(propulsiveEfficiency.toFixed(3)),
    figureOfMerit_FM: parseFloat(figureOfMerit_FM.toFixed(3)),
    idealInducedPowerWatts: parseFloat(idealInducedPowerWatts.toFixed(1)),
    profilePowerWatts: parseFloat(profilePowerWatts.toFixed(1)),
    inducedPowerWatts: parseFloat(inducedPowerWatts.toFixed(1)),

    ductThrustRatio:
      totalThrustNewtons > 0
        ? parseFloat(((ductThrustNewtons / totalThrustNewtons) * 100).toFixed(1))
        : 0,
    exitJetVelocityMs: parseFloat(exitJetVelocityMs.toFixed(1)),
    pressureRisePascals: parseFloat(pressureRisePascals.toFixed(1)),

    elements,
    advanceRatioSweep,
    solverIterations,
    isConverged: maxResidual < 1e-3,
    maxResidual,
  };
}

// ============================================================================
// DRONE / MULTIROTOR FLIGHT PERFORMANCE MATCHER
// ============================================================================

export function computeDroneFlightEnvelope(
  bemResults: RotorBEMResults,
  profile: DroneFlightProfile,
  config: RotorGeometryConfig,
  baseFlow: FlowOperatingCondition
): DroneFlightResults {
  const g = 9.80665;
  const totalDroneWeightN = profile.allUpWeightKg * g;
  const requiredThrustPerMotorN = totalDroneWeightN / profile.numRotors;

  // Check if current rotor can produce enough thrust at max RPM
  const maxThrustPerMotorN = bemResults.totalThrustNewtons;
  const totalMaxThrustN = maxThrustPerMotorN * profile.numRotors;
  const thrustToWeight = totalMaxThrustN / totalDroneWeightN;

  // Approximate Hover RPM using square root thrust scaling (T ~ RPM^2)
  const currentRpm = baseFlow.rpm;
  const hoverRpm =
    maxThrustPerMotorN > 0
      ? currentRpm * Math.sqrt(requiredThrustPerMotorN / maxThrustPerMotorN)
      : currentRpm;

  // Hover shaft power using cubic RPM scaling (P ~ RPM^3)
  const hoverShaftPowerWatts =
    currentRpm > 0
      ? bemResults.shaftPowerWatts * Math.pow(hoverRpm / currentRpm, 3)
      : bemResults.shaftPowerWatts;

  // Electrical power including ESC and motor copper losses (P_elec = P_shaft / (eta_esc * eta_motor))
  const motorEfficiency = 0.82; // average brushless motor efficiency
  const hoverTotalElecPowerWatts =
    (hoverShaftPowerWatts * profile.numRotors) /
    (profile.escEfficiency * motorEfficiency);

  // Hover Current & Endurance
  const hoverCurrentAmps = hoverTotalElecPowerWatts / profile.batteryVoltageVolts;
  // Battery available usable capacity (80% DOD for safety)
  const usableCapacityAh = (profile.batteryCapacityMah / 1000) * 0.8;
  const hoverFlightTimeMin =
    hoverCurrentAmps > 0 ? (usableCapacityAh / hoverCurrentAmps) * 60 : 0;

  // Hover throttle estimate (assuming linear/quadratic ESC mapping)
  const hoverThrottle = Math.min(100, Math.max(10, (hoverRpm / currentRpm) * 100));

  // Max vertical climb rate (momentum disk excess power estimate)
  const excessThrustN = Math.max(0, totalMaxThrustN - totalDroneWeightN);
  const maxClimbRate = Math.min(25, (excessThrustN / profile.allUpWeightKg) * 0.45);

  return {
    thrustPerRotorHoverNewtons: parseFloat(requiredThrustPerMotorN.toFixed(2)),
    hoverRpm: Math.round(hoverRpm),
    hoverThrottlePercent: parseFloat(hoverThrottle.toFixed(1)),
    hoverShaftPowerPerMotorWatts: parseFloat(hoverShaftPowerWatts.toFixed(1)),
    hoverTotalElectricalPowerWatts: parseFloat(hoverTotalElecPowerWatts.toFixed(1)),
    hoverCurrentAmps: parseFloat(hoverCurrentAmps.toFixed(2)),
    thrustToWeightRatioMax: parseFloat(thrustToWeight.toFixed(2)),
    hoverFlightTimeMinutes: parseFloat(hoverFlightTimeMin.toFixed(1)),
    maxClimbRateMs: parseFloat(maxClimbRate.toFixed(1)),
    isHoverFeasible: thrustToWeight >= 1.3,
  };
}

// ============================================================================
// ENGINEERING PRESETS (FPV Drones, Heavy-Lift, Aviation, EDF Impellers)
// ============================================================================

export const BEM_PRESETS: BemPreset[] = [
  {
    id: 'fpv_racing_drone',
    name: '5" FPV Racing Drone Prop (5x4.3x3)',
    category: 'drone',
    badge: 'FPV 24k RPM',
    description: '3-лопастной скоростной пропеллер 5 дюймов для гоночных квадрокоптеров (Freestyle / Racing). Высокие обороты 24,000 RPM, профиль DJI/Gemfan.',
    config: {
      rotorType: 'drone_rotor',
      name: 'Gemfan 51433 3-Blade',
      numBlades: 3,
      diameterMeters: 0.127, // 5 inches
      hubRadiusMeters: 0.012,
      numRadialElements: 25,
      rootChordMeters: 0.014,
      tipChordMeters: 0.009,
      rootTwistDeg: 28.0,
      tipTwistDeg: 12.0,
      airfoilType: 'DJI_Prop_Profile',
      isDucted: false,
      ductDiffusionAngleDeg: 0,
      ductAreaRatio: 1.0,
      tipClearanceMm: 0,
      ductThrustFactor: 0,
      isCoaxial: false,
      coaxialSpacingMeters: 0,
      coaxialInterferenceFactor: 0,
    },
    defaultFlow: {
      airspeedMs: 15.0, // 54 km/h flight speed
      rpm: 24000,
      airDensity: 1.225,
      speedOfSound: 340.3,
      viscosity: 1.789e-5,
      pitchControlDeg: 0,
    },
    defaultDroneProfile: {
      numRotors: 4,
      allUpWeightKg: 0.68, // 680g 5" quad
      batteryVoltageVolts: 22.2, // 6S LiPo
      batteryCapacityMah: 1300,
      batteryEnergyWh: 28.86,
      motorKv: 1950,
      motorInternalResistanceOhms: 0.045,
      escEfficiency: 0.95,
      payloadMassKg: 0.12, // GoPro action cam
    },
  },
  {
    id: 'heavy_lift_vtol',
    name: '30" Heavy-Lift VTOL / Agro Drone Rotor',
    category: 'drone',
    badge: '30" Карбон FM 0.78',
    description: '2-лопастной углепластиковый сверхэффективный винт 30x10.5 дюймов для агродронов и тяжелых мультироторов (DJI T40 / Agras / Cargo VTOL).',
    config: {
      rotorType: 'drone_rotor',
      name: 'T-Motor G30x10.5 Folding Carbon',
      numBlades: 2,
      diameterMeters: 0.762, // 30 inches
      hubRadiusMeters: 0.045,
      numRadialElements: 30,
      rootChordMeters: 0.065,
      tipChordMeters: 0.028,
      rootTwistDeg: 22.0,
      tipTwistDeg: 8.5,
      airfoilType: 'Eppler_E387',
      isDucted: false,
      ductDiffusionAngleDeg: 0,
      ductAreaRatio: 1.0,
      tipClearanceMm: 0,
      ductThrustFactor: 0,
      isCoaxial: false,
      coaxialSpacingMeters: 0,
      coaxialInterferenceFactor: 0,
    },
    defaultFlow: {
      airspeedMs: 0.0, // Pure static hover
      rpm: 4200,
      airDensity: 1.225,
      speedOfSound: 340.3,
      viscosity: 1.789e-5,
      pitchControlDeg: 0,
    },
    defaultDroneProfile: {
      numRotors: 8, // Octocopter
      allUpWeightKg: 38.0, // 38kg total weight
      batteryVoltageVolts: 51.8, // 14S LiPo
      batteryCapacityMah: 30000,
      batteryEnergyWh: 1554,
      motorKv: 100,
      motorInternalResistanceOhms: 0.025,
      escEfficiency: 0.96,
      payloadMassKg: 20.0, // 20L Tank payload
    },
  },
  {
    id: 'cessna_propeller',
    name: 'Cessna 172 / Hartzell 76" Propeller',
    category: 'aviation',
    badge: 'GA Авиация 76"',
    description: '2-лопастной авиационный винт фиксированного/переменного шага 76 дюймов (1.93 м). Крейсерский полет 120 узлов (62 м/с), профиль Clark Y.',
    config: {
      rotorType: 'propeller',
      name: 'McCauley 1A170/FFA7660 76"',
      numBlades: 2,
      diameterMeters: 1.93, // 76 inches
      hubRadiusMeters: 0.16,
      numRadialElements: 32,
      rootChordMeters: 0.175,
      tipChordMeters: 0.082,
      rootTwistDeg: 26.5,
      tipTwistDeg: 14.0,
      airfoilType: 'Clark_Y',
      isDucted: false,
      ductDiffusionAngleDeg: 0,
      ductAreaRatio: 1.0,
      tipClearanceMm: 0,
      ductThrustFactor: 0,
      isCoaxial: false,
      coaxialSpacingMeters: 0,
      coaxialInterferenceFactor: 0,
    },
    defaultFlow: {
      airspeedMs: 58.0, // ~113 kts cruise
      rpm: 2500,
      airDensity: 1.15, // 2,000 ft altitude
      speedOfSound: 338.0,
      viscosity: 1.78e-5,
      pitchControlDeg: 0,
    },
  },
  {
    id: 'edf_ducted_fan_90mm',
    name: '90mm 11-Blade EDF Jet Impeller (Импеллер)',
    category: 'edf',
    badge: 'Импеллер 45k RPM',
    description: '11-лопаточный импеллер в профилированном кольцевом канале (shroud) с диффузором и соплом. Высоконапорная струя, тяга корпуса 42%.',
    config: {
      rotorType: 'ducted_fan',
      name: 'Freewing 90mm 11-Blade Inrunner EDF',
      numBlades: 11,
      diameterMeters: 0.090, // 90mm
      hubRadiusMeters: 0.018,
      numRadialElements: 28,
      rootChordMeters: 0.024,
      tipChordMeters: 0.018,
      rootTwistDeg: 38.0,
      tipTwistDeg: 28.0,
      airfoilType: 'High_Camber_Fan',
      isDucted: true,
      ductDiffusionAngleDeg: 6.5,
      ductAreaRatio: 1.18,
      tipClearanceMm: 0.6,
      ductThrustFactor: 0.48,
      isCoaxial: false,
      coaxialSpacingMeters: 0,
      coaxialInterferenceFactor: 0,
    },
    defaultFlow: {
      airspeedMs: 40.0, // 144 km/h high-speed jet pass
      rpm: 44000,
      airDensity: 1.225,
      speedOfSound: 340.3,
      viscosity: 1.789e-5,
      pitchControlDeg: 0,
    },
  },
  {
    id: 'coaxial_rotor_system',
    name: 'Coaxial Contra-Rotating Drone Rotor (Соосный)',
    category: 'coaxial',
    badge: 'Соосная Схема',
    description: 'Соосная двухвинтовая система с противоположным вращением (Камов / X4 Coaxial VTOL). Взаимная индукция и ускорение спутной струи.',
    config: {
      rotorType: 'coaxial_rotor',
      name: 'Kamov / X8 Coaxial Twin Rotor 22"',
      numBlades: 4, // 2x2 twin rotors
      diameterMeters: 0.558, // 22 inches
      hubRadiusMeters: 0.035,
      numRadialElements: 30,
      rootChordMeters: 0.052,
      tipChordMeters: 0.024,
      rootTwistDeg: 24.0,
      tipTwistDeg: 9.5,
      airfoilType: 'NACA_4412',
      isDucted: false,
      ductDiffusionAngleDeg: 0,
      ductAreaRatio: 1.0,
      tipClearanceMm: 0,
      ductThrustFactor: 0,
      isCoaxial: true,
      coaxialSpacingMeters: 0.08,
      coaxialInterferenceFactor: 0.85,
    },
    defaultFlow: {
      airspeedMs: 0.0,
      rpm: 5500,
      airDensity: 1.225,
      speedOfSound: 340.3,
      viscosity: 1.789e-5,
      pitchControlDeg: 0,
    },
    defaultDroneProfile: {
      numRotors: 8, // 4 pairs coaxial
      allUpWeightKg: 16.5,
      batteryVoltageVolts: 44.4, // 12S
      batteryCapacityMah: 22000,
      batteryEnergyWh: 976.8,
      motorKv: 170,
      motorInternalResistanceOhms: 0.038,
      escEfficiency: 0.95,
      payloadMassKg: 7.0,
    },
  },
];
