import { Request, Response } from "express";
import { verifyWebhook } from "@clerk/express/webhooks";
import { prisma } from "../configs/prisma.js";
import * as Sentry from "@sentry/node";

const clerkWebhooks = async (req: Request, res: Response) => {
  try {
    // ✅ Verify Clerk webhook signature
    const evt: any = await verifyWebhook(req);

    const { data, type } = evt;

    console.log("Webhook Type:", type);
    console.log("Webhook Data:", data);

    switch (type) {

      // =============================
      // USER CREATED / UPDATED
      // =============================
      case "user.created":
      case "user.updated": {
        await prisma.user.upsert({
          where: { id: data.id },
          update: {
            email: data?.email_addresses?.[0]?.email_address ?? "",
            name: `${data?.first_name ?? ""} ${data?.last_name ?? ""}`.trim(),
            image: data?.image_url ?? "",
          },
          create: {
            id: data.id,
            email: data?.email_addresses?.[0]?.email_address ?? "",
            name: `${data?.first_name ?? ""} ${data?.last_name ?? ""}`.trim(),
            image: data?.image_url ?? "",
          },
        });

        console.log("User synced with DB ✅");
        break;
      }

      // =============================
      // USER DELETED
      // =============================
      case "user.deleted": {
        await prisma.user.delete({
          where: { id: data.id },
        });

        console.log("User deleted");
        break;
      }

      // =============================
      // PAYMENT / SUBSCRIPTION EVENTS
      // =============================
      case "subscription.created":
      case "subscription.updated":
      case "paymentAttempt.updated":
      case "checkout.session.completed":
      case "payment_intent.succeeded": {

        const creditsMap = {
          pro: 80,
          premium: 240,
        };

        // ✅ Extract Clerk userId safely
        const clerkUserId =
          data?.user_id ||
          data?.payer?.user_id ||
          data?.payer_id ||
          data?.metadata?.userId;

        // ✅ Detect plan slug safely
        const rawPlan =
          data?.items?.[0]?.plan?.slug?.toLowerCase() ||
          data?.subscription_items?.[0]?.plan?.slug?.toLowerCase() ||
          "";

        const planId: keyof typeof creditsMap | undefined =
          rawPlan.includes("premium")
            ? "premium"
            : rawPlan.includes("pro")
            ? "pro"
            : undefined;

        // ✅ Accept multiple success states
        const isActive =
          data?.status === "active" ||
          data?.status === "paid" ||
          data?.status === "succeeded" ||
          data?.status === "completed";

        console.log("Detected Plan:", rawPlan);
        console.log("Detected User:", clerkUserId);
        console.log("Payment Status:", data?.status);

        if (!clerkUserId || !planId || !isActive) {
          console.log("Webhook ignored");
          break;
        }

        // ✅ Increment credits (DO NOT overwrite)
        await prisma.user.update({
          where: { id: clerkUserId },
          data: {
            credits: {
              increment: creditsMap[planId],
            },
          },
        });

        console.log(
          `Credits Added ✅ ${creditsMap[planId]} → User ${clerkUserId}`
        );

        break;
      }

      default:
        console.log("Unhandled webhook:", type);
        break;
    }

    return res.status(200).json({
      message: "Webhook received",
      type,
    });

  } catch (error: any) {
    console.error(error);
    Sentry.captureException(error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

export default clerkWebhooks;