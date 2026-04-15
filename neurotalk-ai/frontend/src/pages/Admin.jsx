import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import './Admin.css';

const emotionColors = {
  joy: "#facc15", 
  sadness: "#3b82f6", 
  anger: "#ef4444", 
  fear: "#a855f7", 
  love: "#ec4899", 
  surprise: "#22c55e",
  neutral: "#94a3b8" 
};

const Admin = () => {
  const { token, user } = useAuth();
  const [data, setData] = useState({ users: [], predictions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setLoading(true);
        const res = await axios.get('http://localhost:5001/api/admin/data', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to fetch admin statistics.");
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, [token]);

  const stats = useMemo(() => {
    const totalUsers = data.users.length;
    const totalPredictions = data.predictions.length;

    // Engagement & Most Active User
    const userEngagement = {};
    data.predictions.forEach(p => {
      if (p.user_id) {
        userEngagement[p.user_id] = (userEngagement[p.user_id] || 0) + 1;
      }
    });

    let mostActiveUserId = null;
    let mostActiveCount = 0;
    Object.keys(userEngagement).forEach(uid => {
      if (userEngagement[uid] > mostActiveCount) {
        mostActiveCount = userEngagement[uid];
        mostActiveUserId = uid;
      }
    });

    const mostActiveUserObj = data.users.find(u => u._id === mostActiveUserId);
    const mostActiveUser = mostActiveUserObj ? mostActiveUserObj.username : "N/A";

    // Bar Chart: Global Emotion Distribution
    const distMap = {};
    data.predictions.forEach(p => {
      distMap[p.predicted_emotion] = (distMap[p.predicted_emotion] || 0) + 1;
    });
    const distData = Object.keys(distMap).map(emo => ({
      emotion: emo.charAt(0).toUpperCase() + emo.slice(1),
      rawEmotion: emo,
      count: distMap[emo]
    })).sort((a,b) => b.count - a.count);

    // Line Chart: 30-Day Activity
    const activityMap = new Map();
    for(let i=29; i>=0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      activityMap.set(d.toISOString().split('T')[0], 0);
    }
    data.predictions.forEach(p => {
      const dStr = new Date(p.timestamp).toISOString().split('T')[0];
      if (activityMap.has(dStr)) {
        activityMap.set(dStr, activityMap.get(dStr) + 1);
      }
    });
    const lineData = Array.from(activityMap.keys()).map(date => ({
      date: date.substring(5),
      activity: activityMap.get(date)
    }));

    return { totalUsers, totalPredictions, mostActiveUser, distData, lineData };
  }, [data]);

  const userTableData = useMemo(() => {
    const userCountMap = {};
    data.predictions.forEach(p => {
      if(p.user_id) userCountMap[p.user_id] = (userCountMap[p.user_id] || 0) +1;
    });

    return data.users.map(u => ({
      id: u._id,
      username: u.username,
      email: u.email,
      predictions: userCountMap[u._id] || 0,
      joinDate: u.created_at ? new Date(u.created_at).toLocaleDateString() : "Unknown",
      role: u.role || 'user'
    })).sort((a,b) => b.predictions - a.predictions);
  }, [data]);

  return (
    <div className="admin-container page-transition">
      <div className="admin-header">
        <h2>Global Command Center</h2>
        <p>Monitor real-time system performance and user engagement metrics.</p>
      </div>

      {loading ? (
        <div className="admin-loading">Extracting Server Intelligence...</div>
      ) : error ? (
        <div className="admin-error">{error}</div>
      ) : (
        <>
          <div className="admin-stats-grid">
            <motion.div className="admin-stat-card card-shadow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="stat-title">Total Users</div>
              <div className="stat-big-value">{stats.totalUsers}</div>
            </motion.div>
            <motion.div className="admin-stat-card card-shadow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{delay: 0.1}}>
              <div className="stat-title">Total Analyses</div>
              <div className="stat-big-value">{stats.totalPredictions}</div>
            </motion.div>
            <motion.div className="admin-stat-card card-shadow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{delay: 0.2}}>
              <div className="stat-title">Most Active Member</div>
              <div className="stat-big-value" style={{fontSize: '1.5rem'}}>{stats.mostActiveUser}</div>
            </motion.div>
          </div>

          <div className="admin-charts-grid">
            <motion.div className="admin-chart-card card-shadow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{delay: 0.3}}>
              <h3>Global Emotion Distribution</h3>
              <div className="admin-chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.distData} margin={{top: 20, right: 0, left: -20, bottom: 0}}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="emotion" tick={{ fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fill: 'var(--text-muted)' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'rgba(255,255,255,0.1)' }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {stats.distData.map((entry, index) => (
                        <cell key={`cell-${index}`} fill={emotionColors[entry.rawEmotion] || 'var(--accent-blue)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div className="admin-chart-card card-shadow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{delay: 0.4}}>
              <h3>Network Activity (30 Days)</h3>
              <div className="admin-chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.lineData} margin={{top: 20, right: 0, left: -20, bottom: 0}}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fill: 'var(--text-muted)' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'rgba(255,255,255,0.1)' }} />
                    <Line type="monotone" dataKey="activity" stroke="var(--accent-purple)" strokeWidth={3} dot={false} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          <motion.div className="admin-table-container card-shadow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{delay: 0.5}}>
            <h3>User Directory</h3>
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Join Date</th>
                    <th>Analyses Run</th>
                  </tr>
                </thead>
                <tbody>
                  {userTableData.map(u => (
                    <tr key={u.id}>
                      <td className="font-semibold">{u.username}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`admin-role-badge ${u.role === 'admin' ? 'admin-badge' : 'user-badge'}`}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td>{u.joinDate}</td>
                      <td className="text-center font-monospace">{u.predictions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default Admin;
