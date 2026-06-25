import React, { useState, useRef } from 'react';
import type { Card } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (deckName: string, cards: Card[], tags: string[]) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [deckName, setDeckName] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [delimiter, setDelimiter] = useState('auto'); // auto, tab, comma, semicolon
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const detectDelimiter = (text: string): string => {
    const lines = text.split('\n').filter(l => l.trim() !== '');
    if (lines.length === 0) return '\t';
    const firstLine = lines[0];
    
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount = (firstLine.match(/;/g) || []).length;

    if (tabCount > 0 && tabCount >= commaCount && tabCount >= semiCount) return '\t';
    if (commaCount > 0 && commaCount >= tabCount && commaCount >= semiCount) return ',';
    if (semiCount > 0 && semiCount >= tabCount && semiCount >= commaCount) return ';';

    return '\t'; // Fallback to Tab
  };

  const parseCSVLine = (text: string, delimiter: string) => {
    const parts = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (inQuotes && text[i+1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current);
    return parts;
  };

  const parseText = (text: string): Card[] => {
    const lines = text.split('\n');
    const parsedCards: Card[] = [];
    
    // Choose actual delimiter
    const actualDelimiter = delimiter === 'auto' ? detectDelimiter(text) : delimiter;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const parts = parseCSVLine(trimmed, actualDelimiter);
      if (parts.length >= 2) {
        const term = parts[0].trim();
        // If there are extra columns, join them back just in case, but usually it's just index 1
        const definition = parts.slice(1).join(actualDelimiter).trim();
        if (term && definition) {
          parsedCards.push({
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
            term,
            definition
          });
        }
      }
    });

    return parsedCards;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!deckName) {
      // Auto-set deck name to filename
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setDeckName(baseName);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) return;

      try {
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(result);
          // Expecting either { name: string, cards: [...] } or just card array
          if (Array.isArray(parsed)) {
            const cards = parsed.map((item: any) => ({
              id: item.id || crypto.randomUUID(),
              term: String(item.term || item.front || ''),
              definition: String(item.definition || item.back || ''),
              rating: item.rating
            })).filter(c => c.term && c.definition);
            
            if (cards.length > 0) {
              setPasteContent(cards.map(c => `${c.term}\t${c.definition}`).join('\n'));
              setErrorMsg('');
            } else {
              setErrorMsg('No valid term/definition pairs found in JSON array.');
            }
          } else if (parsed && Array.isArray(parsed.cards)) {
            if (parsed.name && !deckName) setDeckName(parsed.name);
            const cards = parsed.cards.map((item: any) => ({
              id: item.id || crypto.randomUUID(),
              term: String(item.term || item.front || ''),
              definition: String(item.definition || item.back || '')
            })).filter((c: any) => c.term && c.definition);

            setPasteContent(cards.map((c: any) => `${c.term}\t${c.definition}`).join('\n'));
            setErrorMsg('');
          } else {
            setErrorMsg('Invalid JSON structure. Needs array of cards or { name, cards } structure.');
          }
        } else {
          // Fallback to text reading (CSV, TXT)
          setPasteContent(result);
          setErrorMsg('');
        }
      } catch (err) {
        setErrorMsg('Error reading or parsing file: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = () => {
    if (!deckName.trim()) {
      setErrorMsg('Please enter a name for the Deck.');
      return;
    }

    if (!pasteContent.trim()) {
      setErrorMsg('Please paste content or select a file to import.');
      return;
    }

    const cards = parseText(pasteContent);
    if (cards.length === 0) {
      setErrorMsg('Could not parse any cards. Make sure terms and definitions are separated correctly.');
      return;
    }

    const tags = tagsText
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    onImport(deckName.trim(), cards, tags);
    
    // Reset state and close
    setDeckName('');
    setTagsText('');
    setPasteContent('');
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create or Import Set</h2>
          <button className="btn-icon" onClick={onClose}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="modal-body">
          {errorMsg && (
            <div style={{ color: 'var(--danger)', padding: '0.75rem', backgroundColor: 'var(--danger-light)', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.875rem' }}>
              {errorMsg}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Deck Name *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Spanish Vocabulary, AWS Exam Prep" 
              value={deckName}
              onChange={e => setDeckName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tags (separated by comma)</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. languages, vocabulary, intermediate" 
              value={tagsText}
              onChange={e => setTagsText(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="form-label">Delimiter</label>
              <select className="form-select" value={delimiter} onChange={e => setDelimiter(e.target.value)}>
                <option value="auto">Auto-detect</option>
                <option value="&#9;">Tab</option>
                <option value=",">Comma (,)</option>
                <option value=";">Semicolon (;)</option>
              </select>
            </div>
            
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="form-label">Or upload file <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(.txt, .csv, .json)</span></label>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ width: '100%', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'center', height: '42px', padding: '0 1rem' }}
                onClick={() => fileInputRef.current?.click()}
              >
                Choose File
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept=".txt,.csv,.json"
                onChange={handleFileUpload}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Paste Set Content (Term separated from Definition)</label>
            <textarea 
              className="form-textarea" 
              style={{ minHeight: '180px' }}
              placeholder={`Spanish Word[Tab/Comma]English Translation&#10;hola\thello&#10;adiós\tgoodbye`}
              value={pasteContent}
              onChange={e => setPasteContent(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleImportSubmit}>Create Deck</button>
        </div>
      </div>
    </div>
  );
};
