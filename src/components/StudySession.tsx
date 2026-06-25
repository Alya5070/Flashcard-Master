import React, { useState, useEffect } from 'react';
import type { Deck, Card } from '../types';

interface StudySessionProps {
  deck: Deck;
  onFinish: () => void;
  onBack: () => void;
  toggleTheme: () => void;
  theme: 'light' | 'dark';
}

export const StudySession: React.FC<StudySessionProps> = ({ deck, onFinish, onBack, toggleTheme, theme }) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // Initialize deck
  useEffect(() => {
    if (deck && deck.cards.length > 0) {
      setCards(deck.cards);
    }
  }, [deck]);

  const handleShuffle = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(c => c + 1);
      setIsFlipped(false);
    } else {
      onFinish();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(c => c - 1);
      setIsFlipped(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const touchEnd = e.changedTouches[0].clientX;
    const distance = touchStart - touchEnd;
    
    if (distance > 50) {
      handleNext(); // Swiped left
    } else if (distance < -50) {
      handlePrev(); // Swiped right
    }
    setTouchStart(null);
  };

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // Tap left 25% for previous, right 25% for next, middle 50% for flip
    if (x < rect.width * 0.25) {
      handlePrev();
    } else if (x > rect.width * 0.75) {
      handleNext();
    } else {
      setIsFlipped(!isFlipped);
    }
  };

  if (!cards.length) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>No cards in this deck.</div>;
  }

  const currentCard = cards[currentIndex];
  const progressPercent = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      
      {/* Header overrides for Study Mode specifically */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <button className="btn-icon-circle" onClick={onBack} style={{ border: 'none', background: 'transparent' }}>
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
          <div className="logo-icon" style={{ width: '20px', height: '20px', padding: '2px', borderRadius: '4px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          Flash<span style={{ color: 'var(--primary)' }}>Master</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-icon-circle" onClick={toggleTheme}>
            {theme === 'light' ? (
               <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
            ) : (
               <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            )}
          </button>
        </div>
      </div>

      <div className="study-progress">
        <span>Session Progress</span>
        <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{currentIndex + 1} / {cards.length}</span>
      </div>
      
      <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
      </div>

      <div 
        className={`study-card gradient-${deck.colorId % 5}`}
        onClick={handleCardClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <div className="study-card-glow"></div>
        
        <div className="study-card-header">
          <span className="deck-tag" style={{ border: '1px solid var(--grad-color)' }}>
            {deck.tags[0] || 'General'}
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {isFlipped ? 'Answer' : 'Question'}
          </span>
        </div>

        <div className="study-card-body">
          <div className="study-card-text">
            {isFlipped ? currentCard.definition : currentCard.term}
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <button 
            className="btn btn-glass" 
            onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }}
          >
            {isFlipped ? (
              <>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ marginRight: '0.5rem' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Flip Back
              </>
            ) : (
              <>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ marginRight: '0.5rem' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Show Answer
              </>
            )}
          </button>
        </div>
      </div>

      <div className="study-controls">
        <button 
          className="study-nav-btn" 
          onClick={handlePrev} 
          disabled={currentIndex === 0}
          style={{ opacity: currentIndex === 0 ? 0.5 : 1 }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>

        <button 
          className="btn-icon-circle" 
          onClick={handleShuffle} 
          title="Shuffle Cards" 
          style={{ backgroundColor: 'var(--bg-card)', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <polyline points="16 3 21 3 21 8"></polyline>
            <line x1="4" y1="20" x2="21" y2="3"></line>
            <polyline points="21 16 21 21 16 21"></polyline>
            <line x1="15" y1="15" x2="21" y2="21"></line>
            <line x1="4" y1="4" x2="9" y2="9"></line>
          </svg>
        </button>
        
        <button 
          className="study-nav-btn" 
          onClick={handleNext}
        >
          {currentIndex === cards.length - 1 ? 'Finish' : 'Next'}
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      
    </div>
  );
};
