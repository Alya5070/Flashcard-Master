export interface Card {
  id: string;
  term: string;
  definition: string;
  rating?: 'easy' | 'medium' | 'hard';
  lastReviewed?: string;
}

export interface Deck {
  id: string;
  name: string;
  description?: string;
  cards: Card[];
  tags: string[];
  colorId: number; // 0-4 for gradient themes
  createdAt: string;
  lastStudiedAt?: string;
}

export type StudyMode = 'flip' | 'quiz' | 'match';

export interface StudySessionState {
  deckId: string;
  mode: StudyMode;
  currentCardIndex: number;
  isFlipped: boolean;
  shuffledCards: Card[];
  quizAnswers: { [cardId: string]: string };
  quizResults: { [cardId: string]: boolean };
  quizSubmitted: boolean;
  matchCards: MatchCard[];
  matchSelectedId: string | null;
  matchTimer: number;
  matchActive: boolean;
  matchFinished: boolean;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
}

export interface MatchCard {
  id: string; // Unique UI ID (since terms and definitions are split)
  cardId: string; // References the actual Card ID
  text: string;
  type: 'term' | 'definition';
  isMatched: boolean;
  isSelected: boolean;
}
