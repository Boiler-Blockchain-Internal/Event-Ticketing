// Event name -> event id the events function accepts (^[A-Za-z0-9_-]+$). Accents folded, everything else becomes "-".
export const slugify = (name: string) => name
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-')
  .slice(0, 48).replace(/^-+|-+$/g, '')
