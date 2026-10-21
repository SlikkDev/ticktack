function getLocaleKey(locale?: string | null) {
  const normalized = locale?.toLowerCase();
  if (normalized?.startsWith("he")) return "he";
  if (normalized?.startsWith("de")) return "de";
  if (normalized?.startsWith("vi")) return "vi";
  if (normalized?.startsWith("ja")) return "ja";
  if (normalized === "zh-tw") return "zh-tw";
  return "en";
}

export function getAuthEmailCopy(locale?: string | null) {
  const localeKey = getLocaleKey(locale);

  if (localeKey === "he") {
    return {
      magicLinkSubject: "קישור התחברות לטיקטק",
      otpSubject: (otp: string) =>
        `קוד ההתחברות שלך לטיקטק: \u2066${otp}\u2069`,
      passwordResetSubject: "איפוס הסיסמה שלך בטיקטק",
    };
  }

  if (localeKey === "de") {
    return {
      magicLinkSubject: "Anmeldelink für TickTack",
      otpSubject: (otp: string) => `${otp} ist dein TickTack-Anmeldecode`,
      passwordResetSubject: "TickTack-Passwort zurücksetzen",
    };
  }

  if (localeKey === "vi") {
    return {
      magicLinkSubject: "Liên kết đăng nhập TickTack",
      otpSubject: (otp: string) => `${otp} là mã đăng nhập TickTack của bạn`,
      passwordResetSubject: "Đặt lại mật khẩu TickTack",
    };
  }

  if (localeKey === "ja") {
    return {
      magicLinkSubject: "TickTack ログインリンク",
      otpSubject: (otp: string) => `TickTack のサインインコード: ${otp}`,
      passwordResetSubject: "TickTack のパスワードをリセット",
    };
  }

  if (localeKey === "zh-tw") {
    return {
      magicLinkSubject: "TickTack 登入連結",
      otpSubject: (otp: string) => `你的 TickTack 登入驗證碼：${otp}`,
      passwordResetSubject: "重設 TickTack 密碼",
    };
  }

  return {
    magicLinkSubject: "Login for TickTack",
    otpSubject: (otp: string) => `${otp} is your TickTack sign-in code`,
    passwordResetSubject: "Reset your TickTack password",
  };
}
