import { redirect } from "next/navigation";

// proxy.ts already sends logged-out visitors to /login.
export default function Home() {
  redirect("/systems");
}
