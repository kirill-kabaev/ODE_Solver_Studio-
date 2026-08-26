import React, { useState } from 'react';
import { Wind, Layers, Info, CheckCircle2, ChevronRight, Activity } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export interface AirfoilSpec {
  id: string;
  name: string;
  category: 'flying_wing' | 'high_lift' | 'general' | 'symmetrical' | 'laminar_glider';
  thicknessRatio_pct: number;
  camber_pct: number;
  cl_max: number;
  alpha_stall_deg: number;
  cm0: number;
  cd0: number;
  best_ld_alpha_deg: number;
  description: string;
  applications: string;
}

export const UAV_AIRFOIL_LIBRARY: AirfoilSpec[] = [
  {
    id: 'mh60',
    name: 'MH 60 (Martin Hepperle Reflexed)',
    category: 'flying_wing',
    thicknessRatio_pct: 10.08,
    camber_pct: 1.68,
    cl_max: 1.22,
    alpha_stall_deg: 13.5,
    cm0: 0.012, // slightly positive for tailless flying wing pitch stability
    cd0: 0.0078,
    best_ld_alpha_deg: 4.5,
    description: 'S-образный (самобалансирующийся) профиль с положительным $C_{m0} > 0$. Идеален для бесхвосток и «летающих крыльев» без горизонтального оперения.',
    applications: 'Дальние БПЛА-разведчики схемы «Летающее крыло», крылья ZOHD/Skywalker.',
  },
  {
    id: 'clark_y',
    name: 'Clark-Y (Classic Flat Bottom)',
    category: 'general',
    thicknessRatio_pct: 11.72,
    camber_pct: 3.43,
    cl_max: 1.45,
    alpha_stall_deg: 14.0,
    cm0: -0.085,
    cd0: 0.0084,
    best_ld_alpha_deg: 5.0,
    description: 'Классический плоский снизу профиль с мягким характером сваливания, высокой технологичностью в производстве из пенополистирола и бальзы.',
    applications: 'Учебные дроны, сельскохозяйственные БПЛА, среднеразмерные платформы.',
  },
  {
    id: 'selig_s1223',
    name: 'Selig S1223 (Ultra High Lift)',
    category: 'high_lift',
    thicknessRatio_pct: 12.14,
    camber_pct: 8.12,
    cl_max: 2.15,
    alpha_stall_deg: 11.5,
    cm0: -0.225,
    cd0: 0.0165,
    best_ld_alpha_deg: 6.0,
    description: 'Рекордно высокий коэффициент подъемной силы ($C_{L_{max}} > 2.1$) на малых числах Рейнольдса. Минимизирует взлетную дистанцию и площадь крыла.',
    applications: 'Тяжелые VTOL-бомберы, БПЛА короткого взлета и посадки (STOL).',
  },
  {
    id: 'naca_0009',
    name: 'NACA 0009 (Symmetrical High-Speed)',
    category: 'symmetrical',
    thicknessRatio_pct: 9.0,
    camber_pct: 0.0,
    cl_max: 1.05,
    alpha_stall_deg: 12.0,
    cm0: 0.0,
    cd0: 0.0062,
    best_ld_alpha_deg: 3.5,
    description: 'Симметричный профиль нулевой кривизны. Нулевой момент тангажа $C_{m0}=0$, одинаковое обтекание при прямом и перевернутом полете.',
    applications: 'Х-образные барражирующие боеприпасы («Ланцет»), рули высоты, кили.',
  },
  {
    id: 'naca_4412',
    name: 'NACA 4412 (Cambered Universal)',
    category: 'general',
    thicknessRatio_pct: 12.0,
    camber_pct: 4.0,
    cl_max: 1.55,
    alpha_stall_deg: 15.0,
    cm0: -0.092,
    cd0: 0.0082,
    best_ld_alpha_deg: 4.8,
    description: 'Один из самых надежных универсальных профилей NACA 4-й серии с высоким аэродинамическим качеством в широком диапазоне углов атаки.',
    applications: 'Коммерческие картографические дроны, гибридные QuadPlane.',
  },
  {
    id: 'wortmann_fx63',
    name: 'Wortmann FX 63-137 (High Aspect Ratio)',
    category: 'laminar_glider',
    thicknessRatio_pct: 13.7,
    camber_pct: 5.8,
    cl_max: 1.72,
    alpha_stall_deg: 14.5,
    cm0: -0.145,
    cd0: 0.0075,
    best_ld_alpha_deg: 5.5,
    description: 'Ламинарный планерный профиль Франца Вортмана с экстремальным аэродинамическим качеством ($L/D > 35$) на малых скоростях.',
    applications: 'Солнечные псевдоспутники HAPS, высотные дроны-ретрансляторы.',
  },
];

