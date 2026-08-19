// ============================================================================
// BEM (Blade Element Momentum Theory) Engineering Data Types & Interfaces
// Comprehensive Propeller, Impeller/Ducted Fan, and Drone Rotor Physics System
// ============================================================================

export type RotorType = 'propeller' | 'drone_rotor' | 'ducted_fan' | 'coaxial_rotor';

export interface AirfoilPolar {
  name: string;
  cl0: number;         // Zero-alpha lift coefficient
  clAlpha: number;     // Lift slope (per radian, ~2*pi)
  clMax: number;       // Stall lift coefficient
  alphaStallDeg: number; // Stall angle of attack (degrees)
  cd0: number;         // Minimum profile drag
  cdInducedFactor: number; // Drag increase with lift (k * Cl^2)
  cdStall: number;     // Post-stall drag coefficient
  thicknessRatio: number; // t/c
}

export interface RadialBladeSectionInput {
  rNormalized: number;  // r/R (0 = Hub, 1 = Tip)
  chordMeters: number;  // Local chord c(r)
  twistDeg: number;     // Local geometric pitch/twist theta(r)
  airfoil: AirfoilPolar; // Airfoil at this station
}

export interface RotorGeometryConfig {
  rotorType: RotorType;
  name: string;
  numBlades: number;       // B (e.g. 2, 3, 4, 6, 11)
  diameterMeters: number;  // D = 2*R
  hubRadiusMeters: number; // r_hub
  numRadialElements: number; // Number of radial stations (e.g. 25-50)

  // Parametric distributions (or custom sections)
  rootChordMeters: number;
  tipChordMeters: number;
  rootTwistDeg: number;
  tipTwistDeg: number;
  airfoilType: 'NACA_4412' | 'Clark_Y' | 'NACA_0012' | 'Eppler_E387' | 'DJI_Prop_Profile' | 'High_Camber_Fan';

  // Ducted Fan (EDF) parameters
  isDucted: boolean;
  ductDiffusionAngleDeg: number; // Duct diffuser expansion angle
  ductAreaRatio: number;        // A_exit / A_rotor (e.g. 1.05 - 1.25)
  tipClearanceMm: number;        // Gap between blade tip and shroud
  ductThrustFactor: number;      // Duct surface thrust recovery ratio

  // Coaxial twin-rotor parameters
  isCoaxial: boolean;
  coaxialSpacingMeters: number; // Axial distance between upper and lower rotors
  coaxialInterferenceFactor: number; // Slipstream contraction mixing (0.7 - 0.95)
}

export interface FlowOperatingCondition {
  airspeedMs: number;        // V_inf (Flight speed, 0 for hover/static)
  rpm: number;               // Revolutions per minute
  airDensity: number;        // rho (kg/m^3, default 1.225)
  speedOfSound: number;      // a_sound (m/s, default 340.3)
  viscosity: number;         // mu (Pa*s, default 1.789e-5)
  pitchControlDeg: number;   // Collective pitch bias delta_theta (+/- deg)
}

export interface RadialElementResult {
  rNormalized: number;     // r/R
  radiusMeters: number;    // r (m)
  chordMeters: number;     // c(r)
  twistDeg: number;        // theta(r) + pitchControl
  solidity: number;        // sigma(r) = B*c / (2*pi*r)

  // Local Inflow & Aerodynamics
  axialInduction_a: number;       // a
  angularInduction_aPrime: number; // a'
  inflowAnglePhiDeg: number;      // phi (deg)
  angleAttackAlphaDeg: number;    // alpha = theta - phi (deg)
  relativeVelocityMs: number;     // V_rel (m/s)
  machNumber: number;             // M = V_rel / a_sound
  reynoldsNumber: number;         // Re

  // Aerodynamic Coefficients & Losses
  cl: number;                     // Lift coefficient
  cd: number;                     // Drag coefficient
  prandtlTipLoss: number;         // F_tip
  prandtlHubLoss: number;         // F_hub
  totalPrandtlLoss_F: number;     // F = F_tip * F_hub

  // Elemental Forces & Moments (per unit radius dr)
  dThrust_dr: number;             // dT/dr (N/m)
  dTorque_dr: number;             // dQ/dr (N*m/m)
  dPower_dr: number;              // dP/dr (W/m)

