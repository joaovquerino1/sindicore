import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function assertMember(channelId: string, userId: string) {
  const member = await prisma.chatChannelMember.findFirst({ where: { channelId, userId } });
  return !!member;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;
    if (!(await assertMember(id, user.id))) {
      return NextResponse.json({ error: "Sem acesso" }, { status: 403 });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { channelId: id },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    // Marca como lido pra esse usuário
    await prisma.chatChannelMember.updateMany({
      where: { channelId: id, userId: user.id },
      data: { lastReadAt: new Date() },
    });

    return NextResponse.json(messages);
  } catch (e) {
    console.error("chat messages GET", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;
    if (!(await assertMember(id, user.id))) {
      return NextResponse.json({ error: "Sem acesso" }, { status: 403 });
    }

    const data = await req.json();
    const { content = "", type = "text", fileUrl, fileName, fileSize, fileMime } = data;
    if (type === "text" && !content.trim()) {
      return NextResponse.json({ error: "Conteúdo vazio" }, { status: 400 });
    }
    if (type === "file" && !fileUrl) {
      return NextResponse.json({ error: "fileUrl obrigatório" }, { status: 400 });
    }

    const message = await prisma.chatMessage.create({
      data: {
        channelId: id,
        userId: user.id,
        type,
        content: content || (fileName ?? ""),
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSize: fileSize ?? null,
        fileMime: fileMime || null,
      },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    });

    // Toca updatedAt do canal pra ranking
    await prisma.chatChannel.update({ where: { id }, data: { updatedAt: new Date() } });

    return NextResponse.json(message, { status: 201 });
  } catch (e) {
    console.error("chat messages POST", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
