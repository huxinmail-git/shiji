import { NextResponse } from "next/server";
import { updateEntity } from "@/lib/db";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();
  if (typeof body.summary !== "string" || typeof body.details !== "string") {
    return NextResponse.json({ error: "说明格式不正确" }, { status: 400 });
  }
  const entity = updateEntity(Number(id), { summary: body.summary.trim(), details: body.details.trim() });
  if (!entity) return NextResponse.json({ error: "条目不存在" }, { status: 404 });
  return NextResponse.json(entity);
}
