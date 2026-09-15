import QRCode from 'qrcode';

/**
 * Generador estándar de código QR en SVG vectorial para Hotel Wimbledon.
 * Cumple con el estándar ISO/IEC 18004 (Reed-Solomon, ECC M) para legibilidad
 * inmediata en cámaras de smartphones y lectores ópticos 2D.
 */
export function generateQRCodeSVG(text, options = {}) {
  const size = options.size || 220;
  const darkColor = options.darkColor || '#0a0d14';
  const lightColor = options.lightColor || '#ffffff';
  const accentColor = options.accentColor || '#d97706';
  const rounded = options.rounded !== false;

  // Generación estándar Reed-Solomon ISO/IEC 18004 con nivel de corrección M
  const qr = QRCode.create(String(text || 'WIMBLEDON-ACCESS'), { errorCorrectionLevel: 'M' });
  const matrixSize = qr.modules.size;
  const moduleSize = size / matrixSize;
  const radius = rounded ? moduleSize * 0.25 : 0;
  let paths = '';

  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (qr.modules.get(r, c)) {
        const x = c * moduleSize;
        const y = r * moduleSize;
        const isCornerFinder =
          (r < 7 && c < 7) ||
          (r < 7 && c >= matrixSize - 7) ||
          (r >= matrixSize - 7 && c < 7);

        const color = isCornerFinder ? accentColor : darkColor;

        if (rounded) {
          paths += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${(moduleSize * 0.98).toFixed(2)}" height="${(moduleSize * 0.98).toFixed(2)}" rx="${radius.toFixed(2)}" fill="${color}" />`;
        } else {
          paths += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${moduleSize.toFixed(2)}" height="${moduleSize.toFixed(2)}" fill="${color}" />`;
        }
      }
    }
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="wimbledon-qr-svg" style="border-radius: 12px; background: ${lightColor}; padding: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
      <rect width="100%" height="100%" fill="${lightColor}" rx="12" />
      ${paths}
    </svg>
  `.trim();
}
