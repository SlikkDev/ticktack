import { KeyRound } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SettingsCard } from "@/components/settings/settings-card";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export function PasskeySettings() {
  const { t } = useTranslation();
  const {
    data: passkeys,
    isPending: loading,
    error,
    refetch,
  } = authClient.useListPasskeys();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const perform = async (
    action: () => Promise<{ error?: unknown } | undefined>,
  ) => {
    setPending(true);
    setFailed(false);
    try {
      const result = await action();
      if (!result || result.error) {
        setFailed(true);
        return;
      }
      setName("");
      setRemoveId(null);
      await refetch();
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };
  return (
    <SettingsSection title={t("auth:passwordless.passkeysTitle")}>
      <SettingsCard>
        <SettingsRow
          icon={<KeyRound />}
          title={t("auth:passwordless.passkeysTitle")}
          description={t("auth:passwordless.passkeysDescription")}
        />
        {loading ? <p className="p-4">{t("common:empty.loading")}</p> : null}
        {error || failed ? (
          <p role="alert" className="p-4 text-sm text-destructive">
            {t("auth:passwordless.manageFailed")}
          </p>
        ) : null}
        {passkeys?.map((key) => (
          <SettingsRow
            key={key.id}
            title={key.name || t("auth:passwordless.unnamedPasskey")}
          >
            {removeId === key.id ? (
              <>
                <Button
                  variant="destructive"
                  disabled={pending}
                  onClick={() =>
                    void perform(() =>
                      authClient.passkey.deletePasskey({ id: key.id }),
                    )
                  }
                >
                  {t("auth:passwordless.confirmRemove")}
                </Button>
                <Button
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setRemoveId(null)}
                >
                  {t("common:actions.cancel")}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => setRemoveId(key.id)}
              >
                {t("common:actions.remove")}
              </Button>
            )}
          </SettingsRow>
        ))}
        <div className="flex flex-col gap-3 p-4">
          <label htmlFor="passkey-name" className="text-sm">
            {t("auth:passwordless.passkeyName")}
          </label>
          <Input
            id="passkey-name"
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="off"
          />
          <Button
            disabled={pending}
            loading={pending}
            onClick={() =>
              void perform(() =>
                authClient.passkey.addPasskey({
                  name: name.trim() || undefined,
                }),
              )
            }
          >
            {t("auth:passwordless.addPasskey")}
          </Button>
          <p className="text-sm text-muted-foreground">
            {t("auth:passwordless.recoveryHint")}
          </p>
          <a
            className="text-sm underline"
            href="/auth/sign-in?reauth=true&redirect=%2Fdashboard%2Fsettings%2Faccount%2Fsecurity"
          >
            {t("auth:passwordless.reauthenticate")}
          </a>
        </div>
      </SettingsCard>
    </SettingsSection>
  );
}
