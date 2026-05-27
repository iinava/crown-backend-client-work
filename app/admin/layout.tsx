import AdminSidebar from "@/components/AdminSidebar";
import { MobileSidebar } from "@/components/MobileSidebar";
import { HostelProvider } from "@/lib/hostel-context";
import { HostelBadge } from "@/components/HostelBadge";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <HostelProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <AdminSidebar className="hidden md:flex" />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile Header */}
          <header className="md:hidden flex items-center justify-between px-4 h-14 border-b bg-background/80 backdrop-blur-md sticky top-0 z-30 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Crown Hostels</span>
              <HostelBadge />
            </div>
            <MobileSidebar />
          </header>
          
          {/* Main Content Scroll Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </HostelProvider>
  );
}
