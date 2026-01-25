import AppHeader from "../../components/AppHeader";
import BottomNav from "../../components/BottomNav";
import { Sidebar } from "../../components/sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-900 lg:flex">
            {/* Sidebar para Escritorio */}
            <div className="hidden lg:block lg:shrink-0">
                <Sidebar />
            </div>

            <div className="flex-1 flex flex-col min-h-screen">
                {/* Header (Móvil) */}
                <div className="lg:hidden">
                    <AppHeader />
                </div>

                <main className="flex-1 px-4 py-6 w-full lg:max-w-none max-w-md mx-auto">
                    {children}
                </main>

                {/* Bottom Nav (Móvil) */}
                <div className="lg:hidden">
                    <BottomNav />
                </div>
            </div>
        </div>
    );
}
