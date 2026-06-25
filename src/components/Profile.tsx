import React, { useState, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';

interface ProfileProps {
  user: any;
  streak: number;
  studyHistory: string[];
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onLogout: () => void;
  onUpdateProfile: (updates: { username?: string, theme?: string, pfp?: string }) => void;
}

export const Profile: React.FC<ProfileProps> = ({ user, streak, studyHistory, theme, toggleTheme, onLogout, onUpdateProfile }) => {
  const [userName, setUserName] = useState(user?.username || 'Student');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Crop state
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserName(e.target.value);
  };

  const saveName = () => {
    if (userName.trim() && userName !== user.username) {
      onUpdateProfile({ username: userName.trim() });
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageToCrop(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so the same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<string> => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => { image.onload = resolve; });

    const canvas = document.createElement('canvas');
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2d context');

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return canvas.toDataURL('image/jpeg');
  };

  const handleCropSubmit = async () => {
    if (imageToCrop && croppedAreaPixels) {
      try {
        const croppedImageBase64 = await getCroppedImg(imageToCrop, croppedAreaPixels);
        onUpdateProfile({ pfp: croppedImageBase64 });
        setImageToCrop(null); // Close modal
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Generate last 7 days
  const today = new Date();
  const last7Days = Array.from({length: 7}).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <h2 className="form-title" style={{ marginBottom: '2rem' }}>Profile</h2>
      
      {/* Profile Info */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem' }}>
        <div 
          onClick={() => fileInputRef.current?.click()}
          style={{ 
            width: '100px', height: '100px', borderRadius: '50%', 
            backgroundColor: 'var(--primary-light)', display: 'flex', 
            alignItems: 'center', justifyContent: 'center',
            marginBottom: '1rem',
            color: 'var(--primary)', fontSize: '2.5rem', fontWeight: 800,
            cursor: 'pointer', overflow: 'hidden', position: 'relative'
          }}
          title="Click to change profile picture"
        >
          {user?.pfp ? (
            <img src={user.pfp} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            userName.charAt(0).toUpperCase()
          )}
          
          <div style={{
            position: 'absolute', bottom: 0, width: '100%', height: '30%', 
            background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center'
          }}>
            <svg width="16" height="16" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </div>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*"
          onChange={handleImageSelect}
        />
        
        <input 
          type="text" 
          value={userName} 
          onChange={handleNameChange}
          onBlur={saveName}
          onKeyDown={e => e.key === 'Enter' && saveName()}
          style={{ 
            background: 'transparent', border: 'none', 
            textAlign: 'center', fontSize: '1.5rem', 
            fontWeight: 700, color: 'var(--text-main)', 
            outline: 'none', borderBottom: '2px dashed var(--border-color)',
            width: '200px'
          }}
          placeholder="Your Name"
        />
      </div>

      {/* Streak Section */}
      <div className="form-group" style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Study Streak</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Keep it burning!</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: streak > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
            <svg width="32" height="32" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.5 13c0 2.5-1.5 5.5-5.5 5.5s-5.5-3-5.5-5.5c0-4.5 4.5-6.5 4.5-10.5 0 2 2 3.5 3.5 5.5s3 3 3 5.5z"/>
            </svg>
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{streak}</span>
          </div>
        </div>

        {/* Weekly Calendar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
          {last7Days.map((date, i) => {
            const isStudied = studyHistory.includes(date.toDateString());
            const isToday = i === 6;
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {daysOfWeek[date.getDay()]}
                </span>
                <div style={{ 
                  width: '32px', height: '32px', borderRadius: '50%',
                  backgroundColor: isStudied ? '#f59e0b' : 'var(--bg-input)',
                  color: isStudied ? '#fff' : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: isToday && !isStudied ? '2px dashed var(--border-color)' : 'none',
                  boxShadow: isStudied ? '0 4px 10px rgba(245, 158, 11, 0.3)' : 'none'
                }}>
                  {isStudied && (
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17l-4.17-4.17-1.42 1.41 5.59 5.59 12-12-1.41-1.41z"/>
                    </svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Settings Options */}
      <h3 className="form-title" style={{ marginTop: '3rem', marginBottom: '1rem' }}>App Settings</h3>
      <div className="form-group" style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600 }}>Dark Mode</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Toggle application theme</div>
          </div>
          <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem 1rem' }} onClick={toggleTheme}>
            {theme === 'dark' ? 'Disable' : 'Enable'}
          </button>
        </div>
        
        <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.5rem 0' }}></div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600 }}>Account</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sign out of your session</div>
          </div>
          <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem 1rem', borderColor: 'var(--text-muted)', color: 'var(--text-muted)' }} onClick={onLogout}>
            Log Out
          </button>
        </div>
      </div>

      {/* Crop Modal */}
      {imageToCrop && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', height: '500px', overflow: 'hidden' }}>
            <div className="modal-header">
              <h2>Crop Image</h2>
              <button className="btn-icon" onClick={() => setImageToCrop(null)}>
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            
            <div style={{ position: 'relative', flex: 1, backgroundColor: '#000' }}>
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            
            <div className="modal-footer" style={{ padding: '1rem' }}>
              <input 
                type="range" 
                value={zoom} 
                min={1} 
                max={3} 
                step={0.1}
                onChange={(e) => setZoom(Number(e.target.value))}
                style={{ flex: 1, marginRight: '1rem' }}
              />
              <button className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} onClick={handleCropSubmit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
