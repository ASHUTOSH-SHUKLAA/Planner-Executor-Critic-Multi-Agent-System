"use client";

import { useRef } from "react";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function OtpInput({ value, onChange, disabled = false, autoFocus = false }: OtpInputProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");

  const updateDigit = (index: number, raw: string) => {
    const incoming = raw.replace(/\D/g, "");
    if (incoming.length > 1) {
      const pasted = incoming.slice(0, 6);
      onChange(pasted);
      inputs.current[Math.min(pasted.length, 5)]?.focus();
      return;
    }
    if (!incoming) {
      const next = [...digits];
      next[index] = " ";
      onChange(next.join("").trimEnd());
      return;
    }
    const next = [...digits];
    next[index] = incoming;
    onChange(next.join("").trimEnd());
    if (index < 5) inputs.current[index + 1]?.focus();
  };

  return (
    <div role="group" aria-label="6-digit verification code" className="otp-input-grid">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => { inputs.current[index] = element; }}
          className="otp-input-cell"
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Verification code digit ${index + 1} of 6`}
          value={digit.trim()}
          maxLength={6}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          onChange={(event) => updateDigit(index, event.target.value)}
          onPaste={(event) => {
            event.preventDefault();
            updateDigit(index, event.clipboardData.getData("text"));
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !digit.trim() && index > 0) inputs.current[index - 1]?.focus();
            if (event.key === "ArrowLeft" && index > 0) inputs.current[index - 1]?.focus();
            if (event.key === "ArrowRight" && index < 5) inputs.current[index + 1]?.focus();
          }}
        />
      ))}
    </div>
  );
}
