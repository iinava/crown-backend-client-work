import fs from 'fs';

let idContent = fs.readFileSync('app/admin/staff/[id]/page.tsx', 'utf-8');

idContent = idContent.replace(/export default async function ResidentDetailPage/g, 'export default async function StaffDetailPage');
idContent = idContent.replace(/Back to Residents/g, 'Back to Staff');
idContent = idContent.replace(/\/admin\/residents/g, '/admin/staff');
idContent = idContent.replace(/Resident profile/g, 'Staff profile');
idContent = idContent.replace(/<p className="text-muted-foreground text-sm">Resident profile<\/p>/g, '<p className="text-muted-foreground text-sm">Staff profile</p>');
idContent = idContent.replace(/<div className="flex items-center gap-2">\s*<CreditCard className="h-4 w-4 text-muted-foreground shrink-0" \/>\s*<span>₹\{Number\(resident\.monthly_rate\)\.toLocaleString\(\)\}\/month<\/span>\s*<\/div>/s, '');

// Remove Payment history section
idContent = idContent.replace(/\{\/\* Payment History \*\/\}.*<\/div>\s*<\/div>/s, '</div>');
// also remove the getPayments import and call
idContent = idContent.replace(/import \{ getPayments \} from "@\/lib\/dal\/payments";\n/g, '');
idContent = idContent.replace(/const \{ data: payments \} = await getPayments.*?;\n/g, '');

fs.writeFileSync('app/admin/staff/[id]/page.tsx', idContent);
console.log('staff/[id]/page.tsx transformed!');
