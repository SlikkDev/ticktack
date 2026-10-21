import { Row as EmailRow } from "@react-email/components";
import React from "react";
import { useEmailDirection } from "./direction";

void React;

type RowProps = React.ComponentProps<typeof EmailRow>;

export function Row({ align, dir, style, ...props }: RowProps) {
  const direction = useEmailDirection();
  return (
    <EmailRow
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
