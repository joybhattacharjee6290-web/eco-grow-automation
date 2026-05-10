import { useMemo,useState } from 'react';
import './Analytics.css';
import { useSensorDataContext } from '../hooks/useSensorData.jsx';

// Helper to create smooth bezier curves
const getSmoothPath = (points, height, padding) => {
  if (points.length === 0) return '';

  // Move to first point
  let d = `M ${points[0][0]},${points[0][1]}`;

  for (let i = 0; i < points.length - 1; i++) {
    const x0 = i > 0 ? points[i - 1][0] : points[i][0];
    const y0 = i > 0 ? points[i - 1][1] : points[i][1];
    const x1 = points[i][0];
    const y1 = points[i][1];
    const x2 = points[i + 1][0];
    const y2 = points[i + 1][1];
    const x3 = i !== points.length - 2 ? points[i + 2][0] : x2;
    const y3 = i !== points.length - 2 ? points[i + 2][1] : y2;

    const cp1x = x1 + (x2 - x0) / 6;
    const cp1y = y1 + (y2 - y0) / 6;
    const cp2x = x2 - (x3 - x1) / 6;
    const cp2y = y2 - (y3 - y1) / 6;

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x2},${y2}`;
  }

  return d;
};

//function LineChart({ data, color, showBars = false }) 
function LineChart({ data, color, showBars = false, yMin = null, yMax = null, unit = '' , label = ''}){
 const [hoverIndex, setHoverIndex] = useState(null);
 const getTimeLabel = (index) => {
  const now = new Date();
  const minutesAgo = Math.floor((data.length - 1 - index) * 5);


  const pointTime = new Date(now.getTime() - minutesAgo * 60000);
  const dateStr = pointTime.toLocaleDateString([], {
    day: '2-digit',
    month: 'short'
  });
  const timeStr = pointTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });


  return minutesAgo === 0
    ? `${dateStr}, ${timeStr} (Now)`
    : `${dateStr}, ${timeStr} (${minutesAgo}m ago)`;

};
  if (showBars) {
    const min = yMin !== null ? yMin : Math.min(...data);
    const max = yMax !== null ? yMax : Math.max(...data);
    const range = max - min || 1;
    const limitedData = data.slice(-5); // last 5 
    return (
      <div style={{ display: 'flex', height: '100%' }}>
  
        {/* ✅ Y AXIS WITH FIXED SCALE */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          fontSize: '10px',
          color: '#64748b',
          marginRight: '6px'
        }}>
          {[0, 1, 2, 3, 4].map((i) => {
            const value = Math.round(min + (range * (4 - i)) / 4);
            return (
              <span key={i}>
                {value}{i === 4 ? ` ${unit}` : ''}
              </span>
            );
          })}
        </div>
  
        {/* ✅ GRAPH AREA */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
  
          {/* BARS */}
          <div className="bar-chart" style={{ flex: 1 }}>
            {limitedData.map((value, index) => {
              const height = ((value - min) / range) * 90;
              return (
                <div key={index} className="bar-wrapper">
                  <div
                    className={`bar ${color}`}
                    style={{
                      height: `${height}%`,
                      transition: 'height 0.5s ease-out'
                    }}
                  />
                </div>
              );
            })}
          </div>
  
          {/* ✅ X AXIS */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: '#64748b',
            marginTop: '4px'
          }}>
          {limitedData.map((_, i) => {
            const minutesAgo = (limitedData.length - 1 - i) * 5;
            return <span key={i}>{minutesAgo === 0 ? 'Now' : `${minutesAgo}m`}</span>;
          })}
          </div>
  
        </div>
      </div>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 300;
  const height = 120;
  const padding = 20;
  
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = height - padding - ((value - min) / range) * chartHeight;
    return [x, y];
  });
  
  const pathD = getSmoothPath(points,height, padding);
  const getInterpolatedValue = () => {
    if (hoverIndex === null) return null;
  
    const leftIndex = Math.floor(hoverIndex);
    const rightIndex = Math.ceil(hoverIndex);
  
    if (leftIndex === rightIndex) return data[leftIndex];
  
    const ratio = hoverIndex - leftIndex;
  
    return data[leftIndex] + (data[rightIndex] - data[leftIndex]) * ratio;
  };
  
  const interpolatedValue = getInterpolatedValue();
  
  const getInterpolatedPoint = () => {
    if (hoverIndex === null) return null;
  
    const leftIndex = Math.floor(hoverIndex);
    const rightIndex = Math.ceil(hoverIndex);
  
    const ratio = hoverIndex - leftIndex;
  
    const [x1, y1] = points[leftIndex];
    const [x2, y2] = points[rightIndex] || points[leftIndex];
  
    return [
      x1 + (x2 - x1) * ratio,
      y1 + (y2 - y1) * ratio
    ];
  };
  
  const activePoint = getInterpolatedPoint();
  
  return (
    
    <svg viewBox={`0 0 ${width} ${height}`} className="line-chart-svg" 
    onMouseMove={(e) => {
      const svg = e.currentTarget;
    
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
    
      const cursor = pt.matrixTransform(svg.getScreenCTM().inverse());
    
      const x = cursor.x;
    
      const clampedX = Math.max(padding, Math.min(width - padding, x));
    
      const step = chartWidth / (data.length - 1);
      const index = (clampedX - padding) / step;
    
      setHoverIndex(index);
    }}
    onMouseLeave={() => setHoverIndex(null)}>

  
      {/* ✅ Y AXIS */}
      <line
        x1={padding}
        y1={padding}
        x2={padding}
        y2={height - padding}
        stroke="#94a3b8"
        strokeWidth="1"
      />
  
      {/* ✅ X AXIS */}
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke="#94a3b8"
        strokeWidth="1"
      />
  
      {/* ✅ Y LABELS (values) */}
      {[0, 1, 2, 3].map((i) => {
        const y = padding + (i / 3) * chartHeight;
        const value = Math.round(min + (range * (3 - i)) / 3);
  
        return (
          <text
            key={i}
            x={padding - 5}
            y={y + 3}
            fontSize="8"
            textAnchor="end"
            fill="#64748b"
          >
            {value}
          </text>
        );
      })}
  
      {/* ✅ X LABELS (index/time) */}
      {data.map((_, i) => {
        const x = padding + (i / (data.length - 1)) * chartWidth;
  
        return (
          <text
            key={i}
            x={x}
            y={height - padding + 10}
            fontSize="8"
            textAnchor="middle"
            fill="#64748b"
          >
            {i + 1}
          </text>
        );
      })}
  
      {/* ✅ YOUR EXISTING LINE */}
      <path
        d={pathD}
        fill="none"
        className={`chart-line ${color}`}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
  
      {/* ✅ POINTS (optional but useful) */}
      {points.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r="2"
          fill="white"
          className={`chart-line ${color}`}
        />
      ))}
      {activePoint && (
        <g>
          {/* Vertical line */}
          <line
            x1={activePoint[0]}
            y1={padding}
            x2={activePoint[0]}
            y2={height - padding}
            stroke="#cbd5e1"
            strokeDasharray="3 3"
          />
      
          {/* Moving dot */}
          <circle
            cx={activePoint[0]}
            cy={activePoint[1]}
            r="5"
            fill="#fff"
            stroke="#6366f1"
            strokeWidth="2"
          />
      
          {/* Tooltip */}
          <g transform={`translate(${activePoint[0] - 70}, ${activePoint[1] - 60})`}>
            <rect
              width="140"
              height="45"
              rx="10"
              fill="#ffffff"
              stroke="#e2e8f0"
              style={{
                filter: "drop-shadow(0px 4px 10px rgba(0,0,0,0.15))"
              }}
            />
      
            <text x="10" y="18" fontSize="11" fill="#0f172a" fontWeight="600">
            {label}: {
              label === "Co2 Level" || label === "No2"
                ? interpolatedValue?.toFixed(3)
                : interpolatedValue?.toFixed(1)
            } {unit}
          </text>
      
            <text x="10" y="32" fontSize="9" fill="#64748b">
               {getTimeLabel(hoverIndex)}
            </text>
          </g>
        </g>
      )}
      
    </svg>
  );
}

export default function Analytics() {
  const { formattedData, historicalData, lastUpdated } = useSensorDataContext();

  const analyticsData = useMemo(() => [
    {
      id: 1,
      name: 'Soil Moisture',
      value: `${formattedData.soilMoisture}%`,
      unit: '',
      color: 'green',
      chartData: historicalData.soilMoisture || [45, 48, 46, 50, 52, 49, 48, 47],
      grid: 'top-left',
      showBars: false
    },
    {
      id: 2,
      name: 'Sunlight',
      value: `${formattedData.sunlight.toString()}%`,
      unit: '',
      color: 'yellow',
      chartData: historicalData.sunlight || [600, 650, 700, 680, 720, 760, 750, 800],
      grid: 'top-right',
      showBars: false
    },
    {
      id: 3,
      name: 'Carbon Dioxide(CO2)',
      value: `${formattedData.co2}%`,
      unit: '',
      color: 'blue',
      chartData: historicalData.co2 || [40, 45, 50, 48, 52, 55, 53, 50],
      grid: 'middle-left',
      showBars: true,
    },
    {
      id: 4,
      name: 'Temperature',
      value: `${formattedData.temperature}°C`,
      unit: '',
      color: 'orange',
      chartData: historicalData.temperature || [22, 23, 24, 25, 26, 25, 24, 23],
      grid: 'middle-center',
      showBars: false
    },
    {
      id: 5,
      name: 'Humidity',
      value: `${formattedData.humidity}%`,
      unit: '',
      color: 'teal',
      chartData: historicalData.humidity || [60, 62, 65, 63, 64, 66, 65, 64],
      grid: 'middle-right',
      showBars: true,
      yMin: 0,
      yMax: 100
    },
    {
      id: 6,
      name: 'Air Quality',
      value: `${formattedData.airQuality.toString()} AQI`,
      unit: '',
      color: 'purple',
      chartData: historicalData.airQuality || [85, 86, 88, 87, 89, 90, 88, 87],
      grid: 'bottom-left',
      showBars: false
    },
    {
      id: 7,
      name: 'Ammonia(NH3)',
      value: `${formattedData.no2}%`,
      unit: '',
      color: 'cyan',
      chartData: historicalData.no2 || [2, 3, 5, 4, 6, 7, 6, 8],
      grid: 'bottom-right',
      showBars: false
    },
  ], [formattedData, historicalData]);

  const getGridClass = (grid) => {
    return `analytics-card ${grid}`;
  };

  return (
    <div className="analytics">
      <div className="analytics-header-bar">
        <span className="live-indicator">
          <span className="live-dot"></span>
          LIVE
        </span>
        <span className="last-update">Updated: {lastUpdated.toLocaleTimeString()}</span>
      </div>
      <div className="analytics-grid">
        {analyticsData.map((item) => (
          <div key={item.id} className={`${getGridClass(item.grid)} card-glass`}>
            <div className="card-header">
              <h3 className="analytics-title">{item.name}</h3>
              <div className={`current-value ${item.color}`}>
                {item.value}<span className="unit">{item.unit}</span>
              </div>
            </div>
            <div className="chart-wrapper">
            <LineChart 
              data={item.chartData} 
              color={item.color} 
              showBars={item.showBars}
              yMin={item.yMin}
              yMax={item.yMax}
              unit={item.unit}
              label={item.name}
            />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
