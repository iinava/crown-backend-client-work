import fs from 'fs';

let content = fs.readFileSync('app/admin/staff/page.tsx', 'utf-8');

// Replacements for Staff page
content = content.replace(/export default function ResidentsPage/g, 'export default function StaffPage');
content = content.replace(/is_staff=false/g, 'is_staff=true');
content = content.replace(/"Residents"/g, '"Staff"');
content = content.replace(/Add Resident/g, 'Add Staff');
content = content.replace(/Edit Resident/g, 'Edit Staff');
content = content.replace(/Delete Resident/g, 'Delete Staff');
content = content.replace(/Check Out Resident/g, 'Check Out Staff');
content = content.replace(/No residents/g, 'No staff');
content = content.replace(/active" \? "active" : statusFilter === "inactive" \? "former" : "total"\) \+ " residents"/g, 'active" ? "active" : statusFilter === "inactive" ? "former" : "total") + " staff"');
content = content.replace(/Resident added/g, 'Staff added');
content = content.replace(/Resident updated/g, 'Staff updated');
content = content.replace(/Resident deleted/g, 'Staff deleted');

// Remove Rate and Payment columns from table header
content = content.replace(/<TableHead className="font-semibold text-xs uppercase tracking-wide">Rate<\/TableHead>\s*<TableHead className="font-semibold text-xs uppercase tracking-wide">Payment<\/TableHead>/, '');

// Remove Rate and Payment columns from table body
content = content.replace(/<TableCell className="text-sm font-medium">\s*\{Number\(r\.daily_rate\) > 0 \? \(\s*<span className="inline-flex items-center gap-1">\s*₹\{Number\(r\.daily_rate\)\.toLocaleString\("en-IN"\)\}\s*<span className="text-\[10px\] text-muted-foreground font-normal">\/day<\/span>\s*<\/span>\s*\) : \(\s*<span>₹\{Number\(r\.monthly_rate\)\.toLocaleString\("en-IN"\)\}<\/span>\s*\)\}\s*<\/TableCell>\s*<TableCell>\s*\{r\.has_unpaid \? \(\s*<span className="inline-flex items-center gap-1\.5 text-xs font-medium text-destructive bg-destructive\/10 border border-destructive\/20 rounded-full px-2\.5 py-1">\s*<Clock className="h-3 w-3" \/> Unpaid\s*<\/span>\s*\) : r\.has_payment \? \(\s*<span className="inline-flex items-center gap-1\.5 text-xs font-medium text-success bg-success\/10 border border-success\/20 rounded-full px-2\.5 py-1">\s*<CheckCircle2 className="h-3 w-3" \/> Paid\s*<\/span>\s*\) : \(\s*<span className="text-xs text-muted-foreground\/60">No record<\/span>\s*\)\}\s*<\/TableCell>/s, '');

// Form updates
content = content.replace(/monthly_rate: Number\(form.monthly_rate\) \|\| 0,/g, 'monthly_rate: 0,');
content = content.replace(/daily_rate: Number\(form.daily_rate\) \|\| 0,/g, 'daily_rate: 0,\n        is_staff: true,');

// Remove Rate inputs
content = content.replace(/<div className="space-y-1">\s*<Label htmlFor="monthly_rate">Monthly Rate \(₹\).*?<\/div>\s*<div className="space-y-1">\s*<Label htmlFor="daily_rate">Daily Rate \(₹\).*?<\/div>/s, '');

// Add `is_staff: true` to the form payload manually if not fully covered
// Also change total text: {total} {statusFilter === "active" ? "active" : statusFilter === "inactive" ? "former" : "total"} residents
content = content.replace(/\} residents<\/p>/g, '} staff members</p>');

// Also update link href
content = content.replace(/\/admin\/residents\//g, '/admin/staff/');

fs.writeFileSync('app/admin/staff/page.tsx', content);
console.log('staff/page.tsx transformed!');

let idContent = fs.readFileSync('app/admin/staff/[id]/page.tsx', 'utf-8');

idContent = idContent.replace(/export default async function ResidentDetailPage/g, 'export default async function StaffDetailPage');
idContent = idContent.replace(/Back to Residents/g, 'Back to Staff');
idContent = idContent.replace(/\/admin\/residents/g, '/admin/staff');
idContent = idContent.replace(/Resident profile/g, 'Staff profile');
idContent = idContent.replace(/<p className="text-muted-foreground text-sm">Resident profile<\/p>/g, '<p className="text-muted-foreground text-sm">Staff profile</p>');
idContent = idContent.replace(/<div className="flex items-center gap-2">\s*<CreditCard className="h-4 w-4 text-muted-foreground shrink-0" \/>\s*<span>₹\{Number\(resident\.monthly_rate\)\.toLocaleString\(\)\}\/month<\/span>\s*<\/div>/s, '');

// Remove Payment history section
idContent = idContent.replace(/\{\/\* Payment History \*\/\}.*<\/div>\s*<\/div>/s, '</div>');

fs.writeFileSync('app/admin/staff/[id]/page.tsx', idContent);
console.log('staff/[id]/page.tsx transformed!');
