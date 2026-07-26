import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getConnectionState } from "@/infrastructure/cache/connection-state";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const state = await getConnectionState();

    const shouldShowQr =
      !!state.qr_string &&
      (state.status === "qr" || state.status === "connecting");

    if (shouldShowQr && state.qr_string) {
      const qrPng = await QRCode.toDataURL(state.qr_string, {
        width: 320,
        margin: 2,
        errorCorrectionLevel: "M",
      });
      return NextResponse.json({
        status: "qr",
        qrPng,
        phone: state.phone,
      });
    }

    return NextResponse.json({
      status: state.status,
      phone: state.phone,
    });
  } catch (error) {
    return NextResponse.json({ status: "disconnected", qrPng: null, phone: null }, { status: 500 });
  }
}
