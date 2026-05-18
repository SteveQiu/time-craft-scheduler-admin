import React from "react";

/**
 * Shared UI components matching PikAppoint's design
 * (Tailwind-inspired, shadcn/ui style)
 */

export const Button: React.FC<{
  children: React.ReactNode;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  style?: React.CSSProperties;
}> = ({ children, variant = "default", size = "md", style }) => {
  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    fontWeight: 600,
    fontFamily: "system-ui, -apple-system, sans-serif",
    cursor: "pointer",
    transition: "all 0.2s",
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      background: "#3b82f6",
      color: "#fff",
      border: "none",
    },
    outline: {
      background: "transparent",
      color: "#3b82f6",
      border: "2px solid #3b82f6",
    },
    ghost: {
      background: "transparent",
      color: "#6b7280",
      border: "none",
    },
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: "6px 12px", fontSize: 14 },
    md: { padding: "8px 16px", fontSize: 16 },
    lg: { padding: "12px 24px", fontSize: 18 },
  };

  return (
    <button
      style={{
        ...baseStyle,
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
    >
      {children}
    </button>
  );
};

export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: "pending" | "confirmed" | "completed" | "cancelled";
  style?: React.CSSProperties;
}> = ({ children, variant = "pending", style }) => {
  const variantStyles: Record<string, React.CSSProperties> = {
    pending: {
      background: "#fef3c7",
      color: "#92400e",
    },
    confirmed: {
      background: "#d1fae5",
      color: "#065f46",
    },
    completed: {
      background: "#dbeafe",
      color: "#1e3a8a",
    },
    cancelled: {
      background: "#fee2e2",
      color: "#991b1b",
    },
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: "system-ui, -apple-system, sans-serif",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </span>
  );
};

export const Card: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 8,
        padding: 20,
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        border: "1px solid #e5e7eb",
        fontFamily: "system-ui, -apple-system, sans-serif",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Input: React.FC<{
  placeholder?: string;
  value?: string;
  style?: React.CSSProperties;
}> = ({ placeholder, value, style }) => {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      readOnly
      style={{
        width: "100%",
        padding: "8px 12px",
        borderRadius: 6,
        border: "1px solid #d1d5db",
        fontSize: 14,
        fontFamily: "system-ui, -apple-system, sans-serif",
        background: "#fff",
        color: "#374151",
        outline: "none",
        ...style,
      }}
    />
  );
};

export const Label: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => {
  return (
    <label
      style={{
        display: "block",
        fontSize: 14,
        fontWeight: 600,
        color: "#374151",
        marginBottom: 6,
        fontFamily: "system-ui, -apple-system, sans-serif",
        ...style,
      }}
    >
      {children}
    </label>
  );
};
