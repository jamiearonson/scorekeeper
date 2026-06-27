import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

interface QrCodeProps {
  value: string;
  size?: number;
  className?: string;
}

/** Renders `value` as a QR code (dark modules on white) into an <img>. */
export function QrCode({ value, size = 200, className }: QrCodeProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      width: size * 2, // render at 2x for crisp scaling on retina screens
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => active && setSrc(url))
      .catch(() => active && setSrc(null));
    return () => {
      active = false;
    };
  }, [value, size]);

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl bg-white p-3",
        className,
      )}
      style={{ width: size + 24, height: size + 24 }}
    >
      {src && (
        <img
          src={src}
          alt="Scan to join the game"
          width={size}
          height={size}
          className="h-full w-full"
        />
      )}
    </div>
  );
}
