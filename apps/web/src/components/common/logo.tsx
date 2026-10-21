import { Link } from "@tanstack/react-router";
import useProjectStore from "@/store/project";
import { useTranslation } from "react-i18next";

type LogoProps = {
  className?: string;
};

export function Logo({ className = "" }: LogoProps) {
  const { setProject } = useProjectStore();
  const { t } = useTranslation();

  return (
    <Link
      onClick={() => {
        setProject(undefined);
      }}
      to="/dashboard"
      className={`flex w-auto items-center gap-2 ${className}`}
    >
      <img src="/favicon.svg" alt="" className="size-7" />
      <span className="text-xl font-semibold tracking-tight">
        {t("common:appName")}
      </span>
    </Link>
  );
}
