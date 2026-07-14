import React, { createContext, useContext, useState } from 'react';

const SearchContext = createContext();

export const SearchProvider = ({ children }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const openSearch = () => setSearchOpen(true);
  const closeSearch = () => {
    setSearchOpen(false);
    setSearchTerm('');
    setSearchResults([]);
  };

  return (
    <SearchContext.Provider value={{
      searchOpen,
      searchResults,
      searchTerm,
      setSearchTerm,
      setSearchResults,
      openSearch,
      closeSearch
    }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within SearchProvider');
  }
  return context;
};