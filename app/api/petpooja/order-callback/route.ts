import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/src/lib/logger";
import { PetpoojaCallbackSchema } from "@/src/integrations/petpooja/petpooja.schemas";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = PetpoojaCallbackSchema.safeParse(body);

    if (!validation.success) {
      logger.warn("Invalid Petpooja callback payload", { errors: validation.error });
      return NextResponse.json({ success: "0", message: "Invalid callback payload" }, { status: 400 });
    }

    const { restID, orderID, status, cancel_reason } = validation.data;
    logger.info("Petpooja order callback received", { restID, orderID, status, cancel_reason });

    return NextResponse.json({ success: "1", message: "Callback processed successfully" });
  } catch (error) {
    logger.error("Error handling Petpooja callback", error);
    return NextResponse.json({ success: "0", message: "Internal server error" }, { status: 500 });
  }
}
