import { StampDesk } from "@/components/StampDesk";

export default function StampPage() {
  return (
    <div>
      <h1 className="font-serif text-4xl">Stamp pad</h1>
      <p className="mt-2 max-w-xl text-muted">
        Open this on a phone at the register. Scan the QR on the customer’s Wallet card, then add a stamp.
      </p>
      <div className="mt-8">
        <StampDesk />
      </div>
    </div>
  );
}
