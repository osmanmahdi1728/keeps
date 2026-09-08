import QRCode from "qrcode";
import { LoyaltyCard, type LoyaltyCardProps } from "@/components/LoyaltyCard";
import { fontCss } from "@/lib/card-design";

type PassCardProps = Omit<LoyaltyCardProps, "qrSrc" | "fontFamily"> & {
  serial: string;
  fontFamily?: string;
};

export async function PassCard(props: PassCardProps) {
  const qr = await QRCode.toDataURL(props.serial, {
    margin: 0,
    width: 180,
    color: { dark: props.primaryColor, light: "#00000000" },
  });

  return (
    <LoyaltyCard
      {...props}
      qrSrc={qr}
      fontFamily={fontCss(props.fontFamily ?? "fraunces")}
    />
  );
}
