import AppHeader from "../../components/AppHeader";
import BottomNav from "../../components/BottomNav";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-900 pb-20">
            <AppHeader />
            <main className="max-w-md mx-auto px-4 py-6">
                {children}
            </main>
            <BottomNav />
        </div>
    );
}
