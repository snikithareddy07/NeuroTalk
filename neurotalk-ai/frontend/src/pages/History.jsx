import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import './History.css';

const emotionColors = {
  joy: "#facc15",
  sadness: "#3b82f6",
  anger: "#ef4444",
  fear: "#a855f7",
  love: "#ec4899",
  surprise: "#22c55e",
  neutral: "#94a3b8"
};

const emotionEmojis = {
  joy: "✨",
  sadness: "🌧️",
  anger: "🔥",
  fear: "🌪️",
  love: "💗",
  surprise: "🤯",
  neutral: "😐"
};

const ITEMS_PER_PAGE = 10;

const History = () => {
  const { token } = useAuth();
  const [historyData, setHistoryData] = [useState([]), useState([])][0]; // Quick destructuring fix below
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchAllHistory = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/predict/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecords(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to fetch history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    setActiveFilter('All');
    setCurrentPage(1);
    
    if (!searchTerm.trim()) {
      return fetchAllHistory();
    }

    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/predict/history/search?q=${encodeURIComponent(searchTerm)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecords(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Search failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = async (emotion) => {
    setActiveFilter(emotion);
    setSearchTerm('');
    setCurrentPage(1);

    if (emotion === 'All') {
      return fetchAllHistory();
    }

    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/predict/history/filter?emotion=${emotion.toLowerCase()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecords(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Filter failed.');
    } finally {
      setLoading(false);
    }
  };

  // Pagination Logic
  const totalPages = Math.ceil(records.length / ITEMS_PER_PAGE);
  const currentRecords = records.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const truncateText = (text, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="history-container">
      <div className="history-header">
        <h2>Your Reflection History 📚</h2>
        <p>Review past analyses to uncover long-term emotional patterns.</p>
      </div>

      <div className="history-controls global-card">
        <form onSubmit={handleSearch} className="search-bar">
          <input 
            type="text" 
            placeholder="Search your past thoughts..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit" className="search-btn">Search</button>
        </form>

        <div className="filter-buttons">
          {['All', 'Joy', 'Sadness', 'Anger', 'Fear', 'Love', 'Surprise'].map(emotion => (
            <button
              key={emotion}
              onClick={() => handleFilter(emotion)}
              className={`filter-btn ${activeFilter === emotion ? 'active' : ''}`}
            >
              {emotion}
            </button>
          ))}
        </div>
      </div>

      <div className="history-content">
        {loading ? (
          <div className="loading-spinner">Loading history...</div>
        ) : records.length === 0 ? (
          <div className="empty-history">
            <div className="empty-icon">📂</div>
            <p>No predictions found for this filter/search.</p>
          </div>
        ) : (
          <>
            <motion.div className="history-list" layout>
              <AnimatePresence>
                {currentRecords.map((record) => (
                  <motion.div 
                    key={record._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="history-card global-card"
                    style={{ borderLeftColor: emotionColors[record.predicted_emotion] || emotionColors.neutral }}
                  >
                    <div className="history-card-header">
                      <span 
                        className="emotion-badge" 
                        style={{ 
                          backgroundColor: `${emotionColors[record.predicted_emotion]}20` || `${emotionColors.neutral}20`,
                          color: emotionColors[record.predicted_emotion] || emotionColors.neutral,
                          border: `1px solid ${emotionColors[record.predicted_emotion]}40`
                        }}
                      >
                        {emotionEmojis[record.predicted_emotion]} {record.predicted_emotion.toUpperCase()}
                      </span>
                      <span className="history-date">
                        {formatDate(record.timestamp)}
                      </span>
                    </div>
                    
                    <div className="history-card-body">
                      "{truncateText(record.text, 100)}"
                    </div>
                    
                    <div className="history-card-footer">
                      <div className="confidence-wrapper">
                        <span className="confidence-label">Confidence:</span>
                        <div className="mini-confidence-bar">
                          <div 
                            className="mini-confidence-fill" 
                            style={{ 
                              width: `${record.confidence * 100}%`,
                              backgroundColor: emotionColors[record.predicted_emotion] || emotionColors.neutral
                            }}
                          ></div>
                        </div>
                        <span className="confidence-value">{(record.confidence * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="page-btn"
                >
                  Previous
                </button>
                <span className="page-indicator">
                  Page {currentPage} of {totalPages}
                </span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="page-btn"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default History;
