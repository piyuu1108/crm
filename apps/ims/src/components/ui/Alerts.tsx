"use client";
import { Alert } from "@heroui/react";

export function ErrorAlert({ message, className = "" }: { message: string; className?: string }) {
  if (!message) return null;
  return (
    <Alert status="danger" className={className}>
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}

export function SuccessAlert({ message, className = "" }: { message: string; className?: string }) {
  if (!message) return null;
  return (
    <Alert status="success" className={className}>
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}
