import React from 'react';

export const SplashScreen: React.FC = () => {
  return (
    <div className="splash-screen">
      <div className="moving-gradient"></div>
      <div className="moving-gradient alt"></div>
      
      <div className="splash-content">
        <div className="splash-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
        <h1 className="splash-title">Flash <span style={{ color: 'white' }}>Master</span></h1>
        <p className="splash-subtitle">Your simple way to master anything.</p>
      </div>
    </div>
  );
};
