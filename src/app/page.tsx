import { getData } from "@/lib/data";
import ClientPage from "@/components/ClientPage";

export default async function Home() {
  const data = await getData();
  
  return <ClientPage data={data} />;
}
