import { useEffect, useState } from 'react';

export function LCP() {
  const [showLCP, setShowLCP] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLCP(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (!showLCP) return null;

  return (
    <div
      style={{
        width: '800px',
        height: '600px',
        backgroundColor: '#4A90E2',
        margin: '20px auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        color: 'white'
      }}
    >
      Large Content Block - Triggering LCP
    </div>
  );
}