  // Cumulative integration
  cumulativeThrust: number;       // T(r)
  cumulativeTorque: number;       // Q(r)
}

export interface RotorBEMResults {
  // Global Dimensions & Operating Point
  diameter: number;               // D (m)
  radius: number;                 // R (m)
  bladeArea: number;              // Total blade projected area
  diskArea: number;               // Actuator disk area A = pi*R^2
  meanSolidity: number;           // Mean rotor solidity sigma
  advanceRatio_J: number;         // J = V_inf / (n * D)
  tipSpeedMs: number;             // V_tip = Omega * R (m/s)
  tipMachNumber: number;          // M_tip = V_tip / a_sound

  // Primary Forces & Performance
  rotorThrustNewtons: number;     // T_rotor (N)
  ductThrustNewtons: number;      // T_duct (N) (if ducted)
  totalThrustNewtons: number;     // T_total = T_rotor + T_duct (N)
  totalTorqueNm: number;          // Q_total (N*m)
  shaftPowerWatts: number;        // P_shaft = Q * Omega (W)
  shaftPowerHp: number;           // P_shaft in HP (1 HP = 745.7 W)

  // Dimensionless Aero Coefficients (AIAA/NACA Standards)
  thrustCoeff_CT: number;         // CT = T / (rho * n^2 * D^4)
  powerCoeff_CP: number;          // CP = P / (rho * n^3 * D^5)
  torqueCoeff_CQ: number;         // CQ = Q / (rho * n^2 * D^5)

  // Efficiencies
  propulsiveEfficiency: number;   // eta = J * CT / CP = (T * V_inf) / P
  figureOfMerit_FM: number;       // FM = T^(3/2) / (P * sqrt(2*rho*A)) [Hover Efficiency]
  idealInducedPowerWatts: number; // P_ideal = T^(3/2) / sqrt(2*rho*A)
  profilePowerWatts: number;      // P_profile = P_shaft - P_induced
  inducedPowerWatts: number;      // P_induced

  // Ducted Fan Specifics
  ductThrustRatio: number;        // T_duct / T_total (%)
  exitJetVelocityMs: number;      // V_exit (m/s)
  pressureRisePascals: number;    // Delta P across rotor (Pa)

  // Radial Station Array
  elements: RadialElementResult[];

  // Advance Ratio (J) Sweep Data for Performance Polar Curves
  advanceRatioSweep: {
    J: number;
    CT: number;
    CP: number;
    efficiency: number;
    thrustNewtons: number;
    powerWatts: number;
  }[];

  // Convergence Telemetry
  solverIterations: number;
  isConverged: boolean;
  maxResidual: number;
}

export interface DroneFlightProfile {
  numRotors: 4 | 6 | 8;           // Quadcopter, Hexacopter, Octocopter
  allUpWeightKg: number;          // Total drone mass (AUW)
  batteryVoltageVolts: number;    // Battery (e.g. 4S=14.8V, 6S=22.2V, 12S=44.4V)
  batteryCapacityMah: number;     // Battery capacity (mAh)
  batteryEnergyWh: number;        // Capacity * Volts / 1000
  motorKv: number;                // Motor KV rating (RPM/V)
  motorInternalResistanceOhms: number; // Rm
  escEfficiency: number;          // Typically 0.92 - 0.96
  payloadMassKg: number;          // Cargo/Sensor payload
}

export interface DroneFlightResults {
  thrustPerRotorHoverNewtons: number; // Weight * g / numRotors
  hoverRpm: number;                   // RPM needed to hover
  hoverThrottlePercent: number;       // % of max RPM
  hoverShaftPowerPerMotorWatts: number;
  hoverTotalElectricalPowerWatts: number;
  hoverCurrentAmps: number;
  thrustToWeightRatioMax: number;     // Max thrust / AUW
  hoverFlightTimeMinutes: number;     // Endurance (min)
  maxClimbRateMs: number;             // Estimated vertical climb (m/s)
  isHoverFeasible: boolean;           // Can it lift off safely?
}

export interface BemPreset {
  id: string;
  name: string;
  category: 'drone' | 'aviation' | 'edf' | 'coaxial';
  badge: string;
  description: string;
  config: RotorGeometryConfig;
  defaultFlow: FlowOperatingCondition;
  defaultDroneProfile?: DroneFlightProfile;
}
