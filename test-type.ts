const detectType = (content: string) => {
  if (!content) return 'text';
  const lower = content.toLowerCase();
  if (lower.startsWith('data:image/') || lower.match(/<img /) || lower.match(/^!\[.*\]\(.*\)$/) || lower.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/)) return 'image';
  if (lower.startsWith('data:audio/') || lower.match(/<audio /) || lower.match(/\.(mp3|wav|ogg)(\?.*)?$/)) return 'audio';
  if (lower.startsWith('data:video/') || lower.match(/<video /) || lower.match(/\.(mp4|webm)(\?.*)?$/) || lower.includes('youtube.com') || lower.includes('vimeo.com')) return 'video';
  return 'text';
};
console.log(detectType('f6589c11-1cbe-48b9-bbc3-afbb265d4d44/spatial_map/new/98eb241e-6eb0-4196-987d-ddf56484bf6a.gif'));
console.log(detectType('f6589c11-1cbe-48b9-bbc3-afbb265d4d44/spatial_map/new/98eb241e-6eb0-4196-987d-ddf56484bf6a.mp4'));
console.log(detectType('f6589c11-1cbe-48b9-bbc3-afbb265d4d44/spatial_map/new/98eb241e-6eb0-4196-987d-ddf56484bf6a.PNG'));
