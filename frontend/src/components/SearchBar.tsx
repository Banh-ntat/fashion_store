import React from 'react';
import './SearchBar.css';

const SearchBar = () => {
  return (
    <div className="search-box">
      <input type="text" placeholder="Tìm kiếm quần áo..." />
      <button type="button">Tìm</button>
    </div>
  );
};

export default SearchBar;