import { describe, expect, it } from 'vitest';
import { MAX_DOCUMENT_BYTES, checkPdf, formatSize } from './documents';

describe('planning PDF', () => {
  it('accepte uniquement des PDF non vides de taille raisonnable', () => {
    expect(checkPdf({ name: 'planning.pdf', size: 120_000, type: 'application/pdf' })).toBeNull();
    // Certains navigateurs ne renseignent pas le type : l'extension suffit.
    expect(checkPdf({ name: 'Planning CFA.PDF', size: 120_000, type: '' })).toBeNull();
    expect(checkPdf({ name: 'photo.jpg', size: 120_000, type: 'image/jpeg' })).toMatch(/PDF/);
    expect(checkPdf({ name: 'vide.pdf', size: 0, type: 'application/pdf' })).toMatch(/vide/);
    expect(checkPdf({ name: 'gros.pdf', size: MAX_DOCUMENT_BYTES + 1, type: 'application/pdf' })).toMatch(/volumineux/);
  });

  it('affiche des tailles lisibles', () => {
    expect(formatSize(300)).toBe('1 Ko');
    expect(formatSize(250 * 1024)).toBe('250 Ko');
    expect(formatSize(3.4 * 1024 * 1024)).toBe('3,4 Mo');
  });
});
