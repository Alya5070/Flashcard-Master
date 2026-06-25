import React, { useState, useMemo } from 'react';
import type { Deck } from '../types';

interface DashboardProps {
  decks: Deck[];
  onSelectDeck: (deckId: string, action: 'study' | 'edit') => void;
  onDeleteDeck: (deckId: string) => void;
}

type SortOption = 'recent' | 'name' | 'size';

export const Dashboard: React.FC<DashboardProps> = ({ 
  decks, 
  onSelectDeck,
  onDeleteDeck
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    decks.forEach(d => d.tags.forEach(t => tags.add(t)));
    return ['All', 'Other', ...Array.from(tags)];
  }, [decks]);

  const filteredAndSortedDecks = useMemo(() => {
    let result = decks.filter(d => {
      const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = 
        activeFilter === 'All' ? true :
        activeFilter === 'Other' ? d.tags.length === 0 :
        d.tags.includes(activeFilter);
      
      return matchesSearch && matchesFilter;
    });

    result.sort((a, b) => {
      if (sortBy === 'recent') {
        const dateA = new Date(a.lastStudiedAt || a.createdAt).getTime();
        const dateB = new Date(b.lastStudiedAt || b.createdAt).getTime();
        return dateB - dateA;
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'size') {
        return b.cards.length - a.cards.length;
      }
      return 0;
    });

    return result;
  }, [decks, searchTerm, activeFilter, sortBy]);

  return (
    <div>
      <div className="search-bar" style={{ position: 'relative' }}>
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input 
          type="text" 
          placeholder="Search cards, topics..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        
        <button 
          style={{ background: 'transparent', border: 'none', color: showSortMenu ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
          onClick={() => setShowSortMenu(!showSortMenu)}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </button>

        {showSortMenu && (
          <div style={{
            position: 'absolute', right: '1rem', top: '3.5rem', 
            background: 'var(--bg-card)', border: '1px solid var(--border-color)', 
            borderRadius: 'var(--radius-md)', padding: '0.5rem',
            zIndex: 100, display: 'flex', flexDirection: 'column', gap: '0.25rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <button 
              style={{ padding: '0.5rem 1rem', background: sortBy === 'recent' ? 'var(--bg-input)' : 'transparent', border: 'none', textAlign: 'left', borderRadius: '4px', color: 'var(--text-main)', cursor: 'pointer' }}
              onClick={() => { setSortBy('recent'); setShowSortMenu(false); }}
            >
              Recent
            </button>
            <button 
              style={{ padding: '0.5rem 1rem', background: sortBy === 'name' ? 'var(--bg-input)' : 'transparent', border: 'none', textAlign: 'left', borderRadius: '4px', color: 'var(--text-main)', cursor: 'pointer' }}
              onClick={() => { setSortBy('name'); setShowSortMenu(false); }}
            >
              A-Z
            </button>
            <button 
              style={{ padding: '0.5rem 1rem', background: sortBy === 'size' ? 'var(--bg-input)' : 'transparent', border: 'none', textAlign: 'left', borderRadius: '4px', color: 'var(--text-main)', cursor: 'pointer' }}
              onClick={() => { setSortBy('size'); setShowSortMenu(false); }}
            >
              Size
            </button>
          </div>
        )}
      </div>

      <div className="filter-pills">
        {allTags.map(tag => {
          let count = 0;
          if (tag === 'All') count = decks.length;
          else if (tag === 'Other') count = decks.filter(d => d.tags.length === 0).length;
          else count = decks.filter(d => d.tags.includes(tag)).length;

          return (
            <button 
              key={tag}
              className={`pill ${activeFilter === tag ? 'active' : ''}`}
              onClick={() => setActiveFilter(tag)}
            >
              {tag} ({count})
            </button>
          )
        })}
      </div>

      <div className="deck-list" style={{ marginTop: '1rem' }}>
        {filteredAndSortedDecks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            No decks found. Try adjusting your filters.
          </div>
        ) : (
          filteredAndSortedDecks.map(deck => (
            <div 
              key={deck.id} 
              className={`deck-card gradient-${deck.colorId % 5}`}
              onClick={() => onSelectDeck(deck.id, 'study')}
            >
              <div className="deck-card-glow"></div>
              
              <div className="deck-card-content">
                <div className="deck-card-header">
                  <span className="deck-tag">
                    {deck.tags[0] || 'General'}
                  </span>
                  
                  <div style={{ display: 'flex', gap: '0.75rem', zIndex: 10 }}>
                    <button 
                      className="btn-icon-circle" 
                      style={{ width: '32px', height: '32px', border: 'none', background: 'transparent' }}
                      onClick={(e) => { e.stopPropagation(); onSelectDeck(deck.id, 'edit'); }}
                    >
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    </button>
                    <button 
                      className="btn-icon-circle" 
                      style={{ width: '32px', height: '32px', border: 'none', background: 'transparent' }}
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if(confirm('Delete deck?')) onDeleteDeck(deck.id); 
                      }}
                    >
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                </div>

                <div className="deck-title">{deck.name}</div>
                <div className="deck-subtitle">
                  {deck.cards.length} cards • Studied {deck.lastStudiedAt ? 'Recently' : '0 times'}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
