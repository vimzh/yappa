import { PodcastDetail } from "@/components/podcast-detail";
import { Sidebar } from "@/components/sidebar";

export default async function PodcastPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex min-h-svh">
      <Sidebar />
      <main className="min-w-0 flex-1 px-5 pb-28 pt-8 sm:px-10 sm:py-12 lg:px-12">
        <PodcastDetail id={id} />
      </main>
    </div>
  );
}
