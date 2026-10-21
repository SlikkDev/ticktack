import { client } from "@kaneo/libs";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AuthPage } from "@/components/auth/auth-page";
import { getSafeRedirectPath } from "@/components/auth/auth-methods";
import { useAuth } from "@/components/providers/auth-provider/hooks/use-auth";
import { Button } from "@/components/ui/button";
import PageTitle from "@/components/page-title";
import {
  clearMagicLinkFragment,
  readMagicLinkFragment,
} from "@/lib/magic-link-fragment";

export const Route = createFileRoute("/auth/magic-link")({
  component: MagicLinkConfirmation,
});

function MagicLinkConfirmation() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refetchUser } = useAuth();
  const [link] = useState(() => {
    const captured = readMagicLinkFragment();
    return {
      token: captured?.token || "",
      destination: getSafeRedirectPath(captured?.destination) || "/dashboard",
    };
  });
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const confirm = async () => {
    setPending(true);
    clearMagicLinkFragment();
    try {
      const response = await client.auth["magic-link"].confirm.$post({
        json: { token: link.token },
      });
      if (!response.ok) {
        setFailed(true);
        return;
      }
      await refetchUser();
      await navigate({ to: link.destination });
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };
  return (
    <>
      <PageTitle title={t("auth:passwordless.confirmTitle")} />
      <AuthPage
        title={t("auth:passwordless.confirmTitle")}
        description={t("auth:passwordless.confirmDescription")}
      >
        {failed || !link.token ? (
          <p role="alert">{t("auth:passwordless.invalidLink")}</p>
        ) : (
          <Button size="lg" loading={pending} onClick={() => void confirm()}>
            {t("auth:passwordless.confirm")}
          </Button>
        )}
        <a
          className="mt-4 block text-sm underline"
          href="/auth/sign-in?reauth=true"
        >
          {t("auth:passwordless.returnToSignIn")}
        </a>
      </AuthPage>
    </>
  );
}
