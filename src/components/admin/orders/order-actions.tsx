"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Alert, Panel, PanelHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import {
  changeOrderStatus,
  markOrderPaid,
  saveOrderInternalNote,
} from "@/lib/admin/orders/actions";

const STATUSES = [
  "PENDING",
  "PAYMENT_PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
  "RETURNED",
] as const;

export function OrderStatusPanel({
  orderId,
  currentStatus,
  hasPendingManualPayment,
}: {
  orderId: string;
  currentStatus: string;
  hasPendingManualPayment: boolean;
}) {
  const t = useTranslations("admin.orders");
  const tErrors = useTranslations("admin.orders.errors");
  const tStatus = useTranslations("orderStatus");
  const tCommon = useTranslations("admin.common");
  const router = useRouter();

  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Re-sync the dropdown when the saved order moves on (after our own update, or
  // a refresh that picked up someone else's). Adjusting state during render is
  // React's documented alternative to an effect here, and unlike remounting via
  // `key` it leaves the success message from the last action on screen.
  const [syncedStatus, setSyncedStatus] = useState(currentStatus);
  if (currentStatus !== syncedStatus) {
    setSyncedStatus(currentStatus);
    setStatus(currentStatus);
  }

  const fail = (code: string | undefined) =>
    setFeedback({
      tone: "error",
      text:
        code === "UNAUTHORIZED"
          ? tCommon("unauthorized")
          : code && tErrors.has(code)
            ? tErrors(code)
            : tCommon("unexpectedError"),
    });

  const submitStatus = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await changeOrderStatus(orderId, status, note || null);
      if (!result.ok) {
        fail(result.error);
        return;
      }
      setNote("");
      setFeedback({
        tone: "success",
        text: result.data.restoredStock
          ? `${t("statusChanged")} ${t("stockRestored")}`
          : t("statusChanged"),
      });
      router.refresh();
    });
  };

  const submitMarkPaid = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await markOrderPaid(orderId);
      if (!result.ok) {
        fail(result.error);
        return;
      }
      setFeedback({ tone: "success", text: t("markedPaid") });
      router.refresh();
    });
  };

  return (
    <Panel>
      <PanelHeader title={t("changeStatus")} />
      <div className="flex flex-col gap-3 p-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-espresso">{t("newStatus")}</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 rounded-sm border border-espresso/20 bg-ivory px-2 text-sm text-espresso"
          >
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {tStatus(value)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-espresso">{t("statusNote")}</span>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="h-10 rounded-sm border border-espresso/20 bg-ivory px-3 text-sm text-espresso"
          />
        </label>

        {feedback && <Alert tone={feedback.tone}>{feedback.text}</Alert>}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="sm"
            disabled={isPending || status === currentStatus}
            onClick={submitStatus}
          >
            {isPending ? tCommon("saving") : tCommon("update")}
          </Button>

          {hasPendingManualPayment && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isPending}
              onClick={submitMarkPaid}
            >
              {t("markPaid")}
            </Button>
          )}
        </div>

        {hasPendingManualPayment && (
          <p className="text-xs text-espresso-light">{t("markPaidHint")}</p>
        )}
      </div>
    </Panel>
  );
}

export function OrderInternalNote({
  orderId,
  initialNote,
}: {
  orderId: string;
  initialNote: string;
}) {
  const t = useTranslations("admin.orders");
  const tCommon = useTranslations("admin.common");
  const router = useRouter();
  const [note, setNote] = useState(initialNote);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <Panel>
      <PanelHeader title={t("internalNote")} description={t("internalNoteHint")} />
      <div className="flex flex-col gap-3 p-5">
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={4}
          className="rounded-sm border border-espresso/20 bg-ivory px-3 py-2 text-sm text-espresso"
        />
        {feedback && <Alert tone={feedback.tone}>{feedback.text}</Alert>}
        <div>
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={() => {
              setFeedback(null);
              startTransition(async () => {
                const result = await saveOrderInternalNote(orderId, note);
                if (!result.ok) {
                  setFeedback({
                    tone: "error",
                    text:
                      result.error === "UNAUTHORIZED"
                        ? tCommon("unauthorized")
                        : tCommon("unexpectedError"),
                  });
                  return;
                }
                setFeedback({ tone: "success", text: t("noteSaved") });
                router.refresh();
              });
            }}
          >
            {isPending ? tCommon("saving") : tCommon("save")}
          </Button>
        </div>
      </div>
    </Panel>
  );
}
