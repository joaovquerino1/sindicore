import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const condominiumId = searchParams.get("condominiumId");
    if (!condominiumId) return NextResponse.json({ error: "condominiumId obrigatório" }, { status: 400 });

    const memberships = await prisma.chatChannelMember.findMany({
      where: { userId: user.id, channel: { condominiumId } },
      include: {
        channel: {
          include: {
            members: {
              include: { user: { select: { id: true, name: true, email: true, role: true, avatar: true } } },
            },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    const channels = await Promise.all(
      memberships.map(async (m) => {
        const last = m.channel.messages[0];
        const unread = await prisma.chatMessage.count({
          where: {
            channelId: m.channelId,
            createdAt: { gt: m.lastReadAt ?? new Date(0) },
            userId: { not: user.id },
          },
        });
        return {
          id: m.channel.id,
          type: m.channel.type,
          name: m.channel.name,
          updatedAt: m.channel.updatedAt,
          members: m.channel.members.map((cm) => cm.user),
          lastMessage: last
            ? {
                id: last.id,
                content: last.content,
                type: last.type,
                createdAt: last.createdAt,
                userId: last.userId,
              }
            : null,
          unread,
        };
      })
    );

    // Ordena: mais recente primeiro (pela última mensagem ou updatedAt)
    channels.sort((a, b) => {
      const aT = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.updatedAt).getTime();
      const bT = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.updatedAt).getTime();
      return bT - aT;
    });

    return NextResponse.json(channels);
  } catch (e) {
    console.error("chat channels GET", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const data = await req.json();
    const { condominiumId, type = "direct", name, memberIds = [] } = data;
    if (!condominiumId) return NextResponse.json({ error: "condominiumId obrigatório" }, { status: 400 });

    const allMemberIds = Array.from(new Set([user.id, ...memberIds]));
    if (allMemberIds.length < 2) {
      return NextResponse.json({ error: "Pelo menos 1 outro participante é necessário" }, { status: 400 });
    }

    // Para DM, verifica se já existe canal entre os 2 usuários
    if (type === "direct" && allMemberIds.length === 2) {
      const existing = await prisma.chatChannel.findFirst({
        where: {
          condominiumId,
          type: "direct",
          AND: allMemberIds.map((uid) => ({ members: { some: { userId: uid } } })),
        },
        include: {
          members: { include: { user: { select: { id: true, name: true, email: true, role: true, avatar: true } } } },
        },
      });
      if (existing && existing.members.length === 2) {
        return NextResponse.json({
          id: existing.id,
          type: existing.type,
          name: existing.name,
          members: existing.members.map((m) => m.user),
        });
      }
    }

    const channel = await prisma.chatChannel.create({
      data: {
        condominiumId,
        type,
        name: type === "group" ? name || "Grupo" : null,
        members: {
          create: allMemberIds.map((userId) => ({ userId })),
        },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, role: true, avatar: true } } } },
      },
    });

    return NextResponse.json({
      id: channel.id,
      type: channel.type,
      name: channel.name,
      members: channel.members.map((m) => m.user),
    }, { status: 201 });
  } catch (e) {
    console.error("chat channels POST", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