interface Props {
  selectedAirfoilId: string;
  onSelectAirfoil: (airfoil: AirfoilSpec) => void;
}

export const UAVAirfoilPolarDatabase: React.FC<Props> = ({
  selectedAirfoilId,
  onSelectAirfoil,
}) => {
  const currentAirfoil =
    UAV_AIRFOIL_LIBRARY.find((a) => a.id === selectedAirfoilId) || UAV_AIRFOIL_LIBRARY[0];

  // Generate synthetic polar curves for the selected airfoil
  const polarData = React.useMemo(() => {
    const data = [];
    const cl0 = (currentAirfoil.camber_pct / 100) * 12.0;
    const cl_alpha = 0.105; // per deg
    const stall_alpha = currentAirfoil.alpha_stall_deg;

    for (let alpha = -4; alpha <= 18; alpha += 1) {
      let cl = 0;
      if (alpha <= stall_alpha) {
        cl = cl0 + cl_alpha * alpha;
      } else {
        // stall drop
        const postStallDrop = Math.pow(alpha - stall_alpha, 1.4) * 0.08;
        cl = currentAirfoil.cl_max - postStallDrop;
      }
      cl = Math.min(currentAirfoil.cl_max, cl);

      // Cd = cd0 + k*(cl - cl_min_drag)^2
      const cd = currentAirfoil.cd0 + 0.018 * Math.pow(cl - 0.25, 2) + (alpha > stall_alpha ? 0.05 * (alpha - stall_alpha) : 0);
      const ld = cl / Math.max(0.001, cd);

      data.push({
        alpha,
        CL: Number(cl.toFixed(3)),
        CD: Number(cd.toFixed(4)),
        LD: Number(Math.max(0, ld).toFixed(1)),
      });
    }
    return data;
  }, [currentAirfoil]);

  // Airfoil geometric shape preview points (normalized x=0..1, y)
  const airfoilPoints = React.useMemo(() => {
    const points: { x: number; yTop: number; yBottom: number }[] = [];
    const t = currentAirfoil.thicknessRatio_pct / 100;
    const m = currentAirfoil.camber_pct / 100;
    const p = 0.4; // max camber position

    for (let i = 0; i <= 30; i++) {
      const x = i / 30;
      // NACA 4-digit thickness equation
      const yt =
        5 *
        t *
        (0.2969 * Math.sqrt(x) -
          0.126 * x -
          0.3516 * Math.pow(x, 2) +
          0.2843 * Math.pow(x, 3) -
          0.1015 * Math.pow(x, 4));

      // Camber line
      let yc = 0;
      if (x < p) {
        yc = (m / Math.pow(p, 2)) * (2 * p * x - Math.pow(x, 2));
      } else {
        yc = (m / Math.pow(1 - p, 2)) * (1 - 2 * p + 2 * p * x - Math.pow(x, 2));
      }

      // If reflexed, add slight upturn at trailing edge
      if (currentAirfoil.cm0 > 0 && x > 0.7) {
        yc += 0.02 * Math.pow((x - 0.7) / 0.3, 2);
      }

      points.push({
        x: Number(x.toFixed(3)),
        yTop: Number((yc + yt).toFixed(4)),
        yBottom: Number((yc - yt).toFixed(4)),
      });
    }
    return points;
  }, [currentAirfoil]);

  return (
    <div className="p-4 rounded-2xl bg-slate-900/90 border border-sky-500/40 space-y-4 text-xs font-mono">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <Wind className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-black text-white text-sm">
              Аэродинамическая База Профилей Крыла & XFOIL/Поляры
            </h4>
            <p className="text-[11px] text-slate-400 font-sans">
              Выбор профиля с точными аэродинамическими характеристиками C_L_max, C_m0, α_stall
            </p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-500/40">
          Выбран: {currentAirfoil.name}
        </span>
      </div>

      {/* Airfoil Grid Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {UAV_AIRFOIL_LIBRARY.map((airfoil) => {
          const isSelected = airfoil.id === currentAirfoil.id;
          return (
            <button
              key={airfoil.id}
              type="button"
              onClick={() => onSelectAirfoil(airfoil)}
              className={`p-3 rounded-xl text-left transition-all border cursor-pointer ${
                isSelected
                  ? 'bg-sky-950/70 border-sky-400 text-white shadow-lg ring-1 ring-sky-400/50'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white text-xs truncate">{airfoil.name}</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-sky-300">
                  {airfoil.thicknessRatio_pct}% t/c
                </span>
              </div>
              <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                {airfoil.description}
              </p>
              <div className="flex items-center justify-between text-[10px] text-sky-400/90 mt-2 font-mono border-t border-slate-800/80 pt-1">
                <span>C_L(max) = {airfoil.cl_max}</span>
                <span>C_m0 = {airfoil.cm0}</span>
                <span>α_stall = {airfoil.alpha_stall_deg}°</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Airfoil Cross-Section SVG Preview + Polar Curve Dual View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-3 rounded-xl border border-slate-800">
        {/* SVG Airfoil Profile */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span className="font-bold">Геометрический контур профиля:</span>
            <span className="text-sky-400 text-[10px]">
              Кривизна: {currentAirfoil.camber_pct}% | Толщина: {currentAirfoil.thicknessRatio_pct}%
            </span>
          </div>

          <div className="w-full h-36 bg-slate-900/80 rounded-lg border border-slate-800 flex items-center justify-center p-2 relative overflow-hidden">
            {/* Chord Line */}
            <svg viewBox="0 0 320 120" className="w-full h-full">
              {/* Zero line */}
              <line x1="20" y1="60" x2="300" y2="60" stroke="#334155" strokeDasharray="3,3" strokeWidth="1" />

              {/* Airfoil Upper & Lower surfaces */}
              <path
                d={
                  'M ' +
                  airfoilPoints
                    .map((p) => `${20 + p.x * 280},${60 - p.yTop * 240}`)
                    .join(' L ') +
                  ' L ' +
                  airfoilPoints
                    .slice()
                    .reverse()
                    .map((p) => `${20 + p.x * 280},${60 - p.yBottom * 240}`)
                    .join(' L ') +
                  ' Z'
                }
                fill="rgba(56, 189, 248, 0.18)"
                stroke="#38bdf8"
                strokeWidth="2"
              />

              {/* Leading Edge Circle */}
              <circle cx="20" cy="60" r="3" fill="#38bdf8" />
              {/* Trailing Edge Circle */}
              <circle cx="300" cy="60" r="2" fill="#38bdf8" />

              {/* Annotation labels */}
              <text x="25" y="52" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                LE (Носок)
              </text>
              <text x="260" y="52" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                TE (Хвостик)
              </text>
            </svg>
          </div>
        </div>

        {/* Polar Curves */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span className="font-bold">Поляра C_L(α) & L/D(α):</span>
            <span className="text-emerald-400 text-[10px]">
              Крит. угол α_stall = {currentAirfoil.alpha_stall_deg}°
            </span>
          </div>

          <div className="h-36 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={polarData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="alpha" stroke="#64748b" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', fontSize: '9px' }} />
                <Line type="monotone" dataKey="CL" name="C_L" stroke="#38bdf8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="LD" name="L/D" stroke="#34d399" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
