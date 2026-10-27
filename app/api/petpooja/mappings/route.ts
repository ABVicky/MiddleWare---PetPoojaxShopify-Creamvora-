import { NextRequest, NextResponse } from "next/server";
import { getCakeMappings, findCakeMapping } from "@/src/config/cake-mappings";

export const dynamic = "force-dynamic";

/**
 * GET /api/petpooja/mappings
 * Returns all configured cake mappings (Petpooja Item IDs parallel to Shopify IDs).
 */
export async function GET() {
  const mappings = getCakeMappings();
  return NextResponse.json({
    success: true,
    count: mappings.length,
    mappings,
  });
}

/**
 * POST /api/petpooja/mappings
 * Test lookup for a specific cake / line item to verify Petpooja ID resolution.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const match = findCakeMapping(body);

    if (match) {
      return NextResponse.json({
        matched: true,
        mapping: match,
        petpoojaItemId: match.petpoojaItemId,
        petpoojaVariationId: match.petpoojaVariationId,
        petpoojaItemName: match.petpoojaItemName,
      });
    }

    return NextResponse.json({
      matched: false,
      message: "No exact cake mapping found. Defaulting to SKU or Variant ID.",
      fallbackItemId: body.sku || String(body.variant_id || body.id),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to resolve mapping" },
      { status: 400 }
    );
  }
}
