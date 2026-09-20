const fs = require('fs');
const files = [
  'src/app/verify-proof/page.tsx',
  'src/app/verifier/page.tsx',
  'src/app/privacy/page.tsx',
  'src/app/portfolio/donor/page.tsx',
  'src/app/portfolio/creator/page.tsx',
  'src/app/create/page.tsx',
  'src/app/campaigns/[id]/quotation/page.tsx',
  'src/app/campaigns/[id]/ledger/page.tsx'
];
files.forEach(f => {
  let text = fs.readFileSync(f, 'utf8');
  text = text.replace(/import Navbar from ['"]@\/components\/Navbar['"];?\r?\n/g, '');
  text = text.replace(/\s*<Navbar \/>\r?\n/g, '');
  fs.writeFileSync(f, text);
  console.log('Cleaned ' + f);
});
