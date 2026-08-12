import React from 'react';

export interface DataPoint {
  label: string;
  value: number;
  isCurrentMonth?: boolean;
}

interface SimpleAreaChartProps {
  data: DataPoint[];
  height?: number;
}

export const SimpleAreaChart: React.FC<SimpleAreaChartProps> = ({ data, height = 220 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-xs font-medium">
        Tidak ada data grafik
      </div>
    );
  }

  const padding = { top: 15, right: 30, bottom: 20, left: 30 };
  const width = 600; // SVG viewBox width
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map(d => d.value), 10);
  const yMax = Math.ceil(maxValue * 1.15);

  const getX = (index: number) => {
    if (data.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + (index / (data.length - 1)) * chartWidth;
  };

  const getY = (value: number) => {
    return padding.top + chartHeight - (value / yMax) * chartHeight;
  };

  // Generate smooth cubic bezier SVG path
  const points = data.map((d, i) => ({ x: getX(i), y: getY(d.value), val: d.value }));

  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX = (p0.x + p1.x) / 2;
    linePath += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[175px] md:h-[200px] select-none"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="chartBlueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.33, 0.66, 1].map((pct, idx) => {
          const yPos = padding.top + chartHeight * (1 - pct);
          return (
            <line
              key={idx}
              x1={padding.left}
              y1={yPos}
              x2={width - padding.right}
              y2={yPos}
              stroke="#f1f5f9"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#chartBlueGradient)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#2563eb"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points & Values */}
        {points.map((pt, i) => {
          const isCurrentMonth = data[i].isCurrentMonth;
          const r = 6;
          const daysPassed = new Date().getDate();
          return (
            <g key={i} className="group cursor-pointer">
              {/* Value Label above point */}
              <text
                x={pt.x}
                y={pt.y - 12}
                textAnchor="middle"
                className="text-[11px] font-bold fill-slate-800"
              >
                {pt.val}
              </text>

              {isCurrentMonth ? (
                <>
                  {/* Diamond shape for current month */}
                  <polygon
                    points={`${pt.x},${pt.y - r - 2} ${pt.x + r + 2},${pt.y} ${pt.x},${pt.y + r + 2} ${pt.x - r - 2},${pt.y}`}
                    className="fill-white stroke-blue-600 stroke-[3] group-hover:scale-125 transition-transform"
                  />
                  {/* Small badge/label near the last running point */}
                  <text
                    x={pt.x - 24}
                    y={pt.y + 16}
                    textAnchor="middle"
                    className="text-[9px] font-bold fill-blue-600 tracking-tight"
                  >
                    (berjalan: {daysPassed} hari)
                  </text>
                </>
              ) : (
                /* Outer ring */
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={r}
                  className="fill-white stroke-blue-600 stroke-[3] group-hover:scale-125 transition-transform"
                />
              )}

              {/* X-axis Label */}
              <text
                x={pt.x}
                y={height - 10}
                textAnchor="middle"
                className="text-[11px] font-medium fill-slate-500"
              >
                {data[i].label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
