import { prisma } from "@/lib/db";
import { requireMerchant } from "@/lib/guards";
import { getLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";

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
  const locale = await getLocale();
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) =>
    translate(locale, key, values);

  return (
    <div>
      <h1 className="font-serif text-4xl">{t("customers")}</h1>
      <p className="mt-2 text-muted">{t("customersIssued", { count: customers.length })}</p>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">{t("name")}</th>
              <th className="px-4 py-3 font-semibold">{t("email")}</th>
              <th className="px-4 py-3 font-semibold">{t("walletStamps")}</th>
              <th className="px-4 py-3 font-semibold">{t("wallet")}</th>
              <th className="px-4 py-3 font-semibold">{t("marketing")}</th>
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
                  <td className="px-4 py-3">{customer.marketingOptIn ? t("yes") : t("no")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
