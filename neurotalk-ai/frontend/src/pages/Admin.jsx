import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import toast from 'react-hot-toast';
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
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  
  // Tab Data States
  const [usersData, setUsersData] = useState([]);
  const [predictionsData, setPredictionsData] = useState({ predictions: [], total_pages: 1, page: 1 });
  const [analyticsData, setAnalyticsData] = useState(null);
  const [monitoringData, setMonitoringData] = useState(null);
  
  const [loading, setLoading] = useState(false);

  // Fetch logic based on active tab
  useEffect(() => {
    const fetchTabData = async () => {
      setLoading(true);
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        if (activeTab === 'users' || activeTab === 'activity') {
          // Fetch users (used by both users and activity tabs)
          const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/users`, config);
          setUsersData(res.data);
        } else if (activeTab === 'predictions') {
          await loadPredictions(1);
        } else if (activeTab === 'analytics') {
          const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/analytics`, config);
          setAnalyticsData(res.data);
        } else if (activeTab === 'monitoring') {
          const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/monitoring`, config);
          setMonitoringData(res.data);
        }
      } catch (err) {
        toast.error(err.response?.data?.error || "Failed to load admin data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchTabData();
  }, [activeTab, token]);

  const loadPredictions = async (page) => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/predictions?page=${page}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPredictionsData(res.data);
    } catch (err) {
      toast.error("Failed to load predictions");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePrediction = async (id) => {
    if (!window.confirm("Are you sure you want to delete this prediction?")) return;
    
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/predictions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Prediction deleted");
      loadPredictions(predictionsData.page); // Reload current page
    } catch (err) {
      toast.error("Failed to delete prediction");
    }
  };

  // Render Helpers
  const renderUsersTab = () => {
    const sortedUsers = [...usersData].sort((a, b) => b.total_predictions - a.total_predictions);
    return (
      <div className="admin-table-container">
        <h3>User Directory</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Total Analyses</th>
              <th>Last Active</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map(u => (
              <tr key={u._id}>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>{u.total_predictions}</td>
                <td>{u.last_active ? new Date(u.last_active).toLocaleDateString() : 'Never'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderPredictionsTab = () => {
    return (
      <div className="admin-table-container">
        <h3>All Predictions</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Input Text</th>
              <th>Emotion</th>
              <th>Confidence</th>
              <th>Timestamp</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {predictionsData.predictions.map(p => (
              <tr key={p._id}>
                <td>{p.username}</td>
                <td>{p.text.length > 80 ? p.text.substring(0, 80) + '...' : p.text}</td>
                <td>
                  <span 
                    className="emotion-badge" 
                    style={{ backgroundColor: emotionColors[p.predicted_emotion] || '#gray', color: '#000' }}
                  >
                    {p.predicted_emotion}
                  </span>
                </td>
                <td>{(p.confidence * 100).toFixed(1)}%</td>
                <td>{new Date(p.timestamp).toLocaleDateString()}</td>
                <td>
                  <button onClick={() => handleDeletePrediction(p._id)} className="btn-delete">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="pagination">
          <button 
            disabled={predictionsData.page <= 1} 
            onClick={() => loadPredictions(predictionsData.page - 1)}
          >
            Previous
          </button>
          <span>Page {predictionsData.page} of {predictionsData.total_pages || 1}</span>
          <button 
            disabled={predictionsData.page >= predictionsData.total_pages}
            onClick={() => loadPredictions(predictionsData.page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  const renderAnalyticsTab = () => {
    if (!analyticsData) return null;
    
    // Format Emotion Output
    const distData = Object.keys(analyticsData.emotion_distribution).map(k => ({
      name: k,
      value: analyticsData.emotion_distribution[k]
    }));
    
    // Format Distortion Output
    const distFreqData = Object.keys(analyticsData.distortion_frequency).map(k => ({
      name: k,
      count: analyticsData.distortion_frequency[k]
    })).sort((a,b) => b.count - a.count);

    return (
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Global Emotion Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={distData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {distData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={emotionColors[entry.name] || '#8884d8'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#333' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="chart-card">
          <h3>30-Day Emotion Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData.thirty_day_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="_id" stroke="#aaa" />
              <YAxis stroke="#aaa" />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#333' }} />
              <Line type="monotone" dataKey="count" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="chart-card full-width">
          <h3>Distortion Frequency</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={distFreqData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#aaa" />
              <YAxis stroke="#aaa" />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#333' }} />
              <Bar dataKey="count" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderMonitoringTab = () => {
    if (!monitoringData) return null;
    return (
      <div>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-title">Total Predictions</div>
            <div className="stat-value">{monitoringData.total_predictions}</div>
          </div>
          <div className="stat-card">
            <div className="stat-title">Average Confidence</div>
            <div className="stat-value">{(monitoringData.average_confidence * 100).toFixed(1)}%</div>
          </div>
          <div className="stat-card danger">
            <div className="stat-title">Low Confidence Queries</div>
            <div className="stat-value">{monitoringData.low_confidence_predictions.length}</div>
          </div>
        </div>
        
        <div className="admin-table-container">
          <h3>Low Confidence Predictions (&lt; 0.55)</h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Input Text</th>
                <th>Predicted Emotion</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {monitoringData.low_confidence_predictions.map(p => (
                <tr key={p._id}>
                  <td>{p.text}</td>
                  <td>{p.predicted_emotion}</td>
                  <td className="text-danger font-bold">{(p.confidence * 100).toFixed(1)}%</td>
                </tr>
              ))}
              {monitoringData.low_confidence_predictions.length === 0 && (
                <tr><td colSpan="3" style={{textAlign: 'center', padding: '2rem'}}>No low confidence predictions found. Model is performing well!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderActivityTab = () => {
    // Sort by last active descending
    const sortedUsers = [...usersData]
      .filter(u => u.last_active)
      .sort((a, b) => new Date(b.last_active) - new Date(a.last_active));
      
    // Append users who never activated at the bottom
    const neverActive = [...usersData].filter(u => !u.last_active);
    
    const combined = [...sortedUsers, ...neverActive];

    return (
      <div className="admin-table-container">
        <h3>User Activity Log</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Reflections</th>
              <th>Last Active Time</th>
            </tr>
          </thead>
          <tbody>
            {combined.map(u => (
              <tr key={u._id}>
                <td>{u.username}</td>
                <td>{u.total_predictions}</td>
                <td>{u.last_active ? new Date(u.last_active).toLocaleString() : 'Never'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h2>Global Command Center</h2>
        <p>Advanced system monitoring and administrative tools.</p>
      </div>
      
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <button className={`admin-sidebar-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Users</button>
          <button className={`admin-sidebar-btn ${activeTab === 'predictions' ? 'active' : ''}`} onClick={() => setActiveTab('predictions')}>All Predictions</button>
          <button className={`admin-sidebar-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>Analytics</button>
          <button className={`admin-sidebar-btn ${activeTab === 'monitoring' ? 'active' : ''}`} onClick={() => setActiveTab('monitoring')}>Model Monitoring</button>
          <button className={`admin-sidebar-btn ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>User Activity</button>
        </aside>
        
        <main className="admin-content">
          {loading ? (
            <div className="admin-loading">Loading system data...</div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'users' && renderUsersTab()}
              {activeTab === 'predictions' && renderPredictionsTab()}
              {activeTab === 'analytics' && renderAnalyticsTab()}
              {activeTab === 'monitoring' && renderMonitoringTab()}
              {activeTab === 'activity' && renderActivityTab()}
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Admin;
