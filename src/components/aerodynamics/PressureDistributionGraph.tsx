import React, { useMemo, useState } from 'react';
import {
  Activity,
  Layers,
  HelpCircle,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { MathText, MathView } from '../MathView';
import { AirfoilId } from './CFDWindTunnel';

interface PressureDistributionGraphProps {
  mach?: number;
  alpha?: number;
  airfoilId?: AirfoilId;
}

export const PressureDistributionGraph: React.FC<PressureDistributionGraphProps> = ({
  mach = 0.72,
  alpha = 4.5,
  airfoilId = 'naca4412',
}) => {
  const [showExplanation, setShowExplanation] = useState<boolean>(true);

  // Compute 50 points of Cp distribution along chord x/c in [0, 1]
  const cpPoints = useMemo(() => {
    const points: Array<{ x: number; cpUpper: number; cpLower: number }> = [];
    const N = 40;
    const radAlpha = (alpha * Math.PI) / 180;
    const isTransonic = mach > 0.8 && mach < 1.2;

    for (let i = 0; i <= N; i++) {
      const x = i / N; // 0 to 1

      // Leading edge suction peak (Riegels factor)
      const lePeak = Math.sin(radAlpha) * (1.8 / Math.sqrt(Math.max(0.015, x)));

      // Upper surface suction (negative Cp is plotted upwards by convention in aerodynamics)
      let cpUpper = -1.2 * Math.sin(Math.PI * Math.pow(x, 0.45)) - lePeak;
      // Lower surface pressure (positive Cp)
      let cpLower = 0.8 * Math.pow(1 - x, 0.8) * Math.cos(radAlpha);

      // Transonic shock jump on upper surface (at ~55% chord)
      if (isTransonic && x > 0.45 && x < 0.65) {
        const shockFactor = (x - 0.45) / 0.20;
        cpUpper += shockFactor * 0.95; // Sharp pressure recovery across shock
      }

      points.push({
        x: parseFloat(x.toFixed(3)),
        cpUpper: parseFloat(cpUpper.toFixed(3)),
        cpLower: parseFloat(cpLower.toFixed(3)),
      });
    }

    return points;
  }, [mach, alpha, airfoilId]);

  // Integrated area for Lift Coefficient Cl = integral (CpLower - CpUpper) d(x/c)
  const integratedCl = useMemo(() => {
    let sum = 0;
    const dx = 1 / (cpPoints.length - 1);
    for (let i = 0; i < cpPoints.length - 1; i++) {
      const p1 = cpPoints[i];
      const p2 = cpPoints[i + 1];
      const dCp1 = p1.cpLower - p1.cpUpper;
      const dCp2 = p2.cpLower - p2.cpUpper;
      sum += 0.5 * (dCp1 + dCp2) * dx;
    }
    return Math.max(-1.5, Math.min(2.5, sum));
  }, [cpPoints]);

  // SVG dimensions & scales for Cp Plot
  const width = 640;
  const height = 260;
  const padLeft = 55;
  const padRight = 20;
  const padTop = 25;
  const padBottom = 35;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  // In aerodynamic Cp plots, y-axis is inverted: negative Cp (suction) is AT THE TOP
  const cpMin = -2.5; // Upper top
  const cpMax = 1.2;  // Lower bottom

  const scaleX = (x: number) => padLeft + x * plotW;
  const scaleY = (cp: number) => padTop + ((cp - cpMin) / (cpMax - cpMin)) * plotH;

  // SVG Path strings
  const upperPath = cpPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.x)} ${scaleY(p.cpUpper)}`)
    .join(' ');

  const lowerPath = cpPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.x)} ${scaleY(p.cpLower)}`)
    .join(' ');

  // Shaded enclosed area between upper and lower surfaces (representing Lift)
  const areaPath = `${upperPath} ${cpPoints
    .slice()
    .reverse()
    .map((p) => `L ${scaleX(p.x)} ${scaleY(p.cpLower)}`)
    .join(' ')} Z`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Распределение Коэффициента Давления по Хорде Профиля $C_p(x/c)$</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              График разности давлений между верхней (разрежение) и нижней (подпор) дужками крыла
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono font-bold">
            Интеграл $\oint C_p d(x/c) = {integratedCl.toFixed(3)}$
          </span>
          <button
            type="button"
            onClick={() => setShowExplanation(!showExplanation)}
            className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors cursor-pointer flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{showExplanation ? 'Скрыть теорию' : 'Пояснения'}</span>
          </button>
        </div>
      </div>

      {/* SVG Interactive Chart */}
      <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-h-[300px] select-none">
          {/* Background Grid Lines */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((xVal) => (
            <line
              key={`gridX-${xVal}`}
              x1={scaleX(xVal)}
              y1={padTop}
              x2={scaleX(xVal)}
              y2={height - padBottom}
              stroke="#1e293b"
              strokeDasharray="4 4"
              strokeWidth="0.8"
            />
          ))}

          {[-2.0, -1.0, 0.0, 1.0].map((cpVal) => (
            <g key={`gridY-${cpVal}`}>
              <line
                x1={padLeft}
                y1={scaleY(cpVal)}
                x2={width - padRight}
                y2={scaleY(cpVal)}
                stroke={cpVal === 0 ? '#475569' : '#1e293b'}
                strokeDasharray={cpVal === 0 ? 'none' : '4 4'}
                strokeWidth={cpVal === 0 ? '1.2' : '0.8'}
              />
              <text
                x={padLeft - 8}
                y={scaleY(cpVal) + 3}
                fill="#94a3b8"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="end"
              >
                {cpVal.toFixed(1)}
              </text>
            </g>
          ))}

          {/* Shaded Area of Lift */}
          <path d={areaPath} fill="rgba(14, 165, 233, 0.12)" stroke="none" />

          {/* Upper Surface Curve (Cyan - Negative Suction Cp) */}
          <path d={upperPath} fill="none" stroke="#38bdf8" strokeWidth="2.5" />

          {/* Lower Surface Curve (Amber/Green - Positive Pressure Cp) */}
          <path d={lowerPath} fill="none" stroke="#fbbf24" strokeWidth="2.5" />

          {/* X Axis Labels */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((xVal) => (
            <text
              key={`xLabel-${xVal}`}
              x={scaleX(xVal)}
              y={height - padBottom + 16}
              fill="#94a3b8"
              fontSize="10"
              fontFamily="monospace"
              textAnchor="middle"
            >
              {xVal.toFixed(1)}
            </text>
          ))}

          {/* Axis Titles */}
          <text
            x={padLeft + plotW / 2}
            y={height - 6}
            fill="#cbd5e1"
            fontSize="11"
            fontFamily="monospace"
            textAnchor="middle"
            fontWeight="bold"
          >
            Относительная координата хорды (x / c)
          </text>

          <text
            transform={`rotate(-90 18 ${padTop + plotH / 2})`}
            x={18}
            y={padTop + plotH / 2}
            fill="#cbd5e1"
            fontSize="11"
            fontFamily="monospace"
            textAnchor="middle"
            fontWeight="bold"
          >
            Коэффициент давления C_p (Разрежение ↑)
          </text>
        </svg>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-cyan-400 rounded-full" />
            <span className="text-slate-300">Верхняя дужка (Разрежение / Всасывание)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-amber-400 rounded-full" />
            <span className="text-slate-300">Нижняя дужка (Избыточное давление)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-cyan-500/20 border border-cyan-500/40 rounded-sm" />
            <span className="text-slate-300">Площадь петли = Подъемная сила $C_L$</span>
          </div>
        </div>
      </div>

      {/* Deep Explanations Section */}
      {showExplanation && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs leading-relaxed animate-fadeIn">
          <div className="space-y-2">
            <div className="font-bold text-cyan-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Физический закон возникновения подъемной силы</span>
            </div>
            <p className="text-slate-300">
              <MathText text="По закону Бернулли $p + \frac{1}{2}\rho V^2 = p_0$, при обтекании выпуклой верхней поверхности профиля поток ускоряется ($V_{\text{верх}} > V_\infty$), что создает мощную зону разрежения ($C_p < 0$)." />
            </p>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-center font-mono">
              <MathView math="C_p = \frac{p - p_\infty}{\frac{1}{2}\rho_\infty V_\infty^2}, \quad C_L = \int_0^1 (C_{p,\text{ниж}} - C_{p,\text{верх}}) d\left(\frac{x}{c}\right)" block />
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Волновой кризис и околозвуковой скачок</span>
            </div>
            <p className="text-slate-300">
              <MathText text="При скоростях $M > 0.8$ на спинке крыла возникает местная сверхзвуковая зона ($M_{\text{loc}} > 1$), которая замыкается прямым скачком уплотнения (ударной волной). На графике это проявляется как резкий вертикальный скачок давления $C_p$ вверх, приводящий к утолщению пограничного слоя и росту волнового сопротивления." />
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
