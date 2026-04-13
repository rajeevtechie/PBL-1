import React, { useState, useEffect, useCallback } from 'react';
import { ActivityCalendar } from 'react-activity-calendar';
import { Flame, CalendarDays, Zap, Calendar as CalendarIcon } from 'lucide-react';
import axios from 'axios';

const ActivityGraph = () => {
    const [rawData, setRawData] = useState([]);
    const [displayData, setDisplayData] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [availableYears, setAvailableYears] = useState([new Date().getFullYear()]);
    const [stats, setStats] = useState({ totalActive: 0, maxStreak: 0, currentStreak: 0 });
    
    const [todayMinutes, setTodayMinutes] = useState(0);
    const [selectedDay, setSelectedDay] = useState(null);

    const getLocalYYYYMMDD = (d = new Date()) => {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const calculateStreaks = useCallback((data) => {
        if (!data || data.length === 0) return;

        const activeDates = data.filter(d => d.level > 0).map(d => d.date);
        
        let current = 0;
        let max = 0;
        let previousDate = null;

        activeDates.forEach(dateStr => {
            const date = new Date(`${dateStr}T00:00:00`);
            if (!previousDate) {
                current = 1;
            } else {
                const diffTime = Math.abs(date - previousDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays === 1) current += 1;
                else if (diffDays > 1) current = 1;
            }
            if (current > max) max = current;
            previousDate = date;
        });

        const todayStr = getLocalYYYYMMDD();
        let yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalYYYYMMDD(yesterday);

        if (!activeDates.includes(todayStr) && !activeDates.includes(yesterdayStr)) {
            current = 0; 
        }

        setStats({ totalActive: activeDates.length, maxStreak: max, currentStreak: current });
    }, []);

    useEffect(() => {
        const fetchHeatmap = async () => {
            try {
                // 🛡️ THE FIX: Removed the old localStorage token check!
                // Axios will automatically attach the secure HttpOnly cookie using withCredentials
                const res = await axios.get('http://localhost:5000/api/insights/heatmap', {
                    withCredentials: true 
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
    }, [calculateStreaks]);

    useEffect(() => {
        setSelectedDay(null);
    }, [selectedYear]);

    useEffect(() => {
        if (loading) return;

        const startDateStr = `${selectedYear}-01-01`;
        const endDateStr = `${selectedYear}-12-31`;
        
        let filteredMap = new Map();
        
        rawData.forEach(item => {
            if (item.date.startsWith(selectedYear.toString())) {
                const mins = parseInt(item.count) || parseInt(item.total_minutes) || 0; 
                filteredMap.set(item.date, { ...item, count: mins });
            }
        });

        if (!filteredMap.has(startDateStr)) filteredMap.set(startDateStr, { date: startDateStr, count: 0, level: 0 });
        if (!filteredMap.has(endDateStr)) filteredMap.set(endDateStr, { date: endDateStr, count: 0, level: 0 });

        const finalData = Array.from(filteredMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
        setDisplayData(finalData);

        const todayStr = getLocalYYYYMMDD();
        const todayEntry = finalData.find(d => d.date === todayStr);
        setTodayMinutes(todayEntry ? todayEntry.count : 0);

    }, [selectedYear, rawData, loading]);

    const formatTime = (totalMins) => {
        if (!totalMins || totalMins === 0) return "0 mins";
        const hrs = Math.floor(totalMins / 60);
        const mins = totalMins % 60;
        if (hrs === 0) return `${mins} mins`;
        if (mins === 0) return `${hrs} hr${hrs > 1 ? 's' : ''}`;
        return `${hrs} hr${hrs > 1 ? 's' : ''} ${mins} mins`;
    };

    let bottomLabel = `${formatTime(todayMinutes)} studied today`;
    if (selectedDay) {
        const formattedDate = new Date(`${selectedDay.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        bottomLabel = `${formatTime(selectedDay.count)} studied on ${formattedDate}`;
    }

    const customTheme = {
        light: ['#e2e8f0', '#6ee7b7', '#34d399', '#10b981', '#059669'], 
        dark: ['#334155', '#059669', '#10b981', '#34d399', '#6ee7b7']    
    };

    if (loading || displayData.length === 0) {
        return (
            <div style={{ color: 'var(--text-dim)', padding: '40px', width: '100%', textAlign: 'center', background: 'var(--bg-panel)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <CalendarIcon size={32} style={{ opacity: 0.5, marginBottom: '10px' }} />
                <p>No activity data available yet. Start a focus session!</p>
            </div>
        );
    }

    return (
        <div style={{ 
            background: 'var(--bg-panel)', 
            padding: '30px', 
            borderRadius: '20px', 
            border: '1px solid var(--border-color)',
            boxShadow: '0 10px 30px -10px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '25px',
            width: '100%',
            color: 'var(--text-main)' // 🛡️ LIGHT MODE TEXT FIX: Forces child text to inherit the dynamic variable
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-main)', padding: '12px 20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <div style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '8px', borderRadius: '8px' }}>
                            <CalendarDays size={20} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: '600', textTransform: 'uppercase' }}>Active Days</div>
                            <div style={{ fontSize: '1.25rem', color: 'var(--text-main)', fontWeight: 'bold' }}>{stats.totalActive}</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-main)', padding: '12px 20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <div style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', padding: '8px', borderRadius: '8px' }}>
                            <Flame size={20} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: '600', textTransform: 'uppercase' }}>Max Streak</div>
                            <div style={{ fontSize: '1.25rem', color: 'var(--text-main)', fontWeight: 'bold' }}>{stats.maxStreak}</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-main)', padding: '12px 20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '8px', borderRadius: '8px' }}>
                            <Zap size={20} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: '600', textTransform: 'uppercase' }}>Current Streak</div>
                            <div style={{ fontSize: '1.25rem', color: '#10b981', fontWeight: 'bold' }}>{stats.currentStreak}</div>
                        </div>
                    </div>
                </div>

                <select 
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    style={{
                        background: 'var(--bg-main)',
                        color: 'var(--text-main)',
                        border: '1px solid var(--border-color)',
                        padding: '10px 16px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        outline: 'none',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                    }}
                >
                    {availableYears.map(year => (
                        <option key={year} value={year} style={{ background: 'var(--bg-main)' }}>
                            {year}
                        </option>
                    ))}
                </select>
            </div>
            
            <div style={{ 
                width: '100%', 
                overflow: 'hidden', 
                background: 'var(--bg-main)', 
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'center',
                color: 'var(--text-main)' // 🛡️ LIGHT MODE TEXT FIX
            }}>
                <ActivityCalendar 
                    data={displayData} 
                    theme={customTheme}
                    colorScheme={document.body.classList.contains('light-theme') ? "light" : "dark"}
                    labels={{ totalCount: bottomLabel }}
                    eventHandlers={{ onClick: () => (activity) => setSelectedDay(activity) }}
                    showWeekdayLabels={true}
                    blockSize={14} blockRadius={3} blockMargin={4} fontSize={14}
                />
            </div>
        </div>
    );
};

export default ActivityGraph;