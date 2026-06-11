import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const templates = await prisma.invoiceTemplate.findMany({
      orderBy: { id: "asc" },
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching invoice templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const isMain = Boolean(data.isMain);

    // If setting this template as main, unset any other main template first
    if (isMain) {
      await prisma.invoiceTemplate.updateMany({
        where: { isMain: true },
        data: { isMain: false },
      });
    }

    const template = await prisma.invoiceTemplate.create({
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
        employeeName: data.employeeName ?? "سیستەم",
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice template:", error);
    return NextResponse.json(
      { error: "Failed to create invoice template" },
      { status: 500 }
    );
  }
}
