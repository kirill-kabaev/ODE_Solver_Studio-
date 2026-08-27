import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Wind,
  Layers,
  AlertTriangle,
  Compass,
  Cpu,
  Activity,
  Sliders,
  Sparkles,
  Info,
  Box,
  BookOpen,
  Grid,
  Disc,
  FileText,
  Radio,
  Crosshair,
  Plane,
  Boxes,
  Volume2,
  Rocket,
  Flame,
  Globe,
  ChevronRight,
  Shield,
  Gauge,
  Eye,
  Cable,
  Feather,
  Waves,
  Sun,
  RotateCw,
  Fuel,
  Zap,
  Anchor,
  ShieldCheck,
  Droplets,
  Fan,
  Scan,
  VolumeX,
  Atom,
  Wifi,
  Users,
  Camera,
} from 'lucide-react';
import { VortexLatticeModule } from './VortexLatticeModule';
import { BladeElementMomentumModule } from './bem/BladeElementMomentumModule';
import { UAVDroneStudioModule } from './uav/UAVDroneStudioModule';
import { UAVNavigationEWModule } from './uav/UAVNavigationEWModule';
import { UAVRadioLinkRelayModule } from './uav/UAVRadioLinkRelayModule';
import { UAVGuidanceTrackingModule } from './uav/UAVGuidanceTrackingModule';
import { UAVVTOLTransitionModule } from './uav/UAVVTOLTransitionModule';
import { UAVSwarmFlockingModule } from './uav/UAVSwarmFlockingModule';
import { UAVObstacleAvoidanceModule } from './uav/UAVObstacleAvoidanceModule';
import { UAVAeroacousticsModule } from './uav/UAVAeroacousticsModule';
import { UAVFaultToleranceModule } from './uav/UAVFaultToleranceModule';
import { UAVHybridIcingModule } from './uav/UAVHybridIcingModule';
import { UAVLoiteringDiveModule } from './uav/UAVLoiteringDiveModule';
import { UAVDsmacTercomModule } from './uav/UAVDsmacTercomModule';
import { UAVAutopilotPIDStudio } from './uav/UAVAutopilotPIDStudio';
import { UAVOpticalFlowVIOModule } from './uav/UAVOpticalFlowVIOModule';
import { UAVParachuteBallisticRecoveryModule } from './uav/UAVParachuteBallisticRecoveryModule';
import { UAVElectromagneticSignatureRCSModule } from './uav/UAVElectromagneticSignatureRCSModule';
import { UAVBatteryThermalBMSModule } from './uav/UAVBatteryThermalBMSModule';
import { UAVGimbalVisionTrackingModule } from './uav/UAVGimbalVisionTrackingModule';
import { UAVCatapultPneumaticLauncherModule } from './uav/UAVCatapultPneumaticLauncherModule';
import { UAVAeromagneticLidarSurveyModule } from './uav/UAVAeromagneticLidarSurveyModule';
import { UAVTetheredPowerStationModule } from './uav/UAVTetheredPowerStationModule';
import { UAVSwarmCollisionAvoidanceORCA } from './uav/UAVSwarmCollisionAvoidanceORCA';
import { UAVPerchingBioGripperModule } from './uav/UAVPerchingBioGripperModule';
import { UAVGroundEffectEkranoplanModule } from './uav/UAVGroundEffectEkranoplanModule';
import { UAVSolarHAPSAtmosphericSatelliteModule } from './uav/UAVSolarHAPSAtmosphericSatelliteModule';
import { UAVMorphingWingAeroelasticModule } from './uav/UAVMorphingWingAeroelasticModule';
import { UAVCoaxialTiltrotorDynamicsModule } from './uav/UAVCoaxialTiltrotorDynamicsModule';
import { UAVAerialRefuelingDockingModule } from './uav/UAVAerialRefuelingDockingModule';
import { UAVHypersonicWaveriderModule } from './uav/UAVHypersonicWaveriderModule';
import { UAVMIMOAntiRadiationSeekerModule } from './uav/UAVMIMOAntiRadiationSeekerModule';
import { UAVUnderwaterSubmersibleAmphibiousModule } from './uav/UAVUnderwaterSubmersibleAmphibiousModule';
import { UAVLaserDirectedEnergyDefenseModule } from './uav/UAVLaserDirectedEnergyDefenseModule';
import { UAVFlappingWingOrnithopterModule } from './uav/UAVFlappingWingOrnithopterModule';
import { UAVFreeSpaceOpticalLasercomModule } from './uav/UAVFreeSpaceOpticalLasercomModule';
import { UAVAirLaunchRocketRamjetModule } from './uav/UAVAirLaunchRocketRamjetModule';
import { UAVHighPowerMicrowaveCounterUASModule } from './uav/UAVHighPowerMicrowaveCounterUASModule';
import { UAVL1AdaptiveFlightControlDamageModule } from './uav/UAVL1AdaptiveFlightControlDamageModule';
import { UAVHydrogenCryoFuelCellModule } from './uav/UAVHydrogenCryoFuelCellModule';
import { UAVCoaxialDuctedFanVectoredThrustModule } from './uav/UAVCoaxialDuctedFanVectoredThrustModule';
import { UAVQuantumGravimetricAnomalyNavModule } from './uav/UAVQuantumGravimetricAnomalyNavModule';
import { UAVPlasmaActuatorFlowControlModule } from './uav/UAVPlasmaActuatorFlowControlModule';
import { UAVDynamicSoaringWindGradientModule } from './uav/UAVDynamicSoaringWindGradientModule';
import { UAVWirelessLaserPowerBeamingModule } from './uav/UAVWirelessLaserPowerBeamingModule';
import { UAVMiniatureSARInterferometryModule } from './uav/UAVMiniatureSARInterferometryModule';
import { UAVHybridLaminarFlowSuctionModule } from './uav/UAVHybridLaminarFlowSuctionModule';
import { UAVMagnetohydrodynamicPlasmaModule } from './uav/UAVMagnetohydrodynamicPlasmaModule';
import { UAVAcousticCloakingAntiDetectionModule } from './uav/UAVAcousticCloakingAntiDetectionModule';
import { UAVAIGenerativeConstructorStudio } from './uav/UAVAIGenerativeConstructorStudio';
import { UAVMavlinkTelemetryBusModule } from './uav/UAVMavlinkTelemetryBusModule';
import { UAVBladeFlappingRotorDynamicsModule } from './uav/UAVBladeFlappingRotorDynamicsModule';
import { UAVParametricSparFEABucklingModule } from './uav/UAVParametricSparFEABucklingModule';
import { UAVDeckLandingMotionCompModule } from './uav/UAVDeckLandingMotionCompModule';
import { UAVGuidedGlideBombTrajectoryModule } from './uav/UAVGuidedGlideBombTrajectoryModule';
import { UAVAvionicsEMCAntennaCoSiteModule } from './uav/UAVAvionicsEMCAntennaCoSiteModule';
import { UAVSwarmDistributedTaskAllocationModule } from './uav/UAVSwarmDistributedTaskAllocationModule';
import { UAVToroidalPropellerAeroacousticsModule } from './uav/UAVToroidalPropellerAeroacousticsModule';
import { UAVVisionGeoRegistrationGPSDeniedModule } from './uav/UAVVisionGeoRegistrationGPSDeniedModule';
import { UAVFiberOpticSpoolTetherDynamicsModule } from './uav/UAVFiberOpticSpoolTetherDynamicsModule';
import { UAVVTOLGustAlleviationControlModule } from './uav/UAVVTOLGustAlleviationControlModule';
import { UAVMunitionBaySeparationAeroModule } from './uav/UAVMunitionBaySeparationAeroModule';
import { UAVCADMeshGeneratorDXFModule } from './uav/UAVCADMeshGeneratorDXFModule';
import { UAVHILSILAutopilotStudioModule } from './uav/UAVHILSILAutopilotStudioModule';
import { UAVAIGenerativeDesignAeroModule } from './uav/UAVAIGenerativeDesignAeroModule';
import { UAVAutomatedReportBOMModule } from './uav/UAVAutomatedReportBOMModule';
import { UAVHeavyLifterTetheredHVDCModule } from './uav/UAVHeavyLifterTetheredHVDCModule';
import { UAVTailsitterSlipstreamAeroModule } from './uav/UAVTailsitterSlipstreamAeroModule';
import { UAVStealthRCSCoatingStudioModule } from './uav/UAVStealthRCSCoatingStudioModule';
import { UAVTransMediumAmphibiousSubmersibleModule } from './uav/UAVTransMediumAmphibiousSubmersibleModule';
import { UAVHypersonicScramjetWaveriderStudioModule } from './uav/UAVHypersonicScramjetWaveriderStudioModule';
import { UAVAcousticArrayPassiveDirectionFindingModule } from './uav/UAVAcousticArrayPassiveDirectionFindingModule';
import { UAVDecentralizedSwarmCoSLAMModule } from './uav/UAVDecentralizedSwarmCoSLAMModule';
import { UAVBioInsectFlappingLEVStudioModule } from './uav/UAVBioInsectFlappingLEVStudioModule';
import { UAVUnifiedMasterEngineeringPipelineModule } from './uav/UAVUnifiedMasterEngineeringPipelineModule';
import { UAVScientificPaperGeneratorModule } from './uav/UAVScientificPaperGeneratorModule';
import { UAVVisualDependencyGraphModule } from './UAVVisualDependencyGraphModule';
import { RocketStagingTrajectoryOptimizer } from './space/RocketStagingTrajectoryOptimizer';
import { PDEAcousticWaveStudio } from './physics/PDEAcousticWaveStudio';
import { WingFEAStructuralStudio } from './physics/WingFEAStructuralStudio';
import { BiplaneAn2Module } from './civil/BiplaneAn2Module';
import { CommercialAirlinerModule } from './civil/CommercialAirlinerModule';
import { SupersonicAviationModule } from './supersonic/SupersonicAviationModule';
import { SpaceLaunchAerodynamicsModule } from './space/SpaceLaunchAerodynamicsModule';
import { CFDWindTunnel } from './CFDWindTunnel';
import { PressureDistributionGraph } from './PressureDistributionGraph';
import { FlutterSimulator } from './FlutterSimulator';
import { FlightDynamics6DoF } from './FlightDynamics6DoF';
import { CFDSolverArchitecture } from './CFDSolverArchitecture';
import { SolverStatusMonitor } from './SolverStatusMonitor';
import { Full3DPlotViewer, Aerodynamic3DData } from './Full3DPlotViewer';
import { Interactive3DAeroStudio } from './Interactive3DAeroStudio';
import { AdvancedAeroSolversLab } from './AdvancedAeroSolversLab';
import { AeroReportExportStudio } from './AeroReportExportStudio';
import { EngineeringPresetCatalog, EngineeringPreset, ENGINEERING_PRESETS } from './EngineeringPresetCatalog';
import { UniversalCockpitHUDModal, CockpitSystemDomain } from '../telemetry/UniversalCockpitHUDModal';

