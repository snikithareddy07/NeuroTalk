import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import toast from 'react-hot-toast';
import './Profile.css';

const emotionsList = ['joy', 'sadness', 'anger', 'fear', 'love', 'surprise'];

const emotionEmojis = {
  joy: "✨",
  sadness: "🌧️",
  anger: "🔥",
  fear: "🌪️",
  love: "💗",
  surprise: "🤯",
  neutral: "😐"
};

const Profile = () => {
  const { user, token } = useAuth();
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/predict/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setHistoryRecords(res.data);
      } catch (err) {
        toast.error("Failed to fetch user data.");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [token]);

  const stats = useMemo(() => {
    if (!historyRecords || historyRecords.length === 0) {
      return {
        totalEntries: 0,
        dominantEmotion: 'N/A',
        streak: 0,
        firstEntryDate: 'N/A',
        radarData: emotionsList.map(e => ({ emotion: e.charAt(0).toUpperCase() + e.slice(1), count: 0 }))
      };
    }

    const totalEntries = historyRecords.length;

    // Dominant Emotion & Radar Data
    const distribution = historyRecords.reduce((acc, r) => {
      const e = r.predicted_emotion;
      if (e && emotionsList.includes(e)) {
        acc[e] = (acc[e] || 0) + 1;
      }
      return acc;
    }, {});

    const dominantEmotion = Object.keys(distribution).length > 0 
      ? Object.keys(distribution).reduce((a, b) => distribution[a] > distribution[b] ? a : b) 
      : 'N/A';

    const radarData = emotionsList.map(e => ({
      emotion: e.charAt(0).toUpperCase() + e.slice(1),
      count: distribution[e] || 0
    }));

    // First Entry Date (since records are sorted descending by default)
    const firstEntryObj = historyRecords[historyRecords.length - 1];
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    const firstEntryDate = firstEntryObj && firstEntryObj.timestamp 
      ? new Date(firstEntryObj.timestamp).toLocaleDateString(undefined, options) 
      : 'N/A';

    // Streak Calculation (consecutive days)
    const uniqueDays = [...new Set(historyRecords.map(r => {
      return new Date(r.timestamp).toISOString().split('T')[0];
    }))].sort((a, b) => new Date(b) - new Date(a)); // Descending order: newest to oldest

    let streakCount = 0;
    if (uniqueDays.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      let expectedDate = new Date(uniqueDays[0]);
      
      // If the most recent string is not today or yesterday, streak is broken / 0
      // But we will base the streak off the most recent post for flexibility
      streakCount = 1;
      for (let i = 1; i < uniqueDays.length; i++) {
        expectedDate.setDate(expectedDate.getDate() - 1);
        const expectedStr = expectedDate.toISOString().split('T')[0];
        
        if (uniqueDays[i] === expectedStr) {
          streakCount++;
        } else {
          break; // Broken streak
        }
      }
    }

    return { totalEntries, dominantEmotion, streak: streakCount, firstEntryDate, radarData };
  }, [historyRecords]);

  return (
    <div className="profile-container">
      <div className="profile-header global-card">
        <div className="user-avatar">
          {user?.username?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="user-info">
          <h2>{user?.username || 'User'}</h2>
          <p className="user-email">{user?.email || 'email@example.com'}</p>
          <div className="user-role-badge">
            {user?.role === 'admin' ? '🌟 Administrator' : 'Member'}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading profile configuration...</div>
      ) : (
        <div className="profile-content">
          <div className="stats-grid">
            <motion.div 
              className="stat-card global-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="stat-icon">📝</div>
              <div className="stat-value">{stats.totalEntries}</div>
              <div className="stat-label">Total Reflections</div>
            </motion.div>

            <motion.div 
              className="stat-card global-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div className="stat-icon">{emotionEmojis[stats.dominantEmotion]}</div>
              <div className="stat-value" style={{ textTransform: 'capitalize' }}>
                {stats.dominantEmotion === 'N/A' ? '-' : stats.dominantEmotion}
              </div>
              <div className="stat-label">Dominant Emotion</div>
            </motion.div>

            <motion.div 
              className="stat-card global-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <div className="stat-icon">🔥</div>
              <div className="stat-value">{stats.streak} Days</div>
              <div className="stat-label">Current Streak</div>
            </motion.div>

            <motion.div 
              className="stat-card global-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <div className="stat-icon">🌱</div>
              <div className="stat-value" style={{ fontSize: '1.4rem' }}>{stats.firstEntryDate}</div>
              <div className="stat-label">Journey Started</div>
            </motion.div>
          </div>

          <motion.div 
            className="radar-section global-card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="radar-header">
              <h3>Emotional Fingerprint</h3>
              <p>A holistic map of your cognitive landscape across all entries.</p>
            </div>
            
            <div className="radar-wrapper">
              {stats.totalEntries > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={stats.radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="emotion" tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 500 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={{ fill: '#64748b' }} stroke="rgba(255,255,255,0.1)" />
                    <Radar 
                      name="Entries" 
                      dataKey="count" 
                      stroke="#00f0ff" 
                      strokeWidth={2}
                      fill="url(#colorGlow)" 
                      fillOpacity={0.5} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(20,20,30,0.9)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                      itemStyle={{ color: '#00f0ff' }}
                    />
                    <defs>
                      <linearGradient id="colorGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#6b00ff" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-radar">
                  <div style={{ fontSize: '3rem', opacity: 0.3, marginBottom: '1rem' }}>🕸️</div>
                  <p>Not enough data to map your fingerprint yet.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Profile;
