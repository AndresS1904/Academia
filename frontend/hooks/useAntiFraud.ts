"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FraudEventType =
  | "FULLSCREEN_EXIT"
  | "TAB_SWITCH"
  | "WINDOW_BLUR"
  | "COPY_ATTEMPT"
  | "PASTE_ATTEMPT"
  | "RIGHTCLICK_ATTEMPT"
  | "KEYBOARD_SHORTCUT"
  | "WEBCAM_DISCONNECT"
  | "WEBCAM_NO_FACE"
  | "WEBCAM_MULTIPLE_FACES"
  | "AUTO_SUBMIT_FRAUD";

export interface AntiFraudConfig {
  fullscreenRequired:  boolean;
  tabSwitchDetection:  boolean;
  antiCopyEnabled:     boolean;
  maxViolations:       number;
  autoSubmitOnFraud:   boolean;
  webcamRequired:      boolean;
}

export const DEFAULT_ANTI_FRAUD_CONFIG: AntiFraudConfig = {
  fullscreenRequired:  false,
  tabSwitchDetection:  true,
  antiCopyEnabled:     true,
  maxViolations:       3,
  autoSubmitOnFraud:   false,
  webcamRequired:      false,
};

export interface AntiFraudWarning {
  type: FraudEventType;
  message: string;
  violationNumber: number;
  isFinal: boolean;
}

interface UseAntiFraudOptions {
  attemptId:       string | null;
  evaluationType:  string;
  evaluationId:    string;
  config:          AntiFraudConfig;
  active:          boolean;          // only arm when exam is running
  onAutoSubmit?:   () => void;
}

interface UseAntiFraudReturn {
  violations:       number;
  fraudScore:       number;
  isFullscreen:     boolean;
  warning:          AntiFraudWarning | null;
  dismissWarning:   () => void;
  requestFullscreen: () => Promise<void>;
  logEvent:         (type: FraudEventType, metadata?: Record<string, unknown>) => Promise<void>;
}

// ─── Severity labels ──────────────────────────────────────────────────────────

