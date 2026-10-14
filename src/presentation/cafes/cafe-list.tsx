import type { CafeSummary } from "@/application/cafes/list-cafes";

export function CafeList({ cafes }: { cafes: readonly CafeSummary[] }) {
  return (
    <section aria-labelledby="cafes-heading">
      <h2 id="cafes-heading">店舗一覧</h2>
      {cafes.length === 0 ? (
        <p>店舗情報は準備中です。</p>
      ) : (
        <ul>{cafes.map((cafe) => (
          <li key={cafe.id}><h3>{cafe.name}</h3><p>{cafe.address}</p></li>
        ))}</ul>
      )}
    </section>
  );
}
