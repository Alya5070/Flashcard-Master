import React, { useState } from 'react';
import type { Deck, Card } from '../types';

interface DeckEditorProps {
  deck: Deck;
  onSave: (updatedDeck: Deck) => void;
  onBack: () => void;
  onDeleteDeck: () => void;
}

export const DeckEditor: React.FC<DeckEditorProps> = ({ deck, onSave, onBack, onDeleteDeck }) => {
  const [name, setName] = useState(deck.name);
  const [tags, setTags] = useState(deck.tags.join(', '));
  const [cards, setCards] = useState<Card[]>([...deck.cards]);
  
  // Single card editing state
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  
  // Form state for single card
  const [formTerm, setFormTerm] = useState('');
  const [formDefinition, setFormDefinition] = useState('');
  const [formError, setFormError] = useState(false);

  const handleOpenSingleEditor = (card?: Card) => {
    if (card) {
      setEditingCardId(card.id);
      setFormTerm(card.term);
      setFormDefinition(card.definition);
    } else {
      setEditingCardId('new');
      setFormTerm('');
      setFormDefinition('');
    }
    setFormError(false);
  };

  const handleSaveSingleCard = () => {
    if (!formTerm.trim() || !formDefinition.trim()) {
      setFormError(true);
      return;
    }

    if (editingCardId === 'new') {
      const newCard = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
        term: formTerm.trim(),
        definition: formDefinition.trim()
      };
      setCards([...cards, newCard]);
    } else {
      setCards(cards.map(c => 
        c.id === editingCardId 
          ? { ...c, term: formTerm.trim(), definition: formDefinition.trim() } 
          : c
      ));
    }
    setEditingCardId(null);
  };

  const handleDeleteCard = (id: string) => {
    setCards(cards.filter(c => c.id !== id));
    if (editingCardId === id) setEditingCardId(null);
  };

  const handleSaveDeck = () => {
    const validCards = cards.filter(c => c.term.trim() !== '' || c.definition.trim() !== '');
    onSave({
      ...deck,
      name: name.trim() || 'Untitled Deck',
      tags: tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
      cards: validCards
    });
  };

  // --- SINGLE CARD EDITOR VIEW ---
  if (editingCardId !== null) {
    const isNew = editingCardId === 'new';
    const cardIndex = isNew ? cards.length + 1 : cards.findIndex(c => c.id === editingCardId) + 1;
    
    return (
      <div style={{ paddingBottom: '2rem' }}>
        <div className="form-header">
          <button className="btn-icon-circle" onClick={() => setEditingCardId(null)} style={{ border: 'none', background: 'transparent' }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button 
            style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
            onClick={handleSaveSingleCard}
          >
            Done
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 className="form-title">{isNew ? 'Create Flashcard' : 'Edit Flashcard'}</h2>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Card #{cardIndex}</span>
        </div>

        {isNew && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Add a new card to your study deck
          </p>
        )}

        <div className="form-group">
          <label className="form-label">Question</label>
          <textarea 
            className={`form-textarea ${formError && !formTerm.trim() ? 'error' : ''}`}
            placeholder="Enter your question..."
            value={formTerm}
            onChange={e => { setFormTerm(e.target.value); setFormError(false); }}
          />
          {formError && !formTerm.trim() && (
            <div className="error-text">
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              Question is required
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Answer</label>
          <textarea 
            className={`form-textarea ${formError && !formDefinition.trim() ? 'error' : ''}`}
            placeholder="Enter the answer..."
            value={formDefinition}
            onChange={e => { setFormDefinition(e.target.value); setFormError(false); }}
          />
          {formError && !formDefinition.trim() && (
            <div className="error-text">
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              Answer is required
            </div>
          )}
        </div>

        <div className="form-group" style={{ marginTop: '2rem' }}>
          <label className="form-label" style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Category</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span className="deck-tag" style={{ border: '1px solid var(--primary)', color: 'var(--primary)', background: 'var(--bg-card)' }}>
              {tags.split(',')[0] || 'General'}
            </span>
          </div>
        </div>

        <div style={{ marginTop: '3rem' }}>
          <button className="btn btn-primary" onClick={handleSaveSingleCard}>
            {isNew ? 'Create Flashcard' : 'Update Flashcard'}
          </button>
          {!isNew && (
            <button className="btn btn-danger" onClick={() => handleDeleteCard(editingCardId)}>
              Delete Card
            </button>
          )}
        </div>
      </div>
    );
  }

  // --- BULK EDITOR VIEW ---
  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div className="form-header">
        <button className="btn-icon-circle" onClick={onBack} style={{ border: 'none', background: 'transparent' }}>
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button 
          style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
          onClick={handleSaveDeck}
        >
          Save Deck
        </button>
      </div>

      <div className="form-group">
        <label className="form-label">Deck Name</label>
        <input 
          type="text" 
          className="form-input" 
          value={name} 
          onChange={(e) => setName(e.target.value)}
          style={{ fontSize: '1.25rem', fontWeight: 600 }}
        />
      </div>
      <div className="form-group">
        <label className="form-label">Tags (comma separated)</label>
        <input 
          type="text" 
          className="form-input" 
          value={tags} 
          onChange={(e) => setTags(e.target.value)} 
          placeholder="e.g. Science, Biology"
        />
      </div>

      <div style={{ marginTop: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="form-title">Cards ({cards.length})</h3>
          <button 
            style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}
            onClick={() => handleOpenSingleEditor()}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
            Add Card
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {cards.map((card, index) => (
            <div 
              key={card.id} 
              style={{ 
                backgroundColor: 'var(--bg-card)', 
                borderRadius: 'var(--radius-lg)', 
                border: '1px solid var(--border-color)',
                padding: '1.25rem',
                cursor: 'pointer'
              }}
              onClick={() => handleOpenSingleEditor(card)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Card #{index + 1}</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-icon-circle" style={{ width: '28px', height: '28px', background: 'transparent', border: 'none' }} onClick={(e) => { e.stopPropagation(); handleDeleteCard(card.id); }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Question</div>
                  <div style={{ color: 'var(--text-main)', fontWeight: 500 }}>{card.term}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Answer</div>
                  <div style={{ color: 'var(--text-muted)' }}>{card.definition}</div>
                </div>
              </div>
            </div>
          ))}

          {cards.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-color)' }}>
              No cards yet. Click "Add Card" to create one.
            </div>
          )}
        </div>
      </div>
      
      <div style={{ marginTop: '3rem' }}>
        <button className="btn btn-danger" onClick={() => { if(confirm('Delete entire deck?')) onDeleteDeck(); }}>
          Delete Deck
        </button>
      </div>
    </div>
  );
};
