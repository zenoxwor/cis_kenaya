import { redirect } from "next/navigation";

/** Root page: redirect authenticated users to dashboard, others to login.
 *  Actual auth check happens in middleware; this is a belt-and-suspenders redirect.
 */
export default function RootPage() {
  redirect("/dashboard");
}
