import { NextResponse } from "next/server";

export function PUT() {
  return NextResponse.json(
    { error: "当前部署为只读模式，不能修改实体说明" },
    { status: 403 },
  );
}
