import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db/client";
import { MappingService } from "@/src/services/mapping-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { shopifyTitle: { contains: search, mode: "insensitive" } },
        { shopifySku: { contains: search, mode: "insensitive" } },
        { petpoojaItemId: { contains: search, mode: "insensitive" } },
        { petpoojaItemName: { contains: search, mode: "insensitive" } },
      ];
    }

    const mappings = await db.productMapping.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ mappings });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch mappings", details: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check if bulk import
    if (Array.isArray(body.mappings)) {
      const results = [];
      for (const m of body.mappings) {
        if (!m.shopifyVariantId || !m.petpoojaItemId) continue;
        const res = await MappingService.upsertMapping(m);
        results.push(res);
      }
      return NextResponse.json({ success: true, count: results.length });
    }

    // Single upsert
    const {
      shopifyVariantId,
      shopifyProductId,
      shopifySku,
      shopifyTitle,
      shopifyVariantTitle,
      petpoojaItemId,
      petpoojaItemName,
      petpoojaVariationId,
      petpoojaVariationName,
    } = body;

    if (!shopifyVariantId || !petpoojaItemId || !shopifyTitle || !petpoojaItemName) {
      return NextResponse.json({ error: "Missing required mapping fields" }, { status: 400 });
    }

    const mapping = await MappingService.upsertMapping({
      shopifyVariantId,
      shopifyProductId,
      shopifySku,
      shopifyTitle,
      shopifyVariantTitle,
      petpoojaItemId,
      petpoojaItemName,
      petpoojaVariationId,
      petpoojaVariationName,
    });

    return NextResponse.json({ success: true, mapping });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save mapping", details: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Mapping ID is required" }, { status: 400 });
    }

    await db.productMapping.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete mapping", details: String(error) }, { status: 500 });
  }
}
