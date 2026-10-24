/**
 * Propose un fichier à l'utilisateur. Sur iPhone, la feuille de partage permet « Enregistrer dans Fichiers »,
 * AirDrop ou l'envoi par e-mail ; sinon on revient au téléchargement classique.
 */
export async function offerFile(content: string | Blob, filename: string, mime: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  try {
    const file = new File([blob], filename, { type: mime });
    const touchDevice = navigator.maxTouchPoints > 0;
    if (touchDevice && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
      return 'shared';
    }
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') return 'cancelled';
    // Partage indisponible : téléchargement classique ci-dessous.
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
