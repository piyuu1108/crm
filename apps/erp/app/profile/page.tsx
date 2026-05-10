import { redirect } from "next/navigation";

export default function RootProfileRedirectPage() {
  redirect("/app/profile");
}
