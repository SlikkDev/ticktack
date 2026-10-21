import { Section as EmailSection } from "@react-email/components";
import React from "react";
import { useEmailDirection } from "./direction";

void React;

type SectionProps = React.ComponentProps<typeof EmailSection>;

export function Section({ align, dir, style, ...props }: SectionProps) {
  const direction = useEmailDirection();
  return (
    <EmailSection
      {...props}
      align={align}
      dir={dir ?? direction}
      style={{
        width: "100%",
        direction: dir === "ltr" || dir === "rtl" ? dir : direction,
        ...style,
      }}
    />
  );
}
