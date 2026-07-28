import { redirect } from "next/navigation";
import { requireReceptionUser } from "@/lib/reception/access";

export default async function ReceptionPage() {
  await requireReceptionUser("/admin/reception");
  redirect("/admin/reception/timetables");
}
