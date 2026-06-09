'use client';

export default function SkipLink() {
  return (
    <a 
      href="#main-content" 
      className="skip-link"
      style={{
        position: 'absolute',
        left: '-9999px',
        zIndex: 999,
        padding: '1rem',
        backgroundColor: '#003366',
        color: 'white',
        textDecoration: 'none',
        fontWeight: 'bold',
      }}
      onFocus={(e) => {
        e.currentTarget.style.left = '0';
        e.currentTarget.style.top = '0';
      }}
      onBlur={(e) => {
        e.currentTarget.style.left = '-9999px';
      }}
    >
      Saltar al contenido principal
    </a>
  );
}
