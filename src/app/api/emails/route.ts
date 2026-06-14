import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const folder = searchParams.get("folder") || "inbox";
    const search = searchParams.get("search");
    const condominiumId = searchParams.get("condominiumId") || undefined;

    const emails = await prisma.email.findMany({
      where: {
        userId: user.id,
        folder,
        ...(condominiumId && { condominiumId }),
        ...(search && {
          OR: [
            { subject: { contains: search } },
            { body: { contains: search } },
            { fromAddress: { contains: search } },
            { toAddress: { contains: search } },
          ],
        }),
      },
      include: { attachments: true },
      orderBy: { createdAt: "desc" },
    });

    const counts = await prisma.email.groupBy({
      by: ["folder"],
      where: { userId: user.id },
      _count: true,
    });
    const unread = await prisma.email.count({
      where: { userId: user.id, folder: "inbox", isRead: false },
    });

    return NextResponse.json({ emails, counts, unread });
  } catch (e) {
    console.error("emails GET", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const data = await req.json();
    const {
      toAddress,
      cc,
      bcc,
      subject,
      body,
      condominiumId,
      saveAsDraft = false,
      attachments = [],
    } = data;

    if (!toAddress || !subject) {
      return NextResponse.json({ error: "Destinatário e assunto são obrigatórios" }, { status: 400 });
    }

    // E-mail no remetente: cria na pasta sent (ou drafts se rascunho)
    const sent = await prisma.email.create({
      data: {
        userId: user.id,
        condominiumId: condominiumId || null,
        fromAddress: user.email,
        fromName: user.name,
        toAddress,
        cc: cc || null,
        bcc: bcc || null,
        subject,
        body: body || "",
        folder: saveAsDraft ? "drafts" : "sent",
        isRead: true,
        attachments: attachments.length > 0 ? {
          create: attachments.map((a: { name: string; url: string; size: number; mimeType?: string }) => ({
            name: a.name,
            url: a.url,
            size: a.size,
            mimeType: a.mimeType || null,
          })),
        } : undefined,
      },
      include: { attachments: true },
    });

    // Se não for rascunho e o destinatário for um usuário interno, entrega na inbox dele
    if (!saveAsDraft) {
      const recipient = await prisma.user.findUnique({ where: { email: toAddress } });
      if (recipient && recipient.id !== user.id) {
        await prisma.email.create({
          data: {
            userId: recipient.id,
            condominiumId: condominiumId || null,
            fromAddress: user.email,
            fromName: user.name,
            toAddress,
            cc: cc || null,
            subject,
            body: body || "",
            folder: "inbox",
            isRead: false,
            attachments: attachments.length > 0 ? {
              create: attachments.map((a: { name: string; url: string; size: number; mimeType?: string }) => ({
                name: a.name,
                url: a.url,
                size: a.size,
                mimeType: a.mimeType || null,
              })),
            } : undefined,
          },
        });
      }
    }

    return NextResponse.json(sent, { status: 201 });
  } catch (e) {
    console.error("emails POST", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