// 6 Master Aerodynamic Domains
export type AeroDomainCategory =
  | 'general_aero'
  | 'uav_systems'
  | 'biplane_an2'
  | 'commercial_airliners'
  | 'supersonic_aviation'
  | 'space_launch_reentry';

export type AeroSubTab =
  | 'presets'
  | 'visual_studio'
  | 'uav_studio'
  | 'uav_ew_nav'
  | 'uav_rf_link'
  | 'uav_guidance'
  | 'uav_vtol'
  | 'uav_swarm'
  | 'uav_avoidance'
  | 'uav_acoustics'
  | 'uav_fault_tolerance'
  | 'uav_hybrid_icing'
  | 'uav_loitering_dive'
  | 'uav_dsmac_tercom'
  | 'uav_pid_autopilot'
  | 'uav_optical_flow_vio'
  | 'uav_parachute_recovery'
  | 'uav_stealth_rcs'
  | 'uav_battery_thermal'
  | 'uav_gimbal_vision'
  | 'uav_catapult_launcher'
  | 'uav_lidar_survey'
  | 'uav_tethered_power'
  | 'uav_swarm_orca'
  | 'uav_perching_gripper'
  | 'uav_ekranoplan_wig'
  | 'uav_solar_haps'
  | 'uav_morphing_wing'
  | 'uav_coaxial_tiltrotor'
  | 'uav_refueling_docking'
  | 'uav_hypersonic_waverider'
  | 'uav_anti_radiation_seeker'
  | 'uav_amphibious_submersible'
  | 'uav_laser_defense'
  | 'uav_flapping_ornithopter'
  | 'uav_fso_lasercom'
  | 'uav_air_launch_ramjet'
  | 'uav_hpm_counter_uas'
  | 'uav_l1_adaptive_control'
  | 'uav_hydrogen_cryo_fuelcell'
  | 'uav_ducted_fan_thrust_vector'
  | 'uav_quantum_gravimetric_nav'
  | 'uav_plasma_actuator_flow'
  | 'uav_dynamic_soaring'
  | 'uav_laser_power_beaming'
  | 'uav_miniature_sar'
  | 'uav_hlfc_suction'
  | 'uav_mhd_plasma'
  | 'uav_acoustic_cloaking'
  | 'uav_master_pipeline'
  | 'uav_scientific_paper_generator'
  | 'uav_visual_graph'
  | 'uav_ai_constructor'
  | 'uav_mavlink_bus'
  | 'uav_blade_flapping'
  | 'uav_spar_fea'
  | 'uav_deck_landing'
  | 'uav_glide_bomb'
  | 'uav_emc_antenna'
  | 'uav_swarm_cbba'
  | 'uav_toroidal_aeroacoustics'
  | 'uav_vision_georeg'
  | 'uav_fiber_optic'
  | 'uav_gust_alleviation'
  | 'uav_munition_bay'
  | 'uav_cad_mesh_dxf'
  | 'uav_hil_sil_autopilot'
  | 'uav_ai_generative_design'
  | 'uav_automated_report_bom'
  | 'uav_heavy_lifter_tethered'
  | 'uav_tailsitter_slipstream'
  | 'uav_stealth_rcs_studio'
  | 'uav_trans_medium_amphibious'
  | 'uav_hypersonic_scramjet'
  | 'uav_acoustic_df_array'
  | 'uav_swarm_co_slam'
  | 'uav_bio_insect_lev'
  | 'rocket_staging_optimizer'
  | 'pde_acoustic_wave'
  | 'wing_fea_structural'
  | 'physics_solvers'
  | 'export_report'
  | 'vlm'
  | 'bem'
  | 'status_monitor'
  | 'wind_tunnel'
  | 'flutter'
  | '6dof'
  | 'architecture'
  | 'biplane_an2'
  | 'commercial_airliners'
  | 'supersonic_aviation'
  | 'space_launch_reentry';

export interface DomainCategoryConfig {
  id: AeroDomainCategory;
  numBadge: string;
  title: string;
  shortTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
  accentBorder: string;
  activeBg: string;
  activeRing: string;
  description: string;
  defaultSubTab: AeroSubTab;
}

export const AERO_DOMAINS: DomainCategoryConfig[] = [
  {
    id: 'general_aero',
    numBadge: '1',
    title: 'Общая Аэродинамика',
    shortTitle: 'Общие Принципы',
    icon: Globe,
    tag: '11 Модулей',
    accentBorder: 'border-cyan-500/50',
    activeBg: 'from-cyan-950 via-slate-900 to-blue-950',
    activeRing: 'ring-cyan-400',
    description: 'Фундаментальные уравнения, вихревые решетки (VLM), BEM, CFD-трубы, FSI флаттер и 6-DoF',
    defaultSubTab: 'presets',
  },
  {
    id: 'uav_systems',
    numBadge: '2',
    title: 'БПЛА, Дроны & Рой',
    shortTitle: 'БПЛА & Дроны',
    icon: Radio,
    tag: '48 Систем',
    accentBorder: 'border-teal-500/50',
    activeBg: 'from-teal-950 via-slate-900 to-emerald-950',
    activeRing: 'ring-teal-400',
    description: 'AI Конструктор, целераспределение роя CBBA, тороидальные малошумные винты, оптическая геопривязка без GPS, посадка на качающуюся палубу LQP, баллистика УМПК, ЭМС & развязка антенн S21, MAVLink 2.0 / Micro-XRCE-DDS, маховое движение лопастей, FEA лонжерона, HPM перехват, L1 адаптивное управление, крио-водородные FC, машущее крыло, лазерная FSO связь, ИРПД, HEL защита, амфибии, ПРР, экранопланы, HAPS, морфинг, привязной кабель, ORCA, био-захват, LiDAR, VIO, Stealth, ПСС, BMS, РЭБ, DSMAC/TERCOM, радиолинк, Pro-Nav, VTOL, рой, OctoMap, шум, отказ моторов и пикирование',
    defaultSubTab: 'uav_ai_constructor',
  },
  {
    id: 'biplane_an2',
    numBadge: '3',
    title: '«Кукурузник» (Ан-2 & STOL)',
    shortTitle: 'Кукурузник / Ан-2',
    icon: Plane,
    tag: 'STOL & Сельхоз',
    accentBorder: 'border-amber-500/50',
    activeBg: 'from-amber-950 via-slate-900 to-yellow-950',
    activeRing: 'ring-amber-400',
    description: 'Аэродинамика бипланной коробки Мюнка, предкрылки, бессрывное парашютирование и грунтовые ВПХ',
    defaultSubTab: 'biplane_an2',
  },
  {
    id: 'commercial_airliners',
    numBadge: '4',
    title: 'Магистральные Лайнеры',
    shortTitle: 'Лайнеры & Крейсер',
    icon: Plane,
    tag: 'Трансзвук & ETOPS',
    accentBorder: 'border-sky-500/50',
    activeBg: 'from-sky-950 via-slate-900 to-indigo-950',
    activeRing: 'ring-sky-400',
    description: 'Сверхкритическое крыло, число Маха дивергенции M_div, стреловидность, формула Бреге и ETOPS',
    defaultSubTab: 'commercial_airliners',
  },
  {
    id: 'supersonic_aviation',
    numBadge: '5',
    title: 'Сверхзвуковая Авиация',
    shortTitle: 'Сверхзвук & Mach+',
    icon: Flame,
    tag: 'Mach 1.2 – 6.0+',
    accentBorder: 'border-rose-500/50',
    activeBg: 'from-rose-950 via-slate-900 to-red-950',
    activeRing: 'ring-rose-400',
    description: 'Скачки Рэнкина-Гюгонио, кинетический нагрев, правило площадей Уиткомба и звуковой удар',
    defaultSubTab: 'supersonic_aviation',
  },
  {
    id: 'space_launch_reentry',
    numBadge: '6',
    title: 'Ракеты-Носители & Космос',
    shortTitle: 'Ракеты & Космос',
    icon: Rocket,
    tag: 'Max-Q & Вход',
    accentBorder: 'border-indigo-500/50',
    activeBg: 'from-indigo-950 via-slate-900 to-purple-950',
    activeRing: 'ring-indigo-400',
    description: 'Профиль динамического напора Max-Q, теория затупленного тела Аллена-Эггерса и вход в атмосферу',
    defaultSubTab: 'space_launch_reentry',
  },
];

