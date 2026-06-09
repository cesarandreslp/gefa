'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Printer, RotateCw, Search } from 'lucide-react';

export default function ImprimirRadicadoPage() {
  const router = useRouter();

  const [radicadoNumber, setRadicadoNumber] = useState('');
  const [radicadoInfo, setRadicadoInfo] = useState<{
    numero: string;
    fecha: string;
    hora: string;
    remitente: string;
    destinoInterno: string;
    folios: number;
  } | null>(null);
  const [stickerPosition, setStickerPosition] = useState({ x: 50, y: 50 }); // en mm
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isVertical, setIsVertical] = useState(false);
  const [manualFolios, setManualFolios] = useState<string>('');

  const sheetRef = useRef<HTMLDivElement>(null);
  const stickerRef = useRef<HTMLDivElement>(null);

  // Tamaños reales
  const SHEET_WIDTH_MM = 216;
  const SHEET_HEIGHT_MM = 279;
  const STICKER_WIDTH_MM = isVertical ? 25 : 100;
  const STICKER_HEIGHT_MM = isVertical ? 100 : 25;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (stickerRef.current) {
      const rect = stickerRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && sheetRef.current) {
      const sheetRect = sheetRef.current.getBoundingClientRect();

      // Calcular posición en píxeles relativa a la hoja
      const xPx = e.clientX - sheetRect.left - dragOffset.x;
      const yPx = e.clientY - sheetRect.top - dragOffset.y;

      // Convertir usando el tamaño real renderizado de la hoja
      // Si la hoja de 216mm ocupa sheetRect.width píxeles, entonces:
      // 1mm = sheetRect.width / 216 píxeles
      const pxPerMmX = sheetRect.width / SHEET_WIDTH_MM;
      const pxPerMmY = sheetRect.height / SHEET_HEIGHT_MM;

      let xMm = xPx / pxPerMmX;
      let yMm = yPx / pxPerMmY;

      // Aplicar límites para mantener el sticker dentro de la hoja
      // Límite izquierdo
      xMm = Math.max(0, xMm);
      // Límite derecho (ancho de la hoja - ancho del sticker)
      xMm = Math.min(SHEET_WIDTH_MM - STICKER_WIDTH_MM, xMm);
      // Límite superior
      yMm = Math.max(0, yMm);
      // Límite inferior (alto de la hoja - alto del sticker)
      yMm = Math.min(SHEET_HEIGHT_MM - STICKER_HEIGHT_MM, yMm);

      setStickerPosition({
        x: xMm,
        y: yMm
      });
    }
  }, [isDragging, dragOffset, STICKER_WIDTH_MM, STICKER_HEIGHT_MM]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);


  const toggleOrientation = () => {
    setIsVertical(!isVertical);
  };

  // Autocarga de radicado si viene por la URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const radicadoUrl = urlParams.get('radicado');
      if (radicadoUrl) {
        setRadicadoNumber(radicadoUrl);
        handleBuscar(radicadoUrl);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBuscar = async (codigo?: string | React.MouseEvent) => {
    const searchCode = typeof codigo === 'string' ? codigo : radicadoNumber;
    if (!searchCode.trim()) {
      alert('Por favor ingrese un número de radicado');
      return;
    }

    try {
      // Buscar el radicado en la base de datos
      const response = await fetch(`/api/v1/casos/radicado/${searchCode}`);

      if (response.ok) {
        const result = await response.json();

        // El endpoint devuelve { success: true, data: { ... } }
        if (result.success && result.data) {
          const { fechaRadicacion, ciudadano, asignado, folios } = result.data;

          // Formatear fecha y hora
          const fecha = new Date(fechaRadicacion);
          const fechaStr = fecha.toLocaleDateString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          const horaStr = fecha.toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }).replace(/([ap])\.\s+([m])\./g, '$1.$2.');

          setRadicadoInfo({
            numero: searchCode,
            fecha: fechaStr,
            hora: horaStr,
            remitente: ciudadano || 'No especificado',
            destinoInterno: asignado || 'Sin asignar',
            folios: folios || 0
          });
          setManualFolios(folios && folios > 0 ? folios.toString() : '');
        } else {
          alert('Radicado no encontrado');
        }
      } else {
        alert('Radicado no encontrado');
      }
    } catch (error) {
      console.error('Error al buscar radicado:', error);
      alert('Error al buscar el radicado');
    }
  };

  const handlePrint = () => {
    if (!radicadoInfo) {
      alert('Por favor busque un radicado antes de imprimir');
      return;
    }

    // Crear una ventana nueva con SOLO el contenido a imprimir
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Imprimir Radicado</title>
          <style>
            @page {
              size: letter portrait;
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            html, body {
              width: 216mm;
              height: 279mm;
              margin: 0;
              padding: 0;
              background: white;
            }
            .sheet {
              width: 216mm;
              height: 279mm;
              position: relative;
              background: white;
            }
            .sticker {
              position: absolute;
              left: ${isVertical ? stickerPosition.x - 37.5 : stickerPosition.x}mm;
              top: ${isVertical ? stickerPosition.y + 37.5 : stickerPosition.y}mm;
              width: 100mm;
              height: 25mm;
              border: 0.5mm solid #000;
              border-radius: 1mm;
              background: white;
              display: flex;
              align-items: center;
              justify-content: center;
              transform: ${isVertical ? 'rotate(90deg)' : 'none'};
              transform-origin: center center;
            }
            .content {
              display: flex;
              flex-direction: column;
              align-items: flex-start;
              justify-content: center;
              gap: 0.5mm;
              width: 100%;
              height: 100%;
              padding: 2mm;
            }
            .linea {
              font-size: 8pt;
              font-weight: 400;
              color: #000;
              font-family: Arial, sans-serif;
              text-align: left;
              line-height: 1.1;
              white-space: nowrap;
              max-width: 100%;
            }
            .bold {
              font-weight: 700;
            }
            .small {
              font-size: 7pt;
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="sticker">
              <div class="content">
                <div class="linea">
                  <span class="bold">RADICADO:</span> ${radicadoInfo.numero} 
                  <span class="bold">FECHA:</span> ${radicadoInfo.fecha} 
                  <span class="bold">HORA:</span> ${radicadoInfo.hora}
                </div>
                <div class="linea">
                  <span class="bold">REMITENTE:</span> ${radicadoInfo.remitente}
                </div>
                <div class="linea">
                  <span class="bold">SERIE DOCUMENTO:</span> COMUNICACIONES
                </div>
                <div class="linea">
                  <span class="bold">DESTINO INTERNO:</span> ${radicadoInfo.destinoInterno}
                </div>
                <div class="linea small">
                  <span class="bold">ENTIDAD MUNICIPAL DE CIUDAD Nit: 815000290-6 FOLIOS: ${manualFolios || '_______'}</span>
                </div>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 100);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '2rem' }}>
      {/* Controles (no se imprimen) */}
      <div className="no-print" style={{ maxWidth: '900px', margin: '0 auto 2rem' }}>
        <button
          onClick={() => router.back()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            cursor: 'pointer',
            marginBottom: '1rem'
          }}
        >
          <ArrowLeft size={16} />
          Volver
        </button>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          marginBottom: '1.5rem'
        }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
            Impresión de Radicado
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            Arrastra el sticker a la posición deseada en la hoja y presiona imprimir.
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={toggleOrientation}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                backgroundColor: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <RotateCw size={16} />
              {isVertical ? 'Horizontal' : 'Vertical'}
            </button>

            <button
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <Printer size={16} />
              Imprimir Radicado
            </button>

            <input
              type="text"
              value={radicadoNumber}
              onChange={(e) => setRadicadoNumber(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleBuscar()}
              placeholder="Número de radicado..."
              style={{
                padding: '0.75rem 1rem',
                fontSize: '0.875rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                width: '250px',
                fontFamily: 'monospace'
              }}
            />

            <button
              onClick={handleBuscar}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <Search size={16} />
              Buscar
            </button>

          </div>
        </div>
      </div>

      {/* Hoja de impresión - Vista en pantalla */}
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <div
          ref={sheetRef}
          style={{
            width: `${SHEET_WIDTH_MM}mm`,
            height: `${SHEET_HEIGHT_MM}mm`,
            backgroundColor: 'white',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            position: 'relative',
            cursor: isDragging ? 'grabbing' : 'default'
          }}
        >
          {/* Sticker arrastrable */}
          <div
            ref={stickerRef}
            onMouseDown={handleMouseDown}
            style={{
              position: 'absolute',
              left: `${stickerPosition.x}mm`,
              top: `${stickerPosition.y}mm`,
              width: `${STICKER_WIDTH_MM}mm`,
              height: `${STICKER_HEIGHT_MM}mm`,
              cursor: isDragging ? 'grabbing' : 'grab',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            className="sticker-preview"
          >
            {radicadoInfo && (
              <div style={{
                width: '100mm',
                height: '25mm',
                border: `0.5mm solid #000`,
                borderRadius: `1mm`,
                backgroundColor: 'white',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'center',
                padding: '2mm',
                gap: '0.5mm',
                transform: isVertical ? 'rotate(90deg)' : 'none',
                transformOrigin: 'center center'
              }}>
                <div style={{
                  fontWeight: '400',
                  color: '#000',
                  fontFamily: 'Arial, sans-serif',
                  textAlign: 'left',
                  fontSize: '8pt',
                  lineHeight: '1.1',
                  whiteSpace: 'nowrap'
                }}>
                  <span style={{ fontWeight: '700' }}>RADICADO:</span> {radicadoInfo.numero}{' '}
                  <span style={{ fontWeight: '700' }}>FECHA:</span> {radicadoInfo.fecha}{' '}
                  <span style={{ fontWeight: '700' }}>HORA:</span> {radicadoInfo.hora}
                </div>
                <div style={{
                  fontWeight: '400',
                  color: '#000',
                  fontFamily: 'Arial, sans-serif',
                  textAlign: 'left',
                  fontSize: '8pt',
                  lineHeight: '1.1',
                  whiteSpace: 'nowrap'
                }}>
                  <span style={{ fontWeight: '700' }}>REMITENTE:</span> {radicadoInfo.remitente}
                </div>
                <div style={{
                  fontWeight: '400',
                  color: '#000',
                  fontFamily: 'Arial, sans-serif',
                  textAlign: 'left',
                  fontSize: '8pt',
                  lineHeight: '1.1',
                  whiteSpace: 'nowrap'
                }}>
                  <span style={{ fontWeight: '700' }}>SERIE DOCUMENTO:</span> COMUNICACIONES
                </div>
                <div style={{
                  fontWeight: '400',
                  color: '#000',
                  fontFamily: 'Arial, sans-serif',
                  textAlign: 'left',
                  fontSize: '8pt',
                  lineHeight: '1.1',
                  whiteSpace: 'nowrap'
                }}>
                  <span style={{ fontWeight: '700' }}>DESTINO INTERNO:</span> {radicadoInfo.destinoInterno}
                </div>
                <div style={{
                  fontWeight: '700',
                  color: '#000',
                  fontFamily: 'Arial, sans-serif',
                  textAlign: 'left',
                  fontSize: '7pt',
                  lineHeight: '1.1',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px'
                }}>
                  ENTIDAD MUNICIPAL DE CIUDAD Nit: 815000290-6 FOLIOS:{' '}
                  <input
                    type="text"
                    value={manualFolios}
                    onChange={(e) => setManualFolios(e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()} // Evita que se inicie el arrastre al hacer clic en el input
                    placeholder="_______"
                    style={{
                      border: 'none',
                      background: 'white',
                      fontFamily: 'inherit',
                      fontSize: 'inherit',
                      fontWeight: 'inherit',
                      color: 'inherit',
                      width: '40px',
                      padding: 0,
                      margin: 0,
                      outline: '1px dashed #ccc' // Ligero marco para que sepan que es editable
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
