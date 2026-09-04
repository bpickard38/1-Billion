import { redirect } from "next/navigation";

// "/" is never a screen. Logged-in users land on Today; proxy.ts sends
// logged-out users to /login before this runs.
export default function Home() {
  redirect("/today");
}
