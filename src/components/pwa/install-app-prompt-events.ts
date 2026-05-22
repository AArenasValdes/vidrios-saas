export const PWA_INSTALL_PROMPT_VISIBILITY_EVENT =
  "ventora:pwa-install-prompt-visibility";

const PWA_INSTALL_PROMPT_VISIBLE_ATTRIBUTE = "data-ventora-pwa-install-visible";

export function readPwaInstallPromptVisible() {
  if (typeof document === "undefined") {
    return false;
  }

  return document.documentElement.getAttribute(PWA_INSTALL_PROMPT_VISIBLE_ATTRIBUTE) === "1";
}

export function setPwaInstallPromptVisible(visible: boolean) {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  document.documentElement.setAttribute(
    PWA_INSTALL_PROMPT_VISIBLE_ATTRIBUTE,
    visible ? "1" : "0"
  );

  window.dispatchEvent(
    new CustomEvent(PWA_INSTALL_PROMPT_VISIBILITY_EVENT, {
      detail: { visible },
    })
  );
}
