import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const templateId = Number(id);
    if (!templateId) {
      return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
    }

    const template = await prisma.invoiceTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error fetching invoice template:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice template" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const templateId = Number(id);
    if (!templateId) {
      return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
    }

    const data = await request.json();
    const isMain = Boolean(data.isMain);

    // If setting this template as main, unset any other main template first
    if (isMain) {
      await prisma.invoiceTemplate.updateMany({
        where: { isMain: true, NOT: { id: templateId } },
        data: { isMain: false },
      });
    }

    const template = await prisma.invoiceTemplate.update({
      where: { id: templateId },
      data: {
        name: data.name,
        isActive: data.isActive ?? true,
        isMain: isMain,
        format: data.format ?? "A4",
        headerImage: data.headerImage,
        footerImage: data.footerImage,
        watermarkImage: data.watermarkImage,
        statementHeaderImage: data.statementHeaderImage,
        fixedNote: data.fixedNote,
        tableHeaderBg: data.tableHeaderBg ?? "#E6F7FA",
        tableHeaderColor: data.tableHeaderColor ?? "#000000",
        employeeName: data.employeeName,
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error updating invoice template:", error);
    return NextResponse.json(
      { error: "Failed to update invoice template" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const templateId = Number(id);
    if (!templateId) {
      return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
    }

    await prisma.invoiceTemplate.delete({
      where: { id: templateId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting invoice template:", error);
    return NextResponse.json(
      { error: "Failed to delete invoice template" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const templateId = Number(id);
    if (!templateId) {
      return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
    }

    const data = await request.json();
    const updateData: any = {};

    if (data.isActive !== undefined) {
      updateData.isActive = Boolean(data.isActive);
    }

    if (data.isMain !== undefined) {
      const isMain = Boolean(data.isMain);
      updateData.isMain = isMain;
      if (isMain) {
        await prisma.invoiceTemplate.updateMany({
          where: { isMain: true, NOT: { id: templateId } },
          data: { isMain: false },
        });
      }
    }

    const template = await prisma.invoiceTemplate.update({
      where: { id: templateId },
      data: updateData,
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error patching invoice template:", error);
    return NextResponse.json(
      { error: "Failed to patch invoice template" },
      { status: 500 }
    );
  }
}
