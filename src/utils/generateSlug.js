const crypto = require('crypto');

function generateSlug(title, prizeTitle) {
  const baseString = `${title || ''} ${prizeTitle || ''}`.trim();
  
  // Convert to lowercase, replace non-alphanumeric chars with hyphens, and remove consecutive hyphens
  let slug = baseString
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
    
  if (!slug) {
    slug = 'competition';
  }
  
  // Append a random 6-character string
  const randomStr = crypto.randomBytes(3).toString('hex');
  return `${slug}-${randomStr}`;
}

module.exports = generateSlug;