interface AerodynamicsModuleProps {
  onTabChange?: (tab: AeroSubTab) => void;
  targetCategory?: AeroDomainCategory;
  targetSubTab?: AeroSubTab;
  targetPresetId?: string;
  navigationKey?: number;
}

export const AerodynamicsModule: React.FC<AerodynamicsModuleProps> = ({
  onTabChange,
  targetCategory,
  targetSubTab,
  targetPresetId,
  navigationKey,
}) => {
  const [activeCategory, setActiveCategory] = useState<AeroDomainCategory>('general_aero');
  const [activeGeneralSubTab, setActiveGeneralSubTab] = useState<AeroSubTab>('presets');
  const [activeUAVSubTab, setActiveUAVSubTab] = useState<AeroSubTab>('uav_studio');

  const [selectedPreset, setSelectedPreset] = useState<EngineeringPreset>(ENGINEERING_PRESETS[0]);
  const [activeMach, setActiveMach] = useState<number>(ENGINEERING_PRESETS[0].mach);
  const [activeAlpha, setActiveAlpha] = useState<number>(ENGINEERING_PRESETS[0].alpha);

  // Sync external search navigation commands
  useEffect(() => {
    if (navigationKey === undefined) return;

    if (targetCategory) {
      setActiveCategory(targetCategory);
    }

    if (targetSubTab) {
      const uavSubTabs: AeroSubTab[] = [
        'uav_studio',
        'uav_ew_nav',
        'uav_rf_link',
        'uav_guidance',
        'uav_vtol',
        'uav_swarm',
        'uav_avoidance',
        'uav_acoustics',
        'uav_fault_tolerance',
        'uav_hybrid_icing',
        'uav_loitering_dive',
        'uav_dsmac_tercom',
        'uav_pid_autopilot',
        'uav_optical_flow_vio',
        'uav_parachute_recovery',
        'uav_stealth_rcs',
        'uav_battery_thermal',
        'uav_gimbal_vision',
        'uav_catapult_launcher',
        'uav_lidar_survey',
        'uav_tethered_power',
        'uav_swarm_orca',
        'uav_perching_gripper',
        'uav_ekranoplan_wig',
        'uav_solar_haps',
        'uav_morphing_wing',
        'uav_coaxial_tiltrotor',
        'uav_refueling_docking',
        'uav_hypersonic_waverider',
        'uav_anti_radiation_seeker',
        'uav_amphibious_submersible',
        'uav_laser_defense',
        'uav_flapping_ornithopter',
        'uav_fso_lasercom',
        'uav_air_launch_ramjet',
        'uav_hpm_counter_uas',
        'uav_l1_adaptive_control',
        'uav_hydrogen_cryo_fuelcell',
        'uav_deck_landing',
        'uav_glide_bomb',
        'uav_emc_antenna',
        'uav_swarm_cbba',
        'uav_toroidal_aeroacoustics',
        'uav_vision_georeg',
        'uav_fiber_optic',
        'uav_gust_alleviation',
        'uav_munition_bay',
      ];

      if (uavSubTabs.includes(targetSubTab)) {
        setActiveUAVSubTab(targetSubTab);
        if (!targetCategory) setActiveCategory('uav_systems');
      } else {
        setActiveGeneralSubTab(targetSubTab);
        if (!targetCategory) setActiveCategory('general_aero');
      }
      onTabChange?.(targetSubTab);
    }

    if (targetPresetId) {
      const foundPreset = ENGINEERING_PRESETS.find((p) => p.id === targetPresetId);
      if (foundPreset) {
        setSelectedPreset(foundPreset);
        setActiveMach(foundPreset.mach);
        setActiveAlpha(foundPreset.alpha);
        setLatest3DData({
          mach: foundPreset.mach,
          alpha: foundPreset.alpha,
          liftCoeff: foundPreset.targetCl,
          dragCoeff: foundPreset.targetCd,
          momentCoeff: foundPreset.targetCm,
          cellsCount: foundPreset.meshCells,
          iterations: 60,
          timestamp: 'Пресет применен через глобальный поиск',
          converged: true,
        });
        setActiveGeneralSubTab('status_monitor');
        onTabChange?.('status_monitor');
      }
    }
  }, [navigationKey, targetCategory, targetSubTab, targetPresetId, onTabChange]);

  const [latest3DData, setLatest3DData] = useState<Aerodynamic3DData | null>({
    mach: ENGINEERING_PRESETS[0].mach,
    alpha: ENGINEERING_PRESETS[0].alpha,
    liftCoeff: ENGINEERING_PRESETS[0].targetCl,
    dragCoeff: ENGINEERING_PRESETS[0].targetCd,
    momentCoeff: ENGINEERING_PRESETS[0].targetCm,
    cellsCount: ENGINEERING_PRESETS[0].meshCells,
    iterations: 60,
    timestamp: 'Готово к запуску',
    converged: true,
  });

  const [isCockpitOpen, setIsCockpitOpen] = useState<boolean>(false);
  const [cockpitDomain, setCockpitDomain] = useState<CockpitSystemDomain>('3d_aero_studio');

  // Listen for global fullscreen HUD requests from any graph/animation button
  useEffect(() => {
    const handleOpenCockpit = (e: Event) => {
      const customEvent = e as CustomEvent<{
        domain?: CockpitSystemDomain;
        mach?: number;
        alpha?: number;
      }>;
      if (customEvent.detail?.domain) {
        setCockpitDomain(customEvent.detail.domain);
      }
      if (customEvent.detail?.mach !== undefined) {
        setActiveMach(customEvent.detail.mach);
      }
      if (customEvent.detail?.alpha !== undefined) {
        setActiveAlpha(customEvent.detail.alpha);
      }
      setIsCockpitOpen(true);
    };

    window.addEventListener('open-cockpit-hud', handleOpenCockpit);
    return () => window.removeEventListener('open-cockpit-hud', handleOpenCockpit);
  }, []);

  const handleCategorySelect = (category: AeroDomainCategory) => {
    setActiveCategory(category);
    if (category === 'general_aero') {
      onTabChange?.(activeGeneralSubTab);
    } else if (category === 'uav_systems') {
      onTabChange?.(activeUAVSubTab);
    } else {
      onTabChange?.(category as AeroSubTab);
    }
  };

  const handleGeneralSubTabSelect = (tab: AeroSubTab) => {
    setActiveGeneralSubTab(tab);
    onTabChange?.(tab);
  };

  const handleUAVSubTabSelect = (tab: AeroSubTab) => {
    setActiveUAVSubTab(tab);
    onTabChange?.(tab);
  };

  const handleApplyPreset = useCallback((preset: EngineeringPreset) => {
    setSelectedPreset(preset);
    setActiveMach(preset.mach);
    setActiveAlpha(preset.alpha);
    setLatest3DData({
      mach: preset.mach,
      alpha: preset.alpha,
      liftCoeff: preset.targetCl,
      dragCoeff: preset.targetCd,
      momentCoeff: preset.targetCm,
      cellsCount: preset.meshCells,
      iterations: 60,
      timestamp: 'Пресет применен',
      converged: true,
    });
    // Switch to status monitor
    setActiveGeneralSubTab('status_monitor');
    onTabChange?.('status_monitor');
  }, [onTabChange]);

  const handleSolutionGenerated = useCallback((data: Aerodynamic3DData) => {
    setLatest3DData(data);
  }, []);

  const handleOpenCatalog = useCallback(() => {
    setActiveGeneralSubTab('presets');
    onTabChange?.('presets');
  }, [onTabChange]);

  return (
    <div className="space-y-6 animate-fadeIn font-mono">
      {/* ========================================================================= */}
      {/* LEVEL 1: MASTER CATEGORY SWITCHER (6 PRIMARY DOMAINS)                     */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[11px] font-black uppercase">
              Разделы Аэродинамики
            </span>
            <span className="text-xs text-slate-400">
              Выберите целевой класс летательного аппарата или фундаментальный солвер:
            </span>
          </div>
        </div>

        {/* 6 Grid Cards for Categories */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {AERO_DOMAINS.map((domain) => {
            const IconComponent = domain.icon;
            const isSelected = activeCategory === domain.id;
            return (
              <button
                key={domain.id}
                type="button"
                onClick={() => handleCategorySelect(domain.id)}
                className={`relative p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 overflow-hidden ${
                  isSelected
                    ? `bg-gradient-to-br ${domain.activeBg} ${domain.accentBorder} text-white shadow-xl ring-2 ${domain.activeRing} scale-[1.02]`
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Top Badge & Number */}
                <div className="flex items-center justify-between w-full">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                      isSelected
                        ? 'bg-white text-slate-950 shadow'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {domain.numBadge}
                  </div>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      isSelected
                        ? 'bg-white/20 text-white border border-white/30 backdrop-blur-sm'
                        : 'bg-slate-950/80 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {domain.tag}
                  </span>
                </div>

                {/* Title & Icon */}
                <div className="space-y-1 mt-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <IconComponent className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    <span className="leading-tight">{domain.shortTitle}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed opacity-85">
                    {domain.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LEVEL 2: SECONDARY SUB-TAB NAVIGATION BAR (Category-Specific)             */}
      {/* ========================================================================= */}

      {/* 1. GENERAL AERODYNAMICS SUB-TABS (11 Modules) */}
      {activeCategory === 'general_aero' && (
        <div className="bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-cyan-900/40 flex items-center justify-start gap-1.5 overflow-x-auto shadow-lg">
          <button
            type="button"
            onClick={() => handleGeneralSubTabSelect('presets')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeGeneralSubTab === 'presets'
                ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>★ Каталог Пресетов</span>
          </button>

          <button
            type="button"
            onClick={() => handleGeneralSubTabSelect('visual_studio')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeGeneralSubTab === 'visual_studio'
                ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-slate-950 shadow-md font-black ring-1 ring-cyan-400/50'
                : 'text-cyan-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-cyan-900/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>✦ 3D Визуальная Лаборатория</span>
          </button>

          <button
            type="button"
            onClick={() => handleGeneralSubTabSelect('physics_solvers')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeGeneralSubTab === 'physics_solvers'
                ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 text-slate-950 shadow-md font-black ring-1 ring-cyan-400/50'
                : 'text-indigo-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-indigo-900/50'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>⚡ Солверы (RANS, Euler, Godunov)</span>
          </button>

          <button
            type="button"
            onClick={() => handleGeneralSubTabSelect('vlm')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeGeneralSubTab === 'vlm'
                ? 'bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Grid className="w-3.5 h-3.5 text-cyan-400" />
            <span>3D Метод Вихревой Решетки (VLM)</span>
          </button>

          <button
            type="button"
            onClick={() => handleGeneralSubTabSelect('bem')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeGeneralSubTab === 'bem'
                ? 'bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Disc className="w-3.5 h-3.5 text-cyan-300" />
            <span>BEM: Винты & Импеллеры</span>
          </button>

          <button
            type="button"
            onClick={() => handleGeneralSubTabSelect('status_monitor')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeGeneralSubTab === 'status_monitor'
                ? 'bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Монитор Сил & 3D</span>
          </button>

          <button
            type="button"
            onClick={() => handleGeneralSubTabSelect('wind_tunnel')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeGeneralSubTab === 'wind_tunnel'
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Wind className="w-3.5 h-3.5" />
            <span>Аэродинамическая Труба ($C_p$)</span>
          </button>

          <button
            type="button"
            onClick={() => handleGeneralSubTabSelect('flutter')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeGeneralSubTab === 'flutter'
                ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Флаттер (FSI)</span>
          </button>

          <button
            type="button"
            onClick={() => handleGeneralSubTabSelect('6dof')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeGeneralSubTab === '6dof'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Динамика 6-DoF</span>
          </button>

          <button
            type="button"
            onClick={() => handleGeneralSubTabSelect('architecture')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeGeneralSubTab === 'architecture'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Архитектура Солвера</span>
          </button>

          <button
            type="button"
            onClick={() => handleGeneralSubTabSelect('pde_acoustic_wave')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeGeneralSubTab === 'pde_acoustic_wave'
                ? 'bg-gradient-to-r from-cyan-400 via-teal-500 to-indigo-500 text-slate-950 shadow-md font-black ring-1 ring-cyan-400/50'
                : 'text-cyan-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-cyan-900/50'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>2D Волновой PDE Решатель</span>
          </button>

          <button
            type="button"
            onClick={() => handleGeneralSubTabSelect('rocket_staging_optimizer')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeGeneralSubTab === 'rocket_staging_optimizer'
                ? 'bg-gradient-to-r from-purple-400 via-indigo-500 to-rose-500 text-slate-950 shadow-md font-black ring-1 ring-purple-400/50'
                : 'text-purple-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-purple-900/50'
            }`}
          >
            <Rocket className="w-3.5 h-3.5 text-purple-400" />
            <span>Многоступенчатая Ракетодинамика Δv</span>
          </button>

          <button
            type="button"
            onClick={() => handleGeneralSubTabSelect('wing_fea_structural')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeGeneralSubTab === 'wing_fea_structural'
                ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md font-black ring-1 ring-indigo-400/50'
                : 'text-indigo-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-indigo-900/50'
            }`}
          >
            <Box className="w-3.5 h-3.5 text-indigo-400" />
            <span>1D/2D МКЭ Прочность Лонжерона</span>
          </button>

          <button
            type="button"
            onClick={() => handleGeneralSubTabSelect('export_report')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeGeneralSubTab === 'export_report'
                ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 shadow-md font-black ring-1 ring-emerald-400/50'
                : 'text-emerald-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-emerald-900/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>Экспорт и Отчётность (PDF, LaTeX)</span>
          </button>
        </div>
      )}

      {/* 2. UAV & DRONES SUB-TABS (8 Systems) */}
      {activeCategory === 'uav_systems' && (
        <div className="bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-teal-900/40 flex items-center justify-start gap-1.5 overflow-x-auto shadow-lg">
          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_master_pipeline')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_master_pipeline'
                ? 'bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 text-slate-950 shadow-lg shadow-teal-500/30 ring-2 ring-teal-300'
                : 'text-teal-300 hover:text-white hover:bg-teal-950/60 bg-slate-950/90 border border-teal-500/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-teal-400 animate-pulse" />
            <span>🌟 ЕДИНАЯ САПР БПЛА (Сквозной Цифровой Двойник PLM)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_visual_graph')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_visual_graph'
                ? 'bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 text-slate-950 shadow-lg shadow-teal-500/30 ring-2 ring-teal-300'
                : 'text-teal-300 hover:text-white hover:bg-teal-950/60 bg-slate-950/90 border border-teal-500/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
            <span>🌐 Схема Связей Узлов (D3.js Граф)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_scientific_paper_generator')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_scientific_paper_generator'
                ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-300'
                : 'text-emerald-300 hover:text-white hover:bg-emerald-950/60 bg-slate-950/90 border border-emerald-500/60'
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>📑 ГЕНЕРАТОР НАУЧНЫХ СТАТЕЙ (IEEE, AIAA, ВАК, Scopus Q1)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_ai_constructor')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_ai_constructor'
                ? 'bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 text-slate-950 shadow-lg shadow-teal-500/20 ring-2 ring-teal-300'
                : 'text-teal-300 hover:text-white hover:bg-teal-950/60 bg-slate-950/80 border border-teal-500/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
            <span>✨ AI Конструктор БПЛА (MDO, 3D CAD, ЧПУ & HIL)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_cad_mesh_dxf')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_cad_mesh_dxf'
                ? 'bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-500 text-slate-950 shadow-md font-black ring-1 ring-cyan-400/50'
                : 'text-cyan-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-cyan-900/50'
            }`}
          >
            <Box className="w-3.5 h-3.5 text-cyan-400" />
            <span>📐 [Направление A] CAD/CFD Сетка & DXF Раскрой ЧПУ</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_hil_sil_autopilot')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_hil_sil_autopilot'
                ? 'bg-gradient-to-r from-emerald-400 via-teal-500 to-green-500 text-slate-950 shadow-md font-black ring-1 ring-emerald-400/50'
                : 'text-emerald-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-emerald-900/50'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>📡 [Направление B] HIL/SIL Стенд & MAVLink v2</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_ai_generative_design')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_ai_generative_design'
                ? 'bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500 text-white shadow-md font-black ring-1 ring-indigo-400/50'
                : 'text-indigo-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-indigo-900/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>🤖 [Направление C] AI Оптимизация & PINN Нейро-CFD</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_automated_report_bom')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_automated_report_bom'
                ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-500 text-slate-950 shadow-md font-black ring-1 ring-amber-400/50'
                : 'text-amber-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-amber-900/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>📊 [Направление D] Отчеты Летной Годности & BOM</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_heavy_lifter_tethered')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_heavy_lifter_tethered'
                ? 'bg-gradient-to-r from-sky-400 via-cyan-500 to-blue-600 text-slate-950 shadow-md font-black ring-1 ring-sky-400/50'
                : 'text-sky-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-sky-900/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-sky-400" />
            <span>⚡ [#97] Привязной БПЛА & HVDC 1000V</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_tailsitter_slipstream')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_tailsitter_slipstream'
                ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 text-slate-950 shadow-md font-black ring-1 ring-amber-400/50'
                : 'text-amber-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-amber-900/50'
            }`}
          >
            <Plane className="w-3.5 h-3.5 text-amber-400 rotate-45" />
            <span>📐 [#98] Тейлситтеры VTOL & Обдув Элевонов</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_stealth_rcs_studio')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_stealth_rcs_studio'
                ? 'bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500 text-white shadow-md font-black ring-1 ring-indigo-400/50'
                : 'text-indigo-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-indigo-900/50'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>🛡️ [#99] Стелс-Оптимизация ЭПР & RAM</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_trans_medium_amphibious')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_trans_medium_amphibious'
                ? 'bg-gradient-to-r from-cyan-400 via-teal-500 to-emerald-500 text-slate-950 shadow-md font-black ring-1 ring-cyan-400/50'
                : 'text-cyan-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-cyan-900/50'
            }`}
          >
            <Waves className="w-3.5 h-3.5 text-cyan-400" />
            <span>🌊 [#100] Транссредовые БПЛА-Амфибии</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_hypersonic_scramjet')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_hypersonic_scramjet'
                ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 text-slate-950 shadow-md font-black ring-1 ring-amber-400/50'
                : 'text-amber-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-amber-900/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>🔥 [#101] Гиперзвук ГПВРД & Волнолет</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_acoustic_df_array')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_acoustic_df_array'
                ? 'bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 text-slate-950 shadow-md font-black ring-1 ring-emerald-400/50'
                : 'text-emerald-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-emerald-900/50'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>🎯 [#102] Акустическая Пеленгация TDOA</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_swarm_co_slam')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_swarm_co_slam'
                ? 'bg-gradient-to-r from-sky-400 via-cyan-500 to-blue-600 text-slate-950 shadow-md font-black ring-1 ring-sky-400/50'
                : 'text-sky-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-sky-900/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>🛰️ [#103] Co-SLAM Роя в Зоне РЭБ</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_bio_insect_lev')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_bio_insect_lev'
                ? 'bg-gradient-to-r from-purple-400 via-pink-500 to-rose-500 text-white shadow-md font-black ring-1 ring-purple-400/50'
                : 'text-purple-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-purple-900/50'
            }`}
          >
            <Feather className="w-3.5 h-3.5 text-purple-400" />
            <span>🪲 [#104] Микро-БПЛА & Вихрь LEV</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_studio')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_studio'
                ? 'bg-gradient-to-r from-teal-400 via-cyan-500 to-indigo-600 text-slate-950 shadow-md font-black ring-1 ring-teal-400/50'
                : 'text-teal-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-teal-900/50'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-teal-400" />
            <span>🚁 Студия БПЛА & ВМГ</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_ew_nav')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_ew_nav'
                ? 'bg-gradient-to-r from-teal-400 via-emerald-500 to-cyan-500 text-slate-950 shadow-md font-black ring-1 ring-emerald-400/50'
                : 'text-emerald-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-emerald-900/50'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>🛰️ РЭБ-Навигация & EKF3</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_rf_link')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_rf_link'
                ? 'bg-gradient-to-r from-indigo-400 via-cyan-500 to-teal-400 text-slate-950 shadow-md font-black ring-1 ring-indigo-400/50'
                : 'text-indigo-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-indigo-900/50'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-indigo-400" />
            <span>📡 Радиолиния & Зона Френеля</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_guidance')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_guidance'
                ? 'bg-gradient-to-r from-rose-500 via-red-500 to-amber-500 text-white shadow-md font-black ring-1 ring-rose-400/50'
                : 'text-rose-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-rose-900/50'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5 text-rose-400" />
            <span>🎯 Самонаведение Pro-Nav</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_vtol')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_vtol'
                ? 'bg-gradient-to-r from-indigo-500 via-sky-500 to-teal-400 text-slate-950 shadow-md font-black ring-1 ring-indigo-400/50'
                : 'text-indigo-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-indigo-900/50'
            }`}
          >
            <Plane className="w-3.5 h-3.5 text-indigo-400" />
            <span>🔄 VTOL & Конвертопланы</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_swarm')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_swarm'
                ? 'bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-400 text-slate-950 shadow-md font-black ring-1 ring-teal-400/50'
                : 'text-teal-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-teal-900/50'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-teal-400" />
            <span>👥 Рой & Mesh-Сеть</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_avoidance')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_avoidance'
                ? 'bg-gradient-to-r from-indigo-500 via-sky-500 to-teal-400 text-slate-950 shadow-md font-black ring-1 ring-indigo-400/50'
                : 'text-indigo-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-indigo-900/50'
            }`}
          >
            <Boxes className="w-3.5 h-3.5 text-indigo-400" />
            <span>🧱 3D OctoMap & Огибание</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_acoustics')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_acoustics'
                ? 'bg-gradient-to-r from-rose-500 via-amber-500 to-red-400 text-slate-950 shadow-md font-black ring-1 ring-rose-400/50'
                : 'text-rose-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-rose-900/50'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 text-rose-400" />
            <span>🔊 FW-H Аэроакустика</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_fault_tolerance')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_fault_tolerance'
                ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-slate-950 shadow-md font-black ring-1 ring-amber-400/50'
                : 'text-amber-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-amber-900/50'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>⚠️ Отказ Моторов (FTC / QP)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_hybrid_icing')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_hybrid_icing'
                ? 'bg-gradient-to-r from-teal-400 via-cyan-500 to-indigo-500 text-slate-950 shadow-md font-black ring-1 ring-teal-400/50'
                : 'text-teal-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-teal-900/50'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-teal-400" />
            <span>⚡ Гибридная СУ, Лед & EDF</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_loitering_dive')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_loitering_dive'
                ? 'bg-gradient-to-r from-rose-500 via-amber-500 to-red-500 text-white shadow-md font-black ring-1 ring-rose-400/50'
                : 'text-rose-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-rose-900/50'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5 text-rose-400" />
            <span>🎯 Пикирование & Баллистика (Ланцет)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_pid_autopilot')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_pid_autopilot'
                ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md font-black ring-1 ring-indigo-400/50'
                : 'text-indigo-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-indigo-900/50'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span>🕹️ САУ & PID Автопилот (Боде)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_dsmac_tercom')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_dsmac_tercom'
                ? 'bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 text-slate-950 shadow-md font-black ring-1 ring-emerald-400/50'
                : 'text-emerald-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-emerald-900/50'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>🛰️ DSMAC / TERCOM & Дубинс</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_optical_flow_vio')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_optical_flow_vio'
                ? 'bg-gradient-to-r from-teal-400 via-cyan-500 to-indigo-500 text-slate-950 shadow-md font-black ring-1 ring-teal-400/50'
                : 'text-teal-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-teal-900/50'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5 text-teal-400" />
            <span>👁️ Оптический Поток & VIO / V-SLAM</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_parachute_recovery')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_parachute_recovery'
                ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-slate-950 shadow-md font-black ring-1 ring-amber-400/50'
                : 'text-amber-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-amber-900/50'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>🪂 ПСС & Спасательный Парашют / Airbag</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_stealth_rcs')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_stealth_rcs'
                ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-white shadow-md font-black ring-1 ring-purple-400/50'
                : 'text-purple-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-purple-900/50'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-purple-400" />
            <span>📡 ЭПР & Stealth Малозаметность</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_battery_thermal')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_battery_thermal'
                ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 shadow-md font-black ring-1 ring-emerald-400/50'
                : 'text-emerald-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-emerald-900/50'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            <span>🔋 Тепловая BMS & Зимний Разряд АКБ</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_gimbal_vision')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_gimbal_vision'
                ? 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-500 text-slate-950 shadow-md font-black ring-1 ring-cyan-400/50'
                : 'text-cyan-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-cyan-900/50'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>🎯 ОЭС Гиростаб Подвес & Автосопровождение (KCF/WGS-84)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_catapult_launcher')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_catapult_launcher'
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-slate-950 shadow-md font-black ring-1 ring-amber-400/50'
                : 'text-amber-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-amber-900/50'
            }`}
          >
            <Rocket className="w-3.5 h-3.5 text-amber-400" />
            <span>🚀 Пневмокатапульта & Сеточный Улавливатель (G-Rail)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_lidar_survey')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_lidar_survey'
                ? 'bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 text-slate-950 shadow-md font-black ring-1 ring-teal-400/50'
                : 'text-teal-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-teal-900/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-teal-400" />
            <span>🌐 Воздушный LiDAR & Аэромагниторазведка (RIEGL/Cesium)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_tethered_power')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_tethered_power'
                ? 'bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 text-slate-950 shadow-md font-black ring-1 ring-sky-400/50'
                : 'text-sky-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-sky-900/50'
            }`}
          >
            <Cable className="w-3.5 h-3.5 text-sky-400" />
            <span>⚡ Привязной БПЛА: HVDC Кабель & Провисание (Catenary Sag)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_swarm_orca')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_swarm_orca'
                ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-slate-950 shadow-md font-black ring-1 ring-indigo-400/50'
                : 'text-indigo-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-indigo-900/50'
            }`}
          >
            <Boxes className="w-3.5 h-3.5 text-indigo-400" />
            <span>🐝 Рой БПЛА: ORCA-3D Бесконфликтная Навигация (Velocity Obstacle)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_perching_gripper')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_perching_gripper'
                ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 shadow-md font-black ring-1 ring-emerald-400/50'
                : 'text-emerald-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-emerald-900/50'
            }`}
          >
            <Feather className="w-3.5 h-3.5 text-emerald-400" />
            <span>🦅 Био-Перчинг: Посадка на Ветки/Стены & Микроигольчатый Захват</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_ekranoplan_wig')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_ekranoplan_wig'
                ? 'bg-gradient-to-r from-cyan-500 via-sky-500 to-teal-400 text-slate-950 shadow-md font-black ring-1 ring-cyan-400/50'
                : 'text-cyan-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-cyan-900/50'
            }`}
          >
            <Waves className="w-3.5 h-3.5 text-cyan-400" />
            <span>🌊 Экраноплан & WIG-Эффект (Динамическая Подушка & L/D &gt; 25)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_solar_haps')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_solar_haps'
                ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-400 text-slate-950 shadow-md font-black ring-1 ring-amber-400/50'
                : 'text-amber-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-amber-900/50'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>☀️ Солнечный HAPS: Стратосферный Псевдоспутник (20 км & Суточный Цикл)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_morphing_wing')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_morphing_wing'
                ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-400 text-white shadow-md font-black ring-1 ring-indigo-400/50'
                : 'text-indigo-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-indigo-900/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>📐 Морфинг Крыла, Изменяемая Стреловидность & Флаттер</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_coaxial_tiltrotor')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_coaxial_tiltrotor'
                ? 'bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-400 text-slate-950 shadow-md font-black ring-1 ring-sky-400/50'
                : 'text-sky-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-sky-900/50'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5 text-sky-400" />
            <span>🌀 Соосные Винты, Конвертопланы & Гиропрецессия</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_refueling_docking')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_refueling_docking'
                ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400 text-slate-950 shadow-md font-black ring-1 ring-emerald-400/50'
                : 'text-emerald-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-emerald-900/50'
            }`}
          >
            <Fuel className="w-3.5 h-3.5 text-emerald-400" />
            <span>⛽ Дозаправка в Воздухе (AAR) & Стыковка Штанга-Конус</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_hypersonic_waverider')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_hypersonic_waverider'
                ? 'bg-gradient-to-r from-rose-500 via-amber-500 to-orange-400 text-white shadow-md font-black ring-1 ring-rose-400/50'
                : 'text-rose-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-rose-900/50'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>🔥 Гиперзвуковой Вейврайдер, Scramjet & Тепловые Потоки</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_anti_radiation_seeker')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_anti_radiation_seeker'
                ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-400 text-slate-950 shadow-md font-black ring-1 ring-cyan-400/50'
                : 'text-cyan-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-cyan-900/50'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            <span>🎯 ПРР-ГСН БПЛА (SEAD), Фазовая Интерферометрия & Память РЛС</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_amphibious_submersible')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_amphibious_submersible'
                ? 'bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-400 text-slate-950 shadow-md font-black ring-1 ring-sky-400/50'
                : 'text-sky-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-sky-900/50'
            }`}
          >
            <Waves className="w-3.5 h-3.5 text-sky-400" />
            <span>🌊 Беспилотник-Амфибия, Гидроудар Slamming & Погружение</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_laser_defense')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_laser_defense'
                ? 'bg-gradient-to-r from-rose-500 via-orange-500 to-amber-400 text-white shadow-md font-black ring-1 ring-rose-400/50'
                : 'text-rose-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-rose-900/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-rose-400" />
            <span>⚡ Лазерная Защита БПЛА (HEL / DEW), Абляция & Тепловое Пятно</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_flapping_ornithopter')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_flapping_ornithopter'
                ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400 text-slate-950 shadow-md font-black ring-1 ring-teal-400/50'
                : 'text-teal-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-teal-900/50'
            }`}
          >
            <Feather className="w-3.5 h-3.5 text-teal-400" />
            <span>🪶 Биомиметический Орнитоптер, Машущее Крыло & LEV Вихри</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_fso_lasercom')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_fso_lasercom'
                ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 text-white shadow-md font-black ring-1 ring-cyan-400/50'
                : 'text-cyan-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-cyan-900/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>📡 Оптико-Лазерная FSO Связь БПЛА (100G) & Anti-РЭБ Stealth</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_air_launch_ramjet')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_air_launch_ramjet'
                ? 'bg-gradient-to-r from-orange-500 via-red-500 to-amber-400 text-white shadow-md font-black ring-1 ring-orange-400/50'
                : 'text-orange-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-orange-900/50'
            }`}
          >
            <Rocket className="w-3.5 h-3.5 text-orange-400" />
            <span>🚀 Воздушный Старт & Интегральный Ракетно-Прямоточный ДУ (ИРПД M=4.5)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_hpm_counter_uas')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_hpm_counter_uas'
                ? 'bg-gradient-to-r from-purple-500 via-indigo-500 to-amber-400 text-white shadow-md font-black ring-1 ring-purple-400/50'
                : 'text-purple-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-purple-900/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>⚡ СВЧ/ЭМИ Перехват Роя (HPM Counter-UAS 50-100 МВт)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_l1_adaptive_control')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_l1_adaptive_control'
                ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-green-400 text-slate-950 shadow-md font-black ring-1 ring-emerald-400/50'
                : 'text-emerald-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-emerald-900/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>🛡️ Нейросетевое L₁ Адаптивное Управление & Парирование Повреждений Крыла</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_hydrogen_cryo_fuelcell')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_hydrogen_cryo_fuelcell'
                ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-400 text-white shadow-md font-black ring-1 ring-cyan-400/50'
                : 'text-cyan-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-cyan-900/50'
            }`}
          >
            <Droplets className="w-3.5 h-3.5 text-cyan-400" />
            <span>💧 Криогенная Водородная Энергоустановка (LH₂ PEMFC 120ч)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_ducted_fan_thrust_vector')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_ducted_fan_thrust_vector'
                ? 'bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-400 text-slate-950 shadow-md font-black ring-1 ring-cyan-400/50'
                : 'text-blue-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-blue-900/50'
            }`}
          >
            <Fan className="w-3.5 h-3.5 text-cyan-400" />
            <span>🌀 Соосный Импеллер & Вектор Тяги (Ducted Fan VTOL)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_quantum_gravimetric_nav')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_quantum_gravimetric_nav'
                ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400 text-slate-950 shadow-md font-black ring-1 ring-emerald-400/50'
                : 'text-emerald-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-emerald-900/50'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>🧭 Квантовая Гравиметрическая & Магнитная Навигация (GNSS-Denied)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_plasma_actuator_flow')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_plasma_actuator_flow'
                ? 'bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-400 text-white shadow-md font-black ring-1 ring-purple-400/50'
                : 'text-purple-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-purple-900/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span>⚡ Плазменное Управление Пограничным Слоем (DBD Actuator Stall Delay)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_dynamic_soaring')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_dynamic_soaring'
                ? 'bg-gradient-to-r from-sky-400 via-cyan-500 to-teal-400 text-slate-950 shadow-md font-black ring-1 ring-sky-400/50'
                : 'text-sky-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-sky-900/50'
            }`}
          >
            <Wind className="w-3.5 h-3.5 text-sky-400" />
            <span>🌊 Динамический Парящий Полет БПЛА (Wind Shear Albatross Cycle)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_laser_power_beaming')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_laser_power_beaming'
                ? 'bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-400 text-slate-950 shadow-md font-black ring-1 ring-amber-400/50'
                : 'text-amber-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-amber-900/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>⚡ Лазерная Передача Энергии & Зарядка БПЛА в Полете (GaAs PV)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_miniature_sar')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_miniature_sar'
                ? 'bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-400 text-slate-950 shadow-md font-black ring-1 ring-emerald-400/50'
                : 'text-emerald-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-emerald-900/50'
            }`}
          >
            <Scan className="w-3.5 h-3.5 text-emerald-400" />
            <span>📡 Миниатюрная РЛС с Синтезированной Апертурой (SAR & InSAR)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_hlfc_suction')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_hlfc_suction'
                ? 'bg-gradient-to-r from-teal-400 via-cyan-500 to-sky-400 text-slate-950 shadow-md font-black ring-1 ring-teal-400/50'
                : 'text-teal-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-teal-900/50'
            }`}
          >
            <Wind className="w-3.5 h-3.5 text-teal-400" />
            <span>💨 Гибридное Ламинарное Обтекание Крыла (HLFC Микроотсос Cq)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_mhd_plasma')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_mhd_plasma'
                ? 'bg-gradient-to-r from-purple-400 via-fuchsia-500 to-indigo-400 text-slate-950 shadow-md font-black ring-1 ring-purple-400/50'
                : 'text-purple-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-purple-900/50'
            }`}
          >
            <Atom className="w-3.5 h-3.5 text-purple-400" />
            <span>⚛️ МГД Плазменный Двигатель БПЛА (Lorentz Force F=J×B)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_acoustic_cloaking')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_acoustic_cloaking'
                ? 'bg-gradient-to-r from-emerald-400 via-green-500 to-teal-400 text-slate-950 shadow-md font-black ring-1 ring-emerald-400/50'
                : 'text-emerald-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-emerald-900/50'
            }`}
          >
            <VolumeX className="w-3.5 h-3.5 text-emerald-400" />
            <span>🔇 Акустическая Маскировка & Активное Шумоподавление (ANC Δφ=π)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_mavlink_bus')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_mavlink_bus'
                ? 'bg-gradient-to-r from-teal-400 via-cyan-500 to-indigo-500 text-slate-950 shadow-md font-black ring-1 ring-cyan-400/50'
                : 'text-cyan-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-cyan-900/50'
            }`}
          >
            <Wifi className="w-3.5 h-3.5 text-cyan-400" />
            <span>📶 MAVLink 2.0 / Micro-XRCE-DDS Телеметрия & QoS</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_blade_flapping')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_blade_flapping'
                ? 'bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 text-slate-950 shadow-md font-black ring-1 ring-emerald-400/50'
                : 'text-emerald-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-emerald-900/50'
            }`}
          >
            <Wind className="w-3.5 h-3.5 text-emerald-400" />
            <span>🔄 Маховое Движение Лопастей & Обдув Лучей Рамы</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_spar_fea')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_spar_fea'
                ? 'bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500 text-slate-950 shadow-md font-black ring-1 ring-purple-400/50'
                : 'text-purple-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-purple-900/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>📐 Параметрический FEA Лонжерона & Устойчивость Обшивки</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_deck_landing')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_deck_landing'
                ? 'bg-gradient-to-r from-cyan-400 via-teal-500 to-emerald-500 text-slate-950 shadow-md font-black ring-1 ring-cyan-400/50'
                : 'text-cyan-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-cyan-900/50'
            }`}
          >
            <Anchor className="w-3.5 h-3.5 text-cyan-400" />
            <span>⚓ Посадка на Палубу в Качку (LQP Wave Motion Predictor)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_glide_bomb')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_glide_bomb'
                ? 'bg-gradient-to-r from-amber-400 via-rose-500 to-red-500 text-slate-950 shadow-md font-black ring-1 ring-amber-400/50'
                : 'text-amber-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-amber-900/50'
            }`}
          >
            <Rocket className="w-3.5 h-3.5 text-amber-400" />
            <span>🎯 Аэробаллистика Планирующих Модулей УМПК (K=15, 75 км)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_emc_antenna')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_emc_antenna'
                ? 'bg-gradient-to-r from-violet-400 via-indigo-500 to-purple-500 text-slate-950 shadow-md font-black ring-1 ring-indigo-400/50'
                : 'text-indigo-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-indigo-900/50'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-indigo-400" />
            <span>📡 ЭМС Авионики & Взаимная Развязка Антенн (S21, GNSS L1/L2)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_swarm_cbba')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_swarm_cbba'
                ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 text-slate-950 shadow-md font-black ring-1 ring-cyan-400/50'
                : 'text-cyan-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-cyan-900/50'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>👥 Целераспределение Роя CBBA & Mesh Консенсус</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_toroidal_aeroacoustics')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_toroidal_aeroacoustics'
                ? 'bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 text-slate-950 shadow-md font-black ring-1 ring-teal-400/50'
                : 'text-teal-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-teal-900/50'
            }`}
          >
            <VolumeX className="w-3.5 h-3.5 text-teal-400" />
            <span>🔇 Тороидальные Кольцевые Пропеллеры & Аэроакустика BPM</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_vision_georeg')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_vision_georeg'
                ? 'bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 text-slate-950 shadow-md font-black ring-1 ring-amber-400/50'
                : 'text-amber-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-amber-900/50'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span>👁️ Оптическая Геопривязка Без GPS (SuperGlue Ortho)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_fiber_optic')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_fiber_optic'
                ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 text-slate-950 shadow-md font-black ring-1 ring-cyan-400/50'
                : 'text-cyan-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-cyan-900/50'
            }`}
          >
            <Cable className="w-3.5 h-3.5 text-cyan-400" />
            <span>🧵 FPV БПЛА на Оптоволокне (Катушка 10-20 км, РЭБ 0%)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_gust_alleviation')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_gust_alleviation'
                ? 'bg-gradient-to-r from-sky-400 via-teal-500 to-emerald-500 text-slate-950 shadow-md font-black ring-1 ring-sky-400/50'
                : 'text-sky-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-sky-900/50'
            }`}
          >
            <Wind className="w-3.5 h-3.5 text-sky-400" />
            <span>💨 Активное Гашение Порывов Ветра (GLAS & LIDAR Lookahead)</span>
          </button>

          <button
            type="button"
            onClick={() => handleUAVSubTabSelect('uav_munition_bay')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeUAVSubTab === 'uav_munition_bay'
                ? 'bg-gradient-to-r from-rose-400 via-amber-500 to-yellow-500 text-slate-950 shadow-md font-black ring-1 ring-rose-400/50'
                : 'text-rose-300 hover:text-white hover:bg-slate-800 bg-slate-950/60 border border-rose-900/50'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5 text-rose-400" />
            <span>🎯 Бомбоотсек & Аэродинамика Сброса (Rossiter Cavity)</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEVEL 3: ACTIVE COMPONENT VIEWPORT                                        */}
      {/* ========================================================================= */}

      {/* 1. GENERAL AERODYNAMICS VIEWS */}
      {activeCategory === 'general_aero' && (
        <>
          {activeGeneralSubTab === 'presets' && (
            <EngineeringPresetCatalog
              onApplyPreset={handleApplyPreset}
              activePresetId={selectedPreset.id}
            />
          )}

          {activeGeneralSubTab === 'visual_studio' && (
            <Interactive3DAeroStudio
              initialMach={activeMach}
              initialAlpha={activeAlpha}
            />
          )}

          {activeGeneralSubTab === 'physics_solvers' && (
            <AdvancedAeroSolversLab />
          )}

          {activeGeneralSubTab === 'pde_acoustic_wave' && (
            <PDEAcousticWaveStudio />
          )}

          {activeGeneralSubTab === 'rocket_staging_optimizer' && (
            <RocketStagingTrajectoryOptimizer />
          )}

          {activeGeneralSubTab === 'wing_fea_structural' && (
            <WingFEAStructuralStudio />
          )}

          {activeGeneralSubTab === 'export_report' && (
            <AeroReportExportStudio />
          )}

          {activeGeneralSubTab === 'vlm' && (
            <VortexLatticeModule />
          )}

          {activeGeneralSubTab === 'bem' && (
            <BladeElementMomentumModule />
          )}

          {activeGeneralSubTab === 'status_monitor' && (
            <div className="space-y-6">
              <SolverStatusMonitor
                defaultMach={activeMach}
                defaultAlpha={activeAlpha}
                presetName={selectedPreset.name}
                onOpenCatalog={handleOpenCatalog}
                onSolutionGenerated={handleSolutionGenerated}
              />
              <Full3DPlotViewer data={latest3DData} />
            </div>
          )}

          {activeGeneralSubTab === 'wind_tunnel' && (
            <div className="space-y-6">
              <CFDWindTunnel />
              <PressureDistributionGraph />
            </div>
          )}

          {activeGeneralSubTab === 'flutter' && (
            <div className="space-y-6">
              <FlutterSimulator />
            </div>
          )}

          {activeGeneralSubTab === '6dof' && (
            <div className="space-y-6">
              <FlightDynamics6DoF />
            </div>
          )}

          {activeGeneralSubTab === 'architecture' && (
            <div className="space-y-6">
              <CFDSolverArchitecture />
            </div>
          )}
        </>
      )}

      {/* 2. UAV & DRONES VIEWS */}
      {activeCategory === 'uav_systems' && (
        <>
          {activeUAVSubTab === 'uav_master_pipeline' && (
            <UAVUnifiedMasterEngineeringPipelineModule
              onNavigateToModule={(modId) => handleUAVSubTabSelect(modId as any)}
            />
          )}
          {activeUAVSubTab === 'uav_visual_graph' && <UAVVisualDependencyGraphModule />}
          {activeUAVSubTab === 'uav_scientific_paper_generator' && <UAVScientificPaperGeneratorModule />}
          {activeUAVSubTab === 'uav_ai_constructor' && <UAVAIGenerativeConstructorStudio />}
          {activeUAVSubTab === 'uav_cad_mesh_dxf' && <UAVCADMeshGeneratorDXFModule />}
          {activeUAVSubTab === 'uav_hil_sil_autopilot' && <UAVHILSILAutopilotStudioModule />}
          {activeUAVSubTab === 'uav_ai_generative_design' && <UAVAIGenerativeDesignAeroModule />}
          {activeUAVSubTab === 'uav_automated_report_bom' && <UAVAutomatedReportBOMModule />}
          {activeUAVSubTab === 'uav_heavy_lifter_tethered' && <UAVHeavyLifterTetheredHVDCModule />}
          {activeUAVSubTab === 'uav_tailsitter_slipstream' && <UAVTailsitterSlipstreamAeroModule />}
          {activeUAVSubTab === 'uav_stealth_rcs_studio' && <UAVStealthRCSCoatingStudioModule />}
          {activeUAVSubTab === 'uav_trans_medium_amphibious' && <UAVTransMediumAmphibiousSubmersibleModule />}
          {activeUAVSubTab === 'uav_hypersonic_scramjet' && <UAVHypersonicScramjetWaveriderStudioModule />}
          {activeUAVSubTab === 'uav_acoustic_df_array' && <UAVAcousticArrayPassiveDirectionFindingModule />}
          {activeUAVSubTab === 'uav_swarm_co_slam' && <UAVDecentralizedSwarmCoSLAMModule />}
          {activeUAVSubTab === 'uav_bio_insect_lev' && <UAVBioInsectFlappingLEVStudioModule />}
          {activeUAVSubTab === 'uav_studio' && <UAVDroneStudioModule />}
          {activeUAVSubTab === 'uav_ew_nav' && <UAVNavigationEWModule />}
          {activeUAVSubTab === 'uav_rf_link' && <UAVRadioLinkRelayModule />}
          {activeUAVSubTab === 'uav_guidance' && <UAVGuidanceTrackingModule />}
          {activeUAVSubTab === 'uav_vtol' && <UAVVTOLTransitionModule />}
          {activeUAVSubTab === 'uav_swarm' && <UAVSwarmFlockingModule />}
          {activeUAVSubTab === 'uav_avoidance' && <UAVObstacleAvoidanceModule />}
          {activeUAVSubTab === 'uav_acoustics' && <UAVAeroacousticsModule />}
          {activeUAVSubTab === 'uav_fault_tolerance' && <UAVFaultToleranceModule />}
          {activeUAVSubTab === 'uav_hybrid_icing' && <UAVHybridIcingModule />}
          {activeUAVSubTab === 'uav_loitering_dive' && <UAVLoiteringDiveModule />}
          {activeUAVSubTab === 'uav_dsmac_tercom' && <UAVDsmacTercomModule />}
          {activeUAVSubTab === 'uav_pid_autopilot' && <UAVAutopilotPIDStudio />}
          {activeUAVSubTab === 'uav_optical_flow_vio' && <UAVOpticalFlowVIOModule />}
          {activeUAVSubTab === 'uav_parachute_recovery' && <UAVParachuteBallisticRecoveryModule />}
          {activeUAVSubTab === 'uav_stealth_rcs' && <UAVElectromagneticSignatureRCSModule />}
          {activeUAVSubTab === 'uav_battery_thermal' && <UAVBatteryThermalBMSModule />}
          {activeUAVSubTab === 'uav_gimbal_vision' && <UAVGimbalVisionTrackingModule />}
          {activeUAVSubTab === 'uav_catapult_launcher' && <UAVCatapultPneumaticLauncherModule />}
          {activeUAVSubTab === 'uav_lidar_survey' && <UAVAeromagneticLidarSurveyModule />}
          {activeUAVSubTab === 'uav_tethered_power' && <UAVTetheredPowerStationModule />}
          {activeUAVSubTab === 'uav_swarm_orca' && <UAVSwarmCollisionAvoidanceORCA />}
          {activeUAVSubTab === 'uav_perching_gripper' && <UAVPerchingBioGripperModule />}
          {activeUAVSubTab === 'uav_ekranoplan_wig' && <UAVGroundEffectEkranoplanModule />}
          {activeUAVSubTab === 'uav_solar_haps' && <UAVSolarHAPSAtmosphericSatelliteModule />}
          {activeUAVSubTab === 'uav_morphing_wing' && <UAVMorphingWingAeroelasticModule />}
          {activeUAVSubTab === 'uav_coaxial_tiltrotor' && <UAVCoaxialTiltrotorDynamicsModule />}
          {activeUAVSubTab === 'uav_refueling_docking' && <UAVAerialRefuelingDockingModule />}
          {activeUAVSubTab === 'uav_hypersonic_waverider' && <UAVHypersonicWaveriderModule />}
          {activeUAVSubTab === 'uav_anti_radiation_seeker' && <UAVMIMOAntiRadiationSeekerModule />}
          {activeUAVSubTab === 'uav_amphibious_submersible' && <UAVUnderwaterSubmersibleAmphibiousModule />}
          {activeUAVSubTab === 'uav_laser_defense' && <UAVLaserDirectedEnergyDefenseModule />}
          {activeUAVSubTab === 'uav_flapping_ornithopter' && <UAVFlappingWingOrnithopterModule />}
          {activeUAVSubTab === 'uav_fso_lasercom' && <UAVFreeSpaceOpticalLasercomModule />}
          {activeUAVSubTab === 'uav_air_launch_ramjet' && <UAVAirLaunchRocketRamjetModule />}
          {activeUAVSubTab === 'uav_hpm_counter_uas' && <UAVHighPowerMicrowaveCounterUASModule />}
          {activeUAVSubTab === 'uav_l1_adaptive_control' && <UAVL1AdaptiveFlightControlDamageModule />}
          {activeUAVSubTab === 'uav_hydrogen_cryo_fuelcell' && <UAVHydrogenCryoFuelCellModule />}
          {activeUAVSubTab === 'uav_ducted_fan_thrust_vector' && <UAVCoaxialDuctedFanVectoredThrustModule />}
          {activeUAVSubTab === 'uav_quantum_gravimetric_nav' && <UAVQuantumGravimetricAnomalyNavModule />}
          {activeUAVSubTab === 'uav_plasma_actuator_flow' && <UAVPlasmaActuatorFlowControlModule />}
          {activeUAVSubTab === 'uav_dynamic_soaring' && <UAVDynamicSoaringWindGradientModule />}
          {activeUAVSubTab === 'uav_laser_power_beaming' && <UAVWirelessLaserPowerBeamingModule />}
          {activeUAVSubTab === 'uav_miniature_sar' && <UAVMiniatureSARInterferometryModule />}
          {activeUAVSubTab === 'uav_hlfc_suction' && <UAVHybridLaminarFlowSuctionModule />}
          {activeUAVSubTab === 'uav_mhd_plasma' && <UAVMagnetohydrodynamicPlasmaModule />}
          {activeUAVSubTab === 'uav_acoustic_cloaking' && <UAVAcousticCloakingAntiDetectionModule />}
          {activeUAVSubTab === 'uav_mavlink_bus' && <UAVMavlinkTelemetryBusModule />}
          {activeUAVSubTab === 'uav_blade_flapping' && <UAVBladeFlappingRotorDynamicsModule />}
          {activeUAVSubTab === 'uav_spar_fea' && <UAVParametricSparFEABucklingModule />}
          {activeUAVSubTab === 'uav_deck_landing' && <UAVDeckLandingMotionCompModule />}
          {activeUAVSubTab === 'uav_glide_bomb' && <UAVGuidedGlideBombTrajectoryModule />}
          {activeUAVSubTab === 'uav_emc_antenna' && <UAVAvionicsEMCAntennaCoSiteModule />}
          {activeUAVSubTab === 'uav_swarm_cbba' && <UAVSwarmDistributedTaskAllocationModule />}
          {activeUAVSubTab === 'uav_toroidal_aeroacoustics' && <UAVToroidalPropellerAeroacousticsModule />}
          {activeUAVSubTab === 'uav_vision_georeg' && <UAVVisionGeoRegistrationGPSDeniedModule />}
          {activeUAVSubTab === 'uav_fiber_optic' && <UAVFiberOpticSpoolTetherDynamicsModule />}
          {activeUAVSubTab === 'uav_gust_alleviation' && <UAVVTOLGustAlleviationControlModule />}
          {activeUAVSubTab === 'uav_munition_bay' && <UAVMunitionBaySeparationAeroModule />}
        </>
      )}

      {/* 3. BIPLANE AN-2 / CROP DUSTER & STOL VIEW */}
      {activeCategory === 'biplane_an2' && <BiplaneAn2Module />}

      {/* 4. COMMERCIAL AIRLINERS & TRANSONIC CRUISE VIEW */}
      {activeCategory === 'commercial_airliners' && <CommercialAirlinerModule />}

      {/* 5. SUPERSONIC & HYPERSONIC AVIATION VIEW */}
      {activeCategory === 'supersonic_aviation' && <SupersonicAviationModule />}

      {/* 6. SPACE LAUNCH VEHICLES & RE-ENTRY VIEW */}
      {activeCategory === 'space_launch_reentry' && <SpaceLaunchAerodynamicsModule />}

      {/* Universal Fullscreen Telemetry & Joystick Cockpit */}
      <UniversalCockpitHUDModal
        isOpen={isCockpitOpen}
        onClose={() => setIsCockpitOpen(false)}
        initialDomain={cockpitDomain}
        initialMach={activeMach}
        initialAlpha={activeAlpha}
      />
    </div>
  );
};
