import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  type BillingInterval,
  type BillingPlan,
  createBillingCheckout,
  createBillingPortal,
} from "@/fetchers/billing/create-checkout";
import { savePendingPurchase } from "@/lib/analytics/pending-purchase";
import { track } from "@/lib/analytics/track";
import { getApiErrorMessage } from "@/lib/i18n/api-error-message";

export function useCreateCheckout(workspaceId: string | undefined) {
  return useMutation({
    mutationFn: (input: { plan: BillingPlan; interval: BillingInterval }) =>
      createBillingCheckout({ workspaceId: workspaceId as string, ...input }),
    onSuccess: ({ checkoutUrl }, { plan, interval }) => {
      track("Checkout Started", { props: { plan, interval } });
      savePendingPurchase({ plan, interval });
      window.location.href = checkoutUrl;
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not start checkout"));
    },
  });
}

export function useOpenBillingPortal(workspaceId: string | undefined) {
  return useMutation({
    mutationFn: () => createBillingPortal(workspaceId as string),
    onSuccess: ({ portalUrl }) => {
      window.location.href = portalUrl;
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not open billing portal"));
    },
  });
}
