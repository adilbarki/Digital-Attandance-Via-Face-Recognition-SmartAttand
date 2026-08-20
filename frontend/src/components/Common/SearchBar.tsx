import React, { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './SearchBar.css';

interface SearchResult {
  id: string;
  name: string;
  email: string;
  role: string;
  roll_number?: string;
  teacher_id?: string;
  class?: string;
  section?: string;
}

const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.get(`/search/users?query=${encodeURIComponent(query)}`);
      setResults(response.data);
      setShowResults(true);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleResultClick = (result: SearchResult) => {
    toast.success(`${result.name} (${result.role})`);
    setShowResults(false);
    setQuery('');
  };

  return (
    <div className="search-container">
      <div className="search-input-wrapper">
        <input
          type="text"
          className="search-input"
          placeholder="🔍 Search by Name, Roll No, Email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button
          className="search-button"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? '...' : 'Search'}
        </button>
      </div>
      
      {showResults && results.length > 0 && (
        <div className="search-results">
          {results.map((result) => (
            <div
              key={result.id}
              className="search-result-item"
              onClick={() => handleResultClick(result)}
            >
              {result.role === 'student' ? (
                <>
                  <div className="search-result-name">{result.name}</div>
                  <div className="search-result-detail">
                    🎓 Student | Roll: {result.roll_number} | {result.email}
                  </div>
                  <div className="search-result-detail" style={{ fontSize: '11px', color: '#6b7280' }}>
                    Class: {result.class} | Section: {result.section}
                  </div>
                </>
              ) : (
                <>
                  <div className="search-result-name">{result.name}</div>
                  <div className="search-result-detail">
                    👨‍🏫 Teacher | ID: {result.teacher_id} | {result.email}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      
      {showResults && results.length === 0 && !loading && (
        <div className="search-empty">
          No results found for "{query}"
        </div>
      )}
    </div>
  );
};

export default SearchBar;