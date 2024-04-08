import { auth } from "@/auth";
import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: {
        email: session.user!.email!,
      },
    });

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 400 });
    }

    const { title, cid, size } = await req.json();

    const existRecord = await db.certificate.findUnique({
      where: {
        cid,
      },
      include: {
        user: true,
      },
    });

    if (existRecord) {
      return NextResponse.json(
        {
          message: `This credential is already minted by ${existRecord.user.name}`,
        },
        { status: 400 }
      );
    }

    const newRecord = await db.certificate.create({
      data: {
        title,
        cid,
        size,
        userId: user.id,
      },
    });

    if (!newRecord) {
      return NextResponse.json(
        { message: "can't create record" },
        { status: 500 }
      );
    }

    console.log(`CID OF IMAGE -> ${newRecord.cid}`);

    return NextResponse.json({ message: "Minted", cid: newRecord.cid });
  } catch (error: any) {
    console.log("[ERROR_UPLOAD_ROUTE]: ", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
