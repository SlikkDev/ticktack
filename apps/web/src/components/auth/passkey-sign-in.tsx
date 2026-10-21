import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { toast } from "@/lib/toast";

export function PasskeySignIn({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);
  const signIn = async () => {
    setPending(true);
    try {
      const result = await authClient.signIn.passkey();
      if (result.error) toast.error(t("auth:passwordless.passkeyFailed"));
      else onSuccess();
    } catch {
      toast.error(t("auth:passwordless.passkeyFailed"));
    } finally {
      setPending(false);
    }
  };
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full mt-3"
      loading={pending}
      onClick={() => void signIn()}
    >
      {t("auth:passwordless.usePasskey")}
    </Button>
  );
}
