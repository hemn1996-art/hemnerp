import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getCurrentUser, permissionsEmitter } from "../../../../lib/auth";

// GET - Get permissions for a user
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const userId = Number(id);

    const permissions = await prisma.userPermission.findMany({
      where: { userId },
    });

    return NextResponse.json(permissions);
  } catch (error) {
    console.error("GET /api/users/[id]/permissions error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PUT - Update permissions for a user (bulk upsert)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const userId = Number(id);
    const body = await request.json();
    const { permissions } = body;

    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { error: "permissions must be an array" },
        { status: 400 }
      );
    }

    // Delete all existing permissions for this user
    await prisma.userPermission.deleteMany({
      where: { userId },
    });

    // Create new permissions
    if (permissions.length > 0) {
      await prisma.userPermission.createMany({
        data: permissions.map((p: any) => ({
          userId,
          module: p.module,
          canView: p.canView ?? false,
          canCreate: p.canCreate ?? false,
          canUpdate: p.canUpdate ?? false,
          canDelete: p.canDelete ?? false,
        })),
      });
    }

    // Return updated permissions
    const updated = await prisma.userPermission.findMany({
      where: { userId },
    });

    // Notify the user in real-time
    permissionsEmitter.emit("change", { userId, type: "permissions_updated" });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/users/[id]/permissions error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
