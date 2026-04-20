// src/components/ChartUtils.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import { useRef, useEffect } from 'react';
import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
    RadarController
} from 'chart.js';
import utils from '../utils.js';

// Register Chart.js components
ChartJS.register(
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
    RadarController
);

function RadarChart({ data, labels, shortLabels, category }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current || !data) return;
        const ctx = canvasRef.current.getContext('2d');
        if (canvasRef.current.chart) {
            canvasRef.current.chart.destroy();
        }

        const colors = {
            tecniche: 'rgba(102, 126, 234, 0.6)',
            tattiche: 'rgba(72, 187, 120, 0.6)',
            fisiche: 'rgba(245, 101, 101, 0.6)',
        };
        const borderColors = {
            tecniche: 'rgb(102, 126, 234)',
            tattiche: 'rgb(72, 187, 120)',
            fisiche: 'rgb(245, 101, 101)',
        };

        canvasRef.current.chart = new ChartJS(ctx, {
            type: 'radar',
            data: {
                labels: shortLabels,
                datasets: [{
                    label: category.charAt(0).toUpperCase() + category.slice(1),
                    data: labels.map(label => utils.toBase10(data[label])),
                    backgroundColor: colors[category],
                    borderColor: borderColors[category],
                    borderWidth: 2,
                    pointBackgroundColor: borderColors[category],
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: borderColors[category]
                }]
            },
            options: {
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 10,
                        min: 0,
                        ticks: {
                            stepSize: 2,
                            color: 'rgba(255, 255, 255, 0.5)',
                            backdropColor: 'transparent'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            circular: true
                        },
                        angleLines: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        pointLabels: {
                            color: 'rgba(255, 255, 255, 0.8)',
                            font: {
                                size: 11
                            }
                        }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });

        return () => {
            if (canvasRef.current?.chart) {
                canvasRef.current.chart.destroy();
            }
        };
    }, [data, labels, shortLabels, category]);

    return <canvas ref={canvasRef} className="chart-canvas"></canvas>;
}

export default RadarChart;