const WARNING_MESSAGES: Record<FraudEventType, string> = {
  FULLSCREEN_EXIT:       "Saliste del modo pantalla completa. Vuelve a pantalla completa para continuar.",
  TAB_SWITCH:            "Cambio de pestaña o ventana detectado.",
  WINDOW_BLUR:           "Pérdida de foco detectada.",
  COPY_ATTEMPT:          "Intento de copiar texto detectado.",
  PASTE_ATTEMPT:         "Intento de pegar texto detectado.",
  RIGHTCLICK_ATTEMPT:    "Clic derecho bloqueado durante el examen.",
  KEYBOARD_SHORTCUT:     "Atajo de teclado no permitido bloqueado.",
  WEBCAM_DISCONNECT:     "La cámara fue desconectada o bloqueada.",
  WEBCAM_NO_FACE:        "No se detectó ningún rostro frente a la cámara.",
  WEBCAM_MULTIPLE_FACES: "Se detectaron múltiples rostros frente a la cámara.",
  AUTO_SUBMIT_FRAUD:     "Límite de infracciones alcanzado. El simulacro fue enviado automáticamente.",
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAntiFraud({
  attemptId,
  evaluationType,
  evaluationId,
  config,
  active,
  onAutoSubmit,
}: UseAntiFraudOptions): UseAntiFraudReturn {
  const [violations, setViolations]   = useState(0);
  const [fraudScore, setFraudScore]   = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [warning, setWarning]         = useState<AntiFraudWarning | null>(null);

  // Refs so callbacks always see current values without re-registering listeners
  const violationsRef    = useRef(0);
  const attemptIdRef     = useRef<string | null>(null);
  const autoSubmitedRef  = useRef(false);
  const blurStartRef     = useRef<number | null>(null);
  const onAutoSubmitRef  = useRef(onAutoSubmit);  // ← stable ref — no re-registration on every render

  // Keep refs in sync with latest values
  useEffect(() => { violationsRef.current   = violations; }, [violations]);
  useEffect(() => { attemptIdRef.current    = attemptId; },  [attemptId]);
  useEffect(() => { onAutoSubmitRef.current = onAutoSubmit; }, [onAutoSubmit]);

  // ── Core: send event to backend ──────────────────────────────────────────────

  const logEvent = useCallback(async (
    type: FraudEventType,
    metadata?: Record<string, unknown>,
  ) => {
    const aId = attemptIdRef.current;
    if (!aId || autoSubmitedRef.current) return;

    let result: { fraudScore?: number; violationCount?: number; shouldAutoSubmit?: boolean } = {};
    try {
      result = await api.post(`/anti-fraud/log`, {
        attemptId:      aId,
        evaluationType,
        evaluationId,
        eventType:      type,
        clientTimestamp: new Date().toISOString(),
        metadata,
      });
    } catch {
      // silencioso — no bloquear el examen si el log falla
    }

    if (result.fraudScore !== undefined) setFraudScore(result.fraudScore);

    const isViolation = [
      "FULLSCREEN_EXIT", "TAB_SWITCH", "WEBCAM_DISCONNECT",
      "WEBCAM_NO_FACE", "WEBCAM_MULTIPLE_FACES",
    ].includes(type);

    if (isViolation) {
      const newViolations = violationsRef.current + 1;
      setViolations(newViolations);
      violationsRef.current = newViolations;

      const isFinal = result.shouldAutoSubmit ||
        (config.autoSubmitOnFraud && newViolations >= config.maxViolations);

      setWarning({
        type,
        message: isFinal
          ? WARNING_MESSAGES.AUTO_SUBMIT_FRAUD
          : WARNING_MESSAGES[type] +
            (config.maxViolations > 0
              ? ` (Infracción ${newViolations}/${config.maxViolations})`
              : ""),
        violationNumber: newViolations,
        isFinal,
      });

      if (isFinal && !autoSubmitedRef.current) {
        autoSubmitedRef.current = true;
        await api.post(`/anti-fraud/log`, {
          attemptId: aId, evaluationType, evaluationId,
          eventType: "AUTO_SUBMIT_FRAUD",
          clientTimestamp: new Date().toISOString(),
        }).catch(() => {});
        onAutoSubmitRef.current?.();  // ← usa ref en vez de prop directa
      }
    } else if (type !== "WINDOW_BLUR") {
      // show non-critical warning briefly (no violation counter)
      setWarning({ type, message: WARNING_MESSAGES[type], violationNumber: 0, isFinal: false });
    }
  }, [evaluationType, evaluationId, config]); // onAutoSubmit via ref — stable, no re-registration

  // ── Fullscreen listener ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!active) return;
    const onFsChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (!fs && config.fullscreenRequired) {
        logEvent("FULLSCREEN_EXIT");
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [active, config.fullscreenRequired, logEvent]);

  // ── Tab-switch / visibility ──────────────────────────────────────────────────

  useEffect(() => {
    if (!active || !config.tabSwitchDetection) return;
    const onVisibility = () => {
      if (document.hidden) {
        blurStartRef.current = Date.now();
        logEvent("TAB_SWITCH", { timestamp: new Date().toISOString() });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [active, config.tabSwitchDetection, logEvent]);

  // ── Window blur ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!active || !config.tabSwitchDetection) return;
    const onBlur = () => {
      blurStartRef.current = Date.now();
      logEvent("WINDOW_BLUR", { timestamp: new Date().toISOString() });
    };
    const onFocus = () => {
      if (blurStartRef.current) {
        const durationSeconds = Math.round((Date.now() - blurStartRef.current) / 1000);
        blurStartRef.current = null;
        // Solo registrar si estuvo fuera más de 2 segundos
        if (durationSeconds > 2) {
          api.post(`/anti-fraud/log`, {
            attemptId: attemptIdRef.current,
            evaluationType, evaluationId,
            eventType: "WINDOW_BLUR",
            clientTimestamp: new Date().toISOString(),
            metadata: { durationSeconds },
          }).catch(() => {});
        }
      }
    };
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [active, config.tabSwitchDetection, evaluationType, evaluationId]);

  // ── Anti-copy/paste/keyboard ──────────────────────────────────────────────────

  useEffect(() => {
    if (!active || !config.antiCopyEnabled) return;

    const prevent = (e: Event) => e.preventDefault();

    const onKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      // Block Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A (select all), F12, Ctrl+Shift+I/J/C/U
      if (ctrl && ["c", "v", "x", "a", "u"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        const type: FraudEventType = e.key.toLowerCase() === "c" ? "COPY_ATTEMPT"
          : e.key.toLowerCase() === "v" ? "PASTE_ATTEMPT"
          : "KEYBOARD_SHORTCUT";
        logEvent(type, { key: e.key });
        return;
      }
      if (ctrl && e.shiftKey && ["i", "j", "c"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        logEvent("KEYBOARD_SHORTCUT", { key: `Ctrl+Shift+${e.key.toUpperCase()}` });
        return;
      }
      if (e.key === "F12") {
        e.preventDefault();
        logEvent("KEYBOARD_SHORTCUT", { key: "F12" });
      }
    };

    const onCopy  = (e: ClipboardEvent) => { e.preventDefault(); logEvent("COPY_ATTEMPT"); };
    const onPaste = (e: ClipboardEvent) => { e.preventDefault(); logEvent("PASTE_ATTEMPT"); };
    const onCtxMenu = (e: MouseEvent)   => { e.preventDefault(); logEvent("RIGHTCLICK_ATTEMPT"); };

    document.addEventListener("keydown",     onKeyDown);
    document.addEventListener("copy",        onCopy);
    document.addEventListener("paste",       onPaste);
    document.addEventListener("contextmenu", onCtxMenu);
    // Block text selection
    document.addEventListener("selectstart", prevent);

    return () => {
      document.removeEventListener("keydown",     onKeyDown);
      document.removeEventListener("copy",        onCopy);
      document.removeEventListener("paste",       onPaste);
      document.removeEventListener("contextmenu", onCtxMenu);
      document.removeEventListener("selectstart", prevent);
    };
  }, [active, config.antiCopyEnabled, logEvent]);

  // ── Fullscreen request helper ─────────────────────────────────────────────────

  const requestFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch {
      // Browser denied
    }
  }, []);

  const dismissWarning = useCallback(() => setWarning(null), []);

  return { violations, fraudScore, isFullscreen, warning, dismissWarning, requestFullscreen, logEvent };
}
