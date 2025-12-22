import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/admin");
  }

  return (
    <div className="min-h-screen bg-[#FDF8F3]">
      <AdminNav user={user} />
      <main className="container mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
