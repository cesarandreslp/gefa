'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function GovCoTopBar() {
  return (
    <div
      className="gov-co-top-bar"
      style={{
        backgroundColor: '#3366CC', // Azul oficial base de gov.co
        width: '100%',
        height: '32px',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: '0 2rem',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <Link 
        href="https://www.gov.co" 
        target="_blank" 
        rel="noopener noreferrer"
        aria-label="Ir al portal oficial del Estado Colombiano"
        style={{ display: 'flex', alignItems: 'center', height: '100%' }}
      >
        <Image
          src="/gov.co.png"
          alt="Logo Gov.co"
          width={80}
          height={20}
          style={{ objectFit: 'contain' }}
          priority
        />
      </Link>
    </div>
  );
}
