import { Nav } from "@/components/Nav";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <Nav userName={user.name} />
      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-4 md:ml-60 md:mr-0 md:w-auto md:max-w-none md:px-8 md:pb-10 md:pt-6">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </>
  );
}
