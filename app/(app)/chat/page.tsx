import PageTitle from "@/components/PageTitle";
import ChatWindow from "@/components/chat/ChatWindow";
import { createClient } from "@/lib/supabase/server";

// Long answers can take a while.
export const maxDuration = 120;

export default async function ChatPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_messages")
    .select("id, role, content")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <>
      <PageTitle>Chat</PageTitle>
      <ChatWindow messages={(data ?? []).reverse()} />
    </>
  );
}
