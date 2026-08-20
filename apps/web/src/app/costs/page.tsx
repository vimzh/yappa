import { CostsDashboard } from "@/components/costs-dashboard";
import { Sidebar } from "@/components/sidebar";

export default function CostsPage() {
  return (
    <div className="flex min-h-svh">
      <Sidebar />
      <main className="min-w-0 flex-1 px-5 pb-28 pt-8 sm:px-10 sm:py-12 lg:px-12">
        <CostsDashboard />
      </main>
    </div>
  );
}
