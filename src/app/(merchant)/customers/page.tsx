import { prisma } from "@/lib/db";
import { requireMerchant } from "@/lib/guards";

export default async function CustomersPage() {
  const merchant = await requireMerchant();
  if (!merchant.program) {
    return null;
  }

  const customers = await prisma.customer.findMany({
    where: { programId: merchant.program.id },
    orderBy: { createdAt: "desc" },
    include: { passes: true },
  });

  return (
    <div>
      <h1 className="font-serif text-4xl">Customers</h1>
      <p className="mt-2 text-muted">{customers.length} cards issued</p>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Stamps</th>
              <th className="px-4 py-3 font-semibold">Wallet</th>
              <th className="px-4 py-3 font-semibold">Marketing</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => {
              const pass = customer.passes[0];
              return (
                <tr key={customer.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">{customer.name}</td>
                  <td className="px-4 py-3">{customer.email}</td>
                  <td className="px-4 py-3">
                    {pass ? `${pass.stampCount}/${merchant.program!.stampsRequired}` : "—"}
                  </td>
                  <td className="px-4 py-3 capitalize">{pass?.platform ?? "—"}</td>
                  <td className="px-4 py-3">{customer.marketingOptIn ? "Yes" : "No"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
