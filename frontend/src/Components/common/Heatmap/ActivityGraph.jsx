import React, { useState, useEffect } from 'react';
import { ActivityCalendar } from 'react-activity-calendar';
import axios from 'axios';

const ActivityGraph = () => {
    const [rawData, setRawData] = useState([]);
    const [displayData, setDisplayData] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Stats State
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [availableYears, setAvailableYears] = useState([new Date().getFullYear()]);
    const [stats, setStats] = useState({ totalActive: 0, maxStreak: 0, currentStreak: 0 });

    useEffect(() => {
        const fetchHeatmap = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('http://localhost:5000/api/insights/heatmap', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.data.success && res.data.data && res.data.data.length > 0) {
                    setRawData(res.data.data);
                    
                    const years = [...new Set(res.data.data.map(item => parseInt(item.date.split('-')[0])))];
                    if (!years.includes(new Date().getFullYear())) years.push(new Date().getFullYear());
                    setAvailableYears(years.sort((a, b) => b - a));

                    calculateStreaks(res.data.data);
                }
            } catch (error) {
                console.error("Could not load heatmap", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHeatmap();
    }, []);

    // Filter data whenever the year changes
    useEffect(() => {
        if (loading) return;

        // ✅ FIX 1: ALWAYS anchor from Jan 1 to Dec 31 to force a full-width grid
        const startDateStr = `${selectedYear}-01-01`;
        const endDateStr = `${selectedYear}-12-31`;
        
        let filteredMap = new Map();
        
        rawData.forEach(item => {
            if (item.date.startsWith(selectedYear.toString())) {
                filteredMap.set(item.date, item);
            }
        });

        if (!filteredMap.has(startDateStr)) filteredMap.set(startDateStr, { date: startDateStr, count: 0, level: 0 });
        if (!filteredMap.has(endDateStr)) filteredMap.set(endDateStr, { date: endDateStr, count: 0, level: 0 });

        const finalData = Array.from(filteredMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
        setDisplayData(finalData);

    }, [selectedYear, rawData, loading]);

    const calculateStreaks = (data) => {
        if (!data || data.length === 0) return;

        const activeDates = data.filter(d => d.level > 0).map(d => d.date);
        
        let current = 0;
        let max = 0;
        let previousDate = null;

        activeDates.forEach(dateStr => {
            const date = new Date(dateStr);
            if (!previousDate) {
                current = 1;
            } else {
                const diffTime = Math.abs(date - previousDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays === 1) {
                    current += 1;
                } else if (diffDays > 1) {
                    current = 1;
                }
            }
            if (current > max) max = current;
            previousDate = date;
        });

        const todayStr = new Date().toISOString().split('T')[0];
        let yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (!activeDates.includes(todayStr) && !activeDates.includes(yesterdayStr)) {
            current = 0; 
        }

        setStats({ totalActive: activeDates.length, maxStreak: max, currentStreak: current });
    };

    const customTheme = {
        light: ['#1e293b', '#0e4429', '#006d32', '#26a641', '#39d353'], 
        dark: ['#1e293b', '#064e3b', '#047857', '#10b981', '#34d399']    
    };

    if (loading || displayData.length === 0) {
        return <div style={{ color: '#888', padding: '20px', width: '100%', textAlign: 'left' }}>Loading your streaks...</div>;
    }

    return (
        <div style={{ 
            background: 'var(--bg-panel)', 
            padding: '24px', 
            borderRadius: '16px', 
            border: '1px solid var(--border-color)',
            overflowX: 'auto',
            display: 'flex',
            flexDirection: 'column',
            // ✅ FIX 2: Align everything to the left
            alignItems: 'flex-start' 
        }}>
            <div style={{ 
                width: '100%', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '20px',
                paddingBottom: '12px',
                flexWrap: 'wrap',
                gap: '15px'
            }}>
                <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem', color: '#94a3b8' }}>
                    <div>Total active days: <span style={{ color: '#e2e8f0', fontWeight: 'bold' }}>{stats.totalActive}</span></div>
                    <div>Max streak: <span style={{ color: '#e2e8f0', fontWeight: 'bold' }}>{stats.maxStreak}</span></div>
                    <div>Current streak: <span style={{ color: '#10b981', fontWeight: 'bold' }}>{stats.currentStreak}</span></div>
                </div>

                <select 
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        color: '#e2e8f0',
                        border: '1px solid #334155',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        outline: 'none'
                    }}
                >
                    {availableYears.map(year => (
                        <option key={year} value={year} style={{ background: '#1e293b' }}>
                            {year}
                        </option>
                    ))}
                </select>
            </div>
            
            {/* ✅ FIX 3: Make the calendar wrapper stick to the left */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', overflowX: 'auto', paddingBottom: '10px' }}>
                <ActivityCalendar 
                    data={displayData} 
                    theme={customTheme}
                    colorScheme="dark"
                    labels={{ totalCount: '{{count}} minutes focused' }}
                    showWeekdayLabels={true}
                    blockSize={13}
                    blockRadius={3}
                    blockMargin={5}
                    fontSize={13}
                />
            </div>
        </div>
    );
};

export default ActivityGraph;