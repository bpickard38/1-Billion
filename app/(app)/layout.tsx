import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TabBar from "@/components/TabBar";

// Every screen inside (app) requires a logged-in user.
// proxy.ts already redirects; this is the belt to that suspender.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex-1 flex flex-col min-h-full">
      <main className="flex-1 px-4 pt-safe pb-24">{children}</main>
      <TabBar />
    </div>
  );
}
