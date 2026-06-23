// Allowed email domains for the mentoring system
export const ALLOWED_DOMAINS = [
  'primeatlanticsafetyservices.com',
  'cinalt.com',
  'pages-ng.com',
  'primeatlanticnigeria.com',
  'synerpetnigeria.com',
  'waelng.com',
  'weston-integrated.com',
];

export function isAllowedDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return ALLOWED_DOMAINS.some(d => d.toLowerCase() === domain);
}

export function getAllowedDomainsDisplay(): string {
  return ALLOWED_DOMAINS.map(d => `@${d}`).join(', ');
}
