import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { simpleHash, verifyPassword, getCurrentUser, permissionsEmitter } from "../../lib/auth";

// GET - List all users (admin only)
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        phone: true,
        canSeeOthersData: true,
        allowedWarehouses: true,
        allowedCashboxes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST - Create new user (admin only)
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { username, password, name, role, isActive, phone, canSeeOthersData, allowedWarehouses, allowedCashboxes } = body;

    if (!username || !password || !name) {
      return NextResponse.json(
        { error: "یوزەرنەیم، پاسۆرد و ناو پێویستن" },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existing = await prisma.user.findUnique({
      where: { username },
    });
    if (existing) {
      return NextResponse.json(
        { error: "ئەم یوزەرنەیمە پێشتر بەکارهاتووە" },
        { status: 400 }
      );
    }

    const hashedPassword = simpleHash(password);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        role: role || "employee",
        isActive: isActive !== undefined ? isActive : true,
        phone: phone || null,
        canSeeOthersData: canSeeOthersData !== undefined ? canSeeOthersData : true,
        allowedWarehouses: allowedWarehouses || null,
        allowedCashboxes: allowedCashboxes || null,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        phone: true,
        canSeeOthersData: true,
        allowedWarehouses: true,
        allowedCashboxes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("POST /api/users error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PUT - Update user (admin only)
export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { id, username, password, name, role, isActive, phone, canSeeOthersData, allowedWarehouses, allowedCashboxes } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // Check if changing username to one that already exists
    if (username) {
      const existing = await prisma.user.findFirst({
        where: { username, id: { not: id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "ئەم یوزەرنەیمە پێشتر بەکارهاتووە" },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (username !== undefined) updateData.username = username;
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) updateData.password = simpleHash(password);
    if (phone !== undefined) updateData.phone = phone;
    if (canSeeOthersData !== undefined) updateData.canSeeOthersData = canSeeOthersData;
    if (allowedWarehouses !== undefined) updateData.allowedWarehouses = allowedWarehouses;
    if (allowedCashboxes !== undefined) updateData.allowedCashboxes = allowedCashboxes;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        phone: true,
        canSeeOthersData: true,
        allowedWarehouses: true,
        allowedCashboxes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Notify the user in real-time
    permissionsEmitter.emit("change", { userId: id, type: "user_updated" });

    return NextResponse.json(user);
  } catch (error) {
    console.error("PUT /api/users error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE - Delete user (admin only)
export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // Prevent deleting yourself
    if (id === currentUser.id) {
      return NextResponse.json(
        { error: "ناتوانیت خۆت بسڕیتەوە" },
        { status: 400 }
      );
    }

    // Notify the user in real-time
    permissionsEmitter.emit("change", { userId: id, type: "deactivated" });

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/users error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
