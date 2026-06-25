import { useState, useEffect, useCallback } from 'react'
import type { Deck, Card } from './types'
import { Dashboard } from './components/Dashboard'
import { DeckEditor } from './components/DeckEditor'
import { StudySession } from './components/StudySession'
import { Profile } from './components/Profile'
import { ImportModal } from './components/ImportModal'
import { AuthScreen } from './components/AuthScreen'
import { SplashScreen } from './components/SplashScreen'

type ViewState = 'dashboard' | 'study' | 'edit' | 'profile'

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('flashmaster_token'))
  const [user, setUser] = useState<any>(null)
  const [decks, setDecks] = useState<Deck[]>([])
  const [view, setView] = useState<ViewState>('dashboard')
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showSplash, setShowSplash] = useState(true)
  
  // Profile stats
  const [studyHistory, setStudyHistory] = useState<string[]>([])
  const [streak, setStreak] = useState(0)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    if (!token) throw new Error('Not authenticated');
    
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(`${API_URL}${url}`, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
      handleLogout();
      throw new Error('Session expired');
    }
    
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return {};
    }
  }, [token]);

  const loadUserData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const profileData = await fetchWithAuth('/api/auth/me');
      setUser(profileData.user);
      setTheme(profileData.user.theme);
      setStudyHistory(profileData.studyHistory);
      calculateStreak(profileData.studyHistory);

      const decksData = await fetchWithAuth('/api/decks');
      setDecks(decksData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, token]);

  useEffect(() => {
    if (token) {
      loadUserData();
    } else {
      setLoading(false);
    }
  }, [token, loadUserData]);

  // Minimum splash screen duration (2 seconds)
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Apply Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const calculateStreak = (history: string[]) => {
    if (!history || history.length === 0) return setStreak(0);
    
    const sorted = [...new Set(history)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    let currentStreak = 0;
    let checkDate = new Date();
    checkDate.setHours(0,0,0,0);
    
    const firstDate = new Date(sorted[0]);
    firstDate.setHours(0,0,0,0);
    
    const diff = (checkDate.getTime() - firstDate.getTime()) / (1000 * 3600 * 24);
    if (diff > 1) {
      setStreak(0);
      return;
    }

    for (const dateStr of sorted) {
      const d = new Date(dateStr);
      d.setHours(0,0,0,0);
      if (d.getTime() === checkDate.getTime()) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (diff === 1 && currentStreak === 0) {
         checkDate.setDate(checkDate.getDate() - 1);
         if (d.getTime() === checkDate.getTime()) {
           currentStreak++;
           checkDate.setDate(checkDate.getDate() - 1);
         } else break;
      } else break;
    }
    setStreak(currentStreak);
  }

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    if (token) {
      await fetchWithAuth('/api/profile', { method: 'PUT', body: JSON.stringify({ theme: newTheme }) });
    }
  }

  const handleUpdateProfile = async (updates: { username?: string, pfp?: string }) => {
    setUser((prev: any) => ({ ...prev, ...updates }));
    await fetchWithAuth('/api/profile', { method: 'PUT', body: JSON.stringify(updates) });
  }

  const handleLogin = (newToken: string, newUser: any) => {
    localStorage.setItem('flashmaster_token', newToken);
    setToken(newToken);
    setUser(newUser);
    setTheme(newUser.theme);
  };

  const handleLogout = () => {
    localStorage.removeItem('flashmaster_token');
    setToken(null);
    setUser(null);
    setDecks([]);
    setView('dashboard');
  };

  const handleCreateDeck = async () => {
    const newDeck: Deck = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      name: 'New Deck',
      cards: [],
      tags: [],
      colorId: Math.floor(Math.random() * 5),
      createdAt: new Date().toISOString()
    }
    setDecks([...decks, newDeck])
    setActiveDeckId(newDeck.id)
    setView('edit')
    
    try {
      await fetchWithAuth('/api/decks', { method: 'POST', body: JSON.stringify(newDeck) });
    } catch (err) {
      console.error(err);
    }
  }

  const handleDeleteDeck = async (id: string) => {
    setDecks(decks.filter(d => d.id !== id))
    if (activeDeckId === id) {
      setActiveDeckId(null)
      setView('dashboard')
    }
    try {
      await fetchWithAuth(`/api/decks/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error(err);
    }
  }

  const handleSaveDeck = async (updatedDeck: Deck) => {
    setDecks(decks.map(d => d.id === updatedDeck.id ? updatedDeck : d));
    setView('dashboard');
    setActiveDeckId(null);

    try {
      await fetchWithAuth(`/api/decks/${updatedDeck.id}`, { method: 'PUT', body: JSON.stringify(updatedDeck) });
    } catch (err) {
      console.error(err);
    }
  }

  const handleImportDeck = async (name: string, cards: Card[], tags: string[]) => {
    const newDeck: Deck = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      name: name || 'Imported Deck',
      cards,
      tags,
      colorId: Math.floor(Math.random() * 5),
      createdAt: new Date().toISOString()
    };
    setDecks([...decks, newDeck]);

    try {
      await fetchWithAuth('/api/decks', { method: 'POST', body: JSON.stringify(newDeck) });
    } catch (err) {
      console.error(err);
    }
  }

  const handleFinishStudy = async () => {
    const today = new Date().toDateString();
    
    // Update local state first
    setDecks(decks.map(d => {
      if (d.id === activeDeckId) return { ...d, lastStudiedAt: new Date().toISOString() }
      return d
    }));
    setView('dashboard');
    setActiveDeckId(null);

    // Sync to backend
    try {
      if (!studyHistory.includes(today)) {
        setStudyHistory([...studyHistory, today]);
        calculateStreak([...studyHistory, today]);
        await fetchWithAuth('/api/study', { method: 'POST', body: JSON.stringify({ date: today }) });
      }
      
      const updatedDeck = decks.find(d => d.id === activeDeckId);
      if (updatedDeck) {
        await fetchWithAuth(`/api/decks/${activeDeckId}`, { 
          method: 'PUT', 
          body: JSON.stringify({ ...updatedDeck, lastStudiedAt: new Date().toISOString() }) 
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (loading || showSplash) {
    return <SplashScreen />
  }

  if (!token) {
    return <AuthScreen onLogin={handleLogin} />
  }

  const activeDeck = decks.find(d => d.id === activeDeckId)

  return (
    <div className="app-container">
      {/* Dynamic Header */}
      {view !== 'study' && (
        <header className="header">
          <div className="logo">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            Flash<span style={{ color: 'var(--primary)' }}>Master</span>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {view === 'dashboard' && (
              <button className="btn-icon-circle" onClick={() => setIsImportOpen(true)} title="Bulk Import">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              </button>
            )}
          </div>
        </header>
      )}

      <main className="main-content">
        {view === 'dashboard' && (
          <Dashboard 
            decks={decks} 
            onSelectDeck={(id, action) => {
              setActiveDeckId(id)
              setView(action)
            }}
            onDeleteDeck={handleDeleteDeck}
          />
        )}

        {view === 'edit' && activeDeck && (
          <DeckEditor 
            deck={activeDeck} 
            onSave={handleSaveDeck}
            onBack={() => { setView('dashboard'); setActiveDeckId(null); }}
            onDeleteDeck={() => handleDeleteDeck(activeDeck.id)}
          />
        )}

        {view === 'study' && activeDeck && (
          <StudySession 
            deck={activeDeck} 
            onFinish={handleFinishStudy}
            onBack={() => { setView('dashboard'); setActiveDeckId(null); }}
            toggleTheme={toggleTheme}
            theme={theme}
          />
        )}
        
        {view === 'profile' && (
          <Profile 
            user={user}
            streak={streak}
            studyHistory={studyHistory}
            theme={theme}
            toggleTheme={toggleTheme}
            onLogout={handleLogout}
            onUpdateProfile={handleUpdateProfile}
          />
        )}
      </main>

      {/* Bottom Nav - 3 Items */}
      <nav className="bottom-nav">
        <div className={`nav-item ${view === 'dashboard' || (view === 'edit' && !activeDeckId) ? 'active' : ''}`} onClick={() => { setView('dashboard'); setActiveDeckId(null); }}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
          Cards
        </div>
        
        <div className="nav-item special-add" onClick={handleCreateDeck}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
        </div>
        
        <div className={`nav-item ${view === 'profile' ? 'active' : ''}`} onClick={() => { setView('profile'); setActiveDeckId(null); }}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          Profile
        </div>
      </nav>

      <ImportModal 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)} 
        onImport={handleImportDeck} 
      />
    </div>
  )
}
