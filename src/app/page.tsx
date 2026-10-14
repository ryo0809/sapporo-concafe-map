import { createListCafes } from "@/composition/cafes";
import { CafeList } from "@/presentation/cafes/cafe-list";

export default async function Home() {
  const cafes = await createListCafes().execute();
  return (
    <main>
      <h1>札幌コンカフェマップ</h1>
      <p>札幌のコンセプトカフェを探すためのサービスです。</p>
      <CafeList cafes={cafes} />
    </main>
  );
}
