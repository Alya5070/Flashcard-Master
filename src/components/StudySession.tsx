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
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  // Tracking State
  const [isTracking, setIsTracking] = useState(true);
  const [knownCards, setKnownCards] = useState<string[]>([]);
  const [learningCards, setLearningCards] = useState<string[]>([]);
  const [history, setHistory] = useState<{index: number, known: string[], learning: string[]}[]>([]);
  const [roundFinished, setRoundFinished] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize deck and load progress
  useEffect(() => {
    if (deck && deck.cards.length > 0) {
      const saved = localStorage.getItem(`study_progress_${deck.id}`);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          setIsTracking(data.isTracking !== undefined ? data.isTracking : true);
          setKnownCards(data.knownCards || []);
          setLearningCards(data.learningCards || []);
          setCurrentIndex(data.currentIndex || 0);
          setRoundFinished(data.roundFinished || false);
          
          if (data.sessionCardIds && data.sessionCardIds.length > 0) {
            const restoredCards = data.sessionCardIds
              .map((id: string) => deck.cards.find((c: Card) => c.id === id))
              .filter(Boolean) as Card[];
            setCards(restoredCards.length > 0 ? restoredCards : deck.cards);
          } else {
            setCards(deck.cards);
          }
          setIsLoaded(true);
          return;
        } catch (e) {}
      }
      setCards(deck.cards);
      setIsLoaded(true);
    }
  }, [deck]);

  // Save progress
  useEffect(() => {
    if (!isLoaded) return;
    if (deck) {
      if (isTracking) {
        localStorage.setItem(`study_progress_${deck.id}`, JSON.stringify({
          isTracking, knownCards, learningCards, currentIndex, roundFinished,
          sessionCardIds: cards.map(c => c.id)
        }));
      } else {
        localStorage.removeItem(`study_progress_${deck.id}`);
      }
    }
  }, [isTracking, knownCards, learningCards, currentIndex, roundFinished, cards, deck, isLoaded]);

  const handleShuffle = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setHistory([]);
    setKnownCards([]);
    setLearningCards([]);
    setRoundFinished(false);
  };

  const saveHistory = () => {
    setHistory(prev => [...prev, { index: currentIndex, known: [...knownCards], learning: [...learningCards] }]);
  };

  const handleUndo = () => {
    if (history.length > 0) {
      const last = history[history.length - 1];
      setCurrentIndex(last.index);
      setKnownCards(last.known);
      setLearningCards(last.learning);
      setHistory(prev => prev.slice(0, -1));
      setDirection('left');
      setIsFlipped(false);
      setRoundFinished(false);
    }
  };

  const advanceCard = () => {
    if (currentIndex < cards.length - 1) {
      setDirection('right');
      setCurrentIndex(c => c + 1);
      setIsFlipped(false);
    } else {
      setRoundFinished(true);
    }
  };

  const handleMarkKnown = () => {
    saveHistory();
    const cardId = cards[currentIndex].id;
    if (!knownCards.includes(cardId)) {
      setKnownCards(prev => [...prev, cardId]);
    }
    setLearningCards(prev => prev.filter(id => id !== cardId));
    advanceCard();
  };

  const handleMarkLearning = () => {
    saveHistory();
    const cardId = cards[currentIndex].id;
    if (!learningCards.includes(cardId)) {
      setLearningCards(prev => [...prev, cardId]);
    }
    setKnownCards(prev => prev.filter(id => id !== cardId));
    advanceCard();
  };



  const startNextRound = () => {
    const remaining = deck.cards.filter(c => learningCards.includes(c.id));
    setCards(remaining);
    setCurrentIndex(0);
    setIsFlipped(false);
    setHistory([]);
    setKnownCards([]);
    setLearningCards([]);
    setRoundFinished(false);
  };

  const restartSession = () => {
    setCards(deck.cards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setHistory([]);
    setKnownCards([]);
    setLearningCards([]);
    setRoundFinished(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || roundFinished) return;
    const touchEnd = e.changedTouches[0].clientX;
    const distance = touchStart - touchEnd;
    
    if (distance > 50) {
      handleUndo(); // Swipe left goes BACK (Undo)
    } else if (distance < -50) {
      handleMarkKnown(); // Swipe right marks as KNOW (Next)
    }
    setTouchStart(null);
  };

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (roundFinished) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    if (x < rect.width * 0.25) {
      handleUndo(); // Tapping left goes BACK (Undo)
    } else if (x > rect.width * 0.75) {
      handleMarkKnown(); // Tapping right marks as KNOW (Next)
    } else {
      setIsFlipped(!isFlipped); // Tapping middle flips
    }
  };

  if (!cards.length) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>No cards in this deck.</div>;
  }

  const currentCard = cards[currentIndex];
  const progressPercent = roundFinished ? 100 : ((currentIndex) / cards.length) * 100;

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

      {/* Header showing Still Learning / Know counts */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f97316', fontWeight: 600 }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #f97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {learningCards.length}
          </div>
          Still learning
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#10b981', fontWeight: 600 }}>
          Know
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {knownCards.length}
          </div>
        </div>
      </div>
      
      <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
      </div>

      {roundFinished ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '2rem', padding: '2rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', minHeight: '45vh' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', textAlign: 'center' }}>
            {learningCards.length > 0 ? "You're making progress!" : "Congratulations! You know them all!"}
          </div>
          
          <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '3px solid #f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, color: '#f97316' }}>
                {learningCards.length}
              </div>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Still learning</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '3px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>
                {knownCards.length}
              </div>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Know</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '300px', marginTop: '1rem' }}>
            {learningCards.length > 0 ? (
              <button className="btn btn-primary" onClick={startNextRound}>
                Study remaining {learningCards.length} cards
              </button>
            ) : (
              <button className="btn btn-primary" onClick={restartSession}>
                Study again
              </button>
            )}
            {learningCards.length > 0 && (
              <button className="btn btn-secondary" onClick={restartSession} style={{ padding: '0.75rem' }}>
                Restart entire deck
              </button>
            )}
            <button className="btn btn-glass" onClick={onFinish} style={{ border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '0.75rem' }}>
              Finish session & exit
            </button>
          </div>
        </div>
      ) : (
        <>
          <div 
            key={currentIndex}
            className={`study-card gradient-${deck.colorId % 5} slide-in-${direction}`}
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

          <div className="study-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 0.5rem', gap: '0.5rem' }}>
            {/* Left Side: Toggle (purely controls saving progress to localStorage) */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => setIsTracking(!isTracking)}>
                <span className="hide-on-mobile" style={{ fontSize: '0.9rem', fontWeight: 600, color: isTracking ? 'var(--text-main)' : 'var(--text-muted)' }}>Track progress</span>
                <div style={{ 
                  width: '36px', height: '20px', borderRadius: '10px', flexShrink: 0,
                  backgroundColor: isTracking ? 'var(--primary)' : 'var(--bg-input)', 
                  border: isTracking ? 'none' : '1px solid var(--border-color)',
                  position: 'relative', transition: '0.2s' 
                }}>
                  <div style={{ 
                    width: '16px', height: '16px', borderRadius: '50%', backgroundColor: isTracking ? '#fff' : 'var(--text-muted)', 
                    position: 'absolute', top: isTracking ? '2px' : '1px', left: isTracking ? '18px' : '2px', transition: '0.2s' 
                  }}></div>
                </div>
              </div>
            </div>

            {/* Middle: Actions (X / Check) */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button 
                className="btn-icon-circle" 
                onClick={handleMarkLearning}
                style={{ backgroundColor: 'var(--bg-input)', color: '#f97316', width: '56px', height: '56px', border: '1px solid var(--border-color)', flexShrink: 0 }}
              >
                <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <button 
                className="btn-icon-circle" 
                onClick={handleMarkKnown}
                style={{ backgroundColor: 'var(--bg-input)', color: '#10b981', width: '56px', height: '56px', border: '1px solid var(--border-color)', flexShrink: 0 }}
              >
                <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </button>
            </div>

            {/* Right Side: Extras (Undo / Shuffle) */}
            <div style={{ flex: 1, display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn-icon-circle" onClick={handleUndo} title="Undo" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', width: '36px', height: '36px', flexShrink: 0 }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
              </button>
              <button className="btn-icon-circle" onClick={handleShuffle} title="Shuffle Cards" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', width: '36px', height: '36px', flexShrink: 0 }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>
              </button>
            </div>
          </div>
        </>
      )}
      
    </div>
  );
};